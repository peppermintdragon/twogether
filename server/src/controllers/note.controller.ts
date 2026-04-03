import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';

export async function getNotes(req: Request, res: Response) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);
  const skip = (page - 1) * pageSize;

  const where: any = { coupleId: req.coupleId, deletedAt: null };

  if (req.query.date) {
    const date = new Date(req.query.date as string);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.sentAt = { gte: date, lt: nextDay };
  }

  const [notes, total] = await Promise.all([
    prisma.dailyNote.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, profilePhoto: true } },
      },
      orderBy: { sentAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.dailyNote.count({ where }),
  ]);

  const formatted = notes.map((n: typeof notes[number]) => ({
    id: n.id,
    content: n.content,
    emotionIcon: n.emotionIcon,
    status: n.status,
    author: n.author,
    sentAt: n.sentAt.toISOString(),
    readAt: n.readAt?.toISOString(),
  }));

  return paginated(res, formatted, total, page, pageSize);
}

export async function sendNote(req: Request, res: Response) {
  const { content, emotionIcon } = req.body;

  const note = await prisma.dailyNote.create({
    data: {
      coupleId: req.coupleId!,
      authorId: req.userId!,
      content,
      emotionIcon,
      status: 'SENT',
    },
    include: {
      author: { select: { id: true, name: true, profilePhoto: true } },
    },
  });

  return success(res, {
    id: note.id,
    content: note.content,
    emotionIcon: note.emotionIcon,
    status: note.status,
    author: note.author,
    sentAt: note.sentAt.toISOString(),
    readAt: null,
  }, 'Note sent! 💌', 201);
}

export async function markNoteRead(req: Request, res: Response) {
  const note = await prisma.dailyNote.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
  });

  if (!note) return error(res, 'Note not found', 404);
  if (note.authorId === req.userId) return error(res, 'Cannot mark your own note as read', 400);

  const updated = await prisma.dailyNote.update({
    where: { id: note.id },
    data: { status: 'READ', readAt: new Date() },
  });

  return success(res, { readAt: updated.readAt?.toISOString() });
}

export async function deleteNote(req: Request, res: Response) {
  const note = await prisma.dailyNote.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, authorId: req.userId, deletedAt: null },
  });

  if (!note) return error(res, 'Note not found', 404);

  await prisma.dailyNote.update({
    where: { id: note.id },
    data: { deletedAt: new Date() },
  });

  return success(res, null, 'Note deleted');
}

export async function getNoteStreak(req: Request, res: Response) {
  // Get the couple's users
  const coupleUsers = await prisma.coupleUser.findMany({
    where: { coupleId: req.coupleId },
    select: { userId: true },
  });

  if (coupleUsers.length < 2) {
    return success(res, { streak: 0 });
  }

  const [user1, user2] = coupleUsers.map((cu: { userId: string }) => cu.userId);

  // Find consecutive days where both users sent notes
  const result = await prisma.$queryRaw<[{ streak: bigint }]>`
    WITH daily_notes AS (
      SELECT DISTINCT DATE("sentAt") as note_date, "authorId"
      FROM "DailyNote"
      WHERE "coupleId" = ${req.coupleId} AND "deletedAt" IS NULL
    ),
    both_sent AS (
      SELECT note_date
      FROM daily_notes
      WHERE "authorId" IN (${user1}, ${user2})
      GROUP BY note_date
      HAVING COUNT(DISTINCT "authorId") = 2
    ),
    streaks AS (
      SELECT note_date,
        note_date - (ROW_NUMBER() OVER (ORDER BY note_date))::int * INTERVAL '1 day' as grp
      FROM both_sent
    )
    SELECT COUNT(*) as streak
    FROM streaks
    WHERE grp = (SELECT grp FROM streaks ORDER BY note_date DESC LIMIT 1)
      AND note_date >= CURRENT_DATE - INTERVAL '1 day'
  `;

  return success(res, { streak: Number(result[0]?.streak || 0) });
}

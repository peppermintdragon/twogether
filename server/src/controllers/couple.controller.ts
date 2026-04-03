import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success, error } from '../utils/apiResponse.js';

export async function getCoupleProfile(req: Request, res: Response) {
  const couple = await prisma.couple.findUnique({
    where: { id: req.coupleId },
    include: {
      coupleUsers: {
        include: {
          user: {
            select: {
              id: true, email: true, name: true, nickname: true,
              profilePhoto: true, loveLanguage: true, timezone: true, birthday: true,
            },
          },
        },
      },
      invitations: {
        where: { status: 'PENDING' },
        take: 1,
        select: { code: true },
      },
    },
  });

  if (!couple) {
    return error(res, 'Couple not found', 404);
  }

  const partner = couple.coupleUsers.find((cu: typeof couple.coupleUsers[number]) => cu.userId !== req.userId);

  return success(res, {
    id: couple.id,
    coupleNickname: couple.coupleNickname,
    coverPhoto: couple.coverPhoto,
    themeColor: couple.themeColor,
    relationshipStartDate: couple.relationshipStartDate?.toISOString(),
    howWeMet: couple.howWeMet,
    inviteCode: couple.invitations[0]?.code || '',
    createdAt: couple.createdAt.toISOString(),
    partner: partner?.user || null,
    members: couple.coupleUsers.map((cu: typeof couple.coupleUsers[number]) => cu.user),
  });
}

export async function updateCoupleProfile(req: Request, res: Response) {
  const couple = await prisma.couple.update({
    where: { id: req.coupleId },
    data: {
      coupleNickname: req.body.coupleNickname,
      themeColor: req.body.themeColor,
      howWeMet: req.body.howWeMet,
      relationshipStartDate: req.body.relationshipStartDate
        ? new Date(req.body.relationshipStartDate) : undefined,
    },
  });

  return success(res, couple, 'Couple profile updated! 💕');
}

export async function getCoupleStats(req: Request, res: Response) {
  const [memoriesCount, notesCount, moodMatchCount, bucketCompleted, totalBucket] = await Promise.all([
    prisma.memory.count({ where: { coupleId: req.coupleId, deletedAt: null } }),
    prisma.dailyNote.count({ where: { coupleId: req.coupleId, deletedAt: null } }),
    getMoodMatchCount(req.coupleId!),
    prisma.bucketListItem.count({ where: { coupleId: req.coupleId, isCompleted: true, deletedAt: null } }),
    prisma.bucketListItem.count({ where: { coupleId: req.coupleId, deletedAt: null } }),
  ]);

  const couple = await prisma.couple.findUnique({
    where: { id: req.coupleId },
    select: { relationshipStartDate: true },
  });

  const daysTogether = couple?.relationshipStartDate
    ? Math.floor((Date.now() - couple.relationshipStartDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return success(res, {
    daysTogether,
    memoriesCount,
    notesCount,
    moodMatchCount,
    bucketCompleted,
    totalBucket,
  });
}

async function getMoodMatchCount(coupleId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT m1.date) as count
    FROM "MoodEntry" m1
    JOIN "MoodEntry" m2 ON m1.date = m2.date AND m1."coupleId" = m2."coupleId" AND m1."userId" != m2."userId"
    WHERE m1."coupleId" = ${coupleId} AND m1.mood = m2.mood
  `;
  return Number(result[0]?.count || 0);
}

export async function uploadCoverPhoto(req: Request, res: Response) {
  if (!req.file) {
    return error(res, 'No file uploaded', 400);
  }

  const couple = await prisma.couple.update({
    where: { id: req.coupleId },
    data: { coverPhoto: `/uploads/memories/${req.file.filename}` },
  });

  return success(res, { coverPhoto: couple.coverPhoto }, 'Cover photo updated! 📸');
}

import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success } from '../utils/apiResponse.js';
const DAILY_QUESTIONS = ["What's one thing about me that always makes you smile?", "If we could teleport anywhere right now, where would you take us?", "What's your favorite memory of us so far?", "What song reminds you of us?", "What's something new you'd like us to try together?"];

export async function getDashboard(req: Request, res: Response) {
  const couple = await prisma.couple.findUnique({
    where: { id: req.coupleId },
    select: { relationshipStartDate: true },
  });

  const daysTogether = couple?.relationshipStartDate
    ? Math.floor((Date.now() - couple.relationshipStartDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Daily question based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyQuestion = DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [moods, upcomingDates, onThisDay, recentNotes, noteStreak] = await Promise.all([
    // Today's moods
    prisma.moodEntry.findMany({
      where: { coupleId: req.coupleId, date: today },
    }),
    // Upcoming special dates (next 5)
    getUpcomingDates(req.coupleId!),
    // On this day memories
    getOnThisDayMemories(req.coupleId!),
    // Recent notes count for streak
    prisma.dailyNote.count({
      where: { coupleId: req.coupleId, deletedAt: null },
    }),
    // Note streak
    getNoteStreak(req.coupleId!),
  ]);

  const myMood = moods.find((m: typeof moods[number]) => m.userId === req.userId);
  const partnerMood = moods.find((m: typeof moods[number]) => m.userId !== req.userId);

  return success(res, {
    daysTogether,
    myMoodToday: myMood?.mood || null,
    partnerMoodToday: partnerMood?.mood || null,
    dailyQuestion,
    upcomingDates,
    onThisDay,
    recentActivity: [],
    noteStreak,
  });
}

async function getUpcomingDates(coupleId: string) {
  const dates = await prisma.specialDate.findMany({
    where: { coupleId },
    orderBy: { date: 'asc' },
  });

  const now = new Date();
  return dates
    .map((d: typeof dates[number]) => {
      let nextOccurrence = new Date(d.date);
      if (d.isRecurring) {
        nextOccurrence.setFullYear(now.getFullYear());
        if (nextOccurrence < now) nextOccurrence.setFullYear(now.getFullYear() + 1);
      }
      return {
        id: d.id,
        name: d.name,
        date: d.date.toISOString(),
        type: d.type,
        isRecurring: d.isRecurring,
        daysUntil: Math.max(0, Math.ceil((nextOccurrence.getTime() - now.getTime()) / 86400000)),
      };
    })
    .sort((a: { daysUntil: number }, b: { daysUntil: number }) => a.daysUntil - b.daysUntil)
    .slice(0, 5);
}

async function getOnThisDayMemories(coupleId: string) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  return prisma.$queryRaw<any[]>`
    SELECT m.id, m.title, m.date, m."moodTag"
    FROM "Memory" m
    WHERE m."coupleId" = ${coupleId}
      AND m."deletedAt" IS NULL
      AND EXTRACT(MONTH FROM m.date) = ${month}
      AND EXTRACT(DAY FROM m.date) = ${day}
      AND EXTRACT(YEAR FROM m.date) < ${today.getFullYear()}
    ORDER BY m.date DESC
    LIMIT 5
  `;
}

async function getNoteStreak(coupleId: string): Promise<number> {
  const coupleUsers = await prisma.coupleUser.findMany({
    where: { coupleId },
    select: { userId: true },
  });

  if (coupleUsers.length < 2) return 0;

  try {
    const result = await prisma.$queryRaw<[{ streak: bigint }]>`
      WITH daily_notes AS (
        SELECT DISTINCT DATE("sentAt") as note_date, "authorId"
        FROM "DailyNote"
        WHERE "coupleId" = ${coupleId} AND "deletedAt" IS NULL
      ),
      both_sent AS (
        SELECT note_date
        FROM daily_notes
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
    return Number(result[0]?.streak || 0);
  } catch {
    return 0;
  }
}

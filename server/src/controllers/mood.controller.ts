import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success, error } from '../utils/apiResponse.js';

export async function setMood(req: Request, res: Response) {
  const { mood } = req.body;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entry = await prisma.moodEntry.upsert({
    where: {
      userId_date: { userId: req.userId!, date: today },
    },
    update: { mood },
    create: {
      userId: req.userId!,
      coupleId: req.coupleId!,
      mood,
      date: today,
    },
  });

  // Check for mood match
  const partnerMood = await prisma.moodEntry.findFirst({
    where: {
      coupleId: req.coupleId,
      userId: { not: req.userId },
      date: today,
    },
  });

  const isMatch = partnerMood?.mood === mood;

  return success(res, {
    id: entry.id,
    mood: entry.mood,
    date: entry.date.toISOString(),
    isMatch,
    partnerMood: partnerMood?.mood || null,
  });
}

export async function getTodayMoods(req: Request, res: Response) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const moods = await prisma.moodEntry.findMany({
    where: { coupleId: req.coupleId, date: today },
    include: { user: { select: { id: true, name: true } } },
  });

  const myMood = moods.find((m: typeof moods[number]) => m.userId === req.userId);
  const partnerMood = moods.find((m: typeof moods[number]) => m.userId !== req.userId);

  return success(res, {
    myMood: myMood?.mood || null,
    partnerMood: partnerMood?.mood || null,
    isMatch: myMood && partnerMood ? myMood.mood === partnerMood.mood : false,
  });
}

export async function getMoodCalendar(req: Request, res: Response) {
  const { month } = req.query as { month: string };
  if (!month) return error(res, 'Month parameter required (YYYY-MM)', 400);

  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0);

  const entries = await prisma.moodEntry.findMany({
    where: {
      coupleId: req.coupleId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  // Group by date
  const calendar: Record<string, { myMood?: string; partnerMood?: string }> = {};

  entries.forEach((e: typeof entries[number]) => {
    const dateKey = e.date.toISOString().split('T')[0];
    if (!calendar[dateKey]) calendar[dateKey] = {};
    if (e.userId === req.userId) {
      calendar[dateKey].myMood = e.mood;
    } else {
      calendar[dateKey].partnerMood = e.mood;
    }
  });

  const days = Object.entries(calendar).map(([date, moods]) => ({
    date,
    myMood: moods.myMood || null,
    partnerMood: moods.partnerMood || null,
    isMatch: moods.myMood && moods.partnerMood && moods.myMood === moods.partnerMood,
  }));

  return success(res, days);
}

export async function getMoodInsights(req: Request, res: Response) {
  const coupleUsers = await prisma.coupleUser.findMany({
    where: { coupleId: req.coupleId },
    select: { userId: true },
  });

  if (coupleUsers.length < 2) {
    return success(res, { matchRate: 0, totalDays: 0, mostCommonMood: null });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const entries = await prisma.moodEntry.findMany({
    where: {
      coupleId: req.coupleId,
      date: { gte: thirtyDaysAgo },
    },
  });

  // Calculate match rate
  const byDate: Record<string, Record<string, string>> = {};
  entries.forEach((e: typeof entries[number]) => {
    const dateKey = e.date.toISOString().split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = {};
    byDate[dateKey][e.userId] = e.mood;
  });

  let matchDays = 0;
  let bothDays = 0;
  const moodCounts: Record<string, number> = {};

  Object.values(byDate).forEach((dayMoods: Record<string, string>) => {
    const moods = Object.values(dayMoods);
    if (moods.length === 2) {
      bothDays++;
      if (moods[0] === moods[1]) matchDays++;
    }
    moods.forEach((m: string) => {
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    });
  });

  const mostCommonMood = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  return success(res, {
    matchRate: bothDays > 0 ? Math.round((matchDays / bothDays) * 100) : 0,
    totalDays: bothDays,
    matchDays,
    mostCommonMood,
    moodDistribution: moodCounts,
  });
}

import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success, error } from '../utils/apiResponse.js';

export async function getSpecialDates(req: Request, res: Response) {
  const dates = await prisma.specialDate.findMany({
    where: { coupleId: req.coupleId },
    orderBy: { date: 'asc' },
  });

  const now = new Date();
  const formatted = dates.map((d: typeof dates[number]) => {
    let nextOccurrence = new Date(d.date);

    if (d.isRecurring) {
      nextOccurrence.setFullYear(now.getFullYear());
      if (nextOccurrence < now) {
        nextOccurrence.setFullYear(now.getFullYear() + 1);
      }
    }

    const daysUntil = Math.ceil((nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: d.id,
      name: d.name,
      date: d.date.toISOString(),
      type: d.type,
      isRecurring: d.isRecurring,
      daysUntil: Math.max(0, daysUntil),
      nextOccurrence: nextOccurrence.toISOString(),
    };
  });

  // Sort by daysUntil
  formatted.sort((a: { daysUntil: number }, b: { daysUntil: number }) => a.daysUntil - b.daysUntil);

  return success(res, formatted);
}

export async function createSpecialDate(req: Request, res: Response) {
  const { name, date, type, isRecurring } = req.body;

  const specialDate = await prisma.specialDate.create({
    data: {
      coupleId: req.coupleId!,
      name,
      date: new Date(date),
      type,
      isRecurring,
    },
  });

  return success(res, {
    id: specialDate.id,
    name: specialDate.name,
    date: specialDate.date.toISOString(),
    type: specialDate.type,
    isRecurring: specialDate.isRecurring,
    daysUntil: 0,
  }, 'Special date added! 📅', 201);
}

export async function updateSpecialDate(req: Request, res: Response) {
  const existing = await prisma.specialDate.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId },
  });

  if (!existing) return error(res, 'Special date not found', 404);

  const updated = await prisma.specialDate.update({
    where: { id: req.params.id as string },
    data: {
      name: req.body.name,
      date: req.body.date ? new Date(req.body.date) : undefined,
      type: req.body.type,
      isRecurring: req.body.isRecurring,
    },
  });

  return success(res, updated, 'Updated! ✨');
}

export async function deleteSpecialDate(req: Request, res: Response) {
  const existing = await prisma.specialDate.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId },
  });

  if (!existing) return error(res, 'Special date not found', 404);

  await prisma.specialDate.delete({ where: { id: req.params.id as string } });
  return success(res, null, 'Special date removed');
}

export async function getMilestones(req: Request, res: Response) {
  const couple = await prisma.couple.findUnique({
    where: { id: req.coupleId },
    select: { relationshipStartDate: true },
  });

  if (!couple?.relationshipStartDate) {
    return success(res, []);
  }

  const daysTogether = Math.floor(
    (Date.now() - couple.relationshipStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const milestones = [
    { days: 100, label: '100 Days', icon: '💯' },
    { days: 182, label: '6 Months', icon: '🌙' },
    { days: 365, label: '1 Year', icon: '🎂' },
    { days: 500, label: '500 Days', icon: '🌟' },
    { days: 730, label: '2 Years', icon: '💕' },
    { days: 1000, label: '1000 Days', icon: '🏆' },
    { days: 1095, label: '3 Years', icon: '💎' },
    { days: 1825, label: '5 Years', icon: '🥂' },
    { days: 2555, label: '7 Years', icon: '🌈' },
    { days: 3650, label: '10 Years', icon: '👑' },
  ];

  const formatted = milestones.map((m: typeof milestones[number]) => ({
    ...m,
    achieved: daysTogether >= m.days,
    daysUntil: Math.max(0, m.days - daysTogether),
    date: new Date(couple.relationshipStartDate!.getTime() + m.days * 86400000).toISOString(),
  }));

  return success(res, formatted);
}

import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';

export async function getBucketList(req: Request, res: Response) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);
  const category = req.query.category as string | undefined;
  const status = req.query.status as string || 'all';

  const where: any = { coupleId: req.coupleId, deletedAt: null };
  if (category) where.category = category;
  if (status === 'completed') where.isCompleted = true;
  if (status === 'pending') where.isCompleted = false;

  const [items, total] = await Promise.all([
    prisma.bucketListItem.findMany({
      where,
      orderBy: [{ isCompleted: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bucketListItem.count({ where }),
  ]);

  const formatted = items.map((i: typeof items[number]) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    priority: i.priority,
    isCompleted: i.isCompleted,
    completedAt: i.completedAt?.toISOString(),
    dueDate: i.dueDate?.toISOString(),
    assignedTo: i.assignedTo,
    createdAt: i.createdAt.toISOString(),
  }));

  return paginated(res, formatted, total, page, pageSize);
}

export async function createBucketItem(req: Request, res: Response) {
  const item = await prisma.bucketListItem.create({
    data: {
      coupleId: req.coupleId!,
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    },
  });

  return success(res, {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    priority: item.priority,
    isCompleted: false,
    completedAt: null,
    dueDate: item.dueDate?.toISOString(),
    assignedTo: item.assignedTo,
    createdAt: item.createdAt.toISOString(),
  }, 'Added to bucket list! 🎯', 201);
}

export async function updateBucketItem(req: Request, res: Response) {
  const existing = await prisma.bucketListItem.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
  });

  if (!existing) return error(res, 'Bucket list item not found', 404);

  const item = await prisma.bucketListItem.update({
    where: { id: req.params.id as string },
    data: {
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    },
  });

  return success(res, item, 'Updated! ✏️');
}

export async function toggleBucketItem(req: Request, res: Response) {
  const existing = await prisma.bucketListItem.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
  });

  if (!existing) return error(res, 'Item not found', 404);

  const item = await prisma.bucketListItem.update({
    where: { id: req.params.id as string },
    data: {
      isCompleted: !existing.isCompleted,
      completedAt: existing.isCompleted ? null : new Date(),
    },
  });

  const message = item.isCompleted ? 'Completed! 🎉🎊' : 'Marked as pending';
  return success(res, item, message);
}

export async function deleteBucketItem(req: Request, res: Response) {
  const existing = await prisma.bucketListItem.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
  });

  if (!existing) return error(res, 'Item not found', 404);

  await prisma.bucketListItem.update({
    where: { id: req.params.id as string },
    data: { deletedAt: new Date() },
  });

  return success(res, null, 'Item removed');
}

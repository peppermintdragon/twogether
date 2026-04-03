import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { success, error, paginated } from '../utils/apiResponse.js';

export async function getMemories(req: Request, res: Response) {
  const { page, pageSize, search, moodTag, startDate, endDate, albumId } = req.query as any;
  const skip = (Number(page || 1) - 1) * Number(pageSize || 20);
  const take = Number(pageSize || 20);

  const where: any = {
    coupleId: req.coupleId,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (moodTag) where.moodTag = moodTag;
  if (albumId) where.albumId = albumId;

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, profilePhoto: true } },
        photos: {
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.memory.count({ where }),
  ]);

  const formatted = memories.map(formatMemory);
  return paginated(res, formatted, total, Number(page || 1), take);
}

export async function getMemory(req: Request, res: Response) {
  const memory = await prisma.memory.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, profilePhoto: true } },
      photos: {
        include: { media: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!memory) {
    return error(res, 'Memory not found', 404);
  }

  return success(res, formatMemory(memory));
}

export async function createMemory(req: Request, res: Response) {
  const { title, description, date, location, moodTag, albumId } = req.body;

  const memory = await prisma.memory.create({
    data: {
      coupleId: req.coupleId!,
      authorId: req.userId!,
      title,
      description,
      date: new Date(date),
      location,
      moodTag,
      albumId,
    },
    include: {
      author: { select: { id: true, name: true, profilePhoto: true } },
      photos: { include: { media: true } },
    },
  });

  // Handle photo uploads
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const media = await prisma.media.create({
        data: {
          coupleId: req.coupleId,
          uploadedById: req.userId!,
          url: `/uploads/memories/${file.filename}`,
          type: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
          sizeBytes: file.size,
          originalName: file.originalname,
        },
      });

      await prisma.memoryMedia.create({
        data: { memoryId: memory.id, mediaId: media.id, order: i },
      });
    }
  }

  // Refetch with photos
  const full = await prisma.memory.findUnique({
    where: { id: memory.id },
    include: {
      author: { select: { id: true, name: true, profilePhoto: true } },
      photos: { include: { media: true }, orderBy: { order: 'asc' } },
    },
  });

  return success(res, formatMemory(full!), 'Memory saved! 📸', 201);
}

export async function updateMemory(req: Request, res: Response) {
  const existing = await prisma.memory.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
  });

  if (!existing) {
    return error(res, 'Memory not found', 404);
  }

  const memory = await prisma.memory.update({
    where: { id: req.params.id as string },
    data: {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date ? new Date(req.body.date) : undefined,
      location: req.body.location,
      moodTag: req.body.moodTag,
      albumId: req.body.albumId,
    },
    include: {
      author: { select: { id: true, name: true, profilePhoto: true } },
      photos: { include: { media: true }, orderBy: { order: 'asc' } },
    },
  });

  return success(res, formatMemory(memory), 'Memory updated! ✏️');
}

export async function deleteMemory(req: Request, res: Response) {
  const existing = await prisma.memory.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId, deletedAt: null },
  });

  if (!existing) {
    return error(res, 'Memory not found', 404);
  }

  await prisma.memory.update({
    where: { id: req.params.id as string },
    data: { deletedAt: new Date() },
  });

  return success(res, null, 'Memory deleted');
}

export async function getOnThisDay(req: Request, res: Response) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const memories = await prisma.$queryRaw<any[]>`
    SELECT m.*, u.name as "authorName", u."profilePhoto" as "authorPhoto"
    FROM "Memory" m
    JOIN "User" u ON m."authorId" = u.id
    WHERE m."coupleId" = ${req.coupleId}
      AND m."deletedAt" IS NULL
      AND EXTRACT(MONTH FROM m.date) = ${month}
      AND EXTRACT(DAY FROM m.date) = ${day}
      AND EXTRACT(YEAR FROM m.date) < ${today.getFullYear()}
    ORDER BY m.date DESC
  `;

  return success(res, memories);
}

// Albums
export async function getAlbums(req: Request, res: Response) {
  const albums = await prisma.album.findMany({
    where: { coupleId: req.coupleId },
    include: { _count: { select: { memories: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = albums.map((a: typeof albums[number]) => ({
    id: a.id,
    name: a.name,
    coverPhoto: a.coverPhoto,
    memoryCount: a._count.memories,
    createdAt: a.createdAt.toISOString(),
  }));

  return success(res, formatted);
}

export async function createAlbum(req: Request, res: Response) {
  const album = await prisma.album.create({
    data: {
      coupleId: req.coupleId!,
      name: req.body.name,
    },
  });

  return success(res, {
    id: album.id,
    name: album.name,
    coverPhoto: null,
    memoryCount: 0,
    createdAt: album.createdAt.toISOString(),
  }, 'Album created! 📚', 201);
}

export async function deleteAlbum(req: Request, res: Response) {
  const album = await prisma.album.findFirst({
    where: { id: req.params.id as string, coupleId: req.coupleId },
  });

  if (!album) return error(res, 'Album not found', 404);

  // Unset albumId on memories, don't delete them
  await prisma.memory.updateMany({
    where: { albumId: album.id },
    data: { albumId: null },
  });

  await prisma.album.delete({ where: { id: album.id } });
  return success(res, null, 'Album deleted');
}

function formatMemory(m: any) {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    date: m.date.toISOString(),
    location: m.location,
    moodTag: m.moodTag,
    albumId: m.albumId,
    author: m.author,
    photos: (m.photos || []).map((p: any) => ({
      id: p.media.id,
      url: p.media.url,
      thumbnailUrl: p.media.thumbnailUrl,
      type: p.media.type,
      width: p.media.width,
      height: p.media.height,
    })),
    createdAt: m.createdAt.toISOString(),
  };
}

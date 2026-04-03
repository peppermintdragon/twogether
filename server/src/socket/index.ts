import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

let io: Server;

export function getIO(): Server {
  return io;
}

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) return callback(null, true);
        if (origin === env.CLIENT_URL) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId, deletedAt: null },
        include: { coupleUsers: { select: { coupleId: true } } },
      });

      if (!user) return next(new Error('User not found'));

      socket.data.userId = user.id;
      socket.data.userName = user.name;
      socket.data.coupleId = user.coupleUsers[0]?.coupleId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, userName, coupleId } = socket.data;
    logger.info(`Socket connected: ${userName} (${userId})`);

    // Join couple room
    if (coupleId) {
      socket.join(`couple:${coupleId}`);

      // Notify partner of online status
      socket.to(`couple:${coupleId}`).emit('partner:online', { isOnline: true });
    }

    // ─── Daily Notes ───────────────────────────────

    socket.on('note:send', async (data) => {
      if (!coupleId) return;

      try {
        const note = await prisma.dailyNote.create({
          data: {
            coupleId,
            authorId: userId,
            content: data.content,
            emotionIcon: data.emotionIcon,
            status: 'SENT',
          },
          include: {
            author: { select: { id: true, name: true, profilePhoto: true } },
          },
        });

        // Emit to partner
        socket.to(`couple:${coupleId}`).emit('note:received', {
          id: note.id,
          content: note.content,
          emotionIcon: note.emotionIcon,
          status: 'SENT',
          author: note.author,
          sentAt: note.sentAt.toISOString(),
          readAt: null,
        });

        // Create notification for partner
        const partner = await prisma.coupleUser.findFirst({
          where: { coupleId, userId: { not: userId } },
        });

        if (partner) {
          const notif = await prisma.notification.create({
            data: {
              userId: partner.userId,
              type: 'NOTE_RECEIVED',
              title: 'New Note 💌',
              body: `${userName} sent you a note!`,
            },
          });

          socket.to(`couple:${coupleId}`).emit('notification:new', {
            id: notif.id,
            type: 'NOTE_RECEIVED',
            title: notif.title,
            body: notif.body,
            readAt: undefined,
            createdAt: notif.createdAt.toISOString(),
          });
        }
      } catch (err) {
        logger.error({ err }, 'Failed to send note via socket');
      }
    });

    socket.on('note:typing', (data) => {
      if (!coupleId) return;
      socket.to(`couple:${coupleId}`).emit('note:partner-typing', {
        isTyping: data.isTyping,
      });
    });

    socket.on('note:read', async (data) => {
      if (!coupleId) return;

      try {
        await prisma.dailyNote.update({
          where: { id: data.noteId },
          data: { status: 'READ', readAt: new Date() },
        });

        socket.to(`couple:${coupleId}`).emit('note:read-receipt', {
          noteId: data.noteId,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err }, 'Failed to mark note as read');
      }
    });

    // ─── Mood ──────────────────────────────────────

    socket.on('mood:set', async (data) => {
      if (!coupleId) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.moodEntry.upsert({
          where: { userId_date: { userId, date: today } },
          update: { mood: data.mood },
          create: { userId, coupleId, mood: data.mood, date: today },
        });

        socket.to(`couple:${coupleId}`).emit('mood:partner-updated', {
          mood: data.mood,
          date: today.toISOString(),
        });

        // Check for mood match
        const partnerMood = await prisma.moodEntry.findFirst({
          where: { coupleId, userId: { not: userId }, date: today },
        });

        if (partnerMood?.mood === data.mood) {
          io.to(`couple:${coupleId}`).emit('mood:match', {
            mood: data.mood,
            date: today.toISOString(),
          });
        }
      } catch (err) {
        logger.error({ err }, 'Failed to set mood via socket');
      }
    });

    // ─── Ping ──────────────────────────────────────

    socket.on('ping:send', async () => {
      if (!coupleId) return;

      try {
        const partner = await prisma.coupleUser.findFirst({
          where: { coupleId, userId: { not: userId } },
        });

        if (!partner) return;

        await prisma.ping.create({
          data: { coupleId, senderId: userId, receiverId: partner.userId },
        });

        socket.to(`couple:${coupleId}`).emit('ping:received', {
          senderId: userId,
          senderName: userName,
          createdAt: new Date().toISOString(),
        });

        const notif = await prisma.notification.create({
          data: {
            userId: partner.userId,
            type: 'PING',
            title: 'Thinking of You 💕',
            body: `${userName} is thinking of you!`,
          },
        });

        socket.to(`couple:${coupleId}`).emit('notification:new', {
          id: notif.id,
          type: 'PING',
          title: notif.title,
          body: notif.body,
          readAt: undefined,
          createdAt: notif.createdAt.toISOString(),
        });
      } catch (err) {
        logger.error({ err }, 'Failed to send ping');
      }
    });

    // ─── Disconnect ────────────────────────────────

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userName}`);
      if (coupleId) {
        socket.to(`couple:${coupleId}`).emit('partner:online', { isOnline: false });
      }
    });
  });

  logger.info('Socket.io initialized');
}

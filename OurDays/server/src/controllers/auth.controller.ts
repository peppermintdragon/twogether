import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { success, error } from '../utils/apiResponse.js';
import { generateInviteCode, generateSecureToken } from '../utils/inviteCode.js';

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return error(res, 'An account with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  // Store refresh token in session
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return success(res, {
    user: formatUser(user),
    accessToken,
    refreshToken,
  }, 'Welcome to TwoGether! 💕', 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    include: { coupleUsers: { select: { coupleId: true } } },
  });

  if (!user || !user.passwordHash) {
    return error(res, 'Invalid email or password', 401);
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return error(res, 'Invalid email or password', 401);
  }

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return success(res, {
    user: formatUser(user),
    accessToken,
    refreshToken,
  });
}

export async function refreshTokenHandler(req: Request, res: Response) {
  const { refreshToken } = req.body;

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Find and validate session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      return error(res, 'Invalid or expired refresh token', 401);
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email });
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email });

    // Update session with new refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    return error(res, 'Invalid refresh token', 401);
  }
}

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId, deletedAt: null },
    include: { coupleUsers: { select: { coupleId: true } } },
  });

  if (!user) {
    return error(res, 'User not found', 404);
  }

  return success(res, formatUser(user));
}

export async function updateProfile(req: Request, res: Response) {
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...req.body,
      birthday: req.body.birthday ? new Date(req.body.birthday) : undefined,
    },
    include: { coupleUsers: { select: { coupleId: true } } },
  });

  return success(res, formatUser(user), 'Profile updated! ✨');
}

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    return error(res, 'No file uploaded', 400);
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { profilePhoto: `/uploads/avatars/${req.file.filename}` },
    include: { coupleUsers: { select: { coupleId: true } } },
  });

  return success(res, formatUser(user), 'Looking great! 📸');
}

export async function onboardingStep1(req: Request, res: Response) {
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: req.body.name,
      nickname: req.body.nickname,
      birthday: req.body.birthday ? new Date(req.body.birthday) : undefined,
      loveLanguage: req.body.loveLanguage,
    },
    include: { coupleUsers: { select: { coupleId: true } } },
  });

  return success(res, formatUser(user));
}

export async function createCouple(req: Request, res: Response) {
  const code = generateInviteCode();

  const couple = await prisma.couple.create({
    data: {
      coupleUsers: {
        create: { userId: req.userId!, role: 'creator' },
      },
      invitations: {
        create: {
          code,
          invitedById: req.userId!,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
    },
    include: {
      invitations: { where: { status: 'PENDING' }, take: 1 },
    },
  });

  return success(res, {
    couple: { id: couple.id, inviteCode: code },
    inviteCode: code,
  }, 'Couple created! Share the invite code with your partner 💌', 201);
}

export async function joinCouple(req: Request, res: Response) {
  const { inviteCode } = req.body;

  const invitation = await prisma.invitation.findUnique({
    where: { code: inviteCode },
    include: { couple: true },
  });

  if (!invitation) {
    return error(res, 'Invalid invite code', 404);
  }

  if (invitation.status !== 'PENDING') {
    return error(res, 'This invite code has already been used', 400);
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    return error(res, 'This invite code has expired', 400);
  }

  if (invitation.invitedById === req.userId) {
    return error(res, "You can't join your own couple!", 400);
  }

  // Check user doesn't already have a couple
  const existingCouple = await prisma.coupleUser.findFirst({
    where: { userId: req.userId },
  });

  if (existingCouple) {
    return error(res, 'You are already part of a couple', 400);
  }

  // Join the couple
  await prisma.$transaction([
    prisma.coupleUser.create({
      data: { coupleId: invitation.coupleId, userId: req.userId!, role: 'partner' },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    }),
  ]);

  return success(res, { coupleId: invitation.coupleId }, "You're connected! 💕");
}

export async function onboardingStep3(req: Request, res: Response) {
  if (!req.coupleId) {
    return error(res, 'You must be part of a couple', 400);
  }

  const couple = await prisma.couple.update({
    where: { id: req.coupleId },
    data: {
      relationshipStartDate: new Date(req.body.relationshipStartDate),
      howWeMet: req.body.howWeMet,
      coupleNickname: req.body.coupleNickname,
      themeColor: req.body.themeColor,
    },
  });

  return success(res, couple);
}

export async function completeOnboarding(req: Request, res: Response) {
  await prisma.user.update({
    where: { id: req.userId },
    data: { onboardingCompleted: true },
  });

  // Create default preferences
  await prisma.userPreference.upsert({
    where: { userId: req.userId! },
    update: {},
    create: { userId: req.userId! },
  });

  return success(res, null, "Welcome to TwoGether! Your journey begins now 🎉");
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.passwordHash) {
    return error(res, 'Cannot change password for OAuth accounts', 400);
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    return error(res, 'Current password is incorrect', 400);
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: req.userId },
    data: { passwordHash: newHash },
  });

  return success(res, null, 'Password updated successfully 🔒');
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
  if (!user) {
    // Return success to prevent email enumeration, but no token
    return success(res, { sent: true }, 'If an account exists with that email, a reset link is available.');
  }

  // Invalidate any existing reset tokens for this user
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateSecureToken();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // TODO: In production, send email instead of returning token directly
  return success(res, { sent: true, resetToken: token }, 'Password reset link is ready.');
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!resetRecord || resetRecord.usedAt) {
    return error(res, 'This reset link is invalid or has already been used.', 400);
  }

  if (resetRecord.expiresAt < new Date()) {
    return error(res, 'This reset link has expired. Please request a new one.', 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all sessions for security
    prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    }),
  ]);

  return success(res, null, 'Password has been reset successfully. Please log in with your new password.');
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }
  return success(res, null, 'Logged out successfully');
}

export async function disconnectCouple(req: Request, res: Response) {
  if (!req.coupleId) {
    return error(res, 'You are not part of a couple', 400);
  }

  await prisma.$transaction([
    prisma.coupleUser.deleteMany({ where: { coupleId: req.coupleId } }),
    prisma.couple.delete({ where: { id: req.coupleId } }),
  ]);

  return success(res, null, 'Couple disconnected. We hope the memories remain 💔');
}

export async function deleteAccount(req: Request, res: Response) {
  await prisma.user.update({
    where: { id: req.userId },
    data: { deletedAt: new Date() },
  });

  await prisma.session.deleteMany({ where: { userId: req.userId } });

  return success(res, null, 'Account scheduled for deletion. You have 30 days to recover it.');
}

// Helper
function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    birthday: user.birthday?.toISOString(),
    profilePhoto: user.profilePhoto,
    loveLanguage: user.loveLanguage,
    timezone: user.timezone,
    onboardingCompleted: user.onboardingCompleted,
    coupleId: user.coupleUsers?.[0]?.coupleId,
  };
}

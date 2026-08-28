import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma, createAuditLog, getClientIp } from '../lib/audit.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

const RESET_TOKEN_HOURS = 1;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    if (!email || !password || !name || !phone) {
      return res.status(400).json({ error: 'Email, password, name, and phone are required' });
    }

    if (!EMAIL_PATTERN.test(String(email).trim())) {
      return res.status(400).json({ error: 'Invalid email format. Use an address such as you@example.com.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const allowedRoles = ['USER', 'DRIVER', 'ADMIN'];
    const userRole = allowedRoles.includes(role) ? role : 'USER';

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: String(phone).trim(),
        role: userRole,
      },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });

    await createAuditLog({
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'user',
      metadata: { email: user.email, role: user.role },
      ipAddress: getClientIp(req),
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        metadata: { email: user.email },
        ipAddress: getClientIp(req),
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress: getClientIp(req),
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);

    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'auth',
      ipAddress: getClientIp(req),
    });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Mock email delivery for hackathon demo
    console.log('\n📧 Password reset link (mock email):');
    console.log(`   ${resetUrl}\n`);

    res.json({
      message: 'If that email exists, a reset link has been sent',
      // Include in dev for demo convenience
      ...(process.env.NODE_ENV !== 'production' && { resetUrl }),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: resetRecord.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'auth',
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/audit-logs', authMiddleware, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        resource: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    res.json({ logs });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;

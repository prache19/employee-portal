import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { unauthorized } from '../lib/httpError.js';
import { env } from '../config/env.js';

const router = Router();

const REFRESH_COOKIE = 'refresh_token';
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { employee: true },
    });
    if (!user) throw unauthorized('Invalid credentials');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as 'EMPLOYEE' | 'HR_ADMIN',
      employeeId: user.employee?.id ?? null,
    };
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh({ sub: user.id });

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee
          ? {
              id: user.employee.id,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              designation: user.employee.designation,
              department: user.employee.department,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('Missing refresh token');
    const decoded = verifyRefresh(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { employee: true },
    });
    if (!user) throw unauthorized('User not found');
    const accessToken = signAccess({
      sub: user.id,
      email: user.email,
      role: user.role as 'EMPLOYEE' | 'HR_ADMIN',
      employeeId: user.employee?.id ?? null,
    });
    res.json({ accessToken });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')) {
      next(unauthorized('Invalid refresh token'));
      return;
    }
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { employee: true },
    });
    if (!user) throw unauthorized();
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

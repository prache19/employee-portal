import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateSelfSchema,
  idParam,
} from '../schemas/employee.schema.js';
import { forbidden, notFound } from '../lib/httpError.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('HR_ADMIN'), async (_req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { firstName: 'asc' },
    });
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole('HR_ADMIN'),
  validate({ body: createEmployeeSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as ReturnType<typeof createEmployeeSchema.parse>;
      const passwordHash = await hashPassword(body.password);
      const result = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          role: body.role,
          employee: {
            create: {
              firstName: body.firstName,
              lastName: body.lastName,
              dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
              dateOfJoining: new Date(body.dateOfJoining),
              designation: body.designation,
              department: body.department,
              phone: body.phone,
              address: body.address,
              photoUrl: body.photoUrl,
            },
          },
        },
        include: { employee: true },
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id', validate({ params: idParam }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    if (req.user!.role !== 'HR_ADMIN' && req.user!.employeeId !== id) {
      throw forbidden('Cannot view other employees');
    }
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!emp) throw notFound('Employee not found');
    res.json(emp);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate({ params: idParam }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const isSelf = req.user!.employeeId === id;
    const isAdmin = req.user!.role === 'HR_ADMIN';
    if (!isSelf && !isAdmin) throw forbidden();

    const schema = isAdmin ? updateEmployeeSchema : updateSelfSchema;
    const body = schema.parse(req.body);

    const data: Record<string, unknown> = { ...body };
    if ('dateOfBirth' in body && body.dateOfBirth) data.dateOfBirth = new Date(body.dateOfBirth as string);
    if ('dateOfJoining' in body && body.dateOfJoining) data.dateOfJoining = new Date(body.dateOfJoining as string);

    const updated = await prisma.employee.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('HR_ADMIN'), validate({ params: idParam }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) throw notFound('Employee not found');
    await prisma.user.delete({ where: { id: emp.userId } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  assignAssetSchema,
  createAssetSchema,
  returnAssetSchema,
  updateAssetSchema,
} from '../schemas/asset.schema.js';
import { idParam } from '../schemas/employee.schema.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user!.role === 'HR_ADMIN';
    if (isAdmin) {
      const assets = await prisma.asset.findMany({
        orderBy: { assetTag: 'asc' },
        include: {
          currentEmployee: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      res.json(assets);
      return;
    }
    if (!req.user!.employeeId) throw forbidden('No employee linked');
    const assets = await prisma.asset.findMany({
      where: { currentEmployeeId: req.user!.employeeId },
      orderBy: { assetTag: 'asc' },
    });
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole('HR_ADMIN'),
  validate({ body: createAssetSchema }),
  async (req, res, next) => {
    try {
      const body = req.body as ReturnType<typeof createAssetSchema.parse>;
      const asset = await prisma.asset.create({
        data: {
          assetTag: body.assetTag,
          type: body.type,
          brand: body.brand,
          model: body.model,
          serialNumber: body.serialNumber,
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
          status: body.status ?? 'AVAILABLE',
        },
      });
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id',
  requireRole('HR_ADMIN'),
  validate({ params: idParam, body: updateAssetSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as ReturnType<typeof updateAssetSchema.parse>;
      const data: Record<string, unknown> = { ...body };
      if (body.purchaseDate) data.purchaseDate = new Date(body.purchaseDate);
      const asset = await prisma.asset.update({ where: { id }, data });
      res.json(asset);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/assign',
  requireRole('HR_ADMIN'),
  validate({ params: idParam, body: assignAssetSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { employeeId, notes } = req.body as ReturnType<typeof assignAssetSchema.parse>;

      const asset = await prisma.asset.findUnique({ where: { id } });
      if (!asset) throw notFound('Asset not found');
      if (asset.status === 'ASSIGNED') throw badRequest('Asset already assigned');
      if (asset.status === 'RETIRED') throw badRequest('Asset is retired');

      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw notFound('Employee not found');

      const now = new Date();
      const [updated] = await prisma.$transaction([
        prisma.asset.update({
          where: { id },
          data: { status: 'ASSIGNED', currentEmployeeId: employeeId, assignedAt: now },
        }),
        prisma.assetHistory.create({
          data: { assetId: id, employeeId, assignedAt: now, notes },
        }),
      ]);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/return',
  requireRole('HR_ADMIN'),
  validate({ params: idParam, body: returnAssetSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { notes } = req.body as ReturnType<typeof returnAssetSchema.parse>;

      const asset = await prisma.asset.findUnique({ where: { id } });
      if (!asset) throw notFound('Asset not found');
      if (asset.status !== 'ASSIGNED' || !asset.currentEmployeeId) {
        throw badRequest('Asset is not currently assigned');
      }

      const now = new Date();
      const history = await prisma.assetHistory.findFirst({
        where: { assetId: id, employeeId: asset.currentEmployeeId, returnedAt: null },
        orderBy: { assignedAt: 'desc' },
      });

      const updateAsset = prisma.asset.update({
        where: { id },
        data: { status: 'AVAILABLE', currentEmployeeId: null, assignedAt: null },
      });
      const [updated] = history
        ? await prisma.$transaction([
            updateAsset,
            prisma.assetHistory.update({
              where: { id: history.id },
              data: { returnedAt: now, notes: notes ?? history.notes },
            }),
          ])
        : await prisma.$transaction([updateAsset]);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id', requireRole('HR_ADMIN'), validate({ params: idParam }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.asset.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

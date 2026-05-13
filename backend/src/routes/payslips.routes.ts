import path from 'node:path';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPayslipSchema, listPayslipsQuery } from '../schemas/payslip.schema.js';
import { idParam } from '../schemas/employee.schema.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';
import { env } from '../config/env.js';
import { sendPayslipNotification } from '../lib/mailer.js';

const router = Router();

const uploadDir = path.resolve(env.UPLOAD_DIR, 'payslips');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, _file, cb) => {
    const b = req.body as { employeeId?: string; month?: string; year?: string };
    const stamp = `${b.employeeId ?? 'unknown'}_${b.year ?? '0000'}_${String(b.month ?? '00').padStart(2, '0')}_${Date.now()}`;
    cb(null, `${stamp}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(badRequest('Only PDF allowed'));
    cb(null, true);
  },
});

router.use(requireAuth);

router.get('/', validate({ query: listPayslipsQuery }), async (req, res, next) => {
  try {
    const q = req.query as { employeeId?: string; year?: number };
    const isAdmin = req.user!.role === 'HR_ADMIN';
    const where: Record<string, unknown> = {};

    if (isAdmin) {
      if (q.employeeId) where.employeeId = q.employeeId;
    } else {
      if (!req.user!.employeeId) throw forbidden('No employee linked');
      where.employeeId = req.user!.employeeId;
    }
    if (q.year) where.year = q.year;

    const list = await prisma.payslip.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: isAdmin
        ? { employee: { select: { id: true, firstName: true, lastName: true } } }
        : undefined,
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('HR_ADMIN'), upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) throw badRequest('PDF file required');
    const parsed = createPayslipSchema.parse(req.body);

    const employee = await prisma.employee.findUnique({
      where: { id: parsed.employeeId },
      include: { user: { select: { email: true } } },
    });
    if (!employee) {
      fs.unlinkSync(req.file.path);
      throw notFound('Employee not found');
    }

    const payslip = await prisma.payslip.create({
      data: {
        employeeId: parsed.employeeId,
        month: parsed.month,
        year: parsed.year,
        grossSalary: parsed.grossSalary,
        deductions: parsed.deductions,
        netSalary: parsed.netSalary,
        pdfPath: req.file.filename,
        uploadedById: req.user!.sub,
      },
    });

    // Fire-and-forget: don't block the upload response on SMTP.
    void sendPayslipNotification(
      employee.user.email,
      employee.firstName,
      payslip.month,
      payslip.year,
    );

    res.status(201).json(payslip);
  } catch (err) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    next(err);
  }
});

router.get('/:id/download', validate({ params: idParam }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const payslip = await prisma.payslip.findUnique({ where: { id } });
    if (!payslip) throw notFound('Payslip not found');

    const isAdmin = req.user!.role === 'HR_ADMIN';
    const isOwner = req.user!.employeeId === payslip.employeeId;
    if (!isAdmin && !isOwner) throw forbidden();

    const filePath = path.join(uploadDir, payslip.pdfPath);
    if (!fs.existsSync(filePath)) throw notFound('File missing on disk');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip_${payslip.year}_${String(payslip.month).padStart(2, '0')}.pdf"`,
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;

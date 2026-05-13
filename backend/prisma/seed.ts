import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
  ],
});

import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const uploadsDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads', 'payslips');

async function hash(p: string) {
  return bcrypt.hash(p, 10);
}

function writePayslipPdf(filename: string, info: {
  name: string;
  month: number;
  year: number;
  gross: number;
  deductions: number;
  net: number;
}) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const full = path.join(uploadsDir, filename);
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(full);
    stream.on('finish', () => resolve());
    stream.on('error', reject);
    doc.pipe(stream);

    doc.fontSize(20).text('Salary Slip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${info.name}`);
    doc.text(`Period: ${String(info.month).padStart(2, '0')}/${info.year}`);
    doc.moveDown();
    doc.text(`Gross Salary:    ${info.gross.toFixed(2)}`);
    doc.text(`Deductions:      ${info.deductions.toFixed(2)}`);
    doc.text(`Net Salary:      ${info.net.toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(10).fillColor('gray').text('This is a system-generated sample payslip.', { align: 'center' });
    doc.end();
  });
}

async function main() {
  console.log('Seeding database...');
  await prisma.assetHistory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const hr = await prisma.user.create({
    data: {
      email: 'hr@company.com',
      passwordHash: await hash('Admin@123'),
      role: 'HR_ADMIN',
      employee: {
        create: {
          firstName: 'Hannah',
          lastName: 'Rivera',
          dateOfJoining: new Date('2018-04-01'),
          designation: 'HR Manager',
          department: 'Human Resources',
          phone: '+1-555-0100',
          address: '12 Office Plaza, Suite 200',
        },
      },
    },
    include: { employee: true },
  });

  const employeeSpecs = [
    {
      email: 'emp1@company.com',
      firstName: 'Alex',
      lastName: 'Chen',
      designation: 'Senior Software Engineer',
      department: 'Engineering',
      dateOfJoining: new Date('2021-08-15'),
      phone: '+1-555-0111',
      gross: 8500,
      deductions: 1700,
    },
    {
      email: 'emp2@company.com',
      firstName: 'Priya',
      lastName: 'Sharma',
      designation: 'Product Designer',
      department: 'Design',
      dateOfJoining: new Date('2022-02-01'),
      phone: '+1-555-0112',
      gross: 7200,
      deductions: 1440,
    },
    {
      email: 'emp3@company.com',
      firstName: 'Marco',
      lastName: 'Bianchi',
      designation: 'DevOps Engineer',
      department: 'Engineering',
      dateOfJoining: new Date('2023-06-12'),
      phone: '+1-555-0113',
      gross: 7800,
      deductions: 1560,
    },
  ];

  const employees = [];
  for (const spec of employeeSpecs) {
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash: await hash('Emp@123'),
        role: 'EMPLOYEE',
        employee: {
          create: {
            firstName: spec.firstName,
            lastName: spec.lastName,
            dateOfJoining: spec.dateOfJoining,
            designation: spec.designation,
            department: spec.department,
            phone: spec.phone,
          },
        },
      },
      include: { employee: true },
    });
    employees.push({ user, ...spec });
  }

  for (const e of employees) {
    for (const period of [
      { month: 3, year: 2026 },
      { month: 4, year: 2026 },
    ]) {
      const net = e.gross - e.deductions;
      const filename = `${e.user.employee!.id}_${period.year}_${String(period.month).padStart(2, '0')}_seed.pdf`;
      await writePayslipPdf(filename, {
        name: `${e.firstName} ${e.lastName}`,
        month: period.month,
        year: period.year,
        gross: e.gross,
        deductions: e.deductions,
        net,
      });
      await prisma.payslip.create({
        data: {
          employeeId: e.user.employee!.id,
          month: period.month,
          year: period.year,
          grossSalary: e.gross,
          deductions: e.deductions,
          netSalary: net,
          pdfPath: filename,
          uploadedById: hr.id,
        },
      });
    }
  }

  const assetSpecs = [
    { assetTag: 'LAP-001', type: 'LAPTOP', brand: 'Dell', model: 'XPS 15', serialNumber: 'SN-LAP-001', assignTo: 0 },
    { assetTag: 'LAP-002', type: 'LAPTOP', brand: 'Apple', model: 'MacBook Pro 14', serialNumber: 'SN-LAP-002', assignTo: 1 },
    { assetTag: 'LAP-003', type: 'LAPTOP', brand: 'Lenovo', model: 'ThinkPad X1', serialNumber: 'SN-LAP-003', assignTo: 2 },
    { assetTag: 'MON-001', type: 'MONITOR', brand: 'LG', model: 'UltraFine 27"', serialNumber: 'SN-MON-001', assignTo: 0 },
    { assetTag: 'PHN-001', type: 'PHONE', brand: 'Apple', model: 'iPhone 15', serialNumber: 'SN-PHN-001', assignTo: null },
  ];

  for (const spec of assetSpecs) {
    const data: Parameters<typeof prisma.asset.create>[0]['data'] = {
      assetTag: spec.assetTag,
      type: spec.type,
      brand: spec.brand,
      model: spec.model,
      serialNumber: spec.serialNumber,
      purchaseDate: new Date('2024-01-15'),
      status: 'AVAILABLE',
    };
    if (spec.assignTo !== null) {
      const empId = employees[spec.assignTo].user.employee!.id;
      data.status = 'ASSIGNED';
      data.currentEmployeeId = empId;
      data.assignedAt = new Date();
    }
    const asset = await prisma.asset.create({ data });
    if (spec.assignTo !== null) {
      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          employeeId: employees[spec.assignTo].user.employee!.id,
          assignedAt: new Date(),
          notes: 'Initial assignment (seed)',
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log('  HR:       hr@company.com / Admin@123');
  console.log('  Employee: emp1@company.com / Emp@123');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

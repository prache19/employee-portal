import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';

export async function resetDb() {
  await prisma.assetHistory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
}

export async function createHR(email = 'hr@test.com', password = 'Admin@123') {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'HR_ADMIN',
      employee: {
        create: {
          firstName: 'HR',
          lastName: 'Admin',
          dateOfJoining: new Date('2020-01-01'),
          designation: 'HR Manager',
          department: 'HR',
        },
      },
    },
    include: { employee: true },
  });
}

export async function createEmployee(email = 'emp@test.com', password = 'Emp@123') {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'EMPLOYEE',
      employee: {
        create: {
          firstName: 'Test',
          lastName: 'Employee',
          dateOfJoining: new Date('2022-01-01'),
          designation: 'Engineer',
          department: 'Engineering',
        },
      },
    },
    include: { employee: true },
  });
}

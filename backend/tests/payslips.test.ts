import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createEmployee, createHR, resetDb } from './helpers.js';

const app = createApp();

const fakePdf = Buffer.from('%PDF-1.4\n%fake test pdf\n%%EOF');

async function loginAs(email: string, password: string) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.accessToken as string;
}

describe('payslips', () => {
  let empId = '';

  beforeEach(async () => {
    await resetDb();
    await createHR();
    const emp = await createEmployee();
    empId = emp.employee!.id;
  });

  it('HR uploads a payslip for an employee', async () => {
    const token = await loginAs('hr@test.com', 'Admin@123');
    const r = await request(app)
      .post('/api/payslips')
      .set('Authorization', `Bearer ${token}`)
      .field('employeeId', empId)
      .field('month', '4')
      .field('year', '2026')
      .field('grossSalary', '5000')
      .field('deductions', '1000')
      .field('netSalary', '4000')
      .attach('pdf', fakePdf, { filename: 'p.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(201);
    expect(r.body.employeeId).toBe(empId);
  });

  it('employee can list and download own payslip', async () => {
    const hrToken = await loginAs('hr@test.com', 'Admin@123');
    const up = await request(app)
      .post('/api/payslips')
      .set('Authorization', `Bearer ${hrToken}`)
      .field('employeeId', empId)
      .field('month', '4')
      .field('year', '2026')
      .field('grossSalary', '5000')
      .field('deductions', '1000')
      .field('netSalary', '4000')
      .attach('pdf', fakePdf, { filename: 'p.pdf', contentType: 'application/pdf' });

    const empToken = await loginAs('emp@test.com', 'Emp@123');
    const list = await request(app).get('/api/payslips').set('Authorization', `Bearer ${empToken}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const dl = await request(app)
      .get(`/api/payslips/${up.body.id}/download`)
      .set('Authorization', `Bearer ${empToken}`);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-type']).toContain('application/pdf');
  });

  it('employee cannot upload payslips', async () => {
    const token = await loginAs('emp@test.com', 'Emp@123');
    const r = await request(app)
      .post('/api/payslips')
      .set('Authorization', `Bearer ${token}`)
      .field('employeeId', empId)
      .field('month', '4')
      .field('year', '2026')
      .field('grossSalary', '5000')
      .field('deductions', '1000')
      .field('netSalary', '4000')
      .attach('pdf', fakePdf, { filename: 'p.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(403);
  });
});

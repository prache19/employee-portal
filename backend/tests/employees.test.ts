import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createEmployee, createHR, resetDb } from './helpers.js';

const app = createApp();

async function loginAs(email: string, password: string) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.accessToken as string;
}

describe('employees', () => {
  beforeEach(async () => {
    await resetDb();
    await createHR();
    await createEmployee();
  });

  it('HR can list all employees', async () => {
    const token = await loginAs('hr@test.com', 'Admin@123');
    const r = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBe(2);
  });

  it('employee cannot list employees', async () => {
    const token = await loginAs('emp@test.com', 'Emp@123');
    const r = await request(app).get('/api/employees').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('HR creates an employee', async () => {
    const token = await loginAs('hr@test.com', 'Admin@123');
    const r = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'new@test.com',
        password: 'NewPass@123',
        firstName: 'New',
        lastName: 'Hire',
        dateOfJoining: '2026-05-01',
        designation: 'Junior Dev',
        department: 'Engineering',
      });
    expect(r.status).toBe(201);
    expect(r.body.email).toBe('new@test.com');
    expect(r.body.employee.firstName).toBe('New');
  });

  it('employee can read self by id', async () => {
    const hrToken = await loginAs('hr@test.com', 'Admin@123');
    const list = await request(app).get('/api/employees').set('Authorization', `Bearer ${hrToken}`);
    const emp = (list.body as Array<{ id: string; user: { email: string } }>).find(
      (e) => e.user.email === 'emp@test.com',
    )!;
    const empToken = await loginAs('emp@test.com', 'Emp@123');
    const r = await request(app)
      .get(`/api/employees/${emp.id}`)
      .set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(emp.id);
  });

  it('employee cannot read another employee', async () => {
    const hrToken = await loginAs('hr@test.com', 'Admin@123');
    const list = await request(app).get('/api/employees').set('Authorization', `Bearer ${hrToken}`);
    const hr = (list.body as Array<{ id: string; user: { email: string } }>).find(
      (e) => e.user.email === 'hr@test.com',
    )!;
    const empToken = await loginAs('emp@test.com', 'Emp@123');
    const r = await request(app)
      .get(`/api/employees/${hr.id}`)
      .set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(403);
  });
});

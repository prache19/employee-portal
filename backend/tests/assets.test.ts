import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createEmployee, createHR, resetDb } from './helpers.js';

const app = createApp();

async function loginAs(email: string, password: string) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.accessToken as string;
}

describe('assets', () => {
  let empId = '';

  beforeEach(async () => {
    await resetDb();
    await createHR();
    const emp = await createEmployee();
    empId = emp.employee!.id;
  });

  it('HR creates, assigns, and returns an asset', async () => {
    const token = await loginAs('hr@test.com', 'Admin@123');
    const create = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetTag: 'LAP-99', type: 'LAPTOP', brand: 'Dell', model: 'XPS' });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('AVAILABLE');

    const assign = await request(app)
      .post(`/api/assets/${create.body.id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: empId, notes: 'on hire' });
    expect(assign.status).toBe(200);
    expect(assign.body.status).toBe('ASSIGNED');
    expect(assign.body.currentEmployeeId).toBe(empId);

    const ret = await request(app)
      .post(`/api/assets/${create.body.id}/return`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'returned' });
    expect(ret.status).toBe(200);
    expect(ret.body.status).toBe('AVAILABLE');
    expect(ret.body.currentEmployeeId).toBeNull();
  });

  it('employee sees only their own assets', async () => {
    const hrToken = await loginAs('hr@test.com', 'Admin@123');
    const a = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ assetTag: 'MON-A', type: 'MONITOR', brand: 'LG', model: '27"' });
    await request(app)
      .post(`/api/assets/${a.body.id}/assign`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ employeeId: empId });
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ assetTag: 'MON-B', type: 'MONITOR', brand: 'LG', model: '24"' });

    const empToken = await loginAs('emp@test.com', 'Emp@123');
    const r = await request(app).get('/api/assets').set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(200);
    expect(r.body.length).toBe(1);
    expect(r.body[0].assetTag).toBe('MON-A');
  });

  it('employee cannot create an asset', async () => {
    const token = await loginAs('emp@test.com', 'Emp@123');
    const r = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetTag: 'X', type: 'LAPTOP', brand: 'Dell', model: 'XPS' });
    expect(r.status).toBe(403);
  });

  it('rejects assigning an already-assigned asset', async () => {
    const token = await loginAs('hr@test.com', 'Admin@123');
    const a = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ assetTag: 'LAP-Z', type: 'LAPTOP', brand: 'Dell', model: 'XPS' });
    await request(app)
      .post(`/api/assets/${a.body.id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: empId });
    const r = await request(app)
      .post(`/api/assets/${a.body.id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: empId });
    expect(r.status).toBe(400);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createHR, resetDb } from './helpers.js';

const app = createApp();

describe('auth', () => {
  beforeEach(async () => {
    await resetDb();
    await createHR();
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@test.com', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('HR_ADMIN');
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@test.com', password: 'Admin@123' });
    expect(res.status).toBe(401);
  });

  it('returns me when authenticated', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@test.com', password: 'Admin@123' });
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('hr@test.com');
  });

  it('rejects me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

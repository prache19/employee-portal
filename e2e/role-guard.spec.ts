import { test, expect } from '@playwright/test';
import { EMP1, login } from './helpers';

test.describe('Role-based route guarding', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, EMP1);
  });

  test('employee is redirected away from /admin/employees', async ({ page }) => {
    await page.goto('/admin/employees');
    await page.waitForURL(/\/$/);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });

  test('employee is redirected away from /admin/payslips', async ({ page }) => {
    await page.goto('/admin/payslips');
    await page.waitForURL(/\/$/);
  });

  test('employee is redirected away from /admin/assets', async ({ page }) => {
    await page.goto('/admin/assets');
    await page.waitForURL(/\/$/);
  });

  test('API call to /api/employees as employee returns 403', async ({ request, page }) => {
    // grab the access token from the running page session
    const apiBase = 'http://localhost:4000/api';
    const login = await request.post(`${apiBase}/auth/login`, {
      data: { email: EMP1.email, password: EMP1.password },
    });
    expect(login.ok()).toBeTruthy();
    const { accessToken } = await login.json();

    const list = await request.get(`${apiBase}/employees`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(list.status()).toBe(403);

    // suppress unused-var lint
    void page;
  });
});

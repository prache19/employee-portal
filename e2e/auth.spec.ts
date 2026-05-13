import { test, expect } from '@playwright/test';
import { EMP1, HR, login, logout, navLink } from './helpers';

test.describe('Authentication', () => {
  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@nowhere.com');
    await page.getByLabel('Password').fill('badpass');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText(/invalid credentials/i);
  });

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/login$/);
  });

  test('HR signs in, dashboard shows admin section', async ({ page }) => {
    await login(page, HR);
    await expect(navLink(page, 'Employees')).toBeVisible();
    await expect(navLink(page, 'Upload Payslip')).toBeVisible();
    await expect(navLink(page, 'Manage Assets')).toBeVisible();
  });

  test('Employee signs in, no admin section visible', async ({ page }) => {
    await login(page, EMP1);
    await expect(navLink(page, 'Upload Payslip')).toHaveCount(0);
    await expect(navLink(page, 'Manage Assets')).toHaveCount(0);
    await expect(navLink(page, 'My Assets')).toBeVisible();
  });

  test('Logout returns to /login', async ({ page }) => {
    await login(page, EMP1);
    await logout(page);
    await expect(page).toHaveURL(/\/login$/);
  });
});

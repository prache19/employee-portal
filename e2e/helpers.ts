import type { Page, Locator } from '@playwright/test';

export const HR = { email: 'hr@company.com', password: 'Admin@123' };
export const EMP1 = { email: 'emp1@company.com', password: 'Emp@123' };
export const EMP2 = { email: 'emp2@company.com', password: 'Emp@123' };

export async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.getByRole('heading', { name: /welcome/i }).waitFor();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await page.waitForURL(/\/login$/);
}

/** Scope to the sidebar so we don't collide with dashboard tile links. */
export function navLink(page: Page, name: string): Locator {
  return page.getByRole('navigation').getByRole('link', { name, exact: true });
}

import { test, expect } from '@playwright/test';
import { EMP1, login, navLink } from './helpers';

test.describe('Employee self-service', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, EMP1);
  });

  test('Profile shows seeded employee details and saves contact updates', async ({ page }) => {
    await navLink(page, 'Profile').click();
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible();
    await expect(page.getByText('Alex Chen')).toBeVisible();
    await expect(page.getByText('Senior Software Engineer')).toBeVisible();
    await expect(page.getByText('Engineering').first()).toBeVisible();

    const phone = page.getByLabel('Phone');
    await phone.fill('');
    await phone.fill('+1-555-9999');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText('Saved!')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Phone')).toHaveValue('+1-555-9999');
  });

  test('Finance lists payslips and downloads PDF', async ({ page }) => {
    await navLink(page, 'Finance').click();
    await expect(page.getByRole('heading', { name: /^finance$/i })).toBeVisible();
    await expect(page.getByText(/apr 2026/i)).toBeVisible();
    await expect(page.getByText(/mar 2026/i)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /pdf/i }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/payslip_\d{4}_\d{2}\.pdf/);
  });

  test('My Assets shows assigned equipment', async ({ page }) => {
    await navLink(page, 'My Assets').click();
    await expect(page.getByRole('heading', { name: /my assets/i })).toBeVisible();
    await expect(page.getByText('LAP-001', { exact: true })).toBeVisible();
    await expect(page.getByText('MON-001', { exact: true })).toBeVisible();
    await expect(page.getByText(/dell\s+xps 15/i)).toBeVisible();
  });
});

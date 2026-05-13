import { test, expect } from '@playwright/test';
import { HR, login, navLink } from './helpers';

const tinyPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\nxref\n0 3\n0000000000 65535 f\ntrailer<</Size 3/Root 1 0 R>>\n%%EOF',
);

test.describe('HR admin workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, HR);
  });

  test('Add a new employee, then delete it', async ({ page }) => {
    await navLink(page, 'Employees').click();
    await expect(page.getByRole('heading', { name: /^employees$/i })).toBeVisible();

    const stamp = Date.now();
    const email = `test+${stamp}@company.com`;
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('TestPass@123');
    await page.getByLabel('First name').fill('Eve');
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Designation').fill('QA Engineer');
    await page.getByLabel('Department').fill('Quality');
    await page.getByLabel('Phone').fill('+1-555-0001');
    await page.getByRole('button', { name: /add employee/i }).click();

    const row = page.locator('tr', { hasText: email });
    await expect(row).toBeVisible();
    await expect(row.getByText('Eve Tester')).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: /delete/i }).click();
    await expect(page.locator('tr', { hasText: email })).toHaveCount(0);
  });

  test('Upload a payslip for an existing employee', async ({ page }) => {
    await navLink(page, 'Upload Payslip').click();
    await expect(page.getByRole('heading', { name: /upload payslip/i })).toBeVisible();

    // Option label is "Priya Sharma (emp2@company.com)" — use a substring via the DOM
    const empSelect = page.locator('select').first();
    await empSelect.selectOption({ label: 'Priya Sharma (emp2@company.com)' });
    await page.getByLabel('Month').fill('5');
    await page.getByLabel('Year').fill('2026');
    await page.getByLabel('Gross').fill('7200');
    await page.getByLabel('Deductions').fill('1440');
    await page.getByLabel('Net').fill('5760');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'p.pdf',
      mimeType: 'application/pdf',
      buffer: tinyPdf,
    });

    await page.getByRole('button', { name: /^upload$/i }).click();
    await expect(page.getByText(/payslip uploaded/i)).toBeVisible();
  });

  test('Create, assign, and return an asset', async ({ page }) => {
    await navLink(page, 'Manage Assets').click();
    await expect(page.getByRole('heading', { name: /manage assets/i })).toBeVisible();

    const tag = `E2E-${Date.now()}`;
    await page.getByLabel('Asset tag').fill(tag);
    await page.getByLabel('Type').selectOption('LAPTOP');
    await page.getByLabel('Brand').fill('Acme');
    await page.getByLabel('Model').fill('TestBook 9000');
    await page.getByLabel('Serial #').fill('SN-E2E');
    await page.getByRole('button', { name: /add asset/i }).click();

    const row = page.locator('tr', { hasText: tag });
    await expect(row).toBeVisible();
    await expect(row.getByText('AVAILABLE')).toBeVisible();

    await row.locator('select').selectOption({ label: 'Marco Bianchi' });
    await row.getByRole('button', { name: /^assign$/i }).click();
    await expect(row.getByText('ASSIGNED')).toBeVisible();
    await expect(row.getByText('Marco Bianchi')).toBeVisible();

    await row.getByRole('button', { name: /^return$/i }).click();
    await expect(row.getByText('AVAILABLE')).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: /delete/i }).click();
    await expect(page.locator('tr', { hasText: tag })).toHaveCount(0);
  });
});

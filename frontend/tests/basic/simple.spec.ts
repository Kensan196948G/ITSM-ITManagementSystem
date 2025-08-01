import { test, expect } from '@playwright/test';

test.describe('Simple E2E Tests', () => {
  test('should load example.com', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example Domain/);
  });

  test('should find main heading', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page.locator('h1')).toContainText('Example Domain');
  });

  test('should load Google', async ({ page }) => {
    await page.goto('https://www.google.com');
    await expect(page).toHaveTitle(/Google/);
  });
});
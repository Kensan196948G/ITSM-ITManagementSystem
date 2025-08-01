import { test, expect } from '@playwright/test';

test.describe('Basic Playwright Tests', () => {
  test('should open Google and verify title', async ({ page }) => {
    await page.goto('https://www.google.com');
    await expect(page).toHaveTitle(/Google/);
  });

  test('should be able to navigate to example.com', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example Domain/);
    await expect(page.locator('h1')).toContainText('Example Domain');
  });

  test('should be able to click and interact', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Check that the more information link exists
    const moreInfoLink = page.locator('a[href="https://www.iana.org/domains/example"]');
    await expect(moreInfoLink).toBeVisible();
    
    // We can click it (but won't verify navigation to keep test simple)
    await expect(moreInfoLink).toHaveText('More information...');
  });

  test('should handle page with forms (using httpbin)', async ({ page }) => {
    await page.goto('https://httpbin.org/forms/post');
    
    // Check form elements exist
    await expect(page.locator('input[name="custname"]')).toBeVisible();
    await expect(page.locator('input[name="custtel"]')).toBeVisible();
    await expect(page.locator('input[name="custemail"]')).toBeVisible();
    
    // Fill out form
    await page.fill('input[name="custname"]', 'Test User');
    await page.fill('input[name="custtel"]', '123-456-7890');
    await page.fill('input[name="custemail"]', 'test@example.com');
    
    // Check values were filled
    await expect(page.locator('input[name="custname"]')).toHaveValue('Test User');
    await expect(page.locator('input[name="custtel"]')).toHaveValue('123-456-7890');
    await expect(page.locator('input[name="custemail"]')).toHaveValue('test@example.com');
  });
});
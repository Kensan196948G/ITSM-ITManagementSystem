import { test, expect } from '@playwright/test';

test.describe('Incident Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to incidents page
    await page.click('text=Incidents');
    await page.waitForURL('**/incidents');
  });

  test('should display incidents list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Incidents');
    await expect(page.locator('[data-testid="incidents-table"]')).toBeVisible();
  });

  test('should create new incident', async ({ page }) => {
    // Click create button
    await page.click('[data-testid="create-incident-button"]');
    
    // Fill incident form
    await page.fill('input[name="title"]', 'Test Incident E2E');
    await page.fill('textarea[name="description"]', 'This is a test incident created via E2E test');
    await page.selectOption('select[name="priority"]', 'high');
    await page.selectOption('select[name="category"]', 'technical');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to incident detail or list
    await expect(page.locator('text=Incident created successfully')).toBeVisible();
    await expect(page.locator('text=Test Incident E2E')).toBeVisible();
  });

  test('should filter incidents by status', async ({ page }) => {
    // Use status filter
    await page.selectOption('select[name="status-filter"]', 'open');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Check that only open incidents are shown
    const statusCells = await page.locator('[data-testid="incident-status"]').all();
    for (const cell of statusCells) {
      await expect(cell).toContainText('Open');
    }
  });

  test('should search incidents', async ({ page }) => {
    // Enter search term
    await page.fill('input[placeholder="Search incidents..."]', 'server');
    await page.press('input[placeholder="Search incidents..."]', 'Enter');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Check that results contain search term
    const titleCells = await page.locator('[data-testid="incident-title"]').all();
    for (const cell of titleCells) {
      const text = await cell.textContent();
      expect(text?.toLowerCase()).toContain('server');
    }
  });

  test('should view incident details', async ({ page }) => {
    // Click on first incident
    await page.click('[data-testid="incident-row"]:first-child');
    
    // Should navigate to detail page
    await page.waitForURL('**/incidents/*');
    
    // Check incident details are displayed
    await expect(page.locator('[data-testid="incident-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="incident-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="incident-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="incident-priority"]')).toBeVisible();
  });

  test('should update incident status', async ({ page }) => {
    // Click on first incident
    await page.click('[data-testid="incident-row"]:first-child');
    await page.waitForURL('**/incidents/*');
    
    // Click edit button
    await page.click('[data-testid="edit-incident-button"]');
    
    // Update status
    await page.selectOption('select[name="status"]', 'in-progress');
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Check success message
    await expect(page.locator('text=Incident updated successfully')).toBeVisible();
    await expect(page.locator('[data-testid="incident-status"]')).toContainText('In Progress');
  });

  test('should assign incident to user', async ({ page }) => {
    // Click on first incident
    await page.click('[data-testid="incident-row"]:first-child');
    await page.waitForURL('**/incidents/*');
    
    // Click assign button
    await page.click('[data-testid="assign-incident-button"]');
    
    // Select assignee
    await page.selectOption('select[name="assignee"]', 'admin@example.com');
    
    // Save assignment
    await page.click('button[type="submit"]');
    
    // Check assignment
    await expect(page.locator('text=Incident assigned successfully')).toBeVisible();
    await expect(page.locator('[data-testid="incident-assignee"]')).toContainText('admin@example.com');
  });
});
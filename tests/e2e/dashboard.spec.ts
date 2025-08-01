import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check for metric cards
    await expect(page.locator('[data-testid="total-incidents"]')).toBeVisible();
    await expect(page.locator('[data-testid="open-incidents"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-problems"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-changes"]')).toBeVisible();
  });

  test('should display recent incidents widget', async ({ page }) => {
    await expect(page.locator('[data-testid="recent-incidents-widget"]')).toBeVisible();
    await expect(page.locator('text=Recent Incidents')).toBeVisible();
    
    // Check for incident list or empty state
    const incidentsList = page.locator('[data-testid="recent-incidents-list"]');
    const emptyState = page.locator('[data-testid="no-recent-incidents"]');
    
    await expect(incidentsList.or(emptyState)).toBeVisible();
  });

  test('should display system status widget', async ({ page }) => {
    await expect(page.locator('[data-testid="system-status-widget"]')).toBeVisible();
    await expect(page.locator('text=System Status')).toBeVisible();
    
    // Check for status indicators
    await expect(page.locator('[data-testid="system-health-indicator"]')).toBeVisible();
  });

  test('should navigate to incidents from dashboard', async ({ page }) => {
    // Click on incidents metric card or link
    await page.click('[data-testid="total-incidents"]');
    
    // Should navigate to incidents page
    await page.waitForURL('**/incidents');
    await expect(page.locator('h1')).toContainText('Incidents');
  });

  test('should navigate to problems from dashboard', async ({ page }) => {
    // Click on problems metric card or navigation
    await page.click('text=Problems');
    
    // Should navigate to problems page
    await page.waitForURL('**/problems');
    await expect(page.locator('h1')).toContainText('Problems');
  });

  test('should navigate to changes from dashboard', async ({ page }) => {
    // Click on changes metric card or navigation
    await page.click('text=Changes');
    
    // Should navigate to changes page
    await page.waitForURL('**/changes');
    await expect(page.locator('h1')).toContainText('Changes');
  });

  test('should display user profile menu', async ({ page }) => {
    // Click on user profile avatar/button
    await page.click('[data-testid="user-profile-button"]');
    
    // Check profile menu items
    await expect(page.locator('[data-testid="profile-menu"]')).toBeVisible();
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should refresh dashboard data', async ({ page }) => {
    // Click refresh button if available
    const refreshButton = page.locator('[data-testid="refresh-dashboard"]');
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // Wait for refresh to complete
      await page.waitForTimeout(2000);
      
      // Check that data is still displayed
      await expect(page.locator('[data-testid="total-incidents"]')).toBeVisible();
    }
  });

  test('should handle dashboard responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that dashboard is still functional
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="total-incidents"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check that layout adapts
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="total-incidents"]')).toBeVisible();
  });
});
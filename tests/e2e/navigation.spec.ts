import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should display main navigation menu', async ({ page }) => {
    // Check for main navigation elements
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Incidents')).toBeVisible();
    await expect(page.locator('text=Problems')).toBeVisible();
    await expect(page.locator('text=Changes')).toBeVisible();
    await expect(page.locator('text=CMDB')).toBeVisible();
  });

  test('should navigate between main sections', async ({ page }) => {
    // Test navigation to each main section
    const sections = [
      { name: 'Incidents', url: '**/incidents', heading: 'Incidents' },
      { name: 'Problems', url: '**/problems', heading: 'Problems' },
      { name: 'Changes', url: '**/changes', heading: 'Changes' },
      { name: 'CMDB', url: '**/cmdb', heading: 'Configuration Items' },
      { name: 'Dashboard', url: '**/dashboard', heading: 'Dashboard' }
    ];

    for (const section of sections) {
      await page.click(`text=${section.name}`);
      await page.waitForURL(section.url);
      await expect(page.locator('h1')).toContainText(section.heading);
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Navigate to incidents
    await page.click('text=Incidents');
    await page.waitForURL('**/incidents');
    
    // Check that incidents nav item is active
    await expect(page.locator('[data-testid="nav-incidents"]')).toHaveClass(/active/);
    
    // Navigate to problems
    await page.click('text=Problems');
    await page.waitForURL('**/problems');
    
    // Check that problems nav item is active and incidents is not
    await expect(page.locator('[data-testid="nav-problems"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="nav-incidents"]')).not.toHaveClass(/active/);
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    // Navigate to incidents
    await page.click('text=Incidents');
    await page.waitForURL('**/incidents');
    
    // Check breadcrumb
    await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
    await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Incidents');
    
    // Navigate to incident detail (if available)
    const firstIncident = page.locator('[data-testid="incident-row"]:first-child');
    if (await firstIncident.isVisible()) {
      await firstIncident.click();
      await page.waitForURL('**/incidents/*');
      
      // Check detailed breadcrumb
      await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Incidents');
      await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Detail');
    }
  });

  test('should handle mobile navigation', async ({ page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check for mobile menu toggle
    const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      
      // Check that navigation menu is visible
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Incidents')).toBeVisible();
    }
  });

  test('should navigate using browser back/forward', async ({ page }) => {
    // Navigate to incidents
    await page.click('text=Incidents');
    await page.waitForURL('**/incidents');
    
    // Navigate to problems
    await page.click('text=Problems');
    await page.waitForURL('**/problems');
    
    // Use browser back
    await page.goBack();
    await page.waitForURL('**/incidents');
    await expect(page.locator('h1')).toContainText('Incidents');
    
    // Use browser forward
    await page.goForward();
    await page.waitForURL('**/problems');
    await expect(page.locator('h1')).toContainText('Problems');
  });

  test('should handle deep linking', async ({ page }) => {
    // Navigate directly to specific URLs
    await page.goto('/incidents');
    await expect(page.locator('h1')).toContainText('Incidents');
    
    await page.goto('/problems');
    await expect(page.locator('h1')).toContainText('Problems');
    
    await page.goto('/changes');
    await expect(page.locator('h1')).toContainText('Changes');
  });

  test('should display user context in navigation', async ({ page }) => {
    // Check for user info in navigation
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
    
    // Check for user avatar or name
    const userAvatar = page.locator('[data-testid="user-avatar"]');
    const userName = page.locator('[data-testid="user-name"]');
    
    await expect(userAvatar.or(userName)).toBeVisible();
  });
});
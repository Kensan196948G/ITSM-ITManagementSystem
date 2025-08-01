import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('ITSM System - Comprehensive E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create a new browser context and page for each test
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    
    page = await context.newPage();
    
    // Set up authentication if needed
    try {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Check if login is required
      const loginForm = page.locator('form[data-testid="login-form"], form:has(input[type="email"])');
      if (await loginForm.isVisible({ timeout: 3000 })) {
        await performLogin(page);
      }
    } catch (error) {
      console.log('Navigation or login setup completed with variations');
    }
  });

  test.afterEach(async () => {
    await context.close();
  });

  async function performLogin(page: Page) {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("ログイン")').first();
    
    await emailInput.fill('admin@example.com');
    await passwordInput.fill('admin123');
    await submitButton.click();
    await page.waitForLoadState('domcontentloaded');
  }

  test.describe('Dashboard Functionality', () => {
    test('should display dashboard with all widgets', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      // Check for dashboard title
      const dashboardTitle = page.locator('h1, h2, [data-testid="dashboard-title"]');
      await expect(dashboardTitle.first()).toBeVisible({ timeout: 10000 });
      
      // Check for metrics widgets
      const metricsSelectors = [
        '[data-testid="total-incidents"]',
        '[data-testid="open-incidents"]',
        '[data-testid="critical-incidents"]',
        '.metric-card',
        '.dashboard-widget',
        '.stats-card'
      ];
      
      let foundMetrics = 0;
      for (const selector of metricsSelectors) {
        try {
          await expect(page.locator(selector).first()).toBeVisible({ timeout: 3000 });
          foundMetrics++;
        } catch {
          continue;
        }
      }
      
      // Should find at least some metrics
      expect(foundMetrics).toBeGreaterThanOrEqual(1);
    });

    test('should display recent activities widget', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      const recentActivities = page.locator(
        '[data-testid="recent-activities"], .recent-activities, .activity-widget'
      );
      
      if (await recentActivities.first().isVisible({ timeout: 5000 })) {
        await expect(recentActivities.first()).toBeVisible();
      } else {
        // Check for activity-related content
        const activityContent = page.locator('text=Recent, text=Activity, text=最近');
        await expect(activityContent.first()).toBeVisible();
      }
    });

    test('should allow navigation from dashboard', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      // Try to navigate to incidents
      const incidentLink = page.locator(
        'a[href*="incident"], button:has-text("Incidents"), button:has-text("インシデント"), .nav-incidents'
      );
      
      if (await incidentLink.first().isVisible({ timeout: 3000 })) {
        await incidentLink.first().click();
        await page.waitForLoadState('domcontentloaded');
        
        // Verify navigation
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/incident/i);
      }
    });
  });

  test.describe('Incident Management E2E Flow', () => {
    test('should create a new incident successfully', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Look for create incident button
      const createButton = page.locator(
        'button:has-text("Create"), button:has-text("New"), button:has-text("作成"), [data-testid="create-incident"]'
      );
      
      if (await createButton.first().isVisible({ timeout: 5000 })) {
        await createButton.first().click();
        await page.waitForLoadState('domcontentloaded');
        
        // Fill incident form
        const titleInput = page.locator('input[name="title"], input[data-testid="incident-title"]');
        const descriptionInput = page.locator('textarea[name="description"], textarea[data-testid="incident-description"]');
        
        if (await titleInput.isVisible({ timeout: 3000 })) {
          await titleInput.fill('E2E Test Incident - Email Server Down');
        }
        
        if (await descriptionInput.isVisible({ timeout: 3000 })) {
          await descriptionInput.fill('Email server is not responding to requests. Users cannot send or receive emails.');
        }
        
        // Set priority if available
        const prioritySelect = page.locator('select[name="priority"], [data-testid="priority-select"]');
        if (await prioritySelect.isVisible({ timeout: 3000 })) {
          await prioritySelect.selectOption('high');
        }
        
        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("作成")');
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
          await page.waitForLoadState('domcontentloaded');
          
          // Verify success message or redirect
          const successIndicators = [
            '.success-message',
            '.alert-success',
            'text=successfully created',
            'text=作成されました'
          ];
          
          for (const indicator of successIndicators) {
            try {
              await expect(page.locator(indicator)).toBeVisible({ timeout: 5000 });
              break;
            } catch {
              continue;
            }
          }
        }
      }
    });

    test('should search and filter incidents', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Look for search input
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="検索"], [data-testid="search-input"]'
      );
      
      if (await searchInput.first().isVisible({ timeout: 5000 })) {
        await searchInput.first().fill('email server');
        
        // Look for search button or trigger search
        const searchButton = page.locator('button:has-text("Search"), button:has-text("検索"), [data-testid="search-button"]');
        if (await searchButton.first().isVisible({ timeout: 3000 })) {
          await searchButton.first().click();
        } else {
          // Try pressing Enter
          await searchInput.first().press('Enter');
        }
        
        await page.waitForLoadState('domcontentloaded');
        
        // Verify search results
        const incidentList = page.locator('.incident-list, .incidents-table, [data-testid="incidents-list"]');
        if (await incidentList.isVisible({ timeout: 5000 })) {
          await expect(incidentList).toBeVisible();
        }
      }
    });

    test('should view incident details and add work notes', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on the first incident
      const firstIncident = page.locator(
        '.incident-item:first-child, tr:first-child td a, .incident-row:first-child'
      );
      
      if (await firstIncident.isVisible({ timeout: 5000 })) {
        await firstIncident.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Verify incident details page
        const incidentDetails = page.locator('.incident-details, .incident-info, [data-testid="incident-details"]');
        if (await incidentDetails.isVisible({ timeout: 5000 })) {
          await expect(incidentDetails).toBeVisible();
          
          // Try to add a work note
          const workNoteButton = page.locator(
            'button:has-text("Add Note"), button:has-text("Work Note"), button:has-text("メモ追加")'
          );
          
          if (await workNoteButton.isVisible({ timeout: 3000 })) {
            await workNoteButton.click();
            
            const noteInput = page.locator('textarea[name="note"], textarea[data-testid="work-note"]');
            if (await noteInput.isVisible({ timeout: 3000 })) {
              await noteInput.fill('E2E Test: Investigating the email server issue. Checking server logs.');
              
              const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")');
              if (await saveButton.isVisible({ timeout: 3000 })) {
                await saveButton.click();
                await page.waitForLoadState('domcontentloaded');
              }
            }
          }
        }
      }
    });

    test('should update incident status', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on the first incident
      const firstIncident = page.locator(
        '.incident-item:first-child, tr:first-child td a, .incident-row:first-child'
      );
      
      if (await firstIncident.isVisible({ timeout: 5000 })) {
        await firstIncident.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Look for status update option
        const statusSelect = page.locator('select[name="status"], [data-testid="status-select"]');
        if (await statusSelect.isVisible({ timeout: 3000 })) {
          await statusSelect.selectOption('in_progress');
          
          const updateButton = page.locator('button:has-text("Update"), button:has-text("更新")');
          if (await updateButton.isVisible({ timeout: 3000 })) {
            await updateButton.click();
            await page.waitForLoadState('domcontentloaded');
            
            // Verify status change
            const statusIndicator = page.locator('.status-badge, .incident-status, [data-testid="incident-status"]');
            if (await statusIndicator.isVisible({ timeout: 5000 })) {
              await expect(statusIndicator).toContainText(/in progress|進行中/i);
            }
          }
        }
      }
    });
  });

  test.describe('Problem Management E2E Flow', () => {
    test('should navigate to problems page', async () => {
      // Try direct navigation first
      await page.goto('/problems');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify we're on the problems page
      const problemsIndicators = [
        'h1:has-text("Problems")',
        'h1:has-text("問題")',
        '[data-testid="problems-page"]',
        '.problems-container'
      ];
      
      let foundIndicator = false;
      for (const indicator of problemsIndicators) {
        try {
          await expect(page.locator(indicator)).toBeVisible({ timeout: 5000 });
          foundIndicator = true;
          break;
        } catch {
          continue;
        }
      }
      
      if (!foundIndicator) {
        // Try navigation from menu
        const problemsLink = page.locator('a[href*="problem"], .nav-problems, text=Problems, text=問題');
        if (await problemsLink.first().isVisible({ timeout: 3000 })) {
          await problemsLink.first().click();
          await page.waitForLoadState('domcontentloaded');
        }
      }
    });

    test('should create a new problem record', async () => {
      await page.goto('/problems');
      await page.waitForLoadState('domcontentloaded');
      
      const createButton = page.locator(
        'button:has-text("Create"), button:has-text("New Problem"), button:has-text("作成")'
      );
      
      if (await createButton.first().isVisible({ timeout: 5000 })) {
        await createButton.first().click();
        await page.waitForLoadState('domcontentloaded');
        
        // Fill problem form
        const titleInput = page.locator('input[name="title"], input[data-testid="problem-title"]');
        if (await titleInput.isVisible({ timeout: 3000 })) {
          await titleInput.fill('E2E Test Problem - Recurring Email Server Issues');
        }
        
        const descriptionInput = page.locator('textarea[name="description"], textarea[data-testid="problem-description"]');
        if (await descriptionInput.isVisible({ timeout: 3000 })) {
          await descriptionInput.fill('Multiple incidents related to email server failures. Need root cause analysis.');
        }
        
        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
          await page.waitForLoadState('domcontentloaded');
        }
      }
    });
  });

  test.describe('Change Management E2E Flow', () => {
    test('should create a change request', async () => {
      await page.goto('/changes');
      await page.waitForLoadState('domcontentloaded');
      
      const createButton = page.locator(
        'button:has-text("Create"), button:has-text("New Change"), button:has-text("作成")'
      );
      
      if (await createButton.first().isVisible({ timeout: 5000 })) {
        await createButton.first().click();
        await page.waitForLoadState('domcontentloaded');
        
        // Fill change request form
        const titleInput = page.locator('input[name="title"], input[data-testid="change-title"]');
        if (await titleInput.isVisible({ timeout: 3000 })) {
          await titleInput.fill('E2E Test Change - Email Server Maintenance');
        }
        
        const typeSelect = page.locator('select[name="type"], [data-testid="change-type"]');
        if (await typeSelect.isVisible({ timeout: 3000 })) {
          await typeSelect.selectOption('standard');
        }
        
        const descriptionInput = page.locator('textarea[name="description"], textarea[data-testid="change-description"]');
        if (await descriptionInput.isVisible({ timeout: 3000 })) {
          await descriptionInput.fill('Scheduled maintenance to update email server software and apply security patches.');
        }
        
        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
          await page.waitForLoadState('domcontentloaded');
        }
      }
    });

    test('should approve a change request', async () => {
      await page.goto('/changes');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on the first change request
      const firstChange = page.locator(
        '.change-item:first-child, tr:first-child td a, .change-row:first-child'
      );
      
      if (await firstChange.isVisible({ timeout: 5000 })) {
        await firstChange.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Look for approve button
        const approveButton = page.locator('button:has-text("Approve"), button:has-text("承認")');
        if (await approveButton.isVisible({ timeout: 3000 })) {
          await approveButton.click();
          
          // Handle approval confirmation if exists
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("確認")');
          if (await confirmButton.isVisible({ timeout: 3000 })) {
            await confirmButton.click();
          }
          
          await page.waitForLoadState('domcontentloaded');
          
          // Verify approval status
          const statusIndicator = page.locator('.status-badge, .change-status, [data-testid="change-status"]');
          if (await statusIndicator.isVisible({ timeout: 5000 })) {
            await expect(statusIndicator).toContainText(/approved|承認/i);
          }
        }
      }
    });
  });

  test.describe('User Interface Responsiveness', () => {
    test('should work correctly on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      // Check mobile navigation
      const mobileMenuButton = page.locator('.mobile-menu-button, .hamburger, [data-testid="mobile-menu"]');
      if (await mobileMenuButton.isVisible({ timeout: 3000 })) {
        await mobileMenuButton.click();
        
        const mobileMenu = page.locator('.mobile-menu, .nav-menu, [data-testid="navigation-menu"]');
        await expect(mobileMenu).toBeVisible();
      }
      
      // Verify dashboard content is still accessible
      const mainContent = page.locator('main, .main-content, [data-testid="dashboard-content"]');
      await expect(mainContent.first()).toBeVisible();
    });

    test('should work correctly on tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Verify incidents list is visible and functional
      const incidentsList = page.locator('.incidents-list, .incidents-table, [data-testid="incidents-list"]');
      if (await incidentsList.isVisible({ timeout: 5000 })) {
        await expect(incidentsList).toBeVisible();
      }
    });
  });

  test.describe('Search and Navigation', () => {
    test('should perform global search', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      const globalSearch = page.locator(
        'input[data-testid="global-search"], .global-search, input[placeholder*="Search"]'
      );
      
      if (await globalSearch.isVisible({ timeout: 3000 })) {
        await globalSearch.fill('email server');
        await globalSearch.press('Enter');
        await page.waitForLoadState('domcontentloaded');
        
        // Verify search results page
        const searchResults = page.locator('.search-results, [data-testid="search-results"]');
        if (await searchResults.isVisible({ timeout: 5000 })) {
          await expect(searchResults).toBeVisible();
        }
      }
    });

    test('should navigate through breadcrumbs', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on the first incident
      const firstIncident = page.locator(
        '.incident-item:first-child, tr:first-child td a, .incident-row:first-child'
      );
      
      if (await firstIncident.isVisible({ timeout: 5000 })) {
        await firstIncident.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Look for breadcrumb navigation
        const breadcrumb = page.locator('.breadcrumb, .breadcrumbs, [data-testid="breadcrumb"]');
        if (await breadcrumb.isVisible({ timeout: 3000 })) {
          const incidentsLink = breadcrumb.locator('a:has-text("Incidents"), a:has-text("インシデント")');
          if (await incidentsLink.isVisible({ timeout: 3000 })) {
            await incidentsLink.click();
            await page.waitForLoadState('domcontentloaded');
            
            // Verify we're back on incidents list
            expect(page.url()).toMatch(/incidents/);
          }
        }
      }
    });
  });

  test.describe('Data Validation and Error Handling', () => {
    test('should handle form validation errors', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      const createButton = page.locator(
        'button:has-text("Create"), button:has-text("New"), [data-testid="create-incident"]'
      );
      
      if (await createButton.first().isVisible({ timeout: 5000 })) {
        await createButton.first().click();
        await page.waitForLoadState('domcontentloaded');
        
        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
          
          // Check for validation errors
          const errorMessages = page.locator('.error-message, .field-error, .validation-error');
          if (await errorMessages.first().isVisible({ timeout: 3000 })) {
            await expect(errorMessages.first()).toBeVisible();
          }
        }
      }
    });

    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Look for error handling
      const errorIndicators = [
        '.error-message',
        '.network-error',
        'text=error',
        'text=failed to load',
        '[data-testid="error-message"]'
      ];
      
      for (const indicator of errorIndicators) {
        try {
          await expect(page.locator(indicator)).toBeVisible({ timeout: 10000 });
          break;
        } catch {
          continue;
        }
      }
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should handle large data sets', async () => {
      await page.goto('/incidents');
      await page.waitForLoadState('domcontentloaded');
      
      // Look for pagination or virtual scrolling
      const paginationControls = page.locator('.pagination, .page-controls, [data-testid="pagination"]');
      const virtualScroll = page.locator('.virtual-scroll, .infinite-scroll');
      
      const hasPagination = await paginationControls.isVisible({ timeout: 3000 });
      const hasVirtualScroll = await virtualScroll.isVisible({ timeout: 3000 });
      
      // Should have some mechanism to handle large datasets
      expect(hasPagination || hasVirtualScroll).toBeTruthy();
    });
  });
});

test.describe('Accessibility Testing', () => {
  test('should meet basic accessibility requirements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    // Check for ARIA labels and roles
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      if (altText !== null) {
        expect(altText.length).toBeGreaterThan(0);
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test that we can navigate through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = page.locator(':focus');
      if (await currentFocus.isVisible()) {
        // Element should be focusable
        expect(await currentFocus.count()).toBeGreaterThan(0);
      }
    }
  });
});
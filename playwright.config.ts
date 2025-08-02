import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * ITSM System Playwright Configuration
 * Comprehensive E2E Testing Configuration for React Frontend
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: process.env.CI ? false : true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 3 : 1,
  
  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : 2,
  
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/reports/playwright-results.json' }],
    ['junit', { outputFile: 'tests/reports/playwright-results.xml' }],
    ['line'],
    ['blob', { outputDir: 'tests/reports/blob-report' }]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // API endpoint for backend testing
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
    
    // Collect trace when retrying the failed test
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    
    // Record video for debugging
    video: process.env.RECORD_VIDEO === 'true' ? 'retain-on-failure' : 'off',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Global test timeout
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Test isolation
    contextOptions: {
      // Security headers
      extraHTTPHeaders: {
        'X-Test-Mode': 'true',
      },
    },
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers for main testing
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        headless: process.env.HEADLESS !== 'false',
      },
    },

    // Firefox testing - only on CI or when explicitly requested
    ...(process.env.CI || process.env.FULL_BROWSER_TESTS ? [{
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        headless: process.env.HEADLESS !== 'false',
      },
    }] : []),

    // WebKit testing - only on CI or when explicitly requested
    ...(process.env.CI || process.env.FULL_BROWSER_TESTS ? [{
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        headless: process.env.HEADLESS !== 'false',
      },
    }] : []),

    // Mobile testing - only on full test runs
    ...(process.env.FULL_BROWSER_TESTS ? [
      {
        name: 'Mobile Chrome',
        use: { 
          ...devices['Pixel 5'],
          headless: process.env.HEADLESS !== 'false',
        },
      },
      {
        name: 'Mobile Safari',
        use: { 
          ...devices['iPhone 12'],
          headless: process.env.HEADLESS !== 'false',
        },
      },
    ] : []),
  ],

  // Web server configuration for development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    cwd: './frontend',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  // Test timeouts
  timeout: 60 * 1000,
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 10000
  },

  // Output directory for test results
  outputDir: 'tests/reports/test-results',

  // Test directories and patterns
  testMatch: [
    '**/tests/e2e/**/*.spec.ts',
    '**/tests/e2e/**/*.test.ts',
  ],

  // Ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
  ],
});
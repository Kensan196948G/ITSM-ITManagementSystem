import { defineConfig, devices } from '@playwright/test';

/**
 * WebUIエラー監視用Playwright設定
 * 対象URL: http://192.168.3.135:3000, http://192.168.3.135:3000/admin
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://192.168.3.135:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
    
    /* Timeout for each action */
    actionTimeout: 10000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.5',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // WebUI監視に最適化された設定
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
          ],
        },
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    /* Mobile devices for responsive testing */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'] 
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'] 
      },
    },

    /* Tablet devices */
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad Pro'] 
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run start',
      url: 'http://192.168.3.135:3000',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Test output directory */
  outputDir: 'test-results/',
  
  /* Expect options */
  expect: {
    /* Timeout for expect() assertions */
    timeout: 10000,
    
    /* Screenshot comparison threshold */
    threshold: 0.3,
    
    /* Screenshot comparison mode */
    mode: 'default',
  },

  /* Timeout settings */
  timeout: 30000,
  
  /* Global test timeout */
  globalTimeout: 600000,
  
  /* Maximum failures */
  maxFailures: process.env.CI ? 10 : undefined,
});
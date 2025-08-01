import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Setting up global test environment...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if backend is available
    const backendResponse = await page.request.get('http://localhost:8000/api/v1/health');
    if (!backendResponse.ok()) {
      console.warn('Backend health check failed, tests may not work properly');
    }
    
    // Check if frontend is available
    await page.goto('http://localhost:3000');
    await page.waitForSelector('body', { timeout: 5000 });
    
    console.log('Global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
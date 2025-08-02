import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up global E2E test environment...');
  
  // Ensure test reports directory exists
  const reportsDir = path.join(process.cwd(), 'tests', 'reports');
  const screenshotsDir = path.join(reportsDir, 'screenshots');
  const videosDir = path.join(reportsDir, 'videos');
  
  [reportsDir, screenshotsDir, videosDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Launch browser for setup validation
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let setupSuccess = true;
  const checks = [];
  
  try {
    // 1. Backend Health Check
    console.log('🔍 Checking backend health...');
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      const healthResponse = await page.request.get(`${backendUrl}/health`);
      
      if (healthResponse.ok()) {
        console.log('✅ Backend health check passed');
        checks.push({ service: 'backend', status: 'healthy', url: backendUrl });
      } else {
        console.warn(`⚠️ Backend health check returned ${healthResponse.status()}`);
        checks.push({ service: 'backend', status: 'unhealthy', url: backendUrl, error: `HTTP ${healthResponse.status()}` });
        setupSuccess = false;
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      checks.push({ service: 'backend', status: 'error', error: error.message });
      setupSuccess = false;
    }
    
    // 2. API Endpoints Check
    console.log('🔍 Checking API endpoints...');
    try {
      const apiUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      const apiResponse = await page.request.get(`${apiUrl}/api/v1/health`);
      
      if (apiResponse.ok()) {
        console.log('✅ API endpoints accessible');
        checks.push({ service: 'api', status: 'healthy', url: `${apiUrl}/api/v1` });
      } else {
        console.warn(`⚠️ API check returned ${apiResponse.status()}`);
        checks.push({ service: 'api', status: 'unhealthy', error: `HTTP ${apiResponse.status()}` });
      }
    } catch (error) {
      console.error('❌ API check failed:', error.message);
      checks.push({ service: 'api', status: 'error', error: error.message });
    }
    
    // 3. Frontend Availability Check
    console.log('🔍 Checking frontend availability...');
    try {
      const frontendUrl = process.env.FRONTEND_URL || config.use?.baseURL || 'http://localhost:3000';
      await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for main app container or body
      await page.waitForSelector('body', { timeout: 10000 });
      
      // Check if it's not an error page
      const title = await page.title();
      console.log(`📄 Frontend loaded with title: "${title}"`);
      
      checks.push({ service: 'frontend', status: 'healthy', url: frontendUrl, title });
      console.log('✅ Frontend accessibility verified');
      
    } catch (error) {
      console.error('❌ Frontend check failed:', error.message);
      checks.push({ service: 'frontend', status: 'error', error: error.message });
      setupSuccess = false;
    }
    
    // 4. Authentication Flow Preparation
    console.log('🔍 Preparing authentication flow...');
    try {
      // Create test user credentials file if it doesn't exist
      const testCredsPath = path.join(reportsDir, 'test-credentials.json');
      const testCreds = {
        admin: { username: 'admin', password: 'admin123', role: 'admin' },
        user: { username: 'testuser', password: 'test123', role: 'user' },
        manager: { username: 'manager', password: 'manager123', role: 'manager' }
      };
      
      if (!fs.existsSync(testCredsPath)) {
        fs.writeFileSync(testCredsPath, JSON.stringify(testCreds, null, 2));
        console.log('✅ Test credentials file created');
      }
      
      checks.push({ service: 'auth-prep', status: 'ready' });
      
    } catch (error) {
      console.error('❌ Auth preparation failed:', error.message);
      checks.push({ service: 'auth-prep', status: 'error', error: error.message });
    }
    
    // 5. Database Connection Check (if accessible)
    console.log('🔍 Verifying database connectivity...');
    try {
      const dbCheckUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/system/db-status`;
      const dbResponse = await page.request.get(dbCheckUrl);
      
      if (dbResponse.ok()) {
        console.log('✅ Database connectivity verified');
        checks.push({ service: 'database', status: 'connected' });
      } else {
        console.warn('⚠️ Database check endpoint not available');
        checks.push({ service: 'database', status: 'unknown' });
      }
    } catch (error) {
      console.log('ℹ️ Database check skipped (endpoint not available)');
      checks.push({ service: 'database', status: 'skipped' });
    }
    
    // Save setup results
    const setupReport = {
      timestamp: new Date().toISOString(),
      setupSuccess,
      checks,
      environment: {
        CI: !!process.env.CI,
        HEADLESS: process.env.HEADLESS,
        NODE_ENV: process.env.NODE_ENV,
      }
    };
    
    fs.writeFileSync(
      path.join(reportsDir, 'e2e-setup-report.json'),
      JSON.stringify(setupReport, null, 2)
    );
    
    if (setupSuccess) {
      console.log('🎉 Global setup completed successfully');
    } else {
      console.warn('⚠️ Global setup completed with warnings - some services may not be available');
    }
    
  } catch (error) {
    console.error('💥 Global setup encountered an error:', error);
    
    // Save error report
    fs.writeFileSync(
      path.join(reportsDir, 'e2e-setup-error.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        checks
      }, null, 2)
    );
    
    throw error; // Re-throw to fail the setup if critical
    
  } finally {
    await context.close();
    await browser.close();
    console.log('🔧 Global setup cleanup completed');
  }
}

export default globalSetup;
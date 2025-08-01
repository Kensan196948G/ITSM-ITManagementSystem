import { chromium } from 'playwright';
import fs from 'fs';

async function detectErrors() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  const warnings = [];
  const networkErrors = [];
  
  // Capture console messages
  page.on('console', message => {
    const type = message.type();
    const text = message.text();
    const location = message.location();
    
    if (type === 'error') {
      errors.push({
        type: 'console-error',
        message: text,
        location: location,
        timestamp: new Date().toISOString()
      });
    } else if (type === 'warning') {
      warnings.push({
        type: 'console-warning',
        message: text,
        location: location,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    errors.push({
      type: 'page-error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  // Capture network failures
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        type: 'network-error',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('🚀 Starting error detection for http://localhost:3000');
    
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for React to load
    await page.waitForTimeout(3000);
    
    // Try to interact with common elements
    const buttons = await page.$$('button');
    for (let i = 0; i < Math.min(buttons.length, 3); i++) {
      try {
        await buttons[i].click();
        await page.waitForTimeout(500);
      } catch (e) {
        // Ignore interaction errors
      }
    }
    
    // Try navigation if there are links
    const links = await page.$$('a[href^="/"]');
    for (let i = 0; i < Math.min(links.length, 2); i++) {
      try {
        await links[i].click();
        await page.waitForTimeout(1000);
        await page.goBack();
        await page.waitForTimeout(1000);
      } catch (e) {
        // Ignore navigation errors
      }
    }
    
  } catch (error) {
    errors.push({
      type: 'navigation-error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  await browser.close();
  
  const report = {
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalNetworkErrors: networkErrors.length,
      timestamp: new Date().toISOString(),
      url: 'http://localhost:3000'
    },
    errors: errors,
    warnings: warnings,
    networkErrors: networkErrors,
    status: errors.length === 0 ? 'PASSED' : 'FAILED'
  };
  
  console.log('\n📊 ERROR DETECTION REPORT');
  console.log('==========================');
  console.log(`Total Errors: ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}`);
  console.log(`Total Network Errors: ${networkErrors.length}`);
  console.log(`Status: ${report.status}`);
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.type.toUpperCase()}`);
      console.log(`   Message: ${error.message}`);
      if (error.location) {
        console.log(`   Location: ${error.location.url}:${error.location.lineNumber}:${error.location.columnNumber}`);
      }
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n')[0]}`);
      }
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS FOUND:');
    warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.message}`);
      if (warning.location) {
        console.log(`   Location: ${warning.location.url}:${warning.location.lineNumber}`);
      }
    });
  }
  
  // Save detailed report
  fs.writeFileSync('./error-detection-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: error-detection-report.json');
  
  return report;
}

detectErrors().catch(console.error);
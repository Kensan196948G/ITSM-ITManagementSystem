import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test environment cleanup...');
  
  const reportsDir = path.join(process.cwd(), 'tests', 'reports');
  let cleanupSuccess = true;
  const cleanupActions = [];
  
  try {
    // 1. Cleanup temporary test data
    console.log('🗑️ Cleaning up temporary test data...');
    try {
      const tempDataPath = path.join(reportsDir, 'temp-test-data');
      if (fs.existsSync(tempDataPath)) {
        fs.rmSync(tempDataPath, { recursive: true, force: true });
        console.log('✅ Temporary test data cleaned');
        cleanupActions.push({ action: 'temp-data-cleanup', status: 'success' });
      } else {
        cleanupActions.push({ action: 'temp-data-cleanup', status: 'skipped', reason: 'no temp data found' });
      }
    } catch (error) {
      console.error('❌ Failed to cleanup temp data:', error.message);
      cleanupActions.push({ action: 'temp-data-cleanup', status: 'error', error: error.message });
      cleanupSuccess = false;
    }
    
    // 2. Archive test artifacts if in CI
    if (process.env.CI) {
      console.log('📦 Archiving test artifacts for CI...');
      try {
        const artifactsDir = path.join(reportsDir, 'archived');
        if (!fs.existsSync(artifactsDir)) {
          fs.mkdirSync(artifactsDir, { recursive: true });
        }
        
        // Archive screenshots and videos with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = `e2e-artifacts-${timestamp}`;
        
        ['screenshots', 'videos', 'traces'].forEach(dirName => {
          const sourceDir = path.join(reportsDir, dirName);
          const targetDir = path.join(artifactsDir, archiveName, dirName);
          
          if (fs.existsSync(sourceDir)) {
            fs.mkdirSync(path.dirname(targetDir), { recursive: true });
            fs.renameSync(sourceDir, targetDir);
            console.log(`✅ Archived ${dirName} to ${archiveName}`);
          }
        });
        
        cleanupActions.push({ action: 'artifact-archival', status: 'success', archive: archiveName });
        
      } catch (error) {
        console.error('❌ Failed to archive artifacts:', error.message);
        cleanupActions.push({ action: 'artifact-archival', status: 'error', error: error.message });
      }
    }
    
    // 3. Clean up test credentials if not in development mode
    if (process.env.NODE_ENV !== 'development') {
      console.log('🔐 Cleaning up test credentials...');
      try {
        const testCredsPath = path.join(reportsDir, 'test-credentials.json');
        if (fs.existsSync(testCredsPath)) {
          fs.unlinkSync(testCredsPath);
          console.log('✅ Test credentials cleaned');
          cleanupActions.push({ action: 'credentials-cleanup', status: 'success' });
        } else {
          cleanupActions.push({ action: 'credentials-cleanup', status: 'skipped' });
        }
      } catch (error) {
        console.error('❌ Failed to cleanup test credentials:', error.message);
        cleanupActions.push({ action: 'credentials-cleanup', status: 'error', error: error.message });
      }
    } else {
      console.log('ℹ️ Preserving test credentials for development');
      cleanupActions.push({ action: 'credentials-cleanup', status: 'skipped', reason: 'development mode' });
    }
    
    // 4. Generate teardown summary
    console.log('📊 Generating teardown summary...');
    try {
      const teardownReport = {
        timestamp: new Date().toISOString(),
        cleanupSuccess,
        cleanupActions,
        environment: {
          CI: !!process.env.CI,
          NODE_ENV: process.env.NODE_ENV,
          preserveArtifacts: process.env.PRESERVE_TEST_ARTIFACTS === 'true'
        },
        statistics: {
          totalActions: cleanupActions.length,
          successfulActions: cleanupActions.filter(a => a.status === 'success').length,
          skippedActions: cleanupActions.filter(a => a.status === 'skipped').length,
          failedActions: cleanupActions.filter(a => a.status === 'error').length
        }
      };
      
      fs.writeFileSync(
        path.join(reportsDir, 'e2e-teardown-report.json'),
        JSON.stringify(teardownReport, null, 2)
      );
      
      console.log('✅ Teardown summary generated');
      
    } catch (error) {
      console.error('❌ Failed to generate teardown summary:', error.message);
    }
    
    // 5. Final cleanup validation
    console.log('🔍 Performing final cleanup validation...');
    const leftoverFiles = [];
    
    ['temp-test-data', 'test-sessions', 'browser-profiles'].forEach(dirName => {
      const dirPath = path.join(reportsDir, dirName);
      if (fs.existsSync(dirPath)) {
        leftoverFiles.push(dirName);
      }
    });
    
    if (leftoverFiles.length > 0) {
      console.warn(`⚠️ Some files were not cleaned up: ${leftoverFiles.join(', ')}`);
    } else {
      console.log('✅ All temporary files cleaned successfully');
    }
    
    if (cleanupSuccess) {
      console.log('🎉 Global teardown completed successfully');
    } else {
      console.warn('⚠️ Global teardown completed with some issues');
    }
    
  } catch (error) {
    console.error('💥 Global teardown encountered an error:', error);
    
    // Save error report
    try {
      fs.writeFileSync(
        path.join(reportsDir, 'e2e-teardown-error.json'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          cleanupActions
        }, null, 2)
      );
    } catch (writeError) {
      console.error('Failed to save teardown error report:', writeError.message);
    }
  }
  
  console.log('🔧 Global teardown process completed');
}

export default globalTeardown;
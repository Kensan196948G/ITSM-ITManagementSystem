/**
 * Playwright グローバルセットアップ
 * WebUIエラー監視の事前準備
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 WebUIエラー監視のグローバルセットアップを開始...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // WebUIサーバーの稼働確認
    const baseURL = config.projects[0].use.baseURL || 'http://192.168.3.135:3000';
    console.log(`🔍 WebUIサーバーの稼働確認: ${baseURL}`);
    
    await page.goto(baseURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ WebUIサーバーが稼働中');

    // 管理者ページの確認
    const adminURL = `${baseURL}/admin`;
    console.log(`🔍 管理者ページの確認: ${adminURL}`);
    
    await page.goto(adminURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ 管理者ページにアクセス可能');

    // 初期エラーレベルのチェック
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ページを一度リロードしてエラーをキャッチ
    await page.reload({ waitUntil: 'networkidle' });
    
    if (consoleErrors.length > 0) {
      console.log(`⚠️ 初期コンソールエラーを検出: ${consoleErrors.length}件`);
    } else {
      console.log('✅ 初期状態でコンソールエラーなし');
    }

  } catch (error) {
    console.error('❌ グローバルセットアップ中にエラー:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ グローバルセットアップ完了');
}

export default globalSetup;
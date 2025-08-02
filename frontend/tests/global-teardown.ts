/**
 * Playwright グローバルティアダウン
 * WebUIエラー監視の後処理
 */

import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 WebUIエラー監視のグローバルティアダウンを開始...');

  try {
    // テスト結果の集計
    const testResultsDir = 'test-results';
    if (fs.existsSync(testResultsDir)) {
      const files = fs.readdirSync(testResultsDir);
      console.log(`📁 テスト結果ファイル数: ${files.length}`);
      
      // 結果ファイルのサマリー
      const htmlReports = files.filter(f => f.endsWith('.html')).length;
      const jsonReports = files.filter(f => f.endsWith('.json')).length;
      const screenshots = files.filter(f => f.endsWith('.png')).length;
      const videos = files.filter(f => f.endsWith('.webm')).length;
      
      console.log(`📊 結果サマリー:`);
      console.log(`  HTMLレポート: ${htmlReports}件`);
      console.log(`  JSONレポート: ${jsonReports}件`);
      console.log(`  スクリーンショット: ${screenshots}件`);
      console.log(`  動画: ${videos}件`);
    }

    // 古いテスト結果の清理（7日以上古い）
    if (fs.existsSync(testResultsDir)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      const files = fs.readdirSync(testResultsDir);
      let cleanupCount = 0;
      
      for (const file of files) {
        const filePath = path.join(testResultsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          try {
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true });
            } else {
              fs.unlinkSync(filePath);
            }
            cleanupCount++;
          } catch (error) {
            console.warn(`⚠️ ファイル削除に失敗: ${filePath}`);
          }
        }
      }
      
      if (cleanupCount > 0) {
        console.log(`🗑️ 古いテスト結果を清理: ${cleanupCount}件`);
      }
    }

    // エラーログの集約
    const errorLogPath = 'logs/playwright-errors.log';
    const errorDir = path.dirname(errorLogPath);
    
    if (!fs.existsSync(errorDir)) {
      fs.mkdirSync(errorDir, { recursive: true });
    }
    
    // ティアダウン完了ログ
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: Global teardown completed\n`;
    fs.appendFileSync(errorLogPath, logEntry);
    
    console.log('✅ グローバルティアダウン完了');

  } catch (error) {
    console.error('❌ グローバルティアダウン中にエラー:', error);
    // エラーが発生してもテスト実行は継続させる
  }
}

export default globalTeardown;
/**
 * 包括的WebUIエラー監視・修復システム
 * - エラー検知・修復の統合実行
 * - 継続監視とレポート生成
 * - 自動修復の実行
 */

import { chromium, Browser, Page } from '@playwright/test';
import { WebUIErrorMonitor } from './webui-error-monitor';
import { ComponentErrorFixer } from './component-error-fixer';
import { UIErrorDetector } from './ui-error-detector';
import * as fs from 'fs';
import * as path from 'path';

interface ComprehensiveReport {
  execution: {
    startTime: string;
    endTime: string;
    duration: number;
    status: 'SUCCESS' | 'FAILED' | 'WARNING';
  };
  monitoring: {
    totalErrors: number;
    totalWarnings: number;
    totalNetworkErrors: number;
    urls: string[];
  };
  uiDetection: {
    totalUIErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  };
  componentFixes: {
    totalFixes: number;
    fixesByType: Record<string, number>;
  };
  recommendations: string[];
  nextActions: string[];
}

class ComprehensiveWebUIMonitor {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private sourceDir: string;
  private targetUrls: string[] = [
    'http://192.168.3.135:3000',
    'http://192.168.3.135:3000/admin'
  ];

  constructor(sourceDir: string = './src') {
    this.sourceDir = path.resolve(sourceDir);
  }

  async initialize(): Promise<void> {
    console.log('🚀 包括的WebUIエラー監視・修復システムを初期化中...');
    
    this.browser = await chromium.launch({
      headless: process.env.NODE_ENV === 'production',
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    this.page = await context.newPage();

    console.log('✅ システム初期化完了');
  }

  async runComprehensiveMonitoring(): Promise<ComprehensiveReport> {
    const startTime = new Date();
    console.log('\n🔍 包括的WebUIエラー監視を開始...');

    try {
      // 1. 基本的なWebUIエラー監視
      console.log('\n📡 Step 1: WebUIエラー監視実行中...');
      const webUIMonitor = new WebUIErrorMonitor();
      await webUIMonitor.initialize();
      const monitoringReport = await webUIMonitor.monitorUrls();
      await webUIMonitor.saveReport(monitoringReport);
      await webUIMonitor.stopMonitoring();

      // 2. UIエラー検出
      console.log('\n🎨 Step 2: UI/UXエラー検出実行中...');
      const uiDetector = new UIErrorDetector(this.page!, this.sourceDir);
      
      // 各URLでUI検出を実行
      for (const url of this.targetUrls) {
        console.log(`📍 UI検出対象: ${url}`);
        try {
          await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await this.page!.waitForTimeout(2000);
          await uiDetector.detectAllUIErrors();
        } catch (error) {
          console.error(`❌ ${url}のUI検出中にエラー:`, error);
        }
      }
      
      await uiDetector.generateUIFixReport();

      // 3. Reactコンポーネントエラー修復
      console.log('\n🔧 Step 3: Reactコンポーネントエラー修復実行中...');
      const componentFixer = new ComponentErrorFixer(this.sourceDir);
      const componentFixes = await componentFixer.scanAndFixComponents();
      await componentFixer.generateFixReport();

      // 4. 包括レポート生成
      console.log('\n📊 Step 4: 包括レポート生成中...');
      const endTime = new Date();
      const comprehensiveReport: ComprehensiveReport = {
        execution: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime(),
          status: this.determineOverallStatus(monitoringReport, componentFixes)
        },
        monitoring: {
          totalErrors: monitoringReport.summary.totalErrors,
          totalWarnings: monitoringReport.summary.totalWarnings,
          totalNetworkErrors: monitoringReport.summary.totalNetworkErrors,
          urls: this.targetUrls
        },
        uiDetection: {
          totalUIErrors: 0, // UIDetectorから取得
          errorsByType: {},
          errorsBySeverity: {}
        },
        componentFixes: {
          totalFixes: componentFixes.length,
          fixesByType: this.groupFixesByType(componentFixes)
        },
        recommendations: this.generateRecommendations(monitoringReport, componentFixes),
        nextActions: this.generateNextActions(monitoringReport, componentFixes)
      };

      await this.saveComprehensiveReport(comprehensiveReport);
      
      console.log('\n✅ 包括的監視完了');
      return comprehensiveReport;

    } catch (error) {
      console.error('\n❌ 包括的監視中にエラーが発生:', error);
      
      const endTime = new Date();
      const errorReport: ComprehensiveReport = {
        execution: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime(),
          status: 'FAILED'
        },
        monitoring: { totalErrors: 0, totalWarnings: 0, totalNetworkErrors: 0, urls: [] },
        uiDetection: { totalUIErrors: 0, errorsByType: {}, errorsBySeverity: {} },
        componentFixes: { totalFixes: 0, fixesByType: {} },
        recommendations: ['システムエラーが発生しました。ログを確認してください。'],
        nextActions: ['エラーログの詳細確認', 'システム再起動の検討']
      };

      await this.saveComprehensiveReport(errorReport);
      throw error;
    }
  }

  private determineOverallStatus(monitoringReport: any, componentFixes: any[]): 'SUCCESS' | 'FAILED' | 'WARNING' {
    if (monitoringReport.summary.totalErrors > 0) {
      return 'FAILED';
    }
    if (monitoringReport.summary.totalWarnings > 0 || componentFixes.length > 0) {
      return 'WARNING';
    }
    return 'SUCCESS';
  }

  private groupFixesByType(fixes: any[]): Record<string, number> {
    return fixes.reduce((acc, fix) => {
      acc[fix.errorType] = (acc[fix.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateRecommendations(monitoringReport: any, componentFixes: any[]): string[] {
    const recommendations: string[] = [];

    // モニタリング結果に基づく推奨事項
    if (monitoringReport.summary.totalErrors > 0) {
      recommendations.push('🔴 Critical: コンソールエラーを優先的に修復してください');
    }

    if (monitoringReport.summary.totalNetworkErrors > 0) {
      recommendations.push('🌐 API エンドポイントまたはネットワーク設定を確認してください');
    }

    if (monitoringReport.summary.totalWarnings > 5) {
      recommendations.push('⚠️ 大量の警告が検出されました。コードの品質向上を検討してください');
    }

    // コンポーネント修復に基づく推奨事項
    if (componentFixes.length > 10) {
      recommendations.push('🔧 多数のコンポーネント修復が実行されました。コードレビューを実施してください');
    }

    const typeScriptFixes = componentFixes.filter(fix => fix.errorType === 'typescript-error');
    if (typeScriptFixes.length > 0) {
      recommendations.push('📝 TypeScript型注釈の改善により、今後のエラーを予防できます');
    }

    const accessibilityFixes = componentFixes.filter(fix => fix.errorType === 'accessibility-error');
    if (accessibilityFixes.length > 0) {
      recommendations.push('♿ アクセシビリティ改善により、ユーザー体験が向上します');
    }

    // 一般的な推奨事項
    if (recommendations.length === 0) {
      recommendations.push('✅ システムは良好な状態です。定期的な監視を継続してください');
    }

    recommendations.push('📊 定期的な監視により、問題の早期発見が可能です');
    recommendations.push('🧪 自動テストの拡充により、回帰を防止できます');

    return recommendations;
  }

  private generateNextActions(monitoringReport: any, componentFixes: any[]): string[] {
    const actions: string[] = [];

    // 緊急対応が必要なアクション
    if (monitoringReport.summary.totalErrors > 0) {
      actions.push('🚨 即座にコンソールエラーを調査・修復');
      actions.push('🔍 エラーの根本原因を特定');
    }

    if (monitoringReport.summary.totalNetworkErrors > 0) {
      actions.push('🌐 APIサーバーの状態確認');
      actions.push('🔧 ネットワーク接続の修復');
    }

    // 改善アクション
    if (componentFixes.length > 0) {
      actions.push('✅ 適用された修復内容を確認');
      actions.push('🧪 修復後のテスト実行');
    }

    // 予防アクション
    actions.push('📈 監視間隔の最適化検討');
    actions.push('🔄 継続的監視の設定確認');
    actions.push('📋 修復結果のドキュメント化');

    return actions;
  }

  private async saveComprehensiveReport(report: ComprehensiveReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basePath = path.dirname(this.sourceDir);
    
    // JSON レポート
    const jsonPath = path.join(basePath, `comprehensive-webui-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // HTML レポート
    const htmlPath = path.join(basePath, `comprehensive-webui-report-${timestamp}.html`);
    const htmlContent = this.generateComprehensiveHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);

    // 最新レポートのシンボリックリンク作成
    const latestJsonPath = path.join(basePath, 'latest-comprehensive-webui-report.json');
    const latestHtmlPath = path.join(basePath, 'latest-comprehensive-webui-report.html');
    
    try {
      if (fs.existsSync(latestJsonPath)) fs.unlinkSync(latestJsonPath);
      if (fs.existsSync(latestHtmlPath)) fs.unlinkSync(latestHtmlPath);
      
      fs.symlinkSync(path.basename(jsonPath), latestJsonPath);
      fs.symlinkSync(path.basename(htmlPath), latestHtmlPath);
    } catch (error) {
      // シンボリックリンク作成に失敗した場合はコピー
      fs.copyFileSync(jsonPath, latestJsonPath);
      fs.copyFileSync(htmlPath, latestHtmlPath);
    }

    console.log(`📊 包括的レポートを保存:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   Latest: ${latestJsonPath}, ${latestHtmlPath}`);
  }

  private generateComprehensiveHTMLReport(report: ComprehensiveReport): string {
    const statusColor = {
      'SUCCESS': '#28a745',
      'WARNING': '#ffc107',
      'FAILED': '#dc3545'
    }[report.execution.status];

    const statusIcon = {
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'FAILED': '❌'
    }[report.execution.status];

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>包括的WebUIエラー監視レポート</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px; 
            text-align: center;
            position: relative;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 10px;
            background: ${statusColor};
        }
        .header h1 { font-size: 3em; margin-bottom: 10px; }
        .header .subtitle { font-size: 1.2em; opacity: 0.9; }
        .status-banner {
            background: ${statusColor};
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            padding: 40px;
            background: #f8f9fa;
        }
        .metric-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .metric-card:hover { transform: translateY(-5px); }
        .metric-number {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .metric-label {
            color: #6c757d;
            font-size: 1.1em;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 50px;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }
        .section h2 {
            color: #333;
            margin-bottom: 25px;
            font-size: 2em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .recommendation-item, .action-item {
            background: #f8f9fa;
            margin: 15px 0;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #667eea;
            font-size: 1.1em;
        }
        .critical { border-left-color: #dc3545; background: #f8d7da; }
        .warning { border-left-color: #ffc107; background: #fff3cd; }
        .success { border-left-color: #28a745; background: #d4edda; }
        .execution-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .detail-item {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .detail-label {
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 5px;
        }
        .detail-value {
            color: #333;
            font-size: 1.1em;
        }
        .footer {
            background: #333;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .url-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        .url-tag {
            background: #667eea;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon} 包括的WebUIエラー監視レポート</h1>
            <div class="subtitle">実行時刻: ${new Date(report.execution.startTime).toLocaleString('ja-JP')}</div>
        </div>

        <div class="status-banner">
            システム状態: ${report.execution.status} (実行時間: ${(report.execution.duration / 1000).toFixed(2)}秒)
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.monitoring.totalErrors}</div>
                <div class="metric-label">エラー</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.monitoring.totalWarnings}</div>
                <div class="metric-label">警告</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.monitoring.totalNetworkErrors}</div>
                <div class="metric-label">ネットワークエラー</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.uiDetection.totalUIErrors}</div>
                <div class="metric-label">UIエラー</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.componentFixes.totalFixes}</div>
                <div class="metric-label">修復適用</div>
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2>📊 実行詳細</h2>
                <div class="execution-details">
                    <div class="detail-item">
                        <div class="detail-label">開始時刻</div>
                        <div class="detail-value">${new Date(report.execution.startTime).toLocaleString('ja-JP')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">終了時刻</div>
                        <div class="detail-value">${new Date(report.execution.endTime).toLocaleString('ja-JP')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">実行時間</div>
                        <div class="detail-value">${(report.execution.duration / 1000).toFixed(2)}秒</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">監視対象URL数</div>
                        <div class="detail-value">${report.monitoring.urls.length}</div>
                    </div>
                </div>
                
                <h3>監視対象URL:</h3>
                <div class="url-list">
                    ${report.monitoring.urls.map(url => `<span class="url-tag">${url}</span>`).join('')}
                </div>
            </div>

            <div class="section">
                <h2>💡 推奨事項</h2>
                ${report.recommendations.map(rec => {
                    const className = rec.includes('Critical') ? 'critical' : 
                                    rec.includes('⚠️') ? 'warning' : 'success';
                    return `<div class="recommendation-item ${className}">${rec}</div>`;
                }).join('')}
            </div>

            <div class="section">
                <h2>🎯 次のアクション</h2>
                ${report.nextActions.map(action => `
                    <div class="action-item">${action}</div>
                `).join('')}
            </div>

            ${Object.keys(report.componentFixes.fixesByType).length > 0 ? `
            <div class="section">
                <h2>🔧 コンポーネント修復サマリー</h2>
                <div class="execution-details">
                    ${Object.entries(report.componentFixes.fixesByType).map(([type, count]) => `
                        <div class="detail-item">
                            <div class="detail-label">${type}</div>
                            <div class="detail-value">${count}件</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>🔄 継続的なWebUI監視により、システムの健全性を維持</p>
            <p style="margin-top: 10px; opacity: 0.8;">Generated by Comprehensive WebUI Monitor v1.0</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async startContinuousMonitoring(intervalMinutes: number = 30): Promise<void> {
    console.log(`🔄 継続監視を開始 (間隔: ${intervalMinutes}分)`);
    
    let isRunning = true;
    
    // Ctrl+Cで停止
    process.on('SIGINT', () => {
      console.log('\n⏹️ 継続監視を停止中...');
      isRunning = false;
    });

    while (isRunning) {
      try {
        console.log('\n🔍 新しい監視サイクルを開始...');
        const report = await this.runComprehensiveMonitoring();
        
        // 重大な問題が検出された場合の通知
        if (report.execution.status === 'FAILED') {
          console.log('\n🚨 重大な問題が検出されました！');
          console.log('📧 管理者への通知を推奨します');
        }
        
        console.log(`✅ 監視サイクル完了 - ステータス: ${report.execution.status}`);
        
        if (isRunning) {
          const waitTime = intervalMinutes * 60 * 1000;
          console.log(`⏰ 次回実行まで ${intervalMinutes}分待機...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
      } catch (error) {
        console.error('❌ 監視サイクル中にエラー:', error);
        console.log('🔄 1分後に再試行...');
        
        if (isRunning) {
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
    
    console.log('✅ 継続監視が停止されました');
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export { ComprehensiveWebUIMonitor, ComprehensiveReport };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const monitor = new ComprehensiveWebUIMonitor();
  
  const run = async () => {
    try {
      await monitor.initialize();
      
      // コマンドライン引数の処理
      const args = process.argv.slice(2);
      const onceFlag = args.includes('--once');
      const intervalArg = args.find(arg => arg.startsWith('--interval='));
      const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 30;
      
      if (onceFlag) {
        console.log('🔍 一回のみの包括監視を実行...');
        const report = await monitor.runComprehensiveMonitoring();
        console.log(`✅ 監視完了 - ステータス: ${report.execution.status}`);
      } else {
        await monitor.startContinuousMonitoring(interval);
      }
      
    } catch (error) {
      console.error('❌ システム実行中にエラー:', error);
      process.exit(1);
    } finally {
      await monitor.cleanup();
    }
  };

  run();
}
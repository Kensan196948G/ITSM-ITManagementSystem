/**
 * 強化ブラウザ開発者コンソールエラー自動検知システム
 * - リアルタイムコンソールエラー監視
 * - 詳細なエラー分類とコンテキスト情報の収集
 * - エラー重要度の自動判定
 * - React/TypeScript固有エラーの特別処理
 */

import { Page, Browser, BrowserContext, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface ConsoleError {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  source: string;
  lineNumber?: number;
  columnNumber?: number;
  stackTrace?: string;
  url: string;
  category: 'javascript' | 'react' | 'typescript' | 'network' | 'security' | 'performance' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  component?: string;
  fixable: boolean;
  autoFixAttempted: boolean;
  context: {
    userAgent: string;
    viewport: { width: number; height: number };
    currentPage: string;
    htmlElement?: string;
  };
}

interface ConsoleErrorReport {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errors: ConsoleError[];
  summary: string;
  recommendations: string[];
  criticalIssues: ConsoleError[];
}

class EnhancedConsoleErrorDetector {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private errors: ConsoleError[] = [];
  private sessionId: string;
  private reportDir: string;
  private isMonitoring: boolean = false;
  private startTime: Date;

  constructor(reportDir: string = './console-error-reports') {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.reportDir = reportDir;
    this.startTime = new Date();
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private generateErrorId(): string {
    return `console_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeError(message: string, source: string): ConsoleError['category'] {
    const lowerMessage = message.toLowerCase();
    const lowerSource = source.toLowerCase();

    // React関連エラー
    if (lowerMessage.includes('react') || 
        lowerMessage.includes('jsx') || 
        lowerMessage.includes('hook') ||
        lowerMessage.includes('component') ||
        lowerMessage.includes('props') ||
        lowerMessage.includes('state')) {
      return 'react';
    }

    // TypeScript関連エラー
    if (lowerMessage.includes('typescript') || 
        lowerMessage.includes('ts(') ||
        lowerMessage.includes('type error') ||
        lowerSource.includes('.ts') ||
        lowerSource.includes('.tsx')) {
      return 'typescript';
    }

    // ネットワーク関連エラー
    if (lowerMessage.includes('network') ||
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('xhr') ||
        lowerMessage.includes('cors') ||
        lowerMessage.includes('http') ||
        lowerMessage.includes('ajax')) {
      return 'network';
    }

    // セキュリティ関連エラー
    if (lowerMessage.includes('security') ||
        lowerMessage.includes('csp') ||
        lowerMessage.includes('content security policy') ||
        lowerMessage.includes('mixed content') ||
        lowerMessage.includes('insecure')) {
      return 'security';
    }

    // パフォーマンス関連エラー
    if (lowerMessage.includes('performance') ||
        lowerMessage.includes('memory') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('slow')) {
      return 'performance';
    }

    // JavaScript関連エラー
    if (lowerMessage.includes('syntax') ||
        lowerMessage.includes('reference') ||
        lowerMessage.includes('type') ||
        lowerMessage.includes('uncaught')) {
      return 'javascript';
    }

    return 'unknown';
  }

  private determineSeverity(level: string, message: string, category: ConsoleError['category']): ConsoleError['severity'] {
    const lowerMessage = message.toLowerCase();

    // Critical - システムを壊すエラー
    if (level === 'error' && (
        lowerMessage.includes('uncaught') ||
        lowerMessage.includes('fatal') ||
        lowerMessage.includes('critical') ||
        lowerMessage.includes('crash') ||
        lowerMessage.includes('failed to fetch') ||
        category === 'security'
    )) {
      return 'critical';
    }

    // High - 機能に重大な影響
    if (level === 'error' && (
        category === 'react' ||
        category === 'typescript' ||
        category === 'network' ||
        lowerMessage.includes('cannot read') ||
        lowerMessage.includes('undefined') ||
        lowerMessage.includes('null')
    )) {
      return 'high';
    }

    // Medium - 警告やマイナーなエラー
    if (level === 'warning' || level === 'error') {
      return 'medium';
    }

    // Low - 情報レベル
    return 'low';
  }

  private isFixableError(message: string, category: ConsoleError['category']): boolean {
    const lowerMessage = message.toLowerCase();

    // 自動修復可能なパターン
    const fixablePatterns = [
      'react router future flag',
      'deprecated prop',
      'missing key prop',
      'unused variable',
      'undefined variable',
      'missing dependency',
      'accessibility',
      'missing alt attribute',
      'duplicate id',
      'invalid html'
    ];

    return fixablePatterns.some(pattern => lowerMessage.includes(pattern)) ||
           category === 'react' ||
           category === 'typescript';
  }

  private extractComponentInfo(message: string, stackTrace?: string): string | undefined {
    // React コンポーネント名の抽出
    const componentRegex = /in (\w+) \(at/g;
    const match = componentRegex.exec(stackTrace || message);
    
    if (match) {
      return match[1];
    }

    // ファイル名からコンポーネント名を推測
    const fileRegex = /(\w+)\.tsx?/g;
    const fileMatch = fileRegex.exec(message);
    
    if (fileMatch) {
      return fileMatch[1];
    }

    return undefined;
  }

  async initializeBrowser(): Promise<void> {
    console.log('🚀 Enhanced Console Error Detector を初期化中...');
    
    this.browser = await chromium.launch({
      headless: false, // コンソール監視のため表示モード
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-logging',
        '--log-level=0',
        '--v=1'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      recordVideo: {
        dir: `${this.reportDir}/videos`,
        size: { width: 1920, height: 1080 }
      }
    });

    console.log('✅ ブラウザ初期化完了');
  }

  async setupEnhancedErrorListeners(page: Page): Promise<void> {
    // 拡張コンソールリスナー
    page.on('console', async (msg) => {
      if (!this.isMonitoring) return;

      const level = msg.type() as 'error' | 'warning' | 'info' | 'debug';
      const message = msg.text();
      const location = msg.location();
      
      // JavaScript実行時エラーの詳細取得
      let stackTrace: string | undefined;
      try {
        const args = msg.args();
        if (args.length > 0) {
          const errorObj = await args[0].jsonValue();
          if (errorObj && typeof errorObj === 'object' && 'stack' in errorObj) {
            stackTrace = errorObj.stack as string;
          }
        }
      } catch (e) {
        // Stack trace取得に失敗した場合は無視
      }

      const category = this.categorizeError(message, location.url);
      const severity = this.determineSeverity(level, message, category);
      const component = this.extractComponentInfo(message, stackTrace);
      const fixable = this.isFixableError(message, category);

      const error: ConsoleError = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        level,
        message,
        source: location.url,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
        stackTrace,
        url: page.url(),
        category,
        severity,
        component,
        fixable,
        autoFixAttempted: false,
        context: {
          userAgent: await page.evaluate(() => navigator.userAgent),
          viewport: page.viewportSize() || { width: 1920, height: 1080 },
          currentPage: page.url(),
          htmlElement: await this.getCurrentHTMLElement(page)
        }
      };

      this.errors.push(error);
      
      // 重要度に応じたログ出力
      const severityEmoji = {
        critical: '🔴',
        high: '🟠', 
        medium: '🟡',
        low: '🟢'
      };

      console.log(`${severityEmoji[severity]} [${level.toUpperCase()}] ${category}: ${message}`);
      
      if (severity === 'critical') {
        console.error(`🚨 CRITICAL ERROR DETECTED: ${message}`);
      }
    });

    // ページエラー（クラッシュ）の監視
    page.on('pageerror', (error) => {
      if (!this.isMonitoring) return;

      const consoleError: ConsoleError = {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        level: 'error',
        message: error.message,
        source: 'page_error',
        stackTrace: error.stack,
        url: page.url(),
        category: 'javascript',
        severity: 'critical',
        fixable: this.isFixableError(error.message, 'javascript'),
        autoFixAttempted: false,
        context: {
          userAgent: '',
          viewport: page.viewportSize() || { width: 1920, height: 1080 },
          currentPage: page.url()
        }
      };

      this.errors.push(consoleError);
      console.error('🔴 PAGE ERROR:', error.message);
    });

    // 未処理のプロミス拒否の監視
    await page.addInitScript(() => {
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
      });
    });

    // React開発者ツールのエラー監視
    await page.addInitScript(() => {
      // React Error Boundary のカスタム監視
      const originalComponentDidCatch = React.Component.prototype.componentDidCatch;
      if (originalComponentDidCatch) {
        React.Component.prototype.componentDidCatch = function(error: Error, errorInfo: any) {
          console.error('React Error Boundary Caught:', error, errorInfo);
          if (originalComponentDidCatch) {
            originalComponentDidCatch.call(this, error, errorInfo);
          }
        };
      }
    });
  }

  private async getCurrentHTMLElement(page: Page): Promise<string | undefined> {
    try {
      return await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body) {
          return activeElement.outerHTML.substring(0, 200) + '...';
        }
        return undefined;
      });
    } catch (e) {
      return undefined;
    }
  }

  async startMonitoring(urls: string[]): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    this.isMonitoring = true;
    console.log('🔍 Enhanced Console Error Monitoring 開始...');

    for (const url of urls) {
      const page = await this.context.newPage();
      await this.setupEnhancedErrorListeners(page);

      try {
        console.log(`📍 監視対象: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // ページ操作の実行（エラーを誘発するため）
        await this.performPageInteractions(page);
        
        // JavaScript実行状況の監視
        await this.monitorJavaScriptExecution(page);
        
        // スクリーンショット保存
        const urlSafe = url.replace(/[^a-zA-Z0-9]/g, '_');
        await page.screenshot({
          path: `${this.reportDir}/screenshots/console_monitor_${urlSafe}.png`,
          fullPage: true
        });

      } catch (error) {
        console.error(`❌ ${url} の監視中にエラー:`, error);
        
        const consoleError: ConsoleError = {
          id: this.generateErrorId(),
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Page monitoring failed: ${error}`,
          source: 'monitor_error',
          url,
          category: 'unknown',
          severity: 'high',
          fixable: false,
          autoFixAttempted: false,
          context: {
            userAgent: '',
            viewport: { width: 1920, height: 1080 },
            currentPage: url
          }
        };
        
        this.errors.push(consoleError);
      }

      await page.close();
    }
  }

  private async performPageInteractions(page: Page): Promise<void> {
    try {
      // クリック可能な要素の操作
      const clickables = await page.$$('button, a, [role="button"], input[type="submit"]');
      for (let i = 0; i < Math.min(clickables.length, 5); i++) {
        try {
          await clickables[i].click({ timeout: 2000 });
          await page.waitForTimeout(1000);
        } catch (e) {
          // クリックエラーは無視（意図的なエラー誘発のため）
        }
      }

      // フォーム入力の操作
      const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        try {
          await inputs[i].fill('test input');
          await page.waitForTimeout(500);
        } catch (e) {
          // 入力エラーは無視
        }
      }

      // 検索機能のテスト
      const searchInputs = await page.$$('input[type="search"], input[placeholder*="search" i]');
      for (const input of searchInputs) {
        try {
          await input.fill('test search');
          await input.press('Enter');
          await page.waitForTimeout(2000);
        } catch (e) {
          // 検索エラーは無視
        }
      }

    } catch (error) {
      console.warn('Page interactions failed:', error);
    }
  }

  private async monitorJavaScriptExecution(page: Page): Promise<void> {
    try {
      // JavaScript エラーハンドラーの監視
      await page.evaluate(() => {
        // グローバルエラーハンドラー
        window.addEventListener('error', (event) => {
          console.error('Global Error Event:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
          });
        });

        // 未処理のプロミス拒否の監視
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled Promise Rejection Event:', {
            reason: event.reason,
            promise: event.promise
          });
        });
      });

      // React の状態監視
      const hasReact = await page.evaluate(() => {
        return typeof window.React !== 'undefined' || 
               document.querySelector('[data-reactroot]') !== null;
      });

      if (hasReact) {
        await this.monitorReactApplication(page);
      }

    } catch (error) {
      console.warn('JavaScript execution monitoring failed:', error);
    }
  }

  private async monitorReactApplication(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        // React の開発者警告をキャッチ
        const originalWarn = console.warn;
        console.warn = (...args) => {
          const message = args.join(' ');
          if (message.includes('React') || message.includes('Warning:')) {
            console.error('React Warning Detected:', message);
          }
          originalWarn.apply(console, args);
        };

        // React の未来フラグ警告の監視
        const originalError = console.error;
        console.error = (...args) => {
          const message = args.join(' ');
          if (message.includes('React Router Future Flag')) {
            console.error('React Router Future Flag Warning Detected:', message);
          }
          originalError.apply(console, args);
        };
      });
    } catch (error) {
      console.warn('React application monitoring failed:', error);
    }
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    console.log('⏹️ Enhanced Console Error Monitoring 停止');
  }

  async generateReport(): Promise<ConsoleErrorReport> {
    const endTime = new Date();
    
    const errorsByLevel = this.errors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const criticalIssues = this.errors.filter(e => e.severity === 'critical');
    const fixableErrors = this.errors.filter(e => e.fixable);

    const summary = `
Enhanced Console Error Detection Report:
- Total Errors: ${this.errors.length}
- Critical: ${errorsBySeverity.critical || 0}
- High: ${errorsBySeverity.high || 0}
- Medium: ${errorsBySeverity.medium || 0}
- Low: ${errorsBySeverity.low || 0}

Categories:
- JavaScript: ${errorsByCategory.javascript || 0}
- React: ${errorsByCategory.react || 0}
- TypeScript: ${errorsByCategory.typescript || 0}
- Network: ${errorsByCategory.network || 0}
- Security: ${errorsByCategory.security || 0}
- Performance: ${errorsByCategory.performance || 0}

Fixable Errors: ${fixableErrors.length}
Monitoring Duration: ${Math.round((endTime.getTime() - this.startTime.getTime()) / 1000)}s
`;

    const recommendations = this.generateRecommendations();

    const report: ConsoleErrorReport = {
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalErrors: this.errors.length,
      errorsByLevel,
      errorsByCategory,
      errorsBySeverity,
      errors: this.errors,
      summary: summary.trim(),
      recommendations,
      criticalIssues
    };

    // レポート保存
    const reportPath = path.join(this.reportDir, `console-error-report-${this.sessionId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // HTML レポート生成
    await this.generateHTMLReport(report);

    console.log(`📊 Enhanced Console Error Report 保存: ${reportPath}`);
    return report;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const criticalErrors = this.errors.filter(e => e.severity === 'critical');
    const reactErrors = this.errors.filter(e => e.category === 'react');
    const typescriptErrors = this.errors.filter(e => e.category === 'typescript');
    const networkErrors = this.errors.filter(e => e.category === 'network');

    if (criticalErrors.length > 0) {
      recommendations.push('🔴 Critical errors require immediate attention to prevent system failure');
    }

    if (reactErrors.length > 5) {
      recommendations.push('⚛️ Multiple React errors detected - review component lifecycle and state management');
    }

    if (typescriptErrors.length > 0) {
      recommendations.push('📝 TypeScript errors should be resolved to improve code safety and maintainability');
    }

    if (networkErrors.length > 0) {
      recommendations.push('🌐 Network errors indicate API or connectivity issues that need investigation');
    }

    const fixableErrors = this.errors.filter(e => e.fixable);
    if (fixableErrors.length > 0) {
      recommendations.push(`🔧 ${fixableErrors.length} errors are automatically fixable - consider running auto-repair`);
    }

    if (this.errors.length === 0) {
      recommendations.push('✅ No console errors detected - system is running smoothly');
    }

    recommendations.push('📊 Regular console monitoring helps maintain system health');
    recommendations.push('🧪 Consider adding automated testing to prevent future errors');

    return recommendations;
  }

  private async generateHTMLReport(report: ConsoleErrorReport): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Console Error Detection Report</title>
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
        }
        .header h1 { font-size: 3em; margin-bottom: 10px; }
        .header .subtitle { font-size: 1.2em; opacity: 0.9; }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 40px;
            background: #f8f9fa;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .metric-number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .error-list {
            max-height: 600px;
            overflow-y: auto;
            padding: 20px;
        }
        .error-item {
            background: #f8f9fa;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 5px solid #ddd;
        }
        .error-critical { border-left-color: #dc3545; background: #f8d7da; }
        .error-high { border-left-color: #fd7e14; background: #fff3cd; }
        .error-medium { border-left-color: #ffc107; background: #fff3cd; }
        .error-low { border-left-color: #28a745; background: #d4edda; }
        .section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .recommendations {
            background: #e3f2fd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
        }
        .recommendation-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Enhanced Console Error Detection Report</h1>
            <div class="subtitle">Session: ${report.sessionId}</div>
            <div class="subtitle">Generated: ${new Date(report.endTime).toLocaleString('ja-JP')}</div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.totalErrors}</div>
                <div class="metric-label">Total Errors</div>
            </div>
            <div class="metric-card">
                <div class="metric-number critical">${report.errorsBySeverity.critical || 0}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric-card">
                <div class="metric-number high">${report.errorsBySeverity.high || 0}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric-card">
                <div class="metric-number medium">${report.errorsBySeverity.medium || 0}</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric-card">
                <div class="metric-number low">${report.errorsBySeverity.low || 0}</div>
                <div class="metric-label">Low</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.errors.filter(e => e.fixable).length}</div>
                <div class="metric-label">Fixable</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Summary</h2>
            <pre>${report.summary}</pre>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => 
                    `<div class="recommendation-item">${rec}</div>`
                ).join('')}
            </div>
        </div>

        ${report.criticalIssues.length > 0 ? `
        <div class="section">
            <h2>🚨 Critical Issues</h2>
            <div class="error-list">
                ${report.criticalIssues.map(error => `
                    <div class="error-item error-critical">
                        <strong>${error.level.toUpperCase()}</strong> [${error.category}] ${error.component ? `(${error.component})` : ''}
                        <br><strong>Message:</strong> ${error.message}
                        <br><strong>Source:</strong> ${error.source}
                        <br><strong>Time:</strong> ${new Date(error.timestamp).toLocaleString('ja-JP')}
                        ${error.stackTrace ? `<br><strong>Stack:</strong> <code>${error.stackTrace.substring(0, 200)}...</code>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>📋 All Errors</h2>
            <div class="error-list">
                ${report.errors.map(error => `
                    <div class="error-item error-${error.severity}">
                        <strong>${error.level.toUpperCase()}</strong> [${error.category}] ${error.component ? `(${error.component})` : ''}
                        ${error.fixable ? '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">FIXABLE</span>' : ''}
                        <br><strong>Message:</strong> ${error.message}
                        <br><strong>Source:</strong> ${error.source}
                        <br><strong>Time:</strong> ${new Date(error.timestamp).toLocaleString('ja-JP')}
                        <br><strong>URL:</strong> ${error.url}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(this.reportDir, `console-error-report-${this.sessionId}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}

export { EnhancedConsoleErrorDetector, ConsoleError, ConsoleErrorReport };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const detector = new EnhancedConsoleErrorDetector();
  
  const run = async () => {
    try {
      await detector.initializeBrowser();
      
      const urls = [
        'http://192.168.3.135:3000',
        'http://192.168.3.135:3000/admin'
      ];
      
      await detector.startMonitoring(urls);
      
      // 30秒間監視
      console.log('⏰ 30秒間監視します...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      await detector.stopMonitoring();
      const report = await detector.generateReport();
      
      console.log('\n✅ Enhanced Console Error Detection 完了');
      console.log(`📊 Total Errors: ${report.totalErrors}`);
      console.log(`🔴 Critical: ${report.errorsBySeverity.critical || 0}`);
      
    } catch (error) {
      console.error('❌ Enhanced Console Error Detection 失敗:', error);
      process.exit(1);
    } finally {
      await detector.cleanup();
    }
  };

  run();
}
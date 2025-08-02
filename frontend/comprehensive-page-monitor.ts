/**
 * WebUI包括的ページ監視システム
 * - フロントエンド全ページの監視
 * - 管理者ダッシュボードの特別監視
 * - ページ固有エラーの検知
 * - ユーザーフローのエラー監視
 */

import { Page, Browser, BrowserContext, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface PageMonitorConfig {
  url: string;
  name: string;
  type: 'public' | 'admin' | 'protected';
  requiredElements: string[];
  interactions: PageInteraction[];
  timeout: number;
  priority: 'high' | 'medium' | 'low';
}

interface PageInteraction {
  type: 'click' | 'fill' | 'select' | 'hover' | 'wait';
  selector: string;
  value?: string;
  timeout?: number;
  optional?: boolean;
}

interface PageMonitorResult {
  pageConfig: PageMonitorConfig;
  status: 'success' | 'error' | 'warning';
  loadTime: number;
  errors: PageError[];
  performance: PagePerformance;
  accessibility: AccessibilityResult[];
  screenshots: string[];
  timestamp: string;
}

interface PageError {
  id: string;
  type: 'console' | 'network' | 'ui' | 'interaction' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  element?: string;
  screenshot?: string;
  timestamp: string;
}

interface PagePerformance {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  memoryUsage: number;
}

interface AccessibilityResult {
  type: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string;
  message: string;
}

interface ComprehensiveMonitorReport {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalPages: number;
  successfulPages: number;
  errorPages: number;
  warningPages: number;
  pageResults: PageMonitorResult[];
  summary: {
    totalErrors: number;
    criticalErrors: number;
    averageLoadTime: number;
    worstPerformingPage: string;
    bestPerformingPage: string;
  };
  recommendations: string[];
}

class ComprehensivePageMonitor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private reportDir: string;
  private sessionId: string;
  private baseUrl: string = 'http://192.168.3.135:3000';

  // 監視対象ページの設定
  private pageConfigs: PageMonitorConfig[] = [
    // パブリックページ
    {
      url: '/',
      name: 'Home Page',
      type: 'public',
      requiredElements: ['header', 'nav', 'main', 'footer'],
      interactions: [
        { type: 'wait', selector: 'body', timeout: 3000 },
        { type: 'click', selector: 'nav a', optional: true },
      ],
      timeout: 30000,
      priority: 'high'
    },
    {
      url: '/dashboard',
      name: 'Main Dashboard',
      type: 'protected',
      requiredElements: ['[data-testid="dashboard"]', '.metric-card', '.chart-container'],
      interactions: [
        { type: 'wait', selector: '.metric-card', timeout: 5000 },
        { type: 'click', selector: '.filter-button', optional: true },
        { type: 'hover', selector: '.chart-container', optional: true },
      ],
      timeout: 45000,
      priority: 'high'
    },
    {
      url: '/incidents',
      name: 'Incident Management',
      type: 'protected',
      requiredElements: ['.incident-list', '.create-incident-btn', '.search-box'],
      interactions: [
        { type: 'wait', selector: '.incident-list', timeout: 5000 },
        { type: 'fill', selector: '.search-box input', value: 'test', optional: true },
        { type: 'click', selector: '.create-incident-btn', optional: true },
      ],
      timeout: 30000,
      priority: 'high'
    },
    {
      url: '/problems',
      name: 'Problem Management',
      type: 'protected',
      requiredElements: ['.problem-list', '.create-problem-btn'],
      interactions: [
        { type: 'wait', selector: '.problem-list', timeout: 5000 },
        { type: 'click', selector: '.problem-item', optional: true },
      ],
      timeout: 30000,
      priority: 'high'
    },
    {
      url: '/users',
      name: 'User Management',
      type: 'protected',
      requiredElements: ['.user-list', '.add-user-btn'],
      interactions: [
        { type: 'wait', selector: '.user-list', timeout: 5000 },
        { type: 'click', selector: '.user-item', optional: true },
      ],
      timeout: 30000,
      priority: 'medium'
    },
    {
      url: '/settings',
      name: 'System Settings',
      type: 'protected',
      requiredElements: ['.settings-panel', '.save-settings-btn'],
      interactions: [
        { type: 'wait', selector: '.settings-panel', timeout: 5000 },
        { type: 'click', selector: '.settings-tab', optional: true },
      ],
      timeout: 30000,
      priority: 'medium'
    },
    {
      url: '/admin',
      name: 'Admin Dashboard',
      type: 'admin',
      requiredElements: ['.admin-panel', '.system-stats', '.admin-nav'],
      interactions: [
        { type: 'wait', selector: '.admin-panel', timeout: 5000 },
        { type: 'click', selector: '.admin-nav a', optional: true },
        { type: 'hover', selector: '.system-stats', optional: true },
      ],
      timeout: 45000,
      priority: 'high'
    },
    // その他の重要ページ
    {
      url: '/login',
      name: 'Login Page',
      type: 'public',
      requiredElements: ['form', 'input[type="email"]', 'input[type="password"]', 'button[type="submit"]'],
      interactions: [
        { type: 'wait', selector: 'form', timeout: 3000 },
        { type: 'fill', selector: 'input[type="email"]', value: 'test@example.com', optional: true },
        { type: 'fill', selector: 'input[type="password"]', value: 'password', optional: true },
      ],
      timeout: 20000,
      priority: 'high'
    }
  ];

  constructor(reportDir: string = './page-monitor-reports') {
    this.sessionId = `page_monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.reportDir = reportDir;
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    
    const screenshotDir = path.join(this.reportDir, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  }

  async initializeBrowser(): Promise<void> {
    console.log('🚀 Comprehensive Page Monitor を初期化中...');
    
    this.browser = await chromium.launch({
      headless: false, // UI監視のため表示モード
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      recordVideo: {
        dir: path.join(this.reportDir, 'videos'),
        size: { width: 1920, height: 1080 }
      }
    });

    console.log('✅ ブラウザ初期化完了');
  }

  async monitorPage(config: PageMonitorConfig): Promise<PageMonitorResult> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    const errors: PageError[] = [];
    const screenshots: string[] = [];
    const startTime = Date.now();
    
    console.log(`📍 監視開始: ${config.name} (${config.url})`);

    // エラーリスナーの設定
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({
          id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'console',
          severity: 'high',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('pageerror', (error) => {
      errors.push({
        id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ui',
        severity: 'critical',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push({
          id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'network',
          severity: response.status() >= 500 ? 'critical' : 'high',
          message: `HTTP ${response.status()}: ${response.statusText()} - ${response.url()}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    let status: 'success' | 'error' | 'warning' = 'success';
    let performance: PagePerformance;
    let accessibility: AccessibilityResult[] = [];

    try {
      // ページロード
      const fullUrl = config.url.startsWith('http') ? config.url : `${this.baseUrl}${config.url}`;
      await page.goto(fullUrl, { 
        waitUntil: 'networkidle', 
        timeout: config.timeout 
      });

      const loadTime = Date.now() - startTime;

      // 必須要素の確認
      await this.checkRequiredElements(page, config, errors);

      // パフォーマンス測定
      performance = await this.measurePerformance(page);

      // インタラクションテスト
      await this.performInteractions(page, config, errors, screenshots);

      // アクセシビリティチェック
      accessibility = await this.checkAccessibility(page);

      // スクリーンショット保存
      const screenshotPath = await this.takeScreenshot(page, config.name);
      screenshots.push(screenshotPath);

      // ステータス判定
      const criticalErrors = errors.filter(e => e.severity === 'critical').length;
      const highErrors = errors.filter(e => e.severity === 'high').length;
      
      if (criticalErrors > 0) {
        status = 'error';
      } else if (highErrors > 0 || errors.length > 5) {
        status = 'warning';
      }

      console.log(`✅ ${config.name} 監視完了: ${status.toUpperCase()} (${loadTime}ms, ${errors.length} errors)`);

      return {
        pageConfig: config,
        status,
        loadTime,
        errors,
        performance,
        accessibility,
        screenshots,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ ${config.name} 監視中にエラー:`, error);
      
      errors.push({
        id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'ui',
        severity: 'critical',
        message: `Page monitoring failed: ${error}`,
        timestamp: new Date().toISOString()
      });

      return {
        pageConfig: config,
        status: 'error',
        loadTime: Date.now() - startTime,
        errors,
        performance: {
          domContentLoaded: 0,
          loadComplete: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          memoryUsage: 0
        },
        accessibility: [],
        screenshots,
        timestamp: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  private async checkRequiredElements(page: Page, config: PageMonitorConfig, errors: PageError[]): Promise<void> {
    for (const selector of config.requiredElements) {
      try {
        const element = await page.$(selector);
        if (!element) {
          errors.push({
            id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'ui',
            severity: 'high',
            message: `Required element not found: ${selector}`,
            element: selector,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        errors.push({
          id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'ui',
          severity: 'medium',
          message: `Error checking element ${selector}: ${error}`,
          element: selector,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async measurePerformance(page: Page): Promise<PagePerformance> {
    try {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          largestContentfulPaint: 0, // LCPは別途取得が必要
          cumulativeLayoutShift: 0,  // CLSは別途取得が必要
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        };
      });

      return metrics;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        memoryUsage: 0
      };
    }
  }

  private async performInteractions(page: Page, config: PageMonitorConfig, errors: PageError[], screenshots: string[]): Promise<void> {
    for (const interaction of config.interactions) {
      try {
        switch (interaction.type) {
          case 'click':
            const clickElement = await page.$(interaction.selector);
            if (clickElement) {
              await clickElement.click({ timeout: interaction.timeout || 5000 });
              await page.waitForTimeout(1000); // 操作後の待機
            } else if (!interaction.optional) {
              errors.push({
                id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'interaction',
                severity: 'medium',
                message: `Click target not found: ${interaction.selector}`,
                element: interaction.selector,
                timestamp: new Date().toISOString()
              });
            }
            break;

          case 'fill':
            const fillElement = await page.$(interaction.selector);
            if (fillElement && interaction.value) {
              await fillElement.fill(interaction.value);
              await page.waitForTimeout(500);
            } else if (!interaction.optional) {
              errors.push({
                id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'interaction',
                severity: 'medium',
                message: `Fill target not found: ${interaction.selector}`,
                element: interaction.selector,
                timestamp: new Date().toISOString()
              });
            }
            break;

          case 'hover':
            const hoverElement = await page.$(interaction.selector);
            if (hoverElement) {
              await hoverElement.hover();
              await page.waitForTimeout(500);
            }
            break;

          case 'wait':
            await page.waitForSelector(interaction.selector, { 
              timeout: interaction.timeout || 5000 
            });
            break;
        }

        // インタラクション後のスクリーンショット
        if (interaction.type !== 'wait') {
          const screenshotPath = await this.takeScreenshot(page, `${config.name}_${interaction.type}_${interaction.selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
          screenshots.push(screenshotPath);
        }

      } catch (error) {
        if (!interaction.optional) {
          errors.push({
            id: `page_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'interaction',
            severity: 'medium',
            message: `Interaction failed: ${interaction.type} on ${interaction.selector} - ${error}`,
            element: interaction.selector,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  private async checkAccessibility(page: Page): Promise<AccessibilityResult[]> {
    try {
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });

      const axeResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore
          window.axe.run((err: any, results: any) => {
            if (err) throw err;
            resolve(results);
          });
        });
      });

      // @ts-ignore
      if (axeResults.violations && axeResults.violations.length > 0) {
        // @ts-ignore
        return axeResults.violations.map((violation: any) => ({
          type: violation.id,
          impact: violation.impact,
          element: violation.nodes?.[0]?.target?.[0] || 'unknown',
          message: violation.description
        }));
      }

      return [];
    } catch (error) {
      console.warn('Accessibility check failed:', error);
      return [];
    }
  }

  private async takeScreenshot(page: Page, name: string): Promise<string> {
    const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
    const filePath = path.join(this.reportDir, 'screenshots', fileName);
    
    await page.screenshot({
      path: filePath,
      fullPage: true
    });

    return fileName;
  }

  async runComprehensiveMonitoring(): Promise<ComprehensiveMonitorReport> {
    const startTime = new Date();
    console.log('🔍 包括的ページ監視を開始...');

    const pageResults: PageMonitorResult[] = [];
    let successfulPages = 0;
    let errorPages = 0;
    let warningPages = 0;

    // 優先度順でソート
    const sortedConfigs = [...this.pageConfigs].sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });

    for (const config of sortedConfigs) {
      try {
        const result = await this.monitorPage(config);
        pageResults.push(result);

        switch (result.status) {
          case 'success':
            successfulPages++;
            break;
          case 'error':
            errorPages++;
            break;
          case 'warning':
            warningPages++;
            break;
        }

      } catch (error) {
        console.error(`❌ ${config.name} のページ監視でエラー:`, error);
        errorPages++;
      }
    }

    const endTime = new Date();
    const totalErrors = pageResults.reduce((sum, result) => sum + result.errors.length, 0);
    const criticalErrors = pageResults.reduce((sum, result) => 
      sum + result.errors.filter(e => e.severity === 'critical').length, 0);

    const loadTimes = pageResults.map(r => r.loadTime).filter(t => t > 0);
    const averageLoadTime = loadTimes.length > 0 ? 
      loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0;

    const worstPerformingPage = pageResults
      .filter(r => r.loadTime > 0)
      .sort((a, b) => b.loadTime - a.loadTime)[0]?.pageConfig.name || 'N/A';

    const bestPerformingPage = pageResults
      .filter(r => r.loadTime > 0)
      .sort((a, b) => a.loadTime - b.loadTime)[0]?.pageConfig.name || 'N/A';

    const report: ComprehensiveMonitorReport = {
      sessionId: this.sessionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalPages: this.pageConfigs.length,
      successfulPages,
      errorPages,
      warningPages,
      pageResults,
      summary: {
        totalErrors,
        criticalErrors,
        averageLoadTime,
        worstPerformingPage,
        bestPerformingPage
      },
      recommendations: this.generateRecommendations(pageResults)
    };

    await this.saveReport(report);
    console.log('✅ 包括的ページ監視完了');

    return report;
  }

  private generateRecommendations(pageResults: PageMonitorResult[]): string[] {
    const recommendations: string[] = [];
    const errorPages = pageResults.filter(r => r.status === 'error');
    const slowPages = pageResults.filter(r => r.loadTime > 5000);
    const highErrorPages = pageResults.filter(r => r.errors.length > 5);

    if (errorPages.length > 0) {
      recommendations.push(`🔴 ${errorPages.length} ページでクリティカルエラーが検出されました - 即座の修復が必要です`);
    }

    if (slowPages.length > 0) {
      recommendations.push(`⏰ ${slowPages.length} ページでパフォーマンス問題が検出されました - 最適化を検討してください`);
    }

    if (highErrorPages.length > 0) {
      recommendations.push(`⚠️ ${highErrorPages.length} ページで多数のエラーが検出されました - コード品質の向上が必要です`);
    }

    const accessibilityIssues = pageResults.reduce((sum, r) => sum + r.accessibility.length, 0);
    if (accessibilityIssues > 0) {
      recommendations.push(`♿ ${accessibilityIssues} 件のアクセシビリティ問題が検出されました`);
    }

    recommendations.push('📊 定期的な包括監視により、システム全体の健全性を維持できます');
    recommendations.push('🧪 自動テストの拡充により、回帰を防止できます');
    recommendations.push('🔄 継続的監視により、問題の早期発見が可能です');

    return recommendations;
  }

  private async saveReport(report: ComprehensiveMonitorReport): Promise<void> {
    // JSON レポート保存
    const jsonPath = path.join(this.reportDir, `comprehensive-page-monitor-${this.sessionId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // HTML レポート生成
    await this.generateHTMLReport(report);

    console.log(`📊 包括的ページ監視レポート保存: ${jsonPath}`);
  }

  private async generateHTMLReport(report: ComprehensiveMonitorReport): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Page Monitor Report</title>
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
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .page-list {
            padding: 20px;
        }
        .page-item {
            background: #f8f9fa;
            margin: 10px 0;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #ddd;
        }
        .page-success { border-left-color: #28a745; background: #d4edda; }
        .page-warning { border-left-color: #ffc107; background: #fff3cd; }
        .page-error { border-left-color: #dc3545; background: #f8d7da; }
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .page-name {
            font-size: 1.2em;
            font-weight: bold;
        }
        .page-status {
            padding: 5px 10px;
            border-radius: 15px;
            color: white;
            font-size: 0.8em;
        }
        .section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .error-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .error-item {
            background: white;
            margin: 5px 0;
            padding: 10px;
            border-radius: 5px;
            border-left: 3px solid #dc3545;
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
            <h1>📊 Comprehensive Page Monitor Report</h1>
            <div class="subtitle">Session: ${report.sessionId}</div>
            <div class="subtitle">Generated: ${new Date(report.endTime).toLocaleString('ja-JP')}</div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.totalPages}</div>
                <div class="metric-label">Total Pages</div>
            </div>
            <div class="metric-card">
                <div class="metric-number success">${report.successfulPages}</div>
                <div class="metric-label">Successful</div>
            </div>
            <div class="metric-card">
                <div class="metric-number warning">${report.warningPages}</div>
                <div class="metric-label">Warning</div>
            </div>
            <div class="metric-card">
                <div class="metric-number error">${report.errorPages}</div>
                <div class="metric-label">Error</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${Math.round(report.summary.averageLoadTime)}ms</div>
                <div class="metric-label">Avg Load Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-number error">${report.summary.criticalErrors}</div>
                <div class="metric-label">Critical Errors</div>
            </div>
        </div>

        <div class="section">
            <h2>📋 Page Results</h2>
            <div class="page-list">
                ${report.pageResults.map(result => `
                    <div class="page-item page-${result.status}">
                        <div class="page-header">
                            <div class="page-name">${result.pageConfig.name}</div>
                            <div class="page-status" style="background-color: ${
                              result.status === 'success' ? '#28a745' : 
                              result.status === 'warning' ? '#ffc107' : '#dc3545'
                            }">${result.status.toUpperCase()}</div>
                        </div>
                        <div><strong>URL:</strong> ${result.pageConfig.url}</div>
                        <div><strong>Load Time:</strong> ${result.loadTime}ms</div>
                        <div><strong>Errors:</strong> ${result.errors.length}</div>
                        <div><strong>Accessibility Issues:</strong> ${result.accessibility.length}</div>
                        
                        ${result.errors.length > 0 ? `
                        <div style="margin-top: 10px;">
                            <strong>Errors:</strong>
                            <div class="error-list">
                                ${result.errors.slice(0, 3).map(error => `
                                    <div class="error-item">
                                        <strong>${error.severity.toUpperCase()}</strong> [${error.type}]: ${error.message}
                                    </div>
                                `).join('')}
                                ${result.errors.length > 3 ? `<div style="padding: 10px; text-align: center; color: #666;">... and ${result.errors.length - 3} more errors</div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => 
                    `<div class="recommendation-item">${rec}</div>`
                ).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📈 Summary</h2>
            <p><strong>Best Performing Page:</strong> ${report.summary.bestPerformingPage}</p>
            <p><strong>Worst Performing Page:</strong> ${report.summary.worstPerformingPage}</p>
            <p><strong>Total Monitoring Time:</strong> ${Math.round((new Date(report.endTime).getTime() - new Date(report.startTime).getTime()) / 1000)}s</p>
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(this.reportDir, `comprehensive-page-monitor-${this.sessionId}.html`);
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

export { ComprehensivePageMonitor, PageMonitorConfig, PageMonitorResult, ComprehensiveMonitorReport };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const monitor = new ComprehensivePageMonitor();
  
  const run = async () => {
    try {
      await monitor.initializeBrowser();
      const report = await monitor.runComprehensiveMonitoring();
      
      console.log('\n✅ Comprehensive Page Monitoring 完了');
      console.log(`📊 監視したページ数: ${report.totalPages}`);
      console.log(`✅ 成功: ${report.successfulPages}`);
      console.log(`⚠️ 警告: ${report.warningPages}`);
      console.log(`❌ エラー: ${report.errorPages}`);
      
    } catch (error) {
      console.error('❌ Comprehensive Page Monitoring 失敗:', error);
      process.exit(1);
    } finally {
      await monitor.cleanup();
    }
  };

  run();
}
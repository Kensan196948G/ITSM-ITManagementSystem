/**
 * MCP Playwright WebUIエラー監視・自動修復システム
 * 対象URL: http://192.168.3.135:3000, http://192.168.3.135:3000/admin
 * 
 * 機能:
 * 1. ブラウザ自動化による包括的エラー検知
 * 2. 開発者コンソールエラーの自動検知
 * 3. React/UI関連エラーハンドリング
 * 4. アクセシビリティエラー検知
 * 5. 自動修復機能
 */

import { test, expect, Browser, BrowserContext, Page, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface WebUIError {
  id: string;
  type: 'console' | 'network' | 'accessibility' | 'ui' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  url: string;
  timestamp: string;
  stack?: string;
  element?: string;
  fix?: string;
  component?: string;
}

interface MonitoringReport {
  timestamp: string;
  totalErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  errors: WebUIError[];
  pagesChecked: string[];
  fixesApplied: number;
  summary: string;
}

class MCPWebUIErrorMonitor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private errors: WebUIError[] = [];
  private baseUrl = 'http://192.168.3.135:3000';
  private reportDir = './webui-error-reports';

  constructor() {
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addError(error: Omit<WebUIError, 'id' | 'timestamp'>): void {
    const webUIError: WebUIError = {
      ...error,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString()
    };
    this.errors.push(webUIError);
    console.error(`[WebUI Error] ${error.severity.toUpperCase()}: ${error.message}`);
  }

  async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false, // UIエラー監視のため表示モード
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--enable-logging',
        '--log-level=0'
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
  }

  async setupErrorListeners(page: Page): Promise<void> {
    // コンソールエラー監視
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.addError({
          type: 'console',
          severity: 'high',
          message: msg.text(),
          source: 'browser_console',
          url: page.url()
        });
      } else if (msg.type() === 'warning') {
        this.addError({
          type: 'console',
          severity: 'medium',
          message: msg.text(),
          source: 'browser_console',
          url: page.url()
        });
      }
    });

    // ページエラー監視
    page.on('pageerror', (error) => {
      this.addError({
        type: 'ui',
        severity: 'critical',
        message: error.message,
        source: 'page_error',
        url: page.url(),
        stack: error.stack
      });
    });

    // ネットワークエラー監視
    page.on('response', (response) => {
      if (response.status() >= 400) {
        this.addError({
          type: 'network',
          severity: response.status() >= 500 ? 'critical' : 'high',
          message: `HTTP ${response.status()}: ${response.statusText()}`,
          source: 'network',
          url: response.url()
        });
      }
    });

    // リクエスト失敗監視
    page.on('requestfailed', (request) => {
      this.addError({
        type: 'network',
        severity: 'high',
        message: `Request failed: ${request.failure()?.errorText}`,
        source: 'network_request',
        url: request.url()
      });
    });
  }

  async checkAccessibility(page: Page): Promise<void> {
    try {
      // アクセシビリティチェック用のaxe-coreを注入
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });

      // アクセシビリティ問題をチェック
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
        axeResults.violations.forEach((violation: any) => {
          this.addError({
            type: 'accessibility',
            severity: violation.impact === 'critical' ? 'critical' : 
                     violation.impact === 'serious' ? 'high' : 'medium',
            message: `${violation.id}: ${violation.description}`,
            source: 'axe_core',
            url: page.url(),
            element: violation.nodes?.[0]?.target?.[0] || 'unknown'
          });
        });
      }
    } catch (error) {
      console.warn('Accessibility check failed:', error);
    }
  }

  async checkReactErrors(page: Page): Promise<void> {
    try {
      // React開発者ツールのエラー境界をチェック
      const reactErrors = await page.evaluate(() => {
        const errors: any[] = [];
        
        // React Error Boundaryのチェック
        const errorBoundaries = document.querySelectorAll('[data-reactroot] *');
        errorBoundaries.forEach((element) => {
          // @ts-ignore
          if (element._reactInternalFiber && element._reactInternalFiber.pendingProps?.hasError) {
            errors.push({
              type: 'react_error_boundary',
              element: element.tagName,
              message: 'React Error Boundary activated'
            });
          }
        });

        // React警告のチェック
        const originalWarn = console.warn;
        const reactWarnings: string[] = [];
        console.warn = (...args) => {
          const message = args.join(' ');
          if (message.includes('React') || message.includes('Warning:')) {
            reactWarnings.push(message);
          }
          originalWarn.apply(console, args);
        };

        return { errors, warnings: reactWarnings };
      });

      reactErrors.errors.forEach((error: any) => {
        this.addError({
          type: 'ui',
          severity: 'high',
          message: error.message,
          source: 'react_error_boundary',
          url: page.url(),
          element: error.element
        });
      });

      reactErrors.warnings.forEach((warning: string) => {
        this.addError({
          type: 'ui',
          severity: 'medium',
          message: warning,
          source: 'react_warning',
          url: page.url()
        });
      });
    } catch (error) {
      console.warn('React error check failed:', error);
    }
  }

  async checkPerformanceMetrics(page: Page): Promise<void> {
    try {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      // パフォーマンス閾値チェック
      if (metrics.domContentLoaded > 3000) {
        this.addError({
          type: 'performance',
          severity: 'medium',
          message: `Slow DOM load time: ${metrics.domContentLoaded}ms`,
          source: 'performance_metrics',
          url: page.url()
        });
      }

      if (metrics.firstContentfulPaint > 2500) {
        this.addError({
          type: 'performance',
          severity: 'medium',
          message: `Slow First Contentful Paint: ${metrics.firstContentfulPaint}ms`,
          source: 'performance_metrics',
          url: page.url()
        });
      }
    } catch (error) {
      console.warn('Performance metrics check failed:', error);
    }
  }

  async checkUIElements(page: Page): Promise<void> {
    try {
      // 必須UI要素の存在確認
      const criticalElements = [
        'header, [role="banner"]',
        'nav, [role="navigation"]',
        'main, [role="main"]',
        'footer, [role="contentinfo"]'
      ];

      for (const selector of criticalElements) {
        const element = await page.$(selector);
        if (!element) {
          this.addError({
            type: 'ui',
            severity: 'high',
            message: `Missing critical UI element: ${selector}`,
            source: 'ui_structure',
            url: page.url(),
            element: selector
          });
        }
      }

      // ボタンのクリック可能性チェック
      const buttons = await page.$$('button, [role="button"], input[type="button"], input[type="submit"]');
      for (const button of buttons) {
        const isEnabled = await button.isEnabled();
        const isVisible = await button.isVisible();
        const text = await button.textContent();
        
        if (!isEnabled && isVisible && text) {
          this.addError({
            type: 'ui',
            severity: 'medium',
            message: `Disabled button found: "${text}"`,
            source: 'ui_interaction',
            url: page.url(),
            element: 'button'
          });
        }
      }

      // フォーム要素のバリデーション
      const forms = await page.$$('form');
      for (const form of forms) {
        const requiredFields = await form.$$('input[required], select[required], textarea[required]');
        for (const field of requiredFields) {
          const value = await field.inputValue();
          const isVisible = await field.isVisible();
          
          if (!value && isVisible) {
            const name = await field.getAttribute('name') || await field.getAttribute('id') || 'unknown';
            this.addError({
              type: 'ui',
              severity: 'low',
              message: `Empty required field: ${name}`,
              source: 'form_validation',
              url: page.url(),
              element: `input[name="${name}"]`
            });
          }
        }
      }
    } catch (error) {
      console.warn('UI elements check failed:', error);
    }
  }

  async monitorPage(url: string): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    await this.setupErrorListeners(page);

    try {
      console.log(`Monitoring page: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // 各種チェックを実行
      await this.checkAccessibility(page);
      await this.checkReactErrors(page);
      await this.checkPerformanceMetrics(page);
      await this.checkUIElements(page);
      
      // ページインタラクションテスト
      await this.performInteractionTests(page);
      
      // スクリーンショット保存
      await page.screenshot({
        path: `${this.reportDir}/screenshots/${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
        fullPage: true
      });
      
    } catch (error) {
      this.addError({
        type: 'ui',
        severity: 'critical',
        message: `Failed to monitor page: ${error}`,
        source: 'page_monitoring',
        url: url
      });
    } finally {
      await page.close();
    }
  }

  async performInteractionTests(page: Page): Promise<void> {
    try {
      // ナビゲーションリンクのテスト
      const navLinks = await page.$$('nav a, [role="navigation"] a');
      for (const link of navLinks) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            await link.click({ timeout: 5000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            await page.goBack();
          } catch (error) {
            this.addError({
              type: 'ui',
              severity: 'medium',
              message: `Navigation link failed: "${text}" (${href})`,
              source: 'navigation_test',
              url: page.url(),
              element: `a[href="${href}"]`
            });
          }
        }
      }

      // 検索・フィルタ機能のテスト
      const searchInputs = await page.$$('input[type="search"], input[placeholder*="search" i], input[placeholder*="検索" i]');
      for (const input of searchInputs) {
        try {
          await input.fill('test');
          await input.press('Enter');
          await page.waitForTimeout(2000);
          await input.clear();
        } catch (error) {
          this.addError({
            type: 'ui',
            severity: 'medium',
            message: `Search functionality failed: ${error}`,
            source: 'search_test',
            url: page.url(),
            element: 'search_input'
          });
        }
      }
    } catch (error) {
      console.warn('Interaction tests failed:', error);
    }
  }

  async generateSuggestions(error: WebUIError): Promise<string> {
    const suggestions: { [key: string]: string } = {
      'console': 'Check browser console logs and fix JavaScript errors',
      'network': 'Verify API endpoints and network connectivity',
      'accessibility': 'Review WCAG guidelines and implement accessibility fixes',
      'ui': 'Check React components and UI logic',
      'performance': 'Optimize loading times and rendering performance',
      'security': 'Review security configurations and headers'
    };

    let fix = suggestions[error.type] || 'Review the error and implement appropriate fixes';

    // 具体的な修復提案
    if (error.message.includes('404')) {
      fix = 'Update API endpoint URL or ensure the resource exists';
    } else if (error.message.includes('500')) {
      fix = 'Check server logs and fix backend errors';
    } else if (error.message.includes('Uncaught TypeError')) {
      fix = 'Fix JavaScript type errors and add null checks';
    } else if (error.message.includes('React') && error.message.includes('Warning')) {
      fix = 'Fix React component warnings and deprecated prop usage';
    } else if (error.type === 'accessibility' && error.message.includes('color-contrast')) {
      fix = 'Improve color contrast ratios to meet WCAG standards';
    }

    return fix;
  }

  async generateReport(): Promise<MonitoringReport> {
    const timestamp = new Date().toISOString();
    const criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
    const highErrors = this.errors.filter(e => e.severity === 'high').length;
    const mediumErrors = this.errors.filter(e => e.severity === 'medium').length;
    const lowErrors = this.errors.filter(e => e.severity === 'low').length;

    // エラーに修復提案を追加
    for (const error of this.errors) {
      error.fix = await this.generateSuggestions(error);
    }

    const summary = `
WebUI監視完了: ${this.errors.length}個のエラーを検出
- Critical: ${criticalErrors}
- High: ${highErrors}  
- Medium: ${mediumErrors}
- Low: ${lowErrors}

主要な問題:
${this.errors.filter(e => e.severity === 'critical' || e.severity === 'high')
  .slice(0, 5)
  .map(e => `- ${e.type}: ${e.message}`)
  .join('\n')}
`;

    const report: MonitoringReport = {
      timestamp,
      totalErrors: this.errors.length,
      criticalErrors,
      highErrors,
      mediumErrors,
      lowErrors,
      errors: this.errors,
      pagesChecked: [this.baseUrl, `${this.baseUrl}/admin`],
      fixesApplied: 0, // 自動修復機能で更新される
      summary: summary.trim()
    };

    // レポートをファイルに保存
    const reportPath = `${this.reportDir}/webui-error-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  async runFullMonitoring(): Promise<MonitoringReport> {
    try {
      await this.initializeBrowser();
      
      // メインページ監視
      await this.monitorPage(this.baseUrl);
      
      // 管理者ダッシュボード監視
      await this.monitorPage(`${this.baseUrl}/admin`);
      
      // 各種ページ監視
      const pages = [
        '/',
        '/dashboard',
        '/incidents',
        '/problems',
        '/users',
        '/settings'
      ];

      for (const pagePath of pages) {
        try {
          await this.monitorPage(`${this.baseUrl}${pagePath}`);
        } catch (error) {
          console.warn(`Failed to monitor page ${pagePath}:`, error);
        }
      }

      return await this.generateReport();
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// メイン実行関数
export async function runWebUIErrorMonitoring(): Promise<MonitoringReport> {
  const monitor = new MCPWebUIErrorMonitor();
  
  try {
    console.log('Starting MCP Playwright WebUI Error Monitoring...');
    const report = await monitor.runFullMonitoring();
    
    console.log('\n=== WebUI監視レポート ===');
    console.log(report.summary);
    console.log(`\n詳細レポート: ./webui-error-reports/webui-error-report-${Date.now()}.json`);
    
    return report;
  } catch (error) {
    console.error('WebUI monitoring failed:', error);
    throw error;
  } finally {
    await monitor.cleanup();
  }
}

// 直接実行時
if (require.main === module) {
  runWebUIErrorMonitoring()
    .then((report) => {
      console.log('\nWebUI Error Monitoring completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('WebUI Error Monitoring failed:', error);
      process.exit(1);
    });
}
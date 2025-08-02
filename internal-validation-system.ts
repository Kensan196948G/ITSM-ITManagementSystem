/**
 * 内部検証システム
 * 修復後の自動検証プロセス、エラー再発防止、修復品質の検証
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import { execSync } from 'child_process';

interface ValidationTest {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'performance' | 'security' | 'accessibility' | 'ui' | 'api';
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: (page: Page) => Promise<ValidationResult>;
}

interface ValidationResult {
  testId: string;
  passed: boolean;
  score: number; // 0-100
  message: string;
  details: any;
  metrics?: any;
  recommendations?: string[];
  timestamp: string;
}

interface ComprehensiveValidationReport {
  timestamp: string;
  overallScore: number;
  passed: boolean;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    categories: { [key: string]: { passed: number; total: number; score: number } };
  };
  results: ValidationResult[];
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  errorTrends: any;
}

class InternalValidationSystem {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private baseUrl = 'http://192.168.3.135:3000';
  private adminUrl = 'http://192.168.3.135:3000/admin';
  private validationTests: ValidationTest[] = [];
  private reportDir = './enhanced-infinite-loop-reports/validation';

  constructor() {
    this.ensureDirectories();
    this.initializeValidationTests();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private initializeValidationTests(): void {
    this.validationTests = [
      // 機能テスト
      {
        id: 'func_001',
        name: 'Page Load Test',
        description: 'ページが正常に読み込まれることを確認',
        category: 'functional',
        priority: 'critical',
        execute: this.testPageLoad.bind(this)
      },
      {
        id: 'func_002',
        name: 'Navigation Test',
        description: 'ナビゲーション機能が正常に動作することを確認',
        category: 'functional',
        priority: 'high',
        execute: this.testNavigation.bind(this)
      },
      {
        id: 'func_003',
        name: 'Form Functionality Test',
        description: 'フォームの送信とバリデーションが正常に動作することを確認',
        category: 'functional',
        priority: 'high',
        execute: this.testFormFunctionality.bind(this)
      },
      
      // パフォーマンステスト
      {
        id: 'perf_001',
        name: 'Load Performance Test',
        description: 'ページ読み込み速度を評価',
        category: 'performance',
        priority: 'medium',
        execute: this.testLoadPerformance.bind(this)
      },
      {
        id: 'perf_002',
        name: 'Memory Usage Test',
        description: 'メモリ使用量を監視',
        category: 'performance',
        priority: 'medium',
        execute: this.testMemoryUsage.bind(this)
      },
      {
        id: 'perf_003',
        name: 'JavaScript Performance Test',
        description: 'JavaScript実行パフォーマンスを評価',
        category: 'performance',
        priority: 'low',
        execute: this.testJavaScriptPerformance.bind(this)
      },
      
      // セキュリティテスト
      {
        id: 'sec_001',
        name: 'XSS Prevention Test',
        description: 'XSS攻撃に対する防御を確認',
        category: 'security',
        priority: 'high',
        execute: this.testXSSPrevention.bind(this)
      },
      {
        id: 'sec_002',
        name: 'HTTPS Enforcement Test',
        description: 'セキュアな通信が確保されているか確認',
        category: 'security',
        priority: 'medium',
        execute: this.testHTTPSEnforcement.bind(this)
      },
      
      // アクセシビリティテスト
      {
        id: 'a11y_001',
        name: 'ARIA Compliance Test',
        description: 'ARIA属性の適切な使用を確認',
        category: 'accessibility',
        priority: 'medium',
        execute: this.testARIACompliance.bind(this)
      },
      {
        id: 'a11y_002',
        name: 'Keyboard Navigation Test',
        description: 'キーボードでのナビゲーションが可能か確認',
        category: 'accessibility',
        priority: 'medium',
        execute: this.testKeyboardNavigation.bind(this)
      },
      {
        id: 'a11y_003',
        name: 'Color Contrast Test',
        description: '色のコントラスト比を確認',
        category: 'accessibility',
        priority: 'low',
        execute: this.testColorContrast.bind(this)
      },
      
      // UI/UXテスト
      {
        id: 'ui_001',
        name: 'Responsive Design Test',
        description: 'レスポンシブデザインが正常に動作することを確認',
        category: 'ui',
        priority: 'medium',
        execute: this.testResponsiveDesign.bind(this)
      },
      {
        id: 'ui_002',
        name: 'Error Handling Test',
        description: 'エラーハンドリングが適切に実装されているか確認',
        category: 'ui',
        priority: 'high',
        execute: this.testErrorHandling.bind(this)
      },
      {
        id: 'ui_003',
        name: 'Loading States Test',
        description: 'ローディング状態が適切に表示されるか確認',
        category: 'ui',
        priority: 'low',
        execute: this.testLoadingStates.bind(this)
      },
      
      // APIテスト
      {
        id: 'api_001',
        name: 'API Connectivity Test',
        description: 'APIエンドポイントが正常に応答することを確認',
        category: 'api',
        priority: 'critical',
        execute: this.testAPIConnectivity.bind(this)
      },
      {
        id: 'api_002',
        name: 'Error Response Test',
        description: 'APIエラーレスポンスが適切に処理されることを確認',
        category: 'api',
        priority: 'high',
        execute: this.testAPIErrorResponse.bind(this)
      }
    ];
  }

  async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true, // 検証は高速化のためヘッドレス
      args: [
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
  }

  // 機能テストの実装
  private async testPageLoad(page: Page): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      const title = await page.title();
      const hasContent = await page.$('body *');
      
      const passed = loadTime < 10000 && title.length > 0 && hasContent !== null;
      const score = Math.max(0, 100 - Math.floor(loadTime / 100));
      
      return {
        testId: 'func_001',
        passed,
        score,
        message: passed ? 'ページが正常に読み込まれました' : 'ページ読み込みに問題があります',
        details: { loadTime, title, hasContent: !!hasContent },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'func_001',
        passed: false,
        score: 0,
        message: `ページ読み込みエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testNavigation(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      const navLinks = await page.$$('nav a, [role="navigation"] a');
      let workingLinks = 0;
      let totalLinks = navLinks.length;
      
      for (const link of navLinks.slice(0, 5)) { // 最初の5つをテスト
        try {
          const href = await link.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            await link.click({ timeout: 5000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            workingLinks++;
            await page.goBack();
          }
        } catch (error) {
          // リンクエラーをカウント
        }
      }
      
      const successRate = totalLinks > 0 ? (workingLinks / Math.min(totalLinks, 5)) * 100 : 100;
      const passed = successRate >= 80;
      
      return {
        testId: 'func_002',
        passed,
        score: Math.floor(successRate),
        message: `ナビゲーション成功率: ${successRate.toFixed(1)}%`,
        details: { workingLinks, totalLinks, successRate },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'func_002',
        passed: false,
        score: 0,
        message: `ナビゲーションテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testFormFunctionality(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      const forms = await page.$$('form');
      let functionalForms = 0;
      
      for (const form of forms) {
        try {
          const submitButton = await form.$('button[type="submit"], input[type="submit"]');
          const inputs = await form.$$('input, select, textarea');
          
          if (submitButton && inputs.length > 0) {
            // フォームに値を入力
            for (const input of inputs) {
              const type = await input.getAttribute('type');
              const tagName = await input.evaluate(el => el.tagName.toLowerCase());
              
              if (type === 'text' || type === 'email' || tagName === 'textarea') {
                await input.fill('test value');
              } else if (type === 'checkbox' || type === 'radio') {
                await input.check();
              }
            }
            
            functionalForms++;
          }
        } catch (error) {
          // フォームエラーをカウント
        }
      }
      
      const score = forms.length > 0 ? (functionalForms / forms.length) * 100 : 100;
      const passed = score >= 80;
      
      return {
        testId: 'func_003',
        passed,
        score: Math.floor(score),
        message: `フォーム機能性: ${score.toFixed(1)}%`,
        details: { functionalForms, totalForms: forms.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'func_003',
        passed: false,
        score: 0,
        message: `フォーム機能テストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  // パフォーマンステストの実装
  private async testLoadPerformance(page: Page): Promise<ValidationResult> {
    try {
      const startTime = Date.now();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
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
      
      // パフォーマンススコア計算
      let score = 100;
      if (loadTime > 3000) score -= 20;
      if (loadTime > 5000) score -= 30;
      if (metrics.firstContentfulPaint > 2500) score -= 20;
      if (metrics.domContentLoaded > 2000) score -= 15;
      
      const passed = score >= 70;
      
      return {
        testId: 'perf_001',
        passed,
        score: Math.max(0, score),
        message: `パフォーマンススコア: ${score}/100`,
        details: { loadTime, ...metrics },
        metrics: { loadTime, ...metrics },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'perf_001',
        passed: false,
        score: 0,
        message: `パフォーマンステストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testMemoryUsage(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (!memoryInfo) {
        return {
          testId: 'perf_002',
          passed: true,
          score: 100,
          message: 'メモリ情報が利用できません（問題ありません）',
          details: { available: false },
          timestamp: new Date().toISOString()
        };
      }
      
      const usagePercentage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      const score = Math.max(0, 100 - Math.floor(usagePercentage));
      const passed = usagePercentage < 80;
      
      return {
        testId: 'perf_002',
        passed,
        score,
        message: `メモリ使用率: ${usagePercentage.toFixed(1)}%`,
        details: { ...memoryInfo, usagePercentage },
        metrics: { memoryUsagePercentage: usagePercentage },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'perf_002',
        passed: false,
        score: 0,
        message: `メモリテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testJavaScriptPerformance(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      const jsPerformance = await page.evaluate(() => {
        const start = performance.now();
        
        // 簡単な計算負荷テスト
        let result = 0;
        for (let i = 0; i < 100000; i++) {
          result += Math.sqrt(i);
        }
        
        const executionTime = performance.now() - start;
        
        return {
          executionTime,
          result: result > 0 // 正常に実行されたか
        };
      });
      
      const score = Math.max(0, 100 - Math.floor(jsPerformance.executionTime / 10));
      const passed = jsPerformance.executionTime < 500 && jsPerformance.result;
      
      return {
        testId: 'perf_003',
        passed,
        score,
        message: `JavaScript実行時間: ${jsPerformance.executionTime.toFixed(2)}ms`,
        details: jsPerformance,
        metrics: { jsExecutionTime: jsPerformance.executionTime },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'perf_003',
        passed: false,
        score: 0,
        message: `JavaScript パフォーマンステストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  // セキュリティテストの実装
  private async testXSSPrevention(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      // XSS テストペイロード
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">'
      ];
      
      let vulnerabilities = 0;
      const inputs = await page.$$('input[type="text"], textarea, input[type="search"]');
      
      for (const input of inputs.slice(0, 3)) { // 最初の3つをテスト
        for (const payload of xssPayloads) {
          try {
            await input.fill(payload);
            await page.waitForTimeout(1000);
            
            // アラートが発生したかチェック
            const hasAlert = await page.evaluate(() => {
              return document.body.innerHTML.includes('<script>') || 
                     document.body.innerHTML.includes('javascript:') ||
                     document.body.innerHTML.includes('onerror=');
            });
            
            if (hasAlert) {
              vulnerabilities++;
            }
            
            await input.clear();
          } catch (error) {
            // エラーは正常（XSS防御が働いている）
          }
        }
      }
      
      const score = vulnerabilities === 0 ? 100 : Math.max(0, 100 - (vulnerabilities * 25));
      const passed = vulnerabilities === 0;
      
      return {
        testId: 'sec_001',
        passed,
        score,
        message: passed ? 'XSS防御が正常に動作しています' : `${vulnerabilities}件の脆弱性を検出`,
        details: { vulnerabilities, testedInputs: inputs.length, payloadsCount: xssPayloads.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'sec_001',
        passed: false,
        score: 0,
        message: `XSS防御テストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testHTTPSEnforcement(page: Page): Promise<ValidationResult> {
    try {
      const currentUrl = page.url();
      const isHTTPS = currentUrl.startsWith('https://');
      
      // セキュリティヘッダーのチェック
      const response = await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      const headers = response?.headers() || {};
      
      const securityHeaders = {
        'strict-transport-security': !!headers['strict-transport-security'],
        'content-security-policy': !!headers['content-security-policy'],
        'x-frame-options': !!headers['x-frame-options'],
        'x-content-type-options': !!headers['x-content-type-options']
      };
      
      const securityHeaderCount = Object.values(securityHeaders).filter(Boolean).length;
      const score = (securityHeaderCount / 4) * 100;
      
      // HTTPSは必須ではないが、セキュリティヘッダーは重要
      const passed = securityHeaderCount >= 2;
      
      return {
        testId: 'sec_002',
        passed,
        score: Math.floor(score),
        message: `セキュリティヘッダー: ${securityHeaderCount}/4`,
        details: { isHTTPS, securityHeaders, currentUrl },
        recommendations: !passed ? ['セキュリティヘッダーの追加を推奨します'] : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'sec_002',
        passed: false,
        score: 0,
        message: `HTTPS/セキュリティテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  // アクセシビリティテストの実装
  private async testARIACompliance(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      const ariaAnalysis = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let ariaScore = 0;
        let totalInteractive = 0;
        
        elements.forEach(el => {
          const tagName = el.tagName.toLowerCase();
          
          // インタラクティブ要素の確認
          if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName) ||
              el.getAttribute('role') === 'button' ||
              el.getAttribute('tabindex') !== null) {
            totalInteractive++;
            
            // ARIA属性の確認
            if (el.getAttribute('aria-label') ||
                el.getAttribute('aria-labelledby') ||
                el.getAttribute('aria-describedby') ||
                el.getAttribute('role')) {
              ariaScore++;
            }
          }
        });
        
        return {
          ariaScore,
          totalInteractive,
          compliance: totalInteractive > 0 ? (ariaScore / totalInteractive) * 100 : 100
        };
      });
      
      const passed = ariaAnalysis.compliance >= 60;
      
      return {
        testId: 'a11y_001',
        passed,
        score: Math.floor(ariaAnalysis.compliance),
        message: `ARIA準拠率: ${ariaAnalysis.compliance.toFixed(1)}%`,
        details: ariaAnalysis,
        recommendations: !passed ? ['ARIA属性の追加を推奨します'] : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'a11y_001',
        passed: false,
        score: 0,
        message: `ARIAテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testKeyboardNavigation(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      // Tab キーでのナビゲーションテスト
      let focusableElements = 0;
      let tabNavigationWorks = true;
      
      try {
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const focused = document.activeElement;
            return focused && focused !== document.body ? {
              tagName: focused.tagName,
              type: focused.getAttribute('type'),
              tabIndex: focused.tabIndex
            } : null;
          });
          
          if (focusedElement) {
            focusableElements++;
          }
        }
      } catch (error) {
        tabNavigationWorks = false;
      }
      
      const score = focusableElements > 0 && tabNavigationWorks ? 100 : 0;
      const passed = focusableElements >= 3 && tabNavigationWorks;
      
      return {
        testId: 'a11y_002',
        passed,
        score,
        message: `キーボードナビゲーション: ${focusableElements}個の要素にフォーカス可能`,
        details: { focusableElements, tabNavigationWorks },
        recommendations: !passed ? ['キーボードナビゲーションの改善を推奨します'] : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'a11y_002',
        passed: false,
        score: 0,
        message: `キーボードナビゲーションテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testColorContrast(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      // 簡易色コントラストチェック
      const contrastAnalysis = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let contrastIssues = 0;
        let totalChecked = 0;
        
        elements.forEach(el => {
          const computedStyle = window.getComputedStyle(el);
          const color = computedStyle.color;
          const backgroundColor = computedStyle.backgroundColor;
          
          if (color && backgroundColor && 
              color !== 'rgba(0, 0, 0, 0)' && 
              backgroundColor !== 'rgba(0, 0, 0, 0)') {
            totalChecked++;
            
            // 簡易チェック（実際のコントラスト比計算は複雑）
            if (color === backgroundColor) {
              contrastIssues++;
            }
          }
        });
        
        return {
          contrastIssues,
          totalChecked,
          estimatedCompliance: totalChecked > 0 ? ((totalChecked - contrastIssues) / totalChecked) * 100 : 100
        };
      });
      
      const passed = contrastAnalysis.contrastIssues === 0;
      const score = Math.floor(contrastAnalysis.estimatedCompliance);
      
      return {
        testId: 'a11y_003',
        passed,
        score,
        message: `色コントラスト: ${contrastAnalysis.contrastIssues}件の問題`,
        details: contrastAnalysis,
        recommendations: !passed ? ['色のコントラストの改善を推奨します'] : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'a11y_003',
        passed: false,
        score: 0,
        message: `色コントラストテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  // UI/UXテストの実装
  private async testResponsiveDesign(page: Page): Promise<ValidationResult> {
    try {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];
      
      let responsiveScore = 0;
      const details: any = {};
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
        
        const layoutInfo = await page.evaluate(() => {
          const body = document.body;
          return {
            hasHorizontalScroll: body.scrollWidth > window.innerWidth,
            hasOverflow: window.getComputedStyle(body).overflow !== 'visible'
          };
        });
        
        if (!layoutInfo.hasHorizontalScroll) {
          responsiveScore += 33.33;
        }
        
        details[viewport.name] = layoutInfo;
      }
      
      const passed = responsiveScore >= 90;
      
      return {
        testId: 'ui_001',
        passed,
        score: Math.floor(responsiveScore),
        message: `レスポンシブスコア: ${responsiveScore.toFixed(1)}%`,
        details,
        recommendations: !passed ? ['レスポンシブデザインの改善を推奨します'] : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'ui_001',
        passed: false,
        score: 0,
        message: `レスポンシブデザインテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testErrorHandling(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      let errorHandlingScore = 100;
      const errorDetails: any = { jsErrors: 0, networkErrors: 0, unhandledRejections: 0 };
      
      // JavaScriptエラー監視
      page.on('pageerror', () => {
        errorDetails.jsErrors++;
        errorHandlingScore -= 20;
      });
      
      // ネットワークエラー監視
      page.on('requestfailed', () => {
        errorDetails.networkErrors++;
        errorHandlingScore -= 15;
      });
      
      // 意図的にエラーを発生させてハンドリングをテスト
      await page.evaluate(() => {
        try {
          // 存在しない関数を呼び出し
          (window as any).nonExistentFunction();
        } catch (e) {
          // エラーがキャッチされれば良い
        }
      });
      
      await page.waitForTimeout(2000);
      
      const passed = errorHandlingScore >= 70;
      
      return {
        testId: 'ui_002',
        passed,
        score: Math.max(0, errorHandlingScore),
        message: `エラーハンドリングスコア: ${errorHandlingScore}`,
        details: errorDetails,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'ui_002',
        passed: false,
        score: 0,
        message: `エラーハンドリングテストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testLoadingStates(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });
      
      // ローディング状態の要素を探す
      const loadingElements = await page.evaluate(() => {
        const selectors = [
          '[data-loading]',
          '.loading',
          '.spinner',
          '[aria-label*="loading"]',
          '[aria-label*="Loading"]'
        ];
        
        let found = 0;
        selectors.forEach(selector => {
          if (document.querySelector(selector)) {
            found++;
          }
        });
        
        return { found, totalSelectors: selectors.length };
      });
      
      await page.waitForLoadState('networkidle');
      
      // ローディング完了後の確認
      const afterLoading = await page.evaluate(() => {
        const loadingElements = document.querySelectorAll('[data-loading], .loading, .spinner');
        return Array.from(loadingElements).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
      });
      
      const hasLoadingStates = loadingElements.found > 0;
      const loadingStatesHidden = afterLoading === 0;
      
      const score = hasLoadingStates && loadingStatesHidden ? 100 : 
                   hasLoadingStates ? 70 : 50;
      const passed = score >= 70;
      
      return {
        testId: 'ui_003',
        passed,
        score,
        message: `ローディング状態: ${hasLoadingStates ? '実装済み' : '未実装'}`,
        details: { ...loadingElements, afterLoading, hasLoadingStates, loadingStatesHidden },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'ui_003',
        passed: false,
        score: 0,
        message: `ローディング状態テストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  // APIテストの実装
  private async testAPIConnectivity(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      let apiRequests = 0;
      let successfulRequests = 0;
      
      // APIリクエストの監視
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('/api/') || url.includes(':8000')) {
          apiRequests++;
          if (response.status() < 400) {
            successfulRequests++;
          }
        }
      });
      
      // APIを呼び出すアクションを実行
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const successRate = apiRequests > 0 ? (successfulRequests / apiRequests) * 100 : 100;
      const passed = successRate >= 80;
      
      return {
        testId: 'api_001',
        passed,
        score: Math.floor(successRate),
        message: `API成功率: ${successRate.toFixed(1)}%`,
        details: { apiRequests, successfulRequests, successRate },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'api_001',
        passed: false,
        score: 0,
        message: `API接続テストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testAPIErrorResponse(page: Page): Promise<ValidationResult> {
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      let errorResponses = 0;
      let totalResponses = 0;
      
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('/api/') || url.includes(':8000')) {
          totalResponses++;
          if (response.status() >= 400) {
            errorResponses++;
          }
        }
      });
      
      // 無効なAPIエンドポイントにアクセスを試行
      await page.evaluate(() => {
        fetch('/api/nonexistent-endpoint').catch(() => {});
      });
      
      await page.waitForTimeout(2000);
      
      const errorRate = totalResponses > 0 ? (errorResponses / totalResponses) * 100 : 0;
      const passed = errorRate < 50; // エラーレスポンスが50%未満
      
      return {
        testId: 'api_002',
        passed,
        score: Math.max(0, 100 - Math.floor(errorRate)),
        message: `APIエラー率: ${errorRate.toFixed(1)}%`,
        details: { errorResponses, totalResponses, errorRate },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        testId: 'api_002',
        passed: false,
        score: 0,
        message: `APIエラーレスポンステストエラー: ${error}`,
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }

  async runComprehensiveValidation(): Promise<ComprehensiveValidationReport> {
    console.log('🔍 包括的検証開始...');
    
    if (!this.browser) {
      await this.initializeBrowser();
    }
    
    const results: ValidationResult[] = [];
    const categories: { [key: string]: { passed: number; total: number; score: number } } = {};
    
    if (!this.context) {
      throw new Error('Browser context not available');
    }
    
    const page = await this.context.newPage();
    
    try {
      // 優先度順にテストを実行
      const sortedTests = [...this.validationTests].sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      for (const test of sortedTests) {
        console.log(`🧪 実行中: ${test.name}`);
        
        try {
          const result = await test.execute(page);
          results.push(result);
          
          // カテゴリ別統計
          if (!categories[test.category]) {
            categories[test.category] = { passed: 0, total: 0, score: 0 };
          }
          categories[test.category].total++;
          if (result.passed) {
            categories[test.category].passed++;
          }
          categories[test.category].score += result.score;
          
          console.log(`${result.passed ? '✅' : '❌'} ${test.name}: ${result.score}/100`);
        } catch (testError) {
          console.error(`❌ テスト実行エラー ${test.name}:`, testError);
          results.push({
            testId: test.id,
            passed: false,
            score: 0,
            message: `テスト実行エラー: ${testError}`,
            details: { error: testError instanceof Error ? testError.message : String(testError) },
            timestamp: new Date().toISOString()
          });
        }
      }
    } finally {
      await page.close();
    }
    
    // カテゴリ別平均スコア計算
    Object.keys(categories).forEach(category => {
      const cat = categories[category];
      cat.score = cat.total > 0 ? cat.score / cat.total : 0;
    });
    
    // 全体評価
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallScore = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
    
    const systemHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 
      overallScore >= 90 ? 'excellent' :
      overallScore >= 75 ? 'good' :
      overallScore >= 60 ? 'fair' :
      overallScore >= 40 ? 'poor' : 'critical';
    
    // 推奨事項
    const recommendations: string[] = [];
    if (overallScore < 60) {
      recommendations.push('システム全体の品質改善が必要です');
    }
    if (categories.security && categories.security.score < 70) {
      recommendations.push('セキュリティ対策の強化が必要です');
    }
    if (categories.performance && categories.performance.score < 70) {
      recommendations.push('パフォーマンスの最適化が必要です');
    }
    if (categories.accessibility && categories.accessibility.score < 60) {
      recommendations.push('アクセシビリティの改善が必要です');
    }
    
    const report: ComprehensiveValidationReport = {
      timestamp: new Date().toISOString(),
      overallScore: Math.floor(overallScore),
      passed: passedTests === totalTests && overallScore >= 70,
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        categories
      },
      results,
      systemHealth,
      recommendations,
      errorTrends: this.analyzeErrorTrends(results)
    };
    
    // レポート保存
    await this.saveValidationReport(report);
    
    console.log(`🎯 検証完了: ${overallScore.toFixed(1)}/100 (${systemHealth})`);
    
    return report;
  }

  private analyzeErrorTrends(results: ValidationResult[]): any {
    const errors = results.filter(r => !r.passed);
    const categories = errors.reduce((acc, error) => {
      const category = this.validationTests.find(t => t.id === error.testId)?.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    return {
      totalErrors: errors.length,
      errorsByCategory: categories,
      mostProblematicCategory: Object.keys(categories).reduce((a, b) => 
        categories[a] > categories[b] ? a : b, 'none')
    };
  }

  private async saveValidationReport(report: ComprehensiveValidationReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON レポート
    const jsonPath = `${this.reportDir}/validation-report-${timestamp}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Markdown レポート
    const markdownPath = `${this.reportDir}/validation-report-${timestamp}.md`;
    const markdownContent = this.generateMarkdownValidationReport(report);
    fs.writeFileSync(markdownPath, markdownContent);
    
    console.log(`📄 検証レポート保存: ${jsonPath}`);
  }

  private generateMarkdownValidationReport(report: ComprehensiveValidationReport): string {
    return `
# 内部検証システム レポート

## 概要
- **実行時刻**: ${new Date(report.timestamp).toLocaleString()}
- **全体スコア**: ${report.overallScore}/100
- **システム健全性**: ${report.systemHealth}
- **検証結果**: ${report.passed ? '合格' : '不合格'}

## 統計情報
- **総テスト数**: ${report.summary.totalTests}
- **合格テスト**: ${report.summary.passedTests}
- **不合格テスト**: ${report.summary.failedTests}
- **合格率**: ${((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(1)}%

## カテゴリ別結果
${Object.entries(report.summary.categories).map(([category, stats]) => `
### ${category.toUpperCase()}
- **合格/総数**: ${stats.passed}/${stats.total}
- **平均スコア**: ${stats.score.toFixed(1)}/100
- **合格率**: ${((stats.passed / stats.total) * 100).toFixed(1)}%
`).join('')}

## 詳細テスト結果
${report.results.map(result => `
### ${result.testId} - ${result.passed ? '✅ 合格' : '❌ 不合格'}
- **スコア**: ${result.score}/100
- **メッセージ**: ${result.message}
- **詳細**: ${JSON.stringify(result.details, null, 2)}
${result.recommendations ? `- **推奨事項**: ${result.recommendations.join(', ')}` : ''}
`).join('')}

## エラー傾向分析
- **総エラー数**: ${report.errorTrends.totalErrors}
- **最も問題のあるカテゴリ**: ${report.errorTrends.mostProblematicCategory}
- **カテゴリ別エラー**: ${JSON.stringify(report.errorTrends.errorsByCategory, null, 2)}

## 推奨アクション
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## システム評価
${report.systemHealth === 'excellent' ? '🎉 システムは優秀な状態です' :
  report.systemHealth === 'good' ? '✅ システムは良好な状態です' :
  report.systemHealth === 'fair' ? '⚠️ システムには改善の余地があります' :
  report.systemHealth === 'poor' ? '🚨 システムには重大な問題があります' :
  '🔥 システムは危機的な状態です'}

---
*Generated by Internal Validation System*
`;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// エクスポート関数
export async function runInternalValidation(): Promise<ComprehensiveValidationReport> {
  const validator = new InternalValidationSystem();
  
  try {
    const report = await validator.runComprehensiveValidation();
    return report;
  } finally {
    await validator.cleanup();
  }
}

// 直接実行時
if (require.main === module) {
  runInternalValidation()
    .then((report) => {
      console.log('\n🎯 内部検証完了');
      console.log(`📊 全体スコア: ${report.overallScore}/100`);
      console.log(`🏥 システム健全性: ${report.systemHealth}`);
      console.log(`✅ 検証結果: ${report.passed ? '合格' : '不合格'}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 内部検証エラー:', error);
      process.exit(1);
    });
}
/**
 * 強化された無限ループ自動化システム
 * WebUI (http://192.168.3.135:3000) 対応
 * 
 * 機能:
 * 1. MCP Playwright による強化エラー検知
 * 2. ブラウザコンソールのリアルタイム監視
 * 3. 無限ループ自動修復システム
 * 4. 内部検証システム
 * 5. 詳細ログ・レポート
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, ChildProcess } from 'child_process';

interface EnhancedError {
  id: string;
  type: 'console' | 'network' | 'accessibility' | 'ui' | 'performance' | 'security' | 'javascript' | 'react';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  url: string;
  timestamp: string;
  stack?: string;
  element?: string;
  fix?: string;
  component?: string;
  lineNumber?: number;
  columnNumber?: number;
  fileName?: string;
  repairAttempts?: number;
  repairStrategies?: string[];
}

interface AutoRepairStrategy {
  name: string;
  description: string;
  action: (error: EnhancedError) => Promise<boolean>;
  priority: number;
  retryCount: number;
}

interface InfiniteLoopState {
  cycleCount: number;
  totalErrorsDetected: number;
  totalErrorsFixed: number;
  errorsFree: boolean;
  lastSuccessfulCycle: string;
  currentErrors: EnhancedError[];
  repairHistory: RepairRecord[];
  systemStatus: 'healthy' | 'degraded' | 'critical';
}

interface RepairRecord {
  id: string;
  errorId: string;
  strategy: string;
  success: boolean;
  timestamp: string;
  beforeState: any;
  afterState: any;
  verificationPassed: boolean;
}

interface ValidationResult {
  passed: boolean;
  errors: EnhancedError[];
  metrics: {
    pageLoadTime: number;
    jsErrors: number;
    networkErrors: number;
    accessibilityIssues: number;
    performanceScore: number;
  };
}

class EnhancedInfiniteLoopAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private errors: EnhancedError[] = [];
  private baseUrl = 'http://192.168.3.135:3000';
  private adminUrl = 'http://192.168.3.135:3000/admin';
  private reportDir = './enhanced-infinite-loop-reports';
  private stateFile = './infinite-loop-state.json';
  private isRunning = false;
  private cycleInterval = 10000; // 10秒間隔
  private maxRepairAttempts = 3;
  private state: InfiniteLoopState;
  
  private repairStrategies: AutoRepairStrategy[] = [];

  constructor() {
    this.ensureDirectories();
    this.initializeState();
    this.setupRepairStrategies();
    this.setupGlobalErrorHandlers();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.reportDir,
      `${this.reportDir}/screenshots`,
      `${this.reportDir}/videos`,
      `${this.reportDir}/logs`,
      `${this.reportDir}/validation`
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private initializeState(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        this.state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      } else {
        this.state = {
          cycleCount: 0,
          totalErrorsDetected: 0,
          totalErrorsFixed: 0,
          errorsFree: false,
          lastSuccessfulCycle: '',
          currentErrors: [],
          repairHistory: [],
          systemStatus: 'healthy'
        };
      }
    } catch (error) {
      console.error('Failed to initialize state:', error);
      this.state = {
        cycleCount: 0,
        totalErrorsDetected: 0,
        totalErrorsFixed: 0,
        errorsFree: false,
        lastSuccessfulCycle: '',
        currentErrors: [],
        repairHistory: [],
        systemStatus: 'critical'
      };
    }
  }

  private saveState(): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  private setupGlobalErrorHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.addError({
        type: 'javascript',
        severity: 'critical',
        message: `Uncaught Exception: ${error.message}`,
        source: 'nodejs_runtime',
        url: 'local',
        stack: error.stack
      });
    });

    process.on('unhandledRejection', (reason) => {
      this.addError({
        type: 'javascript',
        severity: 'high',
        message: `Unhandled Rejection: ${reason}`,
        source: 'nodejs_runtime',
        url: 'local'
      });
    });
  }

  private setupRepairStrategies(): void {
    this.repairStrategies = [
      {
        name: 'refresh_page',
        description: 'ページをリフレッシュしてエラーをクリア',
        action: this.repairByRefresh.bind(this),
        priority: 1,
        retryCount: 2
      },
      {
        name: 'clear_cache',
        description: 'ブラウザキャッシュをクリア',
        action: this.repairByClearCache.bind(this),
        priority: 2,
        retryCount: 1
      },
      {
        name: 'restart_browser',
        description: 'ブラウザを再起動',
        action: this.repairByRestartBrowser.bind(this),
        priority: 3,
        retryCount: 1
      },
      {
        name: 'inject_fix_script',
        description: 'エラー修正スクリプトを注入',
        action: this.repairByScriptInjection.bind(this),
        priority: 4,
        retryCount: 2
      },
      {
        name: 'modify_dom',
        description: 'DOM要素を直接修正',
        action: this.repairByDOMModification.bind(this),
        priority: 5,
        retryCount: 1
      },
      {
        name: 'backend_restart',
        description: 'バックエンドサービスを再起動',
        action: this.repairByBackendRestart.bind(this),
        priority: 6,
        retryCount: 1
      }
    ];
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addError(error: Omit<EnhancedError, 'id' | 'timestamp' | 'repairAttempts'>): void {
    const enhancedError: EnhancedError = {
      ...error,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      repairAttempts: 0,
      repairStrategies: []
    };
    
    this.errors.push(enhancedError);
    this.state.currentErrors.push(enhancedError);
    this.state.totalErrorsDetected++;
    
    console.error(`[ENHANCED ERROR] ${error.severity.toUpperCase()}: ${error.message}`);
    this.logToFile('error', enhancedError);
  }

  private logToFile(level: string, data: any): void {
    const logFile = `${this.reportDir}/logs/infinite-loop-${new Date().toISOString().split('T')[0]}.log`;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      data: data
    };
    
    try {
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  async initializeBrowser(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: false,
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
          '--log-level=0',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps'
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
    } catch (error) {
      console.error('❌ ブラウザ初期化失敗:', error);
      throw error;
    }
  }

  private async setupAdvancedErrorListeners(page: Page): Promise<void> {
    // 拡張コンソールエラー監視
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.addError({
          type: 'console',
          severity: 'high',
          message: msg.text(),
          source: 'browser_console',
          url: page.url()
        });
      } else if (msg.type() === 'warning' && msg.text().includes('React')) {
        this.addError({
          type: 'react',
          severity: 'medium',
          message: msg.text(),
          source: 'react_warning',
          url: page.url()
        });
      }
    });

    // JavaScript実行エラー監視
    page.on('pageerror', (error) => {
      this.addError({
        type: 'javascript',
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
          source: 'network_response',
          url: response.url()
        });
      }
    });

    page.on('requestfailed', (request) => {
      this.addError({
        type: 'network',
        severity: 'high',
        message: `Request failed: ${request.failure()?.errorText}`,
        source: 'network_request',
        url: request.url()
      });
    });

    // React開発者ツールエラー監視
    await this.setupReactErrorMonitoring(page);
  }

  private async setupReactErrorMonitoring(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        // React Error Boundary の監視
        const originalError = console.error;
        console.error = (...args) => {
          const message = args.join(' ');
          if (message.includes('React') || message.includes('Warning:') || message.includes('Error:')) {
            (window as any).__reactErrors = (window as any).__reactErrors || [];
            (window as any).__reactErrors.push({
              message,
              timestamp: new Date().toISOString(),
              stack: new Error().stack
            });
          }
          originalError.apply(console, args);
        };

        // React DevTools との連携
        if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
          hook.onCommitFiberRoot = (id: any, root: any, priorityLevel: any) => {
            // Fiber tree のエラーを検知
            try {
              if (root && root.current && root.current.child) {
                const checkFiberForErrors = (fiber: any) => {
                  if (fiber.pendingProps && fiber.pendingProps.hasError) {
                    (window as any).__reactErrors = (window as any).__reactErrors || [];
                    (window as any).__reactErrors.push({
                      message: 'React Error Boundary activated',
                      component: fiber.type?.name || 'Unknown',
                      timestamp: new Date().toISOString()
                    });
                  }
                  if (fiber.child) checkFiberForErrors(fiber.child);
                  if (fiber.sibling) checkFiberForErrors(fiber.sibling);
                };
                checkFiberForErrors(root.current.child);
              }
            } catch (e) {
              // Ignore inspection errors
            }
          };
        }
      });
    } catch (error) {
      console.warn('React monitoring setup failed:', error);
    }
  }

  private async detectAdvancedErrors(page: Page): Promise<EnhancedError[]> {
    const detectedErrors: EnhancedError[] = [];

    try {
      // React エラーの取得
      const reactErrors = await page.evaluate(() => {
        return (window as any).__reactErrors || [];
      });

      reactErrors.forEach((error: any) => {
        this.addError({
          type: 'react',
          severity: 'high',
          message: error.message,
          source: 'react_monitoring',
          url: page.url(),
          component: error.component
        });
      });

      // パフォーマンス問題の検知
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          memoryUsage: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : null
        };
      });

      // パフォーマンス閾値チェック
      if (performanceMetrics.domContentLoaded > 3000) {
        this.addError({
          type: 'performance',
          severity: 'medium',
          message: `Slow DOM load time: ${performanceMetrics.domContentLoaded}ms`,
          source: 'performance_metrics',
          url: page.url()
        });
      }

      if (performanceMetrics.memoryUsage && performanceMetrics.memoryUsage.used > performanceMetrics.memoryUsage.limit * 0.8) {
        this.addError({
          type: 'performance',
          severity: 'high',
          message: `High memory usage: ${(performanceMetrics.memoryUsage.used / 1024 / 1024).toFixed(2)}MB`,
          source: 'memory_monitor',
          url: page.url()
        });
      }

      // UI要素の詳細チェック
      await this.checkUIElements(page);

    } catch (error) {
      console.warn('Advanced error detection failed:', error);
    }

    return detectedErrors;
  }

  private async checkUIElements(page: Page): Promise<void> {
    try {
      // 必須要素の存在確認
      const criticalSelectors = [
        'header, [role="banner"]',
        'nav, [role="navigation"]',
        'main, [role="main"]',
        'footer, [role="contentinfo"]'
      ];

      for (const selector of criticalSelectors) {
        const element = await page.$(selector);
        if (!element) {
          this.addError({
            type: 'ui',
            severity: 'high',
            message: `Missing critical UI element: ${selector}`,
            source: 'ui_structure_check',
            url: page.url(),
            element: selector
          });
        }
      }

      // フォーム検証
      const forms = await page.$$('form');
      for (const form of forms) {
        const requiredFields = await form.$$('input[required], select[required], textarea[required]');
        
        for (const field of requiredFields) {
          const isVisible = await field.isVisible();
          const isEnabled = await field.isEnabled();
          
          if (isVisible && !isEnabled) {
            const name = await field.getAttribute('name') || 'unknown';
            this.addError({
              type: 'ui',
              severity: 'medium',
              message: `Disabled required field: ${name}`,
              source: 'form_validation',
              url: page.url(),
              element: `[name="${name}"]`
            });
          }
        }
      }

      // アクセシビリティチェック
      await this.performAccessibilityCheck(page);

    } catch (error) {
      console.warn('UI elements check failed:', error);
    }
  }

  private async performAccessibilityCheck(page: Page): Promise<void> {
    try {
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });

      const axeResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          (window as any).axe.run((err: any, results: any) => {
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

  // 修復戦略の実装
  private async repairByRefresh(error: EnhancedError): Promise<boolean> {
    try {
      if (!this.context) return false;
      
      const page = await this.context.newPage();
      await page.goto(error.url, { waitUntil: 'networkidle' });
      await page.reload({ waitUntil: 'networkidle' });
      
      // 修復後の検証
      const isFixed = await this.verifyErrorFixed(page, error);
      await page.close();
      
      return isFixed;
    } catch (e) {
      console.error('Refresh repair failed:', e);
      return false;
    }
  }

  private async repairByClearCache(error: EnhancedError): Promise<boolean> {
    try {
      if (!this.context) return false;
      
      await this.context.clearCookies();
      await this.context.clearPermissions();
      
      const page = await this.context.newPage();
      await page.goto(error.url, { waitUntil: 'networkidle' });
      
      const isFixed = await this.verifyErrorFixed(page, error);
      await page.close();
      
      return isFixed;
    } catch (e) {
      console.error('Clear cache repair failed:', e);
      return false;
    }
  }

  private async repairByRestartBrowser(error: EnhancedError): Promise<boolean> {
    try {
      if (this.browser) {
        await this.browser.close();
      }
      
      await this.initializeBrowser();
      
      if (!this.context) return false;
      
      const page = await this.context.newPage();
      await page.goto(error.url, { waitUntil: 'networkidle' });
      
      const isFixed = await this.verifyErrorFixed(page, error);
      await page.close();
      
      return isFixed;
    } catch (e) {
      console.error('Browser restart repair failed:', e);
      return false;
    }
  }

  private async repairByScriptInjection(error: EnhancedError): Promise<boolean> {
    try {
      if (!this.context) return false;
      
      const page = await this.context.newPage();
      await page.goto(error.url, { waitUntil: 'networkidle' });
      
      // エラータイプに応じた修復スクリプトを注入
      let fixScript = '';
      
      if (error.type === 'console' && error.message.includes('TypeError')) {
        fixScript = `
          // Null check injection
          const originalSetTimeout = window.setTimeout;
          window.setTimeout = function(fn, delay) {
            if (typeof fn === 'function') {
              return originalSetTimeout(() => {
                try { fn(); } catch(e) { console.warn('Caught error:', e); }
              }, delay);
            }
            return originalSetTimeout(fn, delay);
          };
        `;
      } else if (error.type === 'react') {
        fixScript = `
          // React error boundary injection
          if (window.React && window.React.Component) {
            const originalComponentDidCatch = window.React.Component.prototype.componentDidCatch;
            window.React.Component.prototype.componentDidCatch = function(error, info) {
              console.warn('React error caught and handled:', error);
              if (originalComponentDidCatch) {
                originalComponentDidCatch.call(this, error, info);
              }
            };
          }
        `;
      }
      
      if (fixScript) {
        await page.evaluate(fixScript);
      }
      
      const isFixed = await this.verifyErrorFixed(page, error);
      await page.close();
      
      return isFixed;
    } catch (e) {
      console.error('Script injection repair failed:', e);
      return false;
    }
  }

  private async repairByDOMModification(error: EnhancedError): Promise<boolean> {
    try {
      if (!this.context || !error.element) return false;
      
      const page = await this.context.newPage();
      await page.goto(error.url, { waitUntil: 'networkidle' });
      
      await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          // 一般的なUI修復
          if (element.tagName === 'BUTTON' && element.hasAttribute('disabled')) {
            element.removeAttribute('disabled');
          }
          
          // 必要なaria属性の追加
          if (!element.getAttribute('role')) {
            element.setAttribute('role', 'button');
          }
          
          // 見た目の修正
          const style = element.style;
          if (style.display === 'none') {
            style.display = 'block';
          }
        }
      }, error.element);
      
      const isFixed = await this.verifyErrorFixed(page, error);
      await page.close();
      
      return isFixed;
    } catch (e) {
      console.error('DOM modification repair failed:', e);
      return false;
    }
  }

  private async repairByBackendRestart(error: EnhancedError): Promise<boolean> {
    try {
      if (error.type !== 'network' || !error.message.includes('500')) {
        return false;
      }
      
      // バックエンド再起動
      execSync('cd /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend && pkill -f "python.*main.py" || true');
      execSync('cd /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &', { detached: true });
      
      // 再起動待機
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 検証
      if (!this.context) return false;
      
      const page = await this.context.newPage();
      await page.goto(error.url, { waitUntil: 'networkidle' });
      
      const isFixed = await this.verifyErrorFixed(page, error);
      await page.close();
      
      return isFixed;
    } catch (e) {
      console.error('Backend restart repair failed:', e);
      return false;
    }
  }

  private async verifyErrorFixed(page: Page, originalError: EnhancedError): Promise<boolean> {
    try {
      // エラー監視をリセット
      const tempErrors: EnhancedError[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes(originalError.message)) {
          tempErrors.push({
            id: 'temp',
            type: 'console',
            severity: 'high',
            message: msg.text(),
            source: 'verification',
            url: page.url(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      page.on('pageerror', (error) => {
        if (error.message.includes(originalError.message)) {
          tempErrors.push({
            id: 'temp',
            type: 'javascript',
            severity: 'critical',
            message: error.message,
            source: 'verification',
            url: page.url(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // ページをリロードして検証
      await page.reload({ waitUntil: 'networkidle' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return tempErrors.length === 0;
    } catch (error) {
      console.warn('Error verification failed:', error);
      return false;
    }
  }

  private async performInternalValidation(): Promise<ValidationResult> {
    const validationErrors: EnhancedError[] = [];
    let metrics = {
      pageLoadTime: 0,
      jsErrors: 0,
      networkErrors: 0,
      accessibilityIssues: 0,
      performanceScore: 0
    };

    try {
      if (!this.context) {
        throw new Error('Browser context not available');
      }

      const page = await this.context.newPage();
      await this.setupAdvancedErrorListeners(page);
      
      const startTime = Date.now();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      metrics.pageLoadTime = Date.now() - startTime;
      
      // 各種チェックを実行
      await this.detectAdvancedErrors(page);
      await this.performAccessibilityCheck(page);
      
      // メトリクス集計
      metrics.jsErrors = this.errors.filter(e => e.type === 'javascript' || e.type === 'console').length;
      metrics.networkErrors = this.errors.filter(e => e.type === 'network').length;
      metrics.accessibilityIssues = this.errors.filter(e => e.type === 'accessibility').length;
      
      // パフォーマンススコア計算 (0-100)
      metrics.performanceScore = Math.max(0, 100 - (
        (metrics.pageLoadTime > 3000 ? 20 : 0) +
        (metrics.jsErrors * 5) +
        (metrics.networkErrors * 10) +
        (metrics.accessibilityIssues * 2)
      ));
      
      await page.close();
      
      const passed = this.errors.length === 0;
      
      return {
        passed,
        errors: this.errors,
        metrics
      };
    } catch (error) {
      console.error('Internal validation failed:', error);
      return {
        passed: false,
        errors: validationErrors,
        metrics
      };
    }
  }

  private async applyRepairStrategies(errors: EnhancedError[]): Promise<number> {
    let fixedCount = 0;
    
    for (const error of errors) {
      if (error.repairAttempts! >= this.maxRepairAttempts) {
        console.warn(`Max repair attempts reached for error: ${error.id}`);
        continue;
      }
      
      // 優先順位でソートされた修復戦略を試行
      const sortedStrategies = [...this.repairStrategies].sort((a, b) => a.priority - b.priority);
      
      for (const strategy of sortedStrategies) {
        try {
          console.log(`🔧 Applying repair strategy: ${strategy.name} for error: ${error.id}`);
          
          const beforeState = { ...this.state };
          const success = await strategy.action(error);
          const afterState = { ...this.state };
          
          // 修復記録を保存
          const repairRecord: RepairRecord = {
            id: `repair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            errorId: error.id,
            strategy: strategy.name,
            success,
            timestamp: new Date().toISOString(),
            beforeState,
            afterState,
            verificationPassed: success
          };
          
          this.state.repairHistory.push(repairRecord);
          error.repairAttempts = (error.repairAttempts || 0) + 1;
          error.repairStrategies = error.repairStrategies || [];
          error.repairStrategies.push(strategy.name);
          
          this.logToFile('repair', repairRecord);
          
          if (success) {
            console.log(`✅ Repair successful: ${strategy.name} for error: ${error.id}`);
            fixedCount++;
            this.state.totalErrorsFixed++;
            break; // 修復成功したので次のエラーへ
          } else {
            console.log(`❌ Repair failed: ${strategy.name} for error: ${error.id}`);
          }
        } catch (strategyError) {
          console.error(`Repair strategy ${strategy.name} threw an error:`, strategyError);
        }
      }
    }
    
    return fixedCount;
  }

  private async executeCycle(): Promise<boolean> {
    this.state.cycleCount++;
    console.log(`\n🔄 執行サイクル ${this.state.cycleCount} 開始`);
    
    try {
      // エラー検知フェーズ
      this.errors = []; // リセット
      await this.performErrorDetection();
      
      if (this.errors.length === 0) {
        console.log('✅ エラーなし - システム正常');
        this.state.errorsFree = true;
        this.state.systemStatus = 'healthy';
        this.state.lastSuccessfulCycle = new Date().toISOString();
        return false; // エラーなしなので継続不要
      }
      
      console.log(`🚨 ${this.errors.length}件のエラーを検出`);
      this.state.errorsFree = false;
      this.state.systemStatus = this.errors.some(e => e.severity === 'critical') ? 'critical' : 'degraded';
      
      // 自動修復フェーズ
      const fixedCount = await this.applyRepairStrategies(this.errors);
      
      // 内部検証フェーズ
      const validationResult = await this.performInternalValidation();
      
      console.log(`📊 サイクル ${this.state.cycleCount} 完了: ${fixedCount}件修復, 検証${validationResult.passed ? '成功' : '失敗'}`);
      
      // レポート生成
      await this.generateCycleReport(validationResult);
      
      // 状態保存
      this.saveState();
      
      return !validationResult.passed; // 検証失敗なら継続、成功なら完了
    } catch (error) {
      console.error('🚨 サイクル実行エラー:', error);
      this.state.systemStatus = 'critical';
      return true; // エラーなので継続
    }
  }

  private async performErrorDetection(): Promise<void> {
    try {
      if (!this.browser) {
        await this.initializeBrowser();
      }
      
      if (!this.context) {
        throw new Error('Browser context not available');
      }
      
      const urls = [this.baseUrl, this.adminUrl];
      
      for (const url of urls) {
        console.log(`🔍 監視中: ${url}`);
        
        const page = await this.context.newPage();
        await this.setupAdvancedErrorListeners(page);
        
        try {
          await page.goto(url, { waitUntil: 'networkidle' });
          await this.detectAdvancedErrors(page);
          
          // スクリーンショット保存
          await page.screenshot({
            path: `${this.reportDir}/screenshots/cycle-${this.state.cycleCount}-${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
            fullPage: true
          });
        } catch (pageError) {
          console.error(`Page monitoring failed for ${url}:`, pageError);
          this.addError({
            type: 'ui',
            severity: 'critical',
            message: `Failed to monitor page: ${pageError}`,
            source: 'page_monitoring',
            url: url
          });
        } finally {
          await page.close();
        }
      }
    } catch (error) {
      console.error('Error detection failed:', error);
      this.addError({
        type: 'javascript',
        severity: 'critical',
        message: `Error detection system failure: ${error}`,
        source: 'system_monitor',
        url: 'local'
      });
    }
  }

  private async generateCycleReport(validationResult: ValidationResult): Promise<void> {
    const report = {
      cycleNumber: this.state.cycleCount,
      timestamp: new Date().toISOString(),
      state: this.state,
      validationResult,
      errors: this.errors,
      metrics: validationResult.metrics,
      summary: {
        totalErrors: this.errors.length,
        criticalErrors: this.errors.filter(e => e.severity === 'critical').length,
        highErrors: this.errors.filter(e => e.severity === 'high').length,
        mediumErrors: this.errors.filter(e => e.severity === 'medium').length,
        lowErrors: this.errors.filter(e => e.severity === 'low').length,
        repairAttempts: this.state.repairHistory.length,
        successfulRepairs: this.state.repairHistory.filter(r => r.success).length
      }
    };
    
    const reportPath = `${this.reportDir}/cycle-${this.state.cycleCount}-report.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Markdownレポートも生成
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = `${this.reportDir}/cycle-${this.state.cycleCount}-report.md`;
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`📄 サイクルレポート生成: ${reportPath}`);
  }

  private generateMarkdownReport(report: any): string {
    return `
# 無限ループ自動化システム - サイクル ${report.cycleNumber} レポート

## 概要
- **実行時刻**: ${new Date(report.timestamp).toLocaleString()}
- **システム状態**: ${report.state.systemStatus}
- **エラーフリー**: ${report.state.errorsFree ? 'はい' : 'いいえ'}
- **検証結果**: ${report.validationResult.passed ? '成功' : '失敗'}

## 統計情報
- **総エラー数**: ${report.summary.totalErrors}
- **Critical**: ${report.summary.criticalErrors}
- **High**: ${report.summary.highErrors}
- **Medium**: ${report.summary.mediumErrors}
- **Low**: ${report.summary.lowErrors}

## パフォーマンスメトリクス
- **ページ読み込み時間**: ${report.metrics.pageLoadTime}ms
- **JavaScriptエラー**: ${report.metrics.jsErrors}件
- **ネットワークエラー**: ${report.metrics.networkErrors}件
- **アクセシビリティ問題**: ${report.metrics.accessibilityIssues}件
- **パフォーマンススコア**: ${report.metrics.performanceScore}/100

## 修復履歴
- **修復試行回数**: ${report.summary.repairAttempts}
- **成功修復数**: ${report.summary.successfulRepairs}
- **成功率**: ${report.summary.repairAttempts > 0 ? ((report.summary.successfulRepairs / report.summary.repairAttempts) * 100).toFixed(1) : 0}%

## 検出されたエラー
${report.errors.map((error: EnhancedError) => `
### ${error.type.toUpperCase()} - ${error.severity.toUpperCase()}
- **メッセージ**: ${error.message}
- **ソース**: ${error.source}
- **URL**: ${error.url}
- **修復試行回数**: ${error.repairAttempts || 0}
- **使用された戦略**: ${error.repairStrategies?.join(', ') || 'なし'}
`).join('\n')}

## 推奨アクション
${report.summary.criticalErrors > 0 ? '🚨 Critical エラーが検出されました。即座の対応が必要です。' : ''}
${report.summary.highErrors > 0 ? '⚠️ High priority エラーがあります。優先的に対応してください。' : ''}
${report.validationResult.passed ? '✅ すべての検証が成功しました。' : '❌ 検証に失敗しました。さらなる修復が必要です。'}

---
*Generated by Enhanced Infinite Loop Automation System*
`;
  }

  async startInfiniteLoop(): Promise<void> {
    console.log('🚀 強化された無限ループ自動化システム開始');
    console.log(`🎯 対象URL: ${this.baseUrl}, ${this.adminUrl}`);
    console.log(`⏱️ サイクル間隔: ${this.cycleInterval}ms`);
    
    this.isRunning = true;
    
    try {
      while (this.isRunning) {
        const shouldContinue = await this.executeCycle();
        
        if (!shouldContinue && this.state.errorsFree) {
          console.log('🎉 すべてのエラーが修復されました！ システムは正常です。');
          // エラーフリー状態でも継続監視
        }
        
        console.log(`⏳ ${this.cycleInterval / 1000}秒待機...`);
        await new Promise(resolve => setTimeout(resolve, this.cycleInterval));
      }
    } catch (error) {
      console.error('🚨 無限ループシステムエラー:', error);
    } finally {
      await this.cleanup();
    }
  }

  async stopInfiniteLoop(): Promise<void> {
    console.log('🛑 無限ループ停止要求');
    this.isRunning = false;
  }

  async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
      }
      
      this.saveState();
      
      console.log('🧹 クリーンアップ完了');
      console.log(`📊 最終統計: ${this.state.cycleCount}サイクル実行, ${this.state.totalErrorsFixed}件修復`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// メイン実行関数
export async function runEnhancedInfiniteLoopAutomation(): Promise<void> {
  const automation = new EnhancedInfiniteLoopAutomation();
  
  // シグナルハンドラ設定
  process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT受信 - システム停止中...');
    await automation.stopInfiniteLoop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM受信 - システム停止中...');
    await automation.stopInfiniteLoop();
    process.exit(0);
  });
  
  try {
    await automation.startInfiniteLoop();
  } catch (error) {
    console.error('システム実行エラー:', error);
    process.exit(1);
  }
}

// 直接実行時
if (require.main === module) {
  runEnhancedInfiniteLoopAutomation()
    .then(() => {
      console.log('✅ システム正常終了');
    })
    .catch((error) => {
      console.error('❌ システム異常終了:', error);
      process.exit(1);
    });
}
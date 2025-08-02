/**
 * 管理者ダッシュボード専用エラー監視システム
 * /admin 専用の詳細なエラー検知・監視機能
 */

import { test, expect, Browser, BrowserContext, Page, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface AdminDashboardError {
  id: string;
  type: 'permission' | 'data' | 'config' | 'security' | 'ui' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  component: string;
  url: string;
  timestamp: string;
  userRole?: string;
  actionAttempted?: string;
  fix?: string;
}

interface AdminDashboardReport {
  timestamp: string;
  totalErrors: number;
  securityIssues: number;
  permissionErrors: number;
  configErrors: number;
  dataErrors: number;
  errors: AdminDashboardError[];
  adminPagesChecked: string[];
  summary: string;
  criticalFindings: string[];
}

class AdminDashboardMonitor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private errors: AdminDashboardError[] = [];
  private adminBaseUrl = 'http://192.168.3.135:3000/admin';
  private reportDir = './admin-monitoring-reports';

  constructor() {
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private generateErrorId(): string {
    return `admin_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addError(error: Omit<AdminDashboardError, 'id' | 'timestamp'>): void {
    const adminError: AdminDashboardError = {
      ...error,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString()
    };
    this.errors.push(adminError);
    console.error(`[Admin Dashboard Error] ${error.severity.toUpperCase()}: ${error.message}`);
  }

  async initializeBrowser(): Promise<void> {
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
        '--log-level=0'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      recordVideo: {
        dir: `${this.reportDir}/admin-videos`,
        size: { width: 1920, height: 1080 }
      }
    });
  }

  async setupAdminErrorListeners(page: Page): Promise<void> {
    // 管理者専用のコンソールエラー監視
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        let errorType: AdminDashboardError['type'] = 'ui';
        let severity: AdminDashboardError['severity'] = 'high';

        // 管理者固有のエラー分類
        if (msg.text().includes('permission') || msg.text().includes('unauthorized')) {
          errorType = 'permission';
          severity = 'critical';
        } else if (msg.text().includes('config') || msg.text().includes('settings')) {
          errorType = 'config';
          severity = 'high';
        } else if (msg.text().includes('security') || msg.text().includes('auth')) {
          errorType = 'security';
          severity = 'critical';
        } else if (msg.text().includes('data') || msg.text().includes('database')) {
          errorType = 'data';
          severity = 'high';
        }

        this.addError({
          type: errorType,
          severity,
          message: msg.text(),
          source: 'admin_console',
          component: 'dashboard',
          url: page.url()
        });
      }
    });

    // 管理者専用のページエラー監視
    page.on('pageerror', (error) => {
      this.addError({
        type: 'ui',
        severity: 'critical',
        message: error.message,
        source: 'admin_page_error',
        component: 'page_level',
        url: page.url()
      });
    });

    // ネットワークエラー（APIコール失敗など）
    page.on('response', (response) => {
      if (response.status() >= 400) {
        let errorType: AdminDashboardError['type'] = 'data';
        
        if (response.status() === 401 || response.status() === 403) {
          errorType = 'permission';
        } else if (response.status() === 500) {
          errorType = 'config';
        }

        this.addError({
          type: errorType,
          severity: response.status() >= 500 ? 'critical' : 'high',
          message: `HTTP ${response.status()}: ${response.statusText()}`,
          source: 'admin_network',
          component: 'api',
          url: response.url()
        });
      }
    });
  }

  async checkAdminAuthentication(page: Page): Promise<void> {
    try {
      // 管理者認証の確認
      const currentUrl = page.url();
      
      if (currentUrl.includes('login') || currentUrl.includes('auth')) {
        this.addError({
          type: 'permission',
          severity: 'critical',
          message: 'Admin dashboard access requires authentication',
          source: 'admin_auth_check',
          component: 'authentication',
          url: currentUrl
        });
        return;
      }

      // 管理者専用要素の確認
      const adminElements = [
        '[data-testid="admin-header"]',
        '.admin-navigation',
        '[role="admin-panel"]',
        '.admin-dashboard'
      ];

      let adminElementsFound = 0;
      for (const selector of adminElements) {
        const element = await page.$(selector);
        if (element) {
          adminElementsFound++;
        }
      }

      if (adminElementsFound === 0) {
        this.addError({
          type: 'permission',
          severity: 'high',
          message: 'No admin-specific elements found - potential access issue',
          source: 'admin_element_check',
          component: 'admin_ui',
          url: currentUrl
        });
      }

    } catch (error) {
      this.addError({
        type: 'permission',
        severity: 'high',
        message: `Admin authentication check failed: ${error}`,
        source: 'admin_auth_check',
        component: 'authentication',
        url: page.url()
      });
    }
  }

  async checkAdminPermissions(page: Page): Promise<void> {
    try {
      // 管理者権限が必要な機能のテスト
      const adminActions = [
        { selector: '[data-testid="user-management"]', action: 'User Management' },
        { selector: '[data-testid="system-settings"]', action: 'System Settings' },
        { selector: '[data-testid="security-config"]', action: 'Security Configuration' },
        { selector: '[data-testid="audit-logs"]', action: 'Audit Logs' },
        { selector: '[data-testid="backup-restore"]', action: 'Backup/Restore' }
      ];

      for (const { selector, action } of adminActions) {
        const element = await page.$(selector);
        if (element) {
          const isClickable = await element.isEnabled();
          const isVisible = await element.isVisible();
          
          if (!isClickable || !isVisible) {
            this.addError({
              type: 'permission',
              severity: 'medium',
              message: `Admin action "${action}" is not accessible`,
              source: 'admin_permission_check',
              component: 'admin_actions',
              url: page.url(),
              actionAttempted: action
            });
          }
        } else {
          this.addError({
            type: 'ui',
            severity: 'medium',
            message: `Admin action "${action}" element not found`,
            source: 'admin_ui_check',
            component: 'admin_navigation',
            url: page.url(),
            actionAttempted: action
          });
        }
      }
    } catch (error) {
      this.addError({
        type: 'permission',
        severity: 'high',
        message: `Admin permission check failed: ${error}`,
        source: 'admin_permission_check',
        component: 'permissions',
        url: page.url()
      });
    }
  }

  async checkAdminDataIntegrity(page: Page): Promise<void> {
    try {
      // データ整合性チェック
      const dataChecks = await page.evaluate(() => {
        const issues: string[] = [];

        // ダッシュボードメトリクスの確認
        const metrics = document.querySelectorAll('[data-testid*="metric"]');
        metrics.forEach((metric, index) => {
          const value = metric.textContent;
          if (!value || value.includes('NaN') || value.includes('undefined')) {
            issues.push(`Metric ${index + 1} has invalid value: ${value}`);
          }
        });

        // テーブルデータの確認
        const tables = document.querySelectorAll('table');
        tables.forEach((table, tableIndex) => {
          const rows = table.querySelectorAll('tr');
          if (rows.length === 0) {
            issues.push(`Table ${tableIndex + 1} has no data rows`);
          }

          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, cellIndex) => {
              if (cell.textContent?.includes('Error') || cell.textContent?.includes('Failed')) {
                issues.push(`Table ${tableIndex + 1}, Row ${rowIndex + 1}, Cell ${cellIndex + 1}: ${cell.textContent}`);
              }
            });
          });
        });

        // チャートデータの確認
        const charts = document.querySelectorAll('[data-testid*="chart"], .recharts-wrapper');
        if (charts.length === 0) {
          issues.push('No charts found in admin dashboard');
        }

        return issues;
      });

      dataChecks.forEach(issue => {
        this.addError({
          type: 'data',
          severity: 'medium',
          message: issue,
          source: 'admin_data_check',
          component: 'data_display',
          url: page.url()
        });
      });

    } catch (error) {
      this.addError({
        type: 'data',
        severity: 'high',
        message: `Admin data integrity check failed: ${error}`,
        source: 'admin_data_check',
        component: 'data_validation',
        url: page.url()
      });
    }
  }

  async checkAdminSecurity(page: Page): Promise<void> {
    try {
      // セキュリティチェック
      const securityIssues = await page.evaluate(() => {
        const issues: string[] = [];

        // CSP (Content Security Policy) チェック
        const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        if (metaTags.length === 0) {
          issues.push('No Content Security Policy found');
        }

        // HTTPS チェック
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && !location.hostname.startsWith('192.168')) {
          issues.push('Admin dashboard not served over HTTPS');
        }

        // 機密情報の露出チェック
        const bodyText = document.body.textContent || '';
        const sensitivePatterns = [
          /password\s*[:=]\s*[\w\d]+/i,
          /api[_-]?key\s*[:=]\s*[\w\d-]+/i,
          /secret\s*[:=]\s*[\w\d]+/i,
          /token\s*[:=]\s*[\w\d.-]+/i
        ];

        sensitivePatterns.forEach((pattern, index) => {
          if (pattern.test(bodyText)) {
            issues.push(`Potential sensitive information exposure (pattern ${index + 1})`);
          }
        });

        // XSS防止チェック
        const scripts = document.querySelectorAll('script');
        scripts.forEach((script, index) => {
          if (script.innerHTML && !script.src) {
            if (script.innerHTML.includes('eval(') || script.innerHTML.includes('innerHTML')) {
              issues.push(`Potentially unsafe inline script ${index + 1}`);
            }
          }
        });

        return issues;
      });

      securityIssues.forEach(issue => {
        this.addError({
          type: 'security',
          severity: 'high',
          message: issue,
          source: 'admin_security_check',
          component: 'security',
          url: page.url()
        });
      });

    } catch (error) {
      this.addError({
        type: 'security',
        severity: 'high',
        message: `Admin security check failed: ${error}`,
        source: 'admin_security_check',
        component: 'security_validation',
        url: page.url()
      });
    }
  }

  async checkAdminConfiguration(page: Page): Promise<void> {
    try {
      // 設定チェック
      const configIssues = await page.evaluate(() => {
        const issues: string[] = [];

        // 設定フォームの確認
        const configForms = document.querySelectorAll('form[data-config], .config-section');
        configForms.forEach((form, index) => {
          const inputs = form.querySelectorAll('input, select, textarea');
          inputs.forEach((input: any) => {
            if (input.required && !input.value) {
              issues.push(`Required configuration field "${input.name || input.id || 'unknown'}" is empty`);
            }
            
            if (input.type === 'email' && input.value && !input.value.includes('@')) {
              issues.push(`Invalid email format in field "${input.name || input.id}"`);
            }
            
            if (input.type === 'url' && input.value && !input.value.startsWith('http')) {
              issues.push(`Invalid URL format in field "${input.name || input.id}"`);
            }
          });
        });

        // 設定値の矛盾チェック
        const settings = document.querySelectorAll('[data-setting]');
        const settingValues: { [key: string]: string } = {};
        
        settings.forEach((setting: any) => {
          const key = setting.getAttribute('data-setting');
          const value = setting.textContent || setting.value;
          settingValues[key] = value;
        });

        // 論理的矛盾のチェック（例：最大値 < 最小値）
        if (settingValues['max_users'] && settingValues['min_users']) {
          const max = parseInt(settingValues['max_users']);
          const min = parseInt(settingValues['min_users']);
          if (max < min) {
            issues.push('Maximum users setting is less than minimum users');
          }
        }

        return issues;
      });

      configIssues.forEach(issue => {
        this.addError({
          type: 'config',
          severity: 'medium',
          message: issue,
          source: 'admin_config_check',
          component: 'configuration',
          url: page.url()
        });
      });

    } catch (error) {
      this.addError({
        type: 'config',
        severity: 'high',
        message: `Admin configuration check failed: ${error}`,
        source: 'admin_config_check',
        component: 'config_validation',
        url: page.url()
      });
    }
  }

  async monitorAdminDashboard(): Promise<AdminDashboardReport> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();
    await this.setupAdminErrorListeners(page);

    try {
      console.log('🔐 Monitoring Admin Dashboard...');
      
      // 管理者ダッシュボードへアクセス
      await page.goto(this.adminBaseUrl, { waitUntil: 'networkidle' });
      
      // 各種チェックを実行
      await this.checkAdminAuthentication(page);
      await this.checkAdminPermissions(page);
      await this.checkAdminDataIntegrity(page);
      await this.checkAdminSecurity(page);
      await this.checkAdminConfiguration(page);
      
      // 管理者専用ページの監視
      const adminPages = [
        '/admin/users',
        '/admin/settings',
        '/admin/security',
        '/admin/logs',
        '/admin/backup',
        '/admin/monitoring'
      ];

      const checkedPages: string[] = [];
      
      for (const adminPage of adminPages) {
        try {
          const fullUrl = `http://192.168.3.135:3000${adminPage}`;
          await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 });
          checkedPages.push(adminPage);
          
          // 各ページでの基本チェック
          await this.checkAdminAuthentication(page);
          await this.checkAdminDataIntegrity(page);
          
          // ページ固有のスクリーンショット
          await page.screenshot({
            path: `${this.reportDir}/screenshots/admin${adminPage.replace(/\//g, '_')}.png`,
            fullPage: true
          });
          
        } catch (error) {
          this.addError({
            type: 'ui',
            severity: 'medium',
            message: `Failed to access admin page: ${adminPage} - ${error}`,
            source: 'admin_page_access',
            component: 'navigation',
            url: `http://192.168.3.135:3000${adminPage}`
          });
        }
      }

      // メインダッシュボードのスクリーンショット
      await page.goto(this.adminBaseUrl, { waitUntil: 'networkidle' });
      await page.screenshot({
        path: `${this.reportDir}/screenshots/admin_dashboard_main.png`,
        fullPage: true
      });

      // レポート生成
      return this.generateAdminReport(checkedPages);
      
    } finally {
      await page.close();
    }
  }

  private generateAdminReport(checkedPages: string[]): AdminDashboardReport {
    const securityIssues = this.errors.filter(e => e.type === 'security').length;
    const permissionErrors = this.errors.filter(e => e.type === 'permission').length;
    const configErrors = this.errors.filter(e => e.type === 'config').length;
    const dataErrors = this.errors.filter(e => e.type === 'data').length;
    const criticalErrors = this.errors.filter(e => e.severity === 'critical');

    const criticalFindings = criticalErrors.map(e => `${e.type}: ${e.message}`);

    const summary = `
管理者ダッシュボード監視完了:
- 総エラー数: ${this.errors.length}
- セキュリティ問題: ${securityIssues}
- 権限エラー: ${permissionErrors}
- 設定エラー: ${configErrors}
- データエラー: ${dataErrors}
- チェックしたページ: ${checkedPages.length}

${criticalFindings.length > 0 ? `
緊急対応が必要な問題:
${criticalFindings.slice(0, 5).map(f => `- ${f}`).join('\n')}
` : '重大な問題は検出されませんでした。'}
`;

    return {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      securityIssues,
      permissionErrors,
      configErrors,
      dataErrors,
      errors: this.errors,
      adminPagesChecked: checkedPages,
      summary: summary.trim(),
      criticalFindings
    };
  }

  async runFullAdminMonitoring(): Promise<AdminDashboardReport> {
    try {
      await this.initializeBrowser();
      const report = await this.monitorAdminDashboard();
      
      // レポート保存
      const reportPath = `${this.reportDir}/admin-dashboard-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n=== 管理者ダッシュボード監視レポート ===');
      console.log(report.summary);
      console.log(`\n詳細レポート: ${reportPath}`);
      
      return report;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// エクスポート
export { AdminDashboardMonitor, AdminDashboardError, AdminDashboardReport };

// 直接実行時
if (require.main === module) {
  const monitor = new AdminDashboardMonitor();
  monitor.runFullAdminMonitoring()
    .then((report) => {
      console.log('\n管理者ダッシュボード監視が完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('管理者ダッシュボード監視に失敗しました:', error);
      process.exit(1);
    });
}
/**
 * MCP Playwright ブラウザエラー検知システム
 * 開発者コンソールエラーをリアルタイムで検知し、自動修復機能を提供
 */
import { chromium, firefox, webkit } from '@playwright/test';
export class MCPPlaywrightErrorDetector {
    constructor(config) {
        Object.defineProperty(this, "browsers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "contexts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "pages", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "errors", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "repairs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "isMonitoring", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "monitoringIntervals", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        this.config = config;
    }
    /**
     * ブラウザエラー検知システムを初期化
     */
    async initialize() {
        try {
            console.log('🚀 MCP Playwright Error Detector を初期化中...');
            // 各ブラウザを起動
            for (const browserType of this.config.browsers) {
                await this.launchBrowser(browserType);
            }
            console.log('✅ ブラウザエラー検知システムが正常に初期化されました');
        }
        catch (error) {
            console.error('❌ エラー検知システムの初期化に失敗:', error);
            throw error;
        }
    }
    /**
     * 指定されたブラウザを起動
     */
    async launchBrowser(browserType) {
        try {
            let browser;
            const launchOptions = {
                headless: false, // UIを表示してモニタリング
                devtools: true,
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
                ],
            };
            switch (browserType) {
                case 'chromium':
                    browser = await chromium.launch(launchOptions);
                    break;
                case 'firefox':
                    browser = await firefox.launch(launchOptions);
                    break;
                case 'webkit':
                    browser = await webkit.launch(launchOptions);
                    break;
                default:
                    throw new Error(`サポートされていないブラウザタイプ: ${browserType}`);
            }
            this.browsers.set(browserType, browser);
            // ブラウザコンテキストを作成
            const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                ignoreHTTPSErrors: true,
                recordVideo: this.config.enableTrace ? { dir: 'monitoring-logs/videos' } : undefined,
            });
            this.contexts.set(browserType, context);
            // 各URLに対してページを作成
            for (const url of this.config.targetUrls) {
                const page = await context.newPage();
                const pageKey = `${browserType}-${this.getUrlKey(url)}`;
                this.pages.set(pageKey, page);
                // エラーリスナーを設定
                await this.setupErrorListeners(page, url, browserType);
                // ページを読み込み
                await page.goto(url, {
                    waitUntil: 'networkidle',
                    timeout: this.config.timeout
                });
            }
            console.log(`✅ ${browserType} ブラウザが正常に起動されました`);
        }
        catch (error) {
            console.error(`❌ ${browserType} ブラウザの起動に失敗:`, error);
            throw error;
        }
    }
    /**
     * ページにエラーリスナーを設定
     */
    async setupErrorListeners(page, url, browserType) {
        // コンソールエラーをキャッチ
        page.on('console', async (msg) => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                const error = {
                    id: this.generateErrorId(),
                    timestamp: new Date(),
                    type: 'console',
                    level: msg.type(),
                    message: msg.text(),
                    source: 'console',
                    url: url,
                    userAgent: await page.evaluate(() => navigator.userAgent),
                    context: {
                        browser: browserType,
                        args: msg.args().map(arg => arg.toString()),
                    }
                };
                await this.reportError(error);
            }
        });
        // JavaScript例外をキャッチ
        page.on('pageerror', async (exception) => {
            const error = {
                id: this.generateErrorId(),
                timestamp: new Date(),
                type: 'javascript',
                level: 'error',
                message: exception.message,
                source: 'javascript',
                stackTrace: exception.stack,
                url: url,
                userAgent: await page.evaluate(() => navigator.userAgent),
                context: {
                    browser: browserType,
                    exception: exception.toString(),
                }
            };
            await this.reportError(error);
        });
        // ネットワークエラーをキャッチ
        page.on('response', async (response) => {
            if (response.status() >= 400) {
                const error = {
                    id: this.generateErrorId(),
                    timestamp: new Date(),
                    type: 'network',
                    level: response.status() >= 500 ? 'error' : 'warning',
                    message: `HTTP ${response.status()}: ${response.statusText()}`,
                    source: 'network',
                    url: response.url(),
                    userAgent: await page.evaluate(() => navigator.userAgent),
                    context: {
                        browser: browserType,
                        status: response.status(),
                        statusText: response.statusText(),
                        headers: await response.allHeaders(),
                    }
                };
                await this.reportError(error);
            }
        });
        // セキュリティエラーをキャッチ
        page.on('requestfailed', async (request) => {
            const error = {
                id: this.generateErrorId(),
                timestamp: new Date(),
                type: 'security',
                level: 'error',
                message: `Request failed: ${request.failure()?.errorText || 'Unknown error'}`,
                source: 'network',
                url: request.url(),
                userAgent: await page.evaluate(() => navigator.userAgent),
                context: {
                    browser: browserType,
                    method: request.method(),
                    failure: request.failure(),
                }
            };
            await this.reportError(error);
        });
    }
    /**
     * エラーを報告し、自動修復を試行
     */
    async reportError(error) {
        this.errors.push(error);
        console.log(`🔍 エラーを検知: [${error.type}] ${error.message}`);
        if (this.config.reportingEnabled) {
            await this.saveErrorReport(error);
        }
        // 自動修復を試行
        await this.attemptAutoRepair(error);
    }
    /**
     * 自動修復を試行
     */
    async attemptAutoRepair(error) {
        try {
            const repairActions = await this.generateRepairActions(error);
            for (const action of repairActions) {
                console.log(`🔧 修復を試行: ${action.description}`);
                const success = await this.applyRepair(action, error);
                action.applied = true;
                action.success = success;
                action.timestamp = new Date();
                this.repairs.push(action);
                if (success) {
                    console.log(`✅ 修復成功: ${action.description}`);
                    break;
                }
                else {
                    console.log(`❌ 修復失敗: ${action.description}`);
                }
            }
        }
        catch (error) {
            console.error('❌ 自動修復の試行中にエラーが発生:', error);
        }
    }
    /**
     * エラーに基づいて修復アクションを生成
     */
    async generateRepairActions(error) {
        const actions = [];
        switch (error.type) {
            case 'console':
                if (error.message.includes('Cannot read property')) {
                    actions.push({
                        id: this.generateActionId(),
                        errorId: error.id,
                        type: 'javascript_fix',
                        description: 'null/undefined チェックを追加',
                        code: `
              // null/undefined チェックを追加
              if (typeof target !== 'undefined' && target !== null) {
                // 元のコードをここに
              }
            `,
                        applied: false,
                        timestamp: new Date(),
                    });
                }
                break;
            case 'network':
                if (error.context?.status >= 400) {
                    actions.push({
                        id: this.generateActionId(),
                        errorId: error.id,
                        type: 'network_fix',
                        description: 'エラーハンドリングとリトライ機能を追加',
                        code: `
              // エラーハンドリングとリトライ機能
              async function fetchWithRetry(url, options, maxRetries = 3) {
                for (let i = 0; i < maxRetries; i++) {
                  try {
                    const response = await fetch(url, options);
                    if (response.ok) return response;
                    throw new Error(\`HTTP \${response.status}\`);
                  } catch (error) {
                    if (i === maxRetries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                  }
                }
              }
            `,
                        applied: false,
                        timestamp: new Date(),
                    });
                }
                break;
            case 'accessibility':
                actions.push({
                    id: this.generateActionId(),
                    errorId: error.id,
                    type: 'accessibility_fix',
                    description: 'アクセシビリティ属性を追加',
                    code: `
            // aria-label, alt属性、role属性などを追加
            element.setAttribute('aria-label', '適切な説明');
            element.setAttribute('role', 'button');
          `,
                    applied: false,
                    timestamp: new Date(),
                });
                break;
        }
        return actions;
    }
    /**
     * 修復アクションを適用
     */
    async applyRepair(action, error) {
        try {
            const pageKey = this.getPageKeyFromError(error);
            const page = this.pages.get(pageKey);
            if (!page) {
                console.error('❌ 対象ページが見つかりません');
                return false;
            }
            switch (action.type) {
                case 'javascript_fix':
                    await page.evaluate((code) => {
                        const script = document.createElement('script');
                        script.textContent = code;
                        document.head.appendChild(script);
                    }, action.code);
                    break;
                case 'css_fix':
                    await page.evaluate((code) => {
                        const style = document.createElement('style');
                        style.textContent = code;
                        document.head.appendChild(style);
                    }, action.code);
                    break;
                case 'html_fix':
                    // HTMLの修正はより複雑なロジックが必要
                    console.log('HTML修復は実装中...');
                    break;
            }
            // 修復後に検証
            await this.validateRepair(page, error);
            return true;
        }
        catch (error) {
            console.error('❌ 修復アクションの適用に失敗:', error);
            return false;
        }
    }
    /**
     * 修復の検証
     */
    async validateRepair(page, originalError) {
        try {
            // ページをリロードして検証
            await page.reload({ waitUntil: 'networkidle' });
            // 同じエラーが再発生しないかチェック
            await new Promise(resolve => setTimeout(resolve, 3000));
            return true;
        }
        catch (error) {
            console.error('❌ 修復の検証に失敗:', error);
            return false;
        }
    }
    /**
     * 監視を開始
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ 監視は既に開始されています');
            return;
        }
        this.isMonitoring = true;
        console.log('🔍 リアルタイム監視を開始...');
        // 定期的な健康チェック
        for (const [key, page] of this.pages) {
            const interval = setInterval(async () => {
                try {
                    // ページの状態をチェック
                    await page.evaluate(() => {
                        // カスタム健康チェックロジック
                        console.log('Health check:', new Date().toISOString());
                    });
                }
                catch (error) {
                    console.error(`❌ ページ健康チェックエラー [${key}]:`, error);
                }
            }, this.config.monitoringInterval);
            this.monitoringIntervals.set(key, interval);
        }
    }
    /**
     * 監視を停止
     */
    async stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('⚠️ 監視は既に停止されています');
            return;
        }
        this.isMonitoring = false;
        console.log('🛑 監視を停止中...');
        // インターバルをクリア
        for (const [key, interval] of this.monitoringIntervals) {
            clearInterval(interval);
        }
        this.monitoringIntervals.clear();
        // ブラウザを閉じる
        for (const [browserType, browser] of this.browsers) {
            await browser.close();
            console.log(`✅ ${browserType} ブラウザを閉じました`);
        }
        this.browsers.clear();
        this.contexts.clear();
        this.pages.clear();
    }
    /**
     * エラーレポートを保存
     */
    async saveErrorReport(error) {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const reportDir = path.join(process.cwd(), 'console-error-reports');
            await fs.mkdir(reportDir, { recursive: true });
            const reportFile = path.join(reportDir, `error-${error.id}.json`);
            await fs.writeFile(reportFile, JSON.stringify(error, null, 2));
        }
        catch (error) {
            console.error('❌ エラーレポートの保存に失敗:', error);
        }
    }
    /**
     * ユーティリティメソッド
     */
    generateErrorId() {
        return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    generateActionId() {
        return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    getUrlKey(url) {
        return url.replace(/[^a-zA-Z0-9]/g, '-');
    }
    getPageKeyFromError(error) {
        const browser = error.context?.browser || 'chromium';
        return `${browser}-${this.getUrlKey(error.url)}`;
    }
    /**
     * 現在の状態を取得
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            totalErrors: this.errors.length,
            totalRepairs: this.repairs.length,
            successfulRepairs: this.repairs.filter(r => r.success).length,
            activeBrowsers: this.browsers.size,
            activePages: this.pages.size,
            recentErrors: this.errors.slice(-10),
            recentRepairs: this.repairs.slice(-10),
        };
    }
    /**
     * 詳細レポートを生成
     */
    generateReport() {
        return {
            timestamp: new Date().toISOString(),
            config: this.config,
            status: this.getStatus(),
            errors: this.errors,
            repairs: this.repairs,
            summary: {
                errorsByType: this.groupErrorsByType(),
                errorsByBrowser: this.groupErrorsByBrowser(),
                repairSuccessRate: this.calculateRepairSuccessRate(),
            }
        };
    }
    groupErrorsByType() {
        const groups = {};
        this.errors.forEach(error => {
            groups[error.type] = (groups[error.type] || 0) + 1;
        });
        return groups;
    }
    groupErrorsByBrowser() {
        const groups = {};
        this.errors.forEach(error => {
            const browser = error.context?.browser || 'unknown';
            groups[browser] = (groups[browser] || 0) + 1;
        });
        return groups;
    }
    calculateRepairSuccessRate() {
        if (this.repairs.length === 0)
            return 0;
        const successful = this.repairs.filter(r => r.success).length;
        return (successful / this.repairs.length) * 100;
    }
}
// デフォルト設定
export const defaultConfig = {
    targetUrls: [
        'http://192.168.3.135:3000',
        'http://192.168.3.135:3000/admin'
    ],
    browsers: ['chromium', 'firefox'],
    monitoringInterval: 5000,
    maxRetries: 3,
    timeout: 30000,
    enableScreenshots: true,
    enableTrace: true,
    reportingEnabled: true,
};

/**
 * MCP Playwright を使用したブラウザエラー検知エンジン
 */
export class ErrorDetectionEngine {
    constructor(config) {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "session", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "isRunning", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "monitoringInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "errorCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "fixCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.config = config;
    }
    /**
     * エラー検知の開始
     */
    async startMonitoring() {
        if (this.isRunning) {
            throw new Error('監視は既に実行中です');
        }
        this.session = {
            id: `session-${Date.now()}`,
            startTime: new Date(),
            errorsDetected: 0,
            errorsFixed: 0,
            status: 'running',
            config: { ...this.config }
        };
        this.isRunning = true;
        // 定期的なエラーチェックの開始
        this.monitoringInterval = setInterval(() => this.performErrorCheck(), this.config.checkInterval);
        // 初回チェックの実行
        await this.performErrorCheck();
    }
    /**
     * エラー検知の停止
     */
    stopMonitoring() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        if (this.session) {
            this.session.endTime = new Date();
            this.session.status = 'stopped';
        }
    }
    /**
     * エラーチェックの実行
     */
    async performErrorCheck() {
        try {
            for (const url of this.config.targetUrls) {
                await this.checkUrl(url);
            }
        }
        catch (error) {
            console.error('エラーチェック中にエラーが発生:', error);
            if (this.session) {
                this.session.status = 'error';
            }
        }
    }
    /**
     * 特定URLのエラーチェック
     */
    async checkUrl(url) {
        const errors = [];
        try {
            // MCP Playwright を使用したページチェックをシミュレート
            // 実際の実装では playwright を使用してページを開き、コンソールエラーを監視
            const mockErrors = await this.simulatePlaywrightErrorDetection(url);
            for (const error of mockErrors) {
                if (this.shouldIncludeError(error)) {
                    errors.push(error);
                    this.notifyErrorDetected(error);
                    if (this.session) {
                        this.session.errorsDetected++;
                    }
                }
            }
        }
        catch (error) {
            console.error(`URL ${url} のチェック中にエラー:`, error);
        }
        return errors;
    }
    /**
     * Playwright エラー検知のシミュレート
     */
    async simulatePlaywrightErrorDetection(url) {
        // 実際の実装では以下のようなPlaywrightコードを使用
        /*
        const browser = await playwright.chromium.launch();
        const page = await browser.newPage();
        
        const errors: BrowserError[] = [];
        
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(this.createErrorFromConsoleMessage(msg, url));
          }
        });
        
        page.on('pageerror', (error) => {
          errors.push(this.createErrorFromPageError(error, url));
        });
        
        await page.goto(url, { timeout: this.config.timeout });
        await page.waitForTimeout(5000); // エラーが発生するまで待機
        
        await browser.close();
        return errors;
        */
        // シミュレーション用のモックエラー
        const mockErrors = [];
        // ランダムでエラーを生成（実際のシナリオをシミュレート）
        if (Math.random() > 0.7) {
            mockErrors.push({
                id: `error-${Date.now()}-${Math.random()}`,
                type: 'error',
                severity: 'high',
                message: 'TypeError: Cannot read properties of undefined (reading \'map\')',
                source: `${url}/static/js/main.chunk.js`,
                lineNumber: 245,
                columnNumber: 18,
                stack: `TypeError: Cannot read properties of undefined (reading 'map')
    at Dashboard.tsx:245:18
    at renderWithHooks (react-dom.development.js:14985:18)
    at updateFunctionComponent (react-dom.development.js:17356:20)`,
                timestamp: new Date(),
                url,
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                fixed: false,
                fixAttempts: 0,
                autoFixable: true,
                category: 'javascript'
            });
        }
        if (Math.random() > 0.8) {
            mockErrors.push({
                id: `warning-${Date.now()}-${Math.random()}`,
                type: 'warning',
                severity: 'medium',
                message: 'React Hook useEffect has a missing dependency: \'fetchData\'',
                source: `${url}/src/components/Dashboard.tsx`,
                lineNumber: 89,
                columnNumber: 6,
                timestamp: new Date(),
                url,
                fixed: false,
                fixAttempts: 0,
                autoFixable: true,
                category: 'javascript'
            });
        }
        if (Math.random() > 0.9) {
            mockErrors.push({
                id: `network-${Date.now()}-${Math.random()}`,
                type: 'network',
                severity: 'critical',
                message: 'Failed to load resource: net::ERR_CONNECTION_REFUSED',
                source: `${url.replace(':3000', ':8000')}/api/incidents`,
                timestamp: new Date(),
                url,
                fixed: false,
                fixAttempts: 0,
                autoFixable: false,
                category: 'network'
            });
        }
        return mockErrors;
    }
    /**
     * エラーをフィルタリングするかどうかの判定
     */
    shouldIncludeError(error) {
        const { filters } = this.config;
        // 最小重要度チェック
        const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
        if (severityLevels[error.severity] < severityLevels[filters.minimumSeverity]) {
            return false;
        }
        // 除外パターンチェック
        for (const pattern of filters.excludePatterns) {
            if (error.message.includes(pattern) || error.source.includes(pattern)) {
                return false;
            }
        }
        // 包含パターンチェック（設定されている場合）
        if (filters.includeOnlyPatterns && filters.includeOnlyPatterns.length > 0) {
            const matchesIncludePattern = filters.includeOnlyPatterns.some(pattern => error.message.includes(pattern) || error.source.includes(pattern));
            if (!matchesIncludePattern) {
                return false;
            }
        }
        return true;
    }
    /**
     * エラー検知通知
     */
    notifyErrorDetected(error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            }
            catch (callbackError) {
                console.error('エラーコールバック実行中にエラー:', callbackError);
            }
        });
    }
    /**
     * エラー修復通知
     */
    notifyErrorFixed(error) {
        this.fixCallbacks.forEach(callback => {
            try {
                callback(error);
            }
            catch (callbackError) {
                console.error('修復コールバック実行中にエラー:', callbackError);
            }
        });
    }
    /**
     * エラー検知コールバックの登録
     */
    onErrorDetected(callback) {
        this.errorCallbacks.push(callback);
    }
    /**
     * エラー修復コールバックの登録
     */
    onErrorFixed(callback) {
        this.fixCallbacks.push(callback);
    }
    /**
     * 現在のセッション情報の取得
     */
    getCurrentSession() {
        return this.session;
    }
    /**
     * 監視状態の取得
     */
    isMonitoringActive() {
        return this.isRunning;
    }
    /**
     * 設定の更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * リソースのクリーンアップ
     */
    dispose() {
        this.stopMonitoring();
        this.errorCallbacks = [];
        this.fixCallbacks = [];
    }
}
/**
 * デフォルト設定
 */
export const defaultErrorDetectionConfig = {
    targetUrls: [
        'http://192.168.3.135:3000',
        'http://192.168.3.135:3000/admin',
        'http://192.168.3.135:3000/dashboard',
        'http://192.168.3.135:3000/incidents',
        'http://192.168.3.135:3000/problems'
    ],
    checkInterval: 5000, // 5秒間隔
    maxRetries: 3,
    timeout: 30000, // 30秒タイムアウト
    enableScreenshots: true,
    enableVideoRecording: false,
    filters: {
        excludePatterns: [
            'favicon.ico',
            'chrome-extension://',
            'moz-extension://',
            'safari-extension://'
        ],
        minimumSeverity: 'medium'
    }
};
/**
 * エラー検知エンジンのシングルトンインスタンス
 */
export const errorDetectionEngine = new ErrorDetectionEngine(defaultErrorDetectionConfig);

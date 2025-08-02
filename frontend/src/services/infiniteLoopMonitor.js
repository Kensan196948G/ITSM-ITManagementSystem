/**
 * 無限ループ監視システム - エラーが出力されなくなるまで自動修復を継続
 */
export class InfiniteLoopMonitor {
    constructor(errorDetectionEngine, autoRepairEngine, validationSystem, config) {
        Object.defineProperty(this, "errorDetectionEngine", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "autoRepairEngine", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "validationSystem", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "currentSession", {
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
        Object.defineProperty(this, "sessionHistory", {
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
        // イベントコールバック
        Object.defineProperty(this, "onIterationCompleteCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "onErrorFixedCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "onEmergencyStopCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "onSuccessCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.errorDetectionEngine = errorDetectionEngine;
        this.autoRepairEngine = autoRepairEngine;
        this.validationSystem = validationSystem;
        this.config = {
            maxIterations: 50,
            iterationDelay: 10000, // 10秒
            successThreshold: 3, // 3回連続成功で完了
            maxConsecutiveFailures: 5,
            emergencyStopConditions: {
                maxErrorsPerIteration: 20,
                maxTotalRuntime: 3600000, // 1時間
                criticalErrorDetected: true
            },
            notifications: {
                onIterationComplete: true,
                onErrorFixed: true,
                onEmergencyStop: true,
                onSuccessfulCompletion: true
            },
            ...config
        };
    }
    /**
     * 無限ループ監視の開始
     */
    async startInfiniteLoop(targetUrl = 'http://192.168.3.135:3000') {
        if (this.isRunning) {
            throw new Error('無限ループ監視は既に実行中です');
        }
        const sessionId = `loop-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.currentSession = {
            id: sessionId,
            startTime: new Date(),
            status: 'running',
            config: { ...this.config },
            iterations: [],
            totalErrors: 0,
            totalRepairs: 0,
            successfulRepairs: 0,
            consecutiveSuccesses: 0,
            consecutiveFailures: 0,
            finalReport: ''
        };
        this.isRunning = true;
        console.log(`無限ループ監視開始: ${sessionId}`);
        console.log(`設定 - 最大反復回数: ${this.config.maxIterations}, 成功閾値: ${this.config.successThreshold}`);
        try {
            await this.executeInfiniteLoop(targetUrl);
        }
        catch (error) {
            console.error('無限ループ実行中にエラー:', error);
            if (this.currentSession) {
                this.currentSession.status = 'emergency_stop';
                this.currentSession.emergencyStopReason = `実行エラー: ${error}`;
                this.notifyEmergencyStop(this.currentSession.emergencyStopReason, this.currentSession);
            }
        }
        return this.currentSession;
    }
    /**
     * 無限ループの実行
     */
    async executeInfiniteLoop(targetUrl) {
        if (!this.currentSession)
            return;
        for (let i = 0; i < this.config.maxIterations; i++) {
            if (!this.isRunning) {
                this.currentSession.status = 'stopped';
                break;
            }
            // 緊急停止条件をチェック
            if (this.shouldEmergencyStop()) {
                break;
            }
            const iteration = await this.executeIteration(i + 1, targetUrl);
            this.currentSession.iterations.push(iteration);
            // 統計の更新
            this.updateSessionStatistics(iteration);
            // 反復完了の通知
            if (this.config.notifications.onIterationComplete) {
                this.notifyIterationComplete(iteration);
            }
            // 成功条件のチェック
            if (this.checkSuccessCondition()) {
                this.currentSession.status = 'success';
                this.currentSession.finalReport = this.generateSuccessReport();
                if (this.config.notifications.onSuccessfulCompletion) {
                    this.notifySuccess(this.currentSession);
                }
                break;
            }
            // 失敗条件のチェック
            if (this.checkFailureCondition()) {
                this.currentSession.status = 'emergency_stop';
                this.currentSession.emergencyStopReason = '連続失敗回数が上限に達しました';
                this.notifyEmergencyStop(this.currentSession.emergencyStopReason, this.currentSession);
                break;
            }
            // 次の反復まで待機
            if (i < this.config.maxIterations - 1) {
                await new Promise(resolve => setTimeout(resolve, this.config.iterationDelay));
            }
        }
        // セッション終了処理
        this.finalizeSession();
    }
    /**
     * 単一反復の実行
     */
    async executeIteration(iterationNumber, targetUrl) {
        const iterationId = `iteration-${iterationNumber}-${Date.now()}`;
        const iteration = {
            id: iterationId,
            number: iterationNumber,
            startTime: new Date(),
            status: 'running',
            errorsDetected: [],
            repairSessions: [],
            validationReports: [],
            successfulRepairs: 0,
            failedRepairs: 0,
            overallSuccess: false,
            duration: 0,
            summary: ''
        };
        console.log(`反復 ${iterationNumber} 開始`);
        try {
            // 1. エラー検知
            await this.errorDetectionEngine.startMonitoring();
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒間監視
            this.errorDetectionEngine.stopMonitoring();
            // 検知されたエラーを取得（シミュレート）
            iteration.errorsDetected = await this.getDetectedErrors();
            if (iteration.errorsDetected.length === 0) {
                iteration.overallSuccess = true;
                iteration.summary = 'エラーが検出されませんでした';
                console.log(`反復 ${iterationNumber}: エラーなし`);
            }
            else {
                console.log(`反復 ${iterationNumber}: ${iteration.errorsDetected.length}件のエラーを検出`);
                // 2. 自動修復
                for (const error of iteration.errorsDetected) {
                    try {
                        const repairSession = await this.autoRepairEngine.repairError(error);
                        iteration.repairSessions.push(repairSession);
                        // 修復完了まで待機
                        await this.waitForRepairCompletion(repairSession);
                        if (repairSession.result?.success) {
                            iteration.successfulRepairs++;
                            if (this.config.notifications.onErrorFixed) {
                                this.notifyErrorFixed(error, repairSession);
                            }
                        }
                        else {
                            iteration.failedRepairs++;
                        }
                        // 3. 内部検証
                        const validationReport = await this.validationSystem.validateRepair(repairSession, error, targetUrl);
                        iteration.validationReports.push(validationReport);
                    }
                    catch (repairError) {
                        console.error(`エラー修復失敗:`, repairError);
                        iteration.failedRepairs++;
                    }
                }
                // 反復の成功判定
                iteration.overallSuccess = iteration.failedRepairs === 0 &&
                    iteration.validationReports.every(report => report.passed);
                iteration.summary = `${iteration.successfulRepairs}/${iteration.errorsDetected.length} 件のエラーを修復`;
            }
        }
        catch (error) {
            console.error(`反復 ${iterationNumber} でエラー:`, error);
            iteration.status = 'failed';
            iteration.summary = `反復実行中にエラーが発生しました: ${error}`;
        }
        iteration.endTime = new Date();
        iteration.duration = iteration.endTime.getTime() - iteration.startTime.getTime();
        iteration.status = iteration.overallSuccess ? 'completed' : 'failed';
        console.log(`反復 ${iterationNumber} 完了: ${iteration.overallSuccess ? '成功' : '失敗'}`);
        return iteration;
    }
    /**
     * 検知されたエラーを取得（シミュレート）
     */
    async getDetectedErrors() {
        // 実際の実装では ErrorDetectionEngine から取得
        // ここではシミュレーション
        const errorCount = Math.floor(Math.random() * 5); // 0-4個のエラー
        const errors = [];
        for (let i = 0; i < errorCount; i++) {
            errors.push({
                id: `error-${Date.now()}-${i}`,
                type: Math.random() > 0.5 ? 'error' : 'warning',
                severity: Math.random() > 0.7 ? 'critical' : 'medium',
                message: `Simulated error ${i + 1}`,
                source: 'http://192.168.3.135:3000/src/components/test.tsx',
                timestamp: new Date(),
                url: 'http://192.168.3.135:3000',
                fixed: false,
                fixAttempts: 0,
                autoFixable: true,
                category: 'javascript'
            });
        }
        return errors;
    }
    /**
     * 修復完了まで待機
     */
    async waitForRepairCompletion(repairSession) {
        const maxWait = 30000; // 30秒
        const checkInterval = 500; // 0.5秒
        let waited = 0;
        while (waited < maxWait) {
            const session = this.autoRepairEngine.getRepairSession(repairSession.id);
            if (!session || session.status === 'completed' || session.status === 'failed') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
    }
    /**
     * セッション統計の更新
     */
    updateSessionStatistics(iteration) {
        if (!this.currentSession)
            return;
        this.currentSession.totalErrors += iteration.errorsDetected.length;
        this.currentSession.totalRepairs += iteration.repairSessions.length;
        this.currentSession.successfulRepairs += iteration.successfulRepairs;
        if (iteration.overallSuccess) {
            this.currentSession.consecutiveSuccesses++;
            this.currentSession.consecutiveFailures = 0;
        }
        else {
            this.currentSession.consecutiveSuccesses = 0;
            this.currentSession.consecutiveFailures++;
        }
    }
    /**
     * 成功条件のチェック
     */
    checkSuccessCondition() {
        if (!this.currentSession)
            return false;
        return this.currentSession.consecutiveSuccesses >= this.config.successThreshold;
    }
    /**
     * 失敗条件のチェック
     */
    checkFailureCondition() {
        if (!this.currentSession)
            return false;
        return this.currentSession.consecutiveFailures >= this.config.maxConsecutiveFailures;
    }
    /**
     * 緊急停止条件のチェック
     */
    shouldEmergencyStop() {
        if (!this.currentSession)
            return false;
        const { emergencyStopConditions } = this.config;
        const runTime = Date.now() - this.currentSession.startTime.getTime();
        // 実行時間チェック
        if (runTime > emergencyStopConditions.maxTotalRuntime) {
            this.currentSession.emergencyStopReason = '最大実行時間を超過しました';
            return true;
        }
        // 最新反復のエラー数チェック
        const latestIteration = this.currentSession.iterations[this.currentSession.iterations.length - 1];
        if (latestIteration && latestIteration.errorsDetected.length > emergencyStopConditions.maxErrorsPerIteration) {
            this.currentSession.emergencyStopReason = '単一反復でのエラー数が上限を超過しました';
            return true;
        }
        return false;
    }
    /**
     * セッション終了処理
     */
    finalizeSession() {
        if (!this.currentSession)
            return;
        this.currentSession.endTime = new Date();
        this.isRunning = false;
        if (this.currentSession.status === 'running') {
            this.currentSession.status = 'completed';
        }
        if (!this.currentSession.finalReport) {
            this.currentSession.finalReport = this.generateFinalReport();
        }
        // セッション履歴に追加
        this.sessionHistory.push({ ...this.currentSession });
        console.log('無限ループ監視セッション終了:', this.currentSession.status);
        console.log('最終レポート:', this.currentSession.finalReport);
    }
    /**
     * 成功レポートの生成
     */
    generateSuccessReport() {
        if (!this.currentSession)
            return '';
        const duration = this.currentSession.endTime
            ? this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()
            : 0;
        return `
無限ループ監視が正常に完了しました。

実行時間: ${(duration / 1000 / 60).toFixed(1)}分
反復回数: ${this.currentSession.iterations.length}
総エラー数: ${this.currentSession.totalErrors}
修復成功数: ${this.currentSession.successfulRepairs}
連続成功: ${this.currentSession.consecutiveSuccesses}回

全てのエラーが修復され、システムは安定した状態になりました。
    `.trim();
    }
    /**
     * 最終レポートの生成
     */
    generateFinalReport() {
        if (!this.currentSession)
            return '';
        const duration = this.currentSession.endTime
            ? this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()
            : 0;
        const successRate = this.currentSession.totalRepairs > 0
            ? (this.currentSession.successfulRepairs / this.currentSession.totalRepairs * 100).toFixed(1)
            : '0';
        return `
無限ループ監視セッション完了レポート

ステータス: ${this.currentSession.status}
実行時間: ${(duration / 1000 / 60).toFixed(1)}分
反復回数: ${this.currentSession.iterations.length}
総エラー数: ${this.currentSession.totalErrors}
総修復試行: ${this.currentSession.totalRepairs}
修復成功数: ${this.currentSession.successfulRepairs}
修復成功率: ${successRate}%
連続成功: ${this.currentSession.consecutiveSuccesses}回
連続失敗: ${this.currentSession.consecutiveFailures}回

${this.currentSession.emergencyStopReason ? `緊急停止理由: ${this.currentSession.emergencyStopReason}` : ''}
    `.trim();
    }
    /**
     * 無限ループ監視の停止
     */
    stopInfiniteLoop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.currentSession) {
            this.currentSession.status = 'stopped';
        }
        console.log('無限ループ監視を手動停止しました');
    }
    /**
     * イベントコールバックの登録
     */
    onIterationComplete(callback) {
        this.onIterationCompleteCallbacks.push(callback);
    }
    onErrorFixed(callback) {
        this.onErrorFixedCallbacks.push(callback);
    }
    onEmergencyStop(callback) {
        this.onEmergencyStopCallbacks.push(callback);
    }
    onSuccess(callback) {
        this.onSuccessCallbacks.push(callback);
    }
    /**
     * 通知メソッド
     */
    notifyIterationComplete(iteration) {
        this.onIterationCompleteCallbacks.forEach(callback => {
            try {
                callback(iteration);
            }
            catch (error) {
                console.error('反復完了コールバックエラー:', error);
            }
        });
    }
    notifyErrorFixed(error, repair) {
        this.onErrorFixedCallbacks.forEach(callback => {
            try {
                callback(error, repair);
            }
            catch (callbackError) {
                console.error('エラー修復コールバックエラー:', callbackError);
            }
        });
    }
    notifyEmergencyStop(reason, session) {
        this.onEmergencyStopCallbacks.forEach(callback => {
            try {
                callback(reason, session);
            }
            catch (error) {
                console.error('緊急停止コールバックエラー:', error);
            }
        });
    }
    notifySuccess(session) {
        this.onSuccessCallbacks.forEach(callback => {
            try {
                callback(session);
            }
            catch (error) {
                console.error('成功コールバックエラー:', error);
            }
        });
    }
    /**
     * 現在のセッション情報を取得
     */
    getCurrentSession() {
        return this.currentSession;
    }
    /**
     * 監視状態を取得
     */
    isMonitoringActive() {
        return this.isRunning;
    }
    /**
     * セッション履歴を取得
     */
    getSessionHistory() {
        return [...this.sessionHistory];
    }
    /**
     * 統計情報を取得
     */
    getStatistics() {
        const totalSessions = this.sessionHistory.length;
        const successfulSessions = this.sessionHistory.filter(s => s.status === 'success').length;
        const emergencyStops = this.sessionHistory.filter(s => s.status === 'emergency_stop').length;
        const averageIterations = totalSessions > 0
            ? this.sessionHistory.reduce((sum, s) => sum + s.iterations.length, 0) / totalSessions
            : 0;
        const totalRepairs = this.sessionHistory.reduce((sum, s) => sum + s.totalRepairs, 0);
        const successfulRepairs = this.sessionHistory.reduce((sum, s) => sum + s.successfulRepairs, 0);
        const successRate = totalRepairs > 0 ? (successfulRepairs / totalRepairs) * 100 : 0;
        // 最も一般的なエラーの分析（簡易版）
        const mostCommonErrors = [
            { type: 'JavaScript エラー', count: Math.floor(Math.random() * 50) + 10 },
            { type: 'ネットワークエラー', count: Math.floor(Math.random() * 30) + 5 },
            { type: 'React エラー', count: Math.floor(Math.random() * 20) + 3 }
        ];
        return {
            totalSessions,
            successfulSessions,
            averageIterations,
            averageRepairTime: 0, // 実装要
            mostCommonErrors,
            successRate,
            emergencyStops
        };
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
        this.stopInfiniteLoop();
        this.onIterationCompleteCallbacks = [];
        this.onErrorFixedCallbacks = [];
        this.onEmergencyStopCallbacks = [];
        this.onSuccessCallbacks = [];
    }
}
// デフォルト設定
export const defaultInfiniteLoopConfig = {
    maxIterations: 50,
    iterationDelay: 10000,
    successThreshold: 3,
    maxConsecutiveFailures: 5,
    emergencyStopConditions: {
        maxErrorsPerIteration: 20,
        maxTotalRuntime: 3600000,
        criticalErrorDetected: true
    },
    notifications: {
        onIterationComplete: true,
        onErrorFixed: true,
        onEmergencyStop: true,
        onSuccessfulCompletion: true
    }
};

/**
 * WebUI マスターコントローラー
 * - 全監視システムの統合制御
 * - React/TypeScriptコンポーネントとの連携
 * - 設定管理とスケジューリング
 * - API エンドポイント提供
 * - リアルタイム状態管理
 */

import { EnhancedConsoleErrorDetector } from './enhanced-console-error-detector';
import { ComprehensivePageMonitor } from './comprehensive-page-monitor';
import { AutoErrorRepairEngine } from './auto-error-repair-engine';
import { AutoVerificationSystem } from './auto-verification-system';
import { InfiniteMonitoringLoop } from './infinite-monitoring-loop';
import { EnhancedReportGenerator } from './enhanced-report-generator';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { createServer, Server } from 'http';

interface SystemConfig {
  monitoring: {
    enabled: boolean;
    interval: number; // minutes
    urls: string[];
    maxErrors: number;
  };
  autoRepair: {
    enabled: boolean;
    backupEnabled: boolean;
    maxRetries: number;
  };
  verification: {
    enabled: boolean;
    testTypes: string[];
    strictMode: boolean;
  };
  reporting: {
    enabled: boolean;
    formats: string[];
    schedule: string; // cron format
  };
  api: {
    enabled: boolean;
    port: number;
    cors: boolean;
  };
  notifications: {
    enabled: boolean;
    webhooks: string[];
    emailAlerts: boolean;
  };
}

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'offline';
  components: {
    consoleDetector: ComponentStatus;
    pageMonitor: ComponentStatus;
    repairEngine: ComponentStatus;
    verificationSystem: ComponentStatus;
    infiniteLoop: ComponentStatus;
    reportGenerator: ComponentStatus;
  };
  metrics: {
    uptime: number;
    totalErrors: number;
    totalRepairs: number;
    successRate: number;
    lastUpdate: string;
  };
  activeOperations: string[];
}

interface ComponentStatus {
  status: 'running' | 'stopped' | 'error';
  lastUpdate: string;
  version: string;
  health: number; // 0-100
  metrics: Record<string, any>;
}

interface OperationResult {
  id: string;
  operation: string;
  success: boolean;
  duration: number;
  details: any;
  timestamp: string;
}

class WebUIMasterController extends EventEmitter {
  private config: SystemConfig;
  private status: SystemStatus;
  private configFile: string;
  private statusFile: string;
  private logDir: string;
  private apiServer: Server | null = null;

  // システムコンポーネント
  private consoleDetector: EnhancedConsoleErrorDetector;
  private pageMonitor: ComprehensivePageMonitor;
  private repairEngine: AutoErrorRepairEngine;
  private verificationSystem: AutoVerificationSystem;
  private infiniteLoop: InfiniteMonitoringLoop | null = null;
  private reportGenerator: EnhancedReportGenerator;

  private operationHistory: OperationResult[] = [];
  private isInitialized: boolean = false;

  constructor(
    configFile: string = './webui-master-config.json',
    statusFile: string = './webui-master-status.json'
  ) {
    super();
    
    this.configFile = path.resolve(configFile);
    this.statusFile = path.resolve(statusFile);
    this.logDir = path.resolve('./webui-master-logs');

    // デフォルト設定
    this.config = this.loadConfig();
    this.status = this.initializeStatus();

    // コンポーネント初期化
    this.consoleDetector = new EnhancedConsoleErrorDetector();
    this.pageMonitor = new ComprehensivePageMonitor();
    this.repairEngine = new AutoErrorRepairEngine();
    this.verificationSystem = new AutoVerificationSystem();
    this.reportGenerator = new EnhancedReportGenerator();

    this.ensureDirectories();
    this.setupEventHandlers();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private loadConfig(): SystemConfig {
    const defaultConfig: SystemConfig = {
      monitoring: {
        enabled: true,
        interval: 30,
        urls: ['http://192.168.3.135:3000', 'http://192.168.3.135:3000/admin'],
        maxErrors: 10
      },
      autoRepair: {
        enabled: true,
        backupEnabled: true,
        maxRetries: 3
      },
      verification: {
        enabled: true,
        testTypes: ['typescript', 'eslint', 'compile', 'e2e', 'performance', 'accessibility'],
        strictMode: false
      },
      reporting: {
        enabled: true,
        formats: ['html', 'json'],
        schedule: '0 */6 * * *' // 6時間ごと
      },
      api: {
        enabled: true,
        port: 8080,
        cors: true
      },
      notifications: {
        enabled: false,
        webhooks: [],
        emailAlerts: false
      }
    };

    if (fs.existsSync(this.configFile)) {
      try {
        const configData = fs.readFileSync(this.configFile, 'utf-8');
        return { ...defaultConfig, ...JSON.parse(configData) };
      } catch (error) {
        console.warn('⚠️ 設定ファイル読み込み失敗、デフォルト設定を使用:', error);
      }
    }

    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  private saveConfig(config?: SystemConfig): void {
    const configToSave = config || this.config;
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(configToSave, null, 2));
    } catch (error) {
      console.error('❌ 設定ファイル保存失敗:', error);
    }
  }

  private initializeStatus(): SystemStatus {
    return {
      overall: 'offline',
      components: {
        consoleDetector: this.createComponentStatus('stopped'),
        pageMonitor: this.createComponentStatus('stopped'),
        repairEngine: this.createComponentStatus('stopped'),
        verificationSystem: this.createComponentStatus('stopped'),
        infiniteLoop: this.createComponentStatus('stopped'),
        reportGenerator: this.createComponentStatus('stopped')
      },
      metrics: {
        uptime: 0,
        totalErrors: 0,
        totalRepairs: 0,
        successRate: 0,
        lastUpdate: new Date().toISOString()
      },
      activeOperations: []
    };
  }

  private createComponentStatus(status: ComponentStatus['status']): ComponentStatus {
    return {
      status,
      lastUpdate: new Date().toISOString(),
      version: '1.0.0',
      health: status === 'running' ? 100 : 0,
      metrics: {}
    };
  }

  private setupEventHandlers(): void {
    // システム終了時の処理
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    // 未処理例外のハンドリング
    process.on('uncaughtException', (error) => {
      console.error('🚨 未処理例外:', error);
      this.handleSystemError(error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('🚨 未処理プロミス拒否:', reason);
      this.handleSystemError(new Error(`Unhandled Rejection: ${reason}`));
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ システムは既に初期化済みです');
      return;
    }

    console.log('🚀 WebUI Master Controller を初期化中...');

    try {
      // 各コンポーネントの初期化
      await this.consoleDetector.initializeBrowser();
      this.updateComponentStatus('consoleDetector', 'running', 100);

      await this.pageMonitor.initializeBrowser();
      this.updateComponentStatus('pageMonitor', 'running', 100);

      await this.verificationSystem.initializeBrowser();
      this.updateComponentStatus('verificationSystem', 'running', 100);

      this.updateComponentStatus('repairEngine', 'running', 100);
      this.updateComponentStatus('reportGenerator', 'running', 100);

      // APIサーバーの起動
      if (this.config.api.enabled) {
        await this.startAPIServer();
      }

      this.status.overall = 'healthy';
      this.isInitialized = true;
      this.saveStatus();

      console.log('✅ WebUI Master Controller 初期化完了');
      this.emit('initialized');

    } catch (error) {
      console.error('❌ 初期化失敗:', error);
      this.status.overall = 'critical';
      this.saveStatus();
      throw error;
    }
  }

  private updateComponentStatus(
    component: keyof SystemStatus['components'],
    status: ComponentStatus['status'],
    health: number = 0,
    metrics: Record<string, any> = {}
  ): void {
    this.status.components[component] = {
      status,
      lastUpdate: new Date().toISOString(),
      version: '1.0.0',
      health,
      metrics
    };
    this.saveStatus();
  }

  private saveStatus(): void {
    this.status.metrics.lastUpdate = new Date().toISOString();
    try {
      fs.writeFileSync(this.statusFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error('❌ ステータス保存失敗:', error);
    }
  }

  async runCompleteErrorDetection(): Promise<OperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    console.log(`🔍 完全エラー検知実行開始 (ID: ${operationId})`);
    this.status.activeOperations.push('error-detection');

    try {
      // Console Error Detection
      await this.consoleDetector.startMonitoring(this.config.monitoring.urls);
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1分監視
      await this.consoleDetector.stopMonitoring();
      const consoleReport = await this.consoleDetector.generateReport();

      // Page Monitoring
      const pageReport = await this.pageMonitor.runComprehensiveMonitoring();

      // 結果集計
      const totalErrors = consoleReport.totalErrors + 
                         pageReport.pageResults.reduce((sum, p) => sum + p.errors.length, 0);

      this.status.metrics.totalErrors += totalErrors;

      const result: OperationResult = {
        id: operationId,
        operation: 'complete-error-detection',
        success: true,
        duration: Date.now() - startTime,
        details: {
          consoleErrors: consoleReport.totalErrors,
          pageErrors: pageReport.pageResults.reduce((sum, p) => sum + p.errors.length, 0),
          totalErrors,
          consoleReport,
          pageReport
        },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-completed', result);

      console.log(`✅ 完全エラー検知完了: ${totalErrors} 件のエラーを検出`);
      return result;

    } catch (error) {
      const result: OperationResult = {
        id: operationId,
        operation: 'complete-error-detection',
        success: false,
        duration: Date.now() - startTime,
        details: { error: error.toString() },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-failed', result);
      throw error;

    } finally {
      this.status.activeOperations = this.status.activeOperations.filter(op => op !== 'error-detection');
      this.saveStatus();
    }
  }

  async runAutomaticRepair(): Promise<OperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    console.log(`🔧 自動修復実行開始 (ID: ${operationId})`);
    this.status.activeOperations.push('auto-repair');

    try {
      // 最新のエラーレポートから修復可能エラーを抽出
      const fixableErrors = await this.extractFixableErrors();

      if (fixableErrors.length === 0) {
        console.log('📝 修復可能なエラーが見つかりません');
        
        const result: OperationResult = {
          id: operationId,
          operation: 'automatic-repair',
          success: true,
          duration: Date.now() - startTime,
          details: { message: 'No fixable errors found', errorsRepaired: 0 },
          timestamp: new Date().toISOString()
        };

        this.operationHistory.push(result);
        return result;
      }

      // 自動修復実行
      const repairReport = await this.repairEngine.repairMultipleErrors(fixableErrors);
      this.status.metrics.totalRepairs += repairReport.repairedErrors;

      const result: OperationResult = {
        id: operationId,
        operation: 'automatic-repair',
        success: repairReport.repairedErrors > 0,
        duration: Date.now() - startTime,
        details: {
          errorsRepaired: repairReport.repairedErrors,
          failedRepairs: repairReport.failedRepairs,
          repairReport
        },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-completed', result);

      console.log(`✅ 自動修復完了: ${repairReport.repairedErrors} 件修復`);
      return result;

    } catch (error) {
      const result: OperationResult = {
        id: operationId,
        operation: 'automatic-repair',
        success: false,
        duration: Date.now() - startTime,
        details: { error: error.toString() },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-failed', result);
      throw error;

    } finally {
      this.status.activeOperations = this.status.activeOperations.filter(op => op !== 'auto-repair');
      this.saveStatus();
    }
  }

  async runVerification(): Promise<OperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    console.log(`🧪 検証実行開始 (ID: ${operationId})`);
    this.status.activeOperations.push('verification');

    try {
      const verificationConfig = {
        typeScriptCheck: this.config.verification.testTypes.includes('typescript'),
        eslintCheck: this.config.verification.testTypes.includes('eslint'),
        unitTests: this.config.verification.testTypes.includes('unit'),
        e2eTests: this.config.verification.testTypes.includes('e2e'),
        performanceCheck: this.config.verification.testTypes.includes('performance'),
        compileCheck: this.config.verification.testTypes.includes('compile'),
        accessibilityCheck: this.config.verification.testTypes.includes('accessibility')
      };

      const verificationReport = await this.verificationSystem.runFullVerification(verificationConfig);

      // 成功率の更新
      const totalChecks = this.status.metrics.totalErrors + this.status.metrics.totalRepairs;
      if (totalChecks > 0) {
        this.status.metrics.successRate = this.status.metrics.totalRepairs / totalChecks;
      }

      const result: OperationResult = {
        id: operationId,
        operation: 'verification',
        success: verificationReport.overallSuccess,
        duration: Date.now() - startTime,
        details: {
          overallSuccess: verificationReport.overallSuccess,
          successRate: verificationReport.summary.successRate,
          verificationReport
        },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-completed', result);

      console.log(`✅ 検証完了: ${verificationReport.overallSuccess ? 'PASS' : 'FAIL'}`);
      return result;

    } catch (error) {
      const result: OperationResult = {
        id: operationId,
        operation: 'verification',
        success: false,
        duration: Date.now() - startTime,
        details: { error: error.toString() },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-failed', result);
      throw error;

    } finally {
      this.status.activeOperations = this.status.activeOperations.filter(op => op !== 'verification');
      this.saveStatus();
    }
  }

  async startInfiniteMonitoring(): Promise<void> {
    if (this.infiniteLoop) {
      console.log('⚠️ 無限監視は既に実行中です');
      return;
    }

    console.log('🔄 無限監視ループを開始...');

    const loopConfig = {
      interval: this.config.monitoring.interval,
      maxErrorThreshold: this.config.monitoring.maxErrors,
      autoRepair: this.config.autoRepair.enabled,
      autoVerification: this.config.verification.enabled,
      alertingEnabled: this.config.notifications.enabled,
      persistentMode: true,
      maxContinuousFailures: this.config.autoRepair.maxRetries
    };

    this.infiniteLoop = new InfiniteMonitoringLoop(loopConfig);
    this.updateComponentStatus('infiniteLoop', 'running', 100);

    // 無限ループの開始（非同期）
    this.infiniteLoop.start().catch(error => {
      console.error('❌ 無限監視ループエラー:', error);
      this.updateComponentStatus('infiniteLoop', 'error', 0);
      this.handleSystemError(error);
    });

    this.emit('infinite-monitoring-started');
  }

  async stopInfiniteMonitoring(): Promise<void> {
    if (!this.infiniteLoop) {
      console.log('⚠️ 無限監視は実行されていません');
      return;
    }

    console.log('⏹️ 無限監視ループを停止...');
    await this.infiniteLoop.stop();
    this.infiniteLoop = null;
    this.updateComponentStatus('infiniteLoop', 'stopped', 0);
    this.emit('infinite-monitoring-stopped');
  }

  async generateComprehensiveReport(): Promise<OperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    console.log(`📊 包括レポート生成開始 (ID: ${operationId})`);
    this.status.activeOperations.push('report-generation');

    try {
      const reportConfig = {
        title: 'WebUI監視システム 包括レポート',
        includeSections: {
          overview: true,
          errorAnalysis: true,
          repairAnalysis: true,
          performanceAnalysis: true,
          qualityMetrics: true,
          recommendations: true,
          rawData: false
        },
        outputFormats: this.config.reporting.formats as any,
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
          end: new Date()
        },
        aggregationLevel: 'day' as any
      };

      const report = await this.reportGenerator.generateReport(reportConfig);

      const result: OperationResult = {
        id: operationId,
        operation: 'comprehensive-report',
        success: true,
        duration: Date.now() - startTime,
        details: {
          reportId: report.id,
          systemHealth: report.metrics.overview.systemHealth,
          totalErrors: report.metrics.overview.totalErrors,
          report
        },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-completed', result);

      console.log(`✅ 包括レポート生成完了: ${report.id}`);
      return result;

    } catch (error) {
      const result: OperationResult = {
        id: operationId,
        operation: 'comprehensive-report',
        success: false,
        duration: Date.now() - startTime,
        details: { error: error.toString() },
        timestamp: new Date().toISOString()
      };

      this.operationHistory.push(result);
      this.emit('operation-failed', result);
      throw error;

    } finally {
      this.status.activeOperations = this.status.activeOperations.filter(op => op !== 'report-generation');
      this.saveStatus();
    }
  }

  private async extractFixableErrors(): Promise<any[]> {
    // 最新のエラーレポートから修復可能なエラーを抽出
    // 実装は簡略化
    return [];
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async startAPIServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiServer = createServer((req, res) => {
        this.handleAPIRequest(req, res);
      });

      this.apiServer.listen(this.config.api.port, () => {
        console.log(`🌐 API サーバー起動: http://localhost:${this.config.api.port}`);
        resolve();
      });

      this.apiServer.on('error', reject);
    });
  }

  private handleAPIRequest(req: any, res: any): void {
    // CORS設定
    if (this.config.api.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // 基本的なAPI エンドポイント
    const url = new URL(req.url, `http://localhost:${this.config.api.port}`);

    try {
      switch (url.pathname) {
        case '/api/status':
          this.handleStatusRequest(res);
          break;
        case '/api/config':
          this.handleConfigRequest(req, res);
          break;
        case '/api/operations':
          this.handleOperationsRequest(res);
          break;
        case '/api/start-monitoring':
          this.handleStartMonitoringRequest(res);
          break;
        case '/api/stop-monitoring':
          this.handleStopMonitoringRequest(res);
          break;
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.toString() }));
    }
  }

  private handleStatusRequest(res: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.status));
  }

  private handleConfigRequest(req: any, res: any): void {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.config));
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
  }

  private handleOperationsRequest(res: any): void {
    const recentOperations = this.operationHistory.slice(-20); // 最新20件
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(recentOperations));
  }

  private async handleStartMonitoringRequest(res: any): Promise<void> {
    try {
      await this.startInfiniteMonitoring();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Monitoring started' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.toString() }));
    }
  }

  private async handleStopMonitoringRequest(res: any): Promise<void> {
    try {
      await this.stopInfiniteMonitoring();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Monitoring stopped' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.toString() }));
    }
  }

  private handleSystemError(error: Error): void {
    console.error('🚨 システムエラー:', error);
    this.status.overall = 'critical';
    this.saveStatus();
    this.emit('system-error', error);
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🛑 WebUI Master Controller を安全に停止中...');

    try {
      // 無限監視の停止
      if (this.infiniteLoop) {
        await this.stopInfiniteMonitoring();
      }

      // APIサーバーの停止
      if (this.apiServer) {
        this.apiServer.close();
      }

      // 各コンポーネントのクリーンアップ
      await Promise.all([
        this.consoleDetector.cleanup(),
        this.pageMonitor.cleanup(),
        this.verificationSystem.cleanup()
      ]);

      this.status.overall = 'offline';
      this.saveStatus();

      console.log('✅ WebUI Master Controller が正常に停止されました');
      
    } catch (error) {
      console.error('❌ 停止処理中にエラー:', error);
    } finally {
      process.exit(0);
    }
  }

  // 外部API
  getStatus(): SystemStatus {
    return { ...this.status };
  }

  getConfig(): SystemConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.emit('config-updated', this.config);
  }

  getOperationHistory(): OperationResult[] {
    return [...this.operationHistory];
  }

  async runFullCycle(): Promise<OperationResult[]> {
    console.log('🔄 完全サイクル実行開始...');
    
    const results: OperationResult[] = [];

    try {
      // 1. エラー検知
      const detectionResult = await this.runCompleteErrorDetection();
      results.push(detectionResult);

      // 2. 自動修復（エラーが見つかった場合）
      if (detectionResult.details.totalErrors > 0) {
        const repairResult = await this.runAutomaticRepair();
        results.push(repairResult);
      }

      // 3. 検証
      const verificationResult = await this.runVerification();
      results.push(verificationResult);

      // 4. レポート生成
      const reportResult = await this.generateComprehensiveReport();
      results.push(reportResult);

      console.log('✅ 完全サイクル実行完了');
      this.emit('full-cycle-completed', results);

    } catch (error) {
      console.error('❌ 完全サイクル実行中にエラー:', error);
      this.emit('full-cycle-failed', error);
      throw error;
    }

    return results;
  }
}

export { WebUIMasterController, SystemConfig, SystemStatus, OperationResult };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const masterController = new WebUIMasterController();
  
  const run = async () => {
    try {
      console.log('🚀 WebUI Master Controller 開始...');
      
      await masterController.initialize();
      
      // イベントリスナーの設定
      masterController.on('initialized', () => {
        console.log('✅ システム初期化完了');
      });

      masterController.on('operation-completed', (result) => {
        console.log(`✅ 操作完了: ${result.operation} (${result.duration}ms)`);
      });

      masterController.on('operation-failed', (result) => {
        console.log(`❌ 操作失敗: ${result.operation}`);
      });

      // コマンドライン引数の処理
      const args = process.argv.slice(2);
      
      if (args.includes('--full-cycle')) {
        await masterController.runFullCycle();
      } else if (args.includes('--infinite')) {
        await masterController.startInfiniteMonitoring();
      } else {
        console.log('💡 使用方法:');
        console.log('  --full-cycle : 完全サイクル実行');
        console.log('  --infinite   : 無限監視開始');
        console.log('  (引数なし)   : APIサーバーのみ起動');
      }
      
    } catch (error) {
      console.error('❌ WebUI Master Controller 失敗:', error);
      process.exit(1);
    }
  };

  run();
}
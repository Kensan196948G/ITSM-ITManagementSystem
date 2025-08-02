/**
 * MCP Playwright マスターコントローラー
 * 全システムを統合制御する中央管理システム
 */

import { MCPPlaywrightErrorDetector, ErrorDetectionConfig, BrowserError, defaultConfig } from './mcpPlaywrightErrorDetector';
import { AutoRepairEngine, RepairResult } from './autoRepairEngine';
import { InfiniteLoopController, InfiniteLoopConfig, LoopStatus, defaultInfiniteLoopConfig } from './infiniteLoopController';
import { ValidationSystem, ValidationReport } from './validationSystem';

export interface MasterControllerConfig {
  detectorConfig: ErrorDetectionConfig;
  loopConfig: InfiniteLoopConfig;
  enableAutoStart: boolean;
  healthCheckInterval: number;
  reportingInterval: number;
  alertSettings: {
    enableEmailAlerts: boolean;
    enableSlackAlerts: boolean;
    emailRecipients: string[];
    slackWebhook?: string;
    criticalErrorThreshold: number;
  };
  systemSettings: {
    maxConcurrentRepairs: number;
    emergencyStopOnFailure: boolean;
    enableDetailedLogging: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

export interface SystemStatus {
  timestamp: Date;
  isRunning: boolean;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical' | 'offline';
  healthScore: number;
  components: {
    detector: { status: string; health: number };
    repairEngine: { status: string; health: number };
    loopController: { status: string; health: number };
    validation: { status: string; health: number };
  };
  metrics: {
    totalErrors: number;
    successfulRepairs: number;
    failedRepairs: number;
    avgRepairTime: number;
    systemUptime: number;
    currentIteration: number;
  };
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  details?: any;
  acknowledged: boolean;
}

export interface ComprehensiveReport {
  id: string;
  timestamp: Date;
  duration: number;
  systemStatus: SystemStatus;
  detectorReport: any;
  validationReport: ValidationReport | null;
  loopReport: {
    status: LoopStatus | null;
    iterations: any[];
    statistics: any;
  };
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    throughput: number;
  };
  recommendations: string[];
  conclusion: string;
}

export class MCPPlaywrightMasterController {
  private detector: MCPPlaywrightErrorDetector;
  private repairEngine: AutoRepairEngine;
  private loopController: InfiniteLoopController;
  private validationSystem: ValidationSystem;
  
  private config: MasterControllerConfig;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private startTime?: Date;
  private alerts: SystemAlert[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private reportingInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MasterControllerConfig>) {
    this.config = {
      detectorConfig: defaultConfig,
      loopConfig: defaultInfiniteLoopConfig,
      enableAutoStart: false,
      healthCheckInterval: 30000, // 30秒
      reportingInterval: 300000, // 5分
      alertSettings: {
        enableEmailAlerts: false,
        enableSlackAlerts: false,
        emailRecipients: [],
        criticalErrorThreshold: 10,
      },
      systemSettings: {
        maxConcurrentRepairs: 5,
        emergencyStopOnFailure: true,
        enableDetailedLogging: true,
        enablePerformanceMonitoring: true,
      },
      ...config,
    };

    this.detector = new MCPPlaywrightErrorDetector(this.config.detectorConfig);
    this.repairEngine = new AutoRepairEngine();
    this.loopController = new InfiniteLoopController(
      this.config.detectorConfig,
      this.config.loopConfig
    );
    this.validationSystem = new ValidationSystem();
  }

  /**
   * システム全体を初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ システムは既に初期化されています');
      return;
    }

    try {
      console.log('🚀 MCP Playwright マスターコントローラーを初期化中...');

      // 各コンポーネントを初期化
      await this.detector.initialize();
      
      this.isInitialized = true;
      this.addAlert('info', 'system', 'システムが正常に初期化されました');

      console.log('✅ マスターコントローラーの初期化が完了しました');

      if (this.config.enableAutoStart) {
        await this.start();
      }

    } catch (error) {
      this.addAlert('critical', 'system', `初期化エラー: ${error.message}`);
      console.error('❌ システム初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * システム全体を開始
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      console.log('⚠️ システムは既に実行中です');
      return;
    }

    try {
      console.log('🔄 MCP Playwright システムを開始中...');
      
      this.isRunning = true;
      this.startTime = new Date();

      // 監視を開始
      await this.detector.startMonitoring();
      
      // 無限ループコントローラーを開始
      await this.loopController.startInfiniteLoop();

      // ヘルスチェックを開始
      this.startHealthCheck();

      // レポーティングを開始
      this.startReporting();

      this.addAlert('info', 'system', 'システムが正常に開始されました');
      console.log('✅ システムが正常に開始されました');

    } catch (error) {
      this.addAlert('critical', 'system', `開始エラー: ${error.message}`);
      console.error('❌ システム開始に失敗:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * システム全体を停止
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ システムは実行されていません');
      return;
    }

    try {
      console.log('🛑 MCP Playwright システムを停止中...');
      
      this.isRunning = false;

      // ヘルスチェックを停止
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      // レポーティングを停止
      if (this.reportingInterval) {
        clearInterval(this.reportingInterval);
        this.reportingInterval = undefined;
      }

      // 各コンポーネントを停止
      await Promise.all([
        this.detector.stopMonitoring(),
        this.loopController.stopInfiniteLoop(),
      ]);

      // 最終レポートを生成
      await this.generateComprehensiveReport();

      this.addAlert('info', 'system', 'システムが正常に停止されました');
      console.log('✅ システムが正常に停止されました');

    } catch (error) {
      this.addAlert('error', 'system', `停止エラー: ${error.message}`);
      console.error('❌ システム停止中にエラーが発生:', error);
      throw error;
    }
  }

  /**
   * 緊急停止
   */
  async emergencyStop(): Promise<void> {
    console.log('🚨 緊急停止を実行中...');
    
    try {
      // 強制的に停止
      this.isRunning = false;
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      if (this.reportingInterval) {
        clearInterval(this.reportingInterval);
      }

      await Promise.all([
        this.detector.stopMonitoring().catch(e => console.error('Detector stop error:', e)),
        this.loopController.emergencyStopLoop().catch(e => console.error('Loop stop error:', e)),
      ]);

      this.addAlert('critical', 'system', '緊急停止が実行されました');
      console.log('🚨 緊急停止が完了しました');

    } catch (error) {
      console.error('❌ 緊急停止中にエラーが発生:', error);
    }
  }

  /**
   * ヘルスチェックを開始
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ ヘルスチェックエラー:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * ヘルスチェックを実行
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const status = await this.getSystemStatus();
      
      // 重要な問題をチェック
      if (status.healthScore < 30) {
        this.addAlert('critical', 'health', `システムヘルスが危険水準です (スコア: ${status.healthScore.toFixed(1)})`);
        
        if (this.config.systemSettings.emergencyStopOnFailure) {
          await this.emergencyStop();
        }
      } else if (status.healthScore < 60) {
        this.addAlert('warning', 'health', `システムヘルスが低下しています (スコア: ${status.healthScore.toFixed(1)})`);
      }

      // エラー数チェック
      if (status.metrics.totalErrors > this.config.alertSettings.criticalErrorThreshold) {
        this.addAlert('error', 'errors', `エラー数が閾値を超えました: ${status.metrics.totalErrors}`);
      }

      // 修復成功率チェック
      const totalRepairs = status.metrics.successfulRepairs + status.metrics.failedRepairs;
      if (totalRepairs > 0) {
        const successRate = (status.metrics.successfulRepairs / totalRepairs) * 100;
        if (successRate < 50) {
          this.addAlert('warning', 'repairs', `修復成功率が低下しています: ${successRate.toFixed(1)}%`);
        }
      }

    } catch (error) {
      this.addAlert('error', 'health', `ヘルスチェック実行エラー: ${error.message}`);
    }
  }

  /**
   * レポーティングを開始
   */
  private startReporting(): void {
    this.reportingInterval = setInterval(async () => {
      try {
        await this.generateComprehensiveReport();
      } catch (error) {
        console.error('❌ レポート生成エラー:', error);
      }
    }, this.config.reportingInterval);
  }

  /**
   * アラートを追加
   */
  private addAlert(severity: SystemAlert['severity'], component: string, message: string, details?: any): void {
    const alert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      severity,
      component,
      message,
      details,
      acknowledged: false,
    };

    this.alerts.push(alert);
    
    // 古いアラートを削除（最新100件まで保持）
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.log(`🔔 [${severity.toUpperCase()}] ${component}: ${message}`);

    // 重要なアラートは外部通知
    if (severity === 'critical' || severity === 'error') {
      this.sendExternalAlert(alert);
    }
  }

  /**
   * 外部アラート送信
   */
  private async sendExternalAlert(alert: SystemAlert): Promise<void> {
    try {
      // メール通知
      if (this.config.alertSettings.enableEmailAlerts && this.config.alertSettings.emailRecipients.length > 0) {
        await this.sendEmailAlert(alert);
      }

      // Slack通知
      if (this.config.alertSettings.enableSlackAlerts && this.config.alertSettings.slackWebhook) {
        await this.sendSlackAlert(alert);
      }

    } catch (error) {
      console.error('❌ 外部アラート送信エラー:', error);
    }
  }

  /**
   * メールアラート送信（プレースホルダー）
   */
  private async sendEmailAlert(alert: SystemAlert): Promise<void> {
    // 実際の実装では適切なメール送信ライブラリを使用
    console.log('📧 メールアラート送信:', alert.message);
  }

  /**
   * Slackアラート送信（プレースホルダー）
   */
  private async sendSlackAlert(alert: SystemAlert): Promise<void> {
    // 実際の実装では適切なSlack APIを使用
    console.log('💬 Slackアラート送信:', alert.message);
  }

  /**
   * システムステータスを取得
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const detectorStatus = this.detector.getStatus();
    const loopStatus = this.loopController.getStatus();
    const repairStats = this.repairEngine.getRepairStatistics();
    const validationReport = this.validationSystem.getLatestValidationResult();

    // コンポーネント健康度を計算
    const detectorHealth = detectorStatus.isMonitoring ? 
      (detectorStatus.totalErrors > 0 ? Math.max(0, 100 - detectorStatus.totalErrors * 5) : 100) : 0;
    
    const repairHealth = repairStats.totalRepairs > 0 ?
      parseFloat(repairStats.successRate.replace('%', '')) : 100;
    
    const loopHealth = loopStatus.isRunning ? 
      loopStatus.overallHealthScore : 0;
    
    const validationHealth = validationReport ? 
      validationReport.overallScore : 100;

    // 全体健康度を計算
    const overallHealth = (detectorHealth + repairHealth + loopHealth + validationHealth) / 4;

    // システム健康状態を判定
    let systemHealth: SystemStatus['systemHealth'];
    if (overallHealth >= 90) systemHealth = 'excellent';
    else if (overallHealth >= 75) systemHealth = 'good';
    else if (overallHealth >= 50) systemHealth = 'warning';
    else if (overallHealth > 0) systemHealth = 'critical';
    else systemHealth = 'offline';

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      timestamp: new Date(),
      isRunning: this.isRunning,
      systemHealth,
      healthScore: overallHealth,
      components: {
        detector: { status: detectorStatus.isMonitoring ? 'running' : 'stopped', health: detectorHealth },
        repairEngine: { status: 'ready', health: repairHealth },
        loopController: { status: loopStatus.isRunning ? 'running' : 'stopped', health: loopHealth },
        validation: { status: 'ready', health: validationHealth },
      },
      metrics: {
        totalErrors: detectorStatus.totalErrors,
        successfulRepairs: repairStats.successfulRepairs,
        failedRepairs: repairStats.totalRepairs - repairStats.successfulRepairs,
        avgRepairTime: 0, // 実際の実装では適切な計算が必要
        systemUptime: uptime,
        currentIteration: loopStatus.currentIteration,
      },
      alerts: this.alerts.slice(-10), // 最新10件のアラート
    };
  }

  /**
   * 包括的レポートを生成
   */
  async generateComprehensiveReport(): Promise<ComprehensiveReport> {
    const startTime = Date.now();
    
    try {
      console.log('📊 包括的レポートを生成中...');

      const systemStatus = await this.getSystemStatus();
      const detectorReport = this.detector.generateReport();
      const validationReport = this.validationSystem.getLatestValidationResult();
      const loopStatus = this.loopController.getStatus();
      const loopIterations = this.loopController.getIterationHistory();
      const repairStats = this.repairEngine.getRepairStatistics();

      // パフォーマンスメトリクスを取得（プレースホルダー）
      const performanceMetrics = {
        memoryUsage: 0, // 実際の実装では適切な計算が必要
        cpuUsage: 0,
        responseTime: 0,
        throughput: 0,
      };

      // 推奨事項を生成
      const recommendations = this.generateRecommendations(systemStatus, validationReport);

      // 結論を生成
      const conclusion = this.generateConclusion(systemStatus);

      const report: ComprehensiveReport = {
        id: `report-${Date.now()}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        systemStatus,
        detectorReport,
        validationReport,
        loopReport: {
          status: loopStatus,
          iterations: loopIterations,
          statistics: repairStats,
        },
        performanceMetrics,
        recommendations,
        conclusion,
      };

      // レポートを保存
      await this.saveReport(report);

      console.log('✅ 包括的レポートが生成されました');
      return report;

    } catch (error) {
      console.error('❌ レポート生成エラー:', error);
      throw error;
    }
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(systemStatus: SystemStatus, validationReport: ValidationReport | null): string[] {
    const recommendations: string[] = [];

    if (systemStatus.healthScore < 80) {
      recommendations.push('システム全体の健康度が低下しています。詳細な診断を実行してください。');
    }

    if (systemStatus.metrics.totalErrors > 5) {
      recommendations.push('エラー数が多いため、アプリケーションの基本的な問題を修正してください。');
    }

    const totalRepairs = systemStatus.metrics.successfulRepairs + systemStatus.metrics.failedRepairs;
    if (totalRepairs > 0) {
      const successRate = (systemStatus.metrics.successfulRepairs / totalRepairs) * 100;
      if (successRate < 70) {
        recommendations.push('修復成功率が低いため、修復ルールの見直しを検討してください。');
      }
    }

    if (validationReport) {
      if (validationReport.summary.accessibility.score < 80) {
        recommendations.push('アクセシビリティスコアが低いため、ARIA属性とalt属性の改善が必要です。');
      }
      
      if (validationReport.summary.performance.score < 80) {
        recommendations.push('パフォーマンススコアが低いため、読み込み時間の最適化が必要です。');
      }
    }

    if (this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length > 0) {
      recommendations.push('未確認の重要なアラートがあります。すぐに確認してください。');
    }

    return recommendations;
  }

  /**
   * 結論を生成
   */
  private generateConclusion(systemStatus: SystemStatus): string {
    if (systemStatus.systemHealth === 'excellent') {
      return 'システムは優秀な状態で動作しており、すべてのコンポーネントが正常に機能しています。';
    } else if (systemStatus.systemHealth === 'good') {
      return 'システムは良好な状態で動作していますが、いくつかの小さな改善点があります。';
    } else if (systemStatus.systemHealth === 'warning') {
      return 'システムに警告レベルの問題があります。監視を継続し、必要に応じて手動介入を検討してください。';
    } else if (systemStatus.systemHealth === 'critical') {
      return 'システムに重大な問題があります。すぐに手動での修復作業が必要です。';
    } else {
      return 'システムがオフラインまたは未初期化状態です。システムの再起動を検討してください。';
    }
  }

  /**
   * レポートを保存
   */
  private async saveReport(report: ComprehensiveReport): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const reportDir = path.join(process.cwd(), 'comprehensive-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportDir, `comprehensive-report-${timestamp}.json`);
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      console.log(`📋 包括的レポートを保存: ${reportFile}`);

    } catch (error) {
      console.error('❌ レポート保存エラー:', error);
    }
  }

  /**
   * アラートを確認済みにマーク
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ アラートを確認済みにマーク: ${alertId}`);
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<MasterControllerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ マスターコントローラーの設定を更新しました');
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): MasterControllerConfig {
    return { ...this.config };
  }

  /**
   * システムが初期化済みかチェック
   */
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * システムが実行中かチェック
   */
  isSystemRunning(): boolean {
    return this.isRunning;
  }
}

// デフォルト設定
export const defaultMasterControllerConfig: MasterControllerConfig = {
  detectorConfig: defaultConfig,
  loopConfig: defaultInfiniteLoopConfig,
  enableAutoStart: false,
  healthCheckInterval: 30000,
  reportingInterval: 300000,
  alertSettings: {
    enableEmailAlerts: false,
    enableSlackAlerts: false,
    emailRecipients: [],
    criticalErrorThreshold: 10,
  },
  systemSettings: {
    maxConcurrentRepairs: 5,
    emergencyStopOnFailure: true,
    enableDetailedLogging: true,
    enablePerformanceMonitoring: true,
  },
};
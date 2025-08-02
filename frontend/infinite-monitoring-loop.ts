/**
 * 無限ループ継続監視システム
 * - エラー検知・修復・検証の自動ループ
 * - 24/7 継続監視
 * - 自動回復機能
 * - 状態管理とレポート生成
 */

import { EnhancedConsoleErrorDetector } from './enhanced-console-error-detector';
import { ComprehensivePageMonitor } from './comprehensive-page-monitor';
import { AutoErrorRepairEngine } from './auto-error-repair-engine';
import { AutoVerificationSystem } from './auto-verification-system';
import * as fs from 'fs';
import * as path from 'path';

interface MonitoringConfig {
  interval: number; // 監視間隔（分）
  maxErrorThreshold: number; // エラー閾値
  autoRepair: boolean; // 自動修復有効
  autoVerification: boolean; // 自動検証有効
  alertingEnabled: boolean; // アラート有効
  persistentMode: boolean; // 永続化モード
  maxContinuousFailures: number; // 連続失敗許容数
}

interface LoopState {
  sessionId: string;
  startTime: string;
  currentCycle: number;
  totalErrors: number;
  totalRepairs: number;
  totalVerifications: number;
  consecutiveFailures: number;
  lastSuccessfulCycle: number;
  isRunning: boolean;
  status: 'healthy' | 'warning' | 'critical' | 'stopped';
  systemHealth: {
    errorRate: number;
    repairRate: number;
    verificationRate: number;
    averageCycleTime: number;
    uptime: number;
  };
}

interface CycleResult {
  cycleNumber: number;
  startTime: string;
  endTime: string;
  duration: number;
  errorsDetected: number;
  errorsRepaired: number;
  verificationPassed: boolean;
  status: 'success' | 'warning' | 'failure';
  details: {
    consoleErrors: number;
    pageErrors: number;
    networkErrors: number;
    performanceIssues: number;
    accessibilityIssues: number;
  };
  actions: string[];
  nextCycleDelay: number;
}

interface MonitoringReport {
  sessionId: string;
  reportTime: string;
  config: MonitoringConfig;
  state: LoopState;
  recentCycles: CycleResult[];
  systemMetrics: {
    totalCycles: number;
    averageErrorsPerCycle: number;
    repairSuccessRate: number;
    systemAvailability: number;
    meanTimeToRecovery: number;
  };
  alertsGenerated: string[];
  recommendations: string[];
}

class InfiniteMonitoringLoop {
  private config: MonitoringConfig;
  private state: LoopState;
  private stateFile: string;
  private reportDir: string;
  private recentCycles: CycleResult[] = [];
  private consoleDetector: EnhancedConsoleErrorDetector;
  private pageMonitor: ComprehensivePageMonitor;
  private repairEngine: AutoErrorRepairEngine;
  private verificationSystem: AutoVerificationSystem;
  private isShuttingDown: boolean = false;

  constructor(
    config: Partial<MonitoringConfig> = {},
    stateFile: string = './infinite-monitoring-state.json',
    reportDir: string = './infinite-monitoring-reports'
  ) {
    this.config = {
      interval: 30, // 30分間隔
      maxErrorThreshold: 10,
      autoRepair: true,
      autoVerification: true,
      alertingEnabled: true,
      persistentMode: true,
      maxContinuousFailures: 3,
      ...config
    };

    this.stateFile = path.resolve(stateFile);
    this.reportDir = path.resolve(reportDir);

    // システムコンポーネントの初期化
    this.consoleDetector = new EnhancedConsoleErrorDetector();
    this.pageMonitor = new ComprehensivePageMonitor();
    this.repairEngine = new AutoErrorRepairEngine();
    this.verificationSystem = new AutoVerificationSystem();

    // 状態の初期化またはロード
    this.state = this.loadState();
    
    this.ensureReportDirectory();
    this.setupSignalHandlers();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      console.log('\n⏹️ 無限監視ループの停止要求を受信...');
      this.gracefulShutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\n⏹️ 無限監視ループの終了要求を受信...');
      this.gracefulShutdown();
    });

    // 未処理例外のハンドリング
    process.on('uncaughtException', (error) => {
      console.error('🚨 未処理例外:', error);
      this.handleSystemFailure(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 未処理プロミス拒否:', reason);
      this.handleSystemFailure(new Error(`Unhandled Rejection: ${reason}`));
    });
  }

  private loadState(): LoopState {
    if (fs.existsSync(this.stateFile)) {
      try {
        const stateData = fs.readFileSync(this.stateFile, 'utf-8');
        const savedState = JSON.parse(stateData);
        
        // 既存セッションの継続
        console.log(`📁 既存セッション復元: ${savedState.sessionId}`);
        return {
          ...savedState,
          isRunning: false // 停止状態で復元
        };
      } catch (error) {
        console.warn('⚠️ 状態ファイル読み込み失敗、新規セッション開始:', error);
      }
    }

    // 新規セッション
    const sessionId = `infinite_monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆕 新規監視セッション開始: ${sessionId}`);
    
    return {
      sessionId,
      startTime: new Date().toISOString(),
      currentCycle: 0,
      totalErrors: 0,
      totalRepairs: 0,
      totalVerifications: 0,
      consecutiveFailures: 0,
      lastSuccessfulCycle: 0,
      isRunning: false,
      status: 'healthy',
      systemHealth: {
        errorRate: 0,
        repairRate: 0,
        verificationRate: 0,
        averageCycleTime: 0,
        uptime: 0
      }
    };
  }

  private saveState(): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('❌ 状態保存失敗:', error);
    }
  }

  private async initializeComponents(): Promise<void> {
    console.log('🚀 監視システムコンポーネントを初期化中...');
    
    try {
      await this.consoleDetector.initializeBrowser();
      await this.pageMonitor.initializeBrowser();
      await this.verificationSystem.initializeBrowser();
      
      console.log('✅ 全コンポーネント初期化完了');
    } catch (error) {
      console.error('❌ コンポーネント初期化失敗:', error);
      throw error;
    }
  }

  private async runSingleCycle(): Promise<CycleResult> {
    const cycleNumber = ++this.state.currentCycle;
    const startTime = new Date();
    
    console.log(`\n🔄 監視サイクル ${cycleNumber} 開始...`);

    const result: CycleResult = {
      cycleNumber,
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
      errorsDetected: 0,
      errorsRepaired: 0,
      verificationPassed: false,
      status: 'success',
      details: {
        consoleErrors: 0,
        pageErrors: 0,
        networkErrors: 0,
        performanceIssues: 0,
        accessibilityIssues: 0
      },
      actions: [],
      nextCycleDelay: this.config.interval * 60 * 1000
    };

    try {
      // Phase 1: エラー検知
      console.log('🔍 Phase 1: エラー検知実行中...');
      
      // コンソールエラー検知
      const urls = ['http://192.168.3.135:3000', 'http://192.168.3.135:3000/admin'];
      await this.consoleDetector.startMonitoring(urls);
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30秒監視
      await this.consoleDetector.stopMonitoring();
      const consoleReport = await this.consoleDetector.generateReport();
      
      // ページ監視
      const pageReport = await this.pageMonitor.runComprehensiveMonitoring();
      
      // エラー集計
      result.details.consoleErrors = consoleReport.totalErrors;
      result.details.pageErrors = pageReport.errorPages;
      result.errorsDetected = consoleReport.totalErrors + 
                              pageReport.pageResults.reduce((sum, p) => sum + p.errors.length, 0);
      
      this.state.totalErrors += result.errorsDetected;
      result.actions.push(`検知されたエラー: ${result.errorsDetected} 件`);

      // Phase 2: 自動修復（設定により）
      if (this.config.autoRepair && result.errorsDetected > 0) {
        console.log('🔧 Phase 2: 自動修復実行中...');
        
        // 修復可能なエラーを抽出
        const fixableErrors = consoleReport.errors.filter(e => e.fixable);
        
        if (fixableErrors.length > 0) {
          const detectedErrors = fixableErrors.map(e => ({
            id: e.id,
            type: e.category as any,
            severity: e.severity,
            message: e.message,
            source: e.source || '',
            lineNumber: e.lineNumber,
            columnNumber: e.columnNumber,
            stackTrace: e.stackTrace,
            component: e.component,
            fixable: e.fixable
          }));

          const repairReport = await this.repairEngine.repairMultipleErrors(detectedErrors);
          result.errorsRepaired = repairReport.repairedErrors;
          this.state.totalRepairs += result.errorsRepaired;
          
          result.actions.push(`修復されたエラー: ${result.errorsRepaired} 件`);
        }
      }

      // Phase 3: 検証（設定により）
      if (this.config.autoVerification) {
        console.log('🧪 Phase 3: 自動検証実行中...');
        
        const verificationReport = await this.verificationSystem.runFullVerification({
          typeScriptCheck: true,
          eslintCheck: true,
          unitTests: false, // 高速化のためスキップ
          e2eTests: true,
          performanceCheck: true,
          compileCheck: true,
          accessibilityCheck: true
        });

        result.verificationPassed = verificationReport.overallSuccess;
        this.state.totalVerifications++;
        
        result.actions.push(`検証結果: ${verificationReport.overallSuccess ? 'PASS' : 'FAIL'}`);
        
        // 検証失敗時の対応
        if (!verificationReport.overallSuccess) {
          result.status = 'warning';
          this.state.consecutiveFailures++;
          
          if (this.state.consecutiveFailures >= this.config.maxContinuousFailures) {
            result.status = 'failure';
            this.state.status = 'critical';
          }
        } else {
          this.state.consecutiveFailures = 0;
          this.state.lastSuccessfulCycle = cycleNumber;
          this.state.status = 'healthy';
        }
      }

      // サイクル完了処理
      const endTime = new Date();
      result.endTime = endTime.toISOString();
      result.duration = endTime.getTime() - startTime.getTime();

      // 動的間隔調整
      if (result.errorsDetected > this.config.maxErrorThreshold) {
        result.nextCycleDelay = Math.max(this.config.interval * 30 * 1000, 300000); // 最低5分
        result.actions.push('高エラー率のため監視間隔を短縮');
      } else if (result.errorsDetected === 0 && result.verificationPassed) {
        result.nextCycleDelay = this.config.interval * 120 * 1000; // 間隔を延長
        result.actions.push('システム安定のため監視間隔を延長');
      }

      console.log(`✅ サイクル ${cycleNumber} 完了: ${result.status.toUpperCase()} (${Math.round(result.duration / 1000)}秒)`);

    } catch (error) {
      console.error(`❌ サイクル ${cycleNumber} でエラー:`, error);
      
      result.status = 'failure';
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - startTime.getTime();
      result.actions.push(`サイクルエラー: ${error}`);
      
      this.state.consecutiveFailures++;
      
      if (this.state.consecutiveFailures >= this.config.maxContinuousFailures) {
        this.state.status = 'critical';
      }
    }

    // 状態更新
    this.updateSystemHealth(result);
    this.recentCycles.push(result);
    
    // 最新の10サイクルのみ保持
    if (this.recentCycles.length > 10) {
      this.recentCycles = this.recentCycles.slice(-10);
    }

    this.saveState();
    return result;
  }

  private updateSystemHealth(result: CycleResult): void {
    const recentCycles = this.recentCycles.slice(-5); // 直近5サイクル
    
    if (recentCycles.length > 0) {
      this.state.systemHealth.errorRate = 
        recentCycles.reduce((sum, c) => sum + c.errorsDetected, 0) / recentCycles.length;
      
      this.state.systemHealth.repairRate = 
        recentCycles.reduce((sum, c) => sum + c.errorsRepaired, 0) / recentCycles.length;
      
      this.state.systemHealth.verificationRate = 
        recentCycles.filter(c => c.verificationPassed).length / recentCycles.length;
      
      this.state.systemHealth.averageCycleTime = 
        recentCycles.reduce((sum, c) => sum + c.duration, 0) / recentCycles.length;
    }

    // アップタイム計算
    const startTime = new Date(this.state.startTime).getTime();
    this.state.systemHealth.uptime = Date.now() - startTime;
  }

  private async generatePeriodicReport(): Promise<void> {
    const report: MonitoringReport = {
      sessionId: this.state.sessionId,
      reportTime: new Date().toISOString(),
      config: this.config,
      state: this.state,
      recentCycles: this.recentCycles,
      systemMetrics: {
        totalCycles: this.state.currentCycle,
        averageErrorsPerCycle: this.state.totalErrors / Math.max(this.state.currentCycle, 1),
        repairSuccessRate: this.state.totalRepairs / Math.max(this.state.totalErrors, 1),
        systemAvailability: (this.state.currentCycle - this.state.consecutiveFailures) / Math.max(this.state.currentCycle, 1),
        meanTimeToRecovery: this.calculateMTTR()
      },
      alertsGenerated: this.generateAlerts(),
      recommendations: this.generateRecommendations()
    };

    await this.saveMonitoringReport(report);
  }

  private calculateMTTR(): number {
    // 平均復旧時間の計算（簡略化）
    const failureCycles = this.recentCycles.filter(c => c.status === 'failure');
    if (failureCycles.length === 0) return 0;
    
    return failureCycles.reduce((sum, c) => sum + c.duration, 0) / failureCycles.length;
  }

  private generateAlerts(): string[] {
    const alerts: string[] = [];

    if (this.state.status === 'critical') {
      alerts.push(`🚨 CRITICAL: ${this.state.consecutiveFailures} 回連続でサイクルが失敗しています`);
    }

    if (this.state.systemHealth.errorRate > this.config.maxErrorThreshold) {
      alerts.push(`⚠️ WARNING: エラー率が閾値を超えています (${this.state.systemHealth.errorRate.toFixed(2)}/${this.config.maxErrorThreshold})`);
    }

    if (this.state.systemHealth.verificationRate < 0.8) {
      alerts.push(`⚠️ WARNING: 検証成功率が低下しています (${Math.round(this.state.systemHealth.verificationRate * 100)}%)`);
    }

    const uptimeHours = this.state.systemHealth.uptime / (1000 * 60 * 60);
    if (uptimeHours > 168) { // 1週間
      alerts.push(`ℹ️ INFO: システムが${Math.round(uptimeHours)}時間継続稼働中です`);
    }

    return alerts;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.state.systemHealth.errorRate > 5) {
      recommendations.push('🔧 エラー率が高いため、根本原因の調査を推奨します');
    }

    if (this.state.systemHealth.averageCycleTime > 300000) { // 5分以上
      recommendations.push('⚡ サイクル時間が長いため、監視対象の最適化を検討してください');
    }

    if (this.state.consecutiveFailures > 0) {
      recommendations.push('🔍 連続失敗の原因調査と対策を実施してください');
    }

    if (this.state.systemHealth.repairRate > 0.8) {
      recommendations.push('✅ 自動修復率が高く、システムが良好に機能しています');
    }

    recommendations.push('📊 定期的なレポート確認により、システム状態を把握してください');
    recommendations.push('🔄 監視間隔の調整により、効率的な監視を実現できます');

    return recommendations;
  }

  private async saveMonitoringReport(report: MonitoringReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(this.reportDir, `infinite-monitoring-report-${timestamp}.json`);
    const htmlPath = path.join(this.reportDir, `infinite-monitoring-report-${timestamp}.html`);

    // JSON レポート
    await fs.promises.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // HTML レポート
    const htmlContent = this.generateHTMLReport(report);
    await fs.promises.writeFile(htmlPath, htmlContent);

    console.log(`📊 定期レポート保存: ${jsonPath}`);
  }

  private generateHTMLReport(report: MonitoringReport): string {
    const statusColor = {
      'healthy': '#28a745',
      'warning': '#ffc107',
      'critical': '#dc3545',
      'stopped': '#6c757d'
    }[report.state.status];

    const uptimeHours = Math.round(report.state.systemHealth.uptime / (1000 * 60 * 60));

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Infinite Monitoring Loop Report</title>
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
        .status-banner {
            background: ${statusColor};
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
        }
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
        .section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .cycle-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .cycle-item {
            background: #f8f9fa;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 5px solid #ddd;
        }
        .cycle-success { border-left-color: #28a745; background: #d4edda; }
        .cycle-warning { border-left-color: #ffc107; background: #fff3cd; }
        .cycle-failure { border-left-color: #dc3545; background: #f8d7da; }
        .alerts {
            background: #f8d7da;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            border-left: 5px solid #dc3545;
        }
        .recommendations {
            background: #e3f2fd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
        }
        .recommendation-item, .alert-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
        }
        .health-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .health-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 Infinite Monitoring Loop Report</h1>
            <div class="subtitle">Session: ${report.sessionId}</div>
            <div class="subtitle">Generated: ${new Date(report.reportTime).toLocaleString('ja-JP')}</div>
            <div class="subtitle">Uptime: ${uptimeHours} hours</div>
        </div>

        <div class="status-banner">
            システム状態: ${report.state.status.toUpperCase()} | サイクル: ${report.state.currentCycle} | 稼働時間: ${uptimeHours}時間
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.systemMetrics.totalCycles}</div>
                <div class="metric-label">Total Cycles</div>
            </div>
            <div class="metric-card">
                <div class="metric-number error">${report.state.totalErrors}</div>
                <div class="metric-label">Total Errors</div>
            </div>
            <div class="metric-card">
                <div class="metric-number success">${report.state.totalRepairs}</div>
                <div class="metric-label">Auto Repairs</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${Math.round(report.systemMetrics.systemAvailability * 100)}%</div>
                <div class="metric-label">Availability</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${Math.round(report.state.systemHealth.errorRate * 10) / 10}</div>
                <div class="metric-label">Avg Errors/Cycle</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${Math.round(report.systemMetrics.repairSuccessRate * 100)}%</div>
                <div class="metric-label">Repair Rate</div>
            </div>
        </div>

        <div class="section">
            <h2>💊 System Health</h2>
            <div class="health-grid">
                <div class="health-item">
                    <strong>Error Rate</strong><br>
                    ${report.state.systemHealth.errorRate.toFixed(2)} errors/cycle
                </div>
                <div class="health-item">
                    <strong>Repair Rate</strong><br>
                    ${report.state.systemHealth.repairRate.toFixed(2)} repairs/cycle
                </div>
                <div class="health-item">
                    <strong>Verification Rate</strong><br>
                    ${Math.round(report.state.systemHealth.verificationRate * 100)}% success
                </div>
                <div class="health-item">
                    <strong>Avg Cycle Time</strong><br>
                    ${Math.round(report.state.systemHealth.averageCycleTime / 1000)}s
                </div>
                <div class="health-item">
                    <strong>Consecutive Failures</strong><br>
                    ${report.state.consecutiveFailures}
                </div>
                <div class="health-item">
                    <strong>Last Success</strong><br>
                    Cycle #${report.state.lastSuccessfulCycle}
                </div>
            </div>
        </div>

        ${report.alertsGenerated.length > 0 ? `
        <div class="section">
            <h2>🚨 Alerts</h2>
            <div class="alerts">
                ${report.alertsGenerated.map(alert => 
                    `<div class="alert-item">${alert}</div>`
                ).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>🔄 Recent Cycles</h2>
            <div class="cycle-list">
                ${report.recentCycles.slice(-10).reverse().map(cycle => `
                    <div class="cycle-item cycle-${cycle.status}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>Cycle #${cycle.cycleNumber} - ${cycle.status.toUpperCase()}</strong>
                            <span>${Math.round(cycle.duration / 1000)}s</span>
                        </div>
                        <div><strong>Errors:</strong> ${cycle.errorsDetected} detected, ${cycle.errorsRepaired} repaired</div>
                        <div><strong>Verification:</strong> ${cycle.verificationPassed ? 'PASS' : 'FAIL'}</div>
                        <div><strong>Time:</strong> ${new Date(cycle.startTime).toLocaleString('ja-JP')}</div>
                        ${cycle.actions.length > 0 ? `
                            <div><strong>Actions:</strong></div>
                            <ul>
                                ${cycle.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
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
            <h2>⚙️ Configuration</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div><strong>Monitoring Interval:</strong> ${report.config.interval} minutes</div>
                <div><strong>Error Threshold:</strong> ${report.config.maxErrorThreshold}</div>
                <div><strong>Auto Repair:</strong> ${report.config.autoRepair ? 'Enabled' : 'Disabled'}</div>
                <div><strong>Auto Verification:</strong> ${report.config.autoVerification ? 'Enabled' : 'Disabled'}</div>
                <div><strong>Alerting:</strong> ${report.config.alertingEnabled ? 'Enabled' : 'Disabled'}</div>
                <div><strong>Max Failures:</strong> ${report.config.maxContinuousFailures}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  private async handleSystemFailure(error: Error): Promise<void> {
    console.error('🚨 システム障害発生:', error);
    
    this.state.status = 'critical';
    this.state.consecutiveFailures++;
    
    try {
      // 緊急レポート生成
      await this.generatePeriodicReport();
      
      // 状態保存
      this.saveState();
      
      // 自動復旧試行
      if (this.state.consecutiveFailures < this.config.maxContinuousFailures) {
        console.log('🔄 自動復旧を試行します...');
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1分待機
        
        try {
          await this.initializeComponents();
          console.log('✅ 自動復旧成功');
          this.state.consecutiveFailures = 0;
          this.state.status = 'healthy';
        } catch (recoveryError) {
          console.error('❌ 自動復旧失敗:', recoveryError);
        }
      }
      
    } catch (handlingError) {
      console.error('❌ 障害処理中にエラー:', handlingError);
    }
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('⚠️ 監視ループは既に実行中です');
      return;
    }

    console.log('🚀 無限監視ループを開始...');
    console.log(`📋 設定: ${this.config.interval}分間隔, 自動修復=${this.config.autoRepair}, 自動検証=${this.config.autoVerification}`);

    this.state.isRunning = true;
    this.state.status = 'healthy';
    this.saveState();

    try {
      await this.initializeComponents();
      
      let lastReportTime = Date.now();
      const reportInterval = 3600000; // 1時間ごとにレポート生成

      while (this.state.isRunning && !this.isShuttingDown) {
        try {
          // サイクル実行
          const cycleResult = await this.runSingleCycle();
          
          // 定期レポート生成
          if (Date.now() - lastReportTime > reportInterval) {
            await this.generatePeriodicReport();
            lastReportTime = Date.now();
          }

          // 次サイクルまでの待機
          if (this.state.isRunning && !this.isShuttingDown) {
            console.log(`⏰ 次サイクルまで ${Math.round(cycleResult.nextCycleDelay / 60000)} 分待機...`);
            await new Promise(resolve => setTimeout(resolve, cycleResult.nextCycleDelay));
          }

        } catch (cycleError) {
          console.error('❌ サイクル実行エラー:', cycleError);
          await this.handleSystemFailure(cycleError as Error);
          
          // 短時間待機後に再試行
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }

    } catch (error) {
      console.error('❌ 監視ループ開始失敗:', error);
      throw error;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('🛑 無限監視ループを安全に停止中...');

    this.state.isRunning = false;
    this.state.status = 'stopped';

    try {
      // 最終レポート生成
      await this.generatePeriodicReport();
      
      // リソースのクリーンアップ
      await Promise.all([
        this.consoleDetector.cleanup(),
        this.pageMonitor.cleanup(),
        this.verificationSystem.cleanup()
      ]);

      // 状態保存
      this.saveState();
      
      console.log('✅ 無限監視ループが正常に停止されました');
      
    } catch (error) {
      console.error('❌ 停止処理中にエラー:', error);
    } finally {
      process.exit(0);
    }
  }

  async stop(): Promise<void> {
    await this.gracefulShutdown();
  }

  getState(): LoopState {
    return { ...this.state };
  }

  getRecentCycles(): CycleResult[] {
    return [...this.recentCycles];
  }
}

export { InfiniteMonitoringLoop, MonitoringConfig, LoopState, CycleResult, MonitoringReport };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const config: Partial<MonitoringConfig> = {
    interval: 30, // 30分間隔
    maxErrorThreshold: 5,
    autoRepair: true,
    autoVerification: true,
    alertingEnabled: true,
    persistentMode: true,
    maxContinuousFailures: 3
  };

  const infiniteLoop = new InfiniteMonitoringLoop(config);
  
  const run = async () => {
    try {
      console.log('🔄 Infinite Monitoring Loop 開始...');
      await infiniteLoop.start();
      
    } catch (error) {
      console.error('❌ Infinite Monitoring Loop 失敗:', error);
      process.exit(1);
    }
  };

  run();
}
#!/usr/bin/env node

/**
 * MCP Playwright ブラウザエラー検知・修復システム起動スクリプト
 * 
 * 使用方法:
 * npm run mcp-playwright:start
 * npm run mcp-playwright:stop
 * npm run mcp-playwright:status
 */

import { MCPPlaywrightMasterController, defaultMasterControllerConfig } from './src/services/mcpPlaywrightMasterController';
import { defaultConfig } from './src/services/mcpPlaywrightErrorDetector';
import { defaultInfiniteLoopConfig } from './src/services/infiniteLoopController';

// 設定オプション
const SYSTEM_CONFIG = {
  ...defaultMasterControllerConfig,
  detectorConfig: {
    ...defaultConfig,
    targetUrls: [
      'http://192.168.3.135:3000',
      'http://192.168.3.135:3000/admin'
    ],
    browsers: ['chromium', 'firefox'] as const,
    monitoringInterval: 10000, // 10秒
    enableScreenshots: true,
    enableTrace: true,
    reportingEnabled: true,
  },
  loopConfig: {
    ...defaultInfiniteLoopConfig,
    maxIterations: 500,
    iterationDelay: 15000, // 15秒
    errorThreshold: 3,
    successThreshold: 3,
    timeoutMinutes: 180, // 3時間
    emergencyStopConditions: {
      maxConsecutiveFailures: 5,
      maxSameErrorRepeats: 10,
      maxRepairAttempts: 100,
    },
  },
  enableAutoStart: true,
  healthCheckInterval: 30000, // 30秒
  reportingInterval: 300000, // 5分
  alertSettings: {
    enableEmailAlerts: false,
    enableSlackAlerts: false,
    emailRecipients: [],
    criticalErrorThreshold: 5,
  },
  systemSettings: {
    maxConcurrentRepairs: 3,
    emergencyStopOnFailure: true,
    enableDetailedLogging: true,
    enablePerformanceMonitoring: true,
  },
};

class MCPPlaywrightSystemRunner {
  private masterController: MCPPlaywrightMasterController;
  private isShuttingDown: boolean = false;

  constructor() {
    this.masterController = new MCPPlaywrightMasterController(SYSTEM_CONFIG);
    this.setupSignalHandlers();
  }

  /**
   * システムを開始
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 MCP Playwright ブラウザエラー検知・修復システムを開始します...');
      console.log('');
      console.log('📋 設定情報:');
      console.log(`   対象URL: ${SYSTEM_CONFIG.detectorConfig.targetUrls.join(', ')}`);
      console.log(`   ブラウザ: ${SYSTEM_CONFIG.detectorConfig.browsers.join(', ')}`);
      console.log(`   監視間隔: ${SYSTEM_CONFIG.detectorConfig.monitoringInterval / 1000}秒`);
      console.log(`   最大イテレーション: ${SYSTEM_CONFIG.loopConfig.maxIterations}`);
      console.log(`   タイムアウト: ${SYSTEM_CONFIG.loopConfig.timeoutMinutes}分`);
      console.log('');

      // システムを初期化・開始
      await this.masterController.initialize();
      await this.masterController.start();

      console.log('✅ システムが正常に開始されました');
      console.log('');
      console.log('🔍 監視中...');
      console.log('   - Ctrl+C で停止');
      console.log('   - ログは console に出力されます');
      console.log('   - レポートは comprehensive-reports/, validation-reports/ に保存されます');
      console.log('');

      // ステータス表示を開始
      this.startStatusDisplay();

      // システムが停止するまで待機
      await this.waitForShutdown();

    } catch (error) {
      console.error('❌ システム開始エラー:', error);
      process.exit(1);
    }
  }

  /**
   * システムを停止
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('⚠️ システムは既に停止処理中です');
      return;
    }

    try {
      this.isShuttingDown = true;
      console.log('');
      console.log('🛑 システムを停止中...');

      await this.masterController.stop();

      console.log('✅ システムが正常に停止されました');
      process.exit(0);

    } catch (error) {
      console.error('❌ システム停止エラー:', error);
      process.exit(1);
    }
  }

  /**
   * 緊急停止
   */
  async emergencyStop(): Promise<void> {
    try {
      console.log('');
      console.log('🚨 緊急停止を実行中...');

      await this.masterController.emergencyStop();

      console.log('🚨 緊急停止が完了しました');
      process.exit(0);

    } catch (error) {
      console.error('❌ 緊急停止エラー:', error);
      process.exit(1);
    }
  }

  /**
   * システムステータスを表示
   */
  async showStatus(): Promise<void> {
    try {
      const status = await this.masterController.getSystemStatus();

      console.log('📊 MCP Playwright システムステータス');
      console.log('');
      console.log(`実行状態: ${status.isRunning ? '🟢 実行中' : '🔴 停止中'}`);
      console.log(`システム健康度: ${this.getHealthIcon(status.systemHealth)} ${status.systemHealth} (${status.healthScore.toFixed(1)}%)`);
      console.log(`システム稼働時間: ${this.formatUptime(status.metrics.systemUptime)}`);
      console.log('');
      
      console.log('📈 メトリクス:');
      console.log(`   検知エラー総数: ${status.metrics.totalErrors}`);
      console.log(`   成功修復数: ${status.metrics.successfulRepairs}`);
      console.log(`   失敗修復数: ${status.metrics.failedRepairs}`);
      console.log(`   現在のイテレーション: ${status.metrics.currentIteration}`);
      console.log('');

      console.log('🔧 コンポーネント状態:');
      Object.entries(status.components).forEach(([name, component]) => {
        const healthIcon = component.health >= 80 ? '🟢' : component.health >= 60 ? '🟡' : '🔴';
        console.log(`   ${name}: ${healthIcon} ${component.status} (${component.health.toFixed(1)}%)`);
      });
      console.log('');

      if (status.alerts.length > 0) {
        console.log('🔔 最新アラート:');
        status.alerts.slice(-5).forEach(alert => {
          const icon = this.getAlertIcon(alert.severity);
          console.log(`   ${icon} [${alert.timestamp.toLocaleTimeString()}] ${alert.message}`);
        });
        console.log('');
      }

    } catch (error) {
      console.error('❌ ステータス取得エラー:', error);
      process.exit(1);
    }
  }

  /**
   * ステータス表示を開始
   */
  private startStatusDisplay(): void {
    setInterval(async () => {
      try {
        if (this.isShuttingDown) return;

        const status = await this.masterController.getSystemStatus();
        
        console.log(`[${new Date().toLocaleTimeString()}] ヘルス: ${status.healthScore.toFixed(1)}% | エラー: ${status.metrics.totalErrors} | 修復: ${status.metrics.successfulRepairs} | イテレーション: ${status.metrics.currentIteration}`);

      } catch (error) {
        console.error('ステータス表示エラー:', error.message);
      }
    }, 60000); // 1分ごと
  }

  /**
   * シグナルハンドラーを設定
   */
  private setupSignalHandlers(): void {
    // Ctrl+C での正常停止
    process.on('SIGINT', async () => {
      console.log('');
      console.log('🔄 SIGINT を受信しました。正常停止を開始します...');
      await this.stop();
    });

    // SIGTERM での正常停止
    process.on('SIGTERM', async () => {
      console.log('');
      console.log('🔄 SIGTERM を受信しました。正常停止を開始します...');
      await this.stop();
    });

    // 未処理例外での緊急停止
    process.on('uncaughtException', async (error) => {
      console.error('');
      console.error('❌ 未処理例外が発生しました:', error);
      await this.emergencyStop();
    });

    // 未処理 Promise 拒否での緊急停止
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('');
      console.error('❌ 未処理 Promise 拒否が発生しました:', reason);
      await this.emergencyStop();
    });
  }

  /**
   * 停止まで待機
   */
  private async waitForShutdown(): Promise<void> {
    return new Promise((resolve) => {
      const checkShutdown = () => {
        if (this.isShuttingDown) {
          resolve();
        } else {
          setTimeout(checkShutdown, 1000);
        }
      };
      checkShutdown();
    });
  }

  /**
   * ヘルスアイコンを取得
   */
  private getHealthIcon(health: string): string {
    switch (health) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'warning': return '🟠';
      case 'critical': return '🔴';
      case 'offline': return '⚫';
      default: return '❓';
    }
  }

  /**
   * アラートアイコンを取得
   */
  private getAlertIcon(severity: string): string {
    switch (severity) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'critical': return '🚨';
      default: return '📢';
    }
  }

  /**
   * 稼働時間をフォーマット
   */
  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}日 ${hours % 24}時間 ${minutes % 60}分`;
    } else if (hours > 0) {
      return `${hours}時間 ${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

// メイン実行部
async function main() {
  const command = process.argv[2] || 'start';
  const runner = new MCPPlaywrightSystemRunner();

  switch (command) {
    case 'start':
      await runner.start();
      break;
    
    case 'stop':
      console.log('🛑 システム停止機能は直接的にはサポートされていません');
      console.log('実行中のプロセスを Ctrl+C で停止してください');
      break;
    
    case 'status':
      await runner.showStatus();
      break;
    
    case 'emergency-stop':
      await runner.emergencyStop();
      break;
    
    default:
      console.log('使用方法:');
      console.log('  npm run mcp-playwright:start     - システムを開始');
      console.log('  npm run mcp-playwright:status    - ステータスを表示');
      console.log('  npm run mcp-playwright:emergency - 緊急停止');
      console.log('');
      console.log('実行中のシステムは Ctrl+C で正常停止できます');
      process.exit(1);
  }
}

// スクリプトが直接実行された場合のみメイン処理を実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  });
}

export { MCPPlaywrightSystemRunner };
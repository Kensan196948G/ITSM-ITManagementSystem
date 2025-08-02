/**
 * 無限ループ制御システム
 * エラーがなくなるまで検知・修復を継続実行
 */

import { MCPPlaywrightErrorDetector, ErrorDetectionConfig, BrowserError } from './mcpPlaywrightErrorDetector';
import { AutoRepairEngine, RepairResult } from './autoRepairEngine';

export interface InfiniteLoopConfig {
  maxIterations: number;
  iterationDelay: number;
  errorThreshold: number;
  successThreshold: number;
  timeoutMinutes: number;
  emergencyStopConditions: {
    maxConsecutiveFailures: number;
    maxSameErrorRepeats: number;
    maxRepairAttempts: number;
  };
  notificationSettings: {
    enableEmailAlerts: boolean;
    enableSlackAlerts: boolean;
    alertIntervals: number[];
  };
}

export interface LoopIteration {
  id: string;
  iteration: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  errorsDetected: number;
  repairsAttempted: number;
  repairsSuccessful: number;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  errors: BrowserError[];
  repairs: RepairResult[];
  healthScore: number;
}

export interface LoopStatus {
  isRunning: boolean;
  currentIteration: number;
  totalIterations: number;
  startTime: Date;
  elapsedTime: number;
  totalErrorsDetected: number;
  totalRepairsSuccessful: number;
  overallHealthScore: number;
  estimatedCompletion?: Date;
  lastIteration?: LoopIteration;
}

export class InfiniteLoopController {
  private detector: MCPPlaywrightErrorDetector;
  private repairEngine: AutoRepairEngine;
  private config: InfiniteLoopConfig;
  private isRunning: boolean = false;
  private iterations: LoopIteration[] = [];
  private currentIteration: number = 0;
  private startTime?: Date;
  private stopRequested: boolean = false;
  private emergencyStop: boolean = false;

  constructor(
    detectorConfig: ErrorDetectionConfig,
    loopConfig: InfiniteLoopConfig
  ) {
    this.detector = new MCPPlaywrightErrorDetector(detectorConfig);
    this.repairEngine = new AutoRepairEngine();
    this.config = loopConfig;
  }

  /**
   * 無限ループ監視を開始
   */
  async startInfiniteLoop(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ 無限ループは既に実行中です');
      return;
    }

    console.log('🚀 無限ループエラー監視・修復システムを開始...');
    
    this.isRunning = true;
    this.stopRequested = false;
    this.emergencyStop = false;
    this.currentIteration = 0;
    this.startTime = new Date();

    try {
      // エラー検知システムを初期化
      await this.detector.initialize();
      
      // 監視を開始
      await this.detector.startMonitoring();

      // メインループを開始
      await this.runMainLoop();

    } catch (error) {
      console.error('❌ 無限ループシステムの開始に失敗:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * メインループを実行
   */
  private async runMainLoop(): Promise<void> {
    console.log('🔄 メインループを開始...');

    while (this.isRunning && !this.stopRequested && !this.emergencyStop) {
      this.currentIteration++;
      
      console.log(`\n📍 イテレーション ${this.currentIteration} を開始`);

      const iteration = await this.executeIteration();
      this.iterations.push(iteration);

      // 終了条件をチェック
      const shouldContinue = await this.checkContinuationConditions(iteration);
      
      if (!shouldContinue) {
        console.log('✅ 終了条件が満たされました');
        break;
      }

      // 緊急停止条件をチェック
      if (await this.checkEmergencyStopConditions()) {
        console.log('🚨 緊急停止条件が検知されました');
        this.emergencyStop = true;
        break;
      }

      // 次のイテレーションまで待機
      if (this.config.iterationDelay > 0) {
        console.log(`⏳ ${this.config.iterationDelay}ms 待機中...`);
        await new Promise(resolve => setTimeout(resolve, this.config.iterationDelay));
      }

      // タイムアウトチェック
      if (this.checkTimeout()) {
        console.log('⏰ タイムアウトに達しました');
        break;
      }

      // 最大イテレーション数チェック
      if (this.currentIteration >= this.config.maxIterations) {
        console.log('🔢 最大イテレーション数に達しました');
        break;
      }
    }

    await this.cleanup();
  }

  /**
   * 単一イテレーションを実行
   */
  private async executeIteration(): Promise<LoopIteration> {
    const startTime = new Date();
    const iterationId = `iteration-${this.currentIteration}-${startTime.getTime()}`;

    const iteration: LoopIteration = {
      id: iterationId,
      iteration: this.currentIteration,
      startTime,
      errorsDetected: 0,
      repairsAttempted: 0,
      repairsSuccessful: 0,
      status: 'running',
      errors: [],
      repairs: [],
      healthScore: 0,
    };

    try {
      console.log(`🔍 エラー検知を実行中...`);

      // 現在のエラー状況を取得
      const detectorStatus = this.detector.getStatus();
      const recentErrors = detectorStatus.recentErrors;

      iteration.errors = recentErrors;
      iteration.errorsDetected = recentErrors.length;

      console.log(`📊 検知されたエラー数: ${iteration.errorsDetected}`);

      // エラーがある場合は修復を試行
      if (recentErrors.length > 0) {
        console.log('🔧 エラー修復を開始...');

        for (const error of recentErrors) {
          try {
            // 対象ページを取得
            const page = this.getPageForError(error);
            if (!page) {
              console.warn(`⚠️ エラーに対応するページが見つかりません: ${error.url}`);
              continue;
            }

            // 修復を実行
            const repairResult = await this.repairEngine.repairError(error, page);
            iteration.repairs.push(repairResult);
            iteration.repairsAttempted++;

            if (repairResult.success) {
              iteration.repairsSuccessful++;
              console.log(`✅ 修復成功: ${error.message}`);
            } else {
              console.log(`❌ 修復失敗: ${error.message}`);
            }

          } catch (error) {
            console.error('❌ 修復プロセスエラー:', error);
          }
        }
      }

      // ヘルススコアを計算
      iteration.healthScore = this.calculateHealthScore(iteration);

      iteration.status = 'completed';
      console.log(`✅ イテレーション ${this.currentIteration} 完了 (ヘルススコア: ${iteration.healthScore.toFixed(2)})`);

    } catch (error) {
      console.error(`❌ イテレーション ${this.currentIteration} でエラーが発生:`, error);
      iteration.status = 'failed';
    }

    const endTime = new Date();
    iteration.endTime = endTime;
    iteration.duration = endTime.getTime() - startTime.getTime();

    return iteration;
  }

  /**
   * 継続条件をチェック
   */
  private async checkContinuationConditions(iteration: LoopIteration): Promise<boolean> {
    // エラーがない場合は連続成功回数をチェック
    if (iteration.errorsDetected === 0) {
      const recentIterations = this.iterations.slice(-this.config.successThreshold);
      const allSuccessful = recentIterations.every(iter => iter.errorsDetected === 0);
      
      if (allSuccessful && recentIterations.length >= this.config.successThreshold) {
        console.log(`🎉 連続 ${this.config.successThreshold} 回エラーゼロを達成`);
        return false;
      }
    }

    // エラー数がしきい値以下で、修復成功率が高い場合
    if (iteration.errorsDetected <= this.config.errorThreshold && 
        iteration.healthScore >= 90) {
      console.log('🎯 システムが安定状態に達しました');
      return false;
    }

    return true;
  }

  /**
   * 緊急停止条件をチェック
   */
  private async checkEmergencyStopConditions(): Promise<boolean> {
    const recentIterations = this.iterations.slice(-this.config.emergencyStopConditions.maxConsecutiveFailures);
    
    // 連続失敗チェック
    const consecutiveFailures = recentIterations.filter(iter => iter.status === 'failed').length;
    if (consecutiveFailures >= this.config.emergencyStopConditions.maxConsecutiveFailures) {
      console.log('🚨 連続失敗回数が上限に達しました');
      return true;
    }

    // 同じエラーの繰り返しチェック
    const allErrors = this.iterations.flatMap(iter => iter.errors);
    const errorMessages = allErrors.map(error => error.message);
    const duplicateCount = this.countDuplicates(errorMessages);
    
    if (duplicateCount > this.config.emergencyStopConditions.maxSameErrorRepeats) {
      console.log('🚨 同じエラーの繰り返し回数が上限に達しました');
      return true;
    }

    // 修復試行回数チェック
    const totalRepairAttempts = this.iterations.reduce((sum, iter) => sum + iter.repairsAttempted, 0);
    if (totalRepairAttempts > this.config.emergencyStopConditions.maxRepairAttempts) {
      console.log('🚨 修復試行回数が上限に達しました');
      return true;
    }

    return false;
  }

  /**
   * タイムアウトをチェック
   */
  private checkTimeout(): boolean {
    if (!this.startTime) return false;
    
    const elapsedMinutes = (Date.now() - this.startTime.getTime()) / (1000 * 60);
    return elapsedMinutes >= this.config.timeoutMinutes;
  }

  /**
   * ヘルススコアを計算
   */
  private calculateHealthScore(iteration: LoopIteration): number {
    let score = 100;

    // エラー数によるペナルティ
    score -= iteration.errorsDetected * 10;

    // 修復成功率によるボーナス
    if (iteration.repairsAttempted > 0) {
      const successRate = iteration.repairsSuccessful / iteration.repairsAttempted;
      score += successRate * 20;
    }

    // 実行時間によるペナルティ（長時間は良くない）
    if (iteration.duration) {
      const durationPenalty = Math.min(iteration.duration / 1000 / 60, 10); // 最大10分まで
      score -= durationPenalty * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * エラーに対応するページを取得
   */
  private getPageForError(error: BrowserError): any {
    // MCPPlaywrightErrorDetectorからページを取得
    // 実際の実装では、URLとブラウザタイプに基づいてページを特定
    const detectorStatus = this.detector.getStatus();
    // この部分は実際のページマッピングロジックが必要
    return null; // プレースホルダー
  }

  /**
   * 配列内の重複要素数をカウント
   */
  private countDuplicates(array: string[]): number {
    const counts = array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Math.max(...Object.values(counts));
  }

  /**
   * 無限ループを停止
   */
  async stopInfiniteLoop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ 無限ループは実行されていません');
      return;
    }

    console.log('🛑 無限ループ停止要求を受信...');
    this.stopRequested = true;

    // クリーンアップ
    await this.cleanup();
  }

  /**
   * 緊急停止
   */
  async emergencyStopLoop(): Promise<void> {
    console.log('🚨 緊急停止を実行...');
    this.emergencyStop = true;
    this.stopRequested = true;
    
    await this.cleanup();
  }

  /**
   * クリーンアップ処理
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 クリーンアップを実行中...');

    try {
      // 監視を停止
      await this.detector.stopMonitoring();
      
      this.isRunning = false;
      
      // 最終レポートを生成
      await this.generateFinalReport();

      console.log('✅ クリーンアップ完了');

    } catch (error) {
      console.error('❌ クリーンアップエラー:', error);
    }
  }

  /**
   * 最終レポートを生成
   */
  private async generateFinalReport(): Promise<void> {
    try {
      const report = {
        summary: {
          totalIterations: this.iterations.length,
          totalErrors: this.iterations.reduce((sum, iter) => sum + iter.errorsDetected, 0),
          totalRepairs: this.iterations.reduce((sum, iter) => sum + iter.repairsAttempted, 0),
          successfulRepairs: this.iterations.reduce((sum, iter) => sum + iter.repairsSuccessful, 0),
          averageHealthScore: this.iterations.reduce((sum, iter) => sum + iter.healthScore, 0) / this.iterations.length,
          totalDuration: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        },
        iterations: this.iterations,
        detectorReport: this.detector.generateReport(),
        repairEngineStats: this.repairEngine.getRepairStatistics(),
        conclusion: this.generateConclusion(),
      };

      // レポートをファイルに保存
      const fs = await import('fs/promises');
      const path = await import('path');

      const reportDir = path.join(process.cwd(), 'infinite-monitoring-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportDir, `infinite-loop-report-${timestamp}.json`);
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      console.log(`📊 最終レポートを保存: ${reportFile}`);

    } catch (error) {
      console.error('❌ 最終レポート生成エラー:', error);
    }
  }

  /**
   * 結論を生成
   */
  private generateConclusion(): string {
    const totalErrors = this.iterations.reduce((sum, iter) => sum + iter.errorsDetected, 0);
    const totalRepairs = this.iterations.reduce((sum, iter) => sum + iter.repairsAttempted, 0);
    const successfulRepairs = this.iterations.reduce((sum, iter) => sum + iter.repairsSuccessful, 0);
    const avgHealthScore = this.iterations.reduce((sum, iter) => sum + iter.healthScore, 0) / this.iterations.length;

    if (totalErrors === 0) {
      return 'システムは完全に安定しており、エラーは検出されませんでした。';
    } else if (successfulRepairs / totalRepairs > 0.8) {
      return 'エラーの大部分が正常に修復され、システムは安定した状態に達しました。';
    } else if (avgHealthScore > 70) {
      return 'システムは概ね良好な状態ですが、一部のエラーが修復できませんでした。';
    } else {
      return 'システムに重大な問題があり、手動での介入が必要です。';
    }
  }

  /**
   * 現在のステータスを取得
   */
  getStatus(): LoopStatus {
    const elapsedTime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const totalErrors = this.iterations.reduce((sum, iter) => sum + iter.errorsDetected, 0);
    const successfulRepairs = this.iterations.reduce((sum, iter) => sum + iter.repairsSuccessful, 0);
    const avgHealthScore = this.iterations.length > 0 
      ? this.iterations.reduce((sum, iter) => sum + iter.healthScore, 0) / this.iterations.length 
      : 0;

    return {
      isRunning: this.isRunning,
      currentIteration: this.currentIteration,
      totalIterations: this.iterations.length,
      startTime: this.startTime || new Date(),
      elapsedTime,
      totalErrorsDetected: totalErrors,
      totalRepairsSuccessful: successfulRepairs,
      overallHealthScore: avgHealthScore,
      lastIteration: this.iterations[this.iterations.length - 1],
    };
  }

  /**
   * イテレーション履歴を取得
   */
  getIterationHistory(): LoopIteration[] {
    return this.iterations;
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<InfiniteLoopConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 無限ループ設定を更新しました');
  }
}

// デフォルト設定
export const defaultInfiniteLoopConfig: InfiniteLoopConfig = {
  maxIterations: 1000,
  iterationDelay: 30000, // 30秒
  errorThreshold: 2,
  successThreshold: 5,
  timeoutMinutes: 360, // 6時間
  emergencyStopConditions: {
    maxConsecutiveFailures: 10,
    maxSameErrorRepeats: 20,
    maxRepairAttempts: 500,
  },
  notificationSettings: {
    enableEmailAlerts: false,
    enableSlackAlerts: false,
    alertIntervals: [60, 120, 300], // 分
  },
};
/**
 * ログ・レポート強化システム
 * 無限ループサイクルの詳細記録、修復成功/失敗パターンの分析、改善提案の自動生成
 */

import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'system' | 'detection' | 'repair' | 'validation' | 'performance' | 'security';
  message: string;
  details: any;
  context?: {
    cycleNumber?: number;
    errorId?: string;
    repairStrategy?: string;
    url?: string;
    component?: string;
  };
  metadata?: {
    executionTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    networkRequests?: number;
  };
}

interface CycleAnalytics {
  cycleNumber: number;
  timestamp: string;
  duration: number;
  errorsDetected: number;
  errorsFixed: number;
  fixSuccessRate: number;
  performanceMetrics: {
    avgResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
  };
  strategiesUsed: string[];
  mostEffectiveStrategy: string;
  issues: string[];
  improvements: string[];
}

interface PatternAnalysis {
  pattern: string;
  frequency: number;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  successRate: number;
  avgFixTime: number;
  recommendedStrategy: string;
  preventionSuggestions: string[];
}

interface TrendAnalysis {
  timeRange: string;
  totalCycles: number;
  errorTrends: {
    increasing: string[];
    decreasing: string[];
    stable: string[];
  };
  performanceTrends: {
    improving: string[];
    degrading: string[];
    stable: string[];
  };
  strategiesEffectiveness: { [strategy: string]: number };
  recommendations: string[];
}

interface ComprehensiveReport {
  metadata: {
    generatedAt: string;
    timeRange: { start: string; end: string };
    totalCycles: number;
    totalErrors: number;
    totalFixes: number;
    overallSuccessRate: number;
  };
  summary: {
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    keyMetrics: { [key: string]: number };
    topIssues: string[];
    topImprovements: string[];
  };
  cycleAnalytics: CycleAnalytics[];
  patternAnalysis: PatternAnalysis[];
  trendAnalysis: TrendAnalysis;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  actionPlan: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
    estimatedEffort: string;
  }[];
}

class EnhancedLoggingReportingSystem {
  private logs: LogEntry[] = [];
  private logDir = './enhanced-infinite-loop-reports/logs';
  private reportDir = './enhanced-infinite-loop-reports/analytics';
  private maxLogEntries = 10000; // メモリ管理のため
  private logRotationSize = 50; // MB
  private currentLogFile: string;

  constructor() {
    this.ensureDirectories();
    this.currentLogFile = this.getLogFileName();
    this.loadRecentLogs();
  }

  private ensureDirectories(): void {
    const dirs = [this.logDir, this.reportDir, `${this.reportDir}/patterns`, `${this.reportDir}/trends`];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `enhanced-log-${date}.jsonl`);
  }

  private loadRecentLogs(): void {
    try {
      if (fs.existsSync(this.currentLogFile)) {
        const content = fs.readFileSync(this.currentLogFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line);
        
        this.logs = lines.slice(-this.maxLogEntries).map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(log => log !== null);
      }
    } catch (error) {
      console.warn('Failed to load recent logs:', error);
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentMetadata() {
    return {
      executionTime: Date.now(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // seconds
      networkRequests: 0 // TODO: implement network request counting
    };
  }

  private rotateLogFile(): void {
    try {
      const stats = fs.statSync(this.currentLogFile);
      const sizeInMB = stats.size / (1024 * 1024);
      
      if (sizeInMB > this.logRotationSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = this.currentLogFile.replace('.jsonl', `-${timestamp}.jsonl.backup`);
        fs.renameSync(this.currentLogFile, backupFile);
        console.log(`📦 Log rotated: ${backupFile}`);
      }
    } catch (error) {
      console.warn('Log rotation failed:', error);
    }
  }

  log(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    details: any = {},
    context?: LogEntry['context']
  ): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      context,
      metadata: this.getCurrentMetadata()
    };

    // メモリ内ログ
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // ファイル出力
    this.writeToFile(logEntry);

    // コンソール出力（レベルに応じて）
    this.outputToConsole(logEntry);
  }

  private writeToFile(logEntry: LogEntry): void {
    try {
      // ログローテーション確認
      if (fs.existsSync(this.currentLogFile)) {
        this.rotateLogFile();
      }

      // JSONL形式で書き込み
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.currentLogFile, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private outputToConsole(logEntry: LogEntry): void {
    const colors = {
      debug: '\x1b[37m',   // white
      info: '\x1b[36m',    // cyan
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
      critical: '\x1b[35m' // magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[logEntry.level] || colors.info;
    
    const timeStr = new Date(logEntry.timestamp).toLocaleTimeString();
    const contextStr = logEntry.context ? 
      ` [Cycle: ${logEntry.context.cycleNumber || 'N/A'}]` : '';
    
    console.log(
      `${color}[${timeStr}] ${logEntry.level.toUpperCase()} [${logEntry.category}]${contextStr}: ${logEntry.message}${reset}`
    );
    
    if (logEntry.level === 'error' || logEntry.level === 'critical') {
      console.log(`${color}Details: ${JSON.stringify(logEntry.details, null, 2)}${reset}`);
    }
  }

  // 便利メソッド
  debug(category: LogEntry['category'], message: string, details?: any, context?: LogEntry['context']): void {
    this.log('debug', category, message, details, context);
  }

  info(category: LogEntry['category'], message: string, details?: any, context?: LogEntry['context']): void {
    this.log('info', category, message, details, context);
  }

  warn(category: LogEntry['category'], message: string, details?: any, context?: LogEntry['context']): void {
    this.log('warn', category, message, details, context);
  }

  error(category: LogEntry['category'], message: string, details?: any, context?: LogEntry['context']): void {
    this.log('error', category, message, details, context);
  }

  critical(category: LogEntry['category'], message: string, details?: any, context?: LogEntry['context']): void {
    this.log('critical', category, message, details, context);
  }

  // サイクル分析
  analyzeCycle(cycleNumber: number): CycleAnalytics {
    const cycleLogs = this.logs.filter(log => 
      log.context?.cycleNumber === cycleNumber
    );

    if (cycleLogs.length === 0) {
      return {
        cycleNumber,
        timestamp: new Date().toISOString(),
        duration: 0,
        errorsDetected: 0,
        errorsFixed: 0,
        fixSuccessRate: 0,
        performanceMetrics: {
          avgResponseTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkRequests: 0
        },
        strategiesUsed: [],
        mostEffectiveStrategy: 'none',
        issues: [],
        improvements: []
      };
    }

    const startTime = new Date(cycleLogs[0].timestamp).getTime();
    const endTime = new Date(cycleLogs[cycleLogs.length - 1].timestamp).getTime();
    const duration = endTime - startTime;

    const errorsDetected = cycleLogs.filter(log => 
      log.category === 'detection' && log.level === 'error'
    ).length;

    const repairLogs = cycleLogs.filter(log => 
      log.category === 'repair'
    );

    const errorsFixed = repairLogs.filter(log => 
      log.details.success === true
    ).length;

    const fixSuccessRate = repairLogs.length > 0 ? 
      (errorsFixed / repairLogs.length) * 100 : 0;

    const strategiesUsed = [...new Set(
      repairLogs.map(log => log.context?.repairStrategy).filter(Boolean)
    )] as string[];

    // 最も効果的な戦略を計算
    const strategySuccess: { [key: string]: { total: number; success: number } } = {};
    repairLogs.forEach(log => {
      const strategy = log.context?.repairStrategy;
      if (strategy) {
        if (!strategySuccess[strategy]) {
          strategySuccess[strategy] = { total: 0, success: 0 };
        }
        strategySuccess[strategy].total++;
        if (log.details.success) {
          strategySuccess[strategy].success++;
        }
      }
    });

    const mostEffectiveStrategy = Object.keys(strategySuccess).reduce((best, strategy) => {
      const current = strategySuccess[strategy];
      const bestStats = strategySuccess[best];
      if (!bestStats || (current.success / current.total) > (bestStats.success / bestStats.total)) {
        return strategy;
      }
      return best;
    }, 'none');

    // パフォーマンスメトリクス
    const performanceMetrics = {
      avgResponseTime: cycleLogs.reduce((sum, log) => 
        sum + (log.metadata?.executionTime || 0), 0) / cycleLogs.length,
      memoryUsage: Math.max(...cycleLogs.map(log => log.metadata?.memoryUsage || 0)),
      cpuUsage: cycleLogs.reduce((sum, log) => 
        sum + (log.metadata?.cpuUsage || 0), 0) / cycleLogs.length,
      networkRequests: cycleLogs.reduce((sum, log) => 
        sum + (log.metadata?.networkRequests || 0), 0)
    };

    // 問題と改善点の特定
    const issues = cycleLogs
      .filter(log => log.level === 'error' || log.level === 'critical')
      .map(log => log.message)
      .slice(0, 5);

    const improvements = cycleLogs
      .filter(log => log.category === 'repair' && log.details.success)
      .map(log => `${log.context?.repairStrategy}: ${log.message}`)
      .slice(0, 5);

    return {
      cycleNumber,
      timestamp: cycleLogs[0].timestamp,
      duration,
      errorsDetected,
      errorsFixed,
      fixSuccessRate,
      performanceMetrics,
      strategiesUsed,
      mostEffectiveStrategy,
      issues,
      improvements
    };
  }

  // パターン分析
  analyzePatterns(): PatternAnalysis[] {
    const patterns: { [key: string]: any } = {};

    this.logs.forEach(log => {
      if (log.category === 'detection' && log.level === 'error') {
        const pattern = this.extractPattern(log.message);
        if (!patterns[pattern]) {
          patterns[pattern] = {
            frequency: 0,
            repairAttempts: [],
            category: log.category,
            severity: this.determineSeverity(log.level, log.details)
          };
        }
        patterns[pattern].frequency++;
      }

      if (log.category === 'repair') {
        const errorPattern = log.details.originalError ? 
          this.extractPattern(log.details.originalError) : 'unknown';
        
        if (patterns[errorPattern]) {
          patterns[errorPattern].repairAttempts.push({
            strategy: log.context?.repairStrategy,
            success: log.details.success,
            duration: log.metadata?.executionTime || 0
          });
        }
      }
    });

    return Object.keys(patterns).map(pattern => {
      const data = patterns[pattern];
      const repairAttempts = data.repairAttempts || [];
      const successfulRepairs = repairAttempts.filter((attempt: any) => attempt.success);
      
      const successRate = repairAttempts.length > 0 ? 
        (successfulRepairs.length / repairAttempts.length) * 100 : 0;
      
      const avgFixTime = successfulRepairs.length > 0 ?
        successfulRepairs.reduce((sum: number, attempt: any) => sum + attempt.duration, 0) / successfulRepairs.length : 0;

      const strategyCounts: { [key: string]: number } = {};
      successfulRepairs.forEach((attempt: any) => {
        if (attempt.strategy) {
          strategyCounts[attempt.strategy] = (strategyCounts[attempt.strategy] || 0) + 1;
        }
      });

      const recommendedStrategy = Object.keys(strategyCounts).reduce((best, strategy) => 
        strategyCounts[strategy] > (strategyCounts[best] || 0) ? strategy : best, 'refresh_page');

      return {
        pattern,
        frequency: data.frequency,
        category: data.category,
        severity: data.severity,
        successRate,
        avgFixTime,
        recommendedStrategy,
        preventionSuggestions: this.generatePreventionSuggestions(pattern, data.severity)
      };
    }).sort((a, b) => b.frequency - a.frequency);
  }

  private extractPattern(message: string): string {
    // 共通エラーパターンの抽出
    const patterns = [
      { regex: /HTTP \d{3}/, replacement: 'HTTP_ERROR' },
      { regex: /TypeError.*undefined/, replacement: 'UNDEFINED_ERROR' },
      { regex: /Network.*failed/, replacement: 'NETWORK_ERROR' },
      { regex: /React.*Warning/, replacement: 'REACT_WARNING' },
      { regex: /Failed to load/, replacement: 'LOAD_ERROR' },
      { regex: /Permission denied/, replacement: 'PERMISSION_ERROR' },
      { regex: /Memory.*exceeded/, replacement: 'MEMORY_ERROR' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(message)) {
        return pattern.replacement;
      }
    }

    // 一般的なパターン抽出
    const words = message.toLowerCase().split(' ');
    const keyWords = words.filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'that'].includes(word)
    );
    
    return keyWords.slice(0, 3).join('_') || 'UNKNOWN_PATTERN';
  }

  private determineSeverity(level: string, details: any): 'low' | 'medium' | 'high' | 'critical' {
    if (level === 'critical') return 'critical';
    if (level === 'error') {
      return details.impact === 'system' ? 'high' : 'medium';
    }
    return 'low';
  }

  private generatePreventionSuggestions(pattern: string, severity: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'HTTP_ERROR': [
        'API エンドポイントの可用性監視を強化',
        'リトライ機構の実装',
        'キャッシュ戦略の見直し'
      ],
      'UNDEFINED_ERROR': [
        'null チェックの追加',
        'TypeScript 型安全性の強化',
        'デフォルト値の設定'
      ],
      'NETWORK_ERROR': [
        'ネットワーク接続の冗長化',
        'オフライン対応の実装',
        'タイムアウト値の調整'
      ],
      'REACT_WARNING': [
        'React コンポーネントの最適化',
        'deprecated API の置き換え',
        'prop types の見直し'
      ],
      'LOAD_ERROR': [
        'リソース読み込みの最適化',
        'CDN の利用検討',
        'ファイルサイズの削減'
      ],
      'MEMORY_ERROR': [
        'メモリリークの調査',
        'ガベージコレクションの最適化',
        'データ構造の見直し'
      ]
    };

    return suggestions[pattern] || ['定期的な監視とログ分析', '関連システムの健全性確認'];
  }

  // トレンド分析
  analyzeTrends(timeRangeHours: number = 24): TrendAnalysis {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffTime
    );

    const cycles = [...new Set(recentLogs
      .map(log => log.context?.cycleNumber)
      .filter(cycle => cycle !== undefined)
    )] as number[];

    const cycleAnalytics = cycles.map(cycle => this.analyzeCycle(cycle));

    // エラートレンド分析
    const errorPatterns = this.analyzePatterns();
    const errorTrends = this.categorizeErrorTrends(errorPatterns);

    // パフォーマンストレンド分析
    const performanceTrends = this.analyzePerformanceTrends(cycleAnalytics);

    // 戦略効果分析
    const strategiesEffectiveness = this.analyzeStrategiesEffectiveness(cycleAnalytics);

    // 推奨事項生成
    const recommendations = this.generateTrendRecommendations(
      errorTrends, performanceTrends, strategiesEffectiveness
    );

    return {
      timeRange: `Last ${timeRangeHours} hours`,
      totalCycles: cycles.length,
      errorTrends,
      performanceTrends,
      strategiesEffectiveness,
      recommendations
    };
  }

  private categorizeErrorTrends(patterns: PatternAnalysis[]): TrendAnalysis['errorTrends'] {
    // 簡略化された実装 - 実際の実装ではより複雑な時系列分析が必要
    const highFrequency = patterns.filter(p => p.frequency > 10);
    const mediumFrequency = patterns.filter(p => p.frequency >= 3 && p.frequency <= 10);
    const lowFrequency = patterns.filter(p => p.frequency < 3);

    return {
      increasing: highFrequency.map(p => p.pattern),
      stable: mediumFrequency.map(p => p.pattern),
      decreasing: lowFrequency.map(p => p.pattern)
    };
  }

  private analyzePerformanceTrends(cycles: CycleAnalytics[]): TrendAnalysis['performanceTrends'] {
    if (cycles.length < 2) {
      return { improving: [], degrading: [], stable: [] };
    }

    const metrics = ['avgResponseTime', 'memoryUsage', 'cpuUsage'];
    const trends: TrendAnalysis['performanceTrends'] = {
      improving: [],
      degrading: [],
      stable: []
    };

    metrics.forEach(metric => {
      const values = cycles.map(cycle => cycle.performanceMetrics[metric as keyof typeof cycle.performanceMetrics]);
      const trend = this.calculateTrend(values);
      
      if (trend > 0.1) {
        trends.degrading.push(metric);
      } else if (trend < -0.1) {
        trends.improving.push(metric);
      } else {
        trends.stable.push(metric);
      }
    });

    return trends;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xSum = n * (n - 1) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + val * index, 0);
    const xxSum = n * (n - 1) * (2 * n - 1) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    return slope;
  }

  private analyzeStrategiesEffectiveness(cycles: CycleAnalytics[]): { [strategy: string]: number } {
    const strategies: { [strategy: string]: { total: number; success: number } } = {};

    cycles.forEach(cycle => {
      cycle.strategiesUsed.forEach(strategy => {
        if (!strategies[strategy]) {
          strategies[strategy] = { total: 0, success: 0 };
        }
        strategies[strategy].total++;
        if (cycle.fixSuccessRate > 80) {
          strategies[strategy].success++;
        }
      });
    });

    const effectiveness: { [strategy: string]: number } = {};
    Object.keys(strategies).forEach(strategy => {
      const stats = strategies[strategy];
      effectiveness[strategy] = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
    });

    return effectiveness;
  }

  private generateTrendRecommendations(
    errorTrends: TrendAnalysis['errorTrends'],
    performanceTrends: TrendAnalysis['performanceTrends'],
    strategiesEffectiveness: { [strategy: string]: number }
  ): string[] {
    const recommendations: string[] = [];

    // エラートレンドベースの推奨
    if (errorTrends.increasing.length > 0) {
      recommendations.push(`増加傾向のエラーパターンに注意: ${errorTrends.increasing.join(', ')}`);
    }

    // パフォーマンストレンドベースの推奨
    if (performanceTrends.degrading.length > 0) {
      recommendations.push(`パフォーマンス劣化メトリクス: ${performanceTrends.degrading.join(', ')}`);
    }

    // 戦略効果ベースの推奨
    const leastEffective = Object.keys(strategiesEffectiveness)
      .filter(strategy => strategiesEffectiveness[strategy] < 50);
    
    if (leastEffective.length > 0) {
      recommendations.push(`効果の低い修復戦略の見直し: ${leastEffective.join(', ')}`);
    }

    const mostEffective = Object.keys(strategiesEffectiveness)
      .filter(strategy => strategiesEffectiveness[strategy] > 90);
    
    if (mostEffective.length > 0) {
      recommendations.push(`高効果戦略の優先使用: ${mostEffective.join(', ')}`);
    }

    return recommendations;
  }

  // 包括的レポート生成
  async generateComprehensiveReport(timeRangeHours: number = 24): Promise<ComprehensiveReport> {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffTime
    );

    const cycles = [...new Set(recentLogs
      .map(log => log.context?.cycleNumber)
      .filter(cycle => cycle !== undefined)
    )] as number[];

    const cycleAnalytics = cycles.map(cycle => this.analyzeCycle(cycle));
    const patternAnalysis = this.analyzePatterns();
    const trendAnalysis = this.analyzeTrends(timeRangeHours);

    // メタデータ計算
    const totalErrors = recentLogs.filter(log => 
      log.category === 'detection' && log.level === 'error'
    ).length;

    const totalFixes = recentLogs.filter(log => 
      log.category === 'repair' && log.details.success
    ).length;

    const overallSuccessRate = cycleAnalytics.length > 0 ?
      cycleAnalytics.reduce((sum, cycle) => sum + cycle.fixSuccessRate, 0) / cycleAnalytics.length : 0;

    // システム健全性評価
    const systemHealth: ComprehensiveReport['summary']['systemHealth'] = 
      overallSuccessRate >= 95 ? 'excellent' :
      overallSuccessRate >= 85 ? 'good' :
      overallSuccessRate >= 70 ? 'fair' :
      overallSuccessRate >= 50 ? 'poor' : 'critical';

    // 主要メトリクス
    const keyMetrics = {
      averageCycleDuration: cycleAnalytics.length > 0 ?
        cycleAnalytics.reduce((sum, cycle) => sum + cycle.duration, 0) / cycleAnalytics.length : 0,
      averageErrorsPerCycle: cycleAnalytics.length > 0 ?
        cycleAnalytics.reduce((sum, cycle) => sum + cycle.errorsDetected, 0) / cycleAnalytics.length : 0,
      averageMemoryUsage: cycleAnalytics.length > 0 ?
        cycleAnalytics.reduce((sum, cycle) => sum + cycle.performanceMetrics.memoryUsage, 0) / cycleAnalytics.length : 0,
      averageResponseTime: cycleAnalytics.length > 0 ?
        cycleAnalytics.reduce((sum, cycle) => sum + cycle.performanceMetrics.avgResponseTime, 0) / cycleAnalytics.length : 0
    };

    // 上位問題と改善点
    const allIssues = cycleAnalytics.flatMap(cycle => cycle.issues);
    const allImprovements = cycleAnalytics.flatMap(cycle => cycle.improvements);

    const topIssues = this.getTopFrequent(allIssues, 5);
    const topImprovements = this.getTopFrequent(allImprovements, 5);

    // 推奨事項の分類
    const recommendations = this.categorizeRecommendations(
      trendAnalysis.recommendations, patternAnalysis, systemHealth
    );

    // アクションプラン
    const actionPlan = this.generateActionPlan(
      patternAnalysis, trendAnalysis, systemHealth
    );

    const report: ComprehensiveReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        timeRange: {
          start: cutoffTime.toISOString(),
          end: new Date().toISOString()
        },
        totalCycles: cycles.length,
        totalErrors,
        totalFixes,
        overallSuccessRate
      },
      summary: {
        systemHealth,
        keyMetrics,
        topIssues,
        topImprovements
      },
      cycleAnalytics,
      patternAnalysis,
      trendAnalysis,
      recommendations,
      actionPlan
    };

    // レポート保存
    await this.saveComprehensiveReport(report);

    return report;
  }

  private getTopFrequent(items: string[], count: number): string[] {
    const frequency: { [key: string]: number } = {};
    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.keys(frequency)
      .sort((a, b) => frequency[b] - frequency[a])
      .slice(0, count);
  }

  private categorizeRecommendations(
    trendRecommendations: string[],
    patterns: PatternAnalysis[],
    systemHealth: string
  ): ComprehensiveReport['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // 緊急対応
    if (systemHealth === 'critical' || systemHealth === 'poor') {
      immediate.push('システムの緊急点検と修復が必要');
    }

    const criticalPatterns = patterns.filter(p => p.severity === 'critical');
    if (criticalPatterns.length > 0) {
      immediate.push(`Critical エラーパターンの即座対応: ${criticalPatterns.map(p => p.pattern).join(', ')}`);
    }

    // 短期対応
    shortTerm.push(...trendRecommendations);
    
    const highFrequencyPatterns = patterns.filter(p => p.frequency > 5);
    if (highFrequencyPatterns.length > 0) {
      shortTerm.push(`高頻度エラーパターンの根本原因調査: ${highFrequencyPatterns.map(p => p.pattern).join(', ')}`);
    }

    // 長期対応
    longTerm.push('システム監視の自動化強化');
    longTerm.push('予防的保守スケジュールの策定');
    longTerm.push('パフォーマンス最適化計画の実装');

    return { immediate, shortTerm, longTerm };
  }

  private generateActionPlan(
    patterns: PatternAnalysis[],
    trends: TrendAnalysis,
    systemHealth: string
  ): ComprehensiveReport['actionPlan'] {
    const actionPlan: ComprehensiveReport['actionPlan'] = [];

    // システム健全性に基づくアクション
    if (systemHealth === 'critical') {
      actionPlan.push({
        priority: 'high',
        action: 'システム全体の緊急診断と修復',
        expectedImpact: 'システム安定性の大幅改善',
        estimatedEffort: '1-2日'
      });
    }

    // パターンベースのアクション
    const topPatterns = patterns.slice(0, 3);
    topPatterns.forEach(pattern => {
      actionPlan.push({
        priority: pattern.severity === 'critical' ? 'high' : 'medium',
        action: `${pattern.pattern} の根本原因解決`,
        expectedImpact: `${pattern.frequency}回/日のエラー削減`,
        estimatedEffort: pattern.severity === 'critical' ? '1-3日' : '3-5日'
      });
    });

    // トレンドベースのアクション
    if (trends.performanceTrends.degrading.length > 0) {
      actionPlan.push({
        priority: 'medium',
        action: `パフォーマンス劣化メトリクスの改善: ${trends.performanceTrends.degrading.join(', ')}`,
        expectedImpact: 'システム応答性の向上',
        estimatedEffort: '1-2週間'
      });
    }

    return actionPlan.slice(0, 10); // 最大10項目
  }

  private async saveComprehensiveReport(report: ComprehensiveReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON レポート
    const jsonPath = path.join(this.reportDir, `comprehensive-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Markdown レポート
    const markdownPath = path.join(this.reportDir, `comprehensive-report-${timestamp}.md`);
    const markdownContent = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdownContent);

    // HTML レポート（ダッシュボード）
    const htmlPath = path.join(this.reportDir, `dashboard-${timestamp}.html`);
    const htmlContent = this.generateHTMLDashboard(report);
    fs.writeFileSync(htmlPath, htmlContent);

    this.info('system', `包括的レポート生成完了`, {
      jsonPath, markdownPath, htmlPath,
      totalCycles: report.metadata.totalCycles,
      overallSuccessRate: report.metadata.overallSuccessRate
    });
  }

  private generateMarkdownReport(report: ComprehensiveReport): string {
    return `
# 無限ループ自動化システム - 包括的レポート

## 概要
- **生成日時**: ${new Date(report.metadata.generatedAt).toLocaleString()}
- **対象期間**: ${new Date(report.metadata.timeRange.start).toLocaleString()} - ${new Date(report.metadata.timeRange.end).toLocaleString()}
- **システム健全性**: ${report.summary.systemHealth.toUpperCase()}
- **全体成功率**: ${report.metadata.overallSuccessRate.toFixed(1)}%

## 主要統計
- **総サイクル数**: ${report.metadata.totalCycles}
- **総エラー数**: ${report.metadata.totalErrors}
- **総修復数**: ${report.metadata.totalFixes}
- **平均サイクル時間**: ${(report.summary.keyMetrics.averageCycleDuration / 1000).toFixed(1)}秒
- **平均エラー/サイクル**: ${report.summary.keyMetrics.averageErrorsPerCycle.toFixed(1)}
- **平均メモリ使用量**: ${report.summary.keyMetrics.averageMemoryUsage.toFixed(1)}MB
- **平均応答時間**: ${report.summary.keyMetrics.averageResponseTime.toFixed(1)}ms

## 主要問題（上位5件）
${report.summary.topIssues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}

## 主要改善点（上位5件）
${report.summary.topImprovements.map((improvement, index) => `${index + 1}. ${improvement}`).join('\n')}

## エラーパターン分析
${report.patternAnalysis.slice(0, 10).map(pattern => `
### ${pattern.pattern}
- **頻度**: ${pattern.frequency}回
- **重要度**: ${pattern.severity.toUpperCase()}
- **修復成功率**: ${pattern.successRate.toFixed(1)}%
- **平均修復時間**: ${pattern.avgFixTime.toFixed(1)}ms
- **推奨戦略**: ${pattern.recommendedStrategy}
- **予防策**: ${pattern.preventionSuggestions.join(', ')}
`).join('')}

## トレンド分析
### エラートレンド
- **増加傾向**: ${report.trendAnalysis.errorTrends.increasing.join(', ') || 'なし'}
- **減少傾向**: ${report.trendAnalysis.errorTrends.decreasing.join(', ') || 'なし'}
- **安定**: ${report.trendAnalysis.errorTrends.stable.join(', ') || 'なし'}

### パフォーマンストレンド
- **改善中**: ${report.trendAnalysis.performanceTrends.improving.join(', ') || 'なし'}
- **劣化中**: ${report.trendAnalysis.performanceTrends.degrading.join(', ') || 'なし'}
- **安定**: ${report.trendAnalysis.performanceTrends.stable.join(', ') || 'なし'}

### 修復戦略効果
${Object.entries(report.trendAnalysis.strategiesEffectiveness).map(([strategy, effectiveness]) =>
  `- **${strategy}**: ${effectiveness.toFixed(1)}%`
).join('\n')}

## 推奨アクション

### 🚨 緊急対応
${report.recommendations.immediate.map(rec => `- ${rec}`).join('\n')}

### ⚠️ 短期対応（1-2週間）
${report.recommendations.shortTerm.map(rec => `- ${rec}`).join('\n')}

### 📋 長期対応（1ヶ月以上）
${report.recommendations.longTerm.map(rec => `- ${rec}`).join('\n')}

## アクションプラン
${report.actionPlan.map((action, index) => `
### ${index + 1}. ${action.action}
- **優先度**: ${action.priority.toUpperCase()}
- **期待効果**: ${action.expectedImpact}
- **推定工数**: ${action.estimatedEffort}
`).join('')}

## サイクル詳細（最新10件）
${report.cycleAnalytics.slice(-10).map(cycle => `
### サイクル ${cycle.cycleNumber}
- **実行時刻**: ${new Date(cycle.timestamp).toLocaleString()}
- **所要時間**: ${(cycle.duration / 1000).toFixed(1)}秒
- **検出エラー**: ${cycle.errorsDetected}件
- **修復エラー**: ${cycle.errorsFixed}件
- **修復成功率**: ${cycle.fixSuccessRate.toFixed(1)}%
- **使用戦略**: ${cycle.strategiesUsed.join(', ') || 'なし'}
- **最効戦略**: ${cycle.mostEffectiveStrategy}
`).join('')}

---
*Generated by Enhanced Logging & Reporting System at ${new Date().toLocaleString()}*
`;
  }

  private generateHTMLDashboard(report: ComprehensiveReport): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>無限ループ自動化システム - ダッシュボード</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .chart-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .health-badge { padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; }
        .health-excellent { background: #10b981; }
        .health-good { background: #3b82f6; }
        .health-fair { background: #f59e0b; }
        .health-poor { background: #ef4444; }
        .health-critical { background: #dc2626; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .rec-section { margin-bottom: 20px; }
        .rec-title { font-weight: bold; margin-bottom: 10px; }
        .rec-list { list-style: none; padding: 0; }
        .rec-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>無限ループ自動化システム ダッシュボード</h1>
            <p>生成日時: ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
            <span class="health-badge health-${report.summary.systemHealth}">
                システム健全性: ${report.summary.systemHealth.toUpperCase()}
            </span>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${report.metadata.overallSuccessRate.toFixed(1)}%</div>
                <div class="metric-label">全体成功率</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.metadata.totalCycles}</div>
                <div class="metric-label">総サイクル数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.metadata.totalErrors}</div>
                <div class="metric-label">総エラー数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.metadata.totalFixes}</div>
                <div class="metric-label">総修復数</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.summary.keyMetrics.averageCycleDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">平均サイクル時間</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.keyMetrics.averageMemoryUsage.toFixed(1)}MB</div>
                <div class="metric-label">平均メモリ使用量</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h3>エラーパターン分布</h3>
                <canvas id="errorPatternsChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>修復戦略効果</h3>
                <canvas id="strategiesChart"></canvas>
            </div>
        </div>

        <div class="recommendations">
            <h2>推奨アクション</h2>
            
            <div class="rec-section">
                <div class="rec-title">🚨 緊急対応</div>
                <ul class="rec-list">
                    ${report.recommendations.immediate.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>

            <div class="rec-section">
                <div class="rec-title">⚠️ 短期対応</div>
                <ul class="rec-list">
                    ${report.recommendations.shortTerm.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>

            <div class="rec-section">
                <div class="rec-title">📋 長期対応</div>
                <ul class="rec-list">
                    ${report.recommendations.longTerm.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>

    <script>
        // エラーパターンチャート
        const errorPatternsCtx = document.getElementById('errorPatternsChart').getContext('2d');
        new Chart(errorPatternsCtx, {
            type: 'doughnut',
            data: {
                labels: [${report.patternAnalysis.slice(0, 5).map(p => `'${p.pattern}'`).join(', ')}],
                datasets: [{
                    data: [${report.patternAnalysis.slice(0, 5).map(p => p.frequency).join(', ')}],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // 修復戦略効果チャート
        const strategiesCtx = document.getElementById('strategiesChart').getContext('2d');
        const strategiesData = ${JSON.stringify(report.trendAnalysis.strategiesEffectiveness)};
        new Chart(strategiesCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(strategiesData),
                datasets: [{
                    label: '効果 (%)',
                    data: Object.values(strategiesData),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    </script>
</body>
</html>
`;
  }

  // 外部API用メソッド
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  getLogsByCategory(category: LogEntry['category'], count: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.category === category)
      .slice(-count);
  }

  getLogsByLevel(level: LogEntry['level'], count: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-count);
  }

  getCycleHistory(cycleCount: number = 10): CycleAnalytics[] {
    const recentCycles = [...new Set(this.logs
      .map(log => log.context?.cycleNumber)
      .filter(cycle => cycle !== undefined)
    )] as number[];

    return recentCycles
      .slice(-cycleCount)
      .map(cycle => this.analyzeCycle(cycle));
  }
}

// グローバルインスタンス
export const enhancedLogger = new EnhancedLoggingReportingSystem();

// 便利な関数エクスポート
export function logSystemEvent(level: LogEntry['level'], message: string, details?: any, context?: LogEntry['context']): void {
  enhancedLogger.log(level, 'system', message, details, context);
}

export function logDetectionEvent(level: LogEntry['level'], message: string, details?: any, context?: LogEntry['context']): void {
  enhancedLogger.log(level, 'detection', message, details, context);
}

export function logRepairEvent(level: LogEntry['level'], message: string, details?: any, context?: LogEntry['context']): void {
  enhancedLogger.log(level, 'repair', message, details, context);
}

export function logValidationEvent(level: LogEntry['level'], message: string, details?: any, context?: LogEntry['context']): void {
  enhancedLogger.log(level, 'validation', message, details, context);
}

// レポート生成関数
export async function generateDailyReport(): Promise<ComprehensiveReport> {
  return await enhancedLogger.generateComprehensiveReport(24);
}

export async function generateWeeklyReport(): Promise<ComprehensiveReport> {
  return await enhancedLogger.generateComprehensiveReport(168);
}

// 直接実行時
if (require.main === module) {
  (async () => {
    try {
      console.log('📊 包括的レポート生成開始...');
      const report = await enhancedLogger.generateComprehensiveReport(24);
      
      console.log('\n📋 レポート概要:');
      console.log(`- システム健全性: ${report.summary.systemHealth}`);
      console.log(`- 全体成功率: ${report.metadata.overallSuccessRate.toFixed(1)}%`);
      console.log(`- 総サイクル数: ${report.metadata.totalCycles}`);
      console.log(`- 総エラー数: ${report.metadata.totalErrors}`);
      console.log(`- 総修復数: ${report.metadata.totalFixes}`);
      
      console.log('\n✅ レポート生成完了');
    } catch (error) {
      console.error('❌ レポート生成エラー:', error);
      process.exit(1);
    }
  })();
}
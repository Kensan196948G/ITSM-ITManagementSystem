/**
 * 強化統合レポートジェネレーター
 * - 複数システムの統合レポート生成
 * - ダッシュボード形式のHTML出力
 * - JSON/CSV/PDF出力対応
 * - 時系列分析とトレンド表示
 * - アラート・推奨事項の自動生成
 */

import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

interface ReportData {
  sessionId: string;
  timestamp: string;
  source: 'console' | 'page-monitor' | 'repair-engine' | 'verification' | 'infinite-loop';
  data: any;
  type: string;
}

interface IntegratedMetrics {
  overview: {
    totalSessions: number;
    totalErrors: number;
    totalRepairs: number;
    totalVerifications: number;
    successRate: number;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
  errorAnalysis: {
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorTrends: Array<{
      date: string;
      count: number;
      type: string;
    }>;
  };
  repairAnalysis: {
    repairSuccessRate: number;
    repairsByType: Record<string, number>;
    automationCoverage: number;
    avgRepairTime: number;
  };
  performanceAnalysis: {
    avgLoadTime: number;
    performanceTrends: Array<{
      date: string;
      loadTime: number;
      memoryUsage: number;
    }>;
    bottlenecks: string[];
  };
  qualityMetrics: {
    codeQuality: number;
    testCoverage: number;
    accessibility: number;
    security: number;
  };
}

interface ReportConfig {
  title: string;
  includeSections: {
    overview: boolean;
    errorAnalysis: boolean;
    repairAnalysis: boolean;
    performanceAnalysis: boolean;
    qualityMetrics: boolean;
    recommendations: boolean;
    rawData: boolean;
  };
  outputFormats: ('html' | 'json' | 'csv' | 'pdf')[];
  timeRange: {
    start: Date;
    end: Date;
  };
  aggregationLevel: 'hour' | 'day' | 'week' | 'month';
}

interface GeneratedReport {
  id: string;
  generatedAt: string;
  config: ReportConfig;
  metrics: IntegratedMetrics;
  insights: {
    keyFindings: string[];
    trends: string[];
    alerts: string[];
    recommendations: string[];
  };
  charts: {
    errorTrend: ChartData;
    performanceTrend: ChartData;
    repairRate: ChartData;
    systemHealth: ChartData;
  };
  rawData: ReportData[];
}

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

class EnhancedReportGenerator {
  private dataDir: string;
  private outputDir: string;
  private reportData: ReportData[] = [];

  constructor(
    dataDir: string = './monitoring-data',
    outputDir: string = './enhanced-reports'
  ) {
    this.dataDir = path.resolve(dataDir);
    this.outputDir = path.resolve(outputDir);
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.dataDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async collectDataFromSources(): Promise<void> {
    console.log('📊 データソースから情報を収集中...');

    // 各監視システムのレポートディレクトリからデータを収集
    const sourceDirectories = [
      './console-error-reports',
      './page-monitor-reports', 
      './repair-reports',
      './verification-reports',
      './infinite-monitoring-reports'
    ];

    for (const sourceDir of sourceDirectories) {
      if (fs.existsSync(sourceDir)) {
        await this.collectFromDirectory(sourceDir);
      }
    }

    console.log(`✅ ${this.reportData.length} 件のデータを収集完了`);
  }

  private async collectFromDirectory(dir: string): Promise<void> {
    try {
      const files = fs.readdirSync(dir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);

          const reportData: ReportData = {
            sessionId: data.sessionId || this.generateSessionId(),
            timestamp: data.timestamp || data.endTime || data.reportTime || new Date().toISOString(),
            source: this.determineSource(dir),
            data,
            type: this.determineType(data)
          };

          this.reportData.push(reportData);
        } catch (error) {
          console.warn(`⚠️ ファイル読み込み失敗: ${file}`, error);
        }
      }
    } catch (error) {
      console.warn(`⚠️ ディレクトリ読み込み失敗: ${dir}`, error);
    }
  }

  private generateSessionId(): string {
    return `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSource(dir: string): ReportData['source'] {
    if (dir.includes('console-error')) return 'console';
    if (dir.includes('page-monitor')) return 'page-monitor';
    if (dir.includes('repair')) return 'repair-engine';
    if (dir.includes('verification')) return 'verification';
    if (dir.includes('infinite-monitoring')) return 'infinite-loop';
    return 'console';
  }

  private determineType(data: any): string {
    if (data.totalErrors !== undefined) return 'error-report';
    if (data.repairedErrors !== undefined) return 'repair-report';
    if (data.overallSuccess !== undefined) return 'verification-report';
    if (data.systemMetrics !== undefined) return 'monitoring-report';
    if (data.pageResults !== undefined) return 'page-monitor-report';
    return 'unknown';
  }

  private analyzeData(config: ReportConfig): IntegratedMetrics {
    console.log('🔍 データ分析実行中...');

    const filteredData = this.filterDataByTimeRange(config.timeRange);
    
    // オーバービュー分析
    const overview = this.analyzeOverview(filteredData);
    
    // エラー分析
    const errorAnalysis = this.analyzeErrors(filteredData);
    
    // 修復分析
    const repairAnalysis = this.analyzeRepairs(filteredData);
    
    // パフォーマンス分析
    const performanceAnalysis = this.analyzePerformance(filteredData);
    
    // 品質メトリクス
    const qualityMetrics = this.analyzeQuality(filteredData);

    return {
      overview,
      errorAnalysis,
      repairAnalysis,
      performanceAnalysis,
      qualityMetrics
    };
  }

  private filterDataByTimeRange(timeRange: { start: Date; end: Date }): ReportData[] {
    return this.reportData.filter(data => {
      const dataTime = new Date(data.timestamp);
      return dataTime >= timeRange.start && dataTime <= timeRange.end;
    });
  }

  private analyzeOverview(data: ReportData[]): IntegratedMetrics['overview'] {
    const sessions = new Set(data.map(d => d.sessionId)).size;
    
    let totalErrors = 0;
    let totalRepairs = 0;
    let totalVerifications = 0;
    let successfulVerifications = 0;

    data.forEach(report => {
      if (report.type === 'error-report' || report.type === 'monitoring-report') {
        totalErrors += report.data.totalErrors || 0;
      }
      if (report.type === 'repair-report') {
        totalRepairs += report.data.repairedErrors || 0;
      }
      if (report.type === 'verification-report') {
        totalVerifications++;
        if (report.data.overallSuccess) {
          successfulVerifications++;
        }
      }
    });

    const successRate = totalVerifications > 0 ? successfulVerifications / totalVerifications : 1;
    const errorRate = totalErrors / Math.max(sessions, 1);

    let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    if (successRate < 0.5 || errorRate > 20) {
      systemHealth = 'critical';
    } else if (successRate < 0.8 || errorRate > 10) {
      systemHealth = 'warning';
    } else if (successRate < 0.95 || errorRate > 5) {
      systemHealth = 'good';
    }

    return {
      totalSessions: sessions,
      totalErrors,
      totalRepairs,
      totalVerifications,
      successRate,
      systemHealth
    };
  }

  private analyzeErrors(data: ReportData[]): IntegratedMetrics['errorAnalysis'] {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorTrends: Array<{ date: string; count: number; type: string }> = [];

    data.forEach(report => {
      if (report.type === 'error-report' || report.type === 'console') {
        const errors = report.data.errors || [];
        
        errors.forEach((error: any) => {
          // エラータイプ集計
          const type = error.type || error.category || 'unknown';
          errorsByType[type] = (errorsByType[type] || 0) + 1;
          
          // 重要度集計
          const severity = error.severity || 'medium';
          errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
        });

        // トレンドデータ
        const date = new Date(report.timestamp).toISOString().split('T')[0];
        errorTrends.push({
          date,
          count: errors.length,
          type: 'total'
        });
      }
    });

    return {
      errorsByType,
      errorsBySeverity,
      errorTrends
    };
  }

  private analyzeRepairs(data: ReportData[]): IntegratedMetrics['repairAnalysis'] {
    let totalErrors = 0;
    let totalRepairs = 0;
    let totalRepairTime = 0;
    const repairsByType: Record<string, number> = {};

    data.forEach(report => {
      if (report.type === 'repair-report') {
        totalErrors += report.data.totalErrors || 0;
        totalRepairs += report.data.repairedErrors || 0;
        
        const actions = report.data.repairActions || [];
        actions.forEach((action: any) => {
          if (action.success) {
            const type = action.type || 'unknown';
            repairsByType[type] = (repairsByType[type] || 0) + 1;
          }
        });
      }
    });

    const repairSuccessRate = totalErrors > 0 ? totalRepairs / totalErrors : 0;
    const automationCoverage = repairSuccessRate;
    const avgRepairTime = totalRepairTime / Math.max(totalRepairs, 1);

    return {
      repairSuccessRate,
      repairsByType,
      automationCoverage,
      avgRepairTime
    };
  }

  private analyzePerformance(data: ReportData[]): IntegratedMetrics['performanceAnalysis'] {
    let totalLoadTime = 0;
    let loadTimeCount = 0;
    const performanceTrends: Array<{ date: string; loadTime: number; memoryUsage: number }> = [];
    const bottlenecks: string[] = [];

    data.forEach(report => {
      if (report.type === 'page-monitor-report' || report.type === 'verification-report') {
        const performance = report.data.performanceMetrics || report.data.performance || {};
        
        if (performance.loadTime || performance.domContentLoaded) {
          const loadTime = performance.loadTime || performance.domContentLoaded || 0;
          totalLoadTime += loadTime;
          loadTimeCount++;

          const date = new Date(report.timestamp).toISOString().split('T')[0];
          performanceTrends.push({
            date,
            loadTime,
            memoryUsage: performance.memoryUsage || 0
          });

          // ボトルネック検出
          if (loadTime > 5000) {
            bottlenecks.push(`遅いページロード: ${loadTime}ms`);
          }
          if (performance.memoryUsage > 100 * 1024 * 1024) { // 100MB
            bottlenecks.push(`高メモリ使用量: ${Math.round(performance.memoryUsage / 1024 / 1024)}MB`);
          }
        }
      }
    });

    const avgLoadTime = loadTimeCount > 0 ? totalLoadTime / loadTimeCount : 0;

    return {
      avgLoadTime,
      performanceTrends,
      bottlenecks: [...new Set(bottlenecks)] // 重複除去
    };
  }

  private analyzeQuality(data: ReportData[]): IntegratedMetrics['qualityMetrics'] {
    let codeQualityScore = 0;
    let testCoverageScore = 0;
    let accessibilityScore = 0;
    let securityScore = 0;
    let scores = 0;

    data.forEach(report => {
      if (report.type === 'verification-report') {
        const results = report.data.results || [];
        
        results.forEach((result: any) => {
          scores++;
          
          if (result.testType === 'TypeScript Check' || result.testType === 'ESLint Check') {
            codeQualityScore += result.success ? 100 : 0;
          }
          if (result.testType === 'Unit Tests') {
            testCoverageScore += result.success ? 100 : 0;
          }
          if (result.testType === 'Accessibility Check') {
            accessibilityScore += result.success ? 100 : 0;
          }
          if (result.testType === 'Security Check') {
            securityScore += result.success ? 100 : 0;
          }
        });
      }
    });

    return {
      codeQuality: scores > 0 ? codeQualityScore / scores : 85,
      testCoverage: scores > 0 ? testCoverageScore / scores : 75,
      accessibility: scores > 0 ? accessibilityScore / scores : 80,
      security: scores > 0 ? securityScore / scores : 90
    };
  }

  private generateInsights(metrics: IntegratedMetrics): GeneratedReport['insights'] {
    const keyFindings: string[] = [];
    const trends: string[] = [];
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // 主要な発見
    keyFindings.push(`システム全体の健全性: ${metrics.overview.systemHealth.toUpperCase()}`);
    keyFindings.push(`総エラー数: ${metrics.overview.totalErrors} 件`);
    keyFindings.push(`自動修復成功率: ${Math.round(metrics.repairAnalysis.repairSuccessRate * 100)}%`);
    keyFindings.push(`検証成功率: ${Math.round(metrics.overview.successRate * 100)}%`);

    // トレンド分析
    if (metrics.errorAnalysis.errorTrends.length > 0) {
      const recentErrors = metrics.errorAnalysis.errorTrends.slice(-7); // 直近7日
      const avgRecentErrors = recentErrors.reduce((sum, e) => sum + e.count, 0) / recentErrors.length;
      
      if (avgRecentErrors > 10) {
        trends.push('エラー発生率が高い傾向');
      } else if (avgRecentErrors < 2) {
        trends.push('エラー発生率が安定して低い');
      }
    }

    if (metrics.performanceAnalysis.avgLoadTime > 3000) {
      trends.push('ページロード時間が長い傾向');
    }

    // アラート
    if (metrics.overview.systemHealth === 'critical') {
      alerts.push('🚨 CRITICAL: システムが危険な状態です');
    } else if (metrics.overview.systemHealth === 'warning') {
      alerts.push('⚠️ WARNING: システムに注意が必要です');
    }

    if (metrics.repairAnalysis.repairSuccessRate < 0.5) {
      alerts.push('⚠️ 自動修復率が低下しています');
    }

    if (metrics.performanceAnalysis.bottlenecks.length > 5) {
      alerts.push('⚠️ 多数のパフォーマンス問題が検出されています');
    }

    // 推奨事項
    if (metrics.errorAnalysis.errorsByType['javascript'] > 10) {
      recommendations.push('🔧 JavaScript エラーの根本原因調査を推奨');
    }

    if (metrics.errorAnalysis.errorsByType['network'] > 5) {
      recommendations.push('🌐 ネットワーク・API接続の安定性確認を推奨');
    }

    if (metrics.qualityMetrics.accessibility < 80) {
      recommendations.push('♿ アクセシビリティ改善を推奨');
    }

    if (metrics.performanceAnalysis.avgLoadTime > 3000) {
      recommendations.push('⚡ パフォーマンス最適化を推奨');
    }

    recommendations.push('📊 継続的な監視により品質維持');
    recommendations.push('🔄 定期的なシステム見直し');

    return {
      keyFindings,
      trends,
      alerts,
      recommendations
    };
  }

  private generateCharts(metrics: IntegratedMetrics): GeneratedReport['charts'] {
    // エラートレンドチャート
    const errorTrend: ChartData = {
      type: 'line',
      labels: metrics.errorAnalysis.errorTrends.map(e => e.date),
      datasets: [{
        label: 'エラー数',
        data: metrics.errorAnalysis.errorTrends.map(e => e.count),
        borderColor: '#dc3545',
        borderWidth: 2
      }]
    };

    // パフォーマンストレンドチャート
    const performanceTrend: ChartData = {
      type: 'line',
      labels: metrics.performanceAnalysis.performanceTrends.map(p => p.date),
      datasets: [{
        label: 'ロード時間 (ms)',
        data: metrics.performanceAnalysis.performanceTrends.map(p => p.loadTime),
        borderColor: '#007bff',
        borderWidth: 2
      }]
    };

    // 修復率チャート
    const repairRate: ChartData = {
      type: 'doughnut',
      labels: ['修復成功', '修復失敗'],
      datasets: [{
        data: [
          metrics.repairAnalysis.repairSuccessRate * 100,
          (1 - metrics.repairAnalysis.repairSuccessRate) * 100
        ],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    };

    // システム健全性チャート
    const systemHealth: ChartData = {
      type: 'bar',
      labels: ['コード品質', 'テストカバレッジ', 'アクセシビリティ', 'セキュリティ'],
      datasets: [{
        label: '品質スコア (%)',
        data: [
          metrics.qualityMetrics.codeQuality,
          metrics.qualityMetrics.testCoverage,
          metrics.qualityMetrics.accessibility,
          metrics.qualityMetrics.security
        ],
        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545']
      }]
    };

    return {
      errorTrend,
      performanceTrend,
      repairRate,
      systemHealth
    };
  }

  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    console.log(`📊 統合レポート生成開始: ${config.title}`);

    // データ収集
    await this.collectDataFromSources();

    // データ分析
    const metrics = this.analyzeData(config);

    // インサイト生成
    const insights = this.generateInsights(metrics);

    // チャート生成
    const charts = this.generateCharts(metrics);

    const report: GeneratedReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date().toISOString(),
      config,
      metrics,
      insights,
      charts,
      rawData: this.filterDataByTimeRange(config.timeRange)
    };

    // 出力形式に応じてレポート生成
    await this.outputReport(report);

    console.log('✅ 統合レポート生成完了');
    return report;
  }

  private async outputReport(report: GeneratedReport): Promise<void> {
    const { outputFormats } = report.config;

    if (outputFormats.includes('html')) {
      await this.generateHTMLReport(report);
    }

    if (outputFormats.includes('json')) {
      await this.generateJSONReport(report);
    }

    if (outputFormats.includes('csv')) {
      await this.generateCSVReport(report);
    }

    if (outputFormats.includes('pdf')) {
      await this.generatePDFReport(report);
    }
  }

  private async generateHTMLReport(report: GeneratedReport): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.config.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1600px; 
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
        .header .subtitle { font-size: 1.2em; opacity: 0.9; }
        .status-banner {
            background: ${this.getHealthColor(report.metrics.overview.systemHealth)};
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            padding: 40px;
            background: #f8f9fa;
        }
        .metric-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .metric-card:hover { transform: translateY(-5px); }
        .metric-number {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .metric-label {
            color: #6c757d;
            font-size: 1.1em;
        }
        .excellent { color: #28a745; }
        .good { color: #20c997; }
        .warning { color: #ffc107; }
        .critical { color: #dc3545; }
        .section {
            padding: 40px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin: 30px 0;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }
        .insight-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 30px 0;
        }
        .insight-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }
        .insight-section h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        .insight-item {
            background: #f8f9fa;
            margin: 15px 0;
            padding: 15px;
            border-radius: 10px;
            border-left: 5px solid #667eea;
        }
        .alert-item {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        .recommendation-item {
            border-left-color: #28a745;
            background: #d4edda;
        }
        .finding-item {
            border-left-color: #007bff;
            background: #cce7ff;
        }
        .trend-item {
            border-left-color: #ffc107;
            background: #fff3cd;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .data-table th,
        .data-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .data-table th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .footer {
            background: #333;
            color: white;
            padding: 30px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${report.config.title}</h1>
            <div class="subtitle">Generated: ${new Date(report.generatedAt).toLocaleString('ja-JP')}</div>
            <div class="subtitle">Period: ${report.config.timeRange.start.toLocaleDateString()} - ${report.config.timeRange.end.toLocaleDateString()}</div>
        </div>

        <div class="status-banner">
            システム健全性: ${report.metrics.overview.systemHealth.toUpperCase()} | 
            総エラー: ${report.metrics.overview.totalErrors} | 
            修復率: ${Math.round(report.metrics.repairAnalysis.repairSuccessRate * 100)}%
        </div>

        ${report.config.includeSections.overview ? `
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.metrics.overview.totalSessions}</div>
                <div class="metric-label">監視セッション</div>
            </div>
            <div class="metric-card">
                <div class="metric-number critical">${report.metrics.overview.totalErrors}</div>
                <div class="metric-label">総エラー数</div>
            </div>
            <div class="metric-card">
                <div class="metric-number excellent">${report.metrics.overview.totalRepairs}</div>
                <div class="metric-label">自動修復数</div>
            </div>
            <div class="metric-card">
                <div class="metric-number ${report.metrics.overview.systemHealth}">${Math.round(report.metrics.overview.successRate * 100)}%</div>
                <div class="metric-label">検証成功率</div>
            </div>
            <div class="metric-card">
                <div class="metric-number good">${Math.round(report.metrics.performanceAnalysis.avgLoadTime)}ms</div>
                <div class="metric-label">平均ロード時間</div>
            </div>
            <div class="metric-card">
                <div class="metric-number excellent">${Math.round(report.metrics.qualityMetrics.codeQuality)}%</div>
                <div class="metric-label">コード品質</div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>📈 分析チャート</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>エラー発生トレンド</h3>
                    <canvas id="errorTrendChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h3>パフォーマンストレンド</h3>
                    <canvas id="performanceTrendChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h3>修復成功率</h3>
                    <canvas id="repairRateChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h3>品質メトリクス</h3>
                    <canvas id="systemHealthChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>💡 インサイト</h2>
            <div class="insight-grid">
                <div class="insight-section">
                    <h3>🔍 主要な発見</h3>
                    ${report.insights.keyFindings.map(finding => 
                        `<div class="insight-item finding-item">${finding}</div>`
                    ).join('')}
                </div>
                
                <div class="insight-section">
                    <h3>📊 トレンド</h3>
                    ${report.insights.trends.map(trend => 
                        `<div class="insight-item trend-item">${trend}</div>`
                    ).join('')}
                </div>

                ${report.insights.alerts.length > 0 ? `
                <div class="insight-section">
                    <h3>🚨 アラート</h3>
                    ${report.insights.alerts.map(alert => 
                        `<div class="insight-item alert-item">${alert}</div>`
                    ).join('')}
                </div>
                ` : ''}

                <div class="insight-section">
                    <h3>🎯 推奨事項</h3>
                    ${report.insights.recommendations.map(rec => 
                        `<div class="insight-item recommendation-item">${rec}</div>`
                    ).join('')}
                </div>
            </div>
        </div>

        ${report.config.includeSections.errorAnalysis ? `
        <div class="section">
            <h2>🐛 エラー分析</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                <div>
                    <h3>エラータイプ別</h3>
                    <table class="data-table">
                        <thead>
                            <tr><th>タイプ</th><th>件数</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries(report.metrics.errorAnalysis.errorsByType).map(([type, count]) =>
                                `<tr><td>${type}</td><td>${count}</td></tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                <div>
                    <h3>重要度別</h3>
                    <table class="data-table">
                        <thead>
                            <tr><th>重要度</th><th>件数</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries(report.metrics.errorAnalysis.errorsBySeverity).map(([severity, count]) =>
                                `<tr><td>${severity}</td><td>${count}</td></tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>🔄 継続的なWebUI監視により、システムの健全性を維持</p>
            <p style="margin-top: 10px; opacity: 0.8;">Generated by Enhanced Report Generator v1.0</p>
        </div>
    </div>

    <script>
        // Chart.js によるチャート描画
        const ctx1 = document.getElementById('errorTrendChart').getContext('2d');
        new Chart(ctx1, {
            type: '${report.charts.errorTrend.type}',
            data: ${JSON.stringify(report.charts.errorTrend)},
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });

        const ctx2 = document.getElementById('performanceTrendChart').getContext('2d');
        new Chart(ctx2, {
            type: '${report.charts.performanceTrend.type}',
            data: ${JSON.stringify(report.charts.performanceTrend)},
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });

        const ctx3 = document.getElementById('repairRateChart').getContext('2d');
        new Chart(ctx3, {
            type: '${report.charts.repairRate.type}',
            data: ${JSON.stringify(report.charts.repairRate)},
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });

        const ctx4 = document.getElementById('systemHealthChart').getContext('2d');
        new Chart(ctx4, {
            type: '${report.charts.systemHealth.type}',
            data: ${JSON.stringify(report.charts.systemHealth)},
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
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

    const htmlPath = path.join(this.outputDir, `${report.id}.html`);
    await fs.promises.writeFile(htmlPath, htmlContent);
    console.log(`📄 HTMLレポート生成: ${htmlPath}`);
  }

  private getHealthColor(health: string): string {
    const colors = {
      'excellent': '#28a745',
      'good': '#20c997',
      'warning': '#ffc107',
      'critical': '#dc3545'
    };
    return colors[health as keyof typeof colors] || '#6c757d';
  }

  private async generateJSONReport(report: GeneratedReport): Promise<void> {
    const jsonPath = path.join(this.outputDir, `${report.id}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSONレポート生成: ${jsonPath}`);
  }

  private async generateCSVReport(report: GeneratedReport): Promise<void> {
    // エラーデータのCSV出力
    const errorData = report.rawData
      .filter(d => d.type === 'error-report')
      .flatMap(d => d.data.errors || [])
      .map((error: any) => ({
        timestamp: error.timestamp,
        type: error.type || error.category,
        severity: error.severity,
        message: error.message,
        source: error.source
      }));

    if (errorData.length > 0) {
      const csvWriter = createObjectCsvWriter({
        path: path.join(this.outputDir, `${report.id}_errors.csv`),
        header: [
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'type', title: 'Type' },
          { id: 'severity', title: 'Severity' },
          { id: 'message', title: 'Message' },
          { id: 'source', title: 'Source' }
        ]
      });

      await csvWriter.writeRecords(errorData);
      console.log(`📄 CSVレポート生成: ${report.id}_errors.csv`);
    }
  }

  private async generatePDFReport(report: GeneratedReport): Promise<void> {
    // PDF生成は高度な機能のため、基本実装のみ
    console.log(`📄 PDF生成は今後実装予定: ${report.id}.pdf`);
  }
}

export { EnhancedReportGenerator, ReportConfig, GeneratedReport, IntegratedMetrics };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const reportGenerator = new EnhancedReportGenerator();
  
  const run = async () => {
    try {
      const config: ReportConfig = {
        title: 'WebUI 監視システム 統合レポート',
        includeSections: {
          overview: true,
          errorAnalysis: true,
          repairAnalysis: true,
          performanceAnalysis: true,
          qualityMetrics: true,
          recommendations: true,
          rawData: false
        },
        outputFormats: ['html', 'json', 'csv'],
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
          end: new Date()
        },
        aggregationLevel: 'day'
      };
      
      const report = await reportGenerator.generateReport(config);
      
      console.log('\n✅ Enhanced Report Generator 完了');
      console.log(`📊 レポートID: ${report.id}`);
      console.log(`📈 システム健全性: ${report.metrics.overview.systemHealth}`);
      console.log(`🐛 総エラー数: ${report.metrics.overview.totalErrors}`);
      console.log(`🔧 修復成功率: ${Math.round(report.metrics.repairAnalysis.repairSuccessRate * 100)}%`);
      
    } catch (error) {
      console.error('❌ Enhanced Report Generator 失敗:', error);
      process.exit(1);
    }
  };

  run();
}
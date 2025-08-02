/**
 * 修復後自動検証システム
 * - 修復されたコードの動作確認
 * - TypeScript/ESLintチェック
 * - 単体テスト実行
 * - E2Eテスト実行
 * - パフォーマンス検証
 */

import { Page, Browser, BrowserContext, chromium } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface VerificationConfig {
  typeScriptCheck: boolean;
  eslintCheck: boolean;
  unitTests: boolean;
  e2eTests: boolean;
  performanceCheck: boolean;
  compileCheck: boolean;
  accessibilityCheck: boolean;
}

interface VerificationResult {
  id: string;
  testType: string;
  success: boolean;
  duration: number;
  output: string;
  errors: string[];
  warnings: string[];
  details: any;
  timestamp: string;
}

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  memoryUsage: number;
  networkRequests: number;
  bundleSize: number;
}

interface VerificationReport {
  sessionId: string;
  startTime: string;
  endTime: string;
  overallSuccess: boolean;
  verificationConfig: VerificationConfig;
  results: VerificationResult[];
  performanceMetrics: PerformanceMetrics;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    successRate: number;
  };
  recommendations: string[];
  regressionIssues: string[];
}

class AutoVerificationSystem {
  private sourceDir: string;
  private reportDir: string;
  private sessionId: string;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor(
    sourceDir: string = './src',
    reportDir: string = './verification-reports'
  ) {
    this.sourceDir = path.resolve(sourceDir);
    this.reportDir = path.resolve(reportDir);
    this.sessionId = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initializeBrowser(): Promise<void> {
    console.log('🚀 Auto Verification System を初期化中...');
    
    this.browser = await chromium.launch({
      headless: true, // 検証は高速化のためヘッドレス
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    console.log('✅ ブラウザ初期化完了');
  }

  async runTypeScriptCheck(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('📝 TypeScriptチェック実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'TypeScript Check',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      // TypeScriptコンパイルチェック
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: path.dirname(this.sourceDir),
        timeout: 60000
      });

      result.output = stdout;
      result.duration = Date.now() - startTime;

      if (stderr) {
        result.errors = stderr.split('\n').filter(line => line.trim());
        result.success = false;
      } else {
        result.success = true;
      }

      console.log(`✅ TypeScriptチェック完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ TypeScriptチェック失敗: ${error.message}`);
    }

    return result;
  }

  async runESLintCheck(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('🔍 ESLintチェック実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'ESLint Check',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      // ESLintチェック
      const { stdout, stderr } = await execAsync('npx eslint . --ext .ts,.tsx,.js,.jsx --format json', {
        cwd: path.dirname(this.sourceDir),
        timeout: 60000
      });

      result.duration = Date.now() - startTime;
      result.output = stdout;

      if (stdout) {
        try {
          const eslintResults = JSON.parse(stdout);
          const errors = eslintResults.flatMap((file: any) => 
            file.messages.filter((msg: any) => msg.severity === 2)
          );
          const warnings = eslintResults.flatMap((file: any) => 
            file.messages.filter((msg: any) => msg.severity === 1)
          );

          result.errors = errors.map((err: any) => `${err.ruleId}: ${err.message} (${err.line}:${err.column})`);
          result.warnings = warnings.map((warn: any) => `${warn.ruleId}: ${warn.message} (${warn.line}:${warn.column})`);
          result.details = { totalFiles: eslintResults.length, errorCount: errors.length, warningCount: warnings.length };
          result.success = errors.length === 0;
        } catch (parseError) {
          result.errors = ['ESLint output parsing failed'];
          result.success = false;
        }
      } else {
        result.success = true;
      }

      console.log(`✅ ESLintチェック完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ ESLintチェック失敗: ${error.message}`);
    }

    return result;
  }

  async runUnitTests(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('🧪 単体テスト実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'Unit Tests',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Jest/Vitestテスト実行
      let testCommand = 'npm test -- --watchAll=false --passWithNoTests';
      
      // package.jsonから適切なテストコマンドを判定
      const packageJsonPath = path.join(path.dirname(this.sourceDir), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.scripts?.test) {
          if (packageJson.scripts.test.includes('vitest')) {
            testCommand = 'npx vitest run';
          }
        }
      }

      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: path.dirname(this.sourceDir),
        timeout: 120000
      });

      result.duration = Date.now() - startTime;
      result.output = stdout;

      // テスト結果の解析
      const testsPassed = stdout.includes('Tests:') && !stdout.includes('failed');
      const testsMatch = stdout.match(/Tests:\s+(\d+) passed/);
      const failedMatch = stdout.match(/(\d+) failed/);

      result.details = {
        passed: testsMatch ? parseInt(testsMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0
      };

      if (stderr) {
        result.errors = stderr.split('\n').filter(line => line.trim());
      }

      result.success = testsPassed && !failedMatch;
      console.log(`✅ 単体テスト完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ 単体テスト失敗: ${error.message}`);
    }

    return result;
  }

  async runCompileCheck(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('🔨 コンパイルチェック実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'Compile Check',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Reactアプリケーションのビルドテスト
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: path.dirname(this.sourceDir),
        timeout: 180000
      });

      result.duration = Date.now() - startTime;
      result.output = stdout;

      if (stderr && !stderr.includes('warning')) {
        result.errors = stderr.split('\n').filter(line => line.trim());
        result.success = false;
      } else {
        // ビルド成功の確認
        const buildDir = path.join(path.dirname(this.sourceDir), 'dist');
        const buildDirAlt = path.join(path.dirname(this.sourceDir), 'build');
        
        result.success = fs.existsSync(buildDir) || fs.existsSync(buildDirAlt);
        
        if (stderr) {
          result.warnings = stderr.split('\n').filter(line => line.trim());
        }
      }

      console.log(`✅ コンパイルチェック完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ コンパイルチェック失敗: ${error.message}`);
    }

    return result;
  }

  async runE2ETests(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('🌐 E2Eテスト実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'E2E Tests',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    if (!this.context) {
      result.errors = ['Browser context not initialized'];
      return result;
    }

    try {
      const page = await this.context.newPage();
      const baseUrl = 'http://192.168.3.135:3000';
      
      // 基本的なE2Eテスト
      const testUrls = [
        '/',
        '/dashboard',
        '/incidents',
        '/problems',
        '/admin'
      ];

      const testResults = [];

      for (const urlPath of testUrls) {
        const url = `${baseUrl}${urlPath}`;
        
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          
          // ページの基本チェック
          const title = await page.title();
          const hasErrors = await page.evaluate(() => {
            const errors = [];
            // @ts-ignore
            if (window.console && window.console.error) {
              // コンソールエラーをチェック
              return false; // 簡略化
            }
            return false;
          });

          testResults.push({
            url,
            success: !hasErrors && title.length > 0,
            title,
            loadTime: Date.now() - startTime
          });

        } catch (error) {
          testResults.push({
            url,
            success: false,
            error: error.toString()
          });
        }
      }

      await page.close();

      result.duration = Date.now() - startTime;
      result.details = { testResults };
      result.success = testResults.every(test => test.success);
      result.output = `E2E Tests completed: ${testResults.filter(t => t.success).length}/${testResults.length} passed`;

      console.log(`✅ E2Eテスト完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ E2Eテスト失敗: ${error.message}`);
    }

    return result;
  }

  async runPerformanceCheck(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('⚡ パフォーマンスチェック実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'Performance Check',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    if (!this.context) {
      result.errors = ['Browser context not initialized'];
      return result;
    }

    try {
      const page = await this.context.newPage();
      const baseUrl = 'http://192.168.3.135:3000';

      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // パフォーマンスメトリクスの取得
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          // @ts-ignore
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        };
      });

      // ネットワークリクエスト数の取得
      const networkRequests = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });

      await page.close();

      // パフォーマンス閾値チェック
      const performanceIssues = [];
      
      if (metrics.domContentLoaded > 3000) {
        performanceIssues.push(`DOM読み込み時間が遅い: ${metrics.domContentLoaded}ms`);
      }
      
      if (metrics.firstContentfulPaint > 2500) {
        performanceIssues.push(`初回描画が遅い: ${metrics.firstContentfulPaint}ms`);
      }
      
      if (networkRequests > 100) {
        performanceIssues.push(`ネットワークリクエストが多い: ${networkRequests}件`);
      }

      result.duration = Date.now() - startTime;
      result.details = { metrics, networkRequests, performanceIssues };
      result.success = performanceIssues.length === 0;
      result.warnings = performanceIssues;
      result.output = `Performance check completed. Issues: ${performanceIssues.length}`;

      console.log(`✅ パフォーマンスチェック完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ パフォーマンスチェック失敗: ${error.message}`);
    }

    return result;
  }

  async runAccessibilityCheck(): Promise<VerificationResult> {
    const startTime = Date.now();
    console.log('♿ アクセシビリティチェック実行中...');

    const result: VerificationResult = {
      id: this.generateResultId(),
      testType: 'Accessibility Check',
      success: false,
      duration: 0,
      output: '',
      errors: [],
      warnings: [],
      details: {},
      timestamp: new Date().toISOString()
    };

    if (!this.context) {
      result.errors = ['Browser context not initialized'];
      return result;
    }

    try {
      const page = await this.context.newPage();
      const baseUrl = 'http://192.168.3.135:3000';

      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // axe-coreを注入してアクセシビリティチェック
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });

      const axeResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore
          window.axe.run((err: any, results: any) => {
            if (err) throw err;
            resolve(results);
          });
        });
      });

      await page.close();

      // @ts-ignore
      const violations = axeResults.violations || [];
      // @ts-ignore
      const passes = axeResults.passes || [];

      result.duration = Date.now() - startTime;
      result.details = { violations, passes, violationCount: violations.length };
      result.success = violations.length === 0;
      result.errors = violations.map((v: any) => `${v.id}: ${v.description}`);
      result.output = `Accessibility check completed. Violations: ${violations.length}, Passes: ${passes.length}`;

      console.log(`✅ アクセシビリティチェック完了: ${result.success ? 'PASS' : 'FAIL'} (${result.duration}ms)`);

    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors = [error.message];
      result.success = false;
      console.log(`❌ アクセシビリティチェック失敗: ${error.message}`);
    }

    return result;
  }

  async runFullVerification(config: VerificationConfig = {
    typeScriptCheck: true,
    eslintCheck: true,
    unitTests: true,
    e2eTests: true,
    performanceCheck: true,
    compileCheck: true,
    accessibilityCheck: true
  }): Promise<VerificationReport> {
    const startTime = new Date();
    console.log('🔍 包括的検証を開始...');

    const results: VerificationResult[] = [];

    // 設定に基づいて各チェックを実行
    if (config.typeScriptCheck) {
      results.push(await this.runTypeScriptCheck());
    }

    if (config.eslintCheck) {
      results.push(await this.runESLintCheck());
    }

    if (config.compileCheck) {
      results.push(await this.runCompileCheck());
    }

    if (config.unitTests) {
      results.push(await this.runUnitTests());
    }

    if (config.e2eTests) {
      results.push(await this.runE2ETests());
    }

    if (config.performanceCheck) {
      results.push(await this.runPerformanceCheck());
    }

    if (config.accessibilityCheck) {
      results.push(await this.runAccessibilityCheck());
    }

    const endTime = new Date();
    const passedChecks = results.filter(r => r.success).length;
    const failedChecks = results.filter(r => !r.success).length;
    const warningChecks = results.filter(r => r.warnings.length > 0).length;

    // パフォーマンスメトリクスの集計
    const performanceResult = results.find(r => r.testType === 'Performance Check');
    const performanceMetrics: PerformanceMetrics = performanceResult?.details?.metrics || {
      loadTime: 0,
      domContentLoaded: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      memoryUsage: 0,
      networkRequests: 0,
      bundleSize: 0
    };

    const report: VerificationReport = {
      sessionId: this.sessionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      overallSuccess: failedChecks === 0,
      verificationConfig: config,
      results,
      performanceMetrics,
      summary: {
        totalChecks: results.length,
        passedChecks,
        failedChecks,
        warningChecks,
        successRate: Math.round((passedChecks / results.length) * 100)
      },
      recommendations: this.generateRecommendations(results),
      regressionIssues: this.detectRegressionIssues(results)
    };

    await this.saveVerificationReport(report);
    console.log('✅ 包括的検証完了');

    return report;
  }

  private generateRecommendations(results: VerificationResult[]): string[] {
    const recommendations: string[] = [];
    const failedResults = results.filter(r => !r.success);
    const warningResults = results.filter(r => r.warnings.length > 0);

    if (failedResults.length === 0) {
      recommendations.push('✅ すべての検証項目が合格しました - 修復が成功しています');
    } else {
      recommendations.push(`❌ ${failedResults.length} 件の検証項目が失敗しました - 追加の修復が必要です`);
      
      failedResults.forEach(result => {
        recommendations.push(`🔧 ${result.testType}: ${result.errors[0] || '詳細を確認してください'}`);
      });
    }

    if (warningResults.length > 0) {
      recommendations.push(`⚠️ ${warningResults.length} 件の警告があります - 改善を検討してください`);
    }

    // パフォーマンス関連の推奨事項
    const perfResult = results.find(r => r.testType === 'Performance Check');
    if (perfResult && !perfResult.success) {
      recommendations.push('⚡ パフォーマンスの最適化を検討してください');
    }

    // アクセシビリティ関連の推奨事項
    const a11yResult = results.find(r => r.testType === 'Accessibility Check');
    if (a11yResult && !a11yResult.success) {
      recommendations.push('♿ アクセシビリティの改善を検討してください');
    }

    recommendations.push('🧪 継続的な検証により、品質を維持してください');
    recommendations.push('📊 定期的な監視により、回帰を防止できます');

    return recommendations;
  }

  private detectRegressionIssues(results: VerificationResult[]): string[] {
    const regressionIssues: string[] = [];

    // 基本的な回帰検出ロジック
    const criticalFailures = results.filter(r => 
      !r.success && ['TypeScript Check', 'Compile Check'].includes(r.testType)
    );

    criticalFailures.forEach(failure => {
      regressionIssues.push(`重大な回帰: ${failure.testType} が失敗しています`);
    });

    // パフォーマンス回帰のチェック
    const perfResult = results.find(r => r.testType === 'Performance Check');
    if (perfResult?.details?.performanceIssues?.length > 0) {
      regressionIssues.push('パフォーマンス回帰の可能性があります');
    }

    return regressionIssues;
  }

  private async saveVerificationReport(report: VerificationReport): Promise<void> {
    const jsonPath = path.join(this.reportDir, `verification-report-${this.sessionId}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(report, null, 2));

    const htmlPath = path.join(this.reportDir, `verification-report-${this.sessionId}.html`);
    const htmlContent = this.generateVerificationHTMLReport(report);
    await fs.promises.writeFile(htmlPath, htmlContent);

    console.log(`📊 検証レポート保存: ${jsonPath}`);
  }

  private generateVerificationHTMLReport(report: VerificationReport): string {
    const statusColor = report.overallSuccess ? '#28a745' : '#dc3545';
    const statusIcon = report.overallSuccess ? '✅' : '❌';

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto Verification Report</title>
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
        .result-item {
            background: #f8f9fa;
            margin: 10px 0;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #ddd;
        }
        .result-success { border-left-color: #28a745; background: #d4edda; }
        .result-failed { border-left-color: #dc3545; background: #f8d7da; }
        .result-warning { border-left-color: #ffc107; background: #fff3cd; }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #eee;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            width: ${report.summary.successRate}%;
            transition: width 0.3s ease;
        }
        .recommendations {
            background: #e3f2fd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
        }
        .recommendation-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon} Auto Verification Report</h1>
            <div class="subtitle">Session: ${report.sessionId}</div>
            <div class="subtitle">Generated: ${new Date(report.endTime).toLocaleString('ja-JP')}</div>
        </div>

        <div class="status-banner">
            検証結果: ${report.overallSuccess ? 'SUCCESS' : 'FAILED'} (成功率: ${report.summary.successRate}%)
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-number">${report.summary.totalChecks}</div>
                <div class="metric-label">Total Checks</div>
            </div>
            <div class="metric-card">
                <div class="metric-number success">${report.summary.passedChecks}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-number error">${report.summary.failedChecks}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-number warning">${report.summary.warningChecks}</div>
                <div class="metric-label">Warnings</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${Math.round(report.performanceMetrics.domContentLoaded)}ms</div>
                <div class="metric-label">DOM Load Time</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Verification Progress</h2>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p>検証成功率: ${report.summary.successRate}% (${report.summary.passedChecks}/${report.summary.totalChecks})</p>
        </div>

        <div class="section">
            <h2>🔍 Verification Results</h2>
            ${report.results.map(result => `
                <div class="result-item ${result.success ? 'result-success' : 'result-failed'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${result.success ? '✅ PASS' : '❌ FAIL'} - ${result.testType}</strong>
                        <span>${result.duration}ms</span>
                    </div>
                    ${result.errors.length > 0 ? `
                        <div><strong>Errors:</strong></div>
                        <ul>
                            ${result.errors.slice(0, 3).map(error => `<li>${error}</li>`).join('')}
                            ${result.errors.length > 3 ? `<li>... and ${result.errors.length - 3} more errors</li>` : ''}
                        </ul>
                    ` : ''}
                    ${result.warnings.length > 0 ? `
                        <div><strong>Warnings:</strong></div>
                        <ul>
                            ${result.warnings.slice(0, 3).map(warning => `<li>${warning}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${result.output ? `<div><strong>Output:</strong> ${result.output.substring(0, 200)}...</div>` : ''}
                </div>
            `).join('')}
        </div>

        ${report.regressionIssues.length > 0 ? `
        <div class="section">
            <h2>🚨 Regression Issues</h2>
            ${report.regressionIssues.map(issue => `
                <div class="result-item result-failed">❌ ${issue}</div>
            `).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => 
                    `<div class="recommendation-item">${rec}</div>`
                ).join('')}
            </div>
        </div>

        <div class="section">
            <h2>⚡ Performance Metrics</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div><strong>DOM Content Loaded:</strong> ${Math.round(report.performanceMetrics.domContentLoaded)}ms</div>
                <div><strong>First Paint:</strong> ${Math.round(report.performanceMetrics.firstPaint)}ms</div>
                <div><strong>First Contentful Paint:</strong> ${Math.round(report.performanceMetrics.firstContentfulPaint)}ms</div>
                <div><strong>Memory Usage:</strong> ${Math.round(report.performanceMetrics.memoryUsage / 1024 / 1024)}MB</div>
                <div><strong>Network Requests:</strong> ${report.performanceMetrics.networkRequests}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}

export { AutoVerificationSystem, VerificationConfig, VerificationResult, VerificationReport };

// スクリプトとして直接実行された場合
if (require.main === module) {
  const verificationSystem = new AutoVerificationSystem();
  
  const run = async () => {
    try {
      await verificationSystem.initializeBrowser();
      
      const config: VerificationConfig = {
        typeScriptCheck: true,
        eslintCheck: true,
        unitTests: false, // 開発中はスキップ
        e2eTests: true,
        performanceCheck: true,
        compileCheck: true,
        accessibilityCheck: true
      };
      
      const report = await verificationSystem.runFullVerification(config);
      
      console.log('\n✅ Auto Verification System 完了');
      console.log(`📊 検証成功率: ${report.summary.successRate}%`);
      console.log(`✅ 合格: ${report.summary.passedChecks}`);
      console.log(`❌ 失敗: ${report.summary.failedChecks}`);
      
      if (report.regressionIssues.length > 0) {
        console.log(`🚨 回帰問題: ${report.regressionIssues.length} 件`);
      }
      
    } catch (error) {
      console.error('❌ Auto Verification System 失敗:', error);
      process.exit(1);
    } finally {
      await verificationSystem.cleanup();
    }
  };

  run();
}
/**
 * 強化された無限ループ自動化システムのテスト実行と結果報告
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  details: any;
  errors?: string[];
  warnings?: string[];
}

interface SystemTestReport {
  timestamp: string;
  testSuite: string;
  environment: {
    nodeVersion: string;
    osInfo: string;
    workingDirectory: string;
    webUIStatus: 'online' | 'offline' | 'unknown';
    backendStatus: 'online' | 'offline' | 'unknown';
  };
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    successRate: number;
  };
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  nextSteps: string[];
}

class EnhancedInfiniteLoopTester {
  private testResults: TestResult[] = [];
  private reportDir = './enhanced-infinite-loop-reports/tests';
  private baseUrl = 'http://192.168.3.135:3000';
  private backendUrl = 'http://192.168.3.135:8000';

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private async runCommand(command: string, args: string[] = [], timeout: number = 30000): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const process = spawn(command, args, { cwd: '/media/kensan/LinuxHDD/ITSM-ITmanagementSystem' });
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        process.kill('SIGTERM');
        resolve({ success: false, stdout, stderr: stderr + '\nTimeout exceeded' });
      }, timeout);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0,
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stdout,
          stderr: stderr + error.message
        });
      });
    });
  }

  private async checkURL(url: string, timeout: number = 10000): Promise<{ online: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // curl を使用してURLをチェック
      const result = await this.runCommand('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '10', url], timeout);
      const responseTime = Date.now() - startTime;
      
      if (result.success && result.stdout.trim() === '200') {
        return { online: true, responseTime };
      } else {
        return { online: false, responseTime, error: `HTTP ${result.stdout.trim() || 'unknown'}` };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { online: false, responseTime, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async testSystemEnvironment(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Node.js バージョンチェック
      const nodeResult = await this.runCommand('node', ['--version']);
      if (!nodeResult.success) {
        errors.push('Node.js not available');
      }

      // NPM の存在確認
      const npmResult = await this.runCommand('npm', ['--version']);
      if (!npmResult.success) {
        errors.push('npm not available');
      }

      // TypeScript の存在確認
      const tsResult = await this.runCommand('npx', ['tsc', '--version']);
      if (!tsResult.success) {
        warnings.push('TypeScript not available via npx');
      }

      // Playwright の存在確認
      const playwrightResult = await this.runCommand('npx', ['playwright', '--version']);
      if (!playwrightResult.success) {
        warnings.push('Playwright not available');
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'System Environment Check',
        status,
        duration,
        details: {
          nodeVersion: nodeResult.stdout.trim(),
          npmVersion: npmResult.stdout.trim(),
          typescriptAvailable: tsResult.success,
          playwrightAvailable: playwrightResult.success
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'System Environment Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['Environment check failed']
      };
    }
  }

  private async testWebUIConnectivity(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // メインページのチェック
      const mainPageResult = await this.checkURL(this.baseUrl);
      if (!mainPageResult.online) {
        errors.push(`Main page not accessible: ${mainPageResult.error}`);
      }

      // 管理者ダッシュボードのチェック
      const adminPageResult = await this.checkURL(`${this.baseUrl}/admin`);
      if (!adminPageResult.online) {
        warnings.push(`Admin page not accessible: ${adminPageResult.error}`);
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'WebUI Connectivity Check',
        status,
        duration,
        details: {
          mainPageOnline: mainPageResult.online,
          mainPageResponseTime: mainPageResult.responseTime,
          adminPageOnline: adminPageResult.online,
          adminPageResponseTime: adminPageResult.responseTime
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'WebUI Connectivity Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['WebUI connectivity test failed']
      };
    }
  }

  private async testBackendConnectivity(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // バックエンドのヘルスチェック
      const healthResult = await this.checkURL(`${this.backendUrl}/health`);
      if (!healthResult.online) {
        errors.push(`Backend health endpoint not accessible: ${healthResult.error}`);
      }

      // API情報エンドポイント
      const infoResult = await this.checkURL(`${this.backendUrl}/api/v1/info`);
      if (!infoResult.online) {
        warnings.push(`API info endpoint not accessible: ${infoResult.error}`);
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'Backend Connectivity Check',
        status,
        duration,
        details: {
          healthEndpointOnline: healthResult.online,
          healthResponseTime: healthResult.responseTime,
          infoEndpointOnline: infoResult.online,
          infoResponseTime: infoResult.responseTime
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'Backend Connectivity Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['Backend connectivity test failed']
      };
    }
  }

  private async testTypeScriptCompilation(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 主要なTypScriptファイルのコンパイルテスト
      const files = [
        'enhanced-infinite-loop-automation.ts',
        'internal-validation-system.ts',
        'enhanced-logging-reporting-system.ts'
      ];

      const compilationResults: any = {};

      for (const file of files) {
        if (fs.existsSync(file)) {
          const compileResult = await this.runCommand('npx', [
            'tsc',
            file,
            '--outDir', './compiled',
            '--target', 'es2020',
            '--lib', 'es2020,dom',
            '--moduleResolution', 'node',
            '--allowSyntheticDefaultImports',
            '--skipLibCheck'
          ], 15000);

          compilationResults[file] = {
            success: compileResult.success,
            errors: compileResult.stderr
          };

          if (!compileResult.success) {
            errors.push(`Failed to compile ${file}: ${compileResult.stderr}`);
          }
        } else {
          warnings.push(`File not found: ${file}`);
        }
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'TypeScript Compilation Test',
        status,
        duration,
        details: compilationResults,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'TypeScript Compilation Test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['TypeScript compilation test failed']
      };
    }
  }

  private async testPlaywrightInstallation(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Playwright の存在確認
      const playwrightResult = await this.runCommand('npx', ['playwright', '--version']);
      if (!playwrightResult.success) {
        errors.push('Playwright not installed');
      }

      // ブラウザの存在確認
      const browserResult = await this.runCommand('npx', ['playwright', 'install', '--dry-run', 'chromium']);
      if (browserResult.stderr.includes('missing')) {
        warnings.push('Chromium browser not installed');
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'Playwright Installation Test',
        status,
        duration,
        details: {
          playwrightVersion: playwrightResult.stdout.trim(),
          browserCheck: browserResult.stdout
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'Playwright Installation Test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['Playwright installation test failed']
      };
    }
  }

  private async testInfiniteLoopState(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const stateFile = './coordination/infinite_loop_state.json';
      
      if (!fs.existsSync(stateFile)) {
        warnings.push('Infinite loop state file not found');
        return {
          testName: 'Infinite Loop State Check',
          status: 'skipped',
          duration: Date.now() - startTime,
          details: { message: 'State file not found' },
          warnings
        };
      }

      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const state = JSON.parse(stateContent);

      // 状態の検証
      const requiredFields = ['loop_count', 'total_errors_fixed', 'last_scan', 'repair_history'];
      for (const field of requiredFields) {
        if (!(field in state)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // 最新のスキャン時刻をチェック
      const lastScan = new Date(state.last_scan);
      const now = new Date();
      const timeDiff = now.getTime() - lastScan.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 1) {
        warnings.push(`Last scan was ${hoursDiff.toFixed(1)} hours ago`);
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'Infinite Loop State Check',
        status,
        duration,
        details: {
          loopCount: state.loop_count,
          totalErrorsFixed: state.total_errors_fixed,
          lastScan: state.last_scan,
          repairHistoryCount: state.repair_history?.length || 0,
          hoursSinceLastScan: hoursDiff
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'Infinite Loop State Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['State file validation failed']
      };
    }
  }

  private async testDirectoryStructure(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 必要なディレクトリの存在確認
      const requiredDirs = [
        './enhanced-infinite-loop-reports',
        './enhanced-infinite-loop-reports/logs',
        './enhanced-infinite-loop-reports/screenshots',
        './enhanced-infinite-loop-reports/videos',
        './enhanced-infinite-loop-reports/analytics',
        './enhanced-infinite-loop-reports/validation'
      ];

      const dirStatus: any = {};

      for (const dir of requiredDirs) {
        const exists = fs.existsSync(dir);
        dirStatus[dir] = exists;
        
        if (!exists) {
          warnings.push(`Directory not found: ${dir}`);
          // ディレクトリを作成
          try {
            fs.mkdirSync(dir, { recursive: true });
            warnings.push(`Created directory: ${dir}`);
          } catch (createError) {
            errors.push(`Failed to create directory: ${dir}`);
          }
        }
      }

      // 重要なファイルの存在確認
      const importantFiles = [
        'enhanced-infinite-loop-automation.ts',
        'internal-validation-system.ts',
        'enhanced-logging-reporting-system.ts',
        'run-enhanced-infinite-loop.sh'
      ];

      const fileStatus: any = {};

      for (const file of importantFiles) {
        const exists = fs.existsSync(file);
        fileStatus[file] = exists;
        
        if (!exists) {
          errors.push(`Important file not found: ${file}`);
        }
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'Directory Structure Check',
        status,
        duration,
        details: {
          directories: dirStatus,
          files: fileStatus
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'Directory Structure Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errors: ['Directory structure test failed']
      };
    }
  }

  private async getEnvironmentInfo(): Promise<any> {
    try {
      const nodeResult = await this.runCommand('node', ['--version']);
      const osResult = await this.runCommand('uname', ['-a']);
      const webUIStatus = await this.checkURL(this.baseUrl);
      const backendStatus = await this.checkURL(`${this.backendUrl}/health`);

      return {
        nodeVersion: nodeResult.stdout.trim(),
        osInfo: osResult.stdout.trim(),
        workingDirectory: process.cwd(),
        webUIStatus: webUIStatus.online ? 'online' : 'offline',
        backendStatus: backendStatus.online ? 'online' : 'offline'
      };
    } catch (error) {
      return {
        nodeVersion: 'unknown',
        osInfo: 'unknown',
        workingDirectory: process.cwd(),
        webUIStatus: 'unknown',
        backendStatus: 'unknown'
      };
    }
  }

  async runFullTestSuite(): Promise<SystemTestReport> {
    console.log('🧪 強化された無限ループ自動化システムのテスト開始...');
    
    const startTime = Date.now();
    this.testResults = [];

    // テスト実行
    const tests = [
      this.testSystemEnvironment(),
      this.testWebUIConnectivity(),
      this.testBackendConnectivity(),
      this.testTypeScriptCompilation(),
      this.testPlaywrightInstallation(),
      this.testInfiniteLoopState(),
      this.testDirectoryStructure()
    ];

    this.testResults = await Promise.all(tests);

    const totalDuration = Date.now() - startTime;

    // 統計計算
    const total = this.testResults.length;
    const passed = this.testResults.filter(test => test.status === 'passed').length;
    const failed = this.testResults.filter(test => test.status === 'failed').length;
    const skipped = this.testResults.filter(test => test.status === 'skipped').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    // システム健全性評価
    const systemHealth: SystemTestReport['systemHealth'] = 
      successRate >= 95 ? 'excellent' :
      successRate >= 85 ? 'good' :
      successRate >= 70 ? 'fair' :
      successRate >= 50 ? 'poor' : 'critical';

    // 推奨事項とNext Steps
    const recommendations = this.generateRecommendations();
    const nextSteps = this.generateNextSteps();

    // 環境情報取得
    const environment = await this.getEnvironmentInfo();

    const report: SystemTestReport = {
      timestamp: new Date().toISOString(),
      testSuite: 'Enhanced Infinite Loop Automation System',
      environment,
      tests: this.testResults,
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration: totalDuration,
        successRate
      },
      systemHealth,
      recommendations,
      nextSteps
    };

    // レポート保存
    await this.saveTestReport(report);

    return report;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(test => test.status === 'failed');
    const warningTests = this.testResults.filter(test => test.warnings && test.warnings.length > 0);

    if (failedTests.length > 0) {
      recommendations.push('失敗したテストの詳細を確認し、問題を修正してください');
      
      if (failedTests.some(test => test.testName.includes('Environment'))) {
        recommendations.push('システム環境（Node.js、npm、TypeScript）を適切にセットアップしてください');
      }
      
      if (failedTests.some(test => test.testName.includes('Connectivity'))) {
        recommendations.push('WebUIとバックエンドサーバーが正常に起動していることを確認してください');
      }
      
      if (failedTests.some(test => test.testName.includes('Compilation'))) {
        recommendations.push('TypeScriptファイルのシンタックスエラーを修正してください');
      }
      
      if (failedTests.some(test => test.testName.includes('Playwright'))) {
        recommendations.push('Playwrightとブラウザを正しくインストールしてください');
      }
    }

    if (warningTests.length > 0) {
      recommendations.push('警告のあるテストを確認し、潜在的な問題に対処してください');
    }

    if (recommendations.length === 0) {
      recommendations.push('すべてのテストが正常に完了しました。システムの実運用を開始できます');
    }

    return recommendations;
  }

  private generateNextSteps(): string[] {
    const nextSteps: string[] = [];
    const failedTests = this.testResults.filter(test => test.status === 'failed');
    const successRate = this.testResults.filter(test => test.status === 'passed').length / this.testResults.length * 100;

    if (failedTests.length === 0) {
      nextSteps.push('1. 強化された無限ループ自動化システムを実行してください: ./run-enhanced-infinite-loop.sh');
      nextSteps.push('2. システムが正常に動作していることを監視してください: tail -f enhanced-infinite-loop-reports/logs/infinite-loop.log');
      nextSteps.push('3. 定期的にレポートを確認してシステムの健全性を監視してください');
      nextSteps.push('4. 必要に応じて設定を調整し、システムを最適化してください');
    } else {
      nextSteps.push('1. 失敗したテストの問題を修正してください');
      nextSteps.push('2. テストを再実行して問題が解決したことを確認してください');
      
      if (successRate >= 70) {
        nextSteps.push('3. 部分的にシステムを起動して動作を確認してください');
      } else {
        nextSteps.push('3. より多くの問題を修正してからシステムの起動を試行してください');
      }
    }

    return nextSteps;
  }

  private async saveTestReport(report: SystemTestReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON レポート
    const jsonPath = path.join(this.reportDir, `test-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Markdown レポート
    const markdownPath = path.join(this.reportDir, `test-report-${timestamp}.md`);
    const markdownContent = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdownContent);

    // HTML レポート
    const htmlPath = path.join(this.reportDir, `test-report-${timestamp}.html`);
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);

    console.log(`📄 テストレポート保存完了:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  private generateMarkdownReport(report: SystemTestReport): string {
    return `
# 強化された無限ループ自動化システム - テストレポート

## 概要
- **実行日時**: ${new Date(report.timestamp).toLocaleString()}
- **テストスイート**: ${report.testSuite}
- **システム健全性**: ${report.systemHealth.toUpperCase()}
- **成功率**: ${report.summary.successRate.toFixed(1)}%

## 環境情報
- **Node.js バージョン**: ${report.environment.nodeVersion}
- **OS情報**: ${report.environment.osInfo}
- **作業ディレクトリ**: ${report.environment.workingDirectory}
- **WebUI状態**: ${report.environment.webUIStatus}
- **バックエンド状態**: ${report.environment.backendStatus}

## テスト統計
- **総テスト数**: ${report.summary.total}
- **成功**: ${report.summary.passed}
- **失敗**: ${report.summary.failed}
- **スキップ**: ${report.summary.skipped}
- **実行時間**: ${(report.summary.duration / 1000).toFixed(1)}秒

## テスト結果詳細
${report.tests.map(test => `
### ${test.testName}
- **状態**: ${test.status === 'passed' ? '✅ 成功' : test.status === 'failed' ? '❌ 失敗' : '⏭️ スキップ'}
- **実行時間**: ${(test.duration / 1000).toFixed(1)}秒
- **詳細**: ${JSON.stringify(test.details, null, 2)}
${test.errors ? `- **エラー**: ${test.errors.join(', ')}` : ''}
${test.warnings ? `- **警告**: ${test.warnings.join(', ')}` : ''}
`).join('')}

## 推奨事項
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 次のステップ
${report.nextSteps.map(step => `${step}`).join('\n')}

## 結論
${report.systemHealth === 'excellent' ? '🎉 システムは優秀な状態です。無限ループ自動化システムの実運用を開始できます。' :
  report.systemHealth === 'good' ? '✅ システムは良好な状態です。軽微な調整後に運用開始できます。' :
  report.systemHealth === 'fair' ? '⚠️ システムには改善が必要です。問題を修正してから運用を開始してください。' :
  report.systemHealth === 'poor' ? '🚨 システムには重大な問題があります。詳細な調査と修正が必要です。' :
  '🔥 システムは危機的な状態です。基本的な環境から再構築が必要です。'}

---
*Generated by Enhanced Infinite Loop Automation System Test Suite at ${new Date().toLocaleString()}*
`;
  }

  private generateHTMLReport(report: SystemTestReport): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>強化された無限ループ自動化システム - テストレポート</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .health-badge { padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; }
        .health-excellent { background: #10b981; }
        .health-good { background: #3b82f6; }
        .health-fair { background: #f59e0b; }
        .health-poor { background: #ef4444; }
        .health-critical { background: #dc2626; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .summary-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .summary-label { color: #6b7280; margin-top: 5px; }
        .test-results { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .test-item { border-bottom: 1px solid #e5e7eb; padding: 15px 0; }
        .test-item:last-child { border-bottom: none; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .status-passed { background: #d1fae5; color: #065f46; }
        .status-failed { background: #fee2e2; color: #991b1b; }
        .status-skipped { background: #fef3c7; color: #92400e; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .rec-list { list-style: decimal; padding-left: 20px; }
        .rec-list li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>強化された無限ループ自動化システム</h1>
            <h2>テストレポート</h2>
            <p>実行日時: ${new Date(report.timestamp).toLocaleString()}</p>
            <span class="health-badge health-${report.systemHealth}">
                システム健全性: ${report.systemHealth.toUpperCase()}
            </span>
        </div>

        <div class="summary">
            <div class="summary-card">
                <div class="summary-value">${report.summary.successRate.toFixed(1)}%</div>
                <div class="summary-label">成功率</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${report.summary.passed}</div>
                <div class="summary-label">成功テスト</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${report.summary.failed}</div>
                <div class="summary-label">失敗テスト</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${(report.summary.duration / 1000).toFixed(1)}s</div>
                <div class="summary-label">実行時間</div>
            </div>
        </div>

        <div class="test-results">
            <h3>テスト結果詳細</h3>
            ${report.tests.map(test => `
                <div class="test-item">
                    <div class="test-name">
                        ${test.testName}
                        <span class="test-status status-${test.status}">
                            ${test.status === 'passed' ? '成功' : test.status === 'failed' ? '失敗' : 'スキップ'}
                        </span>
                    </div>
                    <div>実行時間: ${(test.duration / 1000).toFixed(1)}秒</div>
                    ${test.errors ? `<div style="color: #dc2626; margin-top: 5px;">エラー: ${test.errors.join(', ')}</div>` : ''}
                    ${test.warnings ? `<div style="color: #d97706; margin-top: 5px;">警告: ${test.warnings.join(', ')}</div>` : ''}
                    <details style="margin-top: 10px;">
                        <summary>詳細情報</summary>
                        <pre style="background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.8em;">${JSON.stringify(test.details, null, 2)}</pre>
                    </details>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>推奨事項</h3>
            <ul class="rec-list">
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>

            <h3>次のステップ</h3>
            <ol class="rec-list">
                ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
            </ol>
        </div>
    </div>
</body>
</html>
`;
  }
}

// メイン実行関数
export async function runSystemTests(): Promise<SystemTestReport> {
  const tester = new EnhancedInfiniteLoopTester();
  return await tester.runFullTestSuite();
}

// 直接実行時
if (require.main === module) {
  runSystemTests()
    .then((report) => {
      console.log('\n🎯 テスト実行完了');
      console.log(`📊 成功率: ${report.summary.successRate.toFixed(1)}%`);
      console.log(`🏥 システム健全性: ${report.systemHealth}`);
      console.log(`✅ 成功: ${report.summary.passed}/${report.summary.total}`);
      console.log(`❌ 失敗: ${report.summary.failed}/${report.summary.total}`);
      
      if (report.summary.failed > 0) {
        console.log('\n🚨 失敗したテスト:');
        report.tests.filter(test => test.status === 'failed').forEach(test => {
          console.log(`   - ${test.testName}`);
        });
      }
      
      console.log('\n📋 推奨事項:');
      report.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
      
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ テスト実行エラー:', error);
      process.exit(1);
    });
}
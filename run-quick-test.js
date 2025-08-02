#!/usr/bin/env node

/**
 * 強化された無限ループ自動化システムの簡易テスト
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class QuickTester {
  constructor() {
    this.testResults = [];
    this.reportDir = './enhanced-infinite-loop-reports/tests';
    this.baseUrl = 'http://192.168.3.135:3000';
    this.backendUrl = 'http://192.168.3.135:8000';
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runCommand(command, args = [], timeout = 30000) {
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

  async checkURL(url, timeout = 10000) {
    const startTime = Date.now();
    
    try {
      const result = await this.runCommand('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '10', url], timeout);
      const responseTime = Date.now() - startTime;
      
      if (result.success && result.stdout.trim() === '200') {
        return { online: true, responseTime };
      } else {
        return { online: false, responseTime, error: `HTTP ${result.stdout.trim() || 'unknown'}` };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { online: false, responseTime, error: error.message };
    }
  }

  async testSystemEnvironment() {
    console.log('🔍 System Environment Check...');
    const startTime = Date.now();
    const errors = [];
    const warnings = [];

    try {
      // Node.js バージョンチェック
      const nodeResult = await this.runCommand('node', ['--version']);
      if (!nodeResult.success) {
        errors.push('Node.js not available');
      } else {
        console.log(`   ✅ Node.js: ${nodeResult.stdout.trim()}`);
      }

      // NPM の存在確認
      const npmResult = await this.runCommand('npm', ['--version']);
      if (!npmResult.success) {
        errors.push('npm not available');
      } else {
        console.log(`   ✅ npm: ${npmResult.stdout.trim()}`);
      }

      // TypeScript の存在確認
      const tsResult = await this.runCommand('npx', ['tsc', '--version']);
      if (!tsResult.success) {
        warnings.push('TypeScript not available via npx');
      } else {
        console.log(`   ✅ TypeScript: ${tsResult.stdout.trim()}`);
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
          typescriptAvailable: tsResult.success
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'System Environment Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error.message },
        errors: ['Environment check failed']
      };
    }
  }

  async testWebUIConnectivity() {
    console.log('🌐 WebUI Connectivity Check...');
    const startTime = Date.now();
    const errors = [];
    const warnings = [];

    try {
      // メインページのチェック
      const mainPageResult = await this.checkURL(this.baseUrl);
      if (!mainPageResult.online) {
        errors.push(`Main page not accessible: ${mainPageResult.error}`);
      } else {
        console.log(`   ✅ Main page online (${mainPageResult.responseTime}ms)`);
      }

      // 管理者ダッシュボードのチェック
      const adminPageResult = await this.checkURL(`${this.baseUrl}/admin`);
      if (!adminPageResult.online) {
        warnings.push(`Admin page not accessible: ${adminPageResult.error}`);
      } else {
        console.log(`   ✅ Admin page online (${adminPageResult.responseTime}ms)`);
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
        details: { error: error.message },
        errors: ['WebUI connectivity test failed']
      };
    }
  }

  async testBackendConnectivity() {
    console.log('🔧 Backend Connectivity Check...');
    const startTime = Date.now();
    const errors = [];
    const warnings = [];

    try {
      // バックエンドのヘルスチェック
      const healthResult = await this.checkURL(`${this.backendUrl}/health`);
      if (!healthResult.online) {
        errors.push(`Backend health endpoint not accessible: ${healthResult.error}`);
      } else {
        console.log(`   ✅ Backend health endpoint online (${healthResult.responseTime}ms)`);
      }

      // API情報エンドポイント
      const infoResult = await this.checkURL(`${this.backendUrl}/api/v1/info`);
      if (!infoResult.online) {
        warnings.push(`API info endpoint not accessible: ${infoResult.error}`);
      } else {
        console.log(`   ✅ API info endpoint online (${infoResult.responseTime}ms)`);
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
        details: { error: error.message },
        errors: ['Backend connectivity test failed']
      };
    }
  }

  async testInfiniteLoopState() {
    console.log('🔄 Infinite Loop State Check...');
    const startTime = Date.now();
    const errors = [];
    const warnings = [];

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

      console.log(`   ✅ Loop count: ${state.loop_count}`);
      console.log(`   ✅ Total errors fixed: ${state.total_errors_fixed}`);
      console.log(`   ✅ Last scan: ${new Date(state.last_scan).toLocaleString()}`);
      console.log(`   ✅ Repair history: ${state.repair_history?.length || 0} entries`);

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
        details: { error: error.message },
        errors: ['State file validation failed']
      };
    }
  }

  async testDirectoryStructure() {
    console.log('📁 Directory Structure Check...');
    const startTime = Date.now();
    const errors = [];
    const warnings = [];

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

      for (const dir of requiredDirs) {
        const exists = fs.existsSync(dir);
        
        if (!exists) {
          warnings.push(`Directory not found: ${dir}`);
          // ディレクトリを作成
          try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   ✅ Created directory: ${dir}`);
          } catch (createError) {
            errors.push(`Failed to create directory: ${dir}`);
          }
        } else {
          console.log(`   ✅ Directory exists: ${dir}`);
        }
      }

      // 重要なファイルの存在確認
      const importantFiles = [
        'enhanced-infinite-loop-automation.ts',
        'internal-validation-system.ts',
        'enhanced-logging-reporting-system.ts',
        'run-enhanced-infinite-loop.sh'
      ];

      for (const file of importantFiles) {
        const exists = fs.existsSync(file);
        
        if (!exists) {
          errors.push(`Important file not found: ${file}`);
        } else {
          console.log(`   ✅ File exists: ${file}`);
        }
      }

      const duration = Date.now() - startTime;
      const status = errors.length === 0 ? 'passed' : 'failed';

      return {
        testName: 'Directory Structure Check',
        status,
        duration,
        details: {
          directoriesCreated: requiredDirs.filter(dir => !fs.existsSync(dir)).length,
          filesFound: importantFiles.filter(file => fs.existsSync(file)).length,
          totalFiles: importantFiles.length
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        testName: 'Directory Structure Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error.message },
        errors: ['Directory structure test failed']
      };
    }
  }

  async runFullTestSuite() {
    console.log('🧪 強化された無限ループ自動化システムのテスト開始...');
    console.log('');
    
    const startTime = Date.now();
    this.testResults = [];

    // テスト実行
    const tests = [
      this.testSystemEnvironment(),
      this.testWebUIConnectivity(),
      this.testBackendConnectivity(),
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
    const systemHealth = 
      successRate >= 95 ? 'excellent' :
      successRate >= 85 ? 'good' :
      successRate >= 70 ? 'fair' :
      successRate >= 50 ? 'poor' : 'critical';

    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Enhanced Infinite Loop Automation System',
      tests: this.testResults,
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration: totalDuration,
        successRate
      },
      systemHealth
    };

    // レポート保存
    const reportPath = path.join(this.reportDir, `quick-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 結果表示
    console.log('');
    console.log('📋 テスト結果サマリー:');
    console.log(`   ✅ 成功: ${passed}/${total}`);
    console.log(`   ❌ 失敗: ${failed}/${total}`);
    console.log(`   ⏭️ スキップ: ${skipped}/${total}`);
    console.log(`   📊 成功率: ${successRate.toFixed(1)}%`);
    console.log(`   🏥 システム健全性: ${systemHealth.toUpperCase()}`);
    console.log(`   ⏱️ 実行時間: ${(totalDuration / 1000).toFixed(1)}秒`);
    console.log(`   📄 レポート: ${reportPath}`);
    
    if (failed > 0) {
      console.log('');
      console.log('🚨 失敗したテスト:');
      this.testResults.filter(test => test.status === 'failed').forEach(test => {
        console.log(`   - ${test.testName}`);
        if (test.errors) {
          test.errors.forEach(error => {
            console.log(`     • ${error}`);
          });
        }
      });
    }

    const warnings = this.testResults.flatMap(test => test.warnings || []);
    if (warnings.length > 0) {
      console.log('');
      console.log('⚠️ 警告:');
      warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    console.log('');
    console.log('📋 推奨事項:');
    if (failed === 0) {
      console.log('   ✅ すべてのテストが成功しました。システムの実運用を開始できます。');
      console.log('   🚀 実行コマンド: ./run-enhanced-infinite-loop.sh');
      console.log('   👁️ 監視コマンド: tail -f enhanced-infinite-loop-reports/logs/infinite-loop.log');
    } else {
      console.log('   🔧 失敗したテストの問題を修正してください。');
      console.log('   🔄 修正後、再度テストを実行してください。');
      if (failed <= 2) {
        console.log('   ⚡ 部分的にシステムを起動することも可能です。');
      }
    }

    return report;
  }
}

// メイン実行
async function main() {
  const tester = new QuickTester();
  
  try {
    const report = await tester.runFullTestSuite();
    process.exit(report.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
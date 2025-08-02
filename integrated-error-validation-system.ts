#!/usr/bin/env ts-node

/**
 * 統合エラー検証・自動修復システム
 * WebUI + バックエンドAPI の包括的な検証とエラー修復の自動化
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';

interface ValidationResult {
  component: 'webui' | 'api' | 'admin' | 'docs';
  url: string;
  status: 'success' | 'error' | 'warning';
  errors: Array<{
    type: string;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    autoRepaired: boolean;
  }>;
  timestamp: string;
  repairActions: string[];
}

interface ValidationSummary {
  totalErrors: number;
  criticalErrors: number;
  repairedErrors: number;
  remainingErrors: number;
  validationCycles: number;
  lastValidation: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
}

class IntegratedErrorValidationSystem {
  private readonly urls = {
    webui: 'http://192.168.3.135:3000',
    api: 'http://192.168.3.135:8000',
    admin: 'http://192.168.3.135:3000/admin',
    docs: 'http://192.168.3.135:8000/docs'
  };

  private readonly reportsDir = path.join(process.cwd(), 'validation-reports');
  private readonly logsDir = path.join(process.cwd(), 'validation-logs');
  
  private validationCycles = 0;
  private maxCycles = 10; // 最大検証サイクル数
  private intervalMs = 30000; // 30秒間隔

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
    await fs.mkdir(this.logsDir, { recursive: true });
  }

  /**
   * 包括的な検証プロセスの実行
   */
  async runComprehensiveValidation(): Promise<ValidationSummary> {
    console.log('🔍 統合エラー検証システム開始...');
    
    const results: ValidationResult[] = [];

    // 1. WebUI検証
    console.log('📱 WebUI検証中...');
    const webuiResult = await this.validateWebUI();
    results.push(webuiResult);

    // 2. Admin Dashboard検証
    console.log('👨‍💼 管理者ダッシュボード検証中...');
    const adminResult = await this.validateAdminDashboard();
    results.push(adminResult);

    // 3. API検証
    console.log('🔌 API検証中...');
    const apiResult = await this.validateAPI();
    results.push(apiResult);

    // 4. APIドキュメント検証
    console.log('📚 APIドキュメント検証中...');
    const docsResult = await this.validateDocs();
    results.push(docsResult);

    // 5. 検証結果の集計
    const summary = this.generateValidationSummary(results);

    // 6. レポート保存
    await this.saveValidationReport(results, summary);

    return summary;
  }

  /**
   * WebUI検証の実行
   */
  private async validateWebUI(): Promise<ValidationResult> {
    const result: ValidationResult = {
      component: 'webui',
      url: this.urls.webui,
      status: 'success',
      errors: [],
      timestamp: new Date().toISOString(),
      repairActions: []
    };

    try {
      // MCPPlaywright監視スクリプトの実行
      const monitorResult = await this.execScript('./frontend/run-comprehensive-webui-monitor.sh --status');
      
      // 結果の解析
      if (monitorResult.includes('error') || monitorResult.includes('Error')) {
        result.status = 'error';
        result.errors.push({
          type: 'webui_error',
          message: 'WebUIでエラーが検出されました',
          severity: 'high',
          autoRepaired: false
        });

        // 自動修復の実行
        console.log('🔧 WebUI自動修復を実行中...');
        await this.execScript('./frontend/run-comprehensive-webui-monitor.sh --repair-only');
        result.repairActions.push('WebUI自動修復実行');
      }

      // 基本的な接続確認
      const response = await axios.get(this.urls.webui, { timeout: 10000 });
      if (response.status !== 200) {
        result.status = 'error';
        result.errors.push({
          type: 'connection_error',
          message: `WebUIに接続できません (Status: ${response.status})`,
          severity: 'critical',
          autoRepaired: false
        });
      }

    } catch (error) {
      result.status = 'error';
      result.errors.push({
        type: 'validation_error',
        message: `WebUI検証エラー: ${error.message}`,
        severity: 'high',
        autoRepaired: false
      });
    }

    return result;
  }

  /**
   * 管理者ダッシュボード検証の実行
   */
  private async validateAdminDashboard(): Promise<ValidationResult> {
    const result: ValidationResult = {
      component: 'admin',
      url: this.urls.admin,
      status: 'success',
      errors: [],
      timestamp: new Date().toISOString(),
      repairActions: []
    };

    try {
      // 管理者ダッシュボード専用監視の実行
      const adminMonitorResult = await this.execScript('./frontend/run-comprehensive-webui-monitor.sh --admin-only');
      
      if (adminMonitorResult.includes('error') || adminMonitorResult.includes('Error')) {
        result.status = 'error';
        result.errors.push({
          type: 'admin_error',
          message: '管理者ダッシュボードでエラーが検出されました',
          severity: 'high',
          autoRepaired: false
        });

        // 自動修復の実行
        console.log('🔧 管理者ダッシュボード自動修復を実行中...');
        await this.execScript('./frontend/run-comprehensive-webui-monitor.sh --admin-only --repair');
        result.repairActions.push('管理者ダッシュボード自動修復実行');
      }

    } catch (error) {
      result.status = 'error';
      result.errors.push({
        type: 'admin_validation_error',
        message: `管理者ダッシュボード検証エラー: ${error.message}`,
        severity: 'high',
        autoRepaired: false
      });
    }

    return result;
  }

  /**
   * API検証の実行
   */
  private async validateAPI(): Promise<ValidationResult> {
    const result: ValidationResult = {
      component: 'api',
      url: this.urls.api,
      status: 'success',
      errors: [],
      timestamp: new Date().toISOString(),
      repairActions: []
    };

    try {
      // API包括監視の実行
      const apiMonitorResult = await this.execScript('cd backend && source venv/bin/activate && python comprehensive_monitoring.py --once');
      
      // APIヘルスチェック
      const healthResponse = await axios.get(`${this.urls.api}/health`, { timeout: 5000 });
      if (healthResponse.status !== 200) {
        result.status = 'error';
        result.errors.push({
          type: 'api_health_error',
          message: 'APIヘルスチェックに失敗しました',
          severity: 'critical',
          autoRepaired: false
        });
      }

      // 主要エンドポイントの確認
      const endpoints = ['/api/v1/incidents', '/api/v1/users', '/api/v1/services'];
      for (const endpoint of endpoints) {
        try {
          await axios.get(`${this.urls.api}${endpoint}`, { timeout: 5000 });
        } catch (error) {
          result.errors.push({
            type: 'endpoint_error',
            message: `エンドポイント ${endpoint} でエラー: ${error.message}`,
            severity: 'medium',
            autoRepaired: false
          });
        }
      }

      // エラーがある場合は自動修復を実行
      if (result.errors.length > 0) {
        result.status = 'error';
        console.log('🔧 API自動修復を実行中...');
        await this.execScript('cd backend && source venv/bin/activate && python comprehensive_monitoring.py --repair');
        result.repairActions.push('API自動修復実行');
      }

    } catch (error) {
      result.status = 'error';
      result.errors.push({
        type: 'api_validation_error',
        message: `API検証エラー: ${error.message}`,
        severity: 'high',
        autoRepaired: false
      });
    }

    return result;
  }

  /**
   * APIドキュメント検証の実行
   */
  private async validateDocs(): Promise<ValidationResult> {
    const result: ValidationResult = {
      component: 'docs',
      url: this.urls.docs,
      status: 'success',
      errors: [],
      timestamp: new Date().toISOString(),
      repairActions: []
    };

    try {
      // APIドキュメントの確認
      const docsResponse = await axios.get(this.urls.docs, { timeout: 10000 });
      if (docsResponse.status !== 200) {
        result.status = 'error';
        result.errors.push({
          type: 'docs_access_error',
          message: 'APIドキュメントにアクセスできません',
          severity: 'medium',
          autoRepaired: false
        });
      }

      // OpenAPI仕様の確認
      const openApiResponse = await axios.get(`${this.urls.api}/openapi.json`, { timeout: 5000 });
      if (openApiResponse.status !== 200) {
        result.errors.push({
          type: 'openapi_error',
          message: 'OpenAPI仕様にアクセスできません',
          severity: 'medium',
          autoRepaired: false
        });
      }

    } catch (error) {
      result.status = 'error';
      result.errors.push({
        type: 'docs_validation_error',
        message: `ドキュメント検証エラー: ${error.message}`,
        severity: 'medium',
        autoRepaired: false
      });
    }

    return result;
  }

  /**
   * 検証結果の集計
   */
  private generateValidationSummary(results: ValidationResult[]): ValidationSummary {
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
    const criticalErrors = results.reduce((sum, result) => 
      sum + result.errors.filter(error => error.severity === 'critical').length, 0);
    const repairedErrors = results.reduce((sum, result) => 
      sum + result.errors.filter(error => error.autoRepaired).length, 0);

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalErrors > 0) {
      overallStatus = 'critical';
    } else if (totalErrors > 0) {
      overallStatus = 'warning';
    }

    return {
      totalErrors,
      criticalErrors,
      repairedErrors,
      remainingErrors: totalErrors - repairedErrors,
      validationCycles: this.validationCycles + 1,
      lastValidation: new Date().toISOString(),
      overallStatus
    };
  }

  /**
   * 検証レポートの保存
   */
  private async saveValidationReport(results: ValidationResult[], summary: ValidationSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON形式で詳細レポート保存
    const detailedReport = {
      summary,
      results,
      metadata: {
        generatedAt: new Date().toISOString(),
        validationCycle: this.validationCycles + 1,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage()
        }
      }
    };

    await fs.writeFile(
      path.join(this.reportsDir, `validation-report-${timestamp}.json`),
      JSON.stringify(detailedReport, null, 2)
    );

    // Markdown形式で要約レポート保存
    const markdownReport = this.generateMarkdownReport(summary, results);
    await fs.writeFile(
      path.join(this.reportsDir, `validation-summary-${timestamp}.md`),
      markdownReport
    );

    console.log(`📊 検証レポートを保存しました: validation-report-${timestamp}.json`);
  }

  /**
   * Markdownレポートの生成
   */
  private generateMarkdownReport(summary: ValidationSummary, results: ValidationResult[]): string {
    const statusEmoji = {
      healthy: '🟢',
      warning: '🟡',
      critical: '🔴'
    };

    let markdown = `# 統合システム検証レポート

## ${statusEmoji[summary.overallStatus]} 総合ステータス: ${summary.overallStatus.toUpperCase()}

### 📊 検証サマリー
- **総エラー数**: ${summary.totalErrors}
- **クリティカルエラー**: ${summary.criticalErrors}
- **修復済みエラー**: ${summary.repairedErrors}
- **残存エラー**: ${summary.remainingErrors}
- **検証サイクル**: ${summary.validationCycles}
- **最終検証時刻**: ${summary.lastValidation}

### 🔍 コンポーネント別結果

`;

    results.forEach(result => {
      const statusEmoji = result.status === 'success' ? '✅' : 
                         result.status === 'warning' ? '⚠️' : '❌';
      
      markdown += `#### ${statusEmoji} ${result.component.toUpperCase()}
- **URL**: ${result.url}
- **ステータス**: ${result.status}
- **エラー数**: ${result.errors.length}
- **修復アクション**: ${result.repairActions.length}

`;

      if (result.errors.length > 0) {
        markdown += `**検出されたエラー**:\n`;
        result.errors.forEach((error, index) => {
          markdown += `${index + 1}. [${error.severity.toUpperCase()}] ${error.type}: ${error.message}\n`;
        });
        markdown += '\n';
      }

      if (result.repairActions.length > 0) {
        markdown += `**実行された修復アクション**:\n`;
        result.repairActions.forEach((action, index) => {
          markdown += `${index + 1}. ${action}\n`;
        });
        markdown += '\n';
      }
    });

    markdown += `
---
*レポート生成時刻: ${new Date().toISOString()}*
`;

    return markdown;
  }

  /**
   * 無限ループ監視の開始
   */
  async startInfiniteMonitoring(): Promise<void> {
    console.log('🔄 無限ループ監視を開始します...');
    console.log(`⏱️  監視間隔: ${this.intervalMs / 1000}秒`);
    console.log(`🔄 最大サイクル数: ${this.maxCycles}`);

    while (this.validationCycles < this.maxCycles) {
      this.validationCycles++;
      
      console.log(`\n🔄 検証サイクル ${this.validationCycles}/${this.maxCycles} 開始`);
      console.log(`⏰ ${new Date().toLocaleString()}`);

      const summary = await this.runComprehensiveValidation();

      // 結果の表示
      this.displaySummary(summary);

      // 健全な状態の場合はサイクルを終了
      if (summary.overallStatus === 'healthy' && summary.remainingErrors === 0) {
        console.log('✅ システムが完全に健全な状態になりました。監視を終了します。');
        break;
      }

      // クリティカルエラーがある場合は即座に次のサイクルを実行
      if (summary.criticalErrors > 0) {
        console.log('🚨 クリティカルエラーが検出されました。即座に次のサイクルを実行します。');
        continue;
      }

      // 通常の場合は間隔を置いて次のサイクルを実行
      if (this.validationCycles < this.maxCycles) {
        console.log(`⏳ ${this.intervalMs / 1000}秒後に次の検証サイクルを開始します...`);
        await this.sleep(this.intervalMs);
      }
    }

    console.log('\n🏁 無限ループ監視が完了しました。');
    console.log(`📊 総検証サイクル数: ${this.validationCycles}`);
  }

  /**
   * サマリーの表示
   */
  private displaySummary(summary: ValidationSummary): void {
    const statusEmoji = {
      healthy: '🟢',
      warning: '🟡',
      critical: '🔴'
    };

    console.log(`\n${statusEmoji[summary.overallStatus]} 検証結果サマリー`);
    console.log(`📊 総エラー数: ${summary.totalErrors}`);
    console.log(`🔴 クリティカル: ${summary.criticalErrors}`);
    console.log(`🔧 修復済み: ${summary.repairedErrors}`);
    console.log(`⚠️  残存エラー: ${summary.remainingErrors}`);
    console.log(`🔄 検証サイクル: ${summary.validationCycles}`);
  }

  /**
   * スクリプトの実行
   */
  private async execScript(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
          return;
        }
        resolve(stdout || stderr);
      });
    });
  }

  /**
   * 一定時間の待機
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// メイン実行部分
async function main() {
  const validator = new IntegratedErrorValidationSystem();

  const args = process.argv.slice(2);
  const isOnceMode = args.includes('--once');
  const isMonitorMode = args.includes('--monitor');

  if (isOnceMode) {
    console.log('🔍 一回限りの包括検証を実行します...');
    const summary = await validator.runComprehensiveValidation();
    validator.displaySummary(summary);
  } else if (isMonitorMode) {
    console.log('🔄 無限ループ監視モードを開始します...');
    await validator.startInfiniteMonitoring();
  } else {
    console.log('📖 使用方法:');
    console.log('  --once    一回限りの包括検証を実行');
    console.log('  --monitor 無限ループ監視を開始');
    console.log('');
    console.log('例:');
    console.log('  ts-node integrated-error-validation-system.ts --once');
    console.log('  ts-node integrated-error-validation-system.ts --monitor');
  }
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main().catch(console.error);
}

export { IntegratedErrorValidationSystem, ValidationResult, ValidationSummary };
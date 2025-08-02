/**
 * 内部検証システム
 * 修復後のシステム状態を総合的に検証
 */

import { Page } from '@playwright/test';
import { BrowserError, RepairAction } from './mcpPlaywrightErrorDetector';

export interface ValidationTest {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'performance' | 'accessibility' | 'security' | 'ui' | 'integration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: (page: Page) => Promise<ValidationTestResult>;
}

export interface ValidationTestResult {
  testId: string;
  passed: boolean;
  score: number; // 0-100
  message: string;
  details: any;
  duration: number;
  timestamp: Date;
  screenshots?: string[];
  logs?: string[];
}

export interface ValidationSuite {
  id: string;
  name: string;
  description: string;
  tests: ValidationTest[];
  config: ValidationConfig;
}

export interface ValidationConfig {
  enableScreenshots: boolean;
  enableDetailedLogs: boolean;
  timeoutPerTest: number;
  failureThreshold: number;
  parallelExecution: boolean;
  retryFailedTests: boolean;
  maxRetries: number;
}

export interface ValidationReport {
  id: string;
  timestamp: Date;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  overallScore: number;
  status: 'passed' | 'failed' | 'warning';
  results: ValidationTestResult[];
  summary: ValidationSummary;
  recommendations: string[];
}

export interface ValidationSummary {
  functional: { passed: number; total: number; score: number };
  performance: { passed: number; total: number; score: number };
  accessibility: { passed: number; total: number; score: number };
  security: { passed: number; total: number; score: number };
  ui: { passed: number; total: number; score: number };
  integration: { passed: number; total: number; score: number };
}

export class ValidationSystem {
  private validationSuites: Map<string, ValidationSuite> = new Map();
  private validationHistory: ValidationReport[] = [];

  constructor() {
    this.initializeDefaultSuites();
  }

  /**
   * デフォルトの検証スイートを初期化
   */
  private initializeDefaultSuites(): void {
    // 機能テストスイート
    this.addValidationSuite({
      id: 'functional-tests',
      name: '機能テスト',
      description: 'Webアプリケーションの基本機能を検証',
      config: this.getDefaultConfig(),
      tests: [
        {
          id: 'page-load-test',
          name: 'ページ読み込みテスト',
          description: 'ページが正常に読み込まれることを確認',
          category: 'functional',
          priority: 'critical',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              await page.waitForLoadState('networkidle');
              const title = await page.title();
              const url = page.url();
              
              return {
                testId: 'page-load-test',
                passed: title.length > 0,
                score: title.length > 0 ? 100 : 0,
                message: `ページタイトル: "${title}", URL: ${url}`,
                details: { title, url },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'page-load-test',
                passed: false,
                score: 0,
                message: `ページ読み込みエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        },
        {
          id: 'navigation-test',
          name: 'ナビゲーションテスト',
          description: 'メニューとリンクの動作を確認',
          category: 'functional',
          priority: 'high',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              const links = await page.locator('a[href]').count();
              const buttons = await page.locator('button').count();
              const forms = await page.locator('form').count();
              
              const workingLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                return links.filter(link => {
                  const href = link.getAttribute('href');
                  return href && href !== '#' && href !== 'javascript:void(0)';
                }).length;
              });

              const score = links > 0 ? (workingLinks / links) * 100 : 100;
              
              return {
                testId: 'navigation-test',
                passed: score >= 80,
                score,
                message: `有効なリンク: ${workingLinks}/${links}, ボタン: ${buttons}, フォーム: ${forms}`,
                details: { links, workingLinks, buttons, forms },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'navigation-test',
                passed: false,
                score: 0,
                message: `ナビゲーションテストエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        },
        {
          id: 'form-validation-test',
          name: 'フォームバリデーションテスト',
          description: 'フォームの入力バリデーションを確認',
          category: 'functional',
          priority: 'medium',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              const forms = await page.locator('form').count();
              const requiredFields = await page.locator('input[required], select[required], textarea[required]').count();
              
              let validationScore = 100;
              const details: any = { forms, requiredFields, validationResults: [] };

              // 各フォームをテスト
              for (let i = 0; i < Math.min(forms, 3); i++) {
                try {
                  const form = page.locator('form').nth(i);
                  const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
                  
                  if (await submitButton.count() > 0) {
                    // 空のフォームで送信を試行
                    await submitButton.click();
                    
                    // バリデーションメッセージの確認
                    const validationMessages = await page.locator('.error, .invalid, [aria-invalid="true"]').count();
                    details.validationResults.push({
                      formIndex: i,
                      validationMessages,
                      hasValidation: validationMessages > 0
                    });
                  }
                } catch (error) {
                  console.log(`フォーム ${i} のテストをスキップ:`, error.message);
                }
              }

              return {
                testId: 'form-validation-test',
                passed: validationScore >= 70,
                score: validationScore,
                message: `フォーム数: ${forms}, 必須フィールド: ${requiredFields}`,
                details,
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'form-validation-test',
                passed: false,
                score: 0,
                message: `フォームバリデーションテストエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        }
      ]
    });

    // パフォーマンステストスイート
    this.addValidationSuite({
      id: 'performance-tests',
      name: 'パフォーマンステスト',
      description: 'ページの読み込み速度とパフォーマンスを検証',
      config: this.getDefaultConfig(),
      tests: [
        {
          id: 'load-time-test',
          name: '読み込み時間テスト',
          description: 'ページの読み込み時間を測定',
          category: 'performance',
          priority: 'high',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              const performanceMetrics = await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                return {
                  domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                  loadComplete: navigation.loadEventEnd - navigation.fetchStart,
                  firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                  firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
                };
              });

              const loadTime = performanceMetrics.loadComplete;
              let score = 100;
              
              if (loadTime > 5000) score = 0;
              else if (loadTime > 3000) score = 50;
              else if (loadTime > 2000) score = 75;
              else if (loadTime > 1000) score = 90;

              return {
                testId: 'load-time-test',
                passed: score >= 75,
                score,
                message: `読み込み時間: ${loadTime.toFixed(2)}ms`,
                details: performanceMetrics,
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'load-time-test',
                passed: false,
                score: 0,
                message: `パフォーマンステストエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        },
        {
          id: 'memory-usage-test',
          name: 'メモリ使用量テスト',
          description: 'JavaScriptのメモリ使用量を確認',
          category: 'performance',
          priority: 'medium',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              const memoryInfo = await page.evaluate(() => {
                if ('memory' in performance) {
                  const mem = (performance as any).memory;
                  return {
                    usedJSHeapSize: mem.usedJSHeapSize,
                    totalJSHeapSize: mem.totalJSHeapSize,
                    jsHeapSizeLimit: mem.jsHeapSizeLimit,
                  };
                }
                return null;
              });

              if (!memoryInfo) {
                return {
                  testId: 'memory-usage-test',
                  passed: true,
                  score: 100,
                  message: 'メモリ情報が利用できません（Chrome以外のブラウザ）',
                  details: { message: 'Memory API not available' },
                  duration: Date.now() - startTime,
                  timestamp: new Date(),
                };
              }

              const usageMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
              let score = 100;
              
              if (usageMB > 100) score = 0;
              else if (usageMB > 50) score = 50;
              else if (usageMB > 25) score = 75;

              return {
                testId: 'memory-usage-test',
                passed: score >= 75,
                score,
                message: `メモリ使用量: ${usageMB.toFixed(2)}MB`,
                details: { ...memoryInfo, usageMB },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'memory-usage-test',
                passed: false,
                score: 0,
                message: `メモリテストエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        }
      ]
    });

    // アクセシビリティテストスイート
    this.addValidationSuite({
      id: 'accessibility-tests',
      name: 'アクセシビリティテスト',
      description: 'WAI-ARIAガイドラインへの準拠を確認',
      config: this.getDefaultConfig(),
      tests: [
        {
          id: 'alt-text-test',
          name: 'alt属性テスト',
          description: '画像にalt属性が設定されているかを確認',
          category: 'accessibility',
          priority: 'high',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              const imageResults = await page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                const totalImages = images.length;
                const imagesWithAlt = images.filter(img => img.hasAttribute('alt')).length;
                const imagesWithEmptyAlt = images.filter(img => img.getAttribute('alt') === '').length;
                
                return { totalImages, imagesWithAlt, imagesWithEmptyAlt };
              });

              const score = imageResults.totalImages > 0 
                ? (imageResults.imagesWithAlt / imageResults.totalImages) * 100 
                : 100;

              return {
                testId: 'alt-text-test',
                passed: score >= 90,
                score,
                message: `画像 ${imageResults.imagesWithAlt}/${imageResults.totalImages} にalt属性設定済み`,
                details: imageResults,
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'alt-text-test',
                passed: false,
                score: 0,
                message: `alt属性テストエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        },
        {
          id: 'aria-labels-test',
          name: 'ARIA ラベルテスト',
          description: 'ARIA ラベルが適切に設定されているかを確認',
          category: 'accessibility',
          priority: 'high',
          execute: async (page: Page) => {
            const startTime = Date.now();
            try {
              const ariaResults = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const links = Array.from(document.querySelectorAll('a'));
                const inputs = Array.from(document.querySelectorAll('input'));

                const buttonsWithLabels = buttons.filter(btn => 
                  btn.hasAttribute('aria-label') || 
                  btn.hasAttribute('aria-labelledby') || 
                  btn.textContent?.trim()
                ).length;

                const linksWithLabels = links.filter(link => 
                  link.hasAttribute('aria-label') || 
                  link.hasAttribute('aria-labelledby') || 
                  link.textContent?.trim()
                ).length;

                const inputsWithLabels = inputs.filter(input => 
                  input.hasAttribute('aria-label') || 
                  input.hasAttribute('aria-labelledby') || 
                  document.querySelector(`label[for="${input.id}"]`)
                ).length;

                return {
                  buttons: { total: buttons.length, withLabels: buttonsWithLabels },
                  links: { total: links.length, withLabels: linksWithLabels },
                  inputs: { total: inputs.length, withLabels: inputsWithLabels }
                };
              });

              const totalElements = ariaResults.buttons.total + ariaResults.links.total + ariaResults.inputs.total;
              const elementsWithLabels = ariaResults.buttons.withLabels + ariaResults.links.withLabels + ariaResults.inputs.withLabels;
              
              const score = totalElements > 0 ? (elementsWithLabels / totalElements) * 100 : 100;

              return {
                testId: 'aria-labels-test',
                passed: score >= 80,
                score,
                message: `ARIA ラベル: ${elementsWithLabels}/${totalElements} 要素に設定済み`,
                details: ariaResults,
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            } catch (error) {
              return {
                testId: 'aria-labels-test',
                passed: false,
                score: 0,
                message: `ARIA ラベルテストエラー: ${error.message}`,
                details: { error: error.message },
                duration: Date.now() - startTime,
                timestamp: new Date(),
              };
            }
          }
        }
      ]
    });
  }

  /**
   * 検証スイートを追加
   */
  addValidationSuite(suite: ValidationSuite): void {
    this.validationSuites.set(suite.id, suite);
    console.log(`✅ 検証スイートを追加: ${suite.name}`);
  }

  /**
   * 検証を実行
   */
  async runValidation(page: Page, suiteIds?: string[]): Promise<ValidationReport> {
    const startTime = Date.now();
    const reportId = `validation-${Date.now()}`;
    
    console.log('🔍 検証を開始...');

    const suitesToRun = suiteIds 
      ? Array.from(this.validationSuites.values()).filter(suite => suiteIds.includes(suite.id))
      : Array.from(this.validationSuites.values());

    const allTests = suitesToRun.flatMap(suite => suite.tests);
    const results: ValidationTestResult[] = [];

    for (const test of allTests) {
      console.log(`🧪 テスト実行中: ${test.name}`);
      
      try {
        const result = await Promise.race([
          test.execute(page),
          new Promise<ValidationTestResult>((_, reject) => 
            setTimeout(() => reject(new Error('テストタイムアウト')), 30000)
          )
        ]);
        
        results.push(result);
        
        if (result.passed) {
          console.log(`✅ ${test.name}: 合格 (スコア: ${result.score})`);
        } else {
          console.log(`❌ ${test.name}: 不合格 (スコア: ${result.score})`);
        }
        
      } catch (error) {
        console.error(`❌ テスト実行エラー [${test.name}]:`, error);
        
        results.push({
          testId: test.id,
          passed: false,
          score: 0,
          message: `テスト実行エラー: ${error.message}`,
          details: { error: error.message },
          duration: 0,
          timestamp: new Date(),
        });
      }
    }

    const duration = Date.now() - startTime;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const overallScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
      : 0;

    const report: ValidationReport = {
      id: reportId,
      timestamp: new Date(),
      duration,
      totalTests: results.length,
      passedTests,
      failedTests,
      skippedTests: 0,
      overallScore,
      status: overallScore >= 80 ? 'passed' : overallScore >= 60 ? 'warning' : 'failed',
      results,
      summary: this.generateSummary(results),
      recommendations: this.generateRecommendations(results),
    };

    this.validationHistory.push(report);
    
    console.log(`📊 検証完了: ${passedTests}/${results.length} テスト合格 (スコア: ${overallScore.toFixed(2)})`);
    
    await this.saveValidationReport(report);
    
    return report;
  }

  /**
   * サマリーを生成
   */
  private generateSummary(results: ValidationTestResult[]): ValidationSummary {
    const categories = ['functional', 'performance', 'accessibility', 'security', 'ui', 'integration'] as const;
    const summary = {} as ValidationSummary;

    for (const category of categories) {
      const categoryResults = results.filter(r => {
        // テストIDから категорию を判断
        return r.testId.includes(category) || this.getCategoryFromTestId(r.testId) === category;
      });

      summary[category] = {
        passed: categoryResults.filter(r => r.passed).length,
        total: categoryResults.length,
        score: categoryResults.length > 0 
          ? categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length 
          : 0
      };
    }

    return summary;
  }

  /**
   * テストIDからカテゴリを判断
   */
  private getCategoryFromTestId(testId: string): string {
    if (testId.includes('load') || testId.includes('performance') || testId.includes('memory')) {
      return 'performance';
    }
    if (testId.includes('aria') || testId.includes('alt') || testId.includes('accessibility')) {
      return 'accessibility';
    }
    if (testId.includes('security') || testId.includes('xss') || testId.includes('csrf')) {
      return 'security';
    }
    if (testId.includes('ui') || testId.includes('visual') || testId.includes('layout')) {
      return 'ui';
    }
    if (testId.includes('integration') || testId.includes('api')) {
      return 'integration';
    }
    return 'functional';
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(results: ValidationTestResult[]): string[] {
    const recommendations: string[] = [];
    const failedTests = results.filter(r => !r.passed);

    if (failedTests.some(t => t.testId.includes('alt'))) {
      recommendations.push('画像にalt属性を追加してアクセシビリティを向上させてください');
    }

    if (failedTests.some(t => t.testId.includes('load-time'))) {
      recommendations.push('ページの読み込み時間を改善してください（画像最適化、CDN使用など）');
    }

    if (failedTests.some(t => t.testId.includes('memory'))) {
      recommendations.push('JavaScriptのメモリ使用量を最適化してください');
    }

    if (failedTests.some(t => t.testId.includes('aria'))) {
      recommendations.push('ARIA属性を適切に設定してアクセシビリティを向上させてください');
    }

    if (failedTests.some(t => t.testId.includes('navigation'))) {
      recommendations.push('ナビゲーションリンクとボタンの動作を確認してください');
    }

    if (recommendations.length === 0 && results.length > 0) {
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      if (avgScore < 90) {
        recommendations.push('全体的なスコアを向上させるため、失敗したテストの詳細を確認してください');
      }
    }

    return recommendations;
  }

  /**
   * 検証レポートを保存
   */
  private async saveValidationReport(report: ValidationReport): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const reportDir = path.join(process.cwd(), 'validation-reports');
      await fs.mkdir(reportDir, { recursive: true });

      const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportDir, `validation-report-${timestamp}.json`);
      
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

      // サマリーファイルも作成
      const summaryFile = path.join(reportDir, `validation-summary-${timestamp}.md`);
      const summaryContent = this.generateMarkdownSummary(report);
      await fs.writeFile(summaryFile, summaryContent);

      console.log(`📋 検証レポートを保存: ${reportFile}`);

    } catch (error) {
      console.error('❌ 検証レポート保存エラー:', error);
    }
  }

  /**
   * Markdownサマリーを生成
   */
  private generateMarkdownSummary(report: ValidationReport): string {
    const { summary, recommendations } = report;
    
    return `# 検証レポートサマリー

## 概要
- **実行日時**: ${report.timestamp.toLocaleString('ja-JP')}
- **実行時間**: ${(report.duration / 1000).toFixed(2)}秒
- **総合スコア**: ${report.overallScore.toFixed(2)}/100
- **ステータス**: ${report.status === 'passed' ? '✅ 合格' : report.status === 'warning' ? '⚠️ 警告' : '❌ 不合格'}
- **テスト結果**: ${report.passedTests}/${report.totalTests} 合格

## カテゴリ別結果

### 機能テスト
- 合格: ${summary.functional.passed}/${summary.functional.total}
- スコア: ${summary.functional.score.toFixed(2)}/100

### パフォーマンステスト
- 合格: ${summary.performance.passed}/${summary.performance.total}
- スコア: ${summary.performance.score.toFixed(2)}/100

### アクセシビリティテスト
- 合格: ${summary.accessibility.passed}/${summary.accessibility.total}
- スコア: ${summary.accessibility.score.toFixed(2)}/100

### セキュリティテスト
- 合格: ${summary.security.passed}/${summary.security.total}
- スコア: ${summary.security.score.toFixed(2)}/100

### UIテスト
- 合格: ${summary.ui.passed}/${summary.ui.total}
- スコア: ${summary.ui.score.toFixed(2)}/100

### 統合テスト
- 合格: ${summary.integration.passed}/${summary.integration.total}
- スコア: ${summary.integration.score.toFixed(2)}/100

## 推奨事項

${recommendations.map(rec => `- ${rec}`).join('\n')}

## 詳細結果

${report.results.map(result => 
  `### ${result.testId}\n- **結果**: ${result.passed ? '✅ 合格' : '❌ 不合格'}\n- **スコア**: ${result.score}/100\n- **メッセージ**: ${result.message}\n- **実行時間**: ${result.duration}ms\n`
).join('\n')}
`;
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(): ValidationConfig {
    return {
      enableScreenshots: true,
      enableDetailedLogs: true,
      timeoutPerTest: 30000,
      failureThreshold: 20,
      parallelExecution: false,
      retryFailedTests: false,
      maxRetries: 2,
    };
  }

  /**
   * 検証履歴を取得
   */
  getValidationHistory(): ValidationReport[] {
    return this.validationHistory;
  }

  /**
   * 最新の検証結果を取得
   */
  getLatestValidationResult(): ValidationReport | null {
    return this.validationHistory.length > 0 
      ? this.validationHistory[this.validationHistory.length - 1] 
      : null;
  }

  /**
   * カスタムテストを追加
   */
  addCustomTest(suiteId: string, test: ValidationTest): void {
    const suite = this.validationSuites.get(suiteId);
    if (suite) {
      suite.tests.push(test);
      console.log(`✅ カスタムテストを追加: ${test.name}`);
    } else {
      console.error(`❌ 検証スイートが見つかりません: ${suiteId}`);
    }
  }
}
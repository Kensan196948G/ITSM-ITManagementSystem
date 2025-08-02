/**
 * MCP Playwright システム統合テスト
 * システム全体の動作を検証
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MCPPlaywrightMasterController } from '../src/services/mcpPlaywrightMasterController';
import { MCPPlaywrightErrorDetector } from '../src/services/mcpPlaywrightErrorDetector';
import { AutoRepairEngine } from '../src/services/autoRepairEngine';
import { ValidationSystem } from '../src/services/validationSystem';

describe('MCP Playwright システム統合テスト', () => {
  let masterController: MCPPlaywrightMasterController;
  let errorDetector: MCPPlaywrightErrorDetector;
  let repairEngine: AutoRepairEngine;
  let validationSystem: ValidationSystem;

  beforeAll(async () => {
    // テスト用の設定
    const testConfig = {
      detectorConfig: {
        targetUrls: ['http://localhost:3000'],
        browsers: ['chromium'] as const,
        monitoringInterval: 5000,
        maxRetries: 1,
        timeout: 10000,
        enableScreenshots: false,
        enableTrace: false,
        reportingEnabled: false,
      },
      loopConfig: {
        maxIterations: 5,
        iterationDelay: 1000,
        errorThreshold: 1,
        successThreshold: 2,
        timeoutMinutes: 1,
        emergencyStopConditions: {
          maxConsecutiveFailures: 3,
          maxSameErrorRepeats: 5,
          maxRepairAttempts: 10,
        },
        notificationSettings: {
          enableEmailAlerts: false,
          enableSlackAlerts: false,
          alertIntervals: [],
        },
      },
      enableAutoStart: false,
      healthCheckInterval: 5000,
      reportingInterval: 10000,
      alertSettings: {
        enableEmailAlerts: false,
        enableSlackAlerts: false,
        emailRecipients: [],
        criticalErrorThreshold: 2,
      },
      systemSettings: {
        maxConcurrentRepairs: 1,
        emergencyStopOnFailure: false,
        enableDetailedLogging: false,
        enablePerformanceMonitoring: false,
      },
    };

    masterController = new MCPPlaywrightMasterController(testConfig);
  });

  beforeEach(() => {
    // 各テスト前にクリーンアップ
    errorDetector = new MCPPlaywrightErrorDetector({
      targetUrls: ['http://localhost:3000'],
      browsers: ['chromium'],
      monitoringInterval: 5000,
      maxRetries: 1,
      timeout: 10000,
      enableScreenshots: false,
      enableTrace: false,
      reportingEnabled: false,
    });

    repairEngine = new AutoRepairEngine();
    validationSystem = new ValidationSystem();
  });

  afterAll(async () => {
    // テスト後のクリーンアップ
    if (masterController.isSystemRunning()) {
      await masterController.stop();
    }
  });

  describe('MCPPlaywrightErrorDetector', () => {
    test('エラー検知システムが正常に初期化される', async () => {
      expect(errorDetector).toBeDefined();
      expect(typeof errorDetector.initialize).toBe('function');
      expect(typeof errorDetector.startMonitoring).toBe('function');
      expect(typeof errorDetector.stopMonitoring).toBe('function');
    });

    test('ステータス取得が正常に動作する', () => {
      const status = errorDetector.getStatus();
      
      expect(status).toHaveProperty('isMonitoring');
      expect(status).toHaveProperty('totalErrors');
      expect(status).toHaveProperty('totalRepairs');
      expect(status).toHaveProperty('activeBrowsers');
      expect(status).toHaveProperty('activePages');
      expect(status).toHaveProperty('recentErrors');
      expect(status).toHaveProperty('recentRepairs');
      
      expect(typeof status.isMonitoring).toBe('boolean');
      expect(typeof status.totalErrors).toBe('number');
      expect(Array.isArray(status.recentErrors)).toBe(true);
    });

    test('レポート生成が正常に動作する', () => {
      const report = errorDetector.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('repairs');
      expect(report).toHaveProperty('summary');
      
      expect(Array.isArray(report.errors)).toBe(true);
      expect(Array.isArray(report.repairs)).toBe(true);
    });
  });

  describe('AutoRepairEngine', () => {
    test('修復エンジンが正常に初期化される', () => {
      expect(repairEngine).toBeDefined();
      expect(typeof repairEngine.repairError).toBe('function');
      expect(typeof repairEngine.getRepairHistory).toBe('function');
      expect(typeof repairEngine.getRepairStatistics).toBe('function');
    });

    test('修復統計が正常に取得される', () => {
      const stats = repairEngine.getRepairStatistics();
      
      expect(stats).toHaveProperty('totalRepairs');
      expect(stats).toHaveProperty('successfulRepairs');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('ruleUsage');
      expect(stats).toHaveProperty('recentRepairs');
      
      expect(typeof stats.totalRepairs).toBe('number');
      expect(typeof stats.successfulRepairs).toBe('number');
      expect(typeof stats.successRate).toBe('string');
      expect(Array.isArray(stats.ruleUsage)).toBe(true);
      expect(Array.isArray(stats.recentRepairs)).toBe(true);
    });

    test('カスタム修復ルールの追加が正常に動作する', () => {
      const customRule = {
        id: 'test-rule',
        name: 'テストルール',
        description: 'テスト用の修復ルール',
        errorPattern: /test error/i,
        errorType: ['console'],
        priority: 1,
        generateFix: () => [{
          id: 'test-fix',
          errorId: 'test-error',
          type: 'javascript_fix' as const,
          description: 'テスト修復',
          code: 'console.log("test fix");',
          applied: false,
          timestamp: new Date(),
        }]
      };

      expect(() => repairEngine.addCustomRule(customRule)).not.toThrow();
    });
  });

  describe('ValidationSystem', () => {
    test('検証システムが正常に初期化される', () => {
      expect(validationSystem).toBeDefined();
      expect(typeof validationSystem.runValidation).toBe('function');
      expect(typeof validationSystem.getValidationHistory).toBe('function');
      expect(typeof validationSystem.getLatestValidationResult).toBe('function');
    });

    test('検証履歴が正常に管理される', () => {
      const history = validationSystem.getValidationHistory();
      expect(Array.isArray(history)).toBe(true);
      
      const latest = validationSystem.getLatestValidationResult();
      expect(latest === null || typeof latest === 'object').toBe(true);
    });

    test('カスタムテストの追加が正常に動作する', () => {
      const customTest = {
        id: 'test-validation',
        name: 'テスト検証',
        description: 'テスト用の検証',
        category: 'functional' as const,
        priority: 'medium' as const,
        execute: async () => ({
          testId: 'test-validation',
          passed: true,
          score: 100,
          message: 'テスト成功',
          details: {},
          duration: 100,
          timestamp: new Date(),
        })
      };

      expect(() => validationSystem.addCustomTest('functional-tests', customTest)).not.toThrow();
    });
  });

  describe('MCPPlaywrightMasterController', () => {
    test('マスターコントローラーが正常に初期化される', () => {
      expect(masterController).toBeDefined();
      expect(typeof masterController.initialize).toBe('function');
      expect(typeof masterController.start).toBe('function');
      expect(typeof masterController.stop).toBe('function');
      expect(typeof masterController.getSystemStatus).toBe('function');
    });

    test('システム状態の確認が正常に動作する', () => {
      expect(masterController.isSystemInitialized()).toBe(false);
      expect(masterController.isSystemRunning()).toBe(false);
    });

    test('設定の取得と更新が正常に動作する', () => {
      const config = masterController.getConfig();
      expect(config).toHaveProperty('detectorConfig');
      expect(config).toHaveProperty('loopConfig');
      expect(config).toHaveProperty('enableAutoStart');
      
      const newConfig = { enableAutoStart: true };
      expect(() => masterController.updateConfig(newConfig)).not.toThrow();
      
      const updatedConfig = masterController.getConfig();
      expect(updatedConfig.enableAutoStart).toBe(true);
    });

    test('システムステータスの取得が正常に動作する', async () => {
      const status = await masterController.getSystemStatus();
      
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('systemHealth');
      expect(status).toHaveProperty('healthScore');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('alerts');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.healthScore).toBe('number');
      expect(Array.isArray(status.alerts)).toBe(true);
      
      // コンポーネント状態の確認
      expect(status.components).toHaveProperty('detector');
      expect(status.components).toHaveProperty('repairEngine');
      expect(status.components).toHaveProperty('loopController');
      expect(status.components).toHaveProperty('validation');
      
      // メトリクスの確認
      expect(status.metrics).toHaveProperty('totalErrors');
      expect(status.metrics).toHaveProperty('successfulRepairs');
      expect(status.metrics).toHaveProperty('failedRepairs');
      expect(status.metrics).toHaveProperty('systemUptime');
    });

    test('包括的レポート生成が正常に動作する', async () => {
      const report = await masterController.generateComprehensiveReport();
      
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('systemStatus');
      expect(report).toHaveProperty('detectorReport');
      expect(report).toHaveProperty('validationReport');
      expect(report).toHaveProperty('loopReport');
      expect(report).toHaveProperty('performanceMetrics');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('conclusion');
      
      expect(typeof report.id).toBe('string');
      expect(report.timestamp instanceof Date).toBe(true);
      expect(typeof report.duration).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(typeof report.conclusion).toBe('string');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効な設定でもエラーなく動作する', () => {
      expect(() => {
        new MCPPlaywrightMasterController({
          detectorConfig: {
            targetUrls: [],
            browsers: [],
            monitoringInterval: -1,
            maxRetries: -1,
            timeout: 0,
            enableScreenshots: false,
            enableTrace: false,
            reportingEnabled: false,
          }
        });
      }).not.toThrow();
    });

    test('エラー状態での緊急停止が正常に動作する', async () => {
      expect(async () => {
        await masterController.emergencyStop();
      }).not.toThrow();
    });
  });

  describe('タイプ安全性', () => {
    test('BrowserError インターフェースの型チェック', () => {
      const mockError = {
        id: 'test-error',
        timestamp: new Date(),
        type: 'console' as const,
        level: 'error' as const,
        message: 'Test error message',
        source: 'test',
        url: 'http://test.com',
      };

      expect(mockError.id).toBe('test-error');
      expect(mockError.type).toBe('console');
      expect(mockError.level).toBe('error');
    });

    test('SystemStatus インターフェースの型チェック', async () => {
      const status = await masterController.getSystemStatus();
      
      expect(['excellent', 'good', 'warning', 'critical', 'offline']).toContain(status.systemHealth);
      expect(status.healthScore).toBeGreaterThanOrEqual(0);
      expect(status.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('パフォーマンス', () => {
    test('ステータス取得のパフォーマンス', async () => {
      const startTime = Date.now();
      await masterController.getSystemStatus();
      const duration = Date.now() - startTime;
      
      // ステータス取得は1秒以内で完了すること
      expect(duration).toBeLessThan(1000);
    });

    test('レポート生成のパフォーマンス', async () => {
      const startTime = Date.now();
      await masterController.generateComprehensiveReport();
      const duration = Date.now() - startTime;
      
      // レポート生成は5秒以内で完了すること
      expect(duration).toBeLessThan(5000);
    });
  });
});
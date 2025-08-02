/**
 * ブラウザエラー監視・修復システム コンポーネントエクスポート
 */

export { default as BrowserErrorMonitor } from './BrowserErrorMonitor';
export { default as RealtimeErrorReport } from './RealtimeErrorReport';

export type { 
  BrowserError,
  ErrorDetectionConfig,
  MonitoringSession 
} from '../../services/errorDetectionEngine';

export type {
  RepairStrategy,
  RepairResult,
  RepairSession
} from '../../services/autoRepairEngine';

export type {
  ValidationTest,
  ValidationResult,
  ValidationReport
} from '../../services/validationSystem';

export type {
  InfiniteLoopConfig,
  LoopIteration,
  LoopSession,
  LoopStatistics
} from '../../services/infiniteLoopMonitor';
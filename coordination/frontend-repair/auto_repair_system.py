#!/usr/bin/env python3
"""
フロントエンドエラー自動修復システム - メインコントローラー
継続監視・分析・修復・検証の統合システム
"""

import os
import json
import time
import logging
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse

# 各コンポーネントをインポート
from error_monitor import FrontendErrorMonitor
from error_analyzer import FrontendErrorAnalyzer
from code_fixer import FrontendCodeFixer
from test_runner import FrontendTestRunner

class FrontendAutoRepairSystem:
    def __init__(self, 
                 frontend_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                 coordination_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination",
                 monitor_interval: int = 30,
                 auto_fix: bool = True,
                 max_fix_attempts: int = 3):
        
        self.frontend_path = Path(frontend_path)
        self.coordination_path = Path(coordination_path)
        self.monitor_interval = monitor_interval
        self.auto_fix = auto_fix
        self.max_fix_attempts = max_fix_attempts
        
        # システム状態
        self.is_running = False
        self.is_fixing = False
        self.last_fix_attempt = {}
        
        # コンポーネント初期化
        self.monitor = FrontendErrorMonitor(str(frontend_path), str(coordination_path))
        self.analyzer = FrontendErrorAnalyzer(str(frontend_path), str(coordination_path))
        self.fixer = FrontendCodeFixer(str(frontend_path), str(coordination_path))
        self.test_runner = FrontendTestRunner(str(frontend_path), str(coordination_path))
        
        self.setup_logging()
        self.setup_system_state()

    def setup_logging(self):
        """ログ設定"""
        log_file = self.coordination_path / "frontend-repair" / "auto_repair.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def setup_system_state(self):
        """システム状態ファイルを初期化"""
        self.state_file = self.coordination_path / "frontend-repair" / "system_state.json"
        
        default_state = {
            "status": "initialized",
            "last_check": None,
            "last_fix": None,
            "total_errors_found": 0,
            "total_fixes_applied": 0,
            "success_rate": 0.0,
            "running_since": None,
            "current_cycle": 0
        }
        
        if not self.state_file.exists():
            self.save_system_state(default_state)

    def load_system_state(self) -> Dict[str, Any]:
        """システム状態を読み込み"""
        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load system state: {e}")
            return {}

    def save_system_state(self, state: Dict[str, Any]):
        """システム状態を保存"""
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"Failed to save system state: {e}")

    def should_attempt_fix(self, error_hash: str) -> bool:
        """修復を試行すべきかチェック"""
        current_time = datetime.now()
        
        if error_hash in self.last_fix_attempt:
            last_attempt = datetime.fromisoformat(self.last_fix_attempt[error_hash]['timestamp'])
            attempts = self.last_fix_attempt[error_hash]['attempts']
            
            # 最大試行回数をチェック
            if attempts >= self.max_fix_attempts:
                # 24時間経過後にリセット
                if current_time - last_attempt > timedelta(hours=24):
                    del self.last_fix_attempt[error_hash]
                    return True
                return False
            
            # 1時間以内の再試行を防ぐ
            if current_time - last_attempt < timedelta(hours=1):
                return False
        
        return True

    def record_fix_attempt(self, error_hash: str, success: bool):
        """修復試行を記録"""
        current_time = datetime.now()
        
        if error_hash not in self.last_fix_attempt:
            self.last_fix_attempt[error_hash] = {
                'attempts': 0,
                'successes': 0,
                'timestamp': current_time.isoformat()
            }
        
        self.last_fix_attempt[error_hash]['attempts'] += 1
        if success:
            self.last_fix_attempt[error_hash]['successes'] += 1
        self.last_fix_attempt[error_hash]['timestamp'] = current_time.isoformat()

    def generate_error_hash(self, error: Dict[str, Any]) -> str:
        """エラーのハッシュを生成（重複チェック用）"""
        key_parts = [
            error.get('type', '') or '',
            error.get('message', '') or '',
            error.get('file', '') or '',
            str(error.get('line', 0) or 0)
        ]
        return str(hash('|'.join(key_parts)))

    def run_monitoring_cycle(self) -> Dict[str, Any]:
        """1回の監視サイクルを実行"""
        cycle_start = time.time()
        cycle_result = {
            'timestamp': datetime.now().isoformat(),
            'errors_found': 0,
            'errors_analyzed': 0,
            'fixes_attempted': 0,
            'fixes_successful': 0,
            'validation_passed': False,
            'duration': 0,
            'cycle_success': False
        }
        
        try:
            self.logger.info("Starting monitoring cycle")
            
            # 1. エラー監視
            self.logger.info("Phase 1: Error monitoring")
            errors_data = self.monitor.run_check()
            all_errors = errors_data.get('errors', [])
            cycle_result['errors_found'] = len(all_errors)
            
            if not all_errors:
                self.logger.info("No errors found - system healthy")
                cycle_result['cycle_success'] = True
                cycle_result['validation_passed'] = True
                return cycle_result
            
            # 2. エラー分析
            self.logger.info(f"Phase 2: Analyzing {len(all_errors)} errors")
            analysis_result = self.analyzer.analyze_errors_batch(all_errors)
            fixable_analyses = [a for a in analysis_result['analyses'] if a['fixable']]
            cycle_result['errors_analyzed'] = len(fixable_analyses)
            
            if not fixable_analyses:
                self.logger.info("No fixable errors found")
                cycle_result['cycle_success'] = True
                return cycle_result
            
            # 3. 修復適用（自動修復が有効な場合）
            if self.auto_fix and not self.is_fixing:
                self.is_fixing = True
                try:
                    self.logger.info(f"Phase 3: Applying fixes for {len(fixable_analyses)} errors")
                    
                    # 修復試行履歴をチェック
                    analyses_to_fix = []
                    for analysis in fixable_analyses:
                        error_hash = self.generate_error_hash(analysis['error'])
                        if self.should_attempt_fix(error_hash):
                            analyses_to_fix.append(analysis)
                        else:
                            self.logger.info(f"Skipping fix attempt for {error_hash} (too many recent attempts)")
                    
                    if analyses_to_fix:
                        fix_result = self.fixer.apply_fixes_batch(analyses_to_fix)
                        cycle_result['fixes_attempted'] = fix_result['total_fixes_attempted']
                        cycle_result['fixes_successful'] = fix_result['successful_fixes']
                        
                        # 修復試行を記録
                        for analysis in analyses_to_fix:
                            error_hash = self.generate_error_hash(analysis['error'])
                            # 該当する修復結果を探す
                            success = any(
                                fix['fix_result']['success'] 
                                for fix in fix_result['fixes'] 
                                if fix['error'] == analysis['error']
                            )
                            self.record_fix_attempt(error_hash, success)
                        
                        # 4. 修復後の検証
                        if fix_result['successful_fixes'] > 0:
                            self.logger.info("Phase 4: Validating fixes")
                            validation_result = self.test_runner.validate_fix(fix_result)
                            cycle_result['validation_passed'] = validation_result['validation_success']
                            
                            if validation_result['validation_success']:
                                self.logger.info("✅ Fix validation successful!")
                                cycle_result['cycle_success'] = True
                            else:
                                self.logger.warning("❌ Fix validation failed")
                        else:
                            self.logger.warning("No fixes were successful")
                    else:
                        self.logger.info("No fixes to attempt (all recently attempted)")
                        
                finally:
                    self.is_fixing = False
            else:
                self.logger.info("Auto-fix disabled or already fixing - skipping fix phase")
                
        except Exception as e:
            self.logger.error(f"Monitoring cycle failed: {e}")
            cycle_result['error'] = str(e)
        finally:
            cycle_result['duration'] = time.time() - cycle_start
            
        return cycle_result

    def update_system_statistics(self, cycle_result: Dict[str, Any]):
        """システム統計を更新"""
        state = self.load_system_state()
        
        state['last_check'] = cycle_result['timestamp']
        state['current_cycle'] = state.get('current_cycle', 0) + 1
        state['total_errors_found'] = state.get('total_errors_found', 0) + cycle_result['errors_found']
        state['total_fixes_applied'] = state.get('total_fixes_applied', 0) + cycle_result['fixes_successful']
        
        # 成功率計算
        total_attempts = state.get('total_fixes_applied', 0) + cycle_result.get('fixes_attempted', 0)
        if total_attempts > 0:
            state['success_rate'] = state['total_fixes_applied'] / total_attempts
        
        # 修復成功時の記録
        if cycle_result['fixes_successful'] > 0:
            state['last_fix'] = cycle_result['timestamp']
        
        self.save_system_state(state)

    def start_continuous_monitoring(self):
        """継続監視を開始"""
        self.logger.info(f"Starting continuous frontend error monitoring (interval: {self.monitor_interval}s)")
        
        state = self.load_system_state()
        state['status'] = 'running'
        state['running_since'] = datetime.now().isoformat()
        self.save_system_state(state)
        
        self.is_running = True
        
        try:
            while self.is_running:
                cycle_result = self.run_monitoring_cycle()
                self.update_system_statistics(cycle_result)
                
                # サイクル結果をログ出力
                self.logger.info(f"Cycle completed - Errors: {cycle_result['errors_found']}, "
                               f"Fixes: {cycle_result['fixes_successful']}, "
                               f"Success: {cycle_result['cycle_success']}")
                
                # 次のサイクルまで待機
                if self.is_running:
                    time.sleep(self.monitor_interval)
                    
        except KeyboardInterrupt:
            self.logger.info("Monitoring stopped by user")
        except Exception as e:
            self.logger.error(f"Continuous monitoring failed: {e}")
        finally:
            self.stop_monitoring()

    def stop_monitoring(self):
        """監視を停止"""
        self.is_running = False
        
        state = self.load_system_state()
        state['status'] = 'stopped'
        self.save_system_state(state)
        
        self.logger.info("Frontend error monitoring stopped")

    def run_single_check(self) -> Dict[str, Any]:
        """1回だけのチェックを実行"""
        self.logger.info("Running single error check and repair cycle")
        
        state = self.load_system_state()
        state['status'] = 'single_run'
        self.save_system_state(state)
        
        cycle_result = self.run_monitoring_cycle()
        self.update_system_statistics(cycle_result)
        
        state['status'] = 'idle'
        self.save_system_state(state)
        
        return cycle_result

    def get_system_status(self) -> Dict[str, Any]:
        """システム状態を取得"""
        state = self.load_system_state()
        
        # 追加の状態情報
        state['is_running'] = self.is_running
        state['is_fixing'] = self.is_fixing
        state['monitor_interval'] = self.monitor_interval
        state['auto_fix_enabled'] = self.auto_fix
        state['max_fix_attempts'] = self.max_fix_attempts
        
        # 最近の修復試行履歴
        state['recent_fix_attempts'] = len(self.last_fix_attempt)
        
        return state

def main():
    parser = argparse.ArgumentParser(description='Frontend Auto Repair System')
    parser.add_argument('--mode', choices=['monitor', 'single', 'status'], 
                       default='single', help='Operation mode')
    parser.add_argument('--interval', type=int, default=30, 
                       help='Monitoring interval in seconds')
    parser.add_argument('--no-auto-fix', action='store_true', 
                       help='Disable automatic fixing')
    parser.add_argument('--max-attempts', type=int, default=3, 
                       help='Maximum fix attempts per error')
    
    args = parser.parse_args()
    
    # システム初期化
    repair_system = FrontendAutoRepairSystem(
        monitor_interval=args.interval,
        auto_fix=not args.no_auto_fix,
        max_fix_attempts=args.max_attempts
    )
    
    if args.mode == 'monitor':
        # 継続監視モード
        repair_system.start_continuous_monitoring()
    elif args.mode == 'single':
        # 1回実行モード
        result = repair_system.run_single_check()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.mode == 'status':
        # 状態確認モード
        status = repair_system.get_system_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
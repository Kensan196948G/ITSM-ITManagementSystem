#!/usr/bin/env python3
"""
継続的Loop監視スクリプト
エラーがゼロになるまで無限にLoop実行を継続監視する
"""

import json
import time
import subprocess
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path

class ContinuousLoopMonitor:
    def __init__(self):
        self.start_time = datetime.now()
        self.monitoring_active = True
        self.check_history = []
        self.loop_transitions = []
        self.zero_error_achieved = False
        
        # シグナルハンドラ設定
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """Ctrl+C等の割り込みシグナル処理"""
        print(f"\nReceived signal {signum}, stopping monitoring...")
        self.monitoring_active = False
    
    def get_current_status(self):
        """現在のシステム状態を取得"""
        status = {
            'timestamp': datetime.now().isoformat(),
            'total_errors': 0,
            'error_details': {},
            'loop_info': {},
            'health_status': 'unknown'
        }
        
        # API エラー
        try:
            with open('api_error_metrics.json', 'r') as f:
                api_data = json.load(f)
                api_errors = api_data.get('total_errors', 0)
                health_penalty = 5 if api_data.get('health_status') == 'unhealthy' else 0
                status['total_errors'] += api_errors + health_penalty
                status['error_details']['api'] = {
                    'total_errors': api_errors,
                    'health_status': api_data.get('health_status'),
                    'penalty': health_penalty
                }
                status['health_status'] = api_data.get('health_status', 'unknown')
        except Exception as e:
            status['error_details']['api'] = {'error': str(e)}
        
        # 協調エラー
        try:
            with open('../coordination/errors.json', 'r') as f:
                content = f.read().strip()
                if content:
                    coord_data = json.loads(content)
                    if 'errors' in coord_data:
                        coord_errors = len(coord_data['errors'])
                        status['total_errors'] += coord_errors
                        status['error_details']['coordination'] = {
                            'error_count': coord_errors,
                            'recent_errors': coord_data['errors'][-3:] if coord_data['errors'] else []
                        }
                    elif 'error_count' in coord_data:
                        coord_errors = coord_data['error_count']
                        status['total_errors'] += coord_errors
                        status['error_details']['coordination'] = {'error_count': coord_errors}
                else:
                    status['error_details']['coordination'] = {'error_count': 0}
        except Exception as e:
            status['error_details']['coordination'] = {'error': str(e)}
        
        # Loop情報
        try:
            with open('../coordination/infinite_loop_state.json', 'r') as f:
                loop_data = json.load(f)
                status['loop_info'] = {
                    'loop_count': loop_data.get('loop_count', 0),
                    'total_fixed': loop_data.get('total_errors_fixed', 0),
                    'last_scan': loop_data.get('last_scan', 'unknown')
                }
        except Exception as e:
            status['loop_info'] = {'error': str(e)}
        
        return status
    
    def monitor_continuous_loop(self, max_duration_minutes=60):
        """継続的Loop監視"""
        print(f"Starting Continuous Loop Monitoring...")
        print(f"Maximum duration: {max_duration_minutes} minutes")
        print(f"Start time: {self.start_time.isoformat()}")
        print("Press Ctrl+C to stop monitoring early\n")
        
        end_time = self.start_time + timedelta(minutes=max_duration_minutes)
        check_interval = 30  # 30秒間隔
        check_count = 0
        
        last_loop_count = 0
        zero_error_count = 0
        consecutive_zero_needed = 3  # 連続3回ゼロエラーで完了
        
        while self.monitoring_active and datetime.now() < end_time:
            check_count += 1
            current_status = self.get_current_status()
            
            current_loop = current_status['loop_info'].get('loop_count', 0)
            current_errors = current_status['total_errors']
            current_health = current_status['health_status']
            
            # Progress display
            elapsed_minutes = (datetime.now() - self.start_time).total_seconds() / 60
            print(f"[{elapsed_minutes:6.1f}min] Check #{check_count:3d}: "
                  f"Loop={current_loop:2d}, Errors={current_errors:2d}, Health={current_health}")
            
            # Loop transition detection
            if current_loop != last_loop_count:
                transition = {
                    'timestamp': current_status['timestamp'],
                    'from_loop': last_loop_count,
                    'to_loop': current_loop,
                    'error_count': current_errors,
                    'check_number': check_count
                }
                self.loop_transitions.append(transition)
                print(f"  ★ Loop Transition: {last_loop_count} → {current_loop}")
                last_loop_count = current_loop
            
            # Zero error tracking
            if current_errors == 0:
                zero_error_count += 1
                print(f"  ✓ Zero errors detected ({zero_error_count}/{consecutive_zero_needed})")
                
                if zero_error_count >= consecutive_zero_needed:
                    print(f"\n🎉 SUCCESS: {consecutive_zero_needed} consecutive zero-error checks achieved!")
                    self.zero_error_achieved = True
                    break
            else:
                if zero_error_count > 0:
                    print(f"  ✗ Error count increased, resetting zero counter (was {zero_error_count})")
                zero_error_count = 0
            
            # Store check history
            self.check_history.append({
                'check_number': check_count,
                'elapsed_minutes': elapsed_minutes,
                'status': current_status,
                'zero_error_streak': zero_error_count
            })
            
            # Error details (if any)
            if current_errors > 0:
                api_errors = current_status['error_details'].get('api', {})
                coord_errors = current_status['error_details'].get('coordination', {})
                print(f"    API: {api_errors.get('total_errors', 0)}+{api_errors.get('penalty', 0)}, "
                      f"Coord: {coord_errors.get('error_count', 0)}")
            
            # Wait for next check
            if self.monitoring_active and datetime.now() < end_time:
                time.sleep(check_interval)
        
        # Final status
        final_status = self.get_current_status()
        elapsed_time = (datetime.now() - self.start_time).total_seconds() / 60
        
        print(f"\n{'='*60}")
        print("CONTINUOUS LOOP MONITORING SUMMARY")
        print(f"{'='*60}")
        print(f"Total monitoring time: {elapsed_time:.1f} minutes")
        print(f"Total checks performed: {check_count}")
        print(f"Loop transitions observed: {len(self.loop_transitions)}")
        print(f"Zero errors achieved: {'YES' if self.zero_error_achieved else 'NO'}")
        print(f"Final error count: {final_status['total_errors']}")
        print(f"Final loop count: {final_status['loop_info'].get('loop_count', 'N/A')}")
        print(f"Final health status: {final_status['health_status']}")
        
        return {
            'monitoring_completed': True,
            'zero_error_achieved': self.zero_error_achieved,
            'total_monitoring_minutes': elapsed_time,
            'total_checks': check_count,
            'loop_transitions': len(self.loop_transitions),
            'final_status': final_status,
            'check_history': self.check_history[-10:],  # Last 10 checks
            'loop_transition_history': self.loop_transitions
        }
    
    def analyze_loop_efficiency(self):
        """Loop効率を分析"""
        if not self.loop_transitions:
            return {'message': 'No loop transitions to analyze'}
        
        print(f"\n=== Loop Efficiency Analysis ===")
        
        # Loop間隔分析
        if len(self.loop_transitions) > 1:
            intervals = []
            for i in range(1, len(self.loop_transitions)):
                prev_time = datetime.fromisoformat(self.loop_transitions[i-1]['timestamp'])
                curr_time = datetime.fromisoformat(self.loop_transitions[i]['timestamp'])
                interval_minutes = (curr_time - prev_time).total_seconds() / 60
                intervals.append(interval_minutes)
            
            avg_interval = sum(intervals) / len(intervals)
            print(f"Average loop interval: {avg_interval:.1f} minutes")
            print(f"Loop interval range: {min(intervals):.1f} - {max(intervals):.1f} minutes")
        
        # エラー修正効率
        total_loops = len(self.loop_transitions)
        if total_loops > 0:
            first_loop = self.loop_transitions[0]['from_loop']
            last_loop = self.loop_transitions[-1]['to_loop']
            loop_progression = last_loop - first_loop
            print(f"Loop progression: {first_loop} → {last_loop} ({loop_progression} loops)")
        
        return {
            'total_transitions': len(self.loop_transitions),
            'average_interval_minutes': avg_interval if len(self.loop_transitions) > 1 else None,
            'loop_progression': loop_progression if total_loops > 0 else 0
        }
    
    def run_comprehensive_monitoring(self, duration_minutes=30):
        """包括的な継続監視実行"""
        try:
            # メイン監視実行
            result = self.monitor_continuous_loop(max_duration_minutes=duration_minutes)
            
            # 効率分析
            efficiency = self.analyze_loop_efficiency()
            result['efficiency_analysis'] = efficiency
            
            # 結果保存
            output_file = 'continuous_loop_monitoring_results.json'
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            
            print(f"\nMonitoring results saved to: {output_file}")
            
            # 最終判定
            if result['zero_error_achieved']:
                print("\n🎯 INFINITE LOOP TEST COMPLETED SUCCESSFULLY!")
                print("   All errors have been resolved to zero.")
            else:
                print(f"\n⏰ Monitoring completed after {duration_minutes} minutes")
                print("   Loop system is still active and fixing errors.")
            
            return result
            
        except KeyboardInterrupt:
            print("\n\n⚠️ Monitoring interrupted by user")
            return {'interrupted': True, 'partial_results': self.check_history}
        except Exception as e:
            print(f"\n❌ Error during monitoring: {e}")
            return {'error': str(e)}

def main():
    if len(sys.argv) > 1:
        duration = int(sys.argv[1])
    else:
        duration = 30  # Default 30 minutes
    
    print(f"Infinite Loop Error Resolution Test")
    print(f"Duration: {duration} minutes")
    
    monitor = ContinuousLoopMonitor()
    result = monitor.run_comprehensive_monitoring(duration_minutes=duration)
    
    return result

if __name__ == "__main__":
    main()
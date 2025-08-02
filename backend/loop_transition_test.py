#!/usr/bin/env python3
"""
Loop間移行テストスクリプト
エラー解決後の次Loopへの移行プロセスをテストする
"""

import json
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

class LoopTransitionTest:
    def __init__(self):
        self.test_start_time = datetime.now()
        self.loop_history = []
        self.error_history = []
        
    def get_loop_state(self):
        """現在のLoop状態を取得"""
        try:
            with open('../coordination/infinite_loop_state.json', 'r') as f:
                return json.load(f)
        except Exception as e:
            return {'error': str(e)}
    
    def get_error_state(self):
        """現在のエラー状態を取得"""
        total_errors = 0
        error_details = {}
        
        # API errors
        try:
            with open('api_error_metrics.json', 'r') as f:
                api_data = json.load(f)
                api_errors = api_data.get('total_errors', 0)
                health_penalty = 5 if api_data.get('health_status') == 'unhealthy' else 0
                total_errors += api_errors + health_penalty
                error_details['api'] = {
                    'total_errors': api_errors,
                    'health_status': api_data.get('health_status'),
                    'penalty': health_penalty
                }
        except Exception as e:
            error_details['api'] = {'error': str(e)}
        
        # Coordination errors
        try:
            with open('../coordination/errors.json', 'r') as f:
                coord_data = json.load(f)
                if 'errors' in coord_data:
                    coord_errors = len(coord_data['errors'])
                    total_errors += coord_errors
                    error_details['coordination'] = {
                        'error_count': coord_errors,
                        'errors': coord_data['errors'][:3] if coord_data['errors'] else []  # First 3 errors
                    }
                elif 'error_count' in coord_data:
                    coord_errors = coord_data['error_count']
                    total_errors += coord_errors
                    error_details['coordination'] = {'error_count': coord_errors}
        except Exception as e:
            error_details['coordination'] = {'error': str(e)}
        
        return {
            'total_errors': total_errors,
            'details': error_details,
            'timestamp': datetime.now().isoformat()
        }
    
    def track_loop_progress(self, duration_minutes=5):
        """Loop進行を追跡"""
        print(f"Tracking loop progress for {duration_minutes} minutes...")
        
        end_time = self.test_start_time + timedelta(minutes=duration_minutes)
        check_interval = 30  # 30秒間隔
        
        initial_loop_state = self.get_loop_state()
        initial_error_state = self.get_error_state()
        
        print(f"Initial Loop Count: {initial_loop_state.get('loop_count', 'N/A')}")
        print(f"Initial Total Errors: {initial_error_state['total_errors']}")
        print(f"Initial Errors Fixed: {initial_loop_state.get('total_errors_fixed', 'N/A')}")
        
        self.loop_history.append({
            'timestamp': datetime.now().isoformat(),
            'loop_state': initial_loop_state,
            'error_state': initial_error_state,
            'type': 'initial'
        })
        
        check_count = 0
        
        while datetime.now() < end_time:
            time.sleep(check_interval)
            check_count += 1
            
            current_loop_state = self.get_loop_state()
            current_error_state = self.get_error_state()
            
            current_loop_count = current_loop_state.get('loop_count', 0)
            current_total_errors = current_error_state['total_errors']
            current_errors_fixed = current_loop_state.get('total_errors_fixed', 0)
            
            print(f"Check #{check_count}: Loop={current_loop_count}, Errors={current_total_errors}, Fixed={current_errors_fixed}")
            
            # Loop変化を検出
            if current_loop_count != initial_loop_state.get('loop_count', 0):
                print(f"  → Loop transition detected: {initial_loop_state.get('loop_count', 0)} → {current_loop_count}")
                
                self.loop_history.append({
                    'timestamp': datetime.now().isoformat(),
                    'loop_state': current_loop_state,
                    'error_state': current_error_state,
                    'type': 'transition',
                    'previous_loop': initial_loop_state.get('loop_count', 0),
                    'new_loop': current_loop_count
                })
                
                initial_loop_state = current_loop_state
            
            # エラー変化を記録
            self.error_history.append({
                'timestamp': datetime.now().isoformat(),
                'total_errors': current_total_errors,
                'error_details': current_error_state['details']
            })
            
            initial_error_state = current_error_state
        
        print(f"Tracking completed after {duration_minutes} minutes")
        return self.loop_history, self.error_history
    
    def analyze_transition_patterns(self):
        """Loop移行パターンを分析"""
        print("\n=== Loop Transition Pattern Analysis ===")
        
        if len(self.loop_history) < 2:
            print("Insufficient data for transition analysis")
            return {}
        
        transitions = [h for h in self.loop_history if h['type'] == 'transition']
        
        print(f"Total Loop Transitions: {len(transitions)}")
        
        for i, transition in enumerate(transitions, 1):
            prev_loop = transition['previous_loop']
            new_loop = transition['new_loop']
            error_count = transition['error_state']['total_errors']
            
            print(f"Transition #{i}: Loop {prev_loop} → {new_loop}")
            print(f"  Error count at transition: {error_count}")
            print(f"  Timestamp: {transition['timestamp']}")
        
        return {
            'total_transitions': len(transitions),
            'transitions': transitions
        }
    
    def analyze_error_resolution(self):
        """エラー解決パターンを分析"""
        print("\n=== Error Resolution Analysis ===")
        
        if not self.error_history:
            print("No error history available")
            return {}
        
        # エラー数の変化を追跡
        error_counts = [e['total_errors'] for e in self.error_history]
        
        min_errors = min(error_counts)
        max_errors = max(error_counts)
        final_errors = error_counts[-1] if error_counts else 0
        
        print(f"Error Range: {min_errors} - {max_errors}")
        print(f"Final Error Count: {final_errors}")
        
        # エラーがゼロになった回数
        zero_error_count = sum(1 for e in error_counts if e == 0)
        print(f"Zero Error Instances: {zero_error_count}/{len(error_counts)}")
        
        # エラー減少傾向
        if len(error_counts) > 1:
            decreasing_trend = sum(1 for i in range(1, len(error_counts)) 
                                 if error_counts[i] < error_counts[i-1])
            print(f"Error Decreasing Instances: {decreasing_trend}/{len(error_counts)-1}")
        
        return {
            'min_errors': min_errors,
            'max_errors': max_errors,
            'final_errors': final_errors,
            'zero_error_instances': zero_error_count,
            'total_checks': len(error_counts)
        }
    
    def test_continuous_loop_until_zero_errors(self, max_wait_minutes=10):
        """エラーがゼロになるまで継続的にLoopをテスト"""
        print(f"\n=== Continuous Loop Test (Max {max_wait_minutes} minutes) ===")
        
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=max_wait_minutes)
        check_interval = 30
        
        zero_error_achieved = False
        check_count = 0
        
        while datetime.now() < end_time:
            check_count += 1
            current_error_state = self.get_error_state()
            current_loop_state = self.get_loop_state()
            
            error_count = current_error_state['total_errors']
            loop_count = current_loop_state.get('loop_count', 0)
            
            print(f"Continuous Check #{check_count}: Loop={loop_count}, Errors={error_count}")
            
            if error_count == 0:
                print(f"✓ Zero errors achieved at Loop #{loop_count}!")
                zero_error_achieved = True
                break
            
            time.sleep(check_interval)
        
        elapsed_time = (datetime.now() - start_time).total_seconds() / 60
        
        if zero_error_achieved:
            print(f"✓ SUCCESS: Zero errors achieved in {elapsed_time:.1f} minutes")
        else:
            print(f"✗ TIMEOUT: Zero errors not achieved within {max_wait_minutes} minutes")
        
        return {
            'zero_error_achieved': zero_error_achieved,
            'elapsed_time_minutes': elapsed_time,
            'final_error_count': current_error_state['total_errors'],
            'final_loop_count': current_loop_state.get('loop_count', 0)
        }
    
    def run_comprehensive_test(self):
        """包括的なLoop移行テスト"""
        print("Starting Loop Transition Test...")
        print(f"Test Start Time: {self.test_start_time.isoformat()}")
        
        # 1. Loop進行追跡
        loop_history, error_history = self.track_loop_progress(duration_minutes=3)
        
        # 2. 移行パターン分析
        transition_analysis = self.analyze_transition_patterns()
        
        # 3. エラー解決分析
        error_analysis = self.analyze_error_resolution()
        
        # 4. ゼロエラーまでの継続テスト
        continuous_test = self.test_continuous_loop_until_zero_errors(max_wait_minutes=7)
        
        # 結果サマリー
        print(f"\n{'='*60}")
        print("LOOP TRANSITION TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Test Duration: {(datetime.now() - self.test_start_time).total_seconds() / 60:.1f} minutes")
        print(f"Loop Transitions: {transition_analysis.get('total_transitions', 0)}")
        print(f"Error Range: {error_analysis.get('min_errors', 'N/A')} - {error_analysis.get('max_errors', 'N/A')}")
        print(f"Zero Error Achieved: {'YES' if continuous_test['zero_error_achieved'] else 'NO'}")
        print(f"Final Error Count: {continuous_test['final_error_count']}")
        print(f"Final Loop Count: {continuous_test['final_loop_count']}")
        
        return {
            'test_start_time': self.test_start_time.isoformat(),
            'test_end_time': datetime.now().isoformat(),
            'loop_history': loop_history,
            'error_history': error_history,
            'transition_analysis': transition_analysis,
            'error_analysis': error_analysis,
            'continuous_test': continuous_test
        }

def main():
    tester = LoopTransitionTest()
    result = tester.run_comprehensive_test()
    
    # 結果をJSONで保存
    output_file = 'loop_transition_test_results.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\nTest results saved to: {output_file}")
    return result

if __name__ == "__main__":
    main()
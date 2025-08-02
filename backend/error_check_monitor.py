#!/usr/bin/env python3
"""
エラー監視テストスクリプト
5秒間隔でシステムエラーをチェックし、Loop発動条件を検証する
"""

import json
import time
import subprocess
import sys
from datetime import datetime
from pathlib import Path

def check_api_errors():
    """API エラーメトリクスをチェック"""
    try:
        with open('api_error_metrics.json', 'r') as f:
            api_metrics = json.load(f)
            return {
                'count': api_metrics.get('total_errors', 0),
                'health': api_metrics.get('health_status', 'unknown'),
                'timestamp': api_metrics.get('timestamp', 'unknown')
            }
    except Exception as e:
        return {'count': -1, 'health': 'error', 'error': str(e)}

def check_coordination_errors():
    """協調エラーをチェック"""
    try:
        with open('../coordination/errors.json', 'r') as f:
            coord_errors = json.load(f)
            if 'errors' in coord_errors:
                return {
                    'count': len(coord_errors['errors']),
                    'last_update': coord_errors.get('lastUpdate', 'unknown'),
                    'summary': coord_errors.get('summary', {})
                }
            elif 'error_count' in coord_errors:
                return {
                    'count': coord_errors['error_count'],
                    'last_check': coord_errors.get('last_check', 'unknown')
                }
    except Exception as e:
        return {'count': -1, 'error': str(e)}

def check_infinite_loop_status():
    """無限ループ状態をチェック"""
    try:
        with open('../coordination/infinite_loop_state.json', 'r') as f:
            loop_state = json.load(f)
            return {
                'loop_count': loop_state.get('loop_count', 0),
                'total_fixed': loop_state.get('total_errors_fixed', 0),
                'last_scan': loop_state.get('last_scan', 'unknown')
            }
    except Exception as e:
        return {'error': str(e)}

def run_quick_test():
    """基本テストを実行"""
    try:
        result = subprocess.run(
            ['python3', '-m', 'pytest', 'tests/test_basic.py', '--tb=no', '-q'],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0:
            return {'status': 'PASSED', 'returncode': 0}
        else:
            return {
                'status': 'FAILED', 
                'returncode': result.returncode,
                'output': result.stdout[-200:] if result.stdout else ''
            }
    except subprocess.TimeoutExpired:
        return {'status': 'TIMEOUT', 'returncode': -1}
    except Exception as e:
        return {'status': 'ERROR', 'error': str(e)}

def calculate_error_score(api_result, coord_result, loop_result, test_result):
    """エラースコアを計算"""
    score = 0
    
    # API エラー
    if api_result.get('count', 0) > 0:
        score += api_result['count']
    if api_result.get('health') == 'unhealthy':
        score += 5
    
    # 協調エラー
    coord_count = coord_result.get('count', 0)
    if coord_count > 0:
        score += coord_count
    
    # テストエラー
    if test_result.get('status') != 'PASSED':
        score += 10
    
    return score

def check_system_errors():
    """システム全体のエラーをチェック"""
    timestamp = datetime.now().isoformat()
    
    print(f"[{timestamp}] === System Error Check ===")
    
    # 各種エラーをチェック
    api_result = check_api_errors()
    coord_result = check_coordination_errors()
    loop_result = check_infinite_loop_status()
    test_result = run_quick_test()
    
    # 結果表示
    print(f"API Errors: {api_result.get('count', 'N/A')}, Health: {api_result.get('health', 'N/A')}")
    print(f"Coordination Errors: {coord_result.get('count', 'N/A')}")
    print(f"Loop Status: Loop#{loop_result.get('loop_count', 'N/A')}, Fixed: {loop_result.get('total_fixed', 'N/A')}")
    print(f"Basic Tests: {test_result.get('status', 'N/A')}")
    
    # エラースコア計算
    error_score = calculate_error_score(api_result, coord_result, loop_result, test_result)
    print(f"Total Error Score: {error_score}")
    
    # Loop発動条件チェック
    should_trigger_loop = error_score > 0
    print(f"Loop Trigger Required: {'YES' if should_trigger_loop else 'NO'}")
    
    return {
        'timestamp': timestamp,
        'error_score': error_score,
        'should_trigger_loop': should_trigger_loop,
        'api': api_result,
        'coordination': coord_result,
        'loop': loop_result,
        'tests': test_result
    }

def main():
    """メイン実行関数"""
    print("Starting Error Monitoring Test...")
    print("Testing 5-second interval error checking...")
    
    results = []
    
    # 5秒間隔で3回チェック
    for i in range(3):
        print(f"\n--- Check #{i+1}/3 ---")
        result = check_system_errors()
        results.append(result)
        
        if i < 2:  # 最後のチェック以外
            print("Waiting 5 seconds...")
            time.sleep(5)
    
    # 結果サマリー
    print("\n" + "="*60)
    print("ERROR MONITORING TEST SUMMARY")
    print("="*60)
    
    for i, result in enumerate(results, 1):
        print(f"Check #{i}: Score={result['error_score']}, Loop={'YES' if result['should_trigger_loop'] else 'NO'}")
    
    # 平均エラースコア
    avg_score = sum(r['error_score'] for r in results) / len(results)
    print(f"Average Error Score: {avg_score:.1f}")
    
    # Loop発動回数
    loop_triggers = sum(1 for r in results if r['should_trigger_loop'])
    print(f"Loop Triggers: {loop_triggers}/{len(results)}")
    
    print("\nError monitoring test completed.")
    return results

if __name__ == "__main__":
    main()
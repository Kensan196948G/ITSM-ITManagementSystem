#!/usr/bin/env python3
"""
Loop発動条件検証テストスクリプト
エラー閾値とLoop発動ロジックをテストする
"""

import json
import time
import subprocess
from datetime import datetime
from pathlib import Path


class LoopTriggerTest:
    def __init__(self):
        self.test_results = []
        self.error_threshold = 0  # 設定から読み込み

    def load_config(self):
        """設定を読み込み"""
        try:
            with open("../coordination/realtime_repair_state.json", "r") as f:
                content = f.read()
                if content.strip():
                    config_data = json.loads(content)
                    self.error_threshold = config_data.get("config", {}).get(
                        "error_threshold", 0
                    )
                    print(f"Loaded error_threshold: {self.error_threshold}")
                else:
                    print("Config file is empty, using default threshold: 0")
        except Exception as e:
            print(f"Failed to load config: {e}, using default threshold: 0")

    def get_current_error_count(self):
        """現在のエラー数を取得"""
        error_count = 0

        # API errors
        try:
            with open("api_error_metrics.json", "r") as f:
                api_data = json.load(f)
                api_errors = api_data.get("total_errors", 0)
                health_unhealthy = (
                    5 if api_data.get("health_status") == "unhealthy" else 0
                )
                error_count += api_errors + health_unhealthy
        except:
            pass

        # Coordination errors
        try:
            with open("../coordination/errors.json", "r") as f:
                coord_data = json.load(f)
                if "errors" in coord_data:
                    error_count += len(coord_data["errors"])
                elif "error_count" in coord_data:
                    error_count += coord_data["error_count"]
        except:
            pass

        return error_count

    def get_loop_state(self):
        """現在のLoop状態を取得"""
        try:
            with open("../coordination/infinite_loop_state.json", "r") as f:
                loop_data = json.load(f)
                return {
                    "loop_count": loop_data.get("loop_count", 0),
                    "total_fixed": loop_data.get("total_errors_fixed", 0),
                    "last_scan": loop_data.get("last_scan", "unknown"),
                }
        except:
            return {"loop_count": 0, "total_fixed": 0, "last_scan": "error"}

    def should_trigger_loop(self, error_count):
        """Loop発動条件を判定"""
        return error_count > self.error_threshold

    def test_trigger_condition(self):
        """Loop発動条件をテスト"""
        print(f"\n=== Loop Trigger Condition Test ===")
        print(f"Error Threshold: {self.error_threshold}")

        # 現在のエラー数取得
        error_count = self.get_current_error_count()
        print(f"Current Error Count: {error_count}")

        # Loop状態取得
        loop_state = self.get_loop_state()
        print(f"Current Loop State: {loop_state}")

        # 発動条件判定
        should_trigger = self.should_trigger_loop(error_count)
        print(f"Should Trigger Loop: {'YES' if should_trigger else 'NO'}")

        # テスト結果記録
        result = {
            "timestamp": datetime.now().isoformat(),
            "error_count": error_count,
            "error_threshold": self.error_threshold,
            "should_trigger": should_trigger,
            "loop_state": loop_state,
        }

        self.test_results.append(result)
        return result

    def wait_for_loop_execution(self):
        """Loop実行を待機して確認"""
        print("\n=== Waiting for Loop Execution ===")

        # 実行前の状態
        initial_state = self.get_loop_state()
        initial_loop_count = initial_state["loop_count"]
        print(f"Initial Loop Count: {initial_loop_count}")

        # 最大2分待機
        max_wait_seconds = 120
        check_interval = 10
        checks = max_wait_seconds // check_interval

        for i in range(checks):
            time.sleep(check_interval)
            current_state = self.get_loop_state()
            current_loop_count = current_state["loop_count"]

            print(f"Check #{i+1}: Loop Count = {current_loop_count}")

            if current_loop_count > initial_loop_count:
                print(f"✓ Loop executed! New count: {current_loop_count}")
                return {
                    "executed": True,
                    "initial_count": initial_loop_count,
                    "final_count": current_loop_count,
                    "wait_time": (i + 1) * check_interval,
                }

        print("✗ No loop execution detected within timeout")
        return {
            "executed": False,
            "initial_count": initial_loop_count,
            "final_count": current_state["loop_count"],
            "wait_time": max_wait_seconds,
        }

    def test_error_threshold_scenarios(self):
        """エラー閾値シナリオをテスト"""
        print(f"\n=== Error Threshold Scenarios Test ===")

        # シナリオ1: 閾値以下
        test_cases = [
            {"error_count": 0, "description": "No errors"},
            {"error_count": self.error_threshold, "description": "At threshold"},
            {"error_count": self.error_threshold + 1, "description": "Above threshold"},
            {
                "error_count": self.error_threshold + 5,
                "description": "Well above threshold",
            },
        ]

        for case in test_cases:
            error_count = case["error_count"]
            should_trigger = self.should_trigger_loop(error_count)

            print(f"Case: {case['description']}")
            print(f"  Error Count: {error_count}")
            print(f"  Should Trigger: {'YES' if should_trigger else 'NO'}")

    def run_comprehensive_test(self):
        """包括的なLoop発動テスト"""
        print("Starting Loop Trigger Verification Test...")

        # 設定読み込み
        self.load_config()

        # 発動条件テスト
        trigger_result = self.test_trigger_condition()

        # エラー閾値シナリオテスト
        self.test_error_threshold_scenarios()

        # Loop実行待機（エラーがある場合のみ）
        if trigger_result["should_trigger"]:
            loop_result = self.wait_for_loop_execution()
            trigger_result["loop_execution"] = loop_result

        # 結果サマリー
        print(f"\n{'='*60}")
        print("LOOP TRIGGER VERIFICATION SUMMARY")
        print(f"{'='*60}")
        print(f"Error Threshold: {self.error_threshold}")
        print(f"Current Errors: {trigger_result['error_count']}")
        print(f"Should Trigger: {'YES' if trigger_result['should_trigger'] else 'NO'}")

        if "loop_execution" in trigger_result:
            exec_result = trigger_result["loop_execution"]
            print(f"Loop Executed: {'YES' if exec_result['executed'] else 'NO'}")
            if exec_result["executed"]:
                print(f"Wait Time: {exec_result['wait_time']} seconds")
                print(
                    f"Loop Count: {exec_result['initial_count']} → {exec_result['final_count']}"
                )

        return trigger_result


def main():
    tester = LoopTriggerTest()
    result = tester.run_comprehensive_test()

    # 結果をJSONで保存
    output_file = "loop_trigger_test_results.json"
    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\nTest results saved to: {output_file}")
    return result


if __name__ == "__main__":
    main()

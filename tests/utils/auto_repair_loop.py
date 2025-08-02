"""自動修復ループシステム

コンソールエラー検出後の自動修復アクション
- エラーパターン分析
- 自動修復推奨生成
- エージェントへのタスク割り当て
- 修復状況追跡
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/logs/auto_repair.log"
        ),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# 設定定数
ERROR_INPUT_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/errors.json"
)
REPAIR_OUTPUT_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/repair_tasks.json"
)
REPAIR_STATUS_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/repair_status.json"
)
REPAIR_HISTORY_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/repair_history.json"
)


class ErrorPatternAnalyzer:
    """エラーパターン分析器"""

    def __init__(self):
        self.repair_patterns = {
            "javascript_error": {
                "patterns": [
                    {
                        "error": "Cannot read property",
                        "solution": "Null/undefinedチェックを追加",
                        "code_fix": "obj && obj.propertyまたはobj?.propertyを使用",
                        "priority": "high",
                    },
                    {
                        "error": "is not a function",
                        "solution": "関数の存在確認とタイプチェック",
                        "code_fix": "typeof func === 'function' && func()",
                        "priority": "high",
                    },
                    {
                        "error": "Uncaught TypeError",
                        "solution": "型の不一致を解決",
                        "code_fix": "適切な型変換やバリデーションを追加",
                        "priority": "medium",
                    },
                ]
            },
            "react_error": {
                "patterns": [
                    {
                        "error": 'Warning: Each child in a list should have a unique "key" prop',
                        "solution": "Reactリスト要素にkeyプロプを追加",
                        "code_fix": "<div key={unique_id}>または{items.map((item, index) => <div key={item.id || index}>)}",
                        "priority": "medium",
                    },
                    {
                        "error": "Cannot update a component while rendering a different component",
                        "solution": "useEffectで状態更新をラップ",
                        "code_fix": "useEffect(() => { setState(newValue); }, [])",
                        "priority": "high",
                    },
                    {
                        "error": "Hook",
                        "solution": "React Hookの使用ルールを確認",
                        "code_fix": "Hookはコンポーネントのトップレベルでのみ使用",
                        "priority": "high",
                    },
                ]
            },
            "network_error": {
                "patterns": [
                    {
                        "error": "Failed to fetch",
                        "solution": "APIエンドポイントの確認とリトライ機能追加",
                        "code_fix": "try-catchでエラーハンドリング、自動リトライ機能",
                        "priority": "high",
                    },
                    {
                        "error": "404",
                        "solution": "APIルートの確認と修正",
                        "code_fix": "APIエンドポイントURLを確認し、正しいパスに修正",
                        "priority": "medium",
                    },
                    {
                        "error": "500",
                        "solution": "サーバーエラーの調査と修正",
                        "code_fix": "バックエンドログを確認し、エラー原因を特定",
                        "priority": "high",
                    },
                ]
            },
            "security_error": {
                "patterns": [
                    {
                        "error": "CORS",
                        "solution": "CORSポリシーの設定確認",
                        "code_fix": "サーバー側でAccess-Control-Allow-Originヘッダーを設定",
                        "priority": "high",
                    },
                    {
                        "error": "Content Security Policy",
                        "solution": "CSPポリシーの調整",
                        "code_fix": "CSPメタタグまたはヘッダーで許可するリソースを追加",
                        "priority": "medium",
                    },
                ]
            },
        }

    def analyze_error(self, error: Dict[str, Any]) -> Dict[str, Any]:
        """エラーを分析して修復推奨を生成

        Args:
            error: エラー情報

        Returns:
            修復推奨情報
        """
        error_type = error.get("type", "unknown_error")
        error_message = error.get("message", "")

        repair_suggestion = {
            "error_id": f"{error.get('timestamp', '')}_{hash(error_message) % 10000}",
            "original_error": error,
            "repair_type": "unknown",
            "solution": "手動でエラーを確認し、適切な修正を実施してください",
            "code_fix": "コードの確認とデバッグが必要です",
            "priority": error.get("severity", "medium"),
            "assign_to": error.get("assignTo", "ITSM-DevUI"),
            "estimated_effort": "medium",
            "test_needed": True,
        }

        # エラータイプに応じたパターンマッチング
        if error_type in self.repair_patterns:
            patterns = self.repair_patterns[error_type]["patterns"]

            for pattern in patterns:
                if pattern["error"].lower() in error_message.lower():
                    repair_suggestion.update(
                        {
                            "repair_type": "pattern_matched",
                            "solution": pattern["solution"],
                            "code_fix": pattern["code_fix"],
                            "priority": pattern["priority"],
                            "estimated_effort": self._estimate_effort(
                                pattern["priority"]
                            ),
                        }
                    )
                    break

        # ファイルパスで詳細な情報を追加
        if error.get("file"):
            repair_suggestion["target_file"] = error["file"]
            repair_suggestion["line_number"] = error.get("line", 0)

            # ファイル種類によるエージェント割り当ての精密化
            file_path = error["file"].lower()
            if any(ext in file_path for ext in [".tsx", ".jsx", ".ts", ".js"]):
                repair_suggestion["assign_to"] = "ITSM-DevUI"
                repair_suggestion["component_type"] = "frontend"
            elif any(path in file_path for path in ["/api/", "/backend/", ".py"]):
                repair_suggestion["assign_to"] = "ITSM-DevAPI"
                repair_suggestion["component_type"] = "backend"

        return repair_suggestion

    def _estimate_effort(self, priority: str) -> str:
        """優先度に基づいて作業量を推定

        Args:
            priority: 優先度

        Returns:
            作業量推定
        """
        effort_map = {"low": "small", "medium": "medium", "high": "large"}
        return effort_map.get(priority, "medium")


class AutoRepairLoop:
    """自動修復ループメインクラス"""

    def __init__(self):
        self.analyzer = ErrorPatternAnalyzer()
        self.repair_history: List[Dict[str, Any]] = []
        self.active_repairs: Dict[str, Dict[str, Any]] = {}

        # 出力ディレクトリを作成
        for file_path in [REPAIR_OUTPUT_FILE, REPAIR_STATUS_FILE, REPAIR_HISTORY_FILE]:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

    def process_errors(self) -> Dict[str, Any]:
        """エラーファイルを処理して修復タスクを生成

        Returns:
            処理結果
        """
        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "processed_errors": 0,
            "new_repair_tasks": 0,
            "updated_repair_tasks": 0,
            "errors": [],
        }

        try:
            # エラーファイルを読み込み
            if not os.path.exists(ERROR_INPUT_FILE):
                logger.info("エラーファイルが存在しません")
                return result

            with open(ERROR_INPUT_FILE, "r", encoding="utf-8") as f:
                error_data = json.load(f)

            errors = error_data.get("errors", [])
            result["processed_errors"] = len(errors)

            if not errors:
                logger.info("処理するエラーがありません")
                return result

            # 既存の修復タスクを読み込み
            existing_repairs = self._load_existing_repairs()

            # 各エラーを分析して修復タスクを生成
            new_repairs = []
            updated_repairs = 0

            for error in errors:
                try:
                    repair_suggestion = self.analyzer.analyze_error(error)
                    error_id = repair_suggestion["error_id"]

                    # 既存の修復タスクかチェック
                    if error_id in existing_repairs:
                        # 既存タスクを更新
                        existing_repairs[error_id].update(
                            {
                                "last_seen": datetime.now(timezone.utc).isoformat(),
                                "occurrence_count": existing_repairs[error_id].get(
                                    "occurrence_count", 1
                                )
                                + 1,
                            }
                        )
                        updated_repairs += 1
                    else:
                        # 新しい修復タスクを作成
                        repair_task = {
                            **repair_suggestion,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "status": "pending",
                            "occurrence_count": 1,
                            "last_seen": datetime.now(timezone.utc).isoformat(),
                        }
                        new_repairs.append(repair_task)
                        existing_repairs[error_id] = repair_task

                        logger.info(f"新しい修復タスクを作成: {error_id}")

                except Exception as e:
                    logger.error(f"エラー分析失敗: {e}")
                    result["errors"].append(str(e))

            result["new_repair_tasks"] = len(new_repairs)
            result["updated_repair_tasks"] = updated_repairs

            # 修復タスクを保存
            self._save_repair_tasks(existing_repairs)

            # エージェント別タスク割り当てを生成
            self._create_agent_assignments(existing_repairs)

            logger.info(
                f"修復タスク処理完了: 新規{len(new_repairs)}件、更新{updated_repairs}件"
            )

        except Exception as e:
            logger.error(f"エラー処理失敗: {e}")
            result["errors"].append(str(e))

        return result

    def _load_existing_repairs(self) -> Dict[str, Any]:
        """既存の修復タスクを読み込み

        Returns:
            修復タスク辞書
        """
        if not os.path.exists(REPAIR_OUTPUT_FILE):
            return {}

        try:
            with open(REPAIR_OUTPUT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            # タスクIDでインデックス化
            repairs = {}
            for task in data.get("repair_tasks", []):
                repairs[task["error_id"]] = task

            return repairs

        except Exception as e:
            logger.error(f"既存修復タスク読み込み失敗: {e}")
            return {}

    def _save_repair_tasks(self, repairs: Dict[str, Any]) -> None:
        """修復タスクを保存

        Args:
            repairs: 修復タスク辞書
        """
        try:
            # 優先度と作成日時でソート
            sorted_repairs = sorted(
                repairs.values(),
                key=lambda x: (
                    {"high": 0, "medium": 1, "low": 2}.get(
                        x.get("priority", "medium"), 1
                    ),
                    x.get("created_at", ""),
                ),
            )

            repair_data = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "total_tasks": len(sorted_repairs),
                "pending_tasks": len(
                    [r for r in sorted_repairs if r.get("status") == "pending"]
                ),
                "in_progress_tasks": len(
                    [r for r in sorted_repairs if r.get("status") == "in_progress"]
                ),
                "completed_tasks": len(
                    [r for r in sorted_repairs if r.get("status") == "completed"]
                ),
                "agent_summary": self._generate_agent_summary(sorted_repairs),
                "repair_tasks": sorted_repairs,
            }

            with open(REPAIR_OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(repair_data, f, indent=2, ensure_ascii=False)

            logger.info(f"修復タスク保存完了: {REPAIR_OUTPUT_FILE}")

        except Exception as e:
            logger.error(f"修復タスク保存失敗: {e}")

    def _generate_agent_summary(self, repairs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """エージェントごとのタスクサマリーを生成

        Args:
            repairs: 修復タスクリスト

        Returns:
            エージェントサマリー
        """
        summary = {
            "ITSM-DevUI": {
                "pending": 0,
                "in_progress": 0,
                "completed": 0,
                "high_priority": 0,
            },
            "ITSM-DevAPI": {
                "pending": 0,
                "in_progress": 0,
                "completed": 0,
                "high_priority": 0,
            },
        }

        for repair in repairs:
            agent = repair.get("assign_to", "ITSM-DevUI")
            status = repair.get("status", "pending")
            priority = repair.get("priority", "medium")

            if agent not in summary:
                summary[agent] = {
                    "pending": 0,
                    "in_progress": 0,
                    "completed": 0,
                    "high_priority": 0,
                }

            summary[agent][status] += 1
            if priority == "high":
                summary[agent]["high_priority"] += 1

        return summary

    def _create_agent_assignments(self, repairs: Dict[str, Any]) -> None:
        """エージェント別タスク割り当てファイルを作成

        Args:
            repairs: 修復タスク辞書
        """
        try:
            # エージェント別にタスクを分類
            agent_tasks = {"ITSM-DevUI": [], "ITSM-DevAPI": []}

            for repair in repairs.values():
                agent = repair.get("assign_to", "ITSM-DevUI")
                if agent not in agent_tasks:
                    agent_tasks[agent] = []

                agent_tasks[agent].append(repair)

            # エージェント別ファイルを作成
            for agent, tasks in agent_tasks.items():
                if not tasks:
                    continue

                # 優先度でソート
                sorted_tasks = sorted(
                    tasks,
                    key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(
                        x.get("priority", "medium"), 1
                    ),
                )

                agent_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/{agent.lower()}_repair_tasks.json"

                agent_data = {
                    "agent": agent,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "total_tasks": len(sorted_tasks),
                    "high_priority_tasks": len(
                        [t for t in sorted_tasks if t.get("priority") == "high"]
                    ),
                    "pending_tasks": len(
                        [t for t in sorted_tasks if t.get("status") == "pending"]
                    ),
                    "instructions": self._generate_agent_instructions(
                        agent, sorted_tasks
                    ),
                    "tasks": sorted_tasks,
                }

                with open(agent_file, "w", encoding="utf-8") as f:
                    json.dump(agent_data, f, indent=2, ensure_ascii=False)

                logger.info(f"{agent}のタスク割り当て保存: {len(sorted_tasks)}件")

        except Exception as e:
            logger.error(f"エージェント割り当て作成失敗: {e}")

    def _generate_agent_instructions(
        self, agent: str, tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """エージェント向けの指示を生成

        Args:
            agent: エージェント名
            tasks: タスクリスト

        Returns:
            指示情報
        """
        high_priority_tasks = [t for t in tasks if t.get("priority") == "high"]
        pending_tasks = [t for t in tasks if t.get("status") == "pending"]

        instructions = {
            "priority_order": [
                "重大エラーの修復を優先",
                "コード修正後にテストを実行",
                "修復完了後にステータスを更新",
            ],
            "immediate_actions": [],
            "testing_required": True,
            "estimated_total_effort": self._calculate_total_effort(tasks),
        }

        if high_priority_tasks:
            instructions["immediate_actions"].append(
                f"{len(high_priority_tasks)}件の重大エラーがあります。直ちに対応してください。"
            )

        if agent == "ITSM-DevUI":
            instructions["focus_areas"] = [
                "JavaScript/TypeScriptエラーの修正",
                "Reactコンポーネントの改善",
                "フロントエンドUI/UXの改善",
            ]
        else:  # ITSM-DevAPI
            instructions["focus_areas"] = [
                "APIエンドポイントの修正",
                "バックエンドロジックの改善",
                "データベースとサーバーの最適化",
            ]

        return instructions

    def _calculate_total_effort(self, tasks: List[Dict[str, Any]]) -> str:
        """総作業量を計算

        Args:
            tasks: タスクリスト

        Returns:
            作業量推定
        """
        effort_points = {"small": 1, "medium": 3, "large": 8}
        total_points = sum(
            effort_points.get(t.get("estimated_effort", "medium"), 3) for t in tasks
        )

        if total_points <= 5:
            return "small"
        elif total_points <= 15:
            return "medium"
        else:
            return "large"

    def update_repair_status(
        self, error_id: str, status: str, completion_notes: str = ""
    ) -> bool:
        """修復ステータスを更新

        Args:
            error_id: エラーID
            status: 新しいステータス
            completion_notes: 完了メモ

        Returns:
            更新成功かどうか
        """
        try:
            repairs = self._load_existing_repairs()

            if error_id not in repairs:
                logger.error(f"エラーIDが見つかりません: {error_id}")
                return False

            repairs[error_id]["status"] = status
            repairs[error_id]["updated_at"] = datetime.now(timezone.utc).isoformat()

            if completion_notes:
                repairs[error_id]["completion_notes"] = completion_notes

            if status == "completed":
                repairs[error_id]["completed_at"] = datetime.now(
                    timezone.utc
                ).isoformat()

            self._save_repair_tasks(repairs)
            logger.info(f"修復ステータス更新: {error_id} -> {status}")
            return True

        except Exception as e:
            logger.error(f"ステータス更新失敗: {e}")
            return False


def main():
    """メイン関数"""
    import argparse

    parser = argparse.ArgumentParser(description="自動修復ループシステム")
    parser.add_argument(
        "--process", action="store_true", help="エラーを処理して修復タスクを生成"
    )
    parser.add_argument(
        "--status",
        nargs=3,
        metavar=("ERROR_ID", "STATUS", "NOTES"),
        help="修復ステータスを更新",
    )

    args = parser.parse_args()

    repair_loop = AutoRepairLoop()

    if args.process:
        result = repair_loop.process_errors()
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.status:
        error_id, status, notes = args.status
        success = repair_loop.update_repair_status(error_id, status, notes)
        print(f"ステータス更新: {'success' if success else 'failed'}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

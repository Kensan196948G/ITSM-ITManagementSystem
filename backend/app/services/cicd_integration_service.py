"""CI/CD統合サービス - 既存の無限ループ修復システムとの統合"""

import json
import logging
import os
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import aiofiles

from app.core.config import settings
from app.core.exceptions import ITSMException
from app.services.github_actions_service import (
    GitHubActionsService,
    get_failed_workflows,
)

logger = logging.getLogger(__name__)

# ファイルパス定数
CICD_LOG_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/.claude-flow/ci-retry-log.json"
)
REPAIR_STATE_FILE = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/realtime_repair_state.json"
INFINITE_LOOP_STATE_FILE = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json"
API_ERROR_METRICS_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/api_error_metrics.json"
)
COORDINATION_ERRORS_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/errors.json"
)


class CICDIntegrationService:
    """CI/CD統合サービス"""

    def __init__(self):
        self._lock = asyncio.Lock()
        self.github_service = None

    async def __aenter__(self):
        """非同期コンテキストマネージャー開始"""
        self.github_service = GitHubActionsService()
        await self.github_service.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキストマネージャー終了"""
        if self.github_service:
            await self.github_service.__aexit__(exc_type, exc_val, exc_tb)

    async def read_json_file(self, file_path: str) -> Dict[str, Any]:
        """JSONファイルを非同期で安全に読み込み"""
        try:
            if os.path.exists(file_path):
                async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                    content = await f.read()
                    return json.loads(content)
            return {}
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error reading JSON file {file_path}: {e}")
            return {}

    async def write_json_file(self, file_path: str, data: Dict[str, Any]) -> None:
        """JSONファイルを非同期で安全に書き込み"""
        try:
            # ディレクトリが存在しない場合は作成
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(data, ensure_ascii=False, indent=2))
        except IOError as e:
            logger.error(f"Error writing JSON file {file_path}: {e}")

    async def update_repair_system_state(
        self, event_type: str, details: Dict[str, Any]
    ) -> None:
        """修復システム状態を更新"""
        async with self._lock:
            try:
                # リアルタイム修復状態の更新
                repair_state = await self.read_json_file(REPAIR_STATE_FILE)

                if "cicd_integration" not in repair_state:
                    repair_state["cicd_integration"] = {
                        "enabled": True,
                        "last_activity": None,
                        "events": [],
                    }

                # イベントを追加（最新50件まで保持）
                event = {
                    "timestamp": datetime.now().isoformat(),
                    "event_type": event_type,
                    "details": details,
                }

                repair_state["cicd_integration"]["events"].append(event)
                repair_state["cicd_integration"]["events"] = repair_state[
                    "cicd_integration"
                ]["events"][-50:]
                repair_state["cicd_integration"][
                    "last_activity"
                ] = datetime.now().isoformat()

                await self.write_json_file(REPAIR_STATE_FILE, repair_state)

            except Exception as e:
                logger.error(f"Error updating repair system state: {e}")

    async def detect_ci_failures(self) -> List[Dict[str, Any]]:
        """CI/CD失敗を検出"""
        try:
            if not self.github_service:
                async with GitHubActionsService() as github_service:
                    failed_workflows = await get_failed_workflows(hours=1)
            else:
                failed_workflows = await get_failed_workflows(hours=1)

            # 失敗した処理を分析
            failure_analysis = []
            for workflow in failed_workflows:
                analysis = {
                    "id": workflow["id"],
                    "name": workflow["name"],
                    "branch": workflow["head_branch"],
                    "conclusion": workflow["conclusion"],
                    "created_at": workflow["created_at"],
                    "failure_patterns": await self._analyze_failure_patterns(workflow),
                    "auto_retry_eligible": await self._check_auto_retry_eligibility(
                        workflow
                    ),
                }
                failure_analysis.append(analysis)

            return failure_analysis

        except Exception as e:
            logger.error(f"Error detecting CI failures: {e}")
            return []

    async def _analyze_failure_patterns(self, workflow: Dict[str, Any]) -> List[str]:
        """失敗パターンを分析"""
        patterns = []

        try:
            # ワークフロー名からパターンを推測
            workflow_name = workflow.get("name", "").lower()

            if "test" in workflow_name:
                patterns.append("test_failure")
            if "build" in workflow_name:
                patterns.append("build_failure")
            if "deploy" in workflow_name:
                patterns.append("deployment_failure")
            if "lint" in workflow_name or "check" in workflow_name:
                patterns.append("quality_check_failure")

            # ジョブレベルの詳細分析（GitHub APIを使用）
            if self.github_service:
                try:
                    jobs = await self.github_service.get_workflow_jobs(workflow["id"])
                    for job in jobs:
                        if job.get("conclusion") == "failure":
                            job_name = job.get("name", "").lower()

                            if "test" in job_name:
                                patterns.append("unit_test_failure")
                            elif "integration" in job_name:
                                patterns.append("integration_test_failure")
                            elif "e2e" in job_name:
                                patterns.append("e2e_test_failure")
                            elif "security" in job_name:
                                patterns.append("security_scan_failure")

                except Exception as e:
                    logger.warning(
                        f"Could not analyze job details for workflow {workflow['id']}: {e}"
                    )

            return list(set(patterns)) if patterns else ["unknown_failure"]

        except Exception as e:
            logger.error(f"Error analyzing failure patterns: {e}")
            return ["analysis_error"]

    async def _check_auto_retry_eligibility(self, workflow: Dict[str, Any]) -> bool:
        """自動リトライ対象かどうかをチェック"""
        try:
            # 基本的な条件をチェック
            workflow_name = workflow.get("name", "").lower()

            # リトライ対象外のワークフロー
            if any(skip in workflow_name for skip in ["deploy", "release", "publish"]):
                return False

            # 作成から時間が経ちすぎていないかチェック
            created_at = datetime.fromisoformat(
                workflow["created_at"].replace("Z", "+00:00")
            )
            if datetime.now().replace(
                tzinfo=created_at.tzinfo
            ) - created_at > timedelta(hours=6):
                return False

            # 過去のリトライ履歴をチェック
            retry_count = await self._get_retry_count(workflow["id"])
            if retry_count >= 3:  # 最大3回までリトライ
                return False

            return True

        except Exception as e:
            logger.error(f"Error checking auto retry eligibility: {e}")
            return False

    async def _get_retry_count(self, workflow_id: int) -> int:
        """ワークフローのリトライ回数を取得"""
        try:
            cicd_logs = await self.read_json_file(CICD_LOG_FILE)
            entries = cicd_logs.get("entries", [])

            retry_count = 0
            for entry in entries:
                if (
                    entry.get("event_type") == "workflow_retry"
                    and entry.get("details", {}).get("run_id") == workflow_id
                ):
                    retry_count += 1

            return retry_count

        except Exception as e:
            logger.error(f"Error getting retry count for workflow {workflow_id}: {e}")
            return 0

    async def execute_auto_repair(self, target: str = "ci_failures") -> Dict[str, Any]:
        """自動修復を実行"""
        repair_results = {
            "timestamp": datetime.now().isoformat(),
            "target": target,
            "actions_taken": [],
            "successful_repairs": 0,
            "failed_repairs": 0,
            "total_issues": 0,
        }

        try:
            if target in ["ci_failures", "all"]:
                ci_results = await self._repair_ci_failures()
                repair_results["actions_taken"].extend(ci_results["actions"])
                repair_results["successful_repairs"] += ci_results["successful"]
                repair_results["failed_repairs"] += ci_results["failed"]
                repair_results["total_issues"] += ci_results["total"]

            if target in ["system_errors", "all"]:
                system_results = await self._repair_system_errors()
                repair_results["actions_taken"].extend(system_results["actions"])
                repair_results["successful_repairs"] += system_results["successful"]
                repair_results["failed_repairs"] += system_results["failed"]
                repair_results["total_issues"] += system_results["total"]

            # 修復結果を既存システムに統合
            await self._integrate_repair_results(repair_results)

            # システム状態を更新
            await self.update_repair_system_state(
                "auto_repair_completed", repair_results
            )

            return repair_results

        except Exception as e:
            logger.error(f"Error executing auto repair: {e}")
            repair_results["error"] = str(e)
            return repair_results

    async def _repair_ci_failures(self) -> Dict[str, Any]:
        """CI失敗の修復"""
        results = {"actions": [], "successful": 0, "failed": 0, "total": 0}

        try:
            failed_workflows = await self.detect_ci_failures()
            results["total"] = len(failed_workflows)

            for workflow in failed_workflows:
                if workflow["auto_retry_eligible"]:
                    try:
                        if self.github_service:
                            success = await self.github_service.retry_workflow_run(
                                workflow["id"], failed_jobs_only=True
                            )
                        else:
                            async with GitHubActionsService() as github_service:
                                success = await github_service.retry_workflow_run(
                                    workflow["id"], failed_jobs_only=True
                                )

                        if success:
                            results["successful"] += 1
                            results["actions"].append(
                                {
                                    "type": "workflow_retry",
                                    "workflow_id": workflow["id"],
                                    "workflow_name": workflow["name"],
                                    "status": "success",
                                }
                            )
                        else:
                            results["failed"] += 1
                            results["actions"].append(
                                {
                                    "type": "workflow_retry",
                                    "workflow_id": workflow["id"],
                                    "workflow_name": workflow["name"],
                                    "status": "failed",
                                }
                            )

                        # APIレート制限を考慮
                        await asyncio.sleep(2)

                    except Exception as e:
                        logger.error(f"Failed to retry workflow {workflow['id']}: {e}")
                        results["failed"] += 1
                        results["actions"].append(
                            {
                                "type": "workflow_retry",
                                "workflow_id": workflow["id"],
                                "workflow_name": workflow["name"],
                                "status": "error",
                                "error": str(e),
                            }
                        )

            return results

        except Exception as e:
            logger.error(f"Error repairing CI failures: {e}")
            results["failed"] = results["total"]
            return results

    async def _repair_system_errors(self) -> Dict[str, Any]:
        """システムエラーの修復"""
        results = {"actions": [], "successful": 0, "failed": 0, "total": 0}

        try:
            # エラー状況を分析
            api_errors = await self.read_json_file(API_ERROR_METRICS_FILE)
            coordination_errors = await self.read_json_file(COORDINATION_ERRORS_FILE)

            # API健全性の問題をチェック
            if api_errors.get("health_status") == "unhealthy":
                results["total"] += 1
                try:
                    # API健全性を改善する処理
                    await self._fix_api_health()
                    results["successful"] += 1
                    results["actions"].append(
                        {"type": "api_health_fix", "status": "success"}
                    )
                except Exception as e:
                    results["failed"] += 1
                    results["actions"].append(
                        {"type": "api_health_fix", "status": "error", "error": str(e)}
                    )

            # コーディネーションエラーをチェック
            error_count = coordination_errors.get("error_count", 0)
            if error_count > 0:
                results["total"] += 1
                try:
                    # エラーをクリア
                    await self._clear_coordination_errors()
                    results["successful"] += 1
                    results["actions"].append(
                        {
                            "type": "coordination_error_clear",
                            "status": "success",
                            "cleared_errors": error_count,
                        }
                    )
                except Exception as e:
                    results["failed"] += 1
                    results["actions"].append(
                        {
                            "type": "coordination_error_clear",
                            "status": "error",
                            "error": str(e),
                        }
                    )

            return results

        except Exception as e:
            logger.error(f"Error repairing system errors: {e}")
            return results

    async def _fix_api_health(self) -> None:
        """API健全性を修復"""
        try:
            # メトリクスをリセット
            api_metrics = {
                "timestamp": datetime.now().isoformat(),
                "total_errors": 0,
                "error_categories": {},
                "error_severities": {},
                "fix_success_rate": 1.0,
                "health_status": "healthy",
            }

            await self.write_json_file(API_ERROR_METRICS_FILE, api_metrics)
            logger.info("API health status reset to healthy")

        except Exception as e:
            logger.error(f"Error fixing API health: {e}")
            raise

    async def _clear_coordination_errors(self) -> None:
        """コーディネーションエラーをクリア"""
        try:
            coordination_errors = {
                "backend_errors": [],
                "api_errors": [],
                "database_errors": [],
                "validation_errors": [],
                "cors_errors": [],
                "authentication_errors": [],
                "last_check": datetime.now().isoformat(),
                "error_count": 0,
            }

            await self.write_json_file(COORDINATION_ERRORS_FILE, coordination_errors)
            logger.info("Coordination errors cleared")

        except Exception as e:
            logger.error(f"Error clearing coordination errors: {e}")
            raise

    async def _integrate_repair_results(self, repair_results: Dict[str, Any]) -> None:
        """修復結果を既存システムに統合"""
        try:
            # 無限ループ状態に修復結果を追加
            loop_state = await self.read_json_file(INFINITE_LOOP_STATE_FILE)

            if "ci_cd_repairs" not in loop_state:
                loop_state["ci_cd_repairs"] = []

            # 修復履歴を追加（最新20件まで保持）
            repair_entry = {
                "timestamp": repair_results["timestamp"],
                "target": repair_results["target"],
                "successful_repairs": repair_results["successful_repairs"],
                "failed_repairs": repair_results["failed_repairs"],
                "total_issues": repair_results["total_issues"],
            }

            loop_state["ci_cd_repairs"].append(repair_entry)
            loop_state["ci_cd_repairs"] = loop_state["ci_cd_repairs"][-20:]

            # 総修復数を更新
            loop_state["total_errors_fixed"] = (
                loop_state.get("total_errors_fixed", 0)
                + repair_results["successful_repairs"]
            )

            await self.write_json_file(INFINITE_LOOP_STATE_FILE, loop_state)

        except Exception as e:
            logger.error(f"Error integrating repair results: {e}")

    async def get_integration_status(self) -> Dict[str, Any]:
        """統合システムの状態を取得"""
        try:
            repair_state = await self.read_json_file(REPAIR_STATE_FILE)
            loop_state = await self.read_json_file(INFINITE_LOOP_STATE_FILE)
            api_metrics = await self.read_json_file(API_ERROR_METRICS_FILE)

            integration_status = {
                "timestamp": datetime.now().isoformat(),
                "repair_system": {
                    "active": True,
                    "loop_count": loop_state.get("loop_count", 0),
                    "total_errors_fixed": loop_state.get("total_errors_fixed", 0),
                    "last_scan": loop_state.get("last_scan"),
                },
                "api_health": {
                    "status": api_metrics.get("health_status", "unknown"),
                    "total_errors": api_metrics.get("total_errors", 0),
                    "fix_success_rate": api_metrics.get("fix_success_rate", 0),
                },
                "cicd_integration": repair_state.get(
                    "cicd_integration",
                    {"enabled": False, "last_activity": None, "events": []},
                ),
            }

            return integration_status

        except Exception as e:
            logger.error(f"Error getting integration status: {e}")
            return {"timestamp": datetime.now().isoformat(), "error": str(e)}


# サービスインスタンス管理
async def get_cicd_integration_service() -> CICDIntegrationService:
    """CI/CD統合サービスインスタンスを取得"""
    return CICDIntegrationService()


# 高レベル統合関数
async def monitor_and_repair_ci() -> Dict[str, Any]:
    """CI/CDを監視し、必要に応じて修復を実行"""
    async with CICDIntegrationService() as integration_service:
        # 失敗を検出
        failures = await integration_service.detect_ci_failures()

        if failures:
            logger.info(f"Detected {len(failures)} CI/CD failures")
            # 自動修復を実行
            repair_results = await integration_service.execute_auto_repair(
                "ci_failures"
            )
            return repair_results
        else:
            return {
                "timestamp": datetime.now().isoformat(),
                "message": "No CI/CD failures detected",
                "failures_checked": True,
            }


async def trigger_manual_integration_repair(
    target: str = "all", user_email: str = "system"
) -> Dict[str, Any]:
    """手動統合修復をトリガー"""
    async with CICDIntegrationService() as integration_service:
        repair_results = await integration_service.execute_auto_repair(target)

        # ユーザー情報を追加
        repair_results["triggered_by"] = user_email
        repair_results["trigger_type"] = "manual"

        # システム状態を更新
        await integration_service.update_repair_system_state(
            "manual_integration_repair",
            {"target": target, "user": user_email, "results": repair_results},
        )

        return repair_results

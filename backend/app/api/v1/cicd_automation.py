"""CI/CD自動修復API"""

import json
import logging
import os
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.core.exceptions import ITSMException
from app.core.cicd_security import (
    verify_api_authentication,
    check_ci_permissions,
    check_rate_limit_middleware,
    security_manager,
)
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ci", tags=["ci-cd-automation"])

# GitHub APIクライアント設定
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_BASE = "https://api.github.com"
GITHUB_REPO = os.getenv("GITHUB_REPOSITORY", "user/repository")

# ファイルパス定数
CICD_LOG_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/.claude-flow/ci-retry-log.json"
)
REPAIR_STATE_FILE = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/realtime_repair_state.json"
INFINITE_LOOP_STATE_FILE = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json"
API_ERROR_METRICS_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/api_error_metrics.json"
)


# データモデル
class CIWorkflowStatus(BaseModel):
    """CI/CDワークフロー状態"""

    id: int
    name: str
    status: str  # queued, in_progress, completed, cancelled, failure
    conclusion: Optional[str] = (
        None  # success, failure, neutral, cancelled, skipped, timed_out, action_required
    )
    workflow_id: int
    head_branch: str
    head_sha: str
    created_at: str
    updated_at: str
    run_number: int
    url: str


class CIRetryRequest(BaseModel):
    """CI/CDリトライリクエスト"""

    run_id: int
    retry_type: str = Field(
        default="failed_jobs", description="リトライタイプ: failed_jobs, all_jobs"
    )
    reason: Optional[str] = Field(default=None, description="リトライ理由")


class CILogEntry(BaseModel):
    """CI/CDログエントリ"""

    timestamp: str
    event_type: str
    workflow_name: str
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None


class CISystemStatus(BaseModel):
    """CI/CDシステム状態"""

    timestamp: str
    system_health: str
    active_workflows: int
    repair_system_status: str
    infinite_loop_count: int
    api_health: str
    recent_repairs: List[Dict[str, Any]]


# ユーティリティ関数
async def get_github_headers() -> Dict[str, str]:
    """GitHub API用ヘッダーを取得"""
    if not GITHUB_TOKEN:
        raise ITSMException(
            status_code=500,
            error_code="GITHUB_TOKEN_MISSING",
            message="GitHub APIトークンが設定されていません",
        )

    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "ITSM-DevAPI/1.0",
    }


async def load_json_file(file_path: str) -> Dict[str, Any]:
    """JSONファイルを安全に読み込み"""
    try:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading JSON file {file_path}: {e}")
        return {}


async def save_json_file(file_path: str, data: Dict[str, Any]) -> None:
    """JSONファイルを安全に保存"""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving JSON file {file_path}: {e}")


async def log_cicd_event(
    event_type: str,
    workflow_name: str,
    status: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """CI/CDイベントをログに記録"""
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "workflow_name": workflow_name,
            "status": status,
            "message": message,
            "details": details or {},
        }

        # 既存ログを読み込み
        logs = await load_json_file(CICD_LOG_FILE)
        if "entries" not in logs:
            logs["entries"] = []

        # 新しいエントリを追加（最新100件まで保持）
        logs["entries"].append(log_entry)
        logs["entries"] = logs["entries"][-100:]
        logs["last_updated"] = datetime.now().isoformat()

        # ログファイルに保存
        await save_json_file(CICD_LOG_FILE, logs)

    except Exception as e:
        logger.error(f"Error logging CI/CD event: {e}")


# API エンドポイント
@router.get("/status", response_model=List[CIWorkflowStatus])
async def get_ci_status(
    limit: int = 10,
    branch: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """CI/CDワークフロー状態を取得"""
    try:
        headers = await get_github_headers()

        # GitHub Actions APIからワークフロー実行状況を取得
        params = {"per_page": limit, "page": 1}

        if branch:
            params["branch"] = branch
        if status:
            params["status"] = status

        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/actions/runs"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)

            if response.status_code == 401:
                raise ITSMException(
                    status_code=401,
                    error_code="GITHUB_AUTH_FAILED",
                    message="GitHub API認証に失敗しました",
                )
            elif response.status_code != 200:
                raise ITSMException(
                    status_code=502,
                    error_code="GITHUB_API_ERROR",
                    message=f"GitHub API呼び出しエラー: {response.status_code}",
                )

            data = response.json()
            workflows = []

            for run in data.get("workflow_runs", []):
                workflow = CIWorkflowStatus(
                    id=run["id"],
                    name=run["name"],
                    status=run["status"],
                    conclusion=run.get("conclusion"),
                    workflow_id=run["workflow_id"],
                    head_branch=run["head_branch"],
                    head_sha=run["head_sha"],
                    created_at=run["created_at"],
                    updated_at=run["updated_at"],
                    run_number=run["run_number"],
                    url=run["html_url"],
                )
                workflows.append(workflow)

            # ログ記録
            await log_cicd_event(
                "status_check",
                "multiple",
                "success",
                f"取得した実行数: {len(workflows)}",
                {"limit": limit, "branch": branch, "status": status},
            )

            return workflows

    except ITSMException:
        raise
    except Exception as e:
        logger.error(f"Error getting CI status: {e}")
        raise ITSMException(
            status_code=500,
            error_code="CI_STATUS_ERROR",
            message="CI/CD状態の取得に失敗しました",
            details={"error": str(e)},
        )


@router.post("/retry")
async def retry_ci_workflow(
    retry_request: CIRetryRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """CI/CDワークフローをリトライ"""
    try:
        headers = await get_github_headers()

        # GitHub Actions APIでワークフローをリトライ
        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/actions/runs/{retry_request.run_id}/rerun"

        if retry_request.retry_type == "failed_jobs":
            url += "-failed-jobs"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers)

            if response.status_code == 401:
                raise ITSMException(
                    status_code=401,
                    error_code="GITHUB_AUTH_FAILED",
                    message="GitHub API認証に失敗しました",
                )
            elif response.status_code == 403:
                raise ITSMException(
                    status_code=403,
                    error_code="GITHUB_PERMISSION_DENIED",
                    message="ワークフローリトライの権限がありません",
                )
            elif response.status_code not in [201, 204]:
                raise ITSMException(
                    status_code=502,
                    error_code="GITHUB_RETRY_FAILED",
                    message=f"ワークフローリトライに失敗: {response.status_code}",
                )

        # バックグラウンドでログ記録
        background_tasks.add_task(
            log_cicd_event,
            "workflow_retry",
            f"run_{retry_request.run_id}",
            "initiated",
            f"ワークフローリトライを開始: {retry_request.retry_type}",
            {
                "run_id": retry_request.run_id,
                "retry_type": retry_request.retry_type,
                "reason": retry_request.reason,
                "user": current_user.email,
            },
        )

        return {
            "status": "success",
            "message": "ワークフローリトライを開始しました",
            "run_id": retry_request.run_id,
            "retry_type": retry_request.retry_type,
            "timestamp": datetime.now().isoformat(),
        }

    except ITSMException:
        raise
    except Exception as e:
        logger.error(f"Error retrying CI workflow: {e}")
        raise ITSMException(
            status_code=500,
            error_code="CI_RETRY_ERROR",
            message="ワークフローリトライに失敗しました",
            details={"error": str(e)},
        )


@router.get("/logs")
async def get_ci_logs(
    limit: int = 50,
    event_type: Optional[str] = None,
    workflow_name: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """CI/CDログを取得"""
    try:
        logs = await load_json_file(CICD_LOG_FILE)
        entries = logs.get("entries", [])

        # フィルタリング
        if event_type:
            entries = [e for e in entries if e.get("event_type") == event_type]
        if workflow_name:
            entries = [e for e in entries if e.get("workflow_name") == workflow_name]
        if status:
            entries = [e for e in entries if e.get("status") == status]

        # 最新のエントリから指定件数を取得
        entries = sorted(entries, key=lambda x: x.get("timestamp", ""), reverse=True)[
            :limit
        ]

        return {
            "status": "success",
            "logs": entries,
            "total_count": len(entries),
            "last_updated": logs.get("last_updated"),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting CI logs: {e}")
        raise ITSMException(
            status_code=500,
            error_code="CI_LOGS_ERROR",
            message="CI/CDログの取得に失敗しました",
            details={"error": str(e)},
        )


@router.get("/system-status", response_model=CISystemStatus)
async def get_system_status(current_user: User = Depends(get_current_user)):
    """CI/CDシステム全体の状態を取得"""
    try:
        # 各種状態ファイルから情報を収集
        repair_state = await load_json_file(REPAIR_STATE_FILE)
        loop_state = await load_json_file(INFINITE_LOOP_STATE_FILE)
        api_metrics = await load_json_file(API_ERROR_METRICS_FILE)

        # GitHub Actions API からアクティブなワークフロー数を取得
        active_workflows = 0
        try:
            headers = await get_github_headers()
            url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/actions/runs"
            params = {"status": "in_progress", "per_page": 100}

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    active_workflows = len(data.get("workflow_runs", []))
        except Exception as e:
            logger.warning(f"Could not fetch active workflows: {e}")

        # システム健全性を判定
        system_health = "healthy"
        if api_metrics.get("health_status") == "unhealthy":
            system_health = "degraded"
        if loop_state.get("loop_count", 0) > 150:
            system_health = "critical"

        # 最近の修復履歴を取得
        recent_repairs = loop_state.get("repair_history", [])[-10:]

        status = CISystemStatus(
            timestamp=datetime.now().isoformat(),
            system_health=system_health,
            active_workflows=active_workflows,
            repair_system_status=repair_state.get("state", {}).get("status", "unknown"),
            infinite_loop_count=loop_state.get("loop_count", 0),
            api_health=api_metrics.get("health_status", "unknown"),
            recent_repairs=recent_repairs,
        )

        return status

    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise ITSMException(
            status_code=500,
            error_code="SYSTEM_STATUS_ERROR",
            message="システム状態の取得に失敗しました",
            details={"error": str(e)},
        )


@router.post("/trigger-repair")
async def trigger_auto_repair(
    background_tasks: BackgroundTasks,
    target: str = "all",
    priority: str = "medium",
    current_user: User = Depends(get_current_user),
):
    """自動修復を手動トリガー"""
    try:
        # 修復システムとの統合（既存の無限ループ修復システムを活用）
        repair_command = {
            "action": "manual_trigger",
            "target": target,
            "priority": priority,
            "user": current_user.email,
            "timestamp": datetime.now().isoformat(),
        }

        # 修復状態ファイルを更新
        repair_state = await load_json_file(REPAIR_STATE_FILE)
        if "manual_triggers" not in repair_state:
            repair_state["manual_triggers"] = []

        repair_state["manual_triggers"].append(repair_command)
        repair_state["last_manual_trigger"] = datetime.now().isoformat()

        await save_json_file(REPAIR_STATE_FILE, repair_state)

        # バックグラウンドでログ記録
        background_tasks.add_task(
            log_cicd_event,
            "manual_repair_trigger",
            "system",
            "initiated",
            f"手動修復トリガー: {target}",
            repair_command,
        )

        return {
            "status": "success",
            "message": "自動修復を開始しました",
            "target": target,
            "priority": priority,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error triggering auto repair: {e}")
        raise ITSMException(
            status_code=500,
            error_code="AUTO_REPAIR_TRIGGER_ERROR",
            message="自動修復のトリガーに失敗しました",
            details={"error": str(e)},
        )


@router.get("/health")
async def ci_health_check():
    """CI/CDシステムのヘルスチェック"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {},
            "checks": {},
        }

        # GitHub API接続確認
        try:
            headers = await get_github_headers()
            url = f"{GITHUB_API_BASE}/rate_limit"

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    rate_limit = response.json()
                    health_status["components"]["github_api"] = {
                        "status": "healthy",
                        "rate_limit": rate_limit["rate"],
                    }
                else:
                    health_status["components"]["github_api"] = {
                        "status": "unhealthy",
                        "error": f"HTTP {response.status_code}",
                    }
                    health_status["status"] = "degraded"
        except Exception as e:
            health_status["components"]["github_api"] = {
                "status": "unhealthy",
                "error": str(e),
            }
            health_status["status"] = "degraded"

        # ファイルシステム確認
        required_files = [CICD_LOG_FILE, REPAIR_STATE_FILE, INFINITE_LOOP_STATE_FILE]
        for file_path in required_files:
            file_name = os.path.basename(file_path)
            try:
                if os.path.exists(file_path):
                    health_status["components"][f"file_{file_name}"] = {
                        "status": "healthy"
                    }
                else:
                    health_status["components"][f"file_{file_name}"] = {
                        "status": "missing"
                    }
                    health_status["status"] = "degraded"
            except Exception as e:
                health_status["components"][f"file_{file_name}"] = {
                    "status": "error",
                    "error": str(e),
                }
                health_status["status"] = "unhealthy"

        return health_status

    except Exception as e:
        logger.error(f"Error in CI health check: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
        }


# Prometheus メトリクス用エンドポイント
@router.get("/metrics")
async def get_ci_metrics():
    """Prometheus形式のメトリクスを取得"""
    try:
        # 各種メトリクスを収集
        api_metrics = await load_json_file(API_ERROR_METRICS_FILE)
        loop_state = await load_json_file(INFINITE_LOOP_STATE_FILE)
        logs = await load_json_file(CICD_LOG_FILE)

        # Prometheus形式でメトリクスを出力
        metrics = []

        # API エラーメトリクス
        metrics.append(f"itsm_api_total_errors {api_metrics.get('total_errors', 0)}")
        metrics.append(
            f"itsm_api_fix_success_rate {api_metrics.get('fix_success_rate', 0)}"
        )

        # 無限ループ修復メトリクス
        metrics.append(f"itsm_repair_loop_count {loop_state.get('loop_count', 0)}")
        metrics.append(
            f"itsm_repair_total_errors_fixed {loop_state.get('total_errors_fixed', 0)}"
        )

        # CI/CD ログメトリクス
        log_entries = logs.get("entries", [])
        success_count = len([e for e in log_entries if e.get("status") == "success"])
        error_count = len([e for e in log_entries if e.get("status") == "error"])

        metrics.append(f"itsm_cicd_log_success_count {success_count}")
        metrics.append(f"itsm_cicd_log_error_count {error_count}")

        return {
            "metrics": "\n".join(metrics),
            "timestamp": datetime.now().isoformat(),
            "format": "prometheus",
        }

    except Exception as e:
        logger.error(f"Error getting CI metrics: {e}")
        raise ITSMException(
            status_code=500,
            error_code="CI_METRICS_ERROR",
            message="メトリクスの取得に失敗しました",
            details={"error": str(e)},
        )

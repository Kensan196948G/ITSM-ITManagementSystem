"""GitHub Actions統合サービス"""

import json
import logging
import os
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import ITSMException

logger = logging.getLogger(__name__)

# GitHub API設定
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_BASE = "https://api.github.com"
GITHUB_REPO = os.getenv("GITHUB_REPOSITORY", "user/repository")

# レート制限設定
RATE_LIMIT_REQUESTS = 5000  # GitHub API制限
RATE_LIMIT_WINDOW = 3600    # 1時間


class GitHubActionsService:
    """GitHub Actions API統合サービス"""
    
    def __init__(self):
        self.client = None
        self.rate_limit_remaining = RATE_LIMIT_REQUESTS
        self.rate_limit_reset = datetime.now() + timedelta(seconds=RATE_LIMIT_WINDOW)
        self._lock = asyncio.Lock()
    
    async def __aenter__(self):
        """非同期コンテキストマネージャー開始"""
        if not GITHUB_TOKEN:
            raise ITSMException(
                status_code=500,
                error_code="GITHUB_TOKEN_MISSING",
                message="GitHub APIトークンが設定されていません"
            )
        
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Authorization": f"token {GITHUB_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "ITSM-DevAPI/1.0"
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキストマネージャー終了"""
        if self.client:
            await self.client.aclose()
    
    async def check_rate_limit(self) -> bool:
        """レート制限をチェック"""
        async with self._lock:
            now = datetime.now()
            
            # レート制限リセット時刻を過ぎていれば更新
            if now >= self.rate_limit_reset:
                self.rate_limit_remaining = RATE_LIMIT_REQUESTS
                self.rate_limit_reset = now + timedelta(seconds=RATE_LIMIT_WINDOW)
            
            return self.rate_limit_remaining > 0
    
    async def update_rate_limit(self, headers: Dict[str, str]) -> None:
        """レスポンスヘッダーからレート制限情報を更新"""
        async with self._lock:
            try:
                if "X-RateLimit-Remaining" in headers:
                    self.rate_limit_remaining = int(headers["X-RateLimit-Remaining"])
                
                if "X-RateLimit-Reset" in headers:
                    reset_timestamp = int(headers["X-RateLimit-Reset"])
                    self.rate_limit_reset = datetime.fromtimestamp(reset_timestamp)
                    
            except (ValueError, KeyError) as e:
                logger.warning(f"Failed to parse rate limit headers: {e}")
    
    async def make_api_request(self, method: str, endpoint: str, 
                             params: Optional[Dict] = None, 
                             data: Optional[Dict] = None) -> Tuple[int, Dict]:
        """GitHub API リクエストを実行"""
        if not await self.check_rate_limit():
            raise ITSMException(
                status_code=429,
                error_code="GITHUB_RATE_LIMIT_EXCEEDED",
                message="GitHub APIのレート制限に達しました"
            )
        
        url = f"{GITHUB_API_BASE}{endpoint}"
        
        try:
            response = await self.client.request(
                method=method,
                url=url,
                params=params,
                json=data
            )
            
            # レート制限情報を更新
            await self.update_rate_limit(dict(response.headers))
            
            # レスポンスの処理
            response_data = {}
            if response.content:
                try:
                    response_data = response.json()
                except json.JSONDecodeError:
                    response_data = {"raw_content": response.text}
            
            return response.status_code, response_data
            
        except httpx.TimeoutException:
            raise ITSMException(
                status_code=504,
                error_code="GITHUB_API_TIMEOUT",
                message="GitHub APIリクエストがタイムアウトしました"
            )
        except httpx.RequestError as e:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_API_CONNECTION_ERROR",
                message=f"GitHub API接続エラー: {str(e)}"
            )
    
    async def get_workflow_runs(self, branch: Optional[str] = None, 
                              status: Optional[str] = None, 
                              limit: int = 30) -> List[Dict[str, Any]]:
        """ワークフロー実行履歴を取得"""
        params = {
            "per_page": min(limit, 100),  # GitHub APIの上限
            "page": 1
        }
        
        if branch:
            params["branch"] = branch
        if status:
            params["status"] = status
        
        status_code, data = await self.make_api_request(
            "GET", 
            f"/repos/{GITHUB_REPO}/actions/runs",
            params=params
        )
        
        if status_code == 200:
            return data.get("workflow_runs", [])
        elif status_code == 401:
            raise ITSMException(
                status_code=401,
                error_code="GITHUB_AUTH_FAILED",
                message="GitHub API認証に失敗しました"
            )
        elif status_code == 404:
            raise ITSMException(
                status_code=404,
                error_code="GITHUB_REPO_NOT_FOUND",
                message="指定されたリポジトリが見つかりません"
            )
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_API_ERROR",
                message=f"GitHub API呼び出しエラー: {status_code}"
            )
    
    async def get_workflow_run(self, run_id: int) -> Dict[str, Any]:
        """特定のワークフロー実行を取得"""
        status_code, data = await self.make_api_request(
            "GET",
            f"/repos/{GITHUB_REPO}/actions/runs/{run_id}"
        )
        
        if status_code == 200:
            return data
        elif status_code == 404:
            raise ITSMException(
                status_code=404,
                error_code="WORKFLOW_RUN_NOT_FOUND",
                message=f"ワークフロー実行 {run_id} が見つかりません"
            )
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_API_ERROR",
                message=f"ワークフロー実行取得エラー: {status_code}"
            )
    
    async def retry_workflow_run(self, run_id: int, failed_jobs_only: bool = True) -> bool:
        """ワークフロー実行をリトライ"""
        endpoint = f"/repos/{GITHUB_REPO}/actions/runs/{run_id}/rerun"
        if failed_jobs_only:
            endpoint += "-failed-jobs"
        
        status_code, data = await self.make_api_request("POST", endpoint)
        
        if status_code in [201, 204]:
            return True
        elif status_code == 403:
            raise ITSMException(
                status_code=403,
                error_code="GITHUB_PERMISSION_DENIED",
                message="ワークフローリトライの権限がありません"
            )
        elif status_code == 404:
            raise ITSMException(
                status_code=404,
                error_code="WORKFLOW_RUN_NOT_FOUND",
                message=f"ワークフロー実行 {run_id} が見つかりません"
            )
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_RETRY_FAILED",
                message=f"ワークフローリトライに失敗: {status_code}"
            )
    
    async def get_workflow_jobs(self, run_id: int) -> List[Dict[str, Any]]:
        """ワークフロー実行のジョブ一覧を取得"""
        status_code, data = await self.make_api_request(
            "GET",
            f"/repos/{GITHUB_REPO}/actions/runs/{run_id}/jobs"
        )
        
        if status_code == 200:
            return data.get("jobs", [])
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_API_ERROR",
                message=f"ワークフロージョブ取得エラー: {status_code}"
            )
    
    async def get_job_logs(self, job_id: int) -> str:
        """ジョブのログを取得"""
        status_code, data = await self.make_api_request(
            "GET",
            f"/repos/{GITHUB_REPO}/actions/jobs/{job_id}/logs"
        )
        
        if status_code == 200:
            return data.get("raw_content", "")
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_API_ERROR",
                message=f"ジョブログ取得エラー: {status_code}"
            )
    
    async def get_rate_limit_status(self) -> Dict[str, Any]:
        """現在のレート制限状況を取得"""
        status_code, data = await self.make_api_request("GET", "/rate_limit")
        
        if status_code == 200:
            return data
        else:
            return {
                "rate": {
                    "limit": RATE_LIMIT_REQUESTS,
                    "remaining": self.rate_limit_remaining,
                    "reset": int(self.rate_limit_reset.timestamp())
                }
            }
    
    async def cancel_workflow_run(self, run_id: int) -> bool:
        """ワークフロー実行をキャンセル"""
        status_code, data = await self.make_api_request(
            "POST",
            f"/repos/{GITHUB_REPO}/actions/runs/{run_id}/cancel"
        )
        
        if status_code in [202, 204]:
            return True
        elif status_code == 409:
            # 既にキャンセル済みまたは完了済み
            return False
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_CANCEL_FAILED",
                message=f"ワークフローキャンセルに失敗: {status_code}"
            )
    
    async def get_repository_workflows(self) -> List[Dict[str, Any]]:
        """リポジトリのワークフロー一覧を取得"""
        status_code, data = await self.make_api_request(
            "GET",
            f"/repos/{GITHUB_REPO}/actions/workflows"
        )
        
        if status_code == 200:
            return data.get("workflows", [])
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_API_ERROR",
                message=f"ワークフロー一覧取得エラー: {status_code}"
            )
    
    async def trigger_workflow_dispatch(self, workflow_id: int, 
                                      ref: str = "main", 
                                      inputs: Optional[Dict[str, Any]] = None) -> bool:
        """ワークフローを手動トリガー"""
        data = {
            "ref": ref,
            "inputs": inputs or {}
        }
        
        status_code, response_data = await self.make_api_request(
            "POST",
            f"/repos/{GITHUB_REPO}/actions/workflows/{workflow_id}/dispatches",
            data=data
        )
        
        if status_code == 204:
            return True
        elif status_code == 422:
            raise ITSMException(
                status_code=422,
                error_code="WORKFLOW_DISPATCH_INVALID",
                message="ワークフロートリガーのパラメータが無効です"
            )
        else:
            raise ITSMException(
                status_code=502,
                error_code="GITHUB_DISPATCH_FAILED",
                message=f"ワークフロートリガーに失敗: {status_code}"
            )


# グローバルサービスインスタンス（シングルトン）
_github_service_instance = None

async def get_github_service() -> GitHubActionsService:
    """GitHub Actions サービスインスタンスを取得"""
    global _github_service_instance
    if _github_service_instance is None:
        _github_service_instance = GitHubActionsService()
    return _github_service_instance


# 高レベル統合関数
async def get_failed_workflows(hours: int = 24) -> List[Dict[str, Any]]:
    """過去N時間の失敗したワークフローを取得"""
    async with GitHubActionsService() as github_service:
        all_runs = await github_service.get_workflow_runs(limit=100)
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        failed_runs = []
        
        for run in all_runs:
            run_time = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
            if (run_time >= cutoff_time and 
                run["status"] == "completed" and 
                run["conclusion"] == "failure"):
                failed_runs.append(run)
        
        return failed_runs


async def auto_retry_failed_workflows(max_retries: int = 3) -> List[Dict[str, Any]]:
    """失敗したワークフローを自動的にリトライ"""
    failed_workflows = await get_failed_workflows(hours=1)  # 過去1時間
    retry_results = []
    
    async with GitHubActionsService() as github_service:
        for workflow in failed_workflows:
            try:
                run_id = workflow["id"]
                
                # リトライ履歴をチェック（実装は省略）
                # ここで過去のリトライ回数を確認
                
                success = await github_service.retry_workflow_run(run_id)
                retry_results.append({
                    "run_id": run_id,
                    "workflow_name": workflow["name"],
                    "retry_success": success,
                    "timestamp": datetime.now().isoformat()
                })
                
                # APIレート制限を考慮して少し待機
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Failed to retry workflow {workflow['id']}: {e}")
                retry_results.append({
                    "run_id": workflow["id"],
                    "workflow_name": workflow["name"],
                    "retry_success": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
    
    return retry_results
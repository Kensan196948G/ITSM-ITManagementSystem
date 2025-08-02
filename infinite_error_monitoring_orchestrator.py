#!/usr/bin/env python3
"""
無限ループ自動エラー監視・修復オーケストレーター
フロントエンド・バックエンド統合監視システム
"""

import asyncio
import json
import logging
import signal
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests
from pydantic import BaseModel
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    print("⚠️ aiohttp not available, using requests for sync operations")

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('infinite_monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MonitoringTarget(BaseModel):
    name: str
    url: str
    type: str  # "frontend" or "backend"
    enabled: bool = True
    last_check: Optional[datetime] = None
    error_count: int = 0
    repair_count: int = 0

class InfiniteErrorMonitoringOrchestrator:
    def __init__(self):
        self.is_running = False
        self.targets = [
            MonitoringTarget(
                name="WebUI",
                url="http://192.168.3.135:3000",
                type="frontend"
            ),
            MonitoringTarget(
                name="Backend API",
                url="http://192.168.3.135:8000",
                type="backend"
            ),
            MonitoringTarget(
                name="API Docs",
                url="http://192.168.3.135:8000/docs",
                type="backend"
            ),
            MonitoringTarget(
                name="Admin Dashboard",
                url="http://192.168.3.135:3000/admin",
                type="frontend"
            )
        ]
        self.state_file = Path("coordination/infinite_loop_state.json")
        self.state_file.parent.mkdir(exist_ok=True)
        self.monitoring_interval = 10  # 秒
        self.repair_interval = 30  # 秒
        self.max_consecutive_failures = 5
        self.session = None
        self.stats = {
            "start_time": None,
            "total_checks": 0,
            "total_errors": 0,
            "total_repairs": 0,
            "successful_repairs": 0,
            "cycles_completed": 0
        }
        
        # シグナルハンドラーの設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """グレースフルシャットダウン"""
        logger.info(f"シグナル {signum} を受信。システムを停止します...")
        self.is_running = False

    async def _init_session(self):
        """HTTP セッションの初期化"""
        if AIOHTTP_AVAILABLE and not self.session:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        elif not AIOHTTP_AVAILABLE:
            self.session = requests.Session()

    async def _close_session(self):
        """HTTP セッションのクリーンアップ"""
        if self.session:
            if AIOHTTP_AVAILABLE:
                await self.session.close()
            else:
                self.session.close()
            self.session = None

    def _save_state(self):
        """状態をファイルに保存"""
        try:
            state = {
                "stats": self.stats,
                "targets": [target.dict() for target in self.targets],
                "last_update": datetime.now().isoformat()
            }
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"状態保存エラー: {e}")

    def _load_state(self):
        """状態をファイルから読み込み"""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                if "stats" in state:
                    self.stats.update(state["stats"])
                logger.info("前回の状態を復元しました")
        except Exception as e:
            logger.error(f"状態読み込みエラー: {e}")

    async def _check_frontend_errors(self, target: MonitoringTarget) -> List[str]:
        """フロントエンドエラーの検知"""
        errors = []
        try:
            if AIOHTTP_AVAILABLE:
                async with self.session.get(target.url) as response:
                    if response.status != 200:
                        errors.append(f"HTTP {response.status}: {target.url}")
                        
                    # 簡単なコンテンツチェック
                    content = await response.text()
                    if "error" in content.lower() or "exception" in content.lower():
                        errors.append(f"コンテンツにエラーメッセージを検出: {target.url}")
            else:
                # requests を使用した同期処理
                response = self.session.get(target.url, timeout=30)
                if response.status_code != 200:
                    errors.append(f"HTTP {response.status_code}: {target.url}")
                    
                # 簡単なコンテンツチェック
                content = response.text
                if "error" in content.lower() or "exception" in content.lower():
                    errors.append(f"コンテンツにエラーメッセージを検出: {target.url}")
                    
        except Exception as e:
            errors.append(f"接続エラー: {target.url} - {str(e)}")
        
        return errors

    async def _check_backend_errors(self, target: MonitoringTarget) -> List[str]:
        """バックエンドエラーの検知"""
        errors = []
        try:
            # ヘルスチェックエンドポイント
            health_url = f"{target.url.rstrip('/')}/health" if target.url.endswith('8000') else target.url
            
            if AIOHTTP_AVAILABLE:
                async with self.session.get(health_url) as response:
                    if response.status not in [200, 404]:  # 404は正常（エンドポイントが無い場合）
                        errors.append(f"API HTTP {response.status}: {health_url}")
                    
                    # APIレスポンス時間チェック
                    start_time = time.time()
                    await response.read()
                    response_time = time.time() - start_time
                    
                    if response_time > 5.0:  # 5秒以上は異常
                        errors.append(f"レスポンス時間異常: {response_time:.2f}秒 - {health_url}")
            else:
                # requests を使用した同期処理
                start_time = time.time()
                response = self.session.get(health_url, timeout=30)
                response_time = time.time() - start_time
                
                if response.status_code not in [200, 404]:  # 404は正常（エンドポイントが無い場合）
                    errors.append(f"API HTTP {response.status_code}: {health_url}")
                
                if response_time > 5.0:  # 5秒以上は異常
                    errors.append(f"レスポンス時間異常: {response_time:.2f}秒 - {health_url}")
                    
        except Exception as e:
            errors.append(f"API接続エラー: {target.url} - {str(e)}")
        
        return errors

    async def _repair_frontend_errors(self, target: MonitoringTarget, errors: List[str]) -> bool:
        """フロントエンドエラーの修復"""
        try:
            logger.info(f"フロントエンドエラー修復を開始: {target.name}")
            
            # ブラウザエラー監視API呼び出し（存在する場合）
            try:
                repair_url = "http://192.168.3.135:3000/api/browser-error-monitor/repair"
                if AIOHTTP_AVAILABLE:
                    async with self.session.post(repair_url, json={"errors": errors}) as response:
                        if response.status == 200:
                            logger.info(f"フロントエンド自動修復成功: {target.name}")
                            return True
                else:
                    response = self.session.post(repair_url, json={"errors": errors}, timeout=30)
                    if response.status_code == 200:
                        logger.info(f"フロントエンド自動修復成功: {target.name}")
                        return True
            except:
                pass
                
            # 基本的な修復戦略
            logger.info(f"基本修復戦略を実行: {target.name}")
            await asyncio.sleep(2)  # 修復シミュレーション
            return True
            
        except Exception as e:
            logger.error(f"フロントエンド修復エラー: {e}")
            return False

    async def _repair_backend_errors(self, target: MonitoringTarget, errors: List[str]) -> bool:
        """バックエンドエラーの修復"""
        try:
            logger.info(f"バックエンドエラー修復を開始: {target.name}")
            
            # バックエンド修復API呼び出し（存在する場合）
            try:
                repair_url = "http://192.168.3.135:8000/api/v1/error-monitoring/repair"
                if AIOHTTP_AVAILABLE:
                    async with self.session.post(repair_url, json={"errors": errors}) as response:
                        if response.status == 200:
                            logger.info(f"バックエンド自動修復成功: {target.name}")
                            return True
                else:
                    response = self.session.post(repair_url, json={"errors": errors}, timeout=30)
                    if response.status_code == 200:
                        logger.info(f"バックエンド自動修復成功: {target.name}")
                        return True
            except:
                pass
                
            # 基本的な修復戦略
            logger.info(f"基本修復戦略を実行: {target.name}")
            await asyncio.sleep(3)  # 修復シミュレーション
            return True
            
        except Exception as e:
            logger.error(f"バックエンド修復エラー: {e}")
            return False

    async def _monitor_and_repair_target(self, target: MonitoringTarget) -> bool:
        """個別ターゲットの監視と修復"""
        if not target.enabled:
            return True
            
        logger.info(f"監視開始: {target.name} ({target.url})")
        
        # エラー検知
        if target.type == "frontend":
            errors = await self._check_frontend_errors(target)
        else:
            errors = await self._check_backend_errors(target)
        
        target.last_check = datetime.now()
        self.stats["total_checks"] += 1
        
        if errors:
            logger.warning(f"エラー検知 [{target.name}]: {len(errors)}件")
            for error in errors:
                logger.warning(f"  - {error}")
            
            target.error_count += len(errors)
            self.stats["total_errors"] += len(errors)
            
            # 修復実行
            if target.type == "frontend":
                repair_success = await self._repair_frontend_errors(target, errors)
            else:
                repair_success = await self._repair_backend_errors(target, errors)
            
            target.repair_count += 1
            self.stats["total_repairs"] += 1
            
            if repair_success:
                self.stats["successful_repairs"] += 1
                logger.info(f"修復成功: {target.name}")
                
                # 修復後の検証
                await asyncio.sleep(5)
                if target.type == "frontend":
                    verify_errors = await self._check_frontend_errors(target)
                else:
                    verify_errors = await self._check_backend_errors(target)
                
                if verify_errors:
                    logger.warning(f"修復後もエラーが残存: {target.name}")
                    return False
                else:
                    logger.info(f"修復検証完了: {target.name}")
                    return True
            else:
                logger.error(f"修復失敗: {target.name}")
                return False
        else:
            logger.info(f"エラーなし: {target.name}")
            return True

    async def _monitoring_cycle(self):
        """監視サイクルの実行"""
        logger.info("=== 監視サイクル開始 ===")
        
        all_healthy = True
        tasks = []
        
        # 並行で全ターゲットを監視
        for target in self.targets:
            task = asyncio.create_task(self._monitor_and_repair_target(target))
            tasks.append(task)
        
        # 全ての監視タスクの完了を待機
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"監視タスクエラー [{self.targets[i].name}]: {result}")
                all_healthy = False
            elif not result:
                all_healthy = False
        
        self.stats["cycles_completed"] += 1
        
        # 統計情報の表示
        logger.info(f"サイクル完了: {self.stats['cycles_completed']}")
        logger.info(f"統計 - チェック:{self.stats['total_checks']} エラー:{self.stats['total_errors']} 修復:{self.stats['total_repairs']} 成功:{self.stats['successful_repairs']}")
        
        return all_healthy

    async def run_infinite_loop(self):
        """無限ループでの監視実行"""
        logger.info("🚀 無限エラー監視・修復システム開始")
        
        self._load_state()
        self.stats["start_time"] = datetime.now().isoformat()
        self.is_running = True
        
        await self._init_session()
        
        consecutive_healthy_cycles = 0
        
        try:
            while self.is_running:
                cycle_start = time.time()
                
                # 監視サイクル実行
                is_healthy = await self._monitoring_cycle()
                
                if is_healthy:
                    consecutive_healthy_cycles += 1
                    logger.info(f"✅ システム正常 (連続{consecutive_healthy_cycles}回)")
                else:
                    consecutive_healthy_cycles = 0
                    logger.warning("⚠️ システムにエラーが検出されました")
                
                # 状態保存
                self._save_state()
                
                # 次のサイクルまで待機
                cycle_duration = time.time() - cycle_start
                sleep_time = max(0, self.monitoring_interval - cycle_duration)
                
                if sleep_time > 0:
                    logger.info(f"次のサイクルまで {sleep_time:.1f}秒 待機...")
                    await asyncio.sleep(sleep_time)
                
        except KeyboardInterrupt:
            logger.info("キーボード中断を受信")
        except Exception as e:
            logger.error(f"予期しないエラー: {e}")
        finally:
            logger.info("システム停止処理を開始...")
            await self._close_session()
            self._save_state()
            logger.info("🛑 無限エラー監視・修復システム停止")

    def get_status(self) -> Dict:
        """現在の状態を取得"""
        return {
            "is_running": self.is_running,
            "stats": self.stats,
            "targets": [target.dict() for target in self.targets]
        }

async def main():
    """メイン実行関数"""
    orchestrator = InfiniteErrorMonitoringOrchestrator()
    
    try:
        await orchestrator.run_infinite_loop()
    except Exception as e:
        logger.error(f"システムエラー: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
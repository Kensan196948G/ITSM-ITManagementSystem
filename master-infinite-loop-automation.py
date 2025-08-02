#!/usr/bin/env python3
"""
ITSM 無限ループ自動化マスターコントローラー
WebUIとバックエンドAPIの統合エラー検知・修復システム
"""

import asyncio
import json
import subprocess
import time
import os
import logging
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import threading
import queue
import aiohttp
import psutil

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('master-infinite-loop.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MasterInfiniteLoopController:
    """ITSMシステム全体の無限ループ自動化コントローラー"""
    
    def __init__(self):
        self.base_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem")
        self.frontend_dir = self.base_dir / "frontend"
        self.backend_dir = self.base_dir / "backend"
        
        # システム設定
        self.config = {
            "monitoring_interval": 300,  # 5分
            "max_consecutive_failures": 5,
            "emergency_repair_threshold": 3,
            "auto_restart_services": True,
            "webui_url": "http://192.168.3.135:3000",
            "api_url": "http://192.168.3.135:8000",
            "admin_url": "http://192.168.3.135:3000/admin",
            "api_docs_url": "http://192.168.3.135:8000/docs"
        }
        
        # 状態管理
        self.state = {
            "is_running": False,
            "start_time": None,
            "last_check_time": None,
            "total_cycles": 0,
            "consecutive_failures": 0,
            "webui_status": "unknown",
            "api_status": "unknown",
            "processes": {},
            "error_counts": {
                "webui": 0,
                "api": 0,
                "critical": 0
            }
        }
        
        # プロセス管理
        self.processes = {}
        self.event_queue = queue.Queue()
        self.shutdown_event = threading.Event()
        
        # 状態ファイル
        self.state_file = self.base_dir / "master-infinite-loop-state.json"
        
        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"シグナル {signum} を受信しました。システムを停止します...")
        self.shutdown_event.set()
        self.stop_monitoring()
        sys.exit(0)
    
    def load_state(self):
        """状態をファイルから読み込み"""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    saved_state = json.load(f)
                    self.state.update(saved_state)
                logger.info("状態ファイルから設定を読み込みました")
        except Exception as e:
            logger.warning(f"状態ファイル読み込みエラー: {e}")
    
    def save_state(self):
        """状態をファイルに保存"""
        try:
            # 状態の更新
            self.state["last_check_time"] = datetime.now().isoformat()
            
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(self.state, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"状態ファイル保存エラー: {e}")
    
    async def check_service_health(self, url: str, service_name: str) -> Dict[str, Any]:
        """サービスの健全性チェック"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                start_time = time.time()
                async with session.get(url) as response:
                    response_time = time.time() - start_time
                    
                    return {
                        "service": service_name,
                        "status": "healthy" if response.status == 200 else "unhealthy",
                        "status_code": response.status,
                        "response_time": response_time,
                        "url": url,
                        "timestamp": datetime.now().isoformat()
                    }
        except Exception as e:
            logger.error(f"{service_name} ヘルスチェック失敗: {e}")
            return {
                "service": service_name,
                "status": "error",
                "error": str(e),
                "url": url,
                "timestamp": datetime.now().isoformat()
            }
    
    async def run_webui_monitoring(self) -> Dict[str, Any]:
        """WebUI監視実行"""
        try:
            logger.info("WebUI監視を開始...")
            
            # WebUIモニター実行
            script_path = self.frontend_dir / "run-comprehensive-webui-monitoring.sh"
            if not script_path.exists():
                logger.error("WebUI監視スクリプトが見つかりません")
                return {"status": "error", "message": "監視スクリプト不存在"}
            
            # 実行権限設定
            os.chmod(script_path, 0o755)
            
            process = await asyncio.create_subprocess_exec(
                str(script_path),
                "--api-only",  # API専用モード
                cwd=str(self.frontend_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
            
            if process.returncode == 0:
                logger.info("WebUI監視が正常に完了しました")
                return {
                    "status": "success",
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode()
                }
            else:
                logger.error(f"WebUI監視でエラーが発生: {stderr.decode()}")
                return {
                    "status": "error",
                    "returncode": process.returncode,
                    "stderr": stderr.decode()
                }
                
        except asyncio.TimeoutError:
            logger.error("WebUI監視がタイムアウトしました")
            return {"status": "timeout", "message": "監視タイムアウト"}
        except Exception as e:
            logger.error(f"WebUI監視実行エラー: {e}")
            return {"status": "error", "message": str(e)}
    
    async def run_api_monitoring(self) -> Dict[str, Any]:
        """API監視実行"""
        try:
            logger.info("API監視を開始...")
            
            # API統合監視開始
            async with aiohttp.ClientSession() as session:
                api_url = f"{self.config['api_url']}/error-monitor/integrated-monitoring/start"
                params = {
                    "monitoring_interval": 5,
                    "auto_repair": "true",
                    "enhanced_mode": "true"
                }
                
                async with session.post(api_url, params=params) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("API監視が正常に開始されました")
                        return {"status": "success", "data": result}
                    else:
                        error_text = await response.text()
                        logger.error(f"API監視開始エラー: {error_text}")
                        return {"status": "error", "message": error_text}
                        
        except Exception as e:
            logger.error(f"API監視実行エラー: {e}")
            return {"status": "error", "message": str(e)}
    
    async def perform_emergency_repair(self) -> Dict[str, Any]:
        """緊急修復実行"""
        logger.warning("緊急修復を実行します...")
        
        repair_results = []
        
        # WebUI緊急修復
        try:
            script_path = self.frontend_dir / "run-comprehensive-webui-monitoring.sh"
            if script_path.exists():
                process = await asyncio.create_subprocess_exec(
                    str(script_path),
                    "--emergency-repair",
                    cwd=str(self.frontend_dir),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=600)
                repair_results.append({
                    "component": "webui",
                    "status": "success" if process.returncode == 0 else "error",
                    "output": stdout.decode()
                })
        except Exception as e:
            repair_results.append({
                "component": "webui",
                "status": "error",
                "error": str(e)
            })
        
        # API緊急修復
        try:
            async with aiohttp.ClientSession() as session:
                api_url = f"{self.config['api_url']}/error-monitor/emergency-repair"
                async with session.post(api_url) as response:
                    if response.status == 200:
                        result = await response.json()
                        repair_results.append({
                            "component": "api",
                            "status": "success",
                            "data": result
                        })
                    else:
                        repair_results.append({
                            "component": "api",
                            "status": "error",
                            "message": await response.text()
                        })
        except Exception as e:
            repair_results.append({
                "component": "api",
                "status": "error",
                "error": str(e)
            })
        
        return {"repair_results": repair_results}
    
    async def generate_comprehensive_report(self) -> Dict[str, Any]:
        """包括的レポート生成"""
        try:
            # WebUIレポート取得
            webui_report = None
            try:
                async with aiohttp.ClientSession() as session:
                    # WebUIマスターコントローラーからレポート取得（仮のエンドポイント）
                    webui_url = f"{self.config['webui_url']}/api/monitoring/report"
                    async with session.get(webui_url) as response:
                        if response.status == 200:
                            webui_report = await response.json()
            except:
                pass
            
            # APIレポート取得
            api_report = None
            try:
                async with aiohttp.ClientSession() as session:
                    api_url = f"{self.config['api_url']}/error-monitor/comprehensive-dashboard"
                    async with session.get(api_url) as response:
                        if response.status == 200:
                            api_report = await response.json()
            except:
                pass
            
            # 統合レポート生成
            comprehensive_report = {
                "timestamp": datetime.now().isoformat(),
                "system_overview": {
                    "total_cycles": self.state["total_cycles"],
                    "uptime": self._calculate_uptime(),
                    "consecutive_failures": self.state["consecutive_failures"],
                    "error_counts": self.state["error_counts"]
                },
                "service_status": {
                    "webui": self.state["webui_status"],
                    "api": self.state["api_status"]
                },
                "webui_report": webui_report,
                "api_report": api_report,
                "recommendations": self._generate_recommendations()
            }
            
            # レポートファイル保存
            report_file = self.base_dir / f"master-comprehensive-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(comprehensive_report, f, ensure_ascii=False, indent=2)
            
            logger.info(f"包括的レポートを生成しました: {report_file}")
            return comprehensive_report
            
        except Exception as e:
            logger.error(f"レポート生成エラー: {e}")
            return {"error": str(e)}
    
    def _calculate_uptime(self) -> str:
        """稼働時間計算"""
        if self.state["start_time"]:
            start = datetime.fromisoformat(self.state["start_time"])
            uptime = datetime.now() - start
            return str(uptime)
        return "0:00:00"
    
    def _generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        recommendations = []
        
        if self.state["consecutive_failures"] > 2:
            recommendations.append("連続失敗が多いため、システム設定の見直しを推奨します")
        
        if self.state["error_counts"]["critical"] > 0:
            recommendations.append("重要なエラーが検出されています。緊急対応が必要です")
        
        if self.state["webui_status"] == "unhealthy":
            recommendations.append("WebUIの健全性チェックが失敗しています")
        
        if self.state["api_status"] == "unhealthy":
            recommendations.append("APIの健全性チェックが失敗しています")
        
        return recommendations
    
    async def monitoring_cycle(self):
        """監視サイクル実行"""
        try:
            logger.info(f"監視サイクル #{self.state['total_cycles'] + 1} を開始...")
            
            # 健全性チェック
            webui_health = await self.check_service_health(self.config["webui_url"], "webui")
            api_health = await self.check_service_health(self.config["api_url"], "api")
            
            self.state["webui_status"] = webui_health["status"]
            self.state["api_status"] = api_health["status"]
            
            # エラー検知・修復
            tasks = []
            
            # WebUI監視実行
            if webui_health["status"] != "error":
                tasks.append(self.run_webui_monitoring())
            
            # API監視実行
            if api_health["status"] != "error":
                tasks.append(self.run_api_monitoring())
            
            # 並列実行
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # 結果評価
                success_count = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "success")
                
                if success_count > 0:
                    self.state["consecutive_failures"] = 0
                    logger.info(f"監視サイクル完了: {success_count}/{len(results)} 成功")
                else:
                    self.state["consecutive_failures"] += 1
                    logger.warning(f"監視サイクル失敗: 連続失敗回数 {self.state['consecutive_failures']}")
            
            # 緊急修復判定
            if self.state["consecutive_failures"] >= self.config["emergency_repair_threshold"]:
                await self.perform_emergency_repair()
                self.state["consecutive_failures"] = 0
            
            self.state["total_cycles"] += 1
            
        except Exception as e:
            logger.error(f"監視サイクルエラー: {e}")
            self.state["consecutive_failures"] += 1
    
    async def start_monitoring(self):
        """監視開始"""
        logger.info("ITSM無限ループ自動化システムを開始します...")
        
        self.state["is_running"] = True
        self.state["start_time"] = datetime.now().isoformat()
        
        try:
            while not self.shutdown_event.is_set():
                await self.monitoring_cycle()
                self.save_state()
                
                # 次のサイクルまで待機
                for _ in range(self.config["monitoring_interval"]):
                    if self.shutdown_event.is_set():
                        break
                    await asyncio.sleep(1)
                    
        except KeyboardInterrupt:
            logger.info("キーボード割り込みを受信しました")
        except Exception as e:
            logger.error(f"監視実行エラー: {e}")
        finally:
            self.stop_monitoring()
    
    def stop_monitoring(self):
        """監視停止"""
        logger.info("監視を停止しています...")
        self.state["is_running"] = False
        self.shutdown_event.set()
        
        # プロセス終了
        for name, process in self.processes.items():
            try:
                if process.poll() is None:
                    process.terminate()
                    logger.info(f"プロセス {name} を終了しました")
            except Exception as e:
                logger.error(f"プロセス {name} 終了エラー: {e}")
        
        self.save_state()
        logger.info("監視システムが停止しました")
    
    def get_status(self) -> Dict[str, Any]:
        """システム状態取得"""
        return {
            "status": self.state,
            "config": self.config,
            "uptime": self._calculate_uptime(),
            "recommendations": self._generate_recommendations(),
            "timestamp": datetime.now().isoformat()
        }

async def main():
    """メイン関数"""
    controller = MasterInfiniteLoopController()
    controller.load_state()
    
    # コマンドライン引数処理
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "status":
            status = controller.get_status()
            print(json.dumps(status, ensure_ascii=False, indent=2))
            return
        elif command == "stop":
            controller.stop_monitoring()
            return
        elif command == "report":
            report = await controller.generate_comprehensive_report()
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return
    
    # 監視開始
    await controller.start_monitoring()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n監視システムを停止しました")
    except Exception as e:
        print(f"システムエラー: {e}")
        sys.exit(1)
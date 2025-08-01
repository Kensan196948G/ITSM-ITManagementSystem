#!/usr/bin/env python3
"""
軽量エラー監視システム
外部依存を最小限にしたフロントエンド・バックエンドエラー監視
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import subprocess
import os
import sys
import traceback
from dataclasses import dataclass, asdict
import urllib.request
import urllib.error
import socket

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/error_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ErrorInfo:
    """エラー情報クラス"""
    timestamp: str
    type: str
    level: str
    message: str
    source: str
    url: Optional[str] = None
    details: Optional[str] = None

@dataclass
class SystemStatus:
    """システム状態クラス"""
    timestamp: str
    frontend_errors: int
    backend_errors: int
    api_errors: int
    network_errors: int
    total_errors: int
    pages_checked: int
    api_endpoints_checked: int
    last_check_duration: float
    status: str

class SimpleErrorMonitor:
    """軽量エラー検知・監視システム"""
    
    def __init__(self):
        self.base_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination")
        self.errors_file = self.base_path / "errors.json"
        self.status_file = self.base_path / "error_status.json"
        self.fixes_file = self.base_path / "fixes.json"
        
        # 監視対象URL
        self.frontend_base_url = "http://192.168.3.135:3000"
        self.backend_base_url = "http://192.168.3.135:8081"
        
        # 監視対象ページ
        self.frontend_pages = [
            "/",
            "/incidents", 
            "/problems",
            "/changes",
            "/cmdb",
            "/reports",
            "/analytics",
            "/settings",
            "/login",
            "/dashboard"
        ]
        
        # 監視対象APIエンドポイント
        self.api_endpoints = [
            "/api/health",
            "/api/incidents",
            "/api/problems", 
            "/api/changes",
            "/api/cmdb/cis",
            "/api/users",
            "/api/categories",
            "/api/reports"
        ]
        
        self.consecutive_clean_checks = 0
        self.required_clean_checks = 3

    def check_url_accessibility(self, url: str, timeout: int = 10) -> Tuple[bool, Optional[str], Optional[str]]:
        """URLのアクセス可能性をチェック"""
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'ITSM-Monitor/1.0')
            
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status_code = response.getcode()
                content = response.read().decode('utf-8', errors='ignore')
                
                if status_code == 200:
                    return True, None, content
                else:
                    return False, f"HTTP {status_code}", content
                    
        except urllib.error.HTTPError as e:
            return False, f"HTTP {e.code}: {e.reason}", None
        except urllib.error.URLError as e:
            return False, f"URL Error: {str(e.reason)}", None
        except socket.timeout:
            return False, "Timeout", None
        except Exception as e:
            return False, f"Unexpected error: {str(e)}", None

    def check_frontend_pages(self) -> List[ErrorInfo]:
        """フロントエンドページをチェック"""
        errors = []
        pages_checked = 0
        
        for page_path in self.frontend_pages:
            try:
                url = f"{self.frontend_base_url}{page_path}"
                logger.info(f"フロントエンドチェック中: {url}")
                
                is_accessible, error_msg, content = self.check_url_accessibility(url)
                pages_checked += 1
                
                if not is_accessible:
                    errors.append(ErrorInfo(
                        timestamp=datetime.now().isoformat(),
                        type="frontend_access_error",
                        level="error",
                        message=f"ページアクセスエラー: {error_msg}",
                        source="frontend",
                        url=url,
                        details=error_msg
                    ))
                elif content:
                    # HTML内容をチェック
                    content_lower = content.lower()
                    
                    # エラーメッセージを検索
                    error_patterns = [
                        "error",
                        "exception", 
                        "uncaught",
                        "failed to compile",
                        "module not found",
                        "cannot read property",
                        "undefined is not a function",
                        "typeerror",
                        "referenceerror",
                        "syntaxerror"
                    ]
                    
                    for pattern in error_patterns:
                        if pattern in content_lower:
                            errors.append(ErrorInfo(
                                timestamp=datetime.now().isoformat(),
                                type="frontend_content_error",
                                level="warning",
                                message=f"ページ内容にエラーパターンを発見: {pattern}",
                                source="frontend",
                                url=url,
                                details=f"Pattern: {pattern}"
                            ))
                            break
                    
                    # React/Material-UIエラーをチェック
                    if "react" in content_lower and ("warning" in content_lower or "error" in content_lower):
                        errors.append(ErrorInfo(
                            timestamp=datetime.now().isoformat(),
                            type="react_error",
                            level="warning",
                            message="React関連のエラー/警告を検出",
                            source="frontend",
                            url=url,
                            details="React error/warning detected in page content"
                        ))
                
                time.sleep(0.5)  # レート制限
                
            except Exception as e:
                logger.error(f"フロントエンドページチェックエラー {url}: {e}")
                errors.append(ErrorInfo(
                    timestamp=datetime.now().isoformat(),
                    type="frontend_check_error",
                    level="error",
                    message=f"ページチェック中にエラー: {str(e)}",
                    source="frontend",
                    url=url,
                    details=traceback.format_exc()
                ))
        
        return errors, pages_checked

    def check_api_endpoints(self) -> Tuple[List[ErrorInfo], int]:
        """APIエンドポイントをチェック"""
        errors = []
        endpoints_checked = 0
        
        for endpoint in self.api_endpoints:
            try:
                url = f"{self.backend_base_url}{endpoint}"
                logger.info(f"APIチェック中: {url}")
                
                is_accessible, error_msg, content = self.check_url_accessibility(url)
                endpoints_checked += 1
                
                if not is_accessible:
                    errors.append(ErrorInfo(
                        timestamp=datetime.now().isoformat(),
                        type="api_error",
                        level="error",
                        message=f"APIエラー: {error_msg}",
                        source="backend",
                        url=url,
                        details=error_msg
                    ))
                elif content:
                    # JSONレスポンスをチェック
                    try:
                        data = json.loads(content)
                        if isinstance(data, dict):
                            # エラー応答をチェック
                            if data.get('error') or data.get('message', '').lower().find('error') != -1:
                                errors.append(ErrorInfo(
                                    timestamp=datetime.now().isoformat(),
                                    type="api_response_error",
                                    level="error",
                                    message=f"APIレスポンスエラー: {data.get('error', data.get('message', 'Unknown error'))}",
                                    source="backend",
                                    url=url,
                                    details=json.dumps(data)[:500]
                                ))
                    except json.JSONDecodeError:
                        # JSONでない場合はHTMLエラーページかもしれない
                        if "error" in content.lower() or "exception" in content.lower():
                            errors.append(ErrorInfo(
                                timestamp=datetime.now().isoformat(),
                                type="api_html_error",
                                level="error",
                                message="APIがHTMLエラーページを返しました",
                                source="backend", 
                                url=url,
                                details=content[:500]
                            ))
                
                time.sleep(0.5)  # レート制限
                
            except Exception as e:
                logger.error(f"APIエンドポイントチェックエラー {url}: {e}")
                errors.append(ErrorInfo(
                    timestamp=datetime.now().isoformat(),
                    type="api_check_error",
                    level="error",
                    message=f"APIチェック中にエラー: {str(e)}",
                    source="backend",
                    url=url,
                    details=traceback.format_exc()
                ))
        
        return errors, endpoints_checked

    def check_system_logs(self) -> List[ErrorInfo]:
        """システムログをチェック"""
        errors = []
        
        # バックエンドログファイルをチェック
        backend_log_path = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/itsm_error.log"
        
        try:
            if os.path.exists(backend_log_path):
                # 最新の50行を読み取り
                result = subprocess.run(['tail', '-50', backend_log_path], 
                                      capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0 and result.stdout:
                    log_lines = result.stdout.strip().split('\n')
                    
                    # 最近のエラーログを解析（過去5分以内）
                    current_time = datetime.now()
                    for line in log_lines:
                        if 'ERROR' in line and ('AttributeError' in line or 'Exception' in line):
                            errors.append(ErrorInfo(
                                timestamp=datetime.now().isoformat(),
                                type="backend_log_error",
                                level="error",
                                message=f"バックエンドログエラー: {line[:200]}...",
                                source="backend",
                                details=line
                            ))
                        elif 'WARNING' in line:
                            errors.append(ErrorInfo(
                                timestamp=datetime.now().isoformat(),
                                type="backend_log_warning",
                                level="warning",
                                message=f"バックエンドログ警告: {line[:200]}...",
                                source="backend",
                                details=line
                            ))
                            
        except Exception as e:
            logger.error(f"ログファイルチェックエラー: {e}")
            errors.append(ErrorInfo(
                timestamp=datetime.now().isoformat(),
                type="log_check_error",
                level="error",
                message=f"ログファイルチェック中にエラー: {str(e)}",
                source="monitor",
                details=traceback.format_exc()
            ))
        
        return errors

    def run_comprehensive_check(self) -> Tuple[List[ErrorInfo], SystemStatus]:
        """包括的エラーチェックを実行"""
        start_time = time.time()
        all_errors = []
        
        logger.info("包括的エラーチェック開始")
        
        try:
            # フロントエンドチェック
            frontend_errors, pages_checked = self.check_frontend_pages()
            all_errors.extend(frontend_errors)
            
            # APIチェック
            api_errors, endpoints_checked = self.check_api_endpoints()
            all_errors.extend(api_errors)
            
            # システムログチェック
            log_errors = self.check_system_logs()
            all_errors.extend(log_errors)
            
        except Exception as e:
            logger.error(f"包括的チェック実行エラー: {e}")
            all_errors.append(ErrorInfo(
                timestamp=datetime.now().isoformat(),
                type="monitor_error",
                level="error",
                message=f"監視システムエラー: {str(e)}",
                source="monitor",
                details=traceback.format_exc()
            ))
            pages_checked = 0
            endpoints_checked = 0
        
        # エラーを分類
        frontend_errors_count = len([e for e in all_errors if e.source == "frontend"])
        backend_errors_count = len([e for e in all_errors if e.source == "backend"])
        api_errors_count = len([e for e in all_errors if e.type.startswith("api")])
        network_errors_count = len([e for e in all_errors if "network" in e.type or "access" in e.type])
        
        # システム状態を作成
        system_status = SystemStatus(
            timestamp=datetime.now().isoformat(),
            frontend_errors=frontend_errors_count,
            backend_errors=backend_errors_count,
            api_errors=api_errors_count,
            network_errors=network_errors_count,
            total_errors=len(all_errors),
            pages_checked=pages_checked,
            api_endpoints_checked=endpoints_checked,
            last_check_duration=time.time() - start_time,
            status="healthy" if len(all_errors) == 0 else ("errors_detected" if len(all_errors) < 5 else "critical")
        )
        
        # 連続クリーンチェック更新
        if len(all_errors) == 0:
            self.consecutive_clean_checks += 1
        else:
            self.consecutive_clean_checks = 0
        
        logger.info(f"チェック完了: {len(all_errors)}個のエラーを検出")
        
        return all_errors, system_status

    def save_error_data(self, errors: List[ErrorInfo], status: SystemStatus):
        """エラーデータを保存"""
        try:
            # エラー情報を保存
            error_data = {
                "timestamp": datetime.now().isoformat(),
                "errors": [asdict(error) for error in errors],
                "total_count": len(errors),
                "frontend_errors": [asdict(e) for e in errors if e.source == "frontend"],
                "backend_errors": [asdict(e) for e in errors if e.source == "backend"],
                "api_errors": [asdict(e) for e in errors if e.type.startswith("api")],
                "network_errors": [asdict(e) for e in errors if "network" in e.type or "access" in e.type]
            }
            
            with open(self.errors_file, 'w', encoding='utf-8') as f:
                json.dump(error_data, f, ensure_ascii=False, indent=2)
            
            # ステータス情報を保存
            status_data = asdict(status)
            status_data["consecutive_clean_checks"] = self.consecutive_clean_checks
            status_data["required_clean_checks"] = self.required_clean_checks
            status_data["completion_status"] = "completed" if self.consecutive_clean_checks >= self.required_clean_checks else "in_progress"
            
            with open(self.status_file, 'w', encoding='utf-8') as f:
                json.dump(status_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"エラーデータ保存完了: {len(errors)}個のエラー")
            
        except Exception as e:
            logger.error(f"エラーデータ保存失敗: {e}")

    def generate_repair_instructions(self, errors: List[ErrorInfo]) -> Dict[str, Any]:
        """修復指示を生成"""
        instructions = {
            "timestamp": datetime.now().isoformat(),
            "total_errors": len(errors), 
            "instructions": [],
            "priority_actions": [],
            "agent_tasks": {
                "ITSM-DevUI": [],
                "ITSM-DevAPI": [],
                "ITSM-Manager": []
            }
        }
        
        for error in errors:
            instruction = {
                "error_id": f"{error.type}_{hash(error.message)}",
                "error_type": error.type,
                "priority": "high" if error.level == "error" else "medium",
                "description": error.message,
                "suggested_fix": self.get_suggested_fix(error),
                "assigned_agent": self.get_assigned_agent(error),
                "timestamp": error.timestamp
            }
            
            instructions["instructions"].append(instruction)
            
            if error.level == "error":
                instructions["priority_actions"].append(instruction)
            
            agent = instruction["assigned_agent"]
            if agent in instructions["agent_tasks"]:
                instructions["agent_tasks"][agent].append(instruction)
        
        try:
            with open(self.fixes_file, 'w', encoding='utf-8') as f:
                json.dump(instructions, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"修復指示保存失敗: {e}")
        
        return instructions

    def get_suggested_fix(self, error: ErrorInfo) -> str:
        """エラーに対する修復提案を生成"""
        if error.type == "frontend_access_error":
            return f"フロントエンドサーバーの起動状況を確認: {error.url}"
        elif error.type == "api_error":
            return f"APIエンドポイントを修正: {error.url}"
        elif error.type == "backend_log_error":
            return f"バックエンドログエラーを修正: {error.message[:100]}..."
        elif error.type == "react_error":
            return f"Reactコンポーネントエラーを修正: {error.url}"
        else:
            return f"エラーを調査・修正: {error.message[:100]}..."

    def get_assigned_agent(self, error: ErrorInfo) -> str:
        """エラーを担当するエージェントを決定"""
        if error.source == "frontend" or "react" in error.type:
            return "ITSM-DevUI"
        elif error.source == "backend" or "api" in error.type:
            return "ITSM-DevAPI"
        else:
            return "ITSM-Manager"

    def continuous_monitoring_loop(self):
        """継続監視ループ"""
        logger.info("継続監視ループ開始")
        
        check_interval = 60  # 60秒間隔
        
        while True:
            try:
                logger.info(f"監視チェック開始 (連続クリーン: {self.consecutive_clean_checks}/{self.required_clean_checks})")
                
                errors, status = self.run_comprehensive_check()
                self.save_error_data(errors, status)
                
                if errors:
                    repair_instructions = self.generate_repair_instructions(errors)
                    logger.info(f"修復指示を生成: {len(repair_instructions['instructions'])}件")
                
                # 完了判定
                if self.consecutive_clean_checks >= self.required_clean_checks:
                    logger.info("🎉 エラーゼロ達成！継続監視を完了します。")
                    break
                
                # ステータスを出力
                logger.info(f"現在のステータス: {status.status}")
                logger.info(f"総エラー数: {status.total_errors}")
                logger.info(f"フロントエンドエラー: {status.frontend_errors}")
                logger.info(f"バックエンドエラー: {status.backend_errors}")
                logger.info(f"APIエラー: {status.api_errors}")
                
                time.sleep(check_interval)
                
            except KeyboardInterrupt:  
                logger.info("監視ループを中断しました")
                break
            except Exception as e:
                logger.error(f"監視ループエラー: {e}")
                time.sleep(check_interval)

    def run_single_check(self):
        """単発チェックを実行"""
        logger.info("単発エラーチェック開始")
        
        errors, status = self.run_comprehensive_check()
        self.save_error_data(errors, status)
        
        if errors:
            repair_instructions = self.generate_repair_instructions(errors)
            logger.info(f"修復指示を生成: {len(repair_instructions['instructions'])}件")
        
        logger.info("単発チェック完了")
        return errors, status

def main():
    """メイン実行関数"""
    monitor = SimpleErrorMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        # 単発チェック
        monitor.run_single_check()
    else:
        # 継続監視ループ
        monitor.continuous_monitoring_loop()

if __name__ == "__main__":
    main()
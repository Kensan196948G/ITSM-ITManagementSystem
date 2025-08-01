#!/usr/bin/env python3
"""
フロントエンドエラー監視システム
TypeScript, React, Material-UIエラーを監視・検出
"""

import os
import json
import subprocess
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

class FrontendErrorMonitor:
    def __init__(self, 
                 frontend_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                 coordination_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination",
                 check_interval: int = 30):
        self.frontend_path = Path(frontend_path)
        self.coordination_path = Path(coordination_path)
        self.errors_file = self.coordination_path / "errors.json"
        self.check_interval = check_interval
        self.setup_logging()
        
        # エラーパターン定義
        self.error_patterns = {
            'typescript': [
                r"error TS\d+:",
                r"Type '[^']*' is not assignable to type '[^']*'",
                r"Property '[^']*' does not exist on type '[^']*'",
                r"Cannot find name '[^']*'",
                r"Expected \d+ arguments, but got \d+",
                r"Type '[^']*' has no properties in common with type '[^']*'",
                r"Object is possibly 'null'",
                r"Object is possibly 'undefined'"
            ],
            'react': [
                r"React Hook .* has a missing dependency:",
                r"React Hook .* cannot be called conditionally",
                r"Each child in a list should have a unique \"key\" prop",
                r"Warning: Cannot update a component .* while rendering a different component",
                r"Warning: .* received a final argument that is not a function",
                r"Warning: validateDOMNesting\(\.\.\.\): .* cannot appear as a child of",
                r"Expected an assignment or function call and instead saw an expression"
            ],
            'materialUI': [
                r"MUI: .* component is deprecated",
                r"Material-UI: The .* component has been moved",
                r"MUI: .* prop is deprecated",
                r"Warning: Failed prop type: Invalid prop .* supplied to",
                r"MUI: You are importing .* from '@mui/material'",
                r"Cannot resolve .* from '@mui/.*'",
                r"Module not found: Error: Can't resolve '@mui/.*'"
            ],
            'imports': [
                r"Module not found: Error: Can't resolve '[^']*'",
                r"Cannot find module '[^']*'",
                r"Declaration or statement expected",
                r"';' expected",
                r"Identifier expected",
                r"Cannot use import statement outside a module",
                r"The requested module '[^']*' does not provide an export named '[^']*'"
            ],
            'props': [
                r"Warning: Failed prop type: Invalid prop .* of type .* supplied to .*, expected .*",
                r"Warning: Failed prop type: Required prop .* was not specified in .*",
                r"Property '[^']*' is missing in type '[^']*' but required in type '[^']*'",
                r"Type '[^']*' is not assignable to type 'IntrinsicAttributes.*'",
                r"Argument of type '[^']*' is not assignable to parameter of type '[^']*'"
            ]
        }

    def setup_logging(self):
        """ログ設定"""
        log_file = self.coordination_path / "frontend-repair" / "monitor.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def check_typescript_errors(self) -> List[Dict[str, Any]]:
        """TypeScriptコンパイルエラーをチェック"""
        errors = []
        try:
            # TypeScriptコンパイルチェック
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                error_lines = result.stderr.split('\n') + result.stdout.split('\n')
                for line in error_lines:
                    if line.strip():
                        for pattern in self.error_patterns['typescript']:
                            if re.search(pattern, line):
                                errors.append({
                                    "type": "typescript",
                                    "message": line.strip(),
                                    "file": self.extract_file_path(line),
                                    "line": self.extract_line_number(line),
                                    "severity": "error",
                                    "timestamp": datetime.now().isoformat(),
                                    "pattern_matched": pattern
                                })
                                break
                                
        except subprocess.TimeoutExpired:
            self.logger.warning("TypeScript check timed out")
        except Exception as e:
            self.logger.error(f"TypeScript check failed: {e}")
            
        return errors

    def check_eslint_errors(self) -> List[Dict[str, Any]]:
        """ESLintエラーをチェック（React関連含む）"""
        errors = []
        try:
            result = subprocess.run(
                ["npx", "eslint", "src/", "--ext", "ts,tsx", "--format", "json"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.stdout:
                eslint_results = json.loads(result.stdout)
                for file_result in eslint_results:
                    for message in file_result.get('messages', []):
                        error_text = message.get('message', '')
                        
                        # エラーカテゴリを判定
                        category = 'react' if any(
                            keyword in error_text.lower() 
                            for keyword in ['hook', 'jsx', 'react', 'component']
                        ) else 'imports' if 'import' in error_text.lower() else 'typescript'
                        
                        errors.append({
                            "type": category,
                            "message": error_text,
                            "file": file_result.get('filePath', '').replace(str(self.frontend_path), ''),
                            "line": message.get('line', 0),
                            "column": message.get('column', 0),
                            "severity": message.get('severity', 1) == 2 and "error" or "warning",
                            "rule": message.get('ruleId', ''),
                            "timestamp": datetime.now().isoformat()
                        })
                        
        except subprocess.TimeoutExpired:
            self.logger.warning("ESLint check timed out")
        except Exception as e:
            self.logger.error(f"ESLint check failed: {e}")
            
        return errors

    def check_build_errors(self) -> List[Dict[str, Any]]:
        """ビルドエラーをチェック"""
        errors = []
        try:
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                error_lines = result.stderr.split('\n') + result.stdout.split('\n')
                for line in error_lines:
                    if line.strip():
                        # エラーパターンをチェック
                        for category, patterns in self.error_patterns.items():
                            for pattern in patterns:
                                if re.search(pattern, line):
                                    errors.append({
                                        "type": category,
                                        "message": line.strip(),
                                        "file": self.extract_file_path(line),
                                        "line": self.extract_line_number(line),
                                        "severity": "error",
                                        "timestamp": datetime.now().isoformat(),
                                        "source": "build",
                                        "pattern_matched": pattern
                                    })
                                    break
                                    
        except subprocess.TimeoutExpired:
            self.logger.warning("Build check timed out")
        except Exception as e:
            self.logger.error(f"Build check failed: {e}")
            
        return errors

    def extract_file_path(self, error_line: str) -> Optional[str]:
        """エラー行からファイルパスを抽出"""
        # TypeScriptエラー: src/file.tsx(123,45): のパターン
        match = re.search(r'(src/[^(\s:]+)', error_line)
        if match:
            return match.group(1)
        
        # その他のファイルパスパターン（行番号・列番号を除去）
        match = re.search(r'([^:\s(]+\.(ts|tsx|js|jsx))(?:\(\d+,\d+\))?', error_line)
        if match:
            return match.group(1)
            
        return None

    def extract_line_number(self, error_line: str) -> Optional[int]:
        """エラー行から行番号を抽出"""
        match = re.search(r':(\d+):', error_line)
        if match:
            return int(match.group(1))
        return None

    def load_current_errors(self) -> Dict[str, Any]:
        """現在のエラー状態を読み込み"""
        try:
            if self.errors_file.exists():
                with open(self.errors_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load current errors: {e}")
        
        return {
            "errors": [],
            "lastCheck": None,
            "frontend": {
                "typescript": [],
                "react": [],
                "materialUI": [],
                "imports": [],
                "props": []
            },
            "status": "monitoring"
        }

    def save_errors(self, errors_data: Dict[str, Any]):
        """エラー情報を保存"""
        try:
            errors_data["lastCheck"] = datetime.now().isoformat()
            errors_data["status"] = "monitoring"
            
            with open(self.errors_file, 'w', encoding='utf-8') as f:
                json.dump(errors_data, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            self.logger.error(f"Failed to save errors: {e}")

    def run_check(self) -> Dict[str, Any]:
        """エラーチェックを実行"""
        self.logger.info("Starting frontend error check")
        
        # 各種エラーチェックを実行
        all_errors = []
        all_errors.extend(self.check_typescript_errors())
        all_errors.extend(self.check_eslint_errors())
        all_errors.extend(self.check_build_errors())
        
        # エラーをカテゴリ別に分類
        categorized_errors = {
            "typescript": [],
            "react": [],
            "materialUI": [],
            "imports": [],
            "props": []
        }
        
        for error in all_errors:
            category = error.get("type", "typescript")
            if category in categorized_errors:
                categorized_errors[category].append(error)
        
        # エラーデータを構築
        errors_data = {
            "errors": all_errors,
            "lastCheck": datetime.now().isoformat(),
            "frontend": categorized_errors,
            "status": "monitoring",
            "summary": {
                "total": len(all_errors),
                "typescript": len(categorized_errors["typescript"]),
                "react": len(categorized_errors["react"]),
                "materialUI": len(categorized_errors["materialUI"]),
                "imports": len(categorized_errors["imports"]),
                "props": len(categorized_errors["props"])
            }
        }
        
        # エラー情報を保存
        self.save_errors(errors_data)
        
        self.logger.info(f"Error check completed. Found {len(all_errors)} errors")
        return errors_data

    def start_monitoring(self):
        """継続監視を開始"""
        self.logger.info(f"Starting continuous monitoring (interval: {self.check_interval}s)")
        
        try:
            while True:
                self.run_check()
                time.sleep(self.check_interval)
                
        except KeyboardInterrupt:
            self.logger.info("Monitoring stopped by user")
        except Exception as e:
            self.logger.error(f"Monitoring error: {e}")

if __name__ == "__main__":
    monitor = FrontendErrorMonitor()
    
    # 1回だけのチェックか継続監視かを選択
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        result = monitor.run_check()
        print(f"Found {result['summary']['total']} errors")
    else:
        monitor.start_monitoring()
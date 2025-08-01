#!/usr/bin/env python3
"""
エラーパターン分析とマッチングシステム
- GitHub Actions、ローカルビルド、テスト失敗の統合分析
- 高度なパターンマッチングとエラー分類
- 自動修復アクションの決定エンジン
"""

import json
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import yaml
from dataclasses import dataclass, asdict

@dataclass
class ErrorPattern:
    """エラーパターンの定義"""
    name: str
    category: str
    patterns: List[str]
    severity: str  # critical, high, medium, low
    confidence: float  # 0.0-1.0
    auto_fixable: bool
    fix_actions: List[str]
    description: str
    examples: List[str]

@dataclass
class ErrorMatch:
    """エラーマッチ結果"""
    pattern: ErrorPattern
    matched_text: str
    line_number: Optional[int]
    file_path: Optional[str]
    confidence: float
    context: str
    timestamp: datetime

class ErrorPatternAnalyzer:
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # エラーパターンを初期化
        self.patterns = self.initialize_patterns()
        
        # 統計情報
        self.analysis_stats = {
            "total_analyzed": 0,
            "patterns_matched": 0,
            "auto_fixes_suggested": 0,
            "last_analysis": None
        }
        
        self.logger.info(f"Error Pattern Analyzer initialized with {len(self.patterns)} patterns")

    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "error_pattern_analyzer.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("ErrorPatternAnalyzer")

    def initialize_patterns(self) -> List[ErrorPattern]:
        """エラーパターンの初期化"""
        patterns = []
        
        # Python関連エラー
        patterns.extend([
            ErrorPattern(
                name="module_not_found",
                category="python_dependency",
                patterns=[
                    r"ModuleNotFoundError: No module named '([^']+)'",
                    r"ImportError: No module named ([^\s]+)",
                    r"ImportError: cannot import name '([^']+)'"
                ],
                severity="high",
                confidence=0.95,
                auto_fixable=True,
                fix_actions=[
                    "pip install {module}",
                    "pip install -r requirements.txt",
                    "pip install -e ."
                ],
                description="Python module import errors",
                examples=["ModuleNotFoundError: No module named 'fastapi'"]
            ),
            ErrorPattern(
                name="python_syntax_error",
                category="python_code",
                patterns=[
                    r"SyntaxError: (.+) \((.+), line (\d+)\)",
                    r"IndentationError: (.+)",
                    r"TabError: inconsistent use of tabs and spaces"
                ],
                severity="high",
                confidence=0.98,
                auto_fixable=False,
                fix_actions=[
                    "flake8 --select=E9,F63,F7,F82 .",
                    "python -m py_compile {file}",
                    "autopep8 --in-place {file}"
                ],
                description="Python syntax and indentation errors",
                examples=["SyntaxError: invalid syntax (app.py, line 15)"]
            ),
            ErrorPattern(
                name="pytest_failure",
                category="python_test",
                patterns=[
                    r"FAILED (.+)::(.+) - (.+)",
                    r"AssertionError: (.+)",
                    r"(.+) failed, (.+) passed",
                    r"E\s+(.+Error): (.+)"
                ],
                severity="medium",
                confidence=0.90,
                auto_fixable=True,
                fix_actions=[
                    "python -m pytest {test_file} -v",
                    "python -m pytest --tb=short",
                    "python -m pytest --lf"  # last failed
                ],
                description="Python test failures",
                examples=["FAILED tests/test_api.py::test_create_user - AssertionError"]
            )
        ])
        
        # JavaScript/Node.js関連エラー
        patterns.extend([
            ErrorPattern(
                name="npm_dependency_error",
                category="npm_dependency",
                patterns=[
                    r"npm ERR! Cannot resolve dependency:",
                    r"npm ERR! peer dep missing: (.+)",
                    r"Module not found: Error: Can't resolve '([^']+)'",
                    r"npm ERR! 404 Not Found - GET (.+)"
                ],
                severity="high",
                confidence=0.95,
                auto_fixable=True,
                fix_actions=[
                    "npm install",
                    "npm ci",
                    "rm -rf node_modules && npm install",
                    "npm audit fix"
                ],
                description="NPM dependency resolution errors",
                examples=["npm ERR! Cannot resolve dependency: @types/react"]
            ),
            ErrorPattern(
                name="typescript_error",
                category="typescript",
                patterns=[
                    r"TS(\d+): (.+)",
                    r"Type '(.+)' is not assignable to type '(.+)'",
                    r"Property '(.+)' does not exist on type '(.+)'"
                ],
                severity="medium",
                confidence=0.92,
                auto_fixable=False,
                fix_actions=[
                    "npm run type-check",
                    "tsc --noEmit",
                    "npx tsc --strict"
                ],
                description="TypeScript compilation errors",
                examples=["TS2304: Cannot find name 'React'"]
            ),
            ErrorPattern(
                name="jest_test_failure",
                category="javascript_test",
                patterns=[
                    r"FAIL (.+\.test\.(js|ts|tsx))",
                    r"expect\((.+)\)\.(.+) # (.+)",
                    r"Test suite failed to run: (.+)"
                ],
                severity="medium",
                confidence=0.88,
                auto_fixable=True,
                fix_actions=[
                    "npm test -- --updateSnapshot",
                    "npm test -- --watchAll=false",
                    "npm test -- --verbose"
                ],
                description="Jest test failures",
                examples=["FAIL src/components/Button.test.tsx"]
            )
        ])
        
        # Build関連エラー
        patterns.extend([
            ErrorPattern(
                name="webpack_build_error",
                category="build",
                patterns=[
                    r"webpack: Failed to compile with (\d+) error",
                    r"Module build failed: Error: (.+)",
                    r"ERROR in (.+\.ts)\((\d+),(\d+)\): (.+)"
                ],
                severity="high",
                confidence=0.93,
                auto_fixable=True,
                fix_actions=[
                    "npm run build",
                    "rm -rf dist && npm run build",
                    "npm run lint -- --fix"
                ],
                description="Webpack build compilation errors",
                examples=["webpack: Failed to compile with 3 errors"]
            ),
            ErrorPattern(
                name="vite_build_error",
                category="build",
                patterns=[
                    r"build error:",
                    r"RollupError: (.+)",
                    r"\[vite\]: Rollup failed to resolve import \"(.+)\""
                ],
                severity="high",
                confidence=0.91,
                auto_fixable=True,
                fix_actions=[
                    "npm run build",
                    "rm -rf dist && npm install && npm run build"
                ],
                description="Vite build errors",
                examples=["[vite]: Rollup failed to resolve import \"@/components\""]
            )
        ])
        
        # Database関連エラー
        patterns.extend([
            ErrorPattern(
                name="database_connection_error",
                category="database",
                patterns=[
                    r"sqlalchemy\.exc\.OperationalError: \(psycopg2\.OperationalError\) (.+)",
                    r"could not connect to server: (.+)",
                    r"FATAL: database \"(.+)\" does not exist"
                ],
                severity="critical",
                confidence=0.96,
                auto_fixable=True,
                fix_actions=[
                    "python init_sqlite_db.py",
                    "createdb test_database",
                    "docker-compose up -d postgres"
                ],
                description="Database connection and setup errors",
                examples=["FATAL: database \"itsm_test\" does not exist"]
            ),
            ErrorPattern(
                name="migration_error",
                category="database",
                patterns=[
                    r"alembic\.util\.exc\.CommandError: (.+)",
                    r"sqlalchemy\.exc\.ProgrammingError: (.+)",
                    r"relation \"(.+)\" does not exist"
                ],
                severity="high",
                confidence=0.89,
                auto_fixable=True,
                fix_actions=[
                    "alembic upgrade head",
                    "python init_db.py",
                    "alembic revision --autogenerate -m \"Auto migration\""
                ],
                description="Database migration errors",
                examples=["relation \"users\" does not exist"]
            )
        ])
        
        # Docker関連エラー
        patterns.extend([
            ErrorPattern(
                name="docker_build_error",
                category="docker",
                patterns=[
                    r"ERROR: failed to solve: (.+)",
                    r"Step \d+/\d+ : (.+)",
                    r"unable to prepare context: (.+)"
                ],
                severity="high",
                confidence=0.87,
                auto_fixable=True,
                fix_actions=[
                    "docker system prune -f",
                    "docker build --no-cache .",
                    "docker-compose build --no-cache"
                ],
                description="Docker build errors",
                examples=["ERROR: failed to solve: dockerfile parse error"]
            )
        ])
        
        # CI/CD関連エラー
        patterns.extend([
            ErrorPattern(
                name="github_actions_error",
                category="ci_cd",
                patterns=[
                    r"Error: Process completed with exit code (\d+)",
                    r"##\[error\](.+)",
                    r"Run (.+) failed with exit code (\d+)"
                ],
                severity="medium",
                confidence=0.85,
                auto_fixable=True,
                fix_actions=[
                    "git add . && git commit -m \"Fix CI issues\"",
                    "gh workflow run ci.yml",
                    "git push origin main"
                ],
                description="GitHub Actions workflow errors",
                examples=["Error: Process completed with exit code 1"]
            )
        ])
        
        return patterns

    def analyze_log_content(self, content: str, source_file: Optional[str] = None) -> List[ErrorMatch]:
        """ログ内容を分析してエラーパターンをマッチ"""
        matches = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            for pattern in self.patterns:
                for regex_pattern in pattern.patterns:
                    try:
                        match = re.search(regex_pattern, line, re.IGNORECASE)
                        if match:
                            # コンテキストを取得（前後3行）
                            context_start = max(0, line_num - 4)
                            context_end = min(len(lines), line_num + 3)
                            context = '\n'.join(lines[context_start:context_end])
                            
                            error_match = ErrorMatch(
                                pattern=pattern,
                                matched_text=match.group(0),
                                line_number=line_num,
                                file_path=source_file,
                                confidence=pattern.confidence,
                                context=context,
                                timestamp=datetime.now()
                            )
                            
                            matches.append(error_match)
                            self.logger.debug(f"Pattern matched: {pattern.name} at line {line_num}")
                            
                    except re.error as e:
                        self.logger.warning(f"Invalid regex pattern: {regex_pattern} - {e}")
        
        # 統計更新
        self.analysis_stats["total_analyzed"] += 1
        self.analysis_stats["patterns_matched"] += len(matches)
        self.analysis_stats["last_analysis"] = datetime.now().isoformat()
        
        return matches

    def analyze_file(self, file_path: Path) -> List[ErrorMatch]:
        """ファイルを分析"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            return self.analyze_log_content(content, str(file_path))
            
        except Exception as e:
            self.logger.error(f"Failed to analyze file {file_path}: {e}")
            return []

    def get_fix_suggestions(self, matches: List[ErrorMatch]) -> List[Dict]:
        """修復提案を生成"""
        suggestions = []
        
        # 優先度順にソート（重要度とconfidenceで）
        severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        matches.sort(key=lambda m: (severity_order.get(m.pattern.severity, 0), m.confidence), reverse=True)
        
        for match in matches:
            if match.pattern.auto_fixable:
                suggestion = {
                    "pattern_name": match.pattern.name,
                    "category": match.pattern.category,
                    "severity": match.pattern.severity,
                    "confidence": match.confidence,
                    "description": match.pattern.description,
                    "matched_text": match.matched_text,
                    "file_path": match.file_path,
                    "line_number": match.line_number,
                    "fix_actions": match.pattern.fix_actions,
                    "context": match.context[:200] + "..." if len(match.context) > 200 else match.context
                }
                
                suggestions.append(suggestion)
                self.analysis_stats["auto_fixes_suggested"] += 1
        
        return suggestions

    def generate_fix_script(self, suggestions: List[Dict]) -> str:
        """修復スクリプトを生成"""
        script_lines = [
            "#!/bin/bash",
            "# Auto-generated error fix script",
            f"# Generated: {datetime.now().isoformat()}",
            f"# Total fixes: {len(suggestions)}",
            "",
            "set -e",
            "echo \"🔧 Starting automated error fixes...\"",
            ""
        ]
        
        for i, suggestion in enumerate(suggestions, 1):
            script_lines.extend([
                f"echo \"Fix {i}/{len(suggestions)}: {suggestion['description']}\"",
                f"echo \"Severity: {suggestion['severity']} | Confidence: {suggestion['confidence']:.2f}\"",
                ""
            ])
            
            for action in suggestion['fix_actions']:
                # アクションをより安全に実行するための処理
                safe_action = action.replace("{module}", "MODULE_NAME")
                safe_action = safe_action.replace("{file}", suggestion.get('file_path', 'FILE_PATH'))
                safe_action = safe_action.replace("{test_file}", suggestion.get('file_path', 'FILE_PATH'))
                
                script_lines.extend([
                    f"echo \"Executing: {safe_action}\"",
                    f"if {safe_action}; then",
                    f"    echo \"✅ Success: {safe_action}\"",
                    f"else",
                    f"    echo \"❌ Failed: {safe_action}\"",
                    f"fi",
                    ""
                ])
        
        script_lines.extend([
            "echo \"🎉 All fixes completed!\"",
            "echo \"Please run tests to verify fixes.\""
        ])
        
        return '\n'.join(script_lines)

    def save_analysis_report(self, matches: List[ErrorMatch], suggestions: List[Dict]) -> Path:
        """分析レポートを保存"""
        report_file = self.base_path / f"error_analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_errors": len(matches),
                "auto_fixable": len(suggestions),
                "categories": {},
                "severities": {}
            },
            "errors": [],
            "suggestions": suggestions,
            "statistics": self.analysis_stats
        }
        
        # エラー詳細を追加
        for match in matches:
            report_data["errors"].append({
                "pattern": match.pattern.name,
                "category": match.pattern.category,
                "severity": match.pattern.severity,
                "confidence": match.confidence,
                "matched_text": match.matched_text,
                "file_path": match.file_path,
                "line_number": match.line_number,
                "timestamp": match.timestamp.isoformat()
            })
            
            # 統計更新
            category = match.pattern.category
            severity = match.pattern.severity
            
            if category not in report_data["summary"]["categories"]:
                report_data["summary"]["categories"][category] = 0
            report_data["summary"]["categories"][category] += 1
            
            if severity not in report_data["summary"]["severities"]:
                report_data["summary"]["severities"][severity] = 0
            report_data["summary"]["severities"][severity] += 1
        
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        self.logger.info(f"Analysis report saved: {report_file}")
        return report_file

    def analyze_github_actions_logs(self, log_content: str) -> Tuple[List[ErrorMatch], List[Dict]]:
        """GitHub Actionsログの専用分析"""
        matches = self.analyze_log_content(log_content, "github_actions.log")
        suggestions = self.get_fix_suggestions(matches)
        
        # GitHub Actions特有の処理
        for suggestion in suggestions:
            if suggestion["category"] == "ci_cd":
                # CI/CD特有の修復アクションを調整
                suggestion["priority"] = "high"
                suggestion["automated"] = True
        
        return matches, suggestions

    def get_statistics(self) -> Dict:
        """分析統計を取得"""
        return self.analysis_stats.copy()


def main():
    """テスト実行"""
    analyzer = ErrorPatternAnalyzer()
    
    # テストログの分析例
    test_log = """
ModuleNotFoundError: No module named 'fastapi'
FAILED tests/test_api.py::test_create_user - AssertionError: Expected 200, got 404
npm ERR! Cannot resolve dependency: @types/react
TS2304: Cannot find name 'React'
Error: Process completed with exit code 1
    """
    
    print("🔍 Analyzing test log content...")
    matches = analyzer.analyze_log_content(test_log)
    suggestions = analyzer.get_fix_suggestions(matches)
    
    print(f"Found {len(matches)} error patterns")
    print(f"Generated {len(suggestions)} fix suggestions")
    
    # レポート保存
    report_file = analyzer.save_analysis_report(matches, suggestions)
    print(f"Report saved: {report_file}")
    
    # 修復スクリプト生成
    if suggestions:
        script_content = analyzer.generate_fix_script(suggestions)
        script_file = analyzer.base_path / "auto_fix_script.sh"
        with open(script_file, 'w') as f:
            f.write(script_content)
        print(f"Fix script generated: {script_file}")


if __name__ == "__main__":
    main()
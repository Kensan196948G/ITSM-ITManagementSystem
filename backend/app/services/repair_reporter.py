"""
修復結果レポート機能
自動修復システムの実行結果をHTMLレポートとして生成
"""

import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
import statistics

import aiofiles
from jinja2 import Template


@dataclass
class RepairSummary:
    """修復サマリー情報"""
    total_errors: int
    errors_fixed: int
    errors_failed: int
    errors_pending: int
    success_rate: float
    most_common_error_type: str
    execution_time: float
    report_generated_at: str


class RepairReporter:
    """修復結果レポート生成器"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.coordination_dir = self.project_root / "coordination"
        self.errors_file = self.coordination_dir / "errors.json"
        self.fixes_file = self.coordination_dir / "fixes.json"
        self.reports_dir = self.project_root / "tests" / "reports"
        self.logger = logging.getLogger(__name__)
        
        # レポートディレクトリを作成
        self.reports_dir.mkdir(parents=True, exist_ok=True)
    
    async def generate_comprehensive_report(self) -> Dict[str, Any]:
        """包括的な修復レポートを生成"""
        
        # データ読み込み
        errors_data = await self._load_errors_data()
        fixes_data = await self._load_fixes_data()
        
        # 分析実行
        summary = self._analyze_repair_summary(errors_data, fixes_data)
        error_trends = self._analyze_error_trends(errors_data)
        fix_effectiveness = self._analyze_fix_effectiveness(fixes_data)
        
        # レポートデータの構築
        report_data = {
            "summary": asdict(summary),
            "error_trends": error_trends,
            "fix_effectiveness": fix_effectiveness,
            "detailed_errors": errors_data,
            "detailed_fixes": fixes_data,
            "generated_at": datetime.now().isoformat()
        }
        
        # HTMLレポート生成
        html_report = await self._generate_html_report(report_data)
        html_path = self.reports_dir / "auto-repair-report.html"
        async with aiofiles.open(html_path, 'w', encoding='utf-8') as f:
            await f.write(html_report)
        
        # JSONレポート生成
        json_path = self.reports_dir / "auto-repair-report.json"
        async with aiofiles.open(json_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(report_data, indent=2, ensure_ascii=False))
        
        # Markdownレポート生成
        markdown_report = await self._generate_markdown_report(report_data)
        markdown_path = self.reports_dir / "auto-repair-report.md"
        async with aiofiles.open(markdown_path, 'w', encoding='utf-8') as f:
            await f.write(markdown_report)
        
        self.logger.info(f"修復レポート生成完了: {html_path}")
        
        return {
            "report_data": report_data,
            "html_path": str(html_path),
            "json_path": str(json_path),
            "markdown_path": str(markdown_path)
        }
    
    async def _load_errors_data(self) -> Dict[str, Any]:
        """エラーデータを読み込み"""
        try:
            if self.errors_file.exists():
                async with aiofiles.open(self.errors_file, 'r', encoding='utf-8') as f:
                    return json.loads(await f.read())
        except Exception as e:
            self.logger.error(f"エラーデータ読み込み失敗: {e}")
        
        return {
            "backend_errors": [],
            "api_errors": [],
            "database_errors": [],
            "validation_errors": [],
            "cors_errors": [],
            "authentication_errors": [],
            "last_check": None,
            "error_count": 0
        }
    
    async def _load_fixes_data(self) -> Dict[str, Any]:
        """修復データを読み込み"""
        try:
            if self.fixes_file.exists():
                async with aiofiles.open(self.fixes_file, 'r', encoding='utf-8') as f:
                    return json.loads(await f.read())
        except Exception as e:
            self.logger.error(f"修復データ読み込み失敗: {e}")
        
        return {
            "fixes_applied": [],
            "last_fix": None,
            "total_fixes": 0,
            "success_rate": 0.0,
            "failed_fixes": []
        }
    
    def _analyze_repair_summary(self, errors_data: Dict, fixes_data: Dict) -> RepairSummary:
        """修復サマリーを分析"""
        total_errors = errors_data.get("error_count", 0)
        fixes_applied = fixes_data.get("fixes_applied", [])
        
        errors_fixed = len([f for f in fixes_applied if f.get("status") == "completed"])
        errors_failed = len([f for f in fixes_applied if f.get("status") == "failed"])
        errors_pending = total_errors - len(fixes_applied)
        
        success_rate = (errors_fixed / len(fixes_applied)) * 100 if fixes_applied else 0.0
        
        # 最も多いエラータイプを計算
        all_errors = []
        for error_type in ["backend_errors", "api_errors", "database_errors", "validation_errors", "cors_errors", "authentication_errors"]:
            all_errors.extend(errors_data.get(error_type, []))
        
        error_types = [error.get("error_type", "unknown") for error in all_errors]
        most_common_error_type = max(set(error_types), key=error_types.count) if error_types else "none"
        
        return RepairSummary(
            total_errors=total_errors,
            errors_fixed=errors_fixed,
            errors_failed=errors_failed,
            errors_pending=errors_pending,
            success_rate=success_rate,
            most_common_error_type=most_common_error_type,
            execution_time=0.0,  # 実装時に計算
            report_generated_at=datetime.now().isoformat()
        )
    
    def _analyze_error_trends(self, errors_data: Dict) -> Dict[str, Any]:
        """エラートレンドを分析"""
        all_errors = []
        error_categories = {}
        
        for error_type, errors in errors_data.items():
            if isinstance(errors, list):
                all_errors.extend(errors)
                error_categories[error_type] = len(errors)
        
        # 時系列分析（過去24時間、週、月）
        now = datetime.now()
        time_ranges = {
            "last_24h": now - timedelta(hours=24),
            "last_week": now - timedelta(days=7),
            "last_month": now - timedelta(days=30)
        }
        
        time_analysis = {}
        for range_name, cutoff_time in time_ranges.items():
            range_errors = [
                error for error in all_errors
                if error.get("detected_at") and 
                datetime.fromisoformat(error["detected_at"].replace("Z", "+00:00")) > cutoff_time
            ]
            time_analysis[range_name] = len(range_errors)
        
        # 重要度別分析
        severity_analysis = {}
        for error in all_errors:
            severity = error.get("severity", "unknown")
            severity_analysis[severity] = severity_analysis.get(severity, 0) + 1
        
        return {
            "total_errors": len(all_errors),
            "error_categories": error_categories,
            "time_analysis": time_analysis,
            "severity_analysis": severity_analysis,
            "average_errors_per_day": len(all_errors) / 7 if all_errors else 0
        }
    
    def _analyze_fix_effectiveness(self, fixes_data: Dict) -> Dict[str, Any]:
        """修復効果を分析"""
        fixes_applied = fixes_data.get("fixes_applied", [])
        
        if not fixes_applied:
            return {
                "total_fixes": 0,
                "success_rate": 0.0,
                "average_fix_time": 0.0,
                "fix_type_success_rates": {},
                "common_failure_reasons": []
            }
        
        # 修復タイプ別成功率
        fix_type_stats = {}
        for fix in fixes_applied:
            fix_type = fix.get("fix_type", "unknown")
            status = fix.get("status", "unknown")
            
            if fix_type not in fix_type_stats:
                fix_type_stats[fix_type] = {"total": 0, "successful": 0}
            
            fix_type_stats[fix_type]["total"] += 1
            if status == "completed":
                fix_type_stats[fix_type]["successful"] += 1
        
        fix_type_success_rates = {}
        for fix_type, stats in fix_type_stats.items():
            success_rate = (stats["successful"] / stats["total"]) * 100
            fix_type_success_rates[fix_type] = {
                "success_rate": success_rate,
                "total_attempts": stats["total"],
                "successful_fixes": stats["successful"]
            }
        
        # 失敗理由の分析
        failed_fixes = [f for f in fixes_applied if f.get("status") == "failed"]
        failure_reasons = [f.get("result", "unknown") for f in failed_fixes]
        common_failure_reasons = list(set(failure_reasons))
        
        # 修復時間の分析（仮実装）
        fix_times = []
        for fix in fixes_applied:
            if fix.get("applied_at"):
                # 実際の実装では修復にかかった時間を計算
                fix_times.append(5.0)  # 仮の値
        
        average_fix_time = statistics.mean(fix_times) if fix_times else 0.0
        
        return {
            "total_fixes": len(fixes_applied),
            "success_rate": fixes_data.get("success_rate", 0.0),
            "average_fix_time": average_fix_time,
            "fix_type_success_rates": fix_type_success_rates,
            "common_failure_reasons": common_failure_reasons
        }
    
    async def _generate_html_report(self, report_data: Dict[str, Any]) -> str:
        """HTMLレポートを生成"""
        template_content = '''
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>自動修復システム レポート</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 1.2em;
        }
        .summary-card .number {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .error-card {
            background: #e74c3c;
        }
        .success-card {
            background: #27ae60;
        }
        .warning-card {
            background: #f39c12;
        }
        .info-card {
            background: #3498db;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: white;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .status-completed {
            color: #27ae60;
            font-weight: bold;
        }
        .status-failed {
            color: #e74c3c;
            font-weight: bold;
        }
        .status-pending {
            color: #f39c12;
            font-weight: bold;
        }
        .chart-placeholder {
            background-color: #ecf0f1;
            height: 300px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #7f8c8d;
            font-style: italic;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .error-details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 自動修復システム レポート</h1>
        <p class="timestamp">生成日時: {{ report_data.generated_at }}</p>
        
        <h2>📊 修復サマリー</h2>
        <div class="summary-grid">
            <div class="summary-card info-card">
                <h3>総エラー数</h3>
                <div class="number">{{ report_data.summary.total_errors }}</div>
            </div>
            <div class="summary-card success-card">
                <h3>修復成功</h3>
                <div class="number">{{ report_data.summary.errors_fixed }}</div>
            </div>
            <div class="summary-card error-card">
                <h3>修復失敗</h3>
                <div class="number">{{ report_data.summary.errors_failed }}</div>
            </div>
            <div class="summary-card warning-card">
                <h3>成功率</h3>
                <div class="number">{{ "%.1f"|format(report_data.summary.success_rate) }}%</div>
            </div>
        </div>
        
        <h2>📈 エラートレンド</h2>
        <div class="chart-placeholder">
            エラートレンドチャート（実装予定）
        </div>
        
        <table>
            <tr>
                <th>期間</th>
                <th>エラー数</th>
            </tr>
            {% for period, count in report_data.error_trends.time_analysis.items() %}
            <tr>
                <td>{{ period.replace('_', ' ').title() }}</td>
                <td>{{ count }}</td>
            </tr>
            {% endfor %}
        </table>
        
        <h2>🔧 修復効果分析</h2>
        <table>
            <tr>
                <th>修復タイプ</th>
                <th>試行回数</th>
                <th>成功回数</th>
                <th>成功率</th>
            </tr>
            {% for fix_type, stats in report_data.fix_effectiveness.fix_type_success_rates.items() %}
            <tr>
                <td>{{ fix_type.replace('_', ' ').title() }}</td>
                <td>{{ stats.total_attempts }}</td>
                <td>{{ stats.successful_fixes }}</td>
                <td>{{ "%.1f"|format(stats.success_rate) }}%</td>
            </tr>
            {% endfor %}
        </table>
        
        <h2>⚠️ 検出されたエラー</h2>
        {% for error_type, errors in report_data.detailed_errors.items() %}
        {% if errors and error_type != 'last_check' and error_type != 'error_count' %}
        <h3>{{ error_type.replace('_', ' ').title() }} ({{ errors|length }}件)</h3>
        {% for error in errors[:5] %}
        <div class="error-details">
            <strong>{{ error.get('severity', 'unknown').upper() }}</strong>: {{ error.get('message', 'No message')[:100] }}...
            {% if error.get('detected_at') %}
            <br><small class="timestamp">検出日時: {{ error.detected_at }}</small>
            {% endif %}
        </div>
        {% endfor %}
        {% if errors|length > 5 %}
        <p><em>... および他 {{ errors|length - 5 }} 件</em></p>
        {% endif %}
        {% endif %}
        {% endfor %}
        
        <h2>✅ 適用された修復</h2>
        <table>
            <tr>
                <th>修復ID</th>
                <th>修復タイプ</th>
                <th>説明</th>
                <th>ステータス</th>
                <th>適用日時</th>
            </tr>
            {% for fix in report_data.detailed_fixes.fixes_applied[-10:] %}
            <tr>
                <td>{{ fix.get('id', 'N/A')[:8] }}...</td>
                <td>{{ fix.get('fix_type', 'unknown').replace('_', ' ').title() }}</td>
                <td>{{ fix.get('description', 'No description')[:50] }}...</td>
                <td class="status-{{ fix.get('status', 'unknown') }}">
                    {{ fix.get('status', 'unknown').upper() }}
                </td>
                <td class="timestamp">{{ fix.get('applied_at', 'N/A') }}</td>
            </tr>
            {% endfor %}
        </table>
        
        <footer style="margin-top: 50px; text-align: center; color: #7f8c8d;">
            <p>自動修復システム v1.0 | ITSM Backend Auto-Repair</p>
        </footer>
    </div>
</body>
</html>
        '''
        
        template = Template(template_content)
        return template.render(report_data=report_data)
    
    async def _generate_markdown_report(self, report_data: Dict[str, Any]) -> str:
        """Markdownレポートを生成"""
        summary = report_data["summary"]
        error_trends = report_data["error_trends"]
        fix_effectiveness = report_data["fix_effectiveness"]
        
        markdown = f'''# 🔧 自動修復システム レポート

**生成日時**: {report_data["generated_at"]}

## 📊 修復サマリー

| 項目 | 値 |
|------|-----|
| 総エラー数 | {summary.total_errors} |
| 修復成功 | {summary.errors_fixed} |
| 修復失敗 | {summary.errors_failed} |
| 保留中 | {summary.errors_pending} |
| 成功率 | {summary.success_rate:.1f}% |
| 最多エラータイプ | {summary.most_common_error_type} |

## 📈 エラートレンド

### 時系列分析
'''

        for period, count in error_trends["time_analysis"].items():
            markdown += f"- **{period.replace('_', ' ').title()}**: {count}件\n"

        markdown += f'''
### エラーカテゴリ別
'''

        for category, count in error_trends["error_categories"].items():
            if isinstance(count, int) and count > 0:
                markdown += f"- **{category.replace('_', ' ').title()}**: {count}件\n"

        markdown += f'''
## 🔧 修復効果分析

### 修復タイプ別成功率

| 修復タイプ | 試行回数 | 成功回数 | 成功率 |
|-----------|---------|---------|--------|
'''

        for fix_type, stats in fix_effectiveness["fix_type_success_rates"].items():
            markdown += f"| {fix_type.replace('_', ' ').title()} | {stats['total_attempts']} | {stats['successful_fixes']} | {stats['success_rate']:.1f}% |\n"

        markdown += f'''
### 共通失敗理由
'''

        for reason in fix_effectiveness["common_failure_reasons"][:5]:
            markdown += f"- {reason}\n"

        markdown += f'''
## ⚠️ 最近の検出エラー（上位5件）
'''

        all_errors = []
        for error_type, errors in report_data["detailed_errors"].items():
            if isinstance(errors, list):
                all_errors.extend(errors)

        # 最新の5件を表示
        recent_errors = sorted(all_errors, key=lambda x: x.get("detected_at", ""), reverse=True)[:5]
        
        for i, error in enumerate(recent_errors, 1):
            markdown += f'''
### {i}. {error.get('severity', 'unknown').upper()}: {error.get('error_type', 'unknown').replace('_', ' ').title()}

**メッセージ**: {error.get('message', 'No message')[:100]}...

**検出日時**: {error.get('detected_at', 'N/A')}

'''

        markdown += f'''
## ✅ 最近の修復実行（上位5件）
'''

        recent_fixes = report_data["detailed_fixes"]["fixes_applied"][-5:]
        
        for i, fix in enumerate(recent_fixes, 1):
            status = fix.get('status', 'unknown').upper()
            status_emoji = "✅" if status == "COMPLETED" else "❌" if status == "FAILED" else "⏳"
            
            markdown += f'''
### {i}. {status_emoji} {fix.get('fix_type', 'unknown').replace('_', ' ').title()}

**説明**: {fix.get('description', 'No description')}

**ステータス**: {status}

**適用日時**: {fix.get('applied_at', 'N/A')}

'''

        markdown += f'''
---

*自動修復システム v1.0 | ITSM Backend Auto-Repair*
'''

        return markdown
    
    async def generate_summary_dashboard(self) -> Dict[str, Any]:
        """ダッシュボード用のサマリーデータを生成"""
        errors_data = await self._load_errors_data()
        fixes_data = await self._load_fixes_data()
        
        summary = self._analyze_repair_summary(errors_data, fixes_data)
        
        dashboard_data = {
            "system_health": {
                "status": "healthy" if summary.success_rate > 80 else "warning" if summary.success_rate > 50 else "critical",
                "success_rate": summary.success_rate,
                "total_errors": summary.total_errors,
                "errors_fixed": summary.errors_fixed
            },
            "recent_activity": {
                "last_check": errors_data.get("last_check"),
                "last_fix": fixes_data.get("last_fix"),
                "active_monitoring": True
            },
            "metrics": {
                "avg_fix_time": 0.0,  # 実装時に計算
                "error_detection_rate": summary.total_errors / 24,  # 1時間あたり
                "fix_success_rate": summary.success_rate
            },
            "alerts": self._generate_alerts(summary, errors_data, fixes_data)
        }
        
        return dashboard_data
    
    def _generate_alerts(self, summary: RepairSummary, errors_data: Dict, fixes_data: Dict) -> List[Dict[str, str]]:
        """アラート情報を生成"""
        alerts = []
        
        if summary.success_rate < 50:
            alerts.append({
                "level": "critical",
                "message": f"修復成功率が低下しています: {summary.success_rate:.1f}%",
                "action": "修復ロジックの見直しが必要です"
            })
        
        if summary.total_errors > 50:
            alerts.append({
                "level": "warning",
                "message": f"エラー数が多発しています: {summary.total_errors}件",
                "action": "システムの根本的な問題を確認してください"
            })
        
        if summary.errors_pending > 10:
            alerts.append({
                "level": "info",
                "message": f"未修復のエラーが蓄積されています: {summary.errors_pending}件",
                "action": "手動での確認・修復を検討してください"
            })
        
        return alerts


# 使用例
async def main():
    """メイン実行関数"""
    reporter = RepairReporter("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem")
    
    # 包括的レポート生成
    result = await reporter.generate_comprehensive_report()
    print("レポート生成完了:")
    print(f"HTML: {result['html_path']}")
    print(f"JSON: {result['json_path']}")
    print(f"Markdown: {result['markdown_path']}")
    
    # ダッシュボードデータ生成
    dashboard = await reporter.generate_summary_dashboard()
    print("ダッシュボードデータ:", json.dumps(dashboard, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main())
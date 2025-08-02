#!/usr/bin/env python3
"""
テストレポート生成システム
- 自動テスト結果の包括的レポート生成
- HTML、JSON、Markdown形式での出力
- CI/CD連携とマネージャー向けサマリー
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import sys
import os
import base64

class TestReportGenerator:
    """テストレポート生成クラス"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent.parent
        self.report_data = {}
        self.templates = self.load_templates()

    def load_templates(self) -> Dict[str, str]:
        """HTMLテンプレート読み込み"""
        return {
            "html_template": """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Actions自動化システム テストレポート</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #007bff;
            margin-bottom: 10px;
        }
        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
        }
        .status-pass { background-color: #d4edda; color: #155724; }
        .status-fail { background-color: #f8d7da; color: #721c24; }
        .status-warn { background-color: #fff3cd; color: #856404; }
        .status-error { background-color: #f8d7da; color: #721c24; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .summary-card .metric {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
        }
        
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 24px;
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .test-suite {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .test-suite-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .test-suite-title {
            font-size: 18px;
            font-weight: bold;
            color: #495057;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            transition: width 0.3s ease;
        }
        
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .details-table th,
        .details-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        .details-table th {
            background-color: #e9ecef;
            font-weight: bold;
            color: #495057;
        }
        
        .recommendations {
            background: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 20px;
            border-radius: 0 8px 8px 0;
        }
        .recommendations h3 {
            margin-top: 0;
            color: #007bff;
        }
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin-bottom: 8px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            .summary-grid {
                grid-template-columns: 1fr;
            }
            .test-suite-header {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GitHub Actions自動化システム</h1>
            <h2>統合テストレポート</h2>
            <div class="status-badge status-{overall_status_class}">{overall_status}</div>
            <p>実行日時: {execution_time} | 実行時間: {duration}</p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card">
                <h3>総テスト数</h3>
                <div class="metric">{total_tests}</div>
            </div>
            <div class="summary-card">
                <h3>成功</h3>
                <div class="metric" style="color: #28a745;">{passed_tests}</div>
            </div>
            <div class="summary-card">
                <h3>失敗</h3>
                <div class="metric" style="color: #dc3545;">{failed_tests}</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="metric" style="color: #007bff;">{success_rate}</div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">品質ゲート結果</h2>
            {quality_gates_html}
        </div>
        
        <div class="section">
            <h2 class="section-title">テストスイート詳細</h2>
            {test_suites_html}
        </div>
        
        <div class="section">
            <h2 class="section-title">改善提案</h2>
            <div class="recommendations">
                <h3>🎯 推奨アクション</h3>
                {recommendations_html}
            </div>
        </div>
        
        <div class="footer">
            <p>🤖 Generated with Claude Code | GitHub Actions自動化システム v1.0</p>
            <p>Generated at: {generation_time}</p>
        </div>
    </div>
</body>
</html>
"""
        }

    def generate_html_report(self, report_data: Dict[str, Any]) -> str:
        """HTMLレポート生成"""
        # ステータスクラスマッピング
        status_class_map = {
            "PASS": "pass",
            "FAIL": "fail", 
            "WARN": "warn",
            "ERROR": "error"
        }
        
        # 基本メトリクス
        executive_summary = report_data.get("executive_summary", {})
        overall_status = executive_summary.get("overall_status", "UNKNOWN")
        total_tests = executive_summary.get("total_tests", 0)
        passed_tests = executive_summary.get("passed_tests", 0)
        failed_tests = executive_summary.get("failed_tests", 0)
        success_rate = executive_summary.get("success_rate", 0)
        
        # 実行時間の計算
        duration_seconds = report_data.get("report_metadata", {}).get("duration_seconds", 0)
        duration_str = f"{duration_seconds:.1f}秒"
        if duration_seconds > 60:
            minutes = duration_seconds // 60
            seconds = duration_seconds % 60
            duration_str = f"{minutes:.0f}分{seconds:.0f}秒"
        
        # 品質ゲートHTML生成
        quality_gates_html = self.generate_quality_gates_html(report_data.get("quality_gates", {}))
        
        # テストスイートHTML生成
        test_suites_html = self.generate_test_suites_html(report_data.get("test_suites", {}))
        
        # 改善提案HTML生成
        recommendations = report_data.get("recommendations", [])
        recommendations_html = "<ul>"
        for rec in recommendations:
            recommendations_html += f"<li>{rec}</li>"
        recommendations_html += "</ul>"
        
        if not recommendations:
            recommendations_html = "<p>現在のところ、改善提案はありません。優秀な結果です！</p>"
        
        # テンプレート変数置換（safer approach）
        html_template = self.templates["html_template"]
        html_content = html_template.replace("{overall_status}", overall_status)
        html_content = html_content.replace("{overall_status_class}", status_class_map.get(overall_status, "error"))
        html_content = html_content.replace("{execution_time}", report_data.get("report_metadata", {}).get("generated_at", "N/A"))
        html_content = html_content.replace("{duration}", duration_str)
        html_content = html_content.replace("{total_tests}", str(total_tests))
        html_content = html_content.replace("{passed_tests}", str(passed_tests))
        html_content = html_content.replace("{failed_tests}", str(failed_tests))
        html_content = html_content.replace("{success_rate}", f"{success_rate:.1%}")
        html_content = html_content.replace("{quality_gates_html}", quality_gates_html)
        html_content = html_content.replace("{test_suites_html}", test_suites_html)
        html_content = html_content.replace("{recommendations_html}", recommendations_html)
        html_content = html_content.replace("{generation_time}", datetime.now().isoformat())
        
        return html_content

    def generate_quality_gates_html(self, quality_gates: Dict[str, Any]) -> str:
        """品質ゲートHTML生成"""
        if not quality_gates or "checks" not in quality_gates:
            return "<p>品質ゲート情報がありません。</p>"
        
        html = '<div class="details-table-container">'
        html += '<table class="details-table">'
        html += '<tr><th>品質ゲート</th><th>基準</th><th>実際の値</th><th>ステータス</th></tr>'
        
        for check in quality_gates["checks"]:
            status = check.get("status", "UNKNOWN")
            status_emoji = "✅" if status == "PASS" else "⚠️" if status == "WARN" else "❌"
            
            html += f'<tr>'
            html += f'<td>{check.get("gate", "N/A")}</td>'
            html += f'<td>{check.get("threshold", "N/A")}</td>'
            html += f'<td>{check.get("actual", "N/A")}</td>'
            html += f'<td>{status_emoji} {status}</td>'
            html += f'</tr>'
        
        html += '</table></div>'
        return html

    def generate_test_suites_html(self, test_suites: Dict[str, Any]) -> str:
        """テストスイートHTML生成"""
        if not test_suites:
            return "<p>テストスイート情報がありません。</p>"
        
        html = ""
        
        for suite_name, suite_data in test_suites.items():
            if not isinstance(suite_data, dict):
                continue
                
            suite_title = suite_data.get("test_suite", suite_name)
            status = suite_data.get("status", "UNKNOWN")
            
            # ステータスバッジ
            status_class = {
                "PASS": "status-pass",
                "FAIL": "status-fail", 
                "WARN": "status-warn",
                "ERROR": "status-error",
                "SKIP": "status-warn"
            }.get(status, "status-error")
            
            html += '<div class="test-suite">'
            html += '<div class="test-suite-header">'
            html += f'<div class="test-suite-title">{suite_title}</div>'
            html += f'<div class="status-badge {status_class}">{status}</div>'
            html += '</div>'
            
            # 成功率バー（該当する場合）
            if "total_tests" in suite_data and suite_data["total_tests"] > 0:
                success_rate = suite_data.get("passed", 0) / suite_data["total_tests"]
                html += f'<div class="progress-bar">'
                html += f'<div class="progress-fill" style="width: {success_rate * 100}%"></div>'
                html += f'</div>'
                html += f'<p>成功率: {success_rate:.1%} ({suite_data.get("passed", 0)}/{suite_data["total_tests"]})</p>'
            
            # 詳細情報
            if "message" in suite_data:
                html += f'<p><strong>メッセージ:</strong> {suite_data["message"]}</p>'
            
            if "duration" in suite_data:
                html += f'<p><strong>実行時間:</strong> {suite_data["duration"]:.1f}秒</p>'
            
            html += '</div>'
        
        return html

    def generate_manager_summary(self, report_data: Dict[str, Any]) -> str:
        """マネージャー向けサマリー生成"""
        executive_summary = report_data.get("executive_summary", {})
        quality_gates = report_data.get("quality_gates", {})
        
        summary = f"""
# GitHub Actions自動化システム - マネージャーサマリー

## 📊 実行概要
- **実行日時**: {report_data.get('report_metadata', {}).get('generated_at', 'N/A')}
- **全体ステータス**: {executive_summary.get('overall_status', 'UNKNOWN')}
- **テスト成功率**: {executive_summary.get('success_rate', 0):.1%}

## 🎯 品質評価
- **総テスト数**: {executive_summary.get('total_tests', 0)}
- **成功**: {executive_summary.get('passed_tests', 0)}
- **失敗**: {executive_summary.get('failed_tests', 0)}
- **エラー**: {executive_summary.get('error_tests', 0)}

## 🚪 リリース判定
"""
        
        overall_status = quality_gates.get("overall_status", "UNKNOWN")
        if overall_status == "PASS":
            summary += """
**✅ リリース承認**
- すべての品質ゲートをクリア
- 本番環境へのデプロイを推奨
"""
        elif overall_status == "WARN":
            summary += """
**⚠️ 条件付きリリース承認**
- 一部警告はあるが、リリース可能
- 詳細調査を推奨
"""
        else:
            summary += """
**❌ リリース保留**
- 品質ゲート失敗により修正が必要
- 本番デプロイは推奨されません
"""
        
        # 改善提案があれば追加
        recommendations = report_data.get("recommendations", [])
        if recommendations:
            summary += "\n## 🔧 改善提案\n"
            for i, rec in enumerate(recommendations, 1):
                summary += f"{i}. {rec}\n"
        
        summary += f"\n---\n*レポート生成時刻: {datetime.now().isoformat()}*\n"
        
        return summary

    def generate_ci_cd_artifact(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """CI/CD連携用アーティファクト生成"""
        executive_summary = report_data.get("executive_summary", {})
        quality_gates = report_data.get("quality_gates", {})
        
        artifact = {
            "build_metadata": {
                "timestamp": datetime.now().isoformat(),
                "report_version": "1.0",
                "system": "github_actions_automation"
            },
            "quality_assessment": {
                "overall_status": quality_gates.get("overall_status", "UNKNOWN"),
                "success_rate": executive_summary.get("success_rate", 0),
                "total_tests": executive_summary.get("total_tests", 0),
                "critical_failures": executive_summary.get("error_tests", 0)
            },
            "deployment_recommendation": {
                "approved": quality_gates.get("overall_status") == "PASS",
                "risk_level": self.calculate_risk_level(report_data),
                "manual_review_required": quality_gates.get("overall_status") in ["FAIL", "ERROR"]
            },
            "test_coverage": self.extract_test_coverage(report_data),
            "performance_metrics": self.extract_performance_metrics(report_data)
        }
        
        return artifact

    def calculate_risk_level(self, report_data: Dict[str, Any]) -> str:
        """リスクレベル計算"""
        executive_summary = report_data.get("executive_summary", {})
        success_rate = executive_summary.get("success_rate", 0)
        error_tests = executive_summary.get("error_tests", 0)
        
        if success_rate >= 0.95 and error_tests == 0:
            return "LOW"
        elif success_rate >= 0.80 and error_tests <= 1:
            return "MEDIUM"
        else:
            return "HIGH"

    def extract_test_coverage(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """テストカバレッジ情報抽出"""
        test_suites = report_data.get("test_suites", {})
        
        coverage = {
            "api_tests": "github_actions" in test_suites,
            "integration_tests": "pytest_integration" in test_suites,
            "e2e_tests": "playwright_e2e" in test_suites,
            "performance_tests": "load_performance" in test_suites,
            "health_checks": "api_health" in test_suites
        }
        
        coverage["overall_coverage"] = sum(coverage.values()) / len(coverage)
        
        return coverage

    def extract_performance_metrics(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """パフォーマンスメトリクス抽出"""
        duration = report_data.get("report_metadata", {}).get("duration_seconds", 0)
        
        performance = {
            "total_execution_time": duration,
            "average_test_time": duration / max(report_data.get("executive_summary", {}).get("total_tests", 1), 1),
            "performance_grade": "A" if duration < 300 else "B" if duration < 600 else "C"
        }
        
        # 負荷テスト結果があれば追加
        load_performance = report_data.get("test_suites", {}).get("load_performance", {})
        if "performance_results" in load_performance:
            performance["load_test_results"] = load_performance["performance_results"]
        
        return performance

    def save_all_reports(self, report_data: Dict[str, Any]) -> Dict[str, str]:
        """全形式のレポート保存"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        reports_dir = self.base_path / "reports"
        reports_dir.mkdir(exist_ok=True)
        
        saved_files = {}
        
        # HTMLレポート
        html_content = self.generate_html_report(report_data)
        html_file = reports_dir / f"github_actions_automation_report_{timestamp}.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        saved_files["html"] = str(html_file)
        
        # JSONレポート（詳細）
        json_file = reports_dir / f"github_actions_automation_report_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        saved_files["json"] = str(json_file)
        
        # マネージャーサマリー
        manager_summary = self.generate_manager_summary(report_data)
        manager_file = reports_dir / f"manager_summary_{timestamp}.md"
        with open(manager_file, 'w', encoding='utf-8') as f:
            f.write(manager_summary)
        saved_files["manager_summary"] = str(manager_file)
        
        # CI/CDアーティファクト
        ci_cd_artifact = self.generate_ci_cd_artifact(report_data)
        artifact_file = reports_dir / f"ci_cd_artifact_{timestamp}.json"
        with open(artifact_file, 'w', encoding='utf-8') as f:
            json.dump(ci_cd_artifact, f, indent=2, ensure_ascii=False)
        saved_files["ci_cd_artifact"] = str(artifact_file)
        
        return saved_files

    def print_summary_to_console(self, report_data: Dict[str, Any]):
        """コンソールサマリー出力"""
        print("\n" + "="*80)
        print("📊 GITHUB ACTIONS自動化システム テストレポート")
        print("="*80)
        
        executive_summary = report_data.get("executive_summary", {})
        quality_gates = report_data.get("quality_gates", {})
        
        # 基本メトリクス
        print(f"実行日時: {report_data.get('report_metadata', {}).get('generated_at', 'N/A')}")
        print(f"実行時間: {report_data.get('report_metadata', {}).get('duration_seconds', 0):.1f}秒")
        print(f"全体ステータス: {executive_summary.get('overall_status', 'UNKNOWN')}")
        print()
        
        # テスト結果
        print("📈 テスト結果:")
        print(f"  総テスト数: {executive_summary.get('total_tests', 0)}")
        print(f"  ✅ 成功: {executive_summary.get('passed_tests', 0)}")
        print(f"  ❌ 失敗: {executive_summary.get('failed_tests', 0)}")
        print(f"  💥 エラー: {executive_summary.get('error_tests', 0)}")
        print(f"  📊 成功率: {executive_summary.get('success_rate', 0):.1%}")
        print()
        
        # 品質ゲート
        print("🚪 品質ゲート結果:")
        for check in quality_gates.get("checks", []):
            status_emoji = "✅" if check["status"] == "PASS" else "⚠️" if check["status"] == "WARN" else "❌"
            print(f"  {status_emoji} {check['gate']}: {check['actual']}")
        print()
        
        # 最終判定
        overall_status = quality_gates.get("overall_status", "UNKNOWN")
        if overall_status == "PASS":
            print("🎉 結果: リリース承認 - 本番デプロイ可能")
        elif overall_status == "WARN":
            print("⚠️ 結果: 条件付き承認 - 注意してデプロイ")
        else:
            print("❌ 結果: リリース保留 - 修正が必要")
        
        print("="*80)


def main():
    """テスト実行"""
    generator = TestReportGenerator()
    
    # サンプルレポートデータ
    sample_report = {
        "report_metadata": {
            "generated_at": datetime.now().isoformat(),
            "duration_seconds": 245.5,
            "test_environment": "integration",
            "report_version": "1.0"
        },
        "executive_summary": {
            "overall_status": "PASS",
            "total_test_suites": 5,
            "total_tests": 25,
            "passed_tests": 23,
            "failed_tests": 1,
            "error_tests": 0,
            "success_rate": 0.92
        },
        "quality_gates": {
            "overall_status": "PASS",
            "checks": [
                {
                    "gate": "Minimum Success Rate",
                    "threshold": ">= 80%",
                    "actual": "92%",
                    "status": "PASS"
                },
                {
                    "gate": "Maximum Duration",
                    "threshold": "<= 15 minutes",
                    "actual": "4.1 minutes",
                    "status": "PASS"
                }
            ]
        },
        "test_suites": {
            "github_actions": {
                "test_suite": "GitHub Actions Test Suite",
                "status": "PASS",
                "total_tests": 8,
                "passed": 8,
                "failed": 0,
                "success_rate": 1.0
            },
            "pytest_integration": {
                "test_suite": "Pytest Integration Suite", 
                "status": "PASS",
                "total_tests": 15,
                "passed": 14,
                "failed": 1,
                "success_rate": 0.93
            }
        },
        "recommendations": [
            "1つのテスト失敗があります。詳細な調査を推奨します。",
            "全体的に優秀な結果です。この品質を維持してください。"
        ]
    }
    
    print("🧪 Testing Report Generator...")
    
    # 全形式のレポート生成
    saved_files = generator.save_all_reports(sample_report)
    
    print("📄 Generated reports:")
    for format_type, file_path in saved_files.items():
        print(f"  {format_type}: {file_path}")
    
    # コンソールサマリー出力
    generator.print_summary_to_console(sample_report)


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Consolidated test report generator for ITSM system
Generates HTML and Markdown reports from test results
"""
import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import sys


class TestReportGenerator:
    """Generate consolidated test reports"""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def collect_report_data(self) -> Dict[str, Any]:
        """Collect all test data from report files"""
        report_data = {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "skipped_tests": 0,
                "success_rate": 0.0,
                "total_duration": 0.0
            },
            "suites": {},
            "performance": {},
            "coverage": {}
        }
        
        # Collect pytest JSON reports
        for json_file in self.input_dir.glob("*-report.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    suite_name = json_file.stem.replace('-report', '')
                    report_data["suites"][suite_name] = self._process_pytest_report(data)
            except (json.JSONDecodeError, FileNotFoundError) as e:
                print(f"Warning: Could not process {json_file}: {e}")
        
        # Collect benchmark data
        benchmark_files = list(self.input_dir.glob("*benchmark*.json"))
        if benchmark_files:
            try:
                with open(benchmark_files[0], 'r') as f:
                    benchmark_data = json.load(f)
                    report_data["performance"]["benchmarks"] = self._process_benchmark_data(benchmark_data)
            except Exception as e:
                print(f"Warning: Could not process benchmark data: {e}")
        
        # Collect coverage data
        coverage_files = list(self.input_dir.glob("coverage*.json"))
        if coverage_files:
            try:
                with open(coverage_files[0], 'r') as f:
                    coverage_data = json.load(f)
                    report_data["coverage"] = self._process_coverage_data(coverage_data)
            except Exception as e:
                print(f"Warning: Could not process coverage data: {e}")
        
        # Calculate summary
        report_data["summary"] = self._calculate_summary(report_data["suites"])
        
        return report_data
    
    def _process_pytest_report(self, data: Dict) -> Dict[str, Any]:
        """Process pytest JSON report data"""
        if isinstance(data, dict) and "summary" in data:
            summary = data["summary"]
            return {
                "total": summary.get("total", 0),
                "passed": summary.get("passed", 0),
                "failed": summary.get("failed", 0),
                "skipped": summary.get("skipped", 0),
                "duration": data.get("duration", 0),
                "success_rate": (summary.get("passed", 0) / max(summary.get("total", 1), 1)) * 100
            }
        else:
            # Handle other pytest report formats
            return {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "duration": 0,
                "success_rate": 0
            }
    
    def _process_benchmark_data(self, data: Dict) -> Dict[str, Any]:
        """Process benchmark data"""
        benchmarks = []
        
        if "benchmarks" in data:
            for bench in data["benchmarks"]:
                benchmarks.append({
                    "name": bench.get("name", ""),
                    "min": bench.get("stats", {}).get("min", 0),
                    "max": bench.get("stats", {}).get("max", 0),
                    "mean": bench.get("stats", {}).get("mean", 0),
                    "median": bench.get("stats", {}).get("median", 0),
                    "ops": bench.get("stats", {}).get("ops", 0),
                    "rounds": bench.get("stats", {}).get("rounds", 0)
                })
        
        return {
            "total_benchmarks": len(benchmarks),
            "benchmarks": benchmarks
        }
    
    def _process_coverage_data(self, data: Dict) -> Dict[str, Any]:
        """Process coverage data"""
        return {
            "percent_covered": data.get("totals", {}).get("percent_covered", 0),
            "num_statements": data.get("totals", {}).get("num_statements", 0),
            "missing_lines": data.get("totals", {}).get("missing_lines", 0),
            "covered_lines": data.get("totals", {}).get("covered_lines", 0)
        }
    
    def _calculate_summary(self, suites: Dict) -> Dict[str, Any]:
        """Calculate overall summary from all test suites"""
        total_tests = sum(suite.get("total", 0) for suite in suites.values())
        passed_tests = sum(suite.get("passed", 0) for suite in suites.values())
        failed_tests = sum(suite.get("failed", 0) for suite in suites.values())
        skipped_tests = sum(suite.get("skipped", 0) for suite in suites.values())
        total_duration = sum(suite.get("duration", 0) for suite in suites.values())
        
        success_rate = (passed_tests / max(total_tests, 1)) * 100
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "skipped_tests": skipped_tests,
            "success_rate": round(success_rate, 2),
            "total_duration": round(total_duration, 2)
        }
    
    def generate_html_report(self, data: Dict[str, Any]) -> str:
        """Generate HTML report"""
        html_content = f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ITSM テストレポート</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; margin-bottom: 30px; color: #333; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
        .metric {{ background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }}
        .metric.success {{ border-left-color: #28a745; }}
        .metric.warning {{ border-left-color: #ffc107; }}
        .metric.danger {{ border-left-color: #dc3545; }}
        .metric-value {{ font-size: 2em; font-weight: bold; color: #333; }}
        .metric-label {{ color: #666; margin-top: 5px; }}
        .section {{ margin-bottom: 30px; }}
        .section h3 {{ color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #f8f9fa; font-weight: bold; }}
        .status-passed {{ color: #28a745; font-weight: bold; }}
        .status-failed {{ color: #dc3545; font-weight: bold; }}
        .progress-bar {{ width: 100%; height: 20px; background-color: #e9ecef; border-radius: 10px; overflow: hidden; }}
        .progress-fill {{ height: 100%; background-color: #28a745; transition: width 0.3s ease; }}
        .timestamp {{ color: #666; font-size: 0.9em; text-align: center; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 ITSM システム テストレポート</h1>
            <p>包括的なテスト実行結果とパフォーマンス分析</p>
        </div>
        
        <div class="summary">
            <div class="metric {'success' if data['summary']['success_rate'] >= 95 else 'warning' if data['summary']['success_rate'] >= 80 else 'danger'}">
                <div class="metric-value">{data['summary']['success_rate']:.1f}%</div>
                <div class="metric-label">成功率</div>
            </div>
            <div class="metric">
                <div class="metric-value">{data['summary']['total_tests']}</div>
                <div class="metric-label">総テスト数</div>
            </div>
            <div class="metric success">
                <div class="metric-value">{data['summary']['passed_tests']}</div>
                <div class="metric-label">成功テスト</div>
            </div>
            <div class="metric {'danger' if data['summary']['failed_tests'] > 0 else ''}">
                <div class="metric-value">{data['summary']['failed_tests']}</div>
                <div class="metric-label">失敗テスト</div>
            </div>
            <div class="metric">
                <div class="metric-value">{data['summary']['total_duration']:.1f}s</div>
                <div class="metric-label">実行時間</div>
            </div>
        </div>

        <div class="section">
            <h3>📊 テストスイート別結果</h3>
            <table>
                <thead>
                    <tr>
                        <th>スイート名</th>
                        <th>総数</th>
                        <th>成功</th>
                        <th>失敗</th>
                        <th>スキップ</th>
                        <th>成功率</th>
                        <th>実行時間</th>
                    </tr>
                </thead>
                <tbody>"""
        
        for suite_name, suite_data in data["suites"].items():
            success_rate = suite_data.get("success_rate", 0)
            status_class = "status-passed" if success_rate >= 95 else "status-failed" if success_rate < 80 else ""
            
            html_content += f"""
                    <tr>
                        <td><strong>{suite_name}</strong></td>
                        <td>{suite_data.get('total', 0)}</td>
                        <td class="status-passed">{suite_data.get('passed', 0)}</td>
                        <td class="{'status-failed' if suite_data.get('failed', 0) > 0 else ''}">{suite_data.get('failed', 0)}</td>
                        <td>{suite_data.get('skipped', 0)}</td>
                        <td class="{status_class}">{success_rate:.1f}%</td>
                        <td>{suite_data.get('duration', 0):.2f}s</td>
                    </tr>"""
        
        html_content += """
                </tbody>
            </table>
        </div>"""
        
        # Performance section
        if "benchmarks" in data.get("performance", {}):
            html_content += """
        <div class="section">
            <h3>⚡ パフォーマンス ベンチマーク</h3>
            <table>
                <thead>
                    <tr>
                        <th>ベンチマーク名</th>
                        <th>平均時間</th>
                        <th>最小時間</th>
                        <th>最大時間</th>
                        <th>OPS</th>
                        <th>ラウンド数</th>
                    </tr>
                </thead>
                <tbody>"""
            
            for bench in data["performance"]["benchmarks"]["benchmarks"]:
                html_content += f"""
                    <tr>
                        <td>{bench['name']}</td>
                        <td>{bench['mean']:.6f}s</td>
                        <td>{bench['min']:.6f}s</td>
                        <td>{bench['max']:.6f}s</td>
                        <td>{bench['ops']:.2f}</td>
                        <td>{bench['rounds']}</td>
                    </tr>"""
            
            html_content += """
                </tbody>
            </table>
        </div>"""
        
        # Coverage section
        if data.get("coverage"):
            coverage_percent = data["coverage"].get("percent_covered", 0)
            html_content += f"""
        <div class="section">
            <h3>📈 コードカバレッジ</h3>
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>カバレッジ率</span>
                    <span><strong>{coverage_percent:.1f}%</strong></span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {coverage_percent}%;"></div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                <div>総ステートメント数: <strong>{data['coverage'].get('num_statements', 0)}</strong></div>
                <div>カバー済み行数: <strong>{data['coverage'].get('covered_lines', 0)}</strong></div>
                <div>未カバー行数: <strong>{data['coverage'].get('missing_lines', 0)}</strong></div>
            </div>
        </div>"""
        
        html_content += f"""
        <div class="timestamp">
            レポート生成日時: {data['generated_at']}
        </div>
    </div>
</body>
</html>"""
        
        return html_content
    
    def generate_markdown_report(self, data: Dict[str, Any]) -> str:
        """Generate Markdown report"""
        md_content = f"""# 🧪 ITSM システム テストレポート

**生成日時:** {data['generated_at']}

## 📊 実行サマリー

| 項目 | 値 |
|------|-----|
| **総テスト数** | {data['summary']['total_tests']} |
| **成功テスト** | {data['summary']['passed_tests']} |
| **失敗テスト** | {data['summary']['failed_tests']} |
| **スキップテスト** | {data['summary']['skipped_tests']} |
| **成功率** | {data['summary']['success_rate']:.2f}% |
| **総実行時間** | {data['summary']['total_duration']:.2f}秒 |

## 🎯 品質ゲート判定

"""
        
        # Quality gate assessment
        success_rate = data['summary']['success_rate']
        if success_rate >= 95:
            md_content += "✅ **PASS** - 全ての品質基準を満たしています\n\n"
        elif success_rate >= 80:
            md_content += "⚠️ **WARNING** - 一部品質基準を満たしていません\n\n"
        else:
            md_content += "❌ **FAIL** - 品質基準を満たしていません。リリース不可\n\n"
        
        # Test suites
        md_content += "## 📋 テストスイート別結果\n\n"
        md_content += "| スイート | 総数 | 成功 | 失敗 | スキップ | 成功率 | 実行時間 |\n"
        md_content += "|----------|------|------|------|----------|---------|----------|\n"
        
        for suite_name, suite_data in data["suites"].items():
            success_icon = "✅" if suite_data.get("success_rate", 0) >= 95 else "⚠️" if suite_data.get("success_rate", 0) >= 80 else "❌"
            md_content += f"| {success_icon} {suite_name} | {suite_data.get('total', 0)} | {suite_data.get('passed', 0)} | {suite_data.get('failed', 0)} | {suite_data.get('skipped', 0)} | {suite_data.get('success_rate', 0):.1f}% | {suite_data.get('duration', 0):.2f}s |\n"
        
        # Performance benchmarks
        if "benchmarks" in data.get("performance", {}):
            md_content += "\n## ⚡ パフォーマンス ベンチマーク\n\n"
            md_content += "| ベンチマーク名 | 平均時間 | 最小時間 | 最大時間 | OPS | ラウンド数 |\n"
            md_content += "|----------------|-----------|-----------|-----------|-----|------------|\n"
            
            for bench in data["performance"]["benchmarks"]["benchmarks"]:
                md_content += f"| {bench['name']} | {bench['mean']:.6f}s | {bench['min']:.6f}s | {bench['max']:.6f}s | {bench['ops']:.2f} | {bench['rounds']} |\n"
        
        # Coverage
        if data.get("coverage"):
            coverage = data["coverage"]
            md_content += f"\n## 📈 コードカバレッジ\n\n"
            md_content += f"- **カバレッジ率:** {coverage.get('percent_covered', 0):.1f}%\n"
            md_content += f"- **総ステートメント数:** {coverage.get('num_statements', 0)}\n"
            md_content += f"- **カバー済み行数:** {coverage.get('covered_lines', 0)}\n"
            md_content += f"- **未カバー行数:** {coverage.get('missing_lines', 0)}\n"
        
        md_content += "\n---\n\n*このレポートは自動生成されました。*\n"
        
        return md_content
    
    def generate_json_summary(self, data: Dict[str, Any]) -> str:
        """Generate JSON summary for manager"""
        summary = {
            "test_execution_summary": {
                "generated_at": data["generated_at"],
                "overall_status": "PASS" if data["summary"]["success_rate"] >= 95 else "FAIL",
                "quality_gate_result": {
                    "passed": data["summary"]["success_rate"] >= 95,
                    "success_rate": data["summary"]["success_rate"],
                    "threshold": 95.0
                },
                "metrics": data["summary"],
                "suite_results": data["suites"],
                "recommendations": self._generate_recommendations(data)
            }
        }
        
        return json.dumps(summary, indent=2, ensure_ascii=False)
    
    def _generate_recommendations(self, data: Dict[str, Any]) -> List[str]:
        """Generate comprehensive recommendations based on test results"""
        recommendations = []
        
        success_rate = data["summary"]["success_rate"]
        total_duration = data["summary"]["total_duration"]
        
        # Test success rate recommendations
        if success_rate < 95:
            if success_rate < 50:
                recommendations.append("🚨 CRITICAL: テスト成功率が50%を下回っています。即座に修正が必要です。")
            elif success_rate < 80:
                recommendations.append("⚠️ テスト成功率が80%を下回っています。品質ゲート不合格です。")
            else:
                recommendations.append("📈 テスト成功率が95%を下回っています。安定性向上のため修正推奨です。")
        
        # Failed tests
        failed_count = data["summary"]["failed_tests"]
        if failed_count > 0:
            if failed_count > 10:
                recommendations.append(f"🔥 {failed_count}件の大量のテスト失敗が発生しています。優先度高で対応してください。")
            else:
                recommendations.append(f"🐛 {failed_count}件のテストが失敗しています。詳細なログを確認してください。")
        
        # Performance recommendations
        if total_duration > 300:  # 5 minutes
            recommendations.append("⏰ テスト実行時間が5分を超えています。テストの並列化や最適化を検討してください。")
        elif total_duration > 600:  # 10 minutes
            recommendations.append("🐌 テスト実行時間が10分を超えています。CI/CDパイプラインの効率化が必要です。")
        
        # Suite-specific recommendations
        critical_suites = ["api", "unit", "e2e"]
        for suite_name, suite_data in data["suites"].items():
            suite_success_rate = suite_data.get("success_rate", 0)
            suite_duration = suite_data.get("duration", 0)
            
            if suite_success_rate < 80:
                if suite_name in critical_suites:
                    recommendations.append(f"🚫 {suite_name}スイート（クリティカル）の成功率が{suite_success_rate:.1f}%です。即座に修正してください。")
                else:
                    recommendations.append(f"⚠️ {suite_name}スイートの成功率が{suite_success_rate:.1f}%です。優先的に修正してください。")
            
            # Suite performance
            if suite_name == "unit" and suite_duration > 60:
                recommendations.append(f"⚡ ユニットテストの実行時間が{suite_duration:.1f}秒です。1分以内を目標に最適化してください。")
            elif suite_name == "e2e" and suite_duration > 300:
                recommendations.append(f"🎭 E2Eテストの実行時間が{suite_duration:.1f}秒です。並列実行や選択的実行を検討してください。")
        
        # Coverage recommendations (if available)
        if data.get("coverage"):
            coverage_percent = data["coverage"].get("percent_covered", 0)
            if coverage_percent < 60:
                recommendations.append(f"📊 コードカバレッジが{coverage_percent:.1f}%です。最低60%を目標にテストを追加してください。")
            elif coverage_percent < 80:
                recommendations.append(f"📈 コードカバレッジが{coverage_percent:.1f}%です。80%を目標にカバレッジを向上させてください。")
        
        # Performance benchmark recommendations
        if "benchmarks" in data.get("performance", {}):
            slow_benchmarks = []
            for bench in data["performance"]["benchmarks"]["benchmarks"]:
                if bench.get("mean", 0) > 1.0:  # Slower than 1 second
                    slow_benchmarks.append(f"{bench['name']} ({bench['mean']:.3f}s)")
            
            if slow_benchmarks:
                recommendations.append(f"🐌 実行時間の長いベンチマーク: {', '.join(slow_benchmarks[:3])}{'...' if len(slow_benchmarks) > 3 else ''}")
        
        # Overall health assessment
        if not recommendations:
            if success_rate == 100:
                recommendations.append("🎉 完璧！全てのテストが成功し、品質基準を満たしています。")
            elif success_rate >= 98:
                recommendations.append("✨ 優秀！高品質を維持しています。現在の水準を継続してください。")
            else:
                recommendations.append("✅ 良好！全ての品質基準を満たしています。")
        
        # Add proactive suggestions
        if success_rate >= 95:
            recommendations.append("💡 提案: テスト自動化の拡張やパフォーマンステストの追加を検討してください。")
        
        return recommendations
    
    def generate_reports(self):
        """Generate all report formats"""
        print("📊 テストレポートデータを収集中...")
        data = self.collect_report_data()
        
        print("📝 HTMLレポートを生成中...")
        html_report = self.generate_html_report(data)
        html_path = self.output_dir / "report.html"
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_report)
        
        print("📋 Markdownレポートを生成中...")
        md_report = self.generate_markdown_report(data)
        md_path = self.output_dir / "report.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_report)
        
        print("📊 JSONサマリーを生成中...")
        json_summary = self.generate_json_summary(data)
        json_path = self.output_dir / "summary.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            f.write(json_summary)
        
        print(f"✅ レポート生成完了:")
        print(f"   - HTML: {html_path}")
        print(f"   - Markdown: {md_path}")
        print(f"   - JSON: {json_path}")
        
        return {
            "html_path": str(html_path),
            "markdown_path": str(md_path),
            "json_path": str(json_path),
            "data": data
        }


def main():
    parser = argparse.ArgumentParser(description="Generate consolidated test reports")
    parser.add_argument("--input-dir", required=True, help="Directory containing test report files")
    parser.add_argument("--output-dir", required=True, help="Directory to save generated reports")
    
    args = parser.parse_args()
    
    try:
        generator = TestReportGenerator(args.input_dir, args.output_dir)
        results = generator.generate_reports()
        
        # Return success
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ レポート生成エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
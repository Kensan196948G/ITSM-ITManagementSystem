#!/usr/bin/env python3
"""
Generate consolidated test reports for ITSM system
"""
import argparse
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
import matplotlib.pyplot as plt
import pandas as pd
from jinja2 import Template


class ITSMReportGenerator:
    """Generate comprehensive test reports"""
    
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.consolidated_data = {
            "generation_time": datetime.now().isoformat(),
            "test_suites": {},
            "summary": {},
            "quality_metrics": {},
            "performance_data": {},
            "trends": {}
        }
    
    def collect_test_results(self):
        """Collect test results from all report files"""
        print("📊 Collecting test results...")
        
        # Find all JSON report files
        json_files = list(self.input_dir.rglob("*-report.json"))
        
        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                # Extract suite name from filename
                suite_name = json_file.stem.replace("-report", "")
                self.consolidated_data["test_suites"][suite_name] = {
                    "report_file": str(json_file),
                    "data": data
                }
                
                print(f"✅ Collected {suite_name} results")
                
            except Exception as e:
                print(f"❌ Error reading {json_file}: {e}")
    
    def collect_coverage_data(self):
        """Collect code coverage data"""
        print("📈 Collecting coverage data...")
        
        coverage_files = list(self.input_dir.rglob("*-coverage.json"))
        coverage_data = {}
        
        for coverage_file in coverage_files:
            try:
                with open(coverage_file, 'r') as f:
                    data = json.load(f)
                
                suite_name = coverage_file.stem.replace("-coverage", "")
                coverage_data[suite_name] = data
                
                print(f"✅ Collected {suite_name} coverage")
                
            except Exception as e:
                print(f"❌ Error reading coverage {coverage_file}: {e}")
        
        self.consolidated_data["coverage"] = coverage_data
    
    def collect_benchmark_data(self):
        """Collect performance benchmark data"""
        print("⚡ Collecting performance data...")
        
        benchmark_files = list(self.input_dir.rglob("*-benchmark.json"))
        benchmark_data = {}
        
        for benchmark_file in benchmark_files:
            try:
                with open(benchmark_file, 'r') as f:
                    data = json.load(f)
                
                suite_name = benchmark_file.stem.replace("-benchmark", "")
                benchmark_data[suite_name] = data
                
                print(f"✅ Collected {suite_name} benchmarks")
                
            except Exception as e:
                print(f"❌ Error reading benchmark {benchmark_file}: {e}")
        
        self.consolidated_data["benchmarks"] = benchmark_data
    
    def calculate_summary_metrics(self):
        """Calculate overall summary metrics"""
        print("🧮 Calculating summary metrics...")
        
        total_tests = 0
        total_passed = 0
        total_failed = 0
        total_skipped = 0
        total_duration = 0.0
        
        suite_summaries = {}
        
        for suite_name, suite_data in self.consolidated_data["test_suites"].items():
            report = suite_data["data"]
            
            if "summary" in report:
                summary = report["summary"]
                suite_summary = {
                    "total": summary.get("total", 0),
                    "passed": summary.get("passed", 0),
                    "failed": summary.get("failed", 0),
                    "skipped": summary.get("skipped", 0),
                    "duration": summary.get("duration", 0.0),
                    "success_rate": 0.0
                }
                
                if suite_summary["total"] > 0:
                    suite_summary["success_rate"] = (
                        suite_summary["passed"] / suite_summary["total"] * 100
                    )
                
                suite_summaries[suite_name] = suite_summary
                
                total_tests += suite_summary["total"]
                total_passed += suite_summary["passed"]
                total_failed += suite_summary["failed"]
                total_skipped += suite_summary["skipped"]
                total_duration += suite_summary["duration"]
        
        # Calculate overall metrics
        overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0.0
        
        self.consolidated_data["summary"] = {
            "total_tests": total_tests,
            "passed": total_passed,
            "failed": total_failed,
            "skipped": total_skipped,
            "total_duration": total_duration,
            "success_rate": overall_success_rate,
            "overall_status": "PASSED" if total_failed == 0 else "FAILED",
            "suite_summaries": suite_summaries
        }
    
    def calculate_quality_metrics(self):
        """Calculate quality metrics"""
        print("🎯 Calculating quality metrics...")
        
        quality_metrics = {
            "test_coverage": {},
            "test_stability": {},
            "performance_metrics": {}
        }
        
        # Coverage metrics
        if "coverage" in self.consolidated_data:
            for suite_name, coverage_data in self.consolidated_data["coverage"].items():
                if "totals" in coverage_data:
                    totals = coverage_data["totals"]
                    quality_metrics["test_coverage"][suite_name] = {
                        "line_coverage": totals.get("percent_covered", 0),
                        "branch_coverage": totals.get("percent_covered_display", "N/A"),
                        "missing_lines": totals.get("missing_lines", 0),
                        "covered_lines": totals.get("covered_lines", 0),
                        "num_statements": totals.get("num_statements", 0)
                    }
        
        # Performance metrics from benchmarks
        if "benchmarks" in self.consolidated_data:
            for suite_name, benchmark_data in self.consolidated_data["benchmarks"].items():
                if "benchmarks" in benchmark_data:
                    benchmarks = benchmark_data["benchmarks"]
                    
                    if benchmarks:
                        # Calculate average performance metrics
                        mean_times = [b["stats"]["mean"] for b in benchmarks if "stats" in b]
                        max_times = [b["stats"]["max"] for b in benchmarks if "stats" in b]
                        
                        quality_metrics["performance_metrics"][suite_name] = {
                            "avg_response_time": sum(mean_times) / len(mean_times) if mean_times else 0,
                            "max_response_time": max(max_times) if max_times else 0,
                            "benchmark_count": len(benchmarks)
                        }
        
        self.consolidated_data["quality_metrics"] = quality_metrics
    
    def generate_charts(self):
        """Generate visualization charts"""
        print("📊 Generating charts...")
        
        charts_dir = self.output_dir / "charts"
        charts_dir.mkdir(exist_ok=True)
        
        # Test results pie chart
        summary = self.consolidated_data["summary"]
        
        if summary["total_tests"] > 0:
            plt.figure(figsize=(10, 6))
            
            # Pie chart for overall results
            plt.subplot(1, 2, 1)
            labels = ['Passed', 'Failed', 'Skipped']
            sizes = [summary["passed"], summary["failed"], summary["skipped"]]
            colors = ['#4CAF50', '#F44336', '#FF9800']
            
            # Remove empty categories
            labels_filtered = []
            sizes_filtered = []
            colors_filtered = []
            for i, size in enumerate(sizes):
                if size > 0:
                    labels_filtered.append(labels[i])
                    sizes_filtered.append(size)
                    colors_filtered.append(colors[i])
            
            if sizes_filtered:
                plt.pie(sizes_filtered, labels=labels_filtered, colors=colors_filtered, 
                       autopct='%1.1f%%', startangle=90)
                plt.title('Overall Test Results')
            
            # Bar chart for suite results
            plt.subplot(1, 2, 2)
            suite_names = []
            suite_passed = []
            suite_failed = []
            
            for suite_name, suite_summary in summary["suite_summaries"].items():
                suite_names.append(suite_name)
                suite_passed.append(suite_summary["passed"])
                suite_failed.append(suite_summary["failed"])
            
            if suite_names:
                x = range(len(suite_names))
                width = 0.35
                
                plt.bar([i - width/2 for i in x], suite_passed, width, 
                       label='Passed', color='#4CAF50')
                plt.bar([i + width/2 for i in x], suite_failed, width, 
                       label='Failed', color='#F44336')
                
                plt.xlabel('Test Suites')
                plt.ylabel('Number of Tests')
                plt.title('Test Results by Suite')
                plt.xticks(x, suite_names, rotation=45)
                plt.legend()
            
            plt.tight_layout()
            plt.savefig(charts_dir / "test_results.png", dpi=300, bbox_inches='tight')
            plt.close()
        
        # Coverage chart
        if "coverage" in self.consolidated_data and self.consolidated_data["coverage"]:
            plt.figure(figsize=(10, 6))
            
            suite_names = []
            coverage_percentages = []
            
            for suite_name, coverage_data in self.consolidated_data["coverage"].items():
                if "totals" in coverage_data:
                    suite_names.append(suite_name)
                    coverage_percentages.append(coverage_data["totals"].get("percent_covered", 0))
            
            if suite_names:
                bars = plt.bar(suite_names, coverage_percentages, color='#2196F3')
                plt.axhline(y=80, color='red', linestyle='--', alpha=0.7, label='Target (80%)')
                plt.xlabel('Test Suites')
                plt.ylabel('Coverage Percentage')
                plt.title('Code Coverage by Suite')
                plt.ylim(0, 100)
                plt.legend()
                
                # Add percentage labels on bars
                for bar, percentage in zip(bars, coverage_percentages):
                    plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                            f'{percentage:.1f}%', ha='center', va='bottom')
                
                plt.tight_layout()
                plt.savefig(charts_dir / "coverage.png", dpi=300, bbox_inches='tight')
                plt.close()
    
    def generate_html_report(self):
        """Generate HTML report"""
        print("📄 Generating HTML report...")
        
        html_template = """
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ITSM Test Report - {{ generation_time }}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { border-bottom: 3px solid #2196F3; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { color: #1976D2; margin: 0; font-size: 2.5em; }
                .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
                .card h3 { margin: 0 0 10px 0; font-size: 1.2em; }
                .card .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
                .success { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
                .failure { background: linear-gradient(135deg, #F44336 0%, #da190b 100%); }
                .warning { background: linear-gradient(135deg, #FF9800 0%, #f57c00 100%); }
                .info { background: linear-gradient(135deg, #2196F3 0%, #0d7377 100%); }
                .suite-section { margin-bottom: 40px; }
                .suite-table { width: 100%; border-collapse: collapse; margin-top: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .suite-table th, .suite-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                .suite-table th { background-color: #f8f9fa; font-weight: 600; color: #495057; }
                .suite-table tr:hover { background-color: #f8f9fa; }
                .status-passed { color: #28a745; font-weight: bold; }
                .status-failed { color: #dc3545; font-weight: bold; }
                .status-skipped { color: #ffc107; font-weight: bold; }
                .progress-bar { background-color: #e9ecef; border-radius: 10px; overflow: hidden; height: 20px; margin: 10px 0; }
                .progress-fill { height: 100%; transition: width 0.5s ease; }
                .progress-success { background-color: #28a745; }
                .progress-danger { background-color: #dc3545; }
                .chart-container { text-align: center; margin: 30px 0; }
                .chart-container img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .quality-metrics { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .timestamp { color: #6c757d; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧪 ITSM テストレポート</h1>
                    <p class="timestamp">生成日時: {{ generation_time }}</p>
                </div>
                
                <div class="summary-cards">
                    <div class="card info">
                        <h3>総テスト数</h3>
                        <div class="value">{{ summary.total_tests }}</div>
                    </div>
                    <div class="card success">
                        <h3>成功</h3>
                        <div class="value">{{ summary.passed }}</div>
                    </div>
                    <div class="card failure">
                        <h3>失敗</h3>
                        <div class="value">{{ summary.failed }}</div>
                    </div>
                    <div class="card warning">
                        <h3>スキップ</h3>
                        <div class="value">{{ summary.skipped }}</div>
                    </div>
                    <div class="card info">
                        <h3>成功率</h3>
                        <div class="value">{{ "%.1f"|format(summary.success_rate) }}%</div>
                    </div>
                    <div class="card {{ 'success' if summary.overall_status == 'PASSED' else 'failure' }}">
                        <h3>総合結果</h3>
                        <div class="value">{{ summary.overall_status }}</div>
                    </div>
                </div>
                
                {% if charts_available %}
                <div class="chart-container">
                    <h2>📊 テスト結果グラフ</h2>
                    <img src="charts/test_results.png" alt="Test Results Chart">
                </div>
                {% endif %}
                
                <div class="suite-section">
                    <h2>📋 テストスイート詳細</h2>
                    <table class="suite-table">
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
                        <tbody>
                            {% for suite_name, suite_summary in summary.suite_summaries.items() %}
                            <tr>
                                <td><strong>{{ suite_name }}</strong></td>
                                <td>{{ suite_summary.total }}</td>
                                <td class="status-passed">{{ suite_summary.passed }}</td>
                                <td class="status-failed">{{ suite_summary.failed }}</td>
                                <td class="status-skipped">{{ suite_summary.skipped }}</td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-fill {{ 'progress-success' if suite_summary.success_rate >= 80 else 'progress-danger' }}" 
                                             style="width: {{ suite_summary.success_rate }}%"></div>
                                    </div>
                                    {{ "%.1f"|format(suite_summary.success_rate) }}%
                                </td>
                                <td>{{ "%.2f"|format(suite_summary.duration) }}s</td>
                            </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
                
                {% if quality_metrics %}
                <div class="quality-metrics">
                    <h2>🎯 品質メトリクス</h2>
                    
                    {% if quality_metrics.test_coverage %}
                    <h3>テストカバレッジ</h3>
                    <table class="suite-table">
                        <thead>
                            <tr>
                                <th>スイート</th>
                                <th>ライン カバレッジ</th>
                                <th>カバー済み行数</th>
                                <th>総ステートメント数</th>
                                <th>未カバー行数</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for suite_name, coverage in quality_metrics.test_coverage.items() %}
                            <tr>
                                <td>{{ suite_name }}</td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-fill {{ 'progress-success' if coverage.line_coverage >= 80 else 'progress-danger' }}" 
                                             style="width: {{ coverage.line_coverage }}%"></div>
                                    </div>
                                    {{ "%.1f"|format(coverage.line_coverage) }}%
                                </td>
                                <td>{{ coverage.covered_lines }}</td>
                                <td>{{ coverage.num_statements }}</td>
                                <td>{{ coverage.missing_lines }}</td>
                            </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                    {% endif %}
                    
                    {% if quality_metrics.performance_metrics %}
                    <h3>パフォーマンス メトリクス</h3>
                    <table class="suite-table">
                        <thead>
                            <tr>
                                <th>スイート</th>
                                <th>平均応答時間</th>
                                <th>最大応答時間</th>
                                <th>ベンチマーク数</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for suite_name, perf in quality_metrics.performance_metrics.items() %}
                            <tr>
                                <td>{{ suite_name }}</td>
                                <td>{{ "%.3f"|format(perf.avg_response_time) }}s</td>
                                <td>{{ "%.3f"|format(perf.max_response_time) }}s</td>
                                <td>{{ perf.benchmark_count }}</td>
                            </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                    {% endif %}
                </div>
                {% endif %}
                
                {% if coverage_chart_available %}
                <div class="chart-container">
                    <h2>📈 カバレッジグラフ</h2>
                    <img src="charts/coverage.png" alt="Coverage Chart">
                </div>
                {% endif %}
                
                <div class="suite-section">
                    <h2>ℹ️ 詳細情報</h2>
                    <p>総実行時間: {{ "%.2f"|format(summary.total_duration) }}秒</p>
                    <p>レポート生成時刻: {{ generation_time }}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        
        html_content = template.render(
            generation_time=self.consolidated_data["generation_time"],
            summary=self.consolidated_data["summary"],
            quality_metrics=self.consolidated_data.get("quality_metrics", {}),
            charts_available=os.path.exists(self.output_dir / "charts" / "test_results.png"),
            coverage_chart_available=os.path.exists(self.output_dir / "charts" / "coverage.png")
        )
        
        with open(self.output_dir / "report.html", 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    def generate_json_summary(self):
        """Generate JSON summary for CI/CD integration"""
        print("📝 Generating JSON summary...")
        
        summary = {
            "generation_time": self.consolidated_data["generation_time"],
            "overall": {
                "status": "success" if self.consolidated_data["summary"]["failed"] == 0 else "failure",
                "total_tests": self.consolidated_data["summary"]["total_tests"],
                "success_rate": self.consolidated_data["summary"]["success_rate"],
                "duration": self.consolidated_data["summary"]["total_duration"]
            },
            "unit": self.consolidated_data["summary"]["suite_summaries"].get("unit", {}),
            "api": self.consolidated_data["summary"]["suite_summaries"].get("api", {}),
            "e2e": self.consolidated_data["summary"]["suite_summaries"].get("e2e", {}),
            "load": self.consolidated_data["summary"]["suite_summaries"].get("load", {}),
            "performance": {}
        }
        
        # Add performance metrics
        if "quality_metrics" in self.consolidated_data and "performance_metrics" in self.consolidated_data["quality_metrics"]:
            perf_metrics = self.consolidated_data["quality_metrics"]["performance_metrics"]
            if "api" in perf_metrics:
                summary["performance"]["avg_response_time"] = f"{perf_metrics['api']['avg_response_time']:.3f}s"
            if "load" in perf_metrics:
                summary["performance"]["load_success_rate"] = "N/A"  # Would be calculated from actual load test results
        
        with open(self.output_dir / "summary.json", 'w') as f:
            json.dump(summary, f, indent=2)
    
    def generate_markdown_report(self):
        """Generate Markdown report for managers"""
        print("📋 Generating Markdown report...")
        
        markdown_content = f"""# ITSM システム テストレポート

**生成日時**: {self.consolidated_data["generation_time"]}

## 📊 概要

| メトリクス | 値 |
|------------|-----|
| 総テスト数 | {self.consolidated_data["summary"]["total_tests"]} |
| 成功 | {self.consolidated_data["summary"]["passed"]} ✅ |
| 失敗 | {self.consolidated_data["summary"]["failed"]} ❌ |
| スキップ | {self.consolidated_data["summary"]["skipped"]} ⏭️ |
| 成功率 | {self.consolidated_data["summary"]["success_rate"]:.1f}% |
| 総実行時間 | {self.consolidated_data["summary"]["total_duration"]:.2f}秒 |
| **総合結果** | **{self.consolidated_data["summary"]["overall_status"]}** |

## 🧪 テストスイート詳細

"""
        
        for suite_name, suite_summary in self.consolidated_data["summary"]["suite_summaries"].items():
            status_emoji = "✅" if suite_summary["failed"] == 0 else "❌"
            markdown_content += f"""
### {status_emoji} {suite_name.upper()} テスト

- **総数**: {suite_summary["total"]}
- **成功**: {suite_summary["passed"]}
- **失敗**: {suite_summary["failed"]}
- **スキップ**: {suite_summary["skipped"]}
- **成功率**: {suite_summary["success_rate"]:.1f}%
- **実行時間**: {suite_summary["duration"]:.2f}秒

"""
        
        # Add quality metrics section
        if "quality_metrics" in self.consolidated_data:
            markdown_content += "## 🎯 品質メトリクス\n\n"
            
            # Coverage information
            if "test_coverage" in self.consolidated_data["quality_metrics"]:
                markdown_content += "### 📈 テストカバレッジ\n\n"
                coverage_data = self.consolidated_data["quality_metrics"]["test_coverage"]
                
                for suite_name, coverage in coverage_data.items():
                    coverage_status = "✅" if coverage["line_coverage"] >= 80 else "⚠️"
                    markdown_content += f"- **{suite_name}**: {coverage_status} {coverage['line_coverage']:.1f}%\n"
                
                markdown_content += "\n"
            
            # Performance metrics
            if "performance_metrics" in self.consolidated_data["quality_metrics"]:
                markdown_content += "### ⚡ パフォーマンス メトリクス\n\n"
                perf_data = self.consolidated_data["quality_metrics"]["performance_metrics"]
                
                for suite_name, perf in perf_data.items():
                    markdown_content += f"- **{suite_name}**:\n"
                    markdown_content += f"  - 平均応答時間: {perf['avg_response_time']:.3f}秒\n"
                    markdown_content += f"  - 最大応答時間: {perf['max_response_time']:.3f}秒\n"
                    markdown_content += f"  - ベンチマーク数: {perf['benchmark_count']}\n"
                
                markdown_content += "\n"
        
        # Add recommendations
        markdown_content += "## 💡 推奨事項\n\n"
        
        if self.consolidated_data["summary"]["failed"] > 0:
            markdown_content += "- ❌ **失敗したテストの修正が必要です**\n"
        
        # Coverage recommendations
        if "quality_metrics" in self.consolidated_data and "test_coverage" in self.consolidated_data["quality_metrics"]:
            low_coverage_suites = []
            for suite_name, coverage in self.consolidated_data["quality_metrics"]["test_coverage"].items():
                if coverage["line_coverage"] < 80:
                    low_coverage_suites.append(f"{suite_name} ({coverage['line_coverage']:.1f}%)")
            
            if low_coverage_suites:
                markdown_content += f"- ⚠️ **以下のスイートでカバレッジが不足しています**: {', '.join(low_coverage_suites)}\n"
        
        if self.consolidated_data["summary"]["failed"] == 0:
            markdown_content += "- ✅ **全てのテストが成功しています！**\n"
        
        markdown_content += f"\n---\n*このレポートは自動生成されました ({self.consolidated_data['generation_time']})*\n"
        
        with open(self.output_dir / "report.md", 'w', encoding='utf-8') as f:
            f.write(markdown_content)
    
    def generate_all_reports(self):
        """Generate all types of reports"""
        print("🚀 Generating consolidated test reports...")
        
        # Collect data
        self.collect_test_results()
        self.collect_coverage_data()
        self.collect_benchmark_data()
        
        # Calculate metrics
        self.calculate_summary_metrics()
        self.calculate_quality_metrics()
        
        # Generate outputs
        self.generate_charts()
        self.generate_html_report()
        self.generate_json_summary()
        self.generate_markdown_report()
        
        print(f"✅ Reports generated in: {self.output_dir}")
        print(f"   - HTML Report: {self.output_dir}/report.html")
        print(f"   - Markdown Report: {self.output_dir}/report.md")
        print(f"   - JSON Summary: {self.output_dir}/summary.json")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description="Generate consolidated ITSM test reports")
    parser.add_argument(
        "--input-dir", 
        required=True,
        help="Directory containing test report files"
    )
    parser.add_argument(
        "--output-dir", 
        required=True,
        help="Directory to output consolidated reports"
    )
    
    args = parser.parse_args()
    
    try:
        generator = ITSMReportGenerator(args.input_dir, args.output_dir)
        generator.generate_all_reports()
        print("\n🎉 Report generation completed successfully!")
        
    except Exception as e:
        print(f"\n💥 Error generating reports: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
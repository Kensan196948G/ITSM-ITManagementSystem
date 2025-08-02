#!/usr/bin/env python3
"""
🎯 ITSMシステム パフォーマンス分析ダッシュボード
リアルタイム監視データの視覚化と分析レポート生成
"""

import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import glob
import requests
from pathlib import Path
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
from typing import Dict, List, Any, Optional
import warnings

warnings.filterwarnings("ignore")


class ITSMPerformanceDashboard:
    """ITSM システムパフォーマンス分析ダッシュボード"""

    def __init__(self):
        self.base_dir = Path.cwd()
        self.reports_dir = self.base_dir / "dashboard-reports"
        self.coordination_dir = self.base_dir / "coordination"
        self.validation_dir = self.base_dir / "validation-reports"

        # 出力ディレクトリの作成
        self.reports_dir.mkdir(exist_ok=True)

        # システムURL設定
        self.urls = {
            "webui": "http://192.168.3.135:3000",
            "api": "http://192.168.3.135:8000",
            "admin": "http://192.168.3.135:3000/admin",
            "docs": "http://192.168.3.135:8000/docs",
        }

        # カラーパレット設定
        self.colors = {
            "primary": "#2E86AB",
            "secondary": "#A23B72",
            "success": "#1E8B3A",
            "warning": "#F18F01",
            "danger": "#E63946",
            "info": "#4CC9F0",
        }

        # 日本語フォント設定
        plt.rcParams["font.family"] = [
            "DejaVu Sans",
            "Hiragino Sans",
            "Yu Gothic",
            "Meiryo",
            "Takao",
            "IPAexGothic",
            "IPAPGothic",
            "VL PGothic",
            "Noto Sans CJK JP",
        ]

    def collect_system_metrics(self) -> Dict[str, Any]:
        """システムメトリクスの収集"""
        print("📊 システムメトリクス収集中...")

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "infinite_loop_state": self._get_infinite_loop_state(),
            "validation_reports": self._get_validation_reports(),
            "url_health": self._check_url_health(),
            "system_performance": self._get_system_performance(),
            "error_trends": self._analyze_error_trends(),
            "repair_effectiveness": self._analyze_repair_effectiveness(),
        }

        return metrics

    def _get_infinite_loop_state(self) -> Dict[str, Any]:
        """無限ループ状態の取得"""
        state_file = self.coordination_dir / "infinite_loop_state.json"
        if state_file.exists():
            with open(state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _get_validation_reports(self) -> List[Dict[str, Any]]:
        """検証レポートの取得"""
        reports = []
        report_files = glob.glob(str(self.validation_dir / "validation-report-*.json"))

        for file_path in sorted(report_files)[-10:]:  # 最新10件
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    report = json.load(f)
                    report["file_path"] = file_path
                    reports.append(report)
            except Exception as e:
                print(f"⚠️ レポート読み込みエラー: {file_path} - {e}")

        return reports

    def _check_url_health(self) -> Dict[str, Dict[str, Any]]:
        """URL健全性チェック"""
        health_status = {}

        for name, url in self.urls.items():
            try:
                start_time = datetime.now()
                response = requests.get(url, timeout=10)
                end_time = datetime.now()

                health_status[name] = {
                    "url": url,
                    "status_code": response.status_code,
                    "response_time": (end_time - start_time).total_seconds(),
                    "is_healthy": response.status_code == 200,
                    "timestamp": start_time.isoformat(),
                }
            except Exception as e:
                health_status[name] = {
                    "url": url,
                    "status_code": 0,
                    "response_time": None,
                    "is_healthy": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }

        return health_status

    def _get_system_performance(self) -> Dict[str, Any]:
        """システムパフォーマンス情報の取得"""
        import psutil

        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
            "network_io": psutil.net_io_counters()._asdict(),
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
            "timestamp": datetime.now().isoformat(),
        }

    def _analyze_error_trends(self) -> Dict[str, Any]:
        """エラートレンド分析"""
        reports = self._get_validation_reports()

        if not reports:
            return {"trend": "no_data", "total_errors": 0, "error_types": {}}

        total_errors = []
        error_types = {}
        timestamps = []

        for report in reports:
            total_errors.append(report.get("summary", {}).get("totalErrors", 0))
            timestamps.append(report.get("metadata", {}).get("generatedAt", ""))

            # エラータイプ別集計
            for result in report.get("results", []):
                for error in result.get("errors", []):
                    error_type = error.get("type", "unknown")
                    error_types[error_type] = error_types.get(error_type, 0) + 1

        # トレンド計算
        if len(total_errors) > 1:
            trend = "decreasing" if total_errors[-1] < total_errors[0] else "increasing"
        else:
            trend = "stable"

        return {
            "trend": trend,
            "total_errors": sum(total_errors),
            "error_types": error_types,
            "recent_errors": total_errors[-5:] if total_errors else [],
            "timestamps": timestamps[-5:] if timestamps else [],
        }

    def _analyze_repair_effectiveness(self) -> Dict[str, Any]:
        """修復効果分析"""
        loop_state = self._get_infinite_loop_state()

        if not loop_state:
            return {"effectiveness": 0, "total_repairs": 0, "repair_rate": 0}

        total_errors = loop_state.get("total_errors_fixed", 0)
        loop_count = loop_state.get("loop_count", 1)

        # 修復効率計算
        repair_rate = total_errors / max(loop_count, 1)
        effectiveness = min(100, (total_errors / max(total_errors + 10, 1)) * 100)

        return {
            "effectiveness": round(effectiveness, 2),
            "total_repairs": total_errors,
            "repair_rate": round(repair_rate, 2),
            "loop_count": loop_count,
        }

    def create_dashboard(self) -> str:
        """包括的ダッシュボードの作成"""
        print("🎯 パフォーマンスダッシュボード生成中...")

        # メトリクス収集
        metrics = self.collect_system_metrics()

        # HTML ダッシュボード生成
        html_path = self._generate_html_dashboard(metrics)

        # グラフ生成
        self._generate_charts(metrics)

        # レポート生成
        self._generate_text_report(metrics)

        print(f"✅ ダッシュボード生成完了: {html_path}")
        return html_path

    def _generate_html_dashboard(self, metrics: Dict[str, Any]) -> str:
        """HTMLダッシュボード生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = self.reports_dir / f"performance_dashboard_{timestamp}.html"

        # 無限ループ状態
        loop_state = metrics.get("infinite_loop_state", {})
        loop_count = loop_state.get("loop_count", 0)
        total_fixes = loop_state.get("total_errors_fixed", 0)

        # URL健全性
        url_health = metrics.get("url_health", {})
        healthy_urls = sum(
            1 for status in url_health.values() if status.get("is_healthy", False)
        )
        total_urls = len(url_health)

        # システムパフォーマンス
        sys_perf = metrics.get("system_performance", {})
        cpu_usage = sys_perf.get("cpu_percent", 0)
        memory_usage = sys_perf.get("memory_percent", 0)

        # エラートレンド
        error_trends = metrics.get("error_trends", {})
        total_errors = error_trends.get("total_errors", 0)
        trend = error_trends.get("trend", "stable")

        # 修復効果
        repair_eff = metrics.get("repair_effectiveness", {})
        effectiveness = repair_eff.get("effectiveness", 0)

        html_content = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 ITSMシステム パフォーマンスダッシュボード</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }}
        
        .header h1 {{
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        
        .header .subtitle {{
            font-size: 1.2rem;
            opacity: 0.9;
        }}
        
        .dashboard-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .card {{
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}
        
        .card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }}
        
        .card-header {{
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }}
        
        .card-icon {{
            font-size: 2rem;
            margin-right: 15px;
        }}
        
        .card-title {{
            font-size: 1.3rem;
            font-weight: 600;
            color: #2c3e50;
        }}
        
        .metric {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }}
        
        .metric-label {{
            font-weight: 500;
            color: #6c757d;
        }}
        
        .metric-value {{
            font-size: 1.2rem;
            font-weight: 700;
        }}
        
        .status-indicator {{
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }}
        
        .status-healthy {{ background-color: #28a745; }}
        .status-warning {{ background-color: #ffc107; }}
        .status-danger {{ background-color: #dc3545; }}
        
        .progress-bar {{
            width: 100%;
            height: 10px;
            background-color: #e9ecef;
            border-radius: 5px;
            overflow: hidden;
            margin-top: 5px;
        }}
        
        .progress-fill {{
            height: 100%;
            transition: width 0.3s ease;
        }}
        
        .progress-success {{ background-color: #28a745; }}
        .progress-warning {{ background-color: #ffc107; }}
        .progress-danger {{ background-color: #dc3545; }}
        
        .chart-container {{
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        
        .url-status {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 8px;
            background: #f8f9fa;
        }}
        
        .url-name {{
            font-weight: 500;
        }}
        
        .response-time {{
            font-size: 0.9rem;
            color: #6c757d;
        }}
        
        .refresh-button {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,123,255,0.3);
            transition: all 0.3s ease;
        }}
        
        .refresh-button:hover {{
            background: #0056b3;
            transform: scale(1.1);
        }}
        
        .timestamp {{
            text-align: center;
            color: white;
            margin-top: 30px;
            opacity: 0.8;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 ITSMシステム パフォーマンスダッシュボード</h1>
            <div class="subtitle">リアルタイム監視・自動修復システム</div>
        </div>
        
        <div class="dashboard-grid">
            <!-- システム概要 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🔄</div>
                    <div class="card-title">無限ループ監視</div>
                </div>
                <div class="metric">
                    <span class="metric-label">実行サイクル数</span>
                    <span class="metric-value" style="color: #2E86AB;">{loop_count}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">修復済みエラー</span>
                    <span class="metric-value" style="color: #1E8B3A;">{total_fixes}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">修復効率</span>
                    <span class="metric-value" style="color: #F18F01;">{effectiveness:.1f}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: {min(effectiveness, 100)}%"></div>
                </div>
            </div>
            
            <!-- URL健全性 -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🌐</div>
                    <div class="card-title">URL健全性</div>
                </div>
                <div class="metric">
                    <span class="metric-label">正常なURL</span>
                    <span class="metric-value" style="color: #1E8B3A;">{healthy_urls}/{total_urls}</span>
                </div>
"""

        # URL詳細状態
        for name, status in url_health.items():
            is_healthy = status.get("is_healthy", False)
            response_time = status.get("response_time")
            status_class = "status-healthy" if is_healthy else "status-danger"
            status_text = "正常" if is_healthy else "エラー"

            response_display = f"{response_time:.3f}s" if response_time else "N/A"

            html_content += f"""
                <div class="url-status">
                    <div class="url-name">
                        <span class="status-indicator {status_class}"></span>
                        {name.upper()}
                    </div>
                    <div>
                        <span style="font-weight: 500;">{status_text}</span>
                        <div class="response-time">{response_display}</div>
                    </div>
                </div>
"""

        html_content += f"""
            </div>
            
            <!-- システムリソース -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">💻</div>
                    <div class="card-title">システムリソース</div>
                </div>
                <div class="metric">
                    <span class="metric-label">CPU使用率</span>
                    <span class="metric-value" style="color: {'#dc3545' if cpu_usage > 80 else '#ffc107' if cpu_usage > 60 else '#28a745'};">{cpu_usage:.1f}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill {'progress-danger' if cpu_usage > 80 else 'progress-warning' if cpu_usage > 60 else 'progress-success'}" style="width: {cpu_usage}%"></div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">メモリ使用率</span>
                    <span class="metric-value" style="color: {'#dc3545' if memory_usage > 80 else '#ffc107' if memory_usage > 60 else '#28a745'};">{memory_usage:.1f}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill {'progress-danger' if memory_usage > 80 else 'progress-warning' if memory_usage > 60 else 'progress-success'}" style="width: {memory_usage}%"></div>
                </div>
            </div>
            
            <!-- エラートレンド -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">📊</div>
                    <div class="card-title">エラートレンド</div>
                </div>
                <div class="metric">
                    <span class="metric-label">総エラー数</span>
                    <span class="metric-value" style="color: #E63946;">{total_errors}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">トレンド</span>
                    <span class="metric-value" style="color: {'#1E8B3A' if trend == 'decreasing' else '#E63946' if trend == 'increasing' else '#F18F01'};">
                        {'📉 減少' if trend == 'decreasing' else '📈 増加' if trend == 'increasing' else '📊 安定'}
                    </span>
                </div>
            </div>
        </div>
        
        <!-- チャート表示エリア -->
        <div class="chart-container">
            <h3>📈 パフォーマンス推移</h3>
            <div id="performanceChart" style="height: 400px;"></div>
        </div>
        
        <div class="chart-container">
            <h3>🔧 修復アクティビティ</h3>
            <div id="repairChart" style="height: 300px;"></div>
        </div>
        
        <div class="timestamp">
            最終更新: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}
        </div>
    </div>
    
    <button class="refresh-button" onclick="window.location.reload();" title="更新">
        🔄
    </button>
    
    <script>
        // パフォーマンス推移チャート
        const performanceData = {{
            x: {error_trends.get('timestamps', [])},
            y: {error_trends.get('recent_errors', [])},
            type: 'scatter',
            mode: 'lines+markers',
            name: 'エラー数',
            line: {{color: '#E63946'}},
            marker: {{size: 8}}
        }};
        
        const performanceLayout = {{
            title: 'エラー数推移',
            xaxis: {{title: '時刻'}},
            yaxis: {{title: 'エラー数'}},
            showlegend: true
        }};
        
        Plotly.newPlot('performanceChart', [performanceData], performanceLayout);
        
        // 修復アクティビティチャート
        const repairHistory = {json.dumps(loop_state.get('repair_history', []))};
        const repairCounts = {{}};
        
        repairHistory.forEach(repair => {{
            const target = repair.target;
            repairCounts[target] = (repairCounts[target] || 0) + 1;
        }});
        
        const repairData = {{
            x: Object.keys(repairCounts),
            y: Object.values(repairCounts),
            type: 'bar',
            marker: {{color: '#2E86AB'}}
        }};
        
        const repairLayout = {{
            title: '修復対象別実行回数',
            xaxis: {{title: '修復対象'}},
            yaxis: {{title: '実行回数'}}
        }};
        
        Plotly.newPlot('repairChart', [repairData], repairLayout);
        
        // 自動更新（5分間隔）
        setTimeout(() => {{
            window.location.reload();
        }}, 300000);
    </script>
</body>
</html>
"""

        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        return str(html_file)

    def _generate_charts(self, metrics: Dict[str, Any]):
        """個別チャート生成"""
        print("📊 チャート生成中...")

        # 1. 無限ループ進捗チャート
        self._create_loop_progress_chart(metrics)

        # 2. エラートレンドチャート
        self._create_error_trend_chart(metrics)

        # 3. システムリソースチャート
        self._create_resource_chart(metrics)

        # 4. URL応答時間チャート
        self._create_response_time_chart(metrics)

        # 5. 修復効果チャート
        self._create_repair_effectiveness_chart(metrics)

    def _create_loop_progress_chart(self, metrics: Dict[str, Any]):
        """無限ループ進捗チャート"""
        loop_state = metrics.get("infinite_loop_state", {})
        repair_history = loop_state.get("repair_history", [])

        if not repair_history:
            return

        # データ準備
        timestamps = [
            datetime.fromisoformat(repair["timestamp"])
            for repair in repair_history[-20:]
        ]
        loop_numbers = [repair["loop"] for repair in repair_history[-20:]]

        # チャート作成
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))

        # ループ数推移
        ax1.plot(
            timestamps,
            loop_numbers,
            marker="o",
            linewidth=2,
            markersize=6,
            color=self.colors["primary"],
        )
        ax1.set_title("🔄 無限ループ実行サイクル推移", fontsize=14, fontweight="bold")
        ax1.set_ylabel("ループ番号")
        ax1.grid(True, alpha=0.3)
        ax1.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))

        # 修復頻度
        repair_counts = {}
        for repair in repair_history:
            hour = datetime.fromisoformat(repair["timestamp"]).strftime("%H:%M")
            repair_counts[hour] = repair_counts.get(hour, 0) + 1

        hours = list(repair_counts.keys())[-20:]
        counts = [repair_counts[hour] for hour in hours]

        ax2.bar(hours, counts, color=self.colors["success"], alpha=0.7)
        ax2.set_title("🔧 時間別修復頻度", fontsize=14, fontweight="bold")
        ax2.set_ylabel("修復回数")
        ax2.tick_params(axis="x", rotation=45)

        plt.tight_layout()
        plt.savefig(
            self.reports_dir / "loop_progress_chart.png", dpi=300, bbox_inches="tight"
        )
        plt.close()

    def _create_error_trend_chart(self, metrics: Dict[str, Any]):
        """エラートレンドチャート"""
        reports = metrics.get("validation_reports", [])

        if not reports:
            return

        # データ準備
        timestamps = []
        total_errors = []
        critical_errors = []

        for report in reports:
            summary = report.get("summary", {})
            metadata = report.get("metadata", {})

            if "generatedAt" in metadata:
                timestamps.append(datetime.fromisoformat(metadata["generatedAt"]))
                total_errors.append(summary.get("totalErrors", 0))
                critical_errors.append(summary.get("criticalErrors", 0))

        if not timestamps:
            return

        # チャート作成
        fig, ax = plt.subplots(figsize=(12, 8))

        ax.plot(
            timestamps,
            total_errors,
            marker="o",
            linewidth=2,
            label="総エラー数",
            color=self.colors["danger"],
        )
        ax.plot(
            timestamps,
            critical_errors,
            marker="s",
            linewidth=2,
            label="クリティカルエラー",
            color=self.colors["warning"],
        )

        ax.set_title("📊 エラー数推移トレンド", fontsize=16, fontweight="bold")
        ax.set_xlabel("時刻")
        ax.set_ylabel("エラー数")
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))

        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(
            self.reports_dir / "error_trend_chart.png", dpi=300, bbox_inches="tight"
        )
        plt.close()

    def _create_resource_chart(self, metrics: Dict[str, Any]):
        """システムリソースチャート"""
        sys_perf = metrics.get("system_performance", {})

        # データ準備
        resources = ["CPU", "メモリ", "ディスク"]
        usage = [
            sys_perf.get("cpu_percent", 0),
            sys_perf.get("memory_percent", 0),
            sys_perf.get("disk_percent", 0),
        ]

        colors = [
            (
                self.colors["danger"]
                if u > 80
                else self.colors["warning"] if u > 60 else self.colors["success"]
            )
            for u in usage
        ]

        # チャート作成
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

        # 棒グラフ
        bars = ax1.bar(resources, usage, color=colors, alpha=0.8)
        ax1.set_title("💻 システムリソース使用率", fontsize=14, fontweight="bold")
        ax1.set_ylabel("使用率 (%)")
        ax1.set_ylim(0, 100)

        # 値をバーの上に表示
        for bar, value in zip(bars, usage):
            ax1.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 1,
                f"{value:.1f}%",
                ha="center",
                va="bottom",
                fontweight="bold",
            )

        # 円グラフ
        ax2.pie(
            usage, labels=resources, autopct="%1.1f%%", colors=colors, startangle=90
        )
        ax2.set_title("リソース使用率分布", fontsize=14, fontweight="bold")

        plt.tight_layout()
        plt.savefig(
            self.reports_dir / "resource_chart.png", dpi=300, bbox_inches="tight"
        )
        plt.close()

    def _create_response_time_chart(self, metrics: Dict[str, Any]):
        """URL応答時間チャート"""
        url_health = metrics.get("url_health", {})

        # データ準備
        names = []
        response_times = []
        statuses = []

        for name, status in url_health.items():
            names.append(name.upper())
            response_time = status.get("response_time")
            response_times.append(response_time if response_time else 0)
            statuses.append("正常" if status.get("is_healthy", False) else "エラー")

        colors = [
            self.colors["success"] if status == "正常" else self.colors["danger"]
            for status in statuses
        ]

        # チャート作成
        fig, ax = plt.subplots(figsize=(12, 8))

        bars = ax.bar(names, response_times, color=colors, alpha=0.8)
        ax.set_title("🌐 URL応答時間", fontsize=16, fontweight="bold")
        ax.set_ylabel("応答時間 (秒)")

        # 値をバーの上に表示
        for bar, value, status in zip(bars, response_times, statuses):
            if value > 0:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + 0.01,
                    f"{value:.3f}s\n({status})",
                    ha="center",
                    va="bottom",
                    fontweight="bold",
                )
            else:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    0.05,
                    f"エラー",
                    ha="center",
                    va="bottom",
                    fontweight="bold",
                    color="white",
                )

        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(
            self.reports_dir / "response_time_chart.png", dpi=300, bbox_inches="tight"
        )
        plt.close()

    def _create_repair_effectiveness_chart(self, metrics: Dict[str, Any]):
        """修復効果チャート"""
        loop_state = metrics.get("infinite_loop_state", {})
        repair_eff = metrics.get("repair_effectiveness", {})

        # データ準備
        total_fixes = loop_state.get("total_errors_fixed", 0)
        loop_count = loop_state.get("loop_count", 1)
        effectiveness = repair_eff.get("effectiveness", 0)

        # 修復対象別集計
        repair_history = loop_state.get("repair_history", [])
        repair_targets = {}
        for repair in repair_history:
            target = repair["target"]
            repair_targets[target] = repair_targets.get(target, 0) + 1

        # チャート作成
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))

        # 修復効率
        ax1.bar(["修復効率"], [effectiveness], color=self.colors["success"], alpha=0.8)
        ax1.set_title("🎯 修復効率", fontsize=14, fontweight="bold")
        ax1.set_ylabel("効率 (%)")
        ax1.set_ylim(0, 100)
        ax1.text(
            0,
            effectiveness + 2,
            f"{effectiveness:.1f}%",
            ha="center",
            fontweight="bold",
        )

        # 修復実績
        ax2.bar(
            ["総修復数", "ループ数"],
            [total_fixes, loop_count],
            color=[self.colors["primary"], self.colors["secondary"]],
            alpha=0.8,
        )
        ax2.set_title("📊 修復実績", fontsize=14, fontweight="bold")
        ax2.set_ylabel("回数")

        # 修復対象別円グラフ
        if repair_targets:
            ax3.pie(
                repair_targets.values(),
                labels=repair_targets.keys(),
                autopct="%1.1f%%",
                startangle=90,
                colors=plt.cm.Set3.colors,
            )
            ax3.set_title("🔧 修復対象分布", fontsize=14, fontweight="bold")

        # 時系列修復頻度
        if repair_history:
            recent_repairs = repair_history[-10:]
            timestamps = [
                datetime.fromisoformat(repair["timestamp"]) for repair in recent_repairs
            ]
            loop_nums = [repair["loop"] for repair in recent_repairs]

            ax4.plot(
                timestamps,
                loop_nums,
                marker="o",
                linewidth=2,
                color=self.colors["info"],
            )
            ax4.set_title("⏰ 最近の修復アクティビティ", fontsize=14, fontweight="bold")
            ax4.set_ylabel("ループ番号")
            ax4.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
            plt.setp(ax4.xaxis.get_majorticklabels(), rotation=45)

        plt.tight_layout()
        plt.savefig(
            self.reports_dir / "repair_effectiveness_chart.png",
            dpi=300,
            bbox_inches="tight",
        )
        plt.close()

    def _generate_text_report(self, metrics: Dict[str, Any]):
        """テキストレポート生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.reports_dir / f"performance_report_{timestamp}.md"

        loop_state = metrics.get("infinite_loop_state", {})
        url_health = metrics.get("url_health", {})
        sys_perf = metrics.get("system_performance", {})
        error_trends = metrics.get("error_trends", {})
        repair_eff = metrics.get("repair_effectiveness", {})

        report_content = f"""# 🎯 ITSMシステム パフォーマンス分析レポート

**生成日時**: {datetime.now().strftime('%Y年%m月%d日 %H時%M分%S秒')}

## 📊 システム概要

### 🔄 無限ループ監視状況
- **実行サイクル数**: {loop_state.get('loop_count', 0)} 回
- **総修復エラー数**: {loop_state.get('total_errors_fixed', 0)} 件
- **最終スキャン**: {loop_state.get('last_scan', 'N/A')}
- **修復効率**: {repair_eff.get('effectiveness', 0):.1f}%

### 🌐 URL健全性状況
"""

        for name, status in url_health.items():
            is_healthy = status.get("is_healthy", False)
            response_time = status.get("response_time")
            status_icon = "✅" if is_healthy else "❌"
            time_str = f"{response_time:.3f}s" if response_time else "N/A"

            report_content += (
                f"- **{name.upper()}**: {status_icon} {status['url']} ({time_str})\n"
            )

        report_content += f"""
### 💻 システムリソース
- **CPU使用率**: {sys_perf.get('cpu_percent', 0):.1f}%
- **メモリ使用率**: {sys_perf.get('memory_percent', 0):.1f}%
- **ディスク使用率**: {sys_perf.get('disk_percent', 0):.1f}%

### 📈 エラートレンド分析
- **総エラー数**: {error_trends.get('total_errors', 0)} 件
- **トレンド**: {error_trends.get('trend', '不明')}
- **最近のエラー数**: {error_trends.get('recent_errors', [])}

## 🔧 修復アクティビティ詳細

### 最近の修復履歴
"""

        repair_history = loop_state.get("repair_history", [])
        for repair in repair_history[-10:]:
            timestamp_str = datetime.fromisoformat(repair["timestamp"]).strftime(
                "%H:%M:%S"
            )
            report_content += (
                f"- `{timestamp_str}` - {repair['target']} (ループ {repair['loop']})\n"
            )

        report_content += f"""
### 修復対象別統計
"""

        repair_targets = {}
        for repair in repair_history:
            target = repair["target"]
            repair_targets[target] = repair_targets.get(target, 0) + 1

        for target, count in sorted(
            repair_targets.items(), key=lambda x: x[1], reverse=True
        ):
            report_content += f"- **{target}**: {count} 回\n"

        report_content += f"""
## 📋 推奨アクション

### 🔴 重要度: 高
"""

        # 推奨アクション生成
        recommendations = []

        if sys_perf.get("cpu_percent", 0) > 80:
            recommendations.append(
                "- CPU使用率が高い状態です。プロセスの最適化を検討してください。"
            )

        if sys_perf.get("memory_percent", 0) > 80:
            recommendations.append(
                "- メモリ使用率が高い状態です。メモリリークの確認を推奨します。"
            )

        unhealthy_urls = [
            name
            for name, status in url_health.items()
            if not status.get("is_healthy", False)
        ]
        if unhealthy_urls:
            recommendations.append(
                f"- 以下のURLで問題が発生しています: {', '.join(unhealthy_urls)}"
            )

        if error_trends.get("trend") == "increasing":
            recommendations.append(
                "- エラー数が増加傾向にあります。根本原因の調査を推奨します。"
            )

        if not recommendations:
            recommendations.append("- 現在、緊急対応が必要な問題は検出されていません。")

        for rec in recommendations:
            report_content += f"{rec}\n"

        report_content += f"""
### 🟡 重要度: 中
- 継続的な監視により、システムの安定性を維持してください。
- 定期的なレポートの確認により、潜在的な問題を早期発見できます。

### 🟢 重要度: 低
- パフォーマンス最適化のため、定期的なメンテナンスを実施してください。

---

**次回レポート生成予定**: {(datetime.now() + timedelta(hours=1)).strftime('%Y年%m月%d日 %H時%M分')}

**生成システム**: ITSMパフォーマンス分析ダッシュボード v1.0
"""

        with open(report_file, "w", encoding="utf-8") as f:
            f.write(report_content)

        print(f"📝 テキストレポート生成完了: {report_file}")


def main():
    """メイン実行関数"""
    print("🚀 ITSMパフォーマンス分析ダッシュボード開始")

    try:
        # 必要なライブラリのインストールチェック
        import matplotlib
        import seaborn
        import plotly
        import psutil

        print("✅ 必要なライブラリが利用可能です")

    except ImportError as e:
        print(f"❌ 必要なライブラリが不足しています: {e}")
        print("以下のコマンドでインストールしてください:")
        print("pip install matplotlib seaborn plotly psutil pandas numpy")
        return

    # ダッシュボード作成
    dashboard = ITSMPerformanceDashboard()
    html_path = dashboard.create_dashboard()

    print(f"\n🎉 ダッシュボード生成完了!")
    print(f"📊 HTMLダッシュボード: {html_path}")
    print(f"📁 全ての生成ファイル: {dashboard.reports_dir}")
    print(f"\n💡 ブラウザで以下のファイルを開いてください:")
    print(f"   file://{html_path}")


if __name__ == "__main__":
    main()

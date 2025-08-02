#!/usr/bin/env python3
"""
🎯 ITSMシステム 軽量パフォーマンス分析ダッシュボード
標準ライブラリのみ使用
"""

import json
import os
import glob
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import subprocess
import time

class LightweightPerformanceDashboard:
    """軽量パフォーマンス分析ダッシュボード"""
    
    def __init__(self):
        self.base_dir = Path.cwd()
        self.reports_dir = self.base_dir / "dashboard-reports"
        self.coordination_dir = self.base_dir / "coordination"
        self.validation_dir = self.base_dir / "validation-reports"
        
        # 出力ディレクトリの作成
        self.reports_dir.mkdir(exist_ok=True)
        
        # システムURL設定
        self.urls = {
            'webui': 'http://192.168.3.135:3000',
            'api': 'http://192.168.3.135:8000',
            'admin': 'http://192.168.3.135:3000/admin',
            'docs': 'http://192.168.3.135:8000/docs'
        }
    
    def collect_system_metrics(self) -> Dict[str, Any]:
        """システムメトリクスの収集"""
        print("📊 システムメトリクス収集中...")
        
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'infinite_loop_state': self._get_infinite_loop_state(),
            'validation_reports': self._get_validation_reports(),
            'url_health': self._check_url_health(),
            'system_performance': self._get_system_performance(),
            'error_trends': self._analyze_error_trends(),
            'repair_effectiveness': self._analyze_repair_effectiveness()
        }
        
        return metrics
    
    def _get_infinite_loop_state(self) -> Dict[str, Any]:
        """無限ループ状態の取得"""
        state_file = self.coordination_dir / "infinite_loop_state.json"
        if state_file.exists():
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ 無限ループ状態読み込みエラー: {e}")
        return {}
    
    def _get_validation_reports(self) -> List[Dict[str, Any]]:
        """検証レポートの取得"""
        reports = []
        report_files = glob.glob(str(self.validation_dir / "validation-report-*.json"))
        
        for file_path in sorted(report_files)[-10:]:  # 最新10件
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    report = json.load(f)
                    report['file_path'] = file_path
                    reports.append(report)
            except Exception as e:
                print(f"⚠️ レポート読み込みエラー: {file_path} - {e}")
        
        return reports
    
    def _check_url_health(self) -> Dict[str, Dict[str, Any]]:
        """URL健全性チェック"""
        health_status = {}
        
        for name, url in self.urls.items():
            try:
                start_time = time.time()
                response = requests.get(url, timeout=10)
                end_time = time.time()
                
                health_status[name] = {
                    'url': url,
                    'status_code': response.status_code,
                    'response_time': end_time - start_time,
                    'is_healthy': response.status_code == 200,
                    'timestamp': datetime.now().isoformat()
                }
            except Exception as e:
                health_status[name] = {
                    'url': url,
                    'status_code': 0,
                    'response_time': None,
                    'is_healthy': False,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
        
        return health_status
    
    def _get_system_performance(self) -> Dict[str, Any]:
        """システムパフォーマンス情報の取得（軽量版）"""
        try:
            # CPU使用率
            cpu_result = subprocess.run(['top', '-bn1'], capture_output=True, text=True, timeout=5)
            cpu_line = [line for line in cpu_result.stdout.split('\n') if 'Cpu(s)' in line]
            cpu_percent = 0
            if cpu_line:
                # %Cpu(s): 12.5 us, のような形式から数値を抽出
                import re
                match = re.search(r'(\d+\.?\d*)\s*us', cpu_line[0])
                if match:
                    cpu_percent = float(match.group(1))
            
            # メモリ使用率
            mem_result = subprocess.run(['free'], capture_output=True, text=True, timeout=5)
            mem_lines = mem_result.stdout.split('\n')
            mem_percent = 0
            for line in mem_lines:
                if 'Mem:' in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        total = int(parts[1])
                        used = int(parts[2])
                        mem_percent = (used / total) * 100 if total > 0 else 0
                    break
            
            # ディスク使用率
            disk_result = subprocess.run(['df', '/'], capture_output=True, text=True, timeout=5)
            disk_lines = disk_result.stdout.split('\n')
            disk_percent = 0
            if len(disk_lines) > 1:
                parts = disk_lines[1].split()
                if len(parts) >= 5:
                    disk_percent_str = parts[4].replace('%', '')
                    disk_percent = float(disk_percent_str) if disk_percent_str.isdigit() else 0
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': mem_percent,
                'disk_percent': disk_percent,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"⚠️ システムパフォーマンス取得エラー: {e}")
            return {
                'cpu_percent': 0,
                'memory_percent': 0,
                'disk_percent': 0,
                'timestamp': datetime.now().isoformat()
            }
    
    def _analyze_error_trends(self) -> Dict[str, Any]:
        """エラートレンド分析"""
        reports = self._get_validation_reports()
        
        if not reports:
            return {'trend': 'no_data', 'total_errors': 0, 'error_types': {}}
        
        total_errors = []
        error_types = {}
        timestamps = []
        
        for report in reports:
            total_errors.append(report.get('summary', {}).get('totalErrors', 0))
            timestamps.append(report.get('metadata', {}).get('generatedAt', ''))
            
            # エラータイプ別集計
            for result in report.get('results', []):
                for error in result.get('errors', []):
                    error_type = error.get('type', 'unknown')
                    error_types[error_type] = error_types.get(error_type, 0) + 1
        
        # トレンド計算
        if len(total_errors) > 1:
            trend = 'decreasing' if total_errors[-1] < total_errors[0] else 'increasing'
        else:
            trend = 'stable'
        
        return {
            'trend': trend,
            'total_errors': sum(total_errors),
            'error_types': error_types,
            'recent_errors': total_errors[-5:] if total_errors else [],
            'timestamps': timestamps[-5:] if timestamps else []
        }
    
    def _analyze_repair_effectiveness(self) -> Dict[str, Any]:
        """修復効果分析"""
        loop_state = self._get_infinite_loop_state()
        
        if not loop_state:
            return {'effectiveness': 0, 'total_repairs': 0, 'repair_rate': 0}
        
        total_errors = loop_state.get('total_errors_fixed', 0)
        loop_count = loop_state.get('loop_count', 1)
        
        # 修復効率計算
        repair_rate = total_errors / max(loop_count, 1)
        effectiveness = min(100, (total_errors / max(total_errors + 10, 1)) * 100)
        
        return {
            'effectiveness': round(effectiveness, 2),
            'total_repairs': total_errors,
            'repair_rate': round(repair_rate, 2),
            'loop_count': loop_count
        }
    
    def create_dashboard(self) -> str:
        """包括的ダッシュボードの作成"""
        print("🎯 軽量パフォーマンスダッシュボード生成中...")
        
        # メトリクス収集
        metrics = self.collect_system_metrics()
        
        # HTML ダッシュボード生成
        html_path = self._generate_html_dashboard(metrics)
        
        # JSON データファイル生成
        self._generate_json_data(metrics)
        
        # レポート生成
        self._generate_text_report(metrics)
        
        print(f"✅ ダッシュボード生成完了: {html_path}")
        return html_path
    
    def _generate_html_dashboard(self, metrics: Dict[str, Any]) -> str:
        """HTMLダッシュボード生成（Chart.js使用）"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = self.reports_dir / f"performance_dashboard_{timestamp}.html"
        
        # 無限ループ状態
        loop_state = metrics.get('infinite_loop_state', {})
        loop_count = loop_state.get('loop_count', 0)
        total_fixes = loop_state.get('total_errors_fixed', 0)
        
        # URL健全性
        url_health = metrics.get('url_health', {})
        healthy_urls = sum(1 for status in url_health.values() if status.get('is_healthy', False))
        total_urls = len(url_health)
        
        # システムパフォーマンス
        sys_perf = metrics.get('system_performance', {})
        cpu_usage = sys_perf.get('cpu_percent', 0)
        memory_usage = sys_perf.get('memory_percent', 0)
        disk_usage = sys_perf.get('disk_percent', 0)
        
        # エラートレンド
        error_trends = metrics.get('error_trends', {})
        total_errors = error_trends.get('total_errors', 0)
        trend = error_trends.get('trend', 'stable')
        
        # 修復効果
        repair_eff = metrics.get('repair_effectiveness', {})
        effectiveness = repair_eff.get('effectiveness', 0)
        
        # 修復履歴データ
        repair_history = loop_state.get('repair_history', [])
        repair_targets = {}
        for repair in repair_history:
            target = repair['target']
            repair_targets[target] = repair_targets.get(target, 0) + 1
        
        html_content = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 ITSMシステム パフォーマンスダッシュボード</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
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
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            text-align: center;
            color: white;
            margin-bottom: 30px;
            animation: fadeInDown 1s ease-out;
        }}
        
        .header h1 {{
            font-size: 2.8rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        
        .header .subtitle {{
            font-size: 1.3rem;
            opacity: 0.9;
        }}
        
        .dashboard-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }}
        
        .card {{
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            animation: fadeInUp 0.8s ease-out;
        }}
        
        .card:hover {{
            transform: translateY(-10px);
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
        }}
        
        .card-header {{
            display: flex;
            align-items: center;
            margin-bottom: 25px;
        }}
        
        .card-icon {{
            font-size: 2.5rem;
            margin-right: 15px;
        }}
        
        .card-title {{
            font-size: 1.4rem;
            font-weight: 700;
            color: #2c3e50;
        }}
        
        .metric {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            transition: all 0.3s ease;
        }}
        
        .metric:hover {{
            background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
            transform: scale(1.02);
        }}
        
        .metric-label {{
            font-weight: 600;
            color: #6c757d;
        }}
        
        .metric-value {{
            font-size: 1.4rem;
            font-weight: 800;
        }}
        
        .status-indicator {{
            display: inline-block;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            margin-right: 10px;
            animation: pulse 2s infinite;
        }}
        
        .status-healthy {{ background-color: #28a745; }}
        .status-warning {{ background-color: #ffc107; }}
        .status-danger {{ background-color: #dc3545; }}
        
        .progress-container {{
            width: 100%;
            margin-top: 10px;
        }}
        
        .progress-bar {{
            width: 100%;
            height: 12px;
            background-color: #e9ecef;
            border-radius: 6px;
            overflow: hidden;
            position: relative;
        }}
        
        .progress-fill {{
            height: 100%;
            transition: width 1.5s ease;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            position: relative;
        }}
        
        .progress-fill.warning {{
            background: linear-gradient(90deg, #ffc107 0%, #fd7e14 100%);
        }}
        
        .progress-fill.danger {{
            background: linear-gradient(90deg, #dc3545 0%, #e74c3c 100%);
        }}
        
        .progress-fill::after {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
            animation: shimmer 2s infinite;
        }}
        
        .chart-container {{
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
            animation: fadeInUp 1s ease-out;
        }}
        
        .chart-title {{
            font-size: 1.6rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
        }}
        
        .url-status {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 12px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            transition: all 0.3s ease;
        }}
        
        .url-status:hover {{
            background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
            transform: scale(1.02);
        }}
        
        .url-name {{
            font-weight: 600;
            font-size: 1.1rem;
        }}
        
        .response-time {{
            font-size: 0.95rem;
            color: #6c757d;
            font-weight: 500;
        }}
        
        .refresh-button {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border: none;
            border-radius: 50%;
            width: 70px;
            height: 70px;
            font-size: 1.8rem;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(0,123,255,0.3);
            transition: all 0.3s ease;
            animation: pulse 3s infinite;
        }}
        
        .refresh-button:hover {{
            background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
            transform: scale(1.15);
            box-shadow: 0 15px 35px rgba(0,123,255,0.4);
        }}
        
        .timestamp {{
            text-align: center;
            color: white;
            margin-top: 30px;
            opacity: 0.9;
            font-size: 1.1rem;
        }}
        
        @keyframes fadeInDown {{
            from {{
                opacity: 0;
                transform: translateY(-30px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        @keyframes fadeInUp {{
            from {{
                opacity: 0;
                transform: translateY(30px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        @keyframes pulse {{
            0%, 100% {{
                opacity: 1;
            }}
            50% {{
                opacity: 0.7;
            }}
        }}
        
        @keyframes shimmer {{
            0% {{
                transform: translateX(-100%);
            }}
            100% {{
                transform: translateX(100%);
            }}
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        .stat-item {{
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            transition: all 0.3s ease;
        }}
        
        .stat-item:hover {{
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }}
        
        .stat-number {{
            font-size: 2.5rem;
            font-weight: 800;
            color: #2c3e50;
        }}
        
        .stat-label {{
            font-size: 1rem;
            color: #6c757d;
            margin-top: 5px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 ITSMシステム パフォーマンスダッシュボード</h1>
            <div class="subtitle">リアルタイム監視・自動修復システム | 軽量版</div>
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
                    <span class="metric-value" style="color: #2E86AB;">{loop_count:,}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">修復済みエラー</span>
                    <span class="metric-value" style="color: #1E8B3A;">{total_fixes:,}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">修復効率</span>
                    <span class="metric-value" style="color: #F18F01;">{effectiveness:.1f}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {min(effectiveness, 100)}%"></div>
                    </div>
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
            is_healthy = status.get('is_healthy', False)
            response_time = status.get('response_time')
            status_class = 'status-healthy' if is_healthy else 'status-danger'
            status_text = '正常' if is_healthy else 'エラー'
            
            response_display = f"{response_time:.3f}s" if response_time else "N/A"
            
            html_content += f"""
                <div class="url-status">
                    <div class="url-name">
                        <span class="status-indicator {status_class}"></span>
                        {name.upper()}
                    </div>
                    <div>
                        <span style="font-weight: 600;">{status_text}</span>
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
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill {'danger' if cpu_usage > 80 else 'warning' if cpu_usage > 60 else ''}" style="width: {cpu_usage}%"></div>
                    </div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">メモリ使用率</span>
                    <span class="metric-value" style="color: {'#dc3545' if memory_usage > 80 else '#ffc107' if memory_usage > 60 else '#28a745'};">{memory_usage:.1f}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill {'danger' if memory_usage > 80 else 'warning' if memory_usage > 60 else ''}" style="width: {memory_usage}%"></div>
                    </div>
                </div>
                
                <div class="metric">
                    <span class="metric-label">ディスク使用率</span>
                    <span class="metric-value" style="color: {'#dc3545' if disk_usage > 80 else '#ffc107' if disk_usage > 60 else '#28a745'};">{disk_usage:.1f}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill {'danger' if disk_usage > 80 else 'warning' if disk_usage > 60 else ''}" style="width: {disk_usage}%"></div>
                    </div>
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
                    <span class="metric-value" style="color: #E63946;">{total_errors:,}</span>
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
            <div class="chart-title">📈 システムリソース使用率</div>
            <canvas id="resourceChart" width="400" height="200"></canvas>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">🔧 修復対象別実行回数</div>
            <canvas id="repairChart" width="400" height="200"></canvas>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">📊 システム統計</div>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">{loop_count:,}</div>
                    <div class="stat-label">ループ実行回数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{total_fixes:,}</div>
                    <div class="stat-label">修復済みエラー</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{healthy_urls}/{total_urls}</div>
                    <div class="stat-label">正常URL</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{effectiveness:.1f}%</div>
                    <div class="stat-label">修復効率</div>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            最終更新: {datetime.now().strftime('%Y年%m月%d日 %H時%M分%S秒')}
        </div>
    </div>
    
    <button class="refresh-button" onclick="window.location.reload();" title="更新">
        🔄
    </button>
    
    <script>
        // システムリソースチャート
        const resourceCtx = document.getElementById('resourceChart').getContext('2d');
        const resourceChart = new Chart(resourceCtx, {{
            type: 'doughnut',
            data: {{
                labels: ['CPU使用率', 'メモリ使用率', 'ディスク使用率'],
                datasets: [{{
                    data: [{cpu_usage:.1f}, {memory_usage:.1f}, {disk_usage:.1f}],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB', 
                        '#FFCE56'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }}]
            }},
            options: {{
                responsive: true,
                plugins: {{
                    legend: {{
                        position: 'bottom'
                    }},
                    tooltip: {{
                        callbacks: {{
                            label: function(context) {{
                                return context.label + ': ' + context.parsed + '%';
                            }}
                        }}
                    }}
                }}
            }}
        }});
        
        // 修復対象チャート
        const repairCtx = document.getElementById('repairChart').getContext('2d');
        const repairData = {json.dumps(repair_targets)};
        const repairChart = new Chart(repairCtx, {{
            type: 'bar',
            data: {{
                labels: Object.keys(repairData),
                datasets: [{{
                    label: '実行回数',
                    data: Object.values(repairData),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{
                    y: {{
                        beginAtZero: true,
                        ticks: {{
                            stepSize: 1
                        }}
                    }}
                }},
                plugins: {{
                    legend: {{
                        display: false
                    }}
                }}
            }}
        }});
        
        // 自動更新（5分間隔）
        setTimeout(() => {{
            window.location.reload();
        }}, 300000);
        
        // リアルタイム時計
        function updateTime() {{
            const now = new Date();
            const timeString = now.toLocaleString('ja-JP');
            document.querySelector('.timestamp').innerHTML = `最終更新: ${{timeString}}`;
        }}
        
        setInterval(updateTime, 1000);
        updateTime();
    </script>
</body>
</html>
"""
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return str(html_file)
    
    def _generate_json_data(self, metrics: Dict[str, Any]):
        """JSONデータファイル生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = self.reports_dir / f"metrics_data_{timestamp}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, ensure_ascii=False, indent=2)
        
        print(f"📊 JSONデータ生成完了: {json_file}")
    
    def _generate_text_report(self, metrics: Dict[str, Any]):
        """テキストレポート生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.reports_dir / f"performance_report_{timestamp}.md"
        
        loop_state = metrics.get('infinite_loop_state', {})
        url_health = metrics.get('url_health', {})
        sys_perf = metrics.get('system_performance', {})
        error_trends = metrics.get('error_trends', {})
        repair_eff = metrics.get('repair_effectiveness', {})
        
        report_content = f"""# 🎯 ITSMシステム パフォーマンス分析レポート

**生成日時**: {datetime.now().strftime('%Y年%m月%d日 %H時%M分%S秒')}

## 📊 システム概要

### 🔄 無限ループ監視状況
- **実行サイクル数**: {loop_state.get('loop_count', 0):,} 回
- **総修復エラー数**: {loop_state.get('total_errors_fixed', 0):,} 件
- **最終スキャン**: {loop_state.get('last_scan', 'N/A')}
- **修復効率**: {repair_eff.get('effectiveness', 0):.1f}%

### 🌐 URL健全性状況
"""
        
        for name, status in url_health.items():
            is_healthy = status.get('is_healthy', False)
            response_time = status.get('response_time')
            status_icon = '✅' if is_healthy else '❌'
            time_str = f"{response_time:.3f}s" if response_time else "N/A"
            
            report_content += f"- **{name.upper()}**: {status_icon} {status['url']} ({time_str})\n"
        
        report_content += f"""
### 💻 システムリソース
- **CPU使用率**: {sys_perf.get('cpu_percent', 0):.1f}%
- **メモリ使用率**: {sys_perf.get('memory_percent', 0):.1f}%
- **ディスク使用率**: {sys_perf.get('disk_percent', 0):.1f}%

### 📈 エラートレンド分析
- **総エラー数**: {error_trends.get('total_errors', 0):,} 件
- **トレンド**: {error_trends.get('trend', '不明')}
- **最近のエラー数**: {error_trends.get('recent_errors', [])}

## 🔧 修復アクティビティ詳細

### 最近の修復履歴
"""
        
        repair_history = loop_state.get('repair_history', [])
        for repair in repair_history[-10:]:
            timestamp_str = datetime.fromisoformat(repair['timestamp']).strftime('%H:%M:%S')
            report_content += f"- `{timestamp_str}` - {repair['target']} (ループ {repair['loop']})\n"
        
        report_content += f"""
### 修復対象別統計
"""
        
        repair_targets = {}
        for repair in repair_history:
            target = repair['target']
            repair_targets[target] = repair_targets.get(target, 0) + 1
        
        for target, count in sorted(repair_targets.items(), key=lambda x: x[1], reverse=True):
            report_content += f"- **{target}**: {count:,} 回\n"
        
        # 推奨アクション生成
        recommendations = []
        
        if sys_perf.get('cpu_percent', 0) > 80:
            recommendations.append("- CPU使用率が高い状態です。プロセスの最適化を検討してください。")
        
        if sys_perf.get('memory_percent', 0) > 80:
            recommendations.append("- メモリ使用率が高い状態です。メモリリークの確認を推奨します。")
        
        if sys_perf.get('disk_percent', 0) > 90:
            recommendations.append("- ディスク使用率が高い状態です。不要ファイルの削除を推奨します。")
        
        unhealthy_urls = [name for name, status in url_health.items() if not status.get('is_healthy', False)]
        if unhealthy_urls:
            recommendations.append(f"- 以下のURLで問題が発生しています: {', '.join(unhealthy_urls)}")
        
        if error_trends.get('trend') == 'increasing':
            recommendations.append("- エラー数が増加傾向にあります。根本原因の調査を推奨します。")
        
        if not recommendations:
            recommendations.append("- 現在、緊急対応が必要な問題は検出されていません。")
        
        report_content += f"""
## 📋 推奨アクション

### 🔴 重要度: 高
"""
        
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

**生成システム**: ITSM軽量パフォーマンス分析ダッシュボード v1.0
"""
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"📝 テキストレポート生成完了: {report_file}")

def main():
    """メイン実行関数"""
    print("🚀 ITSM軽量パフォーマンス分析ダッシュボード開始")
    
    # ダッシュボード作成
    dashboard = LightweightPerformanceDashboard()
    html_path = dashboard.create_dashboard()
    
    print(f"\n🎉 ダッシュボード生成完了!")
    print(f"📊 HTMLダッシュボード: {html_path}")
    print(f"📁 全ての生成ファイル: {dashboard.reports_dir}")
    print(f"\n💡 ブラウザで以下のファイルを開いてください:")
    print(f"   file://{html_path}")

if __name__ == "__main__":
    main()
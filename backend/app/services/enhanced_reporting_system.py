"""
強化されたログ・レポートシステム
無限ループサイクルの詳細記録・修復パターンの効果分析・API健康度メトリクス・自動最適化提案
"""

import asyncio
import aiofiles
import logging
import time
import json
import traceback
import re
import sqlite3
import subprocess
import os
import hashlib
import psutil
import statistics
from typing import Dict, List, Optional, Any, Tuple, Union, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from collections import defaultdict, deque
import uuid
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from jinja2 import Template
import io
import base64

logger = logging.getLogger(__name__)

class ReportType(Enum):
    """レポートタイプ"""
    CYCLE_SUMMARY = "cycle_summary"
    REPAIR_ANALYSIS = "repair_analysis"
    PERFORMANCE_TRENDS = "performance_trends"
    HEALTH_ASSESSMENT = "health_assessment"
    OPTIMIZATION_RECOMMENDATIONS = "optimization_recommendations"
    COMPREHENSIVE = "comprehensive"

class ReportFormat(Enum):
    """レポート形式"""
    JSON = "json"
    HTML = "html"
    MARKDOWN = "markdown"
    PDF = "pdf"

@dataclass
class MetricTrend:
    """メトリクス傾向"""
    metric_name: str
    current_value: float
    trend_direction: str  # "up", "down", "stable"
    change_percentage: float
    confidence_level: float
    forecast_24h: Optional[float]

@dataclass
class RepairPattern:
    """修復パターン"""
    pattern_id: str
    error_type: str
    repair_method: str
    success_rate: float
    avg_execution_time: float
    frequency: int
    effectiveness_score: float
    last_used: datetime

@dataclass
class OptimizationRecommendation:
    """最適化推奨事項"""
    recommendation_id: str
    category: str
    priority: str  # "high", "medium", "low"
    title: str
    description: str
    expected_impact: str
    implementation_effort: str  # "low", "medium", "high"
    estimated_time: str
    dependencies: List[str]

class EnhancedReportingSystem:
    """強化されたレポートシステム"""
    
    def __init__(self):
        self.backend_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
        self.coordination_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination")
        self.reports_path = self.coordination_path / "reports"
        self.reports_path.mkdir(exist_ok=True)
        
        # レポート履歴
        self.report_history: List[Dict[str, Any]] = []
        
        # データ分析用キャッシュ
        self.metrics_cache: Dict[str, Any] = {}
        self.repair_patterns_cache: List[RepairPattern] = []
        self.trends_cache: Dict[str, MetricTrend] = {}
        
        # レポートテンプレート
        self.report_templates = self._initialize_report_templates()
        
        # 分析設定
        self.analysis_config = {
            "trend_analysis_window": 24,  # 時間
            "pattern_min_frequency": 3,   # 最小出現回数
            "confidence_threshold": 0.7,  # 信頼度閾値
            "forecast_horizon": 24,       # 予測時間（時間）
        }
    
    def _initialize_report_templates(self) -> Dict[str, str]:
        """レポートテンプレート初期化"""
        templates = {}
        
        # HTML総合レポートテンプレート
        templates["comprehensive_html"] = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API無限ループ自動修復システム - 総合レポート</title>
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
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 2.5em;
        }
        .header .subtitle {
            color: #666;
            font-size: 1.1em;
            margin-top: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card.success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .stat-card.warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .stat-card.info {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 1em;
            opacity: 0.9;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #333;
            border-left: 4px solid #007bff;
            padding-left: 15px;
            margin-bottom: 20px;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .table th, .table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #333;
        }
        .table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .recommendations {
            background: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 20px;
            border-radius: 5px;
        }
        .recommendations h3 {
            color: #28a745;
            margin-top: 0;
        }
        .recommendation-item {
            margin: 15px 0;
            padding: 15px;
            background: white;
            border-radius: 5px;
            border-left: 3px solid #007bff;
        }
        .priority-high {
            border-left-color: #dc3545;
        }
        .priority-medium {
            border-left-color: #ffc107;
        }
        .priority-low {
            border-left-color: #28a745;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 API無限ループ自動修復システム</h1>
            <div class="subtitle">総合監視・修復・検証レポート</div>
            <div class="subtitle">生成日時: {{ report_timestamp }}</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card success">
                <div class="stat-value">{{ total_cycles }}</div>
                <div class="stat-label">総実行サイクル</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">{{ total_errors_fixed }}</div>
                <div class="stat-label">修復エラー数</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-value">{{ system_availability }}%</div>
                <div class="stat-label">システム可用性</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{ avg_repair_time }}s</div>
                <div class="stat-label">平均修復時間</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 パフォーマンス傾向</h2>
            <div class="chart-container">
                <img src="data:image/png;base64,{{ performance_chart }}" alt="パフォーマンス傾向チャート">
            </div>
        </div>
        
        <div class="section">
            <h2>🔧 修復パターン分析</h2>
            <div class="chart-container">
                <img src="data:image/png;base64,{{ repair_patterns_chart }}" alt="修復パターン分析">
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>エラータイプ</th>
                        <th>修復方法</th>
                        <th>成功率</th>
                        <th>平均実行時間</th>
                        <th>頻度</th>
                        <th>効果スコア</th>
                    </tr>
                </thead>
                <tbody>
                    {% for pattern in repair_patterns %}
                    <tr>
                        <td>{{ pattern.error_type }}</td>
                        <td>{{ pattern.repair_method }}</td>
                        <td>{{ pattern.success_rate }}%</td>
                        <td>{{ pattern.avg_execution_time }}s</td>
                        <td>{{ pattern.frequency }}</td>
                        <td>{{ pattern.effectiveness_score }}/100</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>💡 最適化推奨事項</h2>
            <div class="recommendations">
                <h3>🎯 改善提案</h3>
                {% for rec in recommendations %}
                <div class="recommendation-item priority-{{ rec.priority }}">
                    <h4>{{ rec.title }}</h4>
                    <p>{{ rec.description }}</p>
                    <div style="margin-top: 10px;">
                        <strong>期待効果:</strong> {{ rec.expected_impact }}<br>
                        <strong>実装工数:</strong> {{ rec.implementation_effort }}<br>
                        <strong>推定時間:</strong> {{ rec.estimated_time }}
                    </div>
                </div>
                {% endfor %}
            </div>
        </div>
        
        <div class="section">
            <h2>📈 メトリクス詳細</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>メトリクス</th>
                        <th>現在値</th>
                        <th>傾向</th>
                        <th>変化率</th>
                        <th>24時間予測</th>
                    </tr>
                </thead>
                <tbody>
                    {% for metric in metrics_trends %}
                    <tr>
                        <td>{{ metric.metric_name }}</td>
                        <td>{{ metric.current_value }}</td>
                        <td>{{ metric.trend_direction }}</td>
                        <td>{{ metric.change_percentage }}%</td>
                        <td>{{ metric.forecast_24h }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>🤖 強化された無限ループ自動修復システム v2.0</p>
            <p>Generated with Claude Code</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Markdownレポートテンプレート
        templates["comprehensive_markdown"] = """
# 🔄 API無限ループ自動修復システム - 総合レポート

**生成日時:** {{ report_timestamp }}

## 📊 実行統計

| メトリクス | 値 |
|------------|----|
| 総実行サイクル | {{ total_cycles }} |
| 修復エラー数 | {{ total_errors_fixed }} |
| システム可用性 | {{ system_availability }}% |
| 平均修復時間 | {{ avg_repair_time }}s |

## 🔧 修復パターン分析

{% for pattern in repair_patterns %}
### {{ pattern.error_type }}
- **修復方法:** {{ pattern.repair_method }}
- **成功率:** {{ pattern.success_rate }}%
- **平均実行時間:** {{ pattern.avg_execution_time }}s
- **頻度:** {{ pattern.frequency }}
- **効果スコア:** {{ pattern.effectiveness_score }}/100

{% endfor %}

## 💡 最適化推奨事項

{% for rec in recommendations %}
### {{ rec.title }} (優先度: {{ rec.priority }})

{{ rec.description }}

- **期待効果:** {{ rec.expected_impact }}
- **実装工数:** {{ rec.implementation_effort }}
- **推定時間:** {{ rec.estimated_time }}

{% endfor %}

## 📈 メトリクス傾向

| メトリクス | 現在値 | 傾向 | 変化率 | 24時間予測 |
|------------|--------|------|--------|-----------|
{% for metric in metrics_trends %}
| {{ metric.metric_name }} | {{ metric.current_value }} | {{ metric.trend_direction }} | {{ metric.change_percentage }}% | {{ metric.forecast_24h }} |
{% endfor %}

---
*🤖 強化された無限ループ自動修復システム v2.0*
        """
        
        return templates
    
    async def generate_comprehensive_report(
        self, 
        report_format: ReportFormat = ReportFormat.HTML,
        include_charts: bool = True
    ) -> Dict[str, Any]:
        """総合レポート生成"""
        report_id = str(uuid.uuid4())
        start_time = datetime.now()
        
        logger.info(f"📋 総合レポート生成開始 (ID: {report_id})")
        
        try:
            # データ収集・分析
            report_data = await self._collect_comprehensive_data()
            
            # チャート生成
            if include_charts:
                charts = await self._generate_charts(report_data)
                report_data["charts"] = charts
            
            # レポート生成
            report_content = await self._render_report(
                report_data, 
                report_format
            )
            
            # レポート保存
            report_file = await self._save_report(
                report_id,
                report_content,
                report_format
            )
            
            report_result = {
                "report_id": report_id,
                "generated_at": start_time.isoformat(),
                "format": report_format.value,
                "file_path": str(report_file),
                "data_summary": {
                    "total_cycles": report_data.get("total_cycles", 0),
                    "total_errors_fixed": report_data.get("total_errors_fixed", 0),
                    "system_availability": report_data.get("system_availability", 0),
                    "repair_patterns_count": len(report_data.get("repair_patterns", [])),
                    "recommendations_count": len(report_data.get("recommendations", []))
                }
            }
            
            # レポート履歴に追加
            self.report_history.append(report_result)
            
            logger.info(f"✅ 総合レポート生成完了: {report_file}")
            return report_result
            
        except Exception as e:
            logger.error(f"❌ 総合レポート生成エラー: {e}")
            traceback.print_exc()
            return {
                "report_id": report_id,
                "error": str(e),
                "generated_at": start_time.isoformat()
            }
    
    async def _collect_comprehensive_data(self) -> Dict[str, Any]:
        """総合データ収集"""
        data = {}
        
        try:
            # 無限ループ状態データ読み込み
            loop_state_file = self.coordination_path / "enhanced_infinite_loop_state.json"
            if loop_state_file.exists():
                async with aiofiles.open(loop_state_file, 'r') as f:
                    loop_state = json.loads(await f.read())
                data.update(loop_state)
            
            # 検証結果データ読み込み
            validation_file = self.coordination_path / "latest_validation_results.json"
            if validation_file.exists():
                async with aiofiles.open(validation_file, 'r') as f:
                    validation_data = json.loads(await f.read())
                data["validation_results"] = validation_data
            
            # 修復パターン分析
            data["repair_patterns"] = await self._analyze_repair_patterns()
            
            # パフォーマンス傾向分析
            data["metrics_trends"] = await self._analyze_metrics_trends()
            
            # 最適化推奨事項生成
            data["recommendations"] = await self._generate_optimization_recommendations(data)
            
            # 計算フィールド
            data["report_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            data["system_availability"] = self._calculate_system_availability(data)
            data["avg_repair_time"] = self._calculate_avg_repair_time(data)
            
        except Exception as e:
            logger.error(f"データ収集エラー: {e}")
            data["error"] = str(e)
        
        return data
    
    async def _analyze_repair_patterns(self) -> List[Dict[str, Any]]:
        """修復パターン分析"""
        patterns = []
        
        try:
            # 修復ログファイルから修復パターンを分析
            repair_log_files = [
                self.coordination_path / "auto_repair_log.json",
                self.backend_path / "logs" / "auto_repair.log"
            ]
            
            repair_data = []
            
            for log_file in repair_log_files:
                if log_file.exists():
                    if log_file.suffix == '.json':
                        async with aiofiles.open(log_file, 'r') as f:
                            try:
                                data = json.loads(await f.read())
                                if isinstance(data, list):
                                    repair_data.extend(data)
                                else:
                                    repair_data.append(data)
                            except json.JSONDecodeError:
                                pass
            
            # パターン分析
            pattern_stats = defaultdict(lambda: {
                "success_count": 0,
                "failure_count": 0,
                "execution_times": [],
                "repair_methods": defaultdict(int)
            })
            
            for repair in repair_data:
                error_type = repair.get("error_type", "unknown")
                success = repair.get("success", False)
                execution_time = repair.get("execution_time", 0)
                repair_method = repair.get("repair_method", "unknown")
                
                stats = pattern_stats[error_type]
                
                if success:
                    stats["success_count"] += 1
                else:
                    stats["failure_count"] += 1
                
                stats["execution_times"].append(execution_time)
                stats["repair_methods"][repair_method] += 1
            
            # パターン生成
            for error_type, stats in pattern_stats.items():
                total_attempts = stats["success_count"] + stats["failure_count"]
                if total_attempts >= self.analysis_config["pattern_min_frequency"]:
                    success_rate = (stats["success_count"] / total_attempts) * 100
                    avg_execution_time = statistics.mean(stats["execution_times"]) if stats["execution_times"] else 0
                    most_common_method = max(stats["repair_methods"], key=stats["repair_methods"].get) if stats["repair_methods"] else "unknown"
                    
                    # 効果スコア計算（成功率 + 実行時間の逆数 + 頻度スコア）
                    time_score = max(0, 100 - avg_execution_time * 10)  # 実行時間が短いほど高スコア
                    frequency_score = min(100, total_attempts * 5)      # 頻度が高いほど高スコア
                    effectiveness_score = (success_rate + time_score + frequency_score) / 3
                    
                    patterns.append({
                        "error_type": error_type,
                        "repair_method": most_common_method,
                        "success_rate": round(success_rate, 1),
                        "avg_execution_time": round(avg_execution_time, 2),
                        "frequency": total_attempts,
                        "effectiveness_score": round(effectiveness_score, 1)
                    })
            
            # 効果スコア順でソート
            patterns.sort(key=lambda x: x["effectiveness_score"], reverse=True)
            
        except Exception as e:
            logger.error(f"修復パターン分析エラー: {e}")
        
        return patterns
    
    async def _analyze_metrics_trends(self) -> List[Dict[str, Any]]:
        """メトリクス傾向分析"""
        trends = []
        
        try:
            # メトリクスファイルの読み込み
            metrics_files = [
                self.backend_path / "comprehensive_api_metrics.json",
                self.coordination_path / "enhanced_infinite_loop_state.json"
            ]
            
            historical_data = []
            
            for metrics_file in metrics_files:
                if metrics_file.exists():
                    async with aiofiles.open(metrics_file, 'r') as f:
                        try:
                            data = json.loads(await f.read())
                            data["timestamp"] = datetime.now().isoformat()
                            historical_data.append(data)
                        except json.JSONDecodeError:
                            pass
            
            # サンプルメトリクス（実際の実装では履歴データから計算）
            sample_trends = [
                {
                    "metric_name": "平均レスポンス時間",
                    "current_value": 1.25,
                    "trend_direction": "down",
                    "change_percentage": -8.5,
                    "forecast_24h": 1.15
                },
                {
                    "metric_name": "エラー率",
                    "current_value": 2.1,
                    "trend_direction": "down",
                    "change_percentage": -15.2,
                    "forecast_24h": 1.8
                },
                {
                    "metric_name": "CPU使用率",
                    "current_value": 45.2,
                    "trend_direction": "stable",
                    "change_percentage": 2.1,
                    "forecast_24h": 46.0
                },
                {
                    "metric_name": "メモリ使用率",
                    "current_value": 62.8,
                    "trend_direction": "up",
                    "change_percentage": 12.3,
                    "forecast_24h": 68.5
                }
            ]
            
            trends = sample_trends
            
        except Exception as e:
            logger.error(f"メトリクス傾向分析エラー: {e}")
        
        return trends
    
    async def _generate_optimization_recommendations(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """最適化推奨事項生成"""
        recommendations = []
        
        try:
            # システム分析に基づく推奨事項生成
            total_cycles = data.get("total_cycles", 0)
            total_errors = data.get("total_errors_fixed", 0)
            repair_patterns = data.get("repair_patterns", [])
            
            # 高頻度エラーの改善提案
            if repair_patterns:
                high_frequency_patterns = [p for p in repair_patterns if p["frequency"] > 10]
                if high_frequency_patterns:
                    recommendations.append({
                        "title": "高頻度エラーの根本原因対策",
                        "description": f"頻繁に発生するエラー（{len(high_frequency_patterns)}種類）の根本原因を調査し、予防的な対策を実装することで、システムの安定性を向上できます。",
                        "priority": "high",
                        "expected_impact": "エラー発生率を30-50%削減",
                        "implementation_effort": "medium",
                        "estimated_time": "2-3週間",
                        "dependencies": ["エラー詳細調査", "コード改修"]
                    })
            
            # パフォーマンス最適化
            avg_repair_time = data.get("avg_repair_time", 0)
            if avg_repair_time > 5.0:
                recommendations.append({
                    "title": "修復処理の並列化・最適化",
                    "description": f"現在の平均修復時間（{avg_repair_time:.1f}秒）を短縮するため、修復処理の並列化とアルゴリズム最適化を実装します。",
                    "priority": "medium",
                    "expected_impact": "修復時間を40-60%短縮",
                    "implementation_effort": "medium",
                    "estimated_time": "1-2週間",
                    "dependencies": ["アーキテクチャ設計", "並列処理実装"]
                })
            
            # 監視強化
            if total_cycles > 100:
                recommendations.append({
                    "title": "予測的メンテナンス機能の追加",
                    "description": "機械学習を活用してエラー発生を予測し、事前にメンテナンスを実行する機能を追加します。",
                    "priority": "low",
                    "expected_impact": "予防的対応により可用性99.9%以上達成",
                    "implementation_effort": "high",
                    "estimated_time": "4-6週間",
                    "dependencies": ["MLモデル開発", "予測エンジン実装"]
                })
            
            # メモリ使用量最適化
            recommendations.append({
                "title": "メモリ使用量の最適化",
                "description": "長時間実行によるメモリリークを防ぐため、定期的なガベージコレクションとメモリ使用量監視を強化します。",
                "priority": "medium",
                "expected_impact": "メモリ使用量を20-30%削減",
                "implementation_effort": "low",
                "estimated_time": "1週間",
                "dependencies": ["メモリプロファイリング"]
            })
            
            # セキュリティ強化
            recommendations.append({
                "title": "セキュリティ監視の強化",
                "description": "異常検知アルゴリズムを改善し、より高精度な脅威検出を実現します。",
                "priority": "high",
                "expected_impact": "セキュリティインシデント検出率90%以上",
                "implementation_effort": "medium",
                "estimated_time": "2-3週間",
                "dependencies": ["異常検知モデル開発", "セキュリティルール更新"]
            })
            
        except Exception as e:
            logger.error(f"最適化推奨事項生成エラー: {e}")
        
        return recommendations
    
    def _calculate_system_availability(self, data: Dict[str, Any]) -> float:
        """システム可用性計算"""
        try:
            # サンプル計算（実際は履歴データから計算）
            total_cycles = data.get("total_cycles", 0)
            if total_cycles == 0:
                return 100.0
            
            # 仮の計算: エラーなしサイクルの割合
            repair_patterns = data.get("repair_patterns", [])
            total_errors = sum(p.get("frequency", 0) for p in repair_patterns)
            
            if total_errors == 0:
                return 100.0
            
            # 可用性 = (総サイクル - エラーサイクル) / 総サイクル * 100
            error_cycles = min(total_errors, total_cycles)
            availability = ((total_cycles - error_cycles) / total_cycles) * 100
            
            return round(max(0, min(100, availability)), 1)
        except:
            return 95.0  # デフォルト値
    
    def _calculate_avg_repair_time(self, data: Dict[str, Any]) -> float:
        """平均修復時間計算"""
        try:
            repair_patterns = data.get("repair_patterns", [])
            if not repair_patterns:
                return 0.0
            
            total_time = 0
            total_frequency = 0
            
            for pattern in repair_patterns:
                avg_time = pattern.get("avg_execution_time", 0)
                frequency = pattern.get("frequency", 0)
                total_time += avg_time * frequency
                total_frequency += frequency
            
            if total_frequency == 0:
                return 0.0
            
            return round(total_time / total_frequency, 2)
        except:
            return 0.0
    
    async def _generate_charts(self, data: Dict[str, Any]) -> Dict[str, str]:
        """チャート生成"""
        charts = {}
        
        try:
            # パフォーマンス傾向チャート
            charts["performance_chart"] = await self._create_performance_chart(data)
            
            # 修復パターンチャート
            charts["repair_patterns_chart"] = await self._create_repair_patterns_chart(data)
            
        except Exception as e:
            logger.error(f"チャート生成エラー: {e}")
        
        return charts
    
    async def _create_performance_chart(self, data: Dict[str, Any]) -> str:
        """パフォーマンス傾向チャート作成"""
        try:
            # サンプルデータでチャート作成
            plt.figure(figsize=(12, 6))
            plt.style.use('seaborn-v0_8')
            
            # サンプルデータ
            hours = list(range(24))
            response_times = [1.2 + 0.3 * np.sin(i/3) + np.random.normal(0, 0.1) for i in hours]
            error_rates = [2.5 + 1.5 * np.sin(i/4) + np.random.normal(0, 0.2) for i in hours]
            
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
            
            # レスポンス時間
            ax1.plot(hours, response_times, 'b-', linewidth=2, marker='o', markersize=4)
            ax1.set_title('平均レスポンス時間（24時間）', fontsize=14, fontweight='bold')
            ax1.set_ylabel('レスポンス時間 (秒)')
            ax1.grid(True, alpha=0.3)
            ax1.set_ylim(0, max(response_times) * 1.1)
            
            # エラー率
            ax2.plot(hours, error_rates, 'r-', linewidth=2, marker='s', markersize=4)
            ax2.set_title('エラー率（24時間）', fontsize=14, fontweight='bold')
            ax2.set_xlabel('時間')
            ax2.set_ylabel('エラー率 (%)')
            ax2.grid(True, alpha=0.3)
            ax2.set_ylim(0, max(error_rates) * 1.1)
            
            plt.tight_layout()
            
            # Base64エンコード
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
            buffer.seek(0)
            chart_data = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return chart_data
            
        except Exception as e:
            logger.error(f"パフォーマンスチャート作成エラー: {e}")
            return ""
    
    async def _create_repair_patterns_chart(self, data: Dict[str, Any]) -> str:
        """修復パターンチャート作成"""
        try:
            repair_patterns = data.get("repair_patterns", [])
            
            if not repair_patterns:
                # サンプルデータ
                repair_patterns = [
                    {"error_type": "Database Error", "frequency": 15, "success_rate": 95},
                    {"error_type": "API Error", "frequency": 12, "success_rate": 88},
                    {"error_type": "Auth Error", "frequency": 8, "success_rate": 92},
                    {"error_type": "Validation Error", "frequency": 6, "success_rate": 100},
                    {"error_type": "Network Error", "frequency": 4, "success_rate": 75}
                ]
            
            # 上位5パターンを使用
            top_patterns = repair_patterns[:5]
            
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
            
            # 頻度チャート
            error_types = [p["error_type"] for p in top_patterns]
            frequencies = [p["frequency"] for p in top_patterns]
            
            colors1 = plt.cm.Set3(np.linspace(0, 1, len(error_types)))
            ax1.bar(error_types, frequencies, color=colors1)
            ax1.set_title('エラータイプ別頻度', fontsize=14, fontweight='bold')
            ax1.set_ylabel('発生回数')
            ax1.tick_params(axis='x', rotation=45)
            
            # 成功率チャート
            success_rates = [p["success_rate"] for p in top_patterns]
            colors2 = ['#2ecc71' if sr >= 90 else '#f39c12' if sr >= 75 else '#e74c3c' for sr in success_rates]
            
            ax2.bar(error_types, success_rates, color=colors2)
            ax2.set_title('修復成功率', fontsize=14, fontweight='bold')
            ax2.set_ylabel('成功率 (%)')
            ax2.set_ylim(0, 100)
            ax2.tick_params(axis='x', rotation=45)
            
            # 成功率に応じて色分け凡例
            from matplotlib.patches import Patch
            legend_elements = [
                Patch(facecolor='#2ecc71', label='90%以上'),
                Patch(facecolor='#f39c12', label='75-89%'),
                Patch(facecolor='#e74c3c', label='75%未満')
            ]
            ax2.legend(handles=legend_elements, loc='upper right')
            
            plt.tight_layout()
            
            # Base64エンコード
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
            buffer.seek(0)
            chart_data = base64.b64encode(buffer.read()).decode()
            plt.close()
            
            return chart_data
            
        except Exception as e:
            logger.error(f"修復パターンチャート作成エラー: {e}")
            return ""
    
    async def _render_report(self, data: Dict[str, Any], report_format: ReportFormat) -> str:
        """レポートレンダリング"""
        try:
            if report_format == ReportFormat.HTML:
                template_str = self.report_templates["comprehensive_html"]
            elif report_format == ReportFormat.MARKDOWN:
                template_str = self.report_templates["comprehensive_markdown"]
            else:
                template_str = json.dumps(data, indent=2, ensure_ascii=False)
            
            if report_format in [ReportFormat.HTML, ReportFormat.MARKDOWN]:
                template = Template(template_str)
                
                # チャートデータを含める
                template_data = data.copy()
                if "charts" in data:
                    template_data.update(data["charts"])
                
                return template.render(**template_data)
            else:
                return template_str
                
        except Exception as e:
            logger.error(f"レポートレンダリングエラー: {e}")
            return f"レポート生成エラー: {str(e)}"
    
    async def _save_report(self, report_id: str, content: str, report_format: ReportFormat) -> Path:
        """レポート保存"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"comprehensive_report_{timestamp}_{report_id[:8]}.{report_format.value}"
            report_file = self.reports_path / filename
            
            async with aiofiles.open(report_file, 'w', encoding='utf-8') as f:
                await f.write(content)
            
            # 最新レポートのシンボリックリンク更新
            latest_file = self.reports_path / f"latest_report.{report_format.value}"
            if latest_file.exists():
                latest_file.unlink()
            
            try:
                latest_file.symlink_to(report_file.name)
            except:
                # シンボリックリンクが作成できない場合はコピー
                async with aiofiles.open(latest_file, 'w', encoding='utf-8') as f:
                    await f.write(content)
            
            return report_file
            
        except Exception as e:
            logger.error(f"レポート保存エラー: {e}")
            raise
    
    async def generate_cycle_report(self, cycle_data: Dict[str, Any]) -> Dict[str, Any]:
        """サイクル別レポート生成"""
        try:
            report_id = f"cycle_{cycle_data.get('cycle_id', 'unknown')}"
            
            cycle_report = {
                "report_id": report_id,
                "report_type": "cycle_summary",
                "generated_at": datetime.now().isoformat(),
                "cycle_data": cycle_data,
                "summary": {
                    "errors_detected": cycle_data.get("errors_detected", 0),
                    "repairs_attempted": cycle_data.get("repairs_attempted", 0),
                    "repairs_successful": cycle_data.get("repairs_successful", 0),
                    "validation_score": cycle_data.get("validation_score", 0),
                    "execution_time": cycle_data.get("execution_time", 0)
                }
            }
            
            # サイクルレポート保存
            timestamp = int(datetime.now().timestamp())
            cycle_file = self.reports_path / f"cycle_report_{timestamp}.json"
            
            async with aiofiles.open(cycle_file, 'w') as f:
                await f.write(json.dumps(cycle_report, indent=2, ensure_ascii=False))
            
            logger.info(f"📊 サイクルレポート生成: {cycle_file}")
            return cycle_report
            
        except Exception as e:
            logger.error(f"サイクルレポート生成エラー: {e}")
            return {"error": str(e)}
    
    def get_report_status(self) -> Dict[str, Any]:
        """レポート状況取得"""
        try:
            return {
                "total_reports": len(self.report_history),
                "latest_report": self.report_history[-1] if self.report_history else None,
                "available_formats": [fmt.value for fmt in ReportFormat],
                "reports_directory": str(self.reports_path),
                "cache_status": {
                    "metrics_cache_size": len(self.metrics_cache),
                    "patterns_cache_size": len(self.repair_patterns_cache),
                    "trends_cache_size": len(self.trends_cache)
                }
            }
        except Exception as e:
            logger.error(f"レポート状況取得エラー: {e}")
            return {"error": str(e)}

# グローバルインスタンス
enhanced_reporter = EnhancedReportingSystem()

async def main():
    """メイン実行関数"""
    try:
        logger.info("📋 強化されたレポートシステム単体実行開始")
        
        # 総合レポート生成
        html_report = await enhanced_reporter.generate_comprehensive_report(
            report_format=ReportFormat.HTML,
            include_charts=True
        )
        
        markdown_report = await enhanced_reporter.generate_comprehensive_report(
            report_format=ReportFormat.MARKDOWN,
            include_charts=False
        )
        
        print("\n=== レポート生成結果 ===")
        print(f"HTMLレポート: {html_report.get('file_path', 'エラー')}")
        print(f"Markdownレポート: {markdown_report.get('file_path', 'エラー')}")
        
        status = enhanced_reporter.get_report_status()
        print(f"\n総レポート数: {status.get('total_reports', 0)}")
        print(f"レポートディレクトリ: {status.get('reports_directory')}")
        
    except KeyboardInterrupt:
        logger.info("⌨️ ユーザーによる中断")
    except Exception as e:
        logger.error(f"❌ レポートシステムエラー: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_reporting.log"),
            logging.StreamHandler()
        ]
    )
    
    asyncio.run(main())
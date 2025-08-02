"""
MCP Playwright Error Detection and Monitoring System
バックエンドAPIのエラー検知・修復システム
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import httpx
import requests
import traceback
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings


@dataclass
class ErrorDetails:
    """エラー詳細情報"""
    timestamp: str
    error_type: str
    error_message: str
    error_code: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    severity: str = "medium"
    stack_trace: Optional[str] = None
    fix_attempted: bool = False
    fix_successful: bool = False
    fix_description: Optional[str] = None


@dataclass
class APIHealthMetrics:
    """API健康状態メトリクス"""
    timestamp: str
    total_endpoints: int
    healthy_endpoints: int
    unhealthy_endpoints: int
    response_time_avg: float
    error_rate: float
    uptime_percentage: float
    database_status: str
    security_status: str


class MCPPlaywrightErrorMonitor:
    """MCP Playwright Error Monitoring System"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.base_url = "http://192.168.3.135:8000"
        self.api_docs_url = f"{self.base_url}/docs"
        self.error_log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/mcp_playwright_errors.log"
        self.metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/mcp_playwright_metrics.json"
        self.repair_log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/mcp_repair_actions.log"
        
        # エラー蓄積と統計
        self.error_history: List[ErrorDetails] = []
        self.repair_actions: List[Dict] = []
        self.monitoring_active = False
        
        # API監視対象エンドポイント
        self.api_endpoints = [
            {"path": "/health", "method": "GET", "critical": True},
            {"path": "/version", "method": "GET", "critical": False},
            {"path": "/api/v1/incidents", "method": "GET", "critical": True},
            {"path": "/api/v1/problems", "method": "GET", "critical": True},
            {"path": "/api/v1/users", "method": "GET", "critical": True},
            {"path": "/api/v1/dashboard", "method": "GET", "critical": True},
            {"path": "/docs", "method": "GET", "critical": False},
        ]
        
        # パフォーマンス閾値
        self.performance_thresholds = {
            "response_time_warning": 2.0,  # 2秒
            "response_time_critical": 5.0,  # 5秒
            "error_rate_warning": 0.05,    # 5%
            "error_rate_critical": 0.10,   # 10%
        }
        
        # セキュリティ監視パターン
        self.security_patterns = [
            "SQL injection",
            "XSS",
            "CSRF",
            "authentication failed",
            "authorization denied",
            "rate limit exceeded",
            "suspicious activity"
        ]
        
    async def start_infinite_monitoring(self):
        """無限ループでの監視開始"""
        self.monitoring_active = True
        self.logger.info("Starting MCP Playwright infinite monitoring loop...")
        
        loop_count = 0
        consecutive_errors = 0
        max_consecutive_errors = 10
        
        while self.monitoring_active:
            try:
                loop_count += 1
                self.logger.info(f"Starting monitoring loop #{loop_count}")
                
                # 1. API Health Check
                health_metrics = await self.check_api_health()
                
                # 2. Database Connection Check
                db_status = await self.check_database_connectivity()
                
                # 3. Performance Monitoring
                perf_metrics = await self.monitor_performance()
                
                # 4. Security Scanning
                security_status = await self.scan_security_issues()
                
                # 5. Error Log Analysis
                log_analysis = await self.analyze_error_logs()
                
                # 6. Auto Repair if errors detected
                if self._has_critical_errors(health_metrics, db_status, perf_metrics, security_status):
                    await self.execute_auto_repair()
                
                # 7. Generate Report
                await self.generate_monitoring_report(health_metrics, db_status, perf_metrics, security_status, log_analysis)
                
                consecutive_errors = 0  # Reset error counter on success
                
                # Wait before next iteration
                await asyncio.sleep(5)  # 5秒間隔で監視
                
            except Exception as e:
                consecutive_errors += 1
                self.logger.error(f"Error in monitoring loop #{loop_count}: {str(e)}")
                self.logger.error(traceback.format_exc())
                
                # Too many consecutive errors - attempt system recovery
                if consecutive_errors >= max_consecutive_errors:
                    self.logger.critical(f"Too many consecutive errors ({consecutive_errors}). Attempting system recovery...")
                    await self.emergency_system_recovery()
                    consecutive_errors = 0
                
                # Exponential backoff on errors
                wait_time = min(60, 5 * (2 ** min(consecutive_errors, 5)))
                await asyncio.sleep(wait_time)
    
    async def check_api_health(self) -> APIHealthMetrics:
        """API健康状態チェック"""
        start_time = time.time()
        healthy_count = 0
        total_response_time = 0
        endpoint_results = []
        
        for endpoint in self.api_endpoints:
            try:
                url = f"{self.base_url}{endpoint['path']}"
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response_start = time.time()
                    response = await client.request(endpoint['method'], url)
                    response_time = time.time() - response_start
                    
                    total_response_time += response_time
                    
                    if response.status_code < 400:
                        healthy_count += 1
                        status = "healthy"
                    else:
                        status = "unhealthy"
                        # Record error
                        error = ErrorDetails(
                            timestamp=datetime.now().isoformat(),
                            error_type="API_ERROR",
                            error_message=f"HTTP {response.status_code}",
                            error_code=str(response.status_code),
                            endpoint=endpoint['path'],
                            status_code=response.status_code,
                            severity="high" if endpoint['critical'] else "medium"
                        )
                        self.error_history.append(error)
                    
                    endpoint_results.append({
                        "endpoint": endpoint['path'],
                        "status": status,
                        "response_time": response_time,
                        "status_code": response.status_code
                    })
                    
            except Exception as e:
                self.logger.error(f"Error checking endpoint {endpoint['path']}: {str(e)}")
                endpoint_results.append({
                    "endpoint": endpoint['path'],
                    "status": "error",
                    "response_time": 0,
                    "error": str(e)
                })
                
                # Record error
                error = ErrorDetails(
                    timestamp=datetime.now().isoformat(),
                    error_type="CONNECTION_ERROR",
                    error_message=str(e),
                    endpoint=endpoint['path'],
                    severity="critical" if endpoint['critical'] else "high",
                    stack_trace=traceback.format_exc()
                )
                self.error_history.append(error)
        
        total_endpoints = len(self.api_endpoints)
        avg_response_time = total_response_time / total_endpoints if total_endpoints > 0 else 0
        error_rate = (total_endpoints - healthy_count) / total_endpoints if total_endpoints > 0 else 0
        uptime_percentage = (healthy_count / total_endpoints * 100) if total_endpoints > 0 else 0
        
        metrics = APIHealthMetrics(
            timestamp=datetime.now().isoformat(),
            total_endpoints=total_endpoints,
            healthy_endpoints=healthy_count,
            unhealthy_endpoints=total_endpoints - healthy_count,
            response_time_avg=avg_response_time,
            error_rate=error_rate,
            uptime_percentage=uptime_percentage,
            database_status="unknown",
            security_status="unknown"
        )
        
        self.logger.info(f"API Health Check completed: {healthy_count}/{total_endpoints} endpoints healthy")
        return metrics
    
    async def check_database_connectivity(self) -> Dict[str, Any]:
        """データベース接続性チェック"""
        db_status = {
            "status": "unknown",
            "connection_time": 0,
            "query_time": 0,
            "error": None,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # SQLiteデータベース接続テスト
            db_path = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/itsm.db"
            
            start_time = time.time()
            engine = create_engine(f"sqlite:///{db_path}")
            connection_time = time.time() - start_time
            
            # Simple query test
            query_start = time.time()
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            query_time = time.time() - query_start
            
            db_status.update({
                "status": "healthy",
                "connection_time": connection_time,
                "query_time": query_time
            })
            
            self.logger.info(f"Database connectivity check passed: {query_time:.3f}s")
            
        except SQLAlchemyError as e:
            db_status.update({
                "status": "error",
                "error": str(e)
            })
            
            # Record database error
            error = ErrorDetails(
                timestamp=datetime.now().isoformat(),
                error_type="DATABASE_ERROR",
                error_message=str(e),
                severity="critical",
                stack_trace=traceback.format_exc()
            )
            self.error_history.append(error)
            
            self.logger.error(f"Database connectivity check failed: {str(e)}")
        
        except Exception as e:
            db_status.update({
                "status": "error",
                "error": str(e)
            })
            
            self.logger.error(f"Unexpected database error: {str(e)}")
        
        return db_status
    
    async def monitor_performance(self) -> Dict[str, Any]:
        """パフォーマンス監視"""
        perf_metrics = {
            "timestamp": datetime.now().isoformat(),
            "api_response_times": {},
            "slow_endpoints": [],
            "performance_warnings": [],
            "overall_status": "healthy"
        }
        
        try:
            # 各エンドポイントのレスポンス時間を測定
            for endpoint in self.api_endpoints:
                try:
                    url = f"{self.base_url}{endpoint['path']}"
                    
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        start_time = time.time()
                        response = await client.request(endpoint['method'], url)
                        response_time = time.time() - start_time
                        
                        perf_metrics["api_response_times"][endpoint['path']] = response_time
                        
                        # Check thresholds
                        if response_time > self.performance_thresholds["response_time_critical"]:
                            perf_metrics["slow_endpoints"].append({
                                "endpoint": endpoint['path'],
                                "response_time": response_time,
                                "severity": "critical"
                            })
                            perf_metrics["overall_status"] = "critical"
                            
                        elif response_time > self.performance_thresholds["response_time_warning"]:
                            perf_metrics["slow_endpoints"].append({
                                "endpoint": endpoint['path'],
                                "response_time": response_time,
                                "severity": "warning"
                            })
                            if perf_metrics["overall_status"] == "healthy":
                                perf_metrics["overall_status"] = "warning"
                
                except Exception as e:
                    self.logger.error(f"Performance check error for {endpoint['path']}: {str(e)}")
            
            # Generate performance warnings
            if perf_metrics["slow_endpoints"]:
                perf_metrics["performance_warnings"] = [
                    f"Slow response detected: {ep['endpoint']} ({ep['response_time']:.2f}s)"
                    for ep in perf_metrics["slow_endpoints"]
                ]
            
            self.logger.info(f"Performance monitoring completed: {perf_metrics['overall_status']}")
            
        except Exception as e:
            perf_metrics["overall_status"] = "error"
            perf_metrics["error"] = str(e)
            self.logger.error(f"Performance monitoring failed: {str(e)}")
        
        return perf_metrics
    
    async def scan_security_issues(self) -> Dict[str, Any]:
        """セキュリティスキャン"""
        security_status = {
            "timestamp": datetime.now().isoformat(),
            "security_checks": {},
            "vulnerabilities": [],
            "overall_status": "secure"
        }
        
        try:
            # 1. HTTPS Check
            security_status["security_checks"]["https"] = await self._check_https()
            
            # 2. Headers Security Check
            security_status["security_checks"]["headers"] = await self._check_security_headers()
            
            # 3. Authentication Check
            security_status["security_checks"]["auth"] = await self._check_authentication()
            
            # 4. Rate Limiting Check
            security_status["security_checks"]["rate_limiting"] = await self._check_rate_limiting()
            
            # 5. SQL Injection Basic Check
            security_status["security_checks"]["sql_injection"] = await self._check_sql_injection()
            
            # Evaluate overall security status
            failed_checks = [
                check for check, result in security_status["security_checks"].items()
                if not result.get("passed", False)
            ]
            
            if failed_checks:
                security_status["overall_status"] = "vulnerable"
                security_status["vulnerabilities"] = [
                    f"Failed security check: {check}" for check in failed_checks
                ]
            
            self.logger.info(f"Security scan completed: {security_status['overall_status']}")
            
        except Exception as e:
            security_status["overall_status"] = "error"
            security_status["error"] = str(e)
            self.logger.error(f"Security scan failed: {str(e)}")
        
        return security_status
    
    async def _check_https(self) -> Dict[str, Any]:
        """HTTPS接続チェック"""
        result = {"passed": False, "details": ""}
        
        try:
            # Check if HTTPS is properly configured
            if self.base_url.startswith("https://"):
                result["passed"] = True
                result["details"] = "HTTPS properly configured"
            else:
                result["details"] = "HTTP used instead of HTTPS - security risk"
                
        except Exception as e:
            result["details"] = f"HTTPS check failed: {str(e)}"
        
        return result
    
    async def _check_security_headers(self) -> Dict[str, Any]:
        """セキュリティヘッダーチェック"""
        result = {"passed": False, "details": "", "missing_headers": []}
        
        required_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security"
        ]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/health")
                
                missing = []
                for header in required_headers:
                    if header not in response.headers:
                        missing.append(header)
                
                if not missing:
                    result["passed"] = True
                    result["details"] = "All security headers present"
                else:
                    result["missing_headers"] = missing
                    result["details"] = f"Missing security headers: {', '.join(missing)}"
                    
        except Exception as e:
            result["details"] = f"Security headers check failed: {str(e)}"
        
        return result
    
    async def _check_authentication(self) -> Dict[str, Any]:
        """認証システムチェック"""
        result = {"passed": False, "details": ""}
        
        try:
            # Test authentication endpoint
            async with httpx.AsyncClient() as client:
                # Try accessing protected endpoint without auth
                response = await client.get(f"{self.base_url}/api/v1/users")
                
                if response.status_code == 401:
                    result["passed"] = True
                    result["details"] = "Authentication properly enforced"
                else:
                    result["details"] = f"Authentication check failed: got {response.status_code} instead of 401"
                    
        except Exception as e:
            result["details"] = f"Authentication check failed: {str(e)}"
        
        return result
    
    async def _check_rate_limiting(self) -> Dict[str, Any]:
        """レート制限チェック"""
        result = {"passed": False, "details": ""}
        
        try:
            # Send multiple requests quickly to test rate limiting
            async with httpx.AsyncClient() as client:
                responses = []
                for _ in range(10):
                    response = await client.get(f"{self.base_url}/health")
                    responses.append(response.status_code)
                
                # Check if any requests were rate limited
                if 429 in responses:
                    result["passed"] = True
                    result["details"] = "Rate limiting is active"
                else:
                    result["details"] = "Rate limiting may not be properly configured"
                    
        except Exception as e:
            result["details"] = f"Rate limiting check failed: {str(e)}"
        
        return result
    
    async def _check_sql_injection(self) -> Dict[str, Any]:
        """SQL インジェクション基本チェック"""
        result = {"passed": True, "details": ""}
        
        try:
            # Test with basic SQL injection payloads
            payloads = ["'", "'; DROP TABLE users; --", "' OR '1'='1"]
            
            async with httpx.AsyncClient() as client:
                for payload in payloads:
                    # Test against a search parameter if available
                    response = await client.get(f"{self.base_url}/api/v1/incidents", params={"search": payload})
                    
                    # If we get a database error, it might be vulnerable
                    if response.status_code == 500:
                        response_text = response.text.lower()
                        if any(word in response_text for word in ["sql", "syntax", "database"]):
                            result["passed"] = False
                            result["details"] = f"Potential SQL injection vulnerability detected with payload: {payload}"
                            break
            
            if result["passed"]:
                result["details"] = "No obvious SQL injection vulnerabilities detected"
                
        except Exception as e:
            result["details"] = f"SQL injection check failed: {str(e)}"
        
        return result
    
    async def analyze_error_logs(self) -> Dict[str, Any]:
        """エラーログ分析"""
        log_analysis = {
            "timestamp": datetime.now().isoformat(),
            "total_errors": len(self.error_history),
            "error_categories": {},
            "critical_errors": [],
            "recent_errors": [],
            "error_trends": {},
            "recommendations": []
        }
        
        try:
            # Categorize errors
            for error in self.error_history:
                error_type = error.error_type
                if error_type not in log_analysis["error_categories"]:
                    log_analysis["error_categories"][error_type] = 0
                log_analysis["error_categories"][error_type] += 1
                
                # Collect critical errors
                if error.severity == "critical":
                    log_analysis["critical_errors"].append(asdict(error))
            
            # Get recent errors (last hour)
            one_hour_ago = datetime.now() - timedelta(hours=1)
            recent_errors = [
                error for error in self.error_history
                if datetime.fromisoformat(error.timestamp) > one_hour_ago
            ]
            log_analysis["recent_errors"] = [asdict(e) for e in recent_errors[-10:]]  # Last 10
            
            # Generate recommendations
            if log_analysis["total_errors"] > 0:
                log_analysis["recommendations"] = self._generate_error_recommendations(log_analysis)
            
            self.logger.info(f"Error log analysis completed: {log_analysis['total_errors']} total errors")
            
        except Exception as e:
            log_analysis["error"] = str(e)
            self.logger.error(f"Error log analysis failed: {str(e)}")
        
        return log_analysis
    
    def _generate_error_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """エラー分析に基づく推奨事項生成"""
        recommendations = []
        
        error_categories = analysis.get("error_categories", {})
        
        if "DATABASE_ERROR" in error_categories:
            recommendations.append("Database connectivity issues detected - check database service and connection pool")
        
        if "API_ERROR" in error_categories:
            recommendations.append("API errors detected - review endpoint implementations and error handling")
        
        if "CONNECTION_ERROR" in error_categories:
            recommendations.append("Connection errors detected - check network connectivity and service availability")
        
        if len(analysis.get("critical_errors", [])) > 5:
            recommendations.append("High number of critical errors - immediate investigation required")
        
        if not recommendations:
            recommendations.append("System appears stable - continue monitoring")
        
        return recommendations
    
    def _has_critical_errors(self, health_metrics, db_status, perf_metrics, security_status) -> bool:
        """クリティカルエラーの検出"""
        # API health issues
        if health_metrics.error_rate > self.performance_thresholds["error_rate_critical"]:
            return True
        
        # Database issues
        if db_status["status"] == "error":
            return True
        
        # Performance issues
        if perf_metrics["overall_status"] == "critical":
            return True
        
        # Security issues
        if security_status["overall_status"] == "vulnerable":
            return True
        
        return False
    
    async def execute_auto_repair(self):
        """自動修復実行"""
        self.logger.info("Executing auto repair procedures...")
        
        repair_actions = []
        
        try:
            # 1. Restart application services if needed
            restart_result = await self._restart_services()
            repair_actions.append(restart_result)
            
            # 2. Clear caches
            cache_clear_result = await self._clear_caches()
            repair_actions.append(cache_clear_result)
            
            # 3. Database maintenance
            db_maintenance_result = await self._perform_database_maintenance()
            repair_actions.append(db_maintenance_result)
            
            # 4. Update error metrics
            await self._update_error_metrics()
            
            # Log repair actions
            self.repair_actions.extend(repair_actions)
            
            self.logger.info(f"Auto repair completed: {len(repair_actions)} actions performed")
            
        except Exception as e:
            self.logger.error(f"Auto repair failed: {str(e)}")
            repair_actions.append({
                "action": "auto_repair_failed",
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    async def _restart_services(self) -> Dict[str, Any]:
        """サービス再起動"""
        result = {
            "action": "restart_services",
            "status": "skipped",
            "details": "Service restart requires manual intervention",
            "timestamp": datetime.now().isoformat()
        }
        
        # In production, this would restart actual services
        # For safety, we'll just log the action
        self.logger.info("Service restart action logged (manual intervention required)")
        
        return result
    
    async def _clear_caches(self) -> Dict[str, Any]:
        """キャッシュクリア"""
        result = {
            "action": "clear_caches",
            "status": "success",
            "details": "Application caches cleared",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Clear application caches via API call
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.base_url}/api/v1/system/clear-cache")
                if response.status_code == 200:
                    result["status"] = "success"
                else:
                    result["status"] = "failed"
                    result["details"] = f"Cache clear failed: HTTP {response.status_code}"
        except Exception as e:
            result["status"] = "failed"
            result["details"] = f"Cache clear failed: {str(e)}"
        
        return result
    
    async def _perform_database_maintenance(self) -> Dict[str, Any]:
        """データベースメンテナンス"""
        result = {
            "action": "database_maintenance",
            "status": "success",
            "details": "Database maintenance completed",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Basic database maintenance operations
            db_path = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/itsm.db"
            engine = create_engine(f"sqlite:///{db_path}")
            
            with engine.connect() as conn:
                # VACUUM to reclaim space and optimize
                conn.execute(text("VACUUM"))
                
                # Analyze tables for better query planning
                conn.execute(text("ANALYZE"))
            
            result["details"] = "SQLite VACUUM and ANALYZE completed"
            
        except Exception as e:
            result["status"] = "failed"
            result["details"] = f"Database maintenance failed: {str(e)}"
        
        return result
    
    async def _update_error_metrics(self):
        """エラーメトリクス更新"""
        try:
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "total_errors": len(self.error_history),
                "error_categories": {},
                "error_severities": {},
                "fix_success_rate": 0,
                "health_status": "healthy" if len(self.error_history) == 0 else "unhealthy"
            }
            
            # Calculate error categories
            for error in self.error_history:
                error_type = error.error_type
                severity = error.severity
                
                if error_type not in metrics["error_categories"]:
                    metrics["error_categories"][error_type] = 0
                metrics["error_categories"][error_type] += 1
                
                if severity not in metrics["error_severities"]:
                    metrics["error_severities"][severity] = 0
                metrics["error_severities"][severity] += 1
            
            # Calculate fix success rate
            attempted_fixes = sum(1 for error in self.error_history if error.fix_attempted)
            successful_fixes = sum(1 for error in self.error_history if error.fix_successful)
            
            if attempted_fixes > 0:
                metrics["fix_success_rate"] = successful_fixes / attempted_fixes
            
            # Save metrics
            with open(self.metrics_file, 'w') as f:
                json.dump(metrics, f, indent=2)
            
        except Exception as e:
            self.logger.error(f"Failed to update error metrics: {str(e)}")
    
    async def emergency_system_recovery(self):
        """緊急システム復旧"""
        self.logger.critical("Initiating emergency system recovery...")
        
        recovery_actions = []
        
        try:
            # 1. Reset monitoring state
            self.error_history.clear()
            recovery_actions.append("Error history cleared")
            
            # 2. Wait for system stabilization
            await asyncio.sleep(30)
            recovery_actions.append("System stabilization delay completed")
            
            # 3. Perform health check
            health_result = await self.check_api_health()
            recovery_actions.append(f"Health check performed: {health_result.uptime_percentage}% uptime")
            
            # 4. Log recovery
            self.logger.info(f"Emergency recovery completed: {', '.join(recovery_actions)}")
            
        except Exception as e:
            self.logger.error(f"Emergency recovery failed: {str(e)}")
    
    async def generate_monitoring_report(self, health_metrics, db_status, perf_metrics, security_status, log_analysis):
        """監視レポート生成"""
        try:
            report = {
                "timestamp": datetime.now().isoformat(),
                "monitoring_cycle": len(self.repair_actions) + 1,
                "health_metrics": asdict(health_metrics),
                "database_status": db_status,
                "performance_metrics": perf_metrics,
                "security_status": security_status,
                "log_analysis": log_analysis,
                "repair_actions_count": len(self.repair_actions),
                "overall_status": self._calculate_overall_status(health_metrics, db_status, perf_metrics, security_status)
            }
            
            # Save detailed report
            report_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/monitoring_report_{int(time.time())}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            
            # Log summary
            self.logger.info(f"Monitoring report generated: {report['overall_status']} status")
            
        except Exception as e:
            self.logger.error(f"Failed to generate monitoring report: {str(e)}")
    
    def _calculate_overall_status(self, health_metrics, db_status, perf_metrics, security_status) -> str:
        """総合ステータス計算"""
        if db_status["status"] == "error":
            return "critical"
        
        if health_metrics.error_rate > self.performance_thresholds["error_rate_critical"]:
            return "critical"
        
        if perf_metrics["overall_status"] == "critical":
            return "critical"
        
        if security_status["overall_status"] == "vulnerable":
            return "warning"
        
        if health_metrics.error_rate > self.performance_thresholds["error_rate_warning"]:
            return "warning"
        
        if perf_metrics["overall_status"] == "warning":
            return "warning"
        
        return "healthy"
    
    def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        self.logger.info("Monitoring stopped")


# 使用例とエントリーポイント
async def main():
    """メイン実行関数"""
    monitor = MCPPlaywrightErrorMonitor()
    
    try:
        await monitor.start_infinite_monitoring()
    except KeyboardInterrupt:
        monitor.stop_monitoring()
        print("Monitoring stopped by user")
    except Exception as e:
        print(f"Monitoring failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/mcp_playwright_monitor.log'),
            logging.StreamHandler()
        ]
    )
    
    # 非同期実行
    asyncio.run(main())
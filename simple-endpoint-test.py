#!/usr/bin/env python3
"""
簡易エンドポイント検証システム
標準ライブラリのみを使用してITSM WebUIとAPIのエンドポイントをテスト
"""

import urllib.request
import urllib.error
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Tuple
import socket
import ssl

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleEndpointTester:
    """簡易エンドポイントテスタークラス"""
    
    def __init__(self, base_ip: str = "192.168.3.135"):
        self.base_ip = base_ip
        self.endpoints = {
            'frontend': {
                'base_url': f'http://{base_ip}:3000',
                'paths': [
                    '/',
                    '/admin',
                    '/manifest.json'
                ]
            },
            'backend': {
                'base_url': f'http://{base_ip}:8000',
                'paths': [
                    '/',
                    '/health',
                    '/docs',
                    '/openapi.json'
                ]
            }
        }
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': 0,
            'passed': 0,
            'failed': 0,
            'errors': [],
            'details': {}
        }
    
    def test_endpoint(self, service: str, base_url: str, path: str, timeout: int = 10) -> Dict:
        """個別エンドポイントのテスト"""
        url = f"{base_url}{path}"
        test_result = {
            'service': service,
            'url': url,
            'path': path,
            'status': 'unknown',
            'status_code': None,
            'response_time': None,
            'content_type': None,
            'error_message': None,
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            start_time = time.time()
            
            # HTTPリクエスト作成
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'ITSM-EndpointTester/1.0')
            
            with urllib.request.urlopen(req, timeout=timeout) as response:
                response_time = time.time() - start_time
                
                test_result.update({
                    'status_code': response.getcode(),
                    'response_time': round(response_time, 3),
                    'content_type': response.headers.get('content-type', 'unknown')
                })
                
                # ステータスコード判定
                if response.getcode() < 400:
                    test_result['status'] = 'success'
                    self.results['passed'] += 1
                    logger.info(f"✅ {url} - {response.getcode()} ({response_time:.3f}s)")
                else:
                    test_result['status'] = 'error'
                    test_result['error_message'] = f"HTTP {response.getcode()}"
                    self.results['failed'] += 1
                    logger.error(f"❌ {url} - {response.getcode()} ({response_time:.3f}s)")
                
                # 特定のエンドポイントに対する追加チェック
                if path == '/health' and response.getcode() == 200:
                    try:
                        content = response.read().decode('utf-8')
                        if 'healthy' in content or 'ok' in content.lower():
                            logger.info("  💚 ヘルスチェック: システム正常")
                        else:
                            logger.warning(f"  ⚠️ ヘルスチェック: 詳細確認が必要")
                    except:
                        pass
                
                elif path == '/docs' and response.getcode() == 200:
                    logger.info("  📚 API ドキュメント: アクセス可能")
                
                elif path == '/' and service == 'frontend' and response.getcode() == 200:
                    logger.info("  🌐 WebUI: 正常表示")
                        
        except urllib.error.HTTPError as e:
            response_time = time.time() - start_time
            test_result.update({
                'status': 'http_error',
                'status_code': e.code,
                'response_time': round(response_time, 3),
                'error_message': f'HTTP Error {e.code}: {e.reason}'
            })
            self.results['failed'] += 1
            logger.error(f"🚫 {url} - HTTP {e.code}: {e.reason}")
            
        except urllib.error.URLError as e:
            test_result.update({
                'status': 'connection_error',
                'error_message': f'Connection error: {str(e.reason)}'
            })
            self.results['failed'] += 1
            logger.error(f"🔌 {url} - Connection Error: {str(e.reason)}")
            
        except socket.timeout:
            test_result.update({
                'status': 'timeout',
                'error_message': f'Timeout after {timeout}s',
                'response_time': timeout
            })
            self.results['failed'] += 1
            logger.error(f"⏰ {url} - Timeout")
            
        except Exception as e:
            test_result.update({
                'status': 'unknown_error',
                'error_message': f'Unknown error: {str(e)}'
            })
            self.results['failed'] += 1
            logger.error(f"❓ {url} - Unknown Error: {str(e)}")
        
        self.results['total_tests'] += 1
        
        # エラーの場合は詳細をエラーリストに追加
        if test_result['status'] not in ['success']:
            self.results['errors'].append({
                'url': url,
                'status': test_result['status'],
                'error_message': test_result['error_message'],
                'timestamp': test_result['timestamp']
            })
        
        return test_result
    
    def test_service(self, service_name: str, service_config: Dict) -> List[Dict]:
        """サービス全体のテスト"""
        logger.info(f"🔍 {service_name.upper()} サービステスト開始")
        logger.info(f"   ベースURL: {service_config['base_url']}")
        
        base_url = service_config['base_url']
        paths = service_config['paths']
        
        results = []
        for path in paths:
            result = self.test_endpoint(service_name, base_url, path)
            results.append(result)
            time.sleep(0.5)  # レート制限対策
        
        return results
    
    def run_all_tests(self) -> Dict:
        """すべてのテスト実行"""
        logger.info("🚀 全エンドポイント検証を開始します")
        logger.info("=" * 60)
        
        all_results = {}
        
        for service_name, service_config in self.endpoints.items():
            service_results = self.test_service(service_name, service_config)
            all_results[service_name] = service_results
            
            # サービス別サマリー
            service_passed = sum(1 for r in service_results if r.get('status') == 'success')
            service_total = len(service_results)
            service_failed = service_total - service_passed
            
            logger.info(f"📊 {service_name.upper()} サマリー: {service_passed}/{service_total} 成功, {service_failed} 失敗")
            logger.info("-" * 40)
        
        self.results['details'] = all_results
        self.results['success_rate'] = (self.results['passed'] / max(self.results['total_tests'], 1)) * 100
        
        return self.results
    
    def generate_report(self, output_file: str = None) -> str:
        """レポート生成"""
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"simple-endpoint-test-report-{timestamp}.json"
        
        # 詳細レポート作成
        report = {
            'summary': {
                'timestamp': self.results['timestamp'],
                'total_tests': self.results['total_tests'],
                'passed': self.results['passed'],
                'failed': self.results['failed'],
                'success_rate': round(self.results['success_rate'], 2),
                'test_duration': 'completed'
            },
            'errors': self.results['errors'],
            'detailed_results': self.results['details'],
            'recommendations': self.generate_recommendations()
        }
        
        # JSONファイルに保存
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        return output_file
    
    def generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        recommendations = []
        
        if self.results['failed'] > 0:
            recommendations.append("❌ エラーが検出されました。詳細を確認して修復してください。")
        
        if self.results['success_rate'] < 80:
            recommendations.append("⚠️ 成功率が80%未満です。システムの安定性を確認してください。")
        
        if len([e for e in self.results['errors'] if 'timeout' in e.get('status', '')]) > 0:
            recommendations.append("⏰ タイムアウトエラーが発生しています。サーバーパフォーマンスを確認してください。")
        
        if len([e for e in self.results['errors'] if 'connection_error' in e.get('status', '')]) > 0:
            recommendations.append("🔌 接続エラーが発生しています。ネットワーク設定やサービス起動状態を確認してください。")
        
        if self.results['success_rate'] == 100:
            recommendations.append("✅ すべてのエンドポイントが正常です！")
        
        return recommendations

def main():
    """メイン実行関数"""
    import sys
    
    # コマンドライン引数処理
    base_ip = "192.168.3.135"
    if len(sys.argv) > 1:
        base_ip = sys.argv[1]
    
    # テスト実行
    tester = SimpleEndpointTester(base_ip=base_ip)
    
    logger.info(f"🎯 テスト対象IP: {base_ip}")
    logger.info("🔧 テスト設定:")
    logger.info(f"   フロントエンド: http://{base_ip}:3000")
    logger.info(f"   バックエンド: http://{base_ip}:8000")
    logger.info("")
    
    start_time = time.time()
    results = tester.run_all_tests()
    end_time = time.time()
    
    test_duration = end_time - start_time
    
    # 結果サマリー表示
    logger.info("=" * 60)
    logger.info("🎉 全エンドポイント検証完了")
    logger.info("=" * 60)
    logger.info(f"📊 テスト結果サマリー:")
    logger.info(f"   • 総テスト数: {results['total_tests']}")
    logger.info(f"   • 成功: {results['passed']}")
    logger.info(f"   • 失敗: {results['failed']}")
    logger.info(f"   • 成功率: {results['success_rate']:.1f}%")
    logger.info(f"   • 実行時間: {test_duration:.2f}秒")
    logger.info("")
    
    # レポート生成
    report_file = tester.generate_report()
    logger.info(f"📄 詳細レポート: {report_file}")
    
    # 推奨事項表示
    recommendations = tester.generate_recommendations()
    if recommendations:
        logger.info("💡 推奨事項:")
        for rec in recommendations:
            logger.info(f"   {rec}")
    
    # 終了コード設定
    if results['failed'] > 0:
        logger.warning("⚠️ エラーが検出されました。詳細はレポートを確認してください。")
        return 1
    else:
        logger.info("✅ すべてのエンドポイントが正常です！")
        return 0

if __name__ == "__main__":
    try:
        exit_code = main()
        exit(exit_code)
    except KeyboardInterrupt:
        logger.info("❌ テストが中断されました")
        exit(1)
    except Exception as e:
        logger.error(f"🚨 予期しないエラー: {str(e)}")
        exit(1)
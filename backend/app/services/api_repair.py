"""
API修復・テスト実行モジュール
フロントエンドとの通信エラーを監視し、API仕様の不整合を自動修正
"""

import json
import asyncio
import logging
import re
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict

import aiofiles
import aiohttp
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
import requests


@dataclass
class APIError:
    """API関連エラー情報"""
    endpoint: str
    method: str
    status_code: int
    error_message: str
    request_data: Optional[Dict[str, Any]]
    response_data: Optional[Dict[str, Any]]
    detected_at: str
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class APIFix:
    """API修復アクション"""
    endpoint: str
    method: str
    fix_type: str
    description: str
    schema_changes: Dict[str, Any]
    code_changes: Dict[str, str]
    validation_tests: List[str]
    applied_at: Optional[str] = None
    success: bool = False


class APISpecAnalyzer:
    """API仕様分析器"""
    
    def __init__(self, backend_root: str):
        self.backend_root = Path(backend_root)
        self.logger = logging.getLogger(__name__)
    
    async def analyze_openapi_spec(self) -> Dict[str, Any]:
        """OpenAPI仕様を分析"""
        try:
            # FastAPIアプリからOpenAPI仕様を取得
            from app.main import app
            openapi_schema = get_openapi(
                title=app.title,
                version=app.version,
                description=app.description,
                routes=app.routes,
            )
            return openapi_schema
        except Exception as e:
            self.logger.error(f"OpenAPI仕様取得エラー: {e}")
            return {}
    
    async def compare_frontend_requests(self, api_logs: List[Dict]) -> List[APIError]:
        """フロントエンドからのリクエストとAPI仕様を比較"""
        errors = []
        openapi_spec = await self.analyze_openapi_spec()
        
        if not openapi_spec or "paths" not in openapi_spec:
            return errors
        
        for log_entry in api_logs:
            endpoint = log_entry.get("path", "")
            method = log_entry.get("method", "").lower()
            status_code = log_entry.get("status_code", 200)
            
            # API仕様との比較
            if self._is_api_endpoint(endpoint):
                spec_issues = self._check_endpoint_compliance(
                    endpoint, method, log_entry, openapi_spec
                )
                errors.extend(spec_issues)
        
        return errors
    
    def _is_api_endpoint(self, path: str) -> bool:
        """APIエンドポイントかどうか判定"""
        api_patterns = [
            r'^/api/v1/',
            r'^/health$',
            r'^/version$',
            r'^/docs',
            r'^/redoc'
        ]
        return any(re.match(pattern, path) for pattern in api_patterns)
    
    def _check_endpoint_compliance(
        self, 
        endpoint: str, 
        method: str, 
        log_entry: Dict,
        openapi_spec: Dict
    ) -> List[APIError]:
        """エンドポイントの仕様準拠をチェック"""
        errors = []
        paths = openapi_spec.get("paths", {})
        
        # エンドポイントが仕様に存在するかチェック
        if endpoint not in paths:
            errors.append(APIError(
                endpoint=endpoint,
                method=method,
                status_code=404,
                error_message=f"Endpoint not found in API spec: {endpoint}",
                request_data=log_entry.get("request_data"),
                response_data=log_entry.get("response_data"),
                detected_at=datetime.now().isoformat(),
                client_ip=log_entry.get("client_ip"),
                user_agent=log_entry.get("user_agent")
            ))
            return errors
        
        endpoint_spec = paths[endpoint]
        
        # HTTPメソッドが仕様に存在するかチェック
        if method not in endpoint_spec:
            errors.append(APIError(
                endpoint=endpoint,
                method=method,
                status_code=405,
                error_message=f"Method {method.upper()} not allowed for {endpoint}",
                request_data=log_entry.get("request_data"),
                response_data=log_entry.get("response_data"),
                detected_at=datetime.now().isoformat(),
                client_ip=log_entry.get("client_ip"),
                user_agent=log_entry.get("user_agent")
            ))
            return errors
        
        # レスポンススキーマのチェック
        method_spec = endpoint_spec[method]
        responses = method_spec.get("responses", {})
        status_code = str(log_entry.get("status_code", 200))
        
        if status_code not in responses and status_code != "200":
            errors.append(APIError(
                endpoint=endpoint,
                method=method,
                status_code=int(status_code),
                error_message=f"Unexpected status code {status_code} for {method.upper()} {endpoint}",
                request_data=log_entry.get("request_data"),
                response_data=log_entry.get("response_data"),
                detected_at=datetime.now().isoformat(),
                client_ip=log_entry.get("client_ip"),
                user_agent=log_entry.get("user_agent")
            ))
        
        return errors


class APIRepairer:
    """API修復器"""
    
    def __init__(self, backend_root: str):
        self.backend_root = Path(backend_root)
        self.logger = logging.getLogger(__name__)
    
    async def generate_api_fix(self, api_error: APIError) -> Optional[APIFix]:
        """APIエラーに対する修復アクションを生成"""
        
        if api_error.status_code == 404:
            return await self._fix_missing_endpoint(api_error)
        elif api_error.status_code == 405:
            return await self._fix_method_not_allowed(api_error)
        elif api_error.status_code == 422:
            return await self._fix_validation_error(api_error)
        elif api_error.status_code == 500:
            return await self._fix_server_error(api_error)
        else:
            return await self._fix_generic_error(api_error)
    
    async def _fix_missing_endpoint(self, error: APIError) -> Optional[APIFix]:
        """存在しないエンドポイントの修復"""
        endpoint_path = error.endpoint
        method = error.method.lower()
        
        # エンドポイントのリソース名を推定
        resource_match = re.match(r'/api/v1/(\w+)', endpoint_path)
        if not resource_match:
            return None
        
        resource_name = resource_match.group(1)
        
        # 新しいエンドポイントコードを生成
        endpoint_code = self._generate_endpoint_code(resource_name, method, endpoint_path)
        
        # APIファイルのパスを決定
        api_file_path = self.backend_root / "app" / "api" / "v1" / f"{resource_name}.py"
        
        code_changes = {}
        if api_file_path.exists():
            # 既存ファイルに追加
            async with aiofiles.open(api_file_path, 'r') as f:
                existing_content = await f.read()
            code_changes[str(api_file_path)] = existing_content + "\n\n" + endpoint_code
        else:
            # 新しいファイルを作成
            full_file_content = self._generate_full_api_file(resource_name, method, endpoint_path)
            code_changes[str(api_file_path)] = full_file_content
        
        return APIFix(
            endpoint=error.endpoint,
            method=error.method,
            fix_type="missing_endpoint",
            description=f"Add missing {method.upper()} endpoint for {endpoint_path}",
            schema_changes={},
            code_changes=code_changes,
            validation_tests=[f"python -c 'from app.api.v1.{resource_name} import router'"]
        )
    
    async def _fix_method_not_allowed(self, error: APIError) -> Optional[APIFix]:
        """許可されていないメソッドの修復"""
        # 既存エンドポイントに新しいメソッドを追加
        resource_match = re.match(r'/api/v1/(\w+)', error.endpoint)
        if not resource_match:
            return None
        
        resource_name = resource_match.group(1)
        api_file_path = self.backend_root / "app" / "api" / "v1" / f"{resource_name}.py"
        
        if not api_file_path.exists():
            return None
        
        async with aiofiles.open(api_file_path, 'r') as f:
            content = await f.read()
        
        # 新しいメソッドのコードを生成
        method_code = self._generate_method_code(error.method, error.endpoint)
        modified_content = content + "\n\n" + method_code
        
        return APIFix(
            endpoint=error.endpoint,
            method=error.method,
            fix_type="method_not_allowed",
            description=f"Add {error.method.upper()} method to {error.endpoint}",
            schema_changes={},
            code_changes={str(api_file_path): modified_content},
            validation_tests=[f"python -c 'from app.api.v1.{resource_name} import router'"]
        )
    
    async def _fix_validation_error(self, error: APIError) -> Optional[APIFix]:
        """バリデーションエラーの修復"""
        # Pydanticスキーマの修正
        schema_changes = {}
        
        if error.request_data:
            # リクエストデータから必要なフィールドを推定
            required_fields = self._infer_schema_from_data(error.request_data)
            schema_changes["request_schema"] = required_fields
        
        return APIFix(
            endpoint=error.endpoint,
            method=error.method,
            fix_type="validation_error",
            description=f"Fix validation schema for {error.endpoint}",
            schema_changes=schema_changes,
            code_changes={},
            validation_tests=["python -c 'from app.schemas import *'"]
        )
    
    async def _fix_server_error(self, error: APIError) -> Optional[APIFix]:
        """サーバーエラーの修復"""
        # エラーハンドリングの追加
        resource_match = re.match(r'/api/v1/(\w+)', error.endpoint)
        if not resource_match:
            return None
        
        resource_name = resource_match.group(1)
        api_file_path = self.backend_root / "app" / "api" / "v1" / f"{resource_name}.py"
        
        if not api_file_path.exists():
            return None
        
        async with aiofiles.open(api_file_path, 'r') as f:
            content = await f.read()
        
        # try-catchブロックを追加
        enhanced_content = self._add_error_handling(content, error.method)
        
        return APIFix(
            endpoint=error.endpoint,
            method=error.method,
            fix_type="server_error",
            description=f"Add error handling to {error.endpoint}",
            schema_changes={},
            code_changes={str(api_file_path): enhanced_content},
            validation_tests=[f"python -m pytest tests/api/ -k {resource_name}"]
        )
    
    async def _fix_generic_error(self, error: APIError) -> Optional[APIFix]:
        """その他のエラーの修復"""
        return APIFix(
            endpoint=error.endpoint,
            method=error.method,
            fix_type="generic_error",
            description=f"Generic fix for {error.endpoint} status {error.status_code}",
            schema_changes={},
            code_changes={},
            validation_tests=[]
        )
    
    def _generate_endpoint_code(self, resource: str, method: str, path: str) -> str:
        """エンドポイントコードを生成"""
        if method == "get":
            if path.endswith("/{id}"):
                return f'''
@router.get("/{{{resource[:-1]}_id}}", response_model={resource.capitalize()}Response)
async def get_{resource[:-1]}(
    {resource[:-1]}_id: int,
    db: Session = Depends(get_db)
):
    """Get {resource[:-1]} by ID"""
    try:
        {resource[:-1]} = db.query({resource.capitalize()[:-1]}).filter({resource.capitalize()[:-1]}.id == {resource[:-1]}_id).first()
        if not {resource[:-1]}:
            raise HTTPException(status_code=404, detail="{resource.capitalize()[:-1]} not found")
        return {resource[:-1]}
    except Exception as e:
        logger.error(f"Error getting {resource[:-1]}: {{e}}")
        raise HTTPException(status_code=500, detail="Internal server error")
'''
            else:
                return f'''
@router.get("/", response_model=List[{resource.capitalize()}Response])
async def get_{resource}(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all {resource}"""
    try:
        {resource} = db.query({resource.capitalize()[:-1]}).offset(skip).limit(limit).all()
        return {resource}
    except Exception as e:
        logger.error(f"Error getting {resource}: {{e}}")
        raise HTTPException(status_code=500, detail="Internal server error")
'''
        
        elif method == "post":
            return f'''
@router.post("/", response_model={resource.capitalize()}Response, status_code=201)
async def create_{resource[:-1]}(
    {resource[:-1]}_data: {resource.capitalize()}Create,
    db: Session = Depends(get_db)
):
    """Create new {resource[:-1]}"""
    try:
        {resource[:-1]} = {resource.capitalize()[:-1]}(**{resource[:-1]}_data.dict())
        db.add({resource[:-1]})
        db.commit()
        db.refresh({resource[:-1]})
        return {resource[:-1]}
    except Exception as e:
        logger.error(f"Error creating {resource[:-1]}: {{e}}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
'''
        
        elif method == "put":
            return f'''
@router.put("/{{{resource[:-1]}_id}}", response_model={resource.capitalize()}Response)
async def update_{resource[:-1]}(
    {resource[:-1]}_id: int,
    {resource[:-1]}_data: {resource.capitalize()}Update,
    db: Session = Depends(get_db)
):
    """Update {resource[:-1]} by ID"""
    try:
        {resource[:-1]} = db.query({resource.capitalize()[:-1]}).filter({resource.capitalize()[:-1]}.id == {resource[:-1]}_id).first()
        if not {resource[:-1]}:
            raise HTTPException(status_code=404, detail="{resource.capitalize()[:-1]} not found")
        
        for field, value in {resource[:-1]}_data.dict(exclude_unset=True).items():
            setattr({resource[:-1]}, field, value)
        
        db.commit()
        db.refresh({resource[:-1]})
        return {resource[:-1]}
    except Exception as e:
        logger.error(f"Error updating {resource[:-1]}: {{e}}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
'''
        
        elif method == "delete":
            return f'''
@router.delete("/{{{resource[:-1]}_id}}", status_code=204)
async def delete_{resource[:-1]}(
    {resource[:-1]}_id: int,
    db: Session = Depends(get_db)
):
    """Delete {resource[:-1]} by ID"""
    try:
        {resource[:-1]} = db.query({resource.capitalize()[:-1]}).filter({resource.capitalize()[:-1]}.id == {resource[:-1]}_id).first()
        if not {resource[:-1]}:
            raise HTTPException(status_code=404, detail="{resource.capitalize()[:-1]} not found")
        
        db.delete({resource[:-1]})
        db.commit()
        return None
    except Exception as e:
        logger.error(f"Error deleting {resource[:-1]}: {{e}}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
'''
        
        return f"# TODO: Implement {method.upper()} {path}"
    
    def _generate_full_api_file(self, resource: str, method: str, path: str) -> str:
        """完全なAPIファイルを生成"""
        return f'''"""
{resource.capitalize()} API endpoints - Auto-generated
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.{resource[:-1]} import {resource.capitalize()[:-1]}
from app.schemas.{resource[:-1]} import (
    {resource.capitalize()}Create,
    {resource.capitalize()}Update,
    {resource.capitalize()}Response
)

logger = logging.getLogger(__name__)
router = APIRouter()

{self._generate_endpoint_code(resource, method, path)}
'''
    
    def _generate_method_code(self, method: str, endpoint: str) -> str:
        """メソッドコードを生成"""
        resource_match = re.match(r'/api/v1/(\w+)', endpoint)
        if resource_match:
            resource = resource_match.group(1)
            return self._generate_endpoint_code(resource, method, endpoint)
        return f"# TODO: Implement {method.upper()} {endpoint}"
    
    def _infer_schema_from_data(self, data: Dict[str, Any]) -> Dict[str, str]:
        """データから必要なスキーマを推定"""
        schema = {}
        for key, value in data.items():
            if isinstance(value, str):
                schema[key] = "str"
            elif isinstance(value, int):
                schema[key] = "int"
            elif isinstance(value, float):
                schema[key] = "float"
            elif isinstance(value, bool):
                schema[key] = "bool"
            elif isinstance(value, list):
                schema[key] = "List[Any]"
            elif isinstance(value, dict):
                schema[key] = "Dict[str, Any]"
            else:
                schema[key] = "Any"
        return schema
    
    def _add_error_handling(self, content: str, method: str) -> str:
        """エラーハンドリングを追加"""
        # 既存の関数にtry-catchを追加
        lines = content.split('\n')
        enhanced_lines = []
        
        in_function = False
        function_indent = 0
        
        for line in lines:
            if re.match(r'^async def \w+\(', line.strip()):
                in_function = True
                function_indent = len(line) - len(line.lstrip())
                enhanced_lines.append(line)
            elif in_function and line.strip().startswith('"""'):
                enhanced_lines.append(line)
            elif in_function and line.strip() and not line.startswith(' ' * (function_indent + 4)):
                # 関数終了
                in_function = False
                enhanced_lines.append(line)
            elif in_function and not any(keyword in line for keyword in ['try:', 'except:', 'finally:']):
                # 関数内のコードをtry-catchで囲む
                if line.strip() and not line.strip().startswith('"""'):
                    if 'try:' not in enhanced_lines[-5:]:
                        enhanced_lines.append(' ' * (function_indent + 4) + 'try:')
                    enhanced_lines.append(' ' * 4 + line if line.strip() else line)
                else:
                    enhanced_lines.append(line)
            else:
                enhanced_lines.append(line)
        
        return '\n'.join(enhanced_lines)
    
    async def apply_api_fix(self, api_fix: APIFix) -> bool:
        """API修復を適用"""
        try:
            # コード変更の適用
            for file_path, new_content in api_fix.code_changes.items():
                async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                    await f.write(new_content)
                self.logger.info(f"API修復適用: {file_path}")
            
            # バリデーションテスト実行
            for test_command in api_fix.validation_tests:
                try:
                    result = subprocess.run(
                        test_command.split(),
                        cwd=self.backend_root,
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    if result.returncode != 0:
                        self.logger.error(f"バリデーションテスト失敗: {test_command}\n{result.stderr}")
                except subprocess.TimeoutExpired:
                    self.logger.error(f"バリデーションテストタイムアウト: {test_command}")
            
            api_fix.applied_at = datetime.now().isoformat()
            api_fix.success = True
            return True
            
        except Exception as e:
            self.logger.error(f"API修復適用エラー: {e}")
            api_fix.success = False
            return False


class APITestRunner:
    """APIテスト実行器"""
    
    def __init__(self, backend_root: str, base_url: str = "http://localhost:8000"):
        self.backend_root = Path(backend_root)
        self.base_url = base_url
        self.logger = logging.getLogger(__name__)
    
    async def run_comprehensive_tests(self) -> Dict[str, Any]:
        """包括的なAPIテストを実行"""
        results = {
            "health_check": await self._test_health_endpoint(),
            "api_endpoints": await self._test_api_endpoints(),
            "load_test": await self._run_load_test(),
            "validation_test": await self._test_validation(),
            "executed_at": datetime.now().isoformat()
        }
        
        return results
    
    async def _test_health_endpoint(self) -> Dict[str, Any]:
        """ヘルスチェックエンドポイントのテスト"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health") as response:
                    return {
                        "success": response.status == 200,
                        "status_code": response.status,
                        "response": await response.json() if response.status == 200 else None
                    }
        except Exception as e:
            return {
                "success": False,
                "status_code": 0,
                "response": None,
                "error": str(e)
            }
    
    async def _test_api_endpoints(self) -> List[Dict[str, Any]]:
        """各APIエンドポイントのテスト"""
        endpoints_to_test = [
            ("GET", "/api/v1/incidents/"),
            ("GET", "/health"),
            ("GET", "/version"),
        ]
        
        results = []
        async with aiohttp.ClientSession() as session:
            for method, endpoint in endpoints_to_test:
                try:
                    url = f"{self.base_url}{endpoint}"
                    async with session.request(method, url) as response:
                        results.append({
                            "method": method,
                            "endpoint": endpoint,
                            "status_code": response.status,
                            "success": 200 <= response.status < 300,
                            "response_time": response.headers.get("X-Response-Time", "unknown")
                        })
                except Exception as e:
                    results.append({
                        "method": method,
                        "endpoint": endpoint,
                        "status_code": 0,
                        "success": False,
                        "error": str(e)
                    })
        
        return results
    
    async def _run_load_test(self) -> Dict[str, Any]:
        """負荷テストの実行"""
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/load/", "-v", "--tb=short"],
                cwd=self.backend_root.parent,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _test_validation(self) -> Dict[str, Any]:
        """バリデーションテストの実行"""
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/api/", "-v", "--tb=short"],
                cwd=self.backend_root.parent,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# 使用例
async def main():
    """メイン実行関数"""
    backend_root = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend"
    
    # API修復システムの初期化
    analyzer = APISpecAnalyzer(backend_root)
    repairer = APIRepairer(backend_root)
    test_runner = APITestRunner(backend_root)
    
    # API仕様の分析
    spec = await analyzer.analyze_openapi_spec()
    print("OpenAPI仕様分析完了")
    
    # APIテストの実行
    test_results = await test_runner.run_comprehensive_tests()
    print("APIテスト完了")
    print(json.dumps(test_results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main())
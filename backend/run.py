#!/usr/bin/env python3
"""ITSM API サーバー起動スクリプト"""

import os
import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    
    # 環境変数から設定を読み込み
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() == "true"
    
    print(f"Starting ITSM API Server...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Reload: {reload}")
    print(f"API Documentation: http://{host}:{port}{settings.API_V1_STR}/docs")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )
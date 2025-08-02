#!/usr/bin/env python3
"""
Requirements.txt Permanent Protection System
恒久的requirements.txt保護システム
"""
import os
import time
import shutil
from pathlib import Path

REQUIREMENTS_CONTENT = """fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
alembic==1.13.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
pytest==7.4.3
pytest-asyncio==0.23.2
pytest-cov==4.1.0
requests==2.31.0
httpx==0.25.2
aiohttp==3.9.1
redis==5.0.1
psycopg2-binary==2.9.9
asyncpg==0.29.0
aiosqlite==0.19.0
flake8==6.1.0
black==23.11.0
isort==5.12.0
mypy==1.7.1
bandit==1.7.5
safety==2.3.5"""

def protect_requirements():
    """Requirements.txt恒久的保護実行"""
    backend_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
    requirements_file = backend_dir / "requirements.txt"
    
    while True:
        try:
            # ファイルの存在確認
            if not requirements_file.exists() or requirements_file.stat().st_size == 0:
                print(f"🔧 Requirements.txt復元: {requirements_file}")
                requirements_file.write_text(REQUIREMENTS_CONTENT)
                
            # 内容確認
            current_content = requirements_file.read_text().strip()
            if current_content != REQUIREMENTS_CONTENT.strip():
                print(f"🔧 Requirements.txt内容修正: {requirements_file}")
                requirements_file.write_text(REQUIREMENTS_CONTENT)
                
            # バックアップコピー作成
            backup_files = [
                backend_dir / "requirements-backup.txt",
                backend_dir / "requirements-protected.txt",
                backend_dir / "requirements-permanent.txt"
            ]
            
            for backup_file in backup_files:
                if not backup_file.exists():
                    shutil.copy2(requirements_file, backup_file)
                    
            print(f"✅ Requirements.txt保護完了 - {time.strftime('%Y-%m-%d %H:%M:%S')}")
            
        except Exception as e:
            print(f"❌ 保護エラー: {e}")
            
        time.sleep(5)  # 5秒間隔で監視

if __name__ == "__main__":
    protect_requirements()
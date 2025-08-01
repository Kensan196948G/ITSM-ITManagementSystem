"""データベース初期化"""

import logging
from sqlalchemy.orm import Session

from app.db.base import Base, engine, SessionLocal
from app.models import *  # すべてのモデルをインポート


logger = logging.getLogger(__name__)


def init_db() -> None:
    """データベースの初期化"""
    try:
        # テーブル作成
        Base.metadata.create_all(bind=engine)
        logger.info("データベーステーブルが正常に作成されました")
        
        # 初期データの挿入
        db = SessionLocal()
        try:
            create_initial_data(db)
            logger.info("初期データが正常に挿入されました")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"データベース初期化エラー: {str(e)}")
        raise


def create_initial_data(db: Session) -> None:
    """初期データの作成"""
    import uuid
    from datetime import datetime
    
    # テナント情報（固定）
    tenant_id = uuid.UUID("12345678-1234-1234-1234-123456789012")
    admin_user_id = uuid.UUID("12345678-1234-1234-1234-123456789012")
    
    # 管理者ユーザーが存在しない場合作成
    admin_user = db.query(User).filter(User.id == admin_user_id).first()
    if not admin_user:
        admin_user = User(
            id=admin_user_id,
            tenant_id=tenant_id,
            employee_id="ADMIN001",
            email="admin@itsm.local",
            username="admin",
            first_name="System",
            last_name="Administrator",
            display_name="System Administrator",
            phone="000-0000-0000",
            timezone="Asia/Tokyo",
            locale="ja_JP",
            is_active=True,
            password_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # secret
        )
        db.add(admin_user)
        logger.info("管理者ユーザーを作成しました")
    
    # デフォルトカテゴリの作成
    categories_data = [
        {"name": "ハードウェア", "description": "サーバー、PC、周辺機器に関する問題"},
        {"name": "ソフトウェア", "description": "アプリケーション、OS、システムソフトウェア"},
        {"name": "ネットワーク", "description": "ネットワーク機器、接続、通信に関する問題"},
        {"name": "セキュリティ", "description": "セキュリティインシデント、脆弱性対応"},
        {"name": "アクセス権", "description": "アカウント、権限、認証に関する問題"},
    ]
    
    for cat_data in categories_data:
        existing_cat = db.query(Category).filter(
            Category.name == cat_data["name"],
            Category.tenant_id == tenant_id
        ).first()
        
        if not existing_cat:
            category = Category(
                tenant_id=tenant_id,
                name=cat_data["name"],
                description=cat_data["description"],
                is_active=True,
                sort_order="10",
                created_by=admin_user_id
            )
            db.add(category)
            logger.info(f"カテゴリ '{cat_data['name']}' を作成しました")
    
    # デフォルトチームの作成
    teams_data = [
        {"name": "ITサポート", "description": "一般的なIT問題のサポート"},
        {"name": "インフラチーム", "description": "システムインフラストラクチャの管理"},
        {"name": "セキュリティチーム", "description": "セキュリティ関連の対応"},
        {"name": "開発チーム", "description": "アプリケーション開発・保守"},
    ]
    
    for team_data in teams_data:
        existing_team = db.query(Team).filter(
            Team.name == team_data["name"],
            Team.tenant_id == tenant_id
        ).first()
        
        if not existing_team:
            team = Team(
                tenant_id=tenant_id,
                name=team_data["name"],
                description=team_data["description"],
                manager_id=admin_user_id,
                is_active=True,
                created_by=admin_user_id
            )
            db.add(team)
            logger.info(f"チーム '{team_data['name']}' を作成しました")
    
    # 変更をコミット
    db.commit()


if __name__ == "__main__":
    init_db()
#!/usr/bin/env python3
"""
Rapid Repair Main - 統合API修復システムメイン実行ファイル
5秒間隔でエラーを完全除去するまで継続実行
"""

import asyncio
import logging
import signal
import sys
import json
from datetime import datetime
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from app.services.rapid_repair_engine import rapid_repair_engine
from app.services.coordination_repair import coordination_repair_service

# ロガー設定
logger = logging.getLogger("rapid_repair_main")

class RapidRepairSystem:
    """統合修復システム"""
    
    def __init__(self):
        self.is_running = False
        self.repair_engine = rapid_repair_engine
        self.coordination_service = coordination_repair_service
        
    async def start_comprehensive_repair(self):
        """包括的修復システム開始"""
        self.is_running = True
        logger.info("🚀 Rapid Repair System 開始 - 完全エラー除去まで実行")
        
        try:
            # フェーズ1: 初期協調エラー修復
            logger.info("📋 フェーズ1: 初期協調エラー修復")
            coordination_result = await self.coordination_service.comprehensive_repair_cycle()
            logger.info(f"協調エラー修復結果: {coordination_result.get('overall_status')}")
            
            # フェーズ2: 5秒間隔高速修復ループ
            logger.info("⚡ フェーズ2: 高速修復ループ開始 (5秒間隔)")
            await self.repair_engine.start_rapid_repair_loop()
            
            logger.info("✅ 完全修復完了 - システム正常化")
            
        except Exception as e:
            logger.error(f"修復システムエラー: {e}")
        finally:
            self.is_running = False
    
    def stop_repair(self):
        """修復システム停止"""
        self.is_running = False
        self.repair_engine.stop_repair_loop()
        logger.info("🛑 Rapid Repair System 停止")
    
    def get_comprehensive_status(self):
        """包括的システム状況取得"""
        return {
            "timestamp": datetime.now().isoformat(),
            "system_status": "running" if self.is_running else "stopped",
            "repair_engine": self.repair_engine.get_repair_status(),
            "coordination_repairs": len(self.coordination_service.repair_history),
            "overall_health": "operational" if self.is_running else "standby"
        }

# グローバルシステムインスタンス
repair_system = RapidRepairSystem()

def signal_handler(signum, frame):
    """シグナルハンドラー"""
    logger.info(f"シグナル {signum} 受信 - 修復システム停止中...")
    repair_system.stop_repair()
    sys.exit(0)

async def main():
    """メイン実行関数"""
    # ログ設定
    log_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs")
    log_dir.mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / "rapid_repair_main.log"),
            logging.StreamHandler()
        ]
    )
    
    # シグナルハンドラー設定
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("=" * 60)
    logger.info("🔧 ITSM Rapid Repair System 起動")
    logger.info("=" * 60)
    logger.info("設定:")
    logger.info("  - 修復間隔: 5秒")
    logger.info("  - 目標: 完全エラー除去")
    logger.info("  - セキュリティ: ITSM準拠")
    logger.info("  - ログ: 完全監査対応")
    logger.info("=" * 60)
    
    try:
        # 修復システム開始
        await repair_system.start_comprehensive_repair()
        
    except KeyboardInterrupt:
        logger.info("🛑 ユーザーによる停止要求")
    except Exception as e:
        logger.error(f"システム致命的エラー: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        # クリーンアップ
        repair_system.stop_repair()
        logger.info("🏁 Rapid Repair System 終了")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 修復システム強制終了")
        sys.exit(0)
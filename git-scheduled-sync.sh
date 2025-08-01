#!/bin/bash

# GitHub定期同期スケジューラー
# crontabや定期実行用

SYNC_INTERVAL=${1:-3600}  # デフォルト1時間（3600秒）
LOG_FILE="logs/scheduled-sync.log"

# ログディレクトリ作成
mkdir -p logs

# ログ出力関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "⏰ Starting Scheduled Git Sync (interval: ${SYNC_INTERVAL}s)"

# 無限ループで定期実行
while true; do
    log "🔄 Running scheduled sync..."
    
    # 同期実行
    if ./git-auto-sync.sh; then
        log "✅ Scheduled sync completed successfully"
    else
        log "❌ Scheduled sync failed"
    fi
    
    # 次の実行まで待機
    log "⏳ Waiting ${SYNC_INTERVAL} seconds until next sync..."
    sleep "$SYNC_INTERVAL"
done
# 🛠️ ITSMシステム WebUIトラブルシューティングガイド

## 🚨 緊急時対応フローチャート

```
問題発生
    ↓
ブラウザ再読み込み（Ctrl+F5）
    ↓
解決？ → Yes → 完了
    ↓ No
ブラウザコンソール確認
    ↓
エラーメッセージ特定
    ↓
該当セクションの対処法実行
    ↓
解決？ → Yes → 完了
    ↓ No
システム管理者に連絡
```

---

## 🔥 よくある問題と即時解決法

### 1. ログインできない
**症状**: ログイン画面で認証に失敗する

**即時対応**:
```bash
# 1. 正しい認証情報の確認
ユーザー名: admin
パスワード: secret

# 2. ブラウザキャッシュクリア
Ctrl + Shift + Delete → すべてクリア

# 3. バックエンドサービス確認
curl http://192.168.3.135:8081/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

**根本解決**:
- パスワード変更の確認
- アカウントロック状態の確認
- セッション期限の確認

### 2. 画面が真っ白になる
**症状**: WebUIにアクセスしても何も表示されない

**即時対応**:
```bash
# 1. ブラウザコンソール確認（F12 → Console）
# JavaScript エラーメッセージを確認

# 2. フロントエンドサービス状態確認
curl http://192.168.3.135:3000

# 3. 開発者ツールでネットワークタブ確認
# リソース読み込みエラーを特定
```

**根本解決**:
- Node.jsプロセスの再起動
- npm依存関係の再インストール
- ビルドエラーの確認

### 3. データが表示されない
**症状**: ダッシュボードやチケット一覧にデータが表示されない

**即時対応**:
```bash
# 1. API接続確認
curl http://192.168.3.135:8081/api/v1/incidents

# 2. ネットワーク接続確認
ping 192.168.3.135

# 3. データベース接続確認
cd backend && python -c "
from app.db.session import SessionLocal
db = SessionLocal()
print('DB接続成功')
"
```

**根本解決**:
- データベース初期化の確認
- API認証トークンの更新
- SQLite ファイルの権限確認

---

## 💻 ブラウザ別対処法

### Google Chrome
**推奨バージョン**: 90以上

**一般的な問題**:
```bash
# キャッシュクリア
Ctrl + Shift + Delete

# ハードリロード
Ctrl + Shift + R

# 開発者ツール
F12 → Console/Network タブ

# 拡張機能無効化
シークレットモードで確認
```

### Firefox
**推奨バージョン**: 88以上

**一般的な問題**:
```bash
# キャッシュクリア
Ctrl + Shift + Delete

# スーパーリロード
Ctrl + F5

# 開発者ツール
F12 → Web Console

# アドオン無効化
about:addons → 一時的に無効化
```

### Safari
**推奨バージョン**: 14以上

**一般的な問題**:
```bash
# キャッシュクリア
Safari → 履歴を消去

# ハードリロード
Cmd + Shift + R

# 開発者ツール
Safari → 開発 → Webインスペクタ
```

### Microsoft Edge
**推奨バージョン**: 90以上

**一般的な問題**:
```bash
# キャッシュクリア
Ctrl + Shift + Delete

# ハードリロード
Ctrl + Shift + R

# 開発者ツール
F12 → Console
```

---

## 🚀 パフォーマンス関連トラブル

### 読み込みが遅い
**症状**: ページ表示に5秒以上かかる

**診断方法**:
```bash
# 1. ネットワーク速度確認
curl -w "time_total: %{time_total}s\n" http://192.168.3.135:3000

# 2. サーバーリソース確認
top | grep -E "(node|python)"

# 3. ブラウザでパフォーマンス測定
# F12 → Performance → Record
```

**最適化対応**:
1. **ブラウザキャッシュ有効化**
2. **不要な拡張機能無効化**
3. **メモリ不足の場合はブラウザ再起動**
4. **他のタブを閉じる**

### メモリ使用量が多い
**症状**: ブラウザが重くなる、タブがクラッシュする

**対処法**:
```bash
# メモリ使用量確認（Linuxの場合）
ps aux | grep -E "(chrome|firefox)" | awk '{sum+=$6} END {print "Memory:", sum/1024 "MB"}'

# ブラウザタスクマネージャー（Chrome）
Shift + Esc
```

**根本対策**:
- 定期的なブラウザ再起動
- 不要なタブ・拡張機能の削除
- ハードウェア仕様の確認

---

## 🔧 システムサービス関連

### バックエンドAPIエラー
**症状**: 500 Internal Server Error、502 Bad Gateway

**診断スクリプト**:
```bash
#!/bin/bash
# backend-diagnosis.sh

echo "=== バックエンド診断開始 ==="

# プロセス確認
echo "1. Pythonプロセス確認:"
ps aux | grep python | grep -v grep

# ポート確認
echo "2. ポート8081確認:"
netstat -tlnp | grep 8081

# ログ確認
echo "3. エラーログ確認:"
tail -20 /var/log/itsm-backend.log 2>/dev/null || echo "ログファイルなし"

# API健全性確認
echo "4. API健全性テスト:"
curl -s http://192.168.3.135:8081/api/v1/health || echo "API応答なし"

echo "=== 診断完了 ==="
```

### フロントエンドビルドエラー
**症状**: npm start が失敗する

**診断コマンド**:
```bash
# Node.js版本確認
node --version
npm --version

# 依存関係チェック
npm ls --depth=0

# パッケージ整合性確認
npm audit

# 強制再インストール
rm -rf node_modules package-lock.json
npm install

# TypeScriptコンパイルエラー確認
npx tsc --noEmit
```

---

## 📱 モバイル・レスポンシブ問題

### モバイル表示の崩れ
**症状**: スマートフォンで表示が正常でない

**確認手順**:
```bash
# 1. ブラウザ開発者ツールでモバイル表示確認
# F12 → デバイスツールバー → iPhone/Android選択

# 2. ビューポート設定確認
# HTMLの<meta name="viewport">タグを確認

# 3. CSS Media Queries確認
# ブレークポイントの動作を確認
```

**一般的な解決法**:
- ブラウザズーム設定を100%に戻す
- 横向き・縦向きの表示確認
- 機種固有CSSの確認

### タッチ操作の問題
**症状**: ボタンやリンクがタップできない

**対処法**:
1. **タップターゲットサイズ確認**: 最小44pxの確保
2. **z-index重複確認**: 要素の重なり確認
3. **タッチイベント確認**: pointer-events設定確認

---

## 🔒 セキュリティ関連トラブル

### CORS エラー
**症状**: ブラウザコンソールにCORSエラーが表示

**エラー例**:
```
Access to XMLHttpRequest at 'http://192.168.3.135:8081/api/v1/incidents' 
from origin 'http://192.168.3.135:3000' has been blocked by CORS policy
```

**解決方法**:
```python
# backend/app/main.py の CORS設定確認
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.3.135:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### SSL/TLS証明書エラー
**症状**: HTTPS接続時の証明書警告

**開発環境での対処**:
```bash
# 自己署名証明書許可（開発のみ）
chrome --ignore-certificate-errors --ignore-ssl-errors

# または証明書例外追加
ブラウザで「詳細設定」→「安全でないサイトに進む」
```

---

## 📊 データベース関連

### SQLiteファイル破損
**症状**: データベースエラー、データが消失

**復旧手順**:
```bash
# 1. バックアップからの復元
cp backup/itsm.db backend/itsm.db

# 2. データベース再初期化
cd backend
python init_sqlite_db.py

# 3. 整合性チェック
sqlite3 itsm.db "PRAGMA integrity_check;"
```

### データ同期エラー
**症状**: フロントエンドとバックエンドでデータが一致しない

**確認・修正**:
```bash
# APIから直接データ確認
curl http://192.168.3.135:8081/api/v1/incidents

# ブラウザキャッシュクリア
localStorage.clear() # ブラウザコンソールで実行

# WebSocketの再接続（リアルタイム更新の場合）
location.reload()
```

---

## 🔍 ログとデバッグ

### フロントエンドデバッグ
**ブラウザ開発者ツールの活用**:
```javascript
// ローカルストレージ確認
console.log(localStorage.getItem('auth_token'));

// ネットワークリクエスト確認
// F12 → Network → XHR/Fetch

// React Developer Tools
// Components、Profilerタブで状態確認

// エラー境界の確認
// Console で React エラーを確認
```

### バックエンドログ
**ログファイルの場所と確認方法**:
```bash
# アプリケーションログ
tail -f logs/app.log

# エラーログ
tail -f logs/error.log

# アクセスログ
tail -f logs/access.log

# デバッグレベルでの起動
export LOG_LEVEL=DEBUG
python start_server.py
```

---

## 🎯 環境別トラブルシューティング

### 開発環境
```bash
# 開発サーバー再起動
./start-itsm.sh

# 依存関係更新
npm update
pip install -r requirements.txt --upgrade

# 設定ファイル確認
cat backend/.env
```

### 本番環境
```bash
# サービス状態確認
systemctl status itsm-backend
systemctl status itsm-frontend

# ログ確認
journalctl -u itsm-backend --tail 50
journalctl -u itsm-frontend --tail 50

# リソース使用量
df -h
free -m
```

---

## 📞 緊急時連絡先とエスカレーション

### レベル1: セルフサービス（5分以内）
1. ブラウザ再読み込み（Ctrl+F5）
2. 別ブラウザでアクセス確認
3. ネットワーク接続確認

### レベル2: 基本トラブルシューティング（15分以内）
1. 本ガイドの該当セクション実行
2. システムログ確認
3. サービス再起動

### レベル3: 技術サポート（30分以内）
**連絡時に準備する情報**:
- エラーメッセージ全文
- 発生時刻と再現手順
- ブラウザとOSの情報
- 関連ログファイル

### レベル4: システム管理者エスカレーション
**重大インシデント（サービス全体停止）**:
- インシデント番号の発行
- 復旧予定時刻の設定
- ステークホルダーへの連絡

---

## 🛡️ 予防保守とモニタリング

### 定期チェック項目
```bash
# 毎日のヘルスチェック
curl http://192.168.3.135:8081/api/v1/health
curl http://192.168.3.135:3000

# 週次のログレビュー
grep ERROR logs/*.log

# 月次のパフォーマンスレビュー
analyze-performance.sh
```

### アラート設定
- CPU使用率 > 80%
- メモリ使用率 > 90%
- ディスク使用率 > 95%
- 応答時間 > 3秒

このトラブルシューティングガイドにより、ITSMシステムWebUIの問題を迅速に診断・解決し、システムの安定運用を実現できます。
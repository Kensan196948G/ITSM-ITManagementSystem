# ITSMシステム API仕様書

## 1. API概要

### 1.1 基本情報

- **ベースURL**: `https://api.itsm-system.com/v1`
- **プロトコル**: HTTPS
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8
- **APIバージョニング**: URLパス方式（/v1, /v2）

### 1.2 認証

#### 認証方式
- **OAuth 2.0**: Authorization Code Flow
- **JWT Bearer Token**: API アクセス用
- **API Key**: レガシーシステム連携用（非推奨）

#### 認証フロー
```http
POST /auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=https://app.example.com/callback&
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET
```

#### レスポンス
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "scope": "read write"
}
```

### 1.3 共通仕様

#### HTTPヘッダー
```http
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
X-Request-ID: {uuid}
```

#### ステータスコード
| コード | 説明 |
|--------|------|
| 200 | OK - 正常終了 |
| 201 | Created - リソース作成成功 |
| 204 | No Content - 削除成功 |
| 400 | Bad Request - リクエスト不正 |
| 401 | Unauthorized - 認証エラー |
| 403 | Forbidden - 権限エラー |
| 404 | Not Found - リソース不存在 |
| 409 | Conflict - 競合エラー |
| 422 | Unprocessable Entity - バリデーションエラー |
| 429 | Too Many Requests - レート制限 |
| 500 | Internal Server Error - サーバーエラー |

#### エラーレスポンス
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "priority",
        "message": "優先度は Low, Medium, High, Critical のいずれかを指定してください"
      }
    ],
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### ページネーション
```http
GET /incidents?page=2&per_page=20&sort=-created_at

{
  "data": [...],
  "meta": {
    "current_page": 2,
    "total_pages": 10,
    "total_count": 193,
    "per_page": 20
  },
  "links": {
    "first": "/incidents?page=1&per_page=20",
    "prev": "/incidents?page=1&per_page=20",
    "next": "/incidents?page=3&per_page=20",
    "last": "/incidents?page=10&per_page=20"
  }
}
```

## 2. インシデント管理API

### 2.1 インシデント一覧取得

#### エンドポイント
```
GET /incidents
```

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| status | string[] | - | ステータスフィルタ |
| priority | string[] | - | 優先度フィルタ |
| assignee_id | string | - | 担当者ID |
| category_id | string | - | カテゴリID |
| created_from | datetime | - | 作成日時（開始） |
| created_to | datetime | - | 作成日時（終了） |
| q | string | - | フリーワード検索 |
| sort | string | - | ソート順（例: -created_at） |
| page | integer | - | ページ番号（デフォルト: 1） |
| per_page | integer | - | 1ページあたり件数（デフォルト: 20） |

#### レスポンス
```json
{
  "data": [
    {
      "id": "INC000123",
      "title": "メールサーバーに接続できない",
      "description": "朝9時頃からメールの送受信ができません",
      "status": "in_progress",
      "priority": "high",
      "category": {
        "id": "cat_001",
        "name": "メール"
      },
      "reporter": {
        "id": "user_456",
        "name": "山田太郎",
        "email": "yamada@example.com"
      },
      "assignee": {
        "id": "user_789",
        "name": "鈴木花子",
        "email": "suzuki@example.com"
      },
      "created_at": "2024-01-15T09:30:00+09:00",
      "updated_at": "2024-01-15T10:15:00+09:00",
      "sla": {
        "response_due": "2024-01-15T10:30:00+09:00",
        "resolution_due": "2024-01-15T17:30:00+09:00",
        "response_met": true,
        "resolution_met": null
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 98,
    "per_page": 20
  }
}
```

### 2.2 インシデント作成

#### エンドポイント
```
POST /incidents
```

#### リクエストボディ
```json
{
  "title": "プリンターが動作しない",
  "description": "3階のプリンター（PR-001）が紙詰まりエラーを表示",
  "category_id": "cat_005",
  "priority": "medium",
  "impact": "department",
  "affected_ci_ids": ["CI001234", "CI001235"],
  "attachments": [
    {
      "filename": "error_screenshot.png",
      "content_type": "image/png",
      "data": "base64_encoded_data..."
    }
  ]
}
```

#### レスポンス
```json
{
  "id": "INC000124",
  "title": "プリンターが動作しない",
  "status": "new",
  "priority": "medium",
  "created_at": "2024-01-15T11:00:00+09:00",
  "ticket_url": "https://itsm-system.com/incidents/INC000124"
}
```

### 2.3 インシデント更新

#### エンドポイント
```
PATCH /incidents/{id}
```

#### リクエストボディ
```json
{
  "status": "in_progress",
  "assignee_id": "user_789",
  "work_notes": "プリンターの現地確認を開始しました"
}
```

### 2.4 インシデント履歴取得

#### エンドポイント
```
GET /incidents/{id}/history
```

#### レスポンス
```json
{
  "data": [
    {
      "id": "hist_001",
      "action": "status_changed",
      "from": "new",
      "to": "assigned",
      "user": {
        "id": "user_123",
        "name": "システム管理者"
      },
      "timestamp": "2024-01-15T09:35:00+09:00"
    }
  ]
}
```

## 3. 問題管理API

### 3.1 問題作成

#### エンドポイント
```
POST /problems
```

#### リクエストボディ
```json
{
  "title": "メールサーバーの定期的な停止",
  "description": "過去1ヶ月で3回メールサーバーが停止",
  "related_incident_ids": ["INC000120", "INC000121", "INC000123"],
  "impact_analysis": "全社のメール業務に影響",
  "priority": "high"
}
```

### 3.2 RCA（根本原因分析）更新

#### エンドポイント
```
PUT /problems/{id}/rca
```

#### リクエストボディ
```json
{
  "analysis_type": "5why",
  "root_cause": "メモリリークによるリソース枯渇",
  "analysis_details": {
    "why1": "メールサーバーが停止した",
    "why2": "メモリ使用率が100%に達した",
    "why3": "メモリリークが発生していた",
    "why4": "最新パッチが適用されていなかった",
    "why5": "パッチ管理プロセスが不十分だった"
  },
  "permanent_solution": "パッチ管理プロセスの改善とメモリ監視の強化"
}
```

## 4. 変更管理API

### 4.1 RFC（変更要求）作成

#### エンドポイント
```
POST /changes
```

#### リクエストボディ
```json
{
  "title": "メールサーバーのパッチ適用",
  "type": "normal",
  "description": "セキュリティパッチの適用",
  "justification": "脆弱性対応のため",
  "risk_assessment": {
    "level": "medium",
    "impact": "メールサービス30分停止",
    "likelihood": "low"
  },
  "implementation_plan": "1. バックアップ取得\n2. パッチ適用\n3. 動作確認",
  "rollback_plan": "バックアップからのリストア",
  "scheduled_start": "2024-01-20T02:00:00+09:00",
  "scheduled_end": "2024-01-20T04:00:00+09:00",
  "affected_ci_ids": ["CI001234"],
  "approvers": ["user_100", "user_101"]
}
```

### 4.2 CAB承認処理

#### エンドポイント
```
POST /changes/{id}/approve
```

#### リクエストボディ
```json
{
  "decision": "approved",
  "comments": "リスク評価内容を確認し、承認します",
  "conditions": [
    "実施前に関係者への通知を徹底すること"
  ]
}
```

### 4.3 変更カレンダー取得

#### エンドポイント
```
GET /changes/calendar
```

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| start_date | date | ○ | 開始日 |
| end_date | date | ○ | 終了日 |
| ci_ids | string[] | - | CI絞り込み |
| risk_levels | string[] | - | リスクレベル |

#### レスポンス
```json
{
  "data": [
    {
      "id": "CHG000456",
      "title": "ネットワーク機器ファームウェア更新",
      "type": "normal",
      "risk_level": "high",
      "scheduled_start": "2024-01-21T22:00:00+09:00",
      "scheduled_end": "2024-01-22T02:00:00+09:00",
      "status": "approved",
      "affected_services": ["メール", "Web", "ファイル共有"]
    }
  ]
}
```

## 5. CMDB API

### 5.1 CI検索

#### エンドポイント
```
GET /cmdb/cis
```

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| type | string[] | - | CI種別 |
| status | string[] | - | ステータス |
| location | string | - | 設置場所 |
| owner | string | - | 所有者 |
| q | string | - | フリーワード |

### 5.2 CI作成

#### エンドポイント
```
POST /cmdb/cis
```

#### リクエストボディ
```json
{
  "name": "mail-server-01",
  "type": "server",
  "attributes": {
    "manufacturer": "Dell",
    "model": "PowerEdge R740",
    "serial_number": "ABC123",
    "os": "Ubuntu 22.04 LTS",
    "cpu": "Intel Xeon Gold 6248 x2",
    "memory": "128GB",
    "location": "DC1-Rack05-U10"
  },
  "status": "active",
  "owner_id": "user_100"
}
```

### 5.3 関係性管理

#### エンドポイント
```
POST /cmdb/relationships
```

#### リクエストボディ
```json
{
  "source_ci_id": "CI001234",
  "target_ci_id": "CI005678",
  "type": "depends_on",
  "description": "アプリケーションサーバーがデータベースに依存"
}
```

### 5.4 インパクト分析

#### エンドポイント
```
GET /cmdb/cis/{id}/impact
```

#### レスポンス
```json
{
  "upstream_impact": [
    {
      "ci_id": "CI009999",
      "name": "メールサービス",
      "type": "service",
      "impact_level": "critical"
    }
  ],
  "downstream_impact": [
    {
      "ci_id": "CI001235",
      "name": "mail-db-01",
      "type": "database",
      "impact_level": "high"
    }
  ]
}
```

## 6. サービスカタログAPI

### 6.1 カタログ取得

#### エンドポイント
```
GET /service-catalog/items
```

#### レスポンス
```json
{
  "data": [
    {
      "id": "srv_001",
      "name": "新規アカウント作成",
      "category": "アカウント管理",
      "description": "社内システムの新規アカウント作成",
      "sla_days": 2,
      "approval_required": true,
      "form_schema": {
        "fields": [
          {
            "name": "employee_id",
            "type": "text",
            "label": "社員番号",
            "required": true
          },
          {
            "name": "systems",
            "type": "multiselect",
            "label": "利用システム",
            "options": ["メール", "ファイル共有", "勤怠管理"]
          }
        ]
      }
    }
  ]
}
```

### 6.2 サービス要求作成

#### エンドポイント
```
POST /service-requests
```

#### リクエストボディ
```json
{
  "catalog_item_id": "srv_001",
  "form_data": {
    "employee_id": "EMP12345",
    "systems": ["メール", "ファイル共有"],
    "start_date": "2024-02-01"
  },
  "requestor_id": "user_456",
  "comments": "2月1日付けの新入社員用"
}
```

## 7. レポートAPI

### 7.1 ダッシュボードデータ取得

#### エンドポイント
```
GET /reports/dashboard
```

#### リクエストパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| type | string | ○ | operational/management |
| period | string | - | today/week/month |

#### レスポンス
```json
{
  "summary": {
    "open_incidents": 45,
    "sla_compliance": 94.5,
    "mttr_hours": 3.2,
    "changes_this_week": 12
  },
  "charts": {
    "incident_trend": {
      "type": "line",
      "data": [
        {"date": "2024-01-08", "count": 23},
        {"date": "2024-01-09", "count": 19}
      ]
    },
    "category_distribution": {
      "type": "pie",
      "data": [
        {"category": "ネットワーク", "count": 15},
        {"category": "ハードウェア", "count": 12}
      ]
    }
  }
}
```

### 7.2 レポート生成

#### エンドポイント
```
POST /reports/generate
```

#### リクエストボディ
```json
{
  "report_type": "incident_analysis",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "categories": ["ネットワーク", "サーバー"],
    "priorities": ["high", "critical"]
  },
  "format": "pdf",
  "email_to": ["manager@example.com"]
}
```

## 8. Webhook API

### 8.1 Webhook登録

#### エンドポイント
```
POST /webhooks
```

#### リクエストボディ
```json
{
  "name": "Slack通知",
  "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
  "events": [
    "incident.created",
    "incident.updated",
    "change.approved"
  ],
  "active": true,
  "headers": {
    "Content-Type": "application/json"
  }
}
```

### 8.2 Webhookペイロード例

#### incident.created
```json
{
  "event": "incident.created",
  "timestamp": "2024-01-15T12:00:00+09:00",
  "data": {
    "id": "INC000125",
    "title": "データベース接続エラー",
    "priority": "high",
    "reporter": {
      "name": "田中一郎",
      "email": "tanaka@example.com"
    },
    "url": "https://itsm-system.com/incidents/INC000125"
  }
}
```

## 9. GraphQL API

### 9.1 エンドポイント
```
POST /graphql
```

### 9.2 スキーマ例

#### Query
```graphql
type Query {
  incident(id: ID!): Incident
  incidents(
    filter: IncidentFilter
    pagination: PaginationInput
  ): IncidentConnection!
  
  problem(id: ID!): Problem
  problems(
    filter: ProblemFilter
    pagination: PaginationInput
  ): ProblemConnection!
  
  ci(id: ID!): ConfigurationItem
  searchCIs(
    query: String!
    types: [CIType!]
  ): [ConfigurationItem!]!
}
```

#### Mutation
```graphql
type Mutation {
  createIncident(input: CreateIncidentInput!): Incident!
  updateIncident(
    id: ID!
    input: UpdateIncidentInput!
  ): Incident!
  
  assignIncident(
    id: ID!
    assigneeId: ID!
  ): Incident!
  
  addWorkNote(
    incidentId: ID!
    note: String!
  ): WorkNote!
}
```

#### Subscription
```graphql
type Subscription {
  incidentUpdated(id: ID!): Incident!
  newIncidentCreated(
    filter: IncidentFilter
  ): Incident!
}
```

### 9.3 クエリ例

#### 複雑なクエリ
```graphql
query GetIncidentDetails($id: ID!) {
  incident(id: $id) {
    id
    title
    description
    status
    priority
    reporter {
      id
      name
      email
    }
    assignee {
      id
      name
      team {
        name
      }
    }
    relatedCIs {
      id
      name
      type
      status
    }
    workNotes {
      id
      content
      author {
        name
      }
      createdAt
    }
    sla {
      responseDue
      resolutionDue
      responseMet
    }
  }
}
```

## 10. API利用ガイドライン

### 10.1 レート制限

| プラン | 制限値 |
|--------|--------|
| Basic | 1,000 リクエスト/時 |
| Professional | 10,000 リクエスト/時 |
| Enterprise | 100,000 リクエスト/時 |

#### レート制限ヘッダー
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### 10.2 ベストプラクティス

1. **バッチ処理**: 複数のリソースを取得する場合は、個別のAPIコールではなく、フィルタやGraphQLを使用
2. **キャッシング**: 変更頻度の低いデータはクライアント側でキャッシュ
3. **非同期処理**: 重い処理は非同期ジョブとして実行し、ポーリングで結果取得
4. **エラーハンドリング**: 指数バックオフでリトライ処理を実装
5. **Webhook活用**: ポーリングの代わりにWebhookでリアルタイム通知

### 10.3 SDKサポート

- Python: `pip install itsm-system-sdk`
- JavaScript/TypeScript: `npm install @itsm-system/sdk`
- Go: `go get github.com/itsm-system/go-sdk`
- Java: Maven/Gradle対応

### 10.4 API変更履歴

| バージョン | リリース日 | 主な変更点 |
|-----------|-----------|-----------|
| v1.0 | 2024-01-01 | 初回リリース |
| v1.1 | 2024-03-01 | GraphQL対応追加 |
| v1.2 | 2024-06-01 | Webhook機能追加 |
/**
 * ITIL v4準拠のITSMメニュー構造定義
 * 包括的なIT運用管理機能を階層構造で提供
 */
/**
 * ITIL v4準拠のITSMメニュー構造
 */
export const itsmMenuStructure = [
    // ダッシュボードセクション
    {
        id: 'dashboard',
        title: 'ダッシュボード',
        items: [
            {
                id: 'overview-dashboard',
                path: '/dashboard',
                label: '概要ダッシュボード',
                icon: { name: 'Dashboard' },
                description: 'システム全体の状況を一覧表示',
                quickAccess: true,
            },
            {
                id: 'performance-analytics',
                path: '/dashboard/performance',
                label: 'パフォーマンス分析',
                icon: { name: 'Analytics' },
                description: 'システムパフォーマンスの詳細分析',
            },
            {
                id: 'sla-monitoring',
                path: '/dashboard/sla',
                label: 'SLA監視',
                icon: { name: 'Timeline' },
                description: 'サービスレベル合意の監視状況',
                badge: { count: 3, color: 'warning' }
            },
            {
                id: 'realtime-monitoring',
                path: '/dashboard/realtime',
                label: 'リアルタイム監視',
                icon: { name: 'MonitorHeart' },
                description: 'システムのリアルタイム状況監視',
                dividerAfter: true,
            },
        ],
    },
    // インシデント管理
    {
        id: 'incident-management',
        title: 'インシデント管理',
        items: [
            {
                id: 'incident-list',
                path: '/incidents',
                label: 'インシデント一覧',
                icon: { name: 'BugReport', color: 'error' },
                description: '全インシデントの管理と追跡',
                badge: { count: 12, color: 'error' },
                children: [
                    {
                        id: 'incident-active',
                        path: '/incidents/active',
                        label: 'アクティブ',
                        icon: { name: 'ErrorOutline' },
                        badge: { count: 8, color: 'error' }
                    },
                    {
                        id: 'incident-pending',
                        path: '/incidents/pending',
                        label: '保留中',
                        icon: { name: 'PauseCircleOutline' },
                        badge: { count: 3, color: 'warning' }
                    },
                    {
                        id: 'incident-resolved',
                        path: '/incidents/resolved',
                        label: '解決済み',
                        icon: { name: 'CheckCircleOutline' },
                    },
                ],
            },
            {
                id: 'incident-create',
                path: '/incidents/create',
                label: '新規インシデント作成',
                icon: { name: 'Add' },
                description: '新しいインシデントを登録',
                quickAccess: true,
            },
            {
                id: 'escalation-management',
                path: '/incidents/escalation',
                label: 'エスカレーション管理',
                icon: { name: 'TrendingUp' },
                description: 'インシデントのエスカレーション状況',
            },
            {
                id: 'incident-analytics',
                path: '/incidents/analytics',
                label: 'インシデント分析',
                icon: { name: 'BarChart' },
                description: 'インシデント傾向とパターン分析',
                dividerAfter: true,
            },
        ],
    },
    // 問題管理
    {
        id: 'problem-management',
        title: '問題管理',
        items: [
            {
                id: 'problem-list',
                path: '/problems',
                label: '問題一覧',
                icon: { name: 'SearchOff' },
                description: '問題の管理と追跡',
                children: [
                    {
                        id: 'problem-open',
                        path: '/problems/open',
                        label: 'オープン',
                        icon: { name: 'FolderOpen' },
                    },
                    {
                        id: 'problem-investigation',
                        path: '/problems/investigation',
                        label: '調査中',
                        icon: { name: 'FindInPage' },
                    },
                    {
                        id: 'problem-closed',
                        path: '/problems/closed',
                        label: 'クローズ済み',
                        icon: { name: 'FolderOff' },
                    },
                ],
            },
            {
                id: 'root-cause-analysis',
                path: '/problems/rca',
                label: '根本原因分析（RCA）',
                icon: { name: 'Psychology' },
                description: '問題の根本原因を特定・分析',
            },
            {
                id: 'known-error-db',
                path: '/problems/known-errors',
                label: '既知エラー管理',
                icon: { name: 'BookmarkBorder' },
                description: '既知エラーデータベースの管理',
            },
            {
                id: 'problem-prevention',
                path: '/problems/prevention',
                label: '問題予防',
                icon: { name: 'Shield' },
                description: '予防策の実装と管理',
                dividerAfter: true,
            },
        ],
    },
    // 変更管理
    {
        id: 'change-management',
        title: '変更管理',
        items: [
            {
                id: 'change-requests',
                path: '/changes',
                label: '変更要求一覧',
                icon: { name: 'ChangeCircle' },
                description: '変更要求の管理と承認',
                badge: { count: 5, color: 'info' },
                children: [
                    {
                        id: 'change-draft',
                        path: '/changes/draft',
                        label: 'ドラフト',
                        icon: { name: 'EditNote' },
                    },
                    {
                        id: 'change-approval',
                        path: '/changes/approval',
                        label: '承認待ち',
                        icon: { name: 'Approval' },
                        badge: { count: 5, color: 'warning' }
                    },
                    {
                        id: 'change-scheduled',
                        path: '/changes/scheduled',
                        label: 'スケジュール済み',
                        icon: { name: 'Schedule' },
                    },
                    {
                        id: 'change-implemented',
                        path: '/changes/implemented',
                        label: '実装済み',
                        icon: { name: 'DoneAll' },
                    },
                ],
            },
            {
                id: 'cab-management',
                path: '/changes/cab',
                label: 'CAB（変更諮問委員会）',
                icon: { name: 'Groups' },
                description: '変更諮問委員会の運営',
            },
            {
                id: 'change-calendar',
                path: '/changes/calendar',
                label: '変更カレンダー',
                icon: { name: 'CalendarMonth' },
                description: '変更スケジュールの可視化',
            },
            {
                id: 'emergency-changes',
                path: '/changes/emergency',
                label: '緊急変更',
                icon: { name: 'Emergency', color: 'error' },
                description: '緊急変更の管理',
                quickAccess: true,
                dividerAfter: true,
            },
        ],
    },
    // リリース・展開管理
    {
        id: 'release-deployment',
        title: 'リリース・展開管理',
        items: [
            {
                id: 'release-planning',
                path: '/releases',
                label: 'リリース計画',
                icon: { name: 'RocketLaunch' },
                description: 'リリース計画の管理',
                children: [
                    {
                        id: 'release-upcoming',
                        path: '/releases/upcoming',
                        label: '予定中',
                        icon: { name: 'Upcoming' },
                    },
                    {
                        id: 'release-in-progress',
                        path: '/releases/in-progress',
                        label: '進行中',
                        icon: { name: 'PlayArrow' },
                    },
                    {
                        id: 'release-completed',
                        path: '/releases/completed',
                        label: '完了',
                        icon: { name: 'CheckCircle' },
                    },
                ],
            },
            {
                id: 'deployment-schedule',
                path: '/deployments/schedule',
                label: '展開スケジュール',
                icon: { name: 'Event' },
                description: '展開スケジュールの管理',
            },
            {
                id: 'rollback-planning',
                path: '/deployments/rollback',
                label: 'ロールバック計画',
                icon: { name: 'Undo' },
                description: 'ロールバック計画の準備',
            },
            {
                id: 'test-management',
                path: '/releases/testing',
                label: 'テスト管理',
                icon: { name: 'Science' },
                description: 'リリーステストの管理',
                dividerAfter: true,
            },
        ],
    },
    // 構成管理（CMDB）
    {
        id: 'configuration-management',
        title: '構成管理（CMDB）',
        items: [
            {
                id: 'ci-management',
                path: '/cmdb/cis',
                label: 'CI（構成アイテム）管理',
                icon: { name: 'Inventory' },
                description: '構成アイテムの管理',
                children: [
                    {
                        id: 'ci-hardware',
                        path: '/cmdb/cis/hardware',
                        label: 'ハードウェア',
                        icon: { name: 'Computer' },
                    },
                    {
                        id: 'ci-software',
                        path: '/cmdb/cis/software',
                        label: 'ソフトウェア',
                        icon: { name: 'Apps' },
                    },
                    {
                        id: 'ci-network',
                        path: '/cmdb/cis/network',
                        label: 'ネットワーク',
                        icon: { name: 'Hub' },
                    },
                    {
                        id: 'ci-services',
                        path: '/cmdb/cis/services',
                        label: 'サービス',
                        icon: { name: 'CloudQueue' },
                    },
                ],
            },
            {
                id: 'relationship-mapping',
                path: '/cmdb/relationships',
                label: '関係性マッピング',
                icon: { name: 'AccountTree' },
                description: 'CI間の関係性を可視化',
            },
            {
                id: 'configuration-baseline',
                path: '/cmdb/baseline',
                label: '構成ベースライン',
                icon: { name: 'Layers' },
                description: '構成のベースライン管理',
            },
            {
                id: 'cmdb-audit',
                path: '/cmdb/audit',
                label: '監査・検証',
                icon: { name: 'FactCheck' },
                description: '構成データの監査',
                dividerAfter: true,
            },
        ],
    },
    // サービスカタログ
    {
        id: 'service-catalog',
        title: 'サービスカタログ',
        items: [
            {
                id: 'service-catalog-list',
                path: '/services',
                label: 'サービス一覧',
                icon: { name: 'ViewList' },
                description: '提供サービスの一覧',
                children: [
                    {
                        id: 'service-active',
                        path: '/services/active',
                        label: 'アクティブ',
                        icon: { name: 'CheckCircle' },
                    },
                    {
                        id: 'service-retired',
                        path: '/services/retired',
                        label: '廃止済み',
                        icon: { name: 'Archive' },
                    },
                ],
            },
            {
                id: 'service-status',
                path: '/services/status',
                label: 'サービス提供状況',
                icon: { name: 'Speed' },
                description: 'サービスの稼働状況',
            },
            {
                id: 'service-requests',
                path: '/services/requests',
                label: 'サービス要求管理',
                icon: { name: 'RequestPage' },
                description: 'サービス要求の管理',
                badge: { count: 7, color: 'info' }
            },
            {
                id: 'catalog-management',
                path: '/services/catalog-management',
                label: 'カタログ管理',
                icon: { name: 'LibraryBooks' },
                description: 'サービスカタログの管理',
                permission: { roles: ['admin', 'manager'] },
                dividerAfter: true,
            },
        ],
    },
    // 容量・可用性管理
    {
        id: 'capacity-availability',
        title: '容量・可用性管理',
        items: [
            {
                id: 'capacity-monitoring',
                path: '/capacity',
                label: 'キャパシティ監視',
                icon: { name: 'Storage' },
                description: 'システム容量の監視',
                children: [
                    {
                        id: 'capacity-current',
                        path: '/capacity/current',
                        label: '現在の使用量',
                        icon: { name: 'PieChart' },
                    },
                    {
                        id: 'capacity-forecast',
                        path: '/capacity/forecast',
                        label: '予測・計画',
                        icon: { name: 'TrendingUp' },
                    },
                ],
            },
            {
                id: 'availability-reports',
                path: '/availability',
                label: '可用性レポート',
                icon: { name: 'Accessibility' },
                description: 'システム可用性の報告',
            },
            {
                id: 'performance-analysis',
                path: '/performance',
                label: 'パフォーマンス分析',
                icon: { name: 'ShowChart' },
                description: 'システムパフォーマンスの分析',
            },
            {
                id: 'capacity-planning',
                path: '/capacity/planning',
                label: '予測・計画',
                icon: { name: 'TrendingUp' },
                description: '容量計画と予測',
                dividerAfter: true,
            },
        ],
    },
    // ユーザー・組織管理
    {
        id: 'user-organization',
        title: 'ユーザー・組織管理',
        items: [
            {
                id: 'user-management',
                path: '/users',
                label: 'ユーザー管理',
                icon: { name: 'People' },
                description: 'ユーザーアカウントの管理',
                children: [
                    {
                        id: 'user-list',
                        path: '/users/list',
                        label: 'ユーザー一覧',
                        icon: { name: 'List' },
                    },
                    {
                        id: 'user-create',
                        path: '/users/create',
                        label: '新規作成',
                        icon: { name: 'PersonAdd' },
                    },
                    {
                        id: 'user-groups',
                        path: '/users/groups',
                        label: 'グループ管理',
                        icon: { name: 'Group' },
                    },
                ],
            },
            {
                id: 'role-permissions',
                path: '/roles',
                label: '役割・権限管理',
                icon: { name: 'Security' },
                description: 'ユーザー権限の管理',
                permission: { roles: ['admin'] },
            },
            {
                id: 'departments',
                path: '/departments',
                label: '部署・チーム管理',
                icon: { name: 'CorporateFare' },
                description: '組織構造の管理',
                permission: { roles: ['admin', 'manager'] },
            },
            {
                id: 'access-control',
                path: '/access-control',
                label: 'アクセス制御',
                icon: { name: 'VpnKey' },
                description: 'システムアクセス制御',
                permission: { roles: ['admin'] },
                dividerAfter: true,
            },
        ],
    },
    // レポート・分析
    {
        id: 'reports-analytics',
        title: 'レポート・分析',
        items: [
            {
                id: 'kpi-dashboard',
                path: '/reports/kpi',
                label: 'KPIダッシュボード',
                icon: { name: 'Dashboard' },
                description: '主要パフォーマンス指標',
            },
            {
                id: 'trend-analysis',
                path: '/reports/trends',
                label: 'トレンド分析',
                icon: { name: 'TrendingUp' },
                description: '長期的なトレンド分析',
            },
            {
                id: 'custom-reports',
                path: '/reports/custom',
                label: 'カスタムレポート',
                icon: { name: 'Assessment' },
                description: 'カスタマイズ可能なレポート',
            },
            {
                id: 'data-export',
                path: '/reports/export',
                label: 'データエクスポート',
                icon: { name: 'FileDownload' },
                description: 'データのエクスポート機能',
                dividerAfter: true,
            },
        ],
    },
    // システム設定
    {
        id: 'system-settings',
        title: 'システム設定',
        items: [
            {
                id: 'general-settings',
                path: '/settings/general',
                label: '一般設定',
                icon: { name: 'Settings' },
                description: 'システム基本設定の管理',
                permission: { roles: ['admin'] },
                quickAccess: true,
                children: [
                    {
                        id: 'system-info',
                        path: '/settings/general/system-info',
                        label: 'システム基本情報',
                        icon: { name: 'Info' },
                    },
                    {
                        id: 'timezone-settings',
                        path: '/settings/general/timezone',
                        label: 'タイムゾーン設定',
                        icon: { name: 'Schedule' },
                    },
                    {
                        id: 'locale-settings',
                        path: '/settings/general/locale',
                        label: '言語・地域設定',
                        icon: { name: 'Language' },
                    },
                    {
                        id: 'theme-settings',
                        path: '/settings/general/theme',
                        label: 'システムロゴ・テーマ',
                        icon: { name: 'Palette' },
                    },
                ],
            },
            {
                id: 'security-settings',
                path: '/settings/security',
                label: 'セキュリティ設定',
                icon: { name: 'Security' },
                description: 'システムセキュリティの設定',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'password-policy',
                        path: '/settings/security/password-policy',
                        label: 'パスワードポリシー',
                        icon: { name: 'Lock' },
                    },
                    {
                        id: 'session-management',
                        path: '/settings/security/session',
                        label: 'セッション管理',
                        icon: { name: 'AccessTime' },
                    },
                    {
                        id: 'two-factor-auth',
                        path: '/settings/security/2fa',
                        label: '2要素認証',
                        icon: { name: 'Security' },
                    },
                    {
                        id: 'ip-access-control',
                        path: '/settings/security/ip-access',
                        label: 'IPアクセス制限',
                        icon: { name: 'Block' },
                    },
                ],
            },
            {
                id: 'notification-settings',
                path: '/settings/notifications',
                label: '通知設定',
                icon: { name: 'Notifications' },
                description: '通知システムの設定',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'email-settings',
                        path: '/settings/notifications/email',
                        label: 'メール設定',
                        icon: { name: 'Email' },
                    },
                    {
                        id: 'sms-settings',
                        path: '/settings/notifications/sms',
                        label: 'SMS設定',
                        icon: { name: 'Sms' },
                    },
                    {
                        id: 'webhook-settings',
                        path: '/settings/notifications/webhook',
                        label: 'Webhook設定',
                        icon: { name: 'Link' },
                    },
                    {
                        id: 'notification-templates',
                        path: '/settings/notifications/templates',
                        label: '通知テンプレート',
                        icon: { name: 'Description' },
                    },
                ],
            },
            {
                id: 'sla-settings',
                path: '/settings/sla',
                label: 'SLA設定',
                icon: { name: 'Timer' },
                description: 'サービスレベル合意の設定',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'priority-sla',
                        path: '/settings/sla/priority',
                        label: '優先度別SLA',
                        icon: { name: 'PriorityHigh' },
                    },
                    {
                        id: 'business-hours',
                        path: '/settings/sla/business-hours',
                        label: '営業時間設定',
                        icon: { name: 'BusinessCenter' },
                    },
                    {
                        id: 'escalation-settings',
                        path: '/settings/sla/escalation',
                        label: 'エスカレーション設定',
                        icon: { name: 'TrendingUp' },
                    },
                    {
                        id: 'sla-exceptions',
                        path: '/settings/sla/exceptions',
                        label: 'SLA例外管理',
                        icon: { name: 'Error' },
                    },
                ],
            },
            {
                id: 'workflow-settings',
                path: '/settings/workflows',
                label: 'ワークフロー設定',
                icon: { name: 'Timeline' },
                description: 'ワークフローの設定',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'incident-workflow',
                        path: '/settings/workflows/incident',
                        label: 'インシデントワークフロー',
                        icon: { name: 'BugReport' },
                    },
                    {
                        id: 'problem-workflow',
                        path: '/settings/workflows/problem',
                        label: '問題管理ワークフロー',
                        icon: { name: 'Psychology' },
                    },
                    {
                        id: 'change-workflow',
                        path: '/settings/workflows/change',
                        label: '変更管理ワークフロー',
                        icon: { name: 'ChangeCircle' },
                    },
                    {
                        id: 'approval-workflow',
                        path: '/settings/workflows/approval',
                        label: '承認フロー設定',
                        icon: { name: 'Approval' },
                    },
                ],
            },
            {
                id: 'data-management',
                path: '/settings/data',
                label: 'データ管理',
                icon: { name: 'Storage' },
                description: 'データベースとデータ管理',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'database-settings',
                        path: '/settings/data/database',
                        label: 'データベース設定',
                        icon: { name: 'Storage' },
                    },
                    {
                        id: 'backup-settings',
                        path: '/settings/data/backup',
                        label: 'バックアップ設定',
                        icon: { name: 'CloudBackup' },
                    },
                    {
                        id: 'retention-policy',
                        path: '/settings/data/retention',
                        label: 'データ保持ポリシー',
                        icon: { name: 'Schedule' },
                    },
                    {
                        id: 'data-export',
                        path: '/settings/data/export',
                        label: 'データエクスポート',
                        icon: { name: 'FileDownload' },
                    },
                ],
            },
            {
                id: 'integration-settings',
                path: '/settings/integrations',
                label: '統合設定',
                icon: { name: 'Link' },
                description: '外部システム統合設定',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'api-settings',
                        path: '/settings/integrations/api',
                        label: 'API設定',
                        icon: { name: 'Code' },
                    },
                    {
                        id: 'ldap-settings',
                        path: '/settings/integrations/ldap',
                        label: 'LDAP/AD連携',
                        icon: { name: 'AccountTree' },
                    },
                    {
                        id: 'external-systems',
                        path: '/settings/integrations/external',
                        label: '外部システム連携',
                        icon: { name: 'Link' },
                    },
                    {
                        id: 'webhook-management',
                        path: '/settings/integrations/webhooks',
                        label: 'Webhook管理',
                        icon: { name: 'Link' },
                    },
                ],
            },
            {
                id: 'system-monitoring',
                path: '/settings/monitoring',
                label: 'システム監視',
                icon: { name: 'MonitorHeart' },
                description: 'システム監視とログ管理',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'log-settings',
                        path: '/settings/monitoring/logs',
                        label: 'ログ設定',
                        icon: { name: 'Description' },
                    },
                    {
                        id: 'performance-monitoring',
                        path: '/settings/monitoring/performance',
                        label: 'パフォーマンス監視',
                        icon: { name: 'Speed' },
                    },
                    {
                        id: 'alert-settings',
                        path: '/settings/monitoring/alerts',
                        label: 'アラート設定',
                        icon: { name: 'Warning' },
                    },
                    {
                        id: 'system-health',
                        path: '/settings/monitoring/health',
                        label: 'システムヘルス',
                        icon: { name: 'Favorite' },
                    },
                ],
                dividerAfter: true,
            },
        ],
    },
    // ブラウザエラー監視・修復システム
    {
        id: 'browser-error-monitoring',
        title: 'ブラウザエラー監視・修復システム',
        items: [
            {
                id: 'browser-error-monitor',
                path: '/browser-error-monitor',
                label: 'ブラウザエラー監視システム',
                icon: { name: 'Security' },
                description: 'MCP Playwright WebUIエラー検知・修復システム',
                quickAccess: true,
                badge: { text: 'LIVE', color: 'success' },
                permission: { roles: ['admin', 'manager'] },
            },
            {
                id: 'browser-error-admin',
                path: '/admin/browser-error-monitor',
                label: '管理者ダッシュボード',
                icon: { name: 'AdminPanelSettings' },
                description: 'ブラウザエラー監視システムの管理画面',
                permission: { roles: ['admin'] },
            },
        ],
    },
    // CI/CD・自動修復管理
    {
        id: 'cicd-automation',
        title: 'CI/CD・自動修復管理',
        items: [
            {
                id: 'cicd-dashboard',
                path: '/cicd/dashboard',
                label: 'CI/CD自動修復ダッシュボード',
                icon: { name: 'AutoFixHigh' },
                description: '無限ループ修復システムの監視ダッシュボード',
                quickAccess: true,
                badge: { text: 'LIVE', color: 'success' },
            },
            {
                id: 'workflow-manager',
                path: '/cicd/workflows',
                label: 'ワークフロー管理',
                icon: { name: 'Build' },
                description: 'CI/CDワークフローの作成・管理',
                children: [
                    {
                        id: 'workflow-list',
                        path: '/cicd/workflows/list',
                        label: 'ワークフロー一覧',
                        icon: { name: 'ViewList' },
                    },
                    {
                        id: 'workflow-create',
                        path: '/cicd/workflows/create',
                        label: '新規作成',
                        icon: { name: 'Add' },
                    },
                    {
                        id: 'workflow-templates',
                        path: '/cicd/workflows/templates',
                        label: 'テンプレート',
                        icon: { name: 'LibraryBooks' },
                    },
                ],
            },
            {
                id: 'repair-monitor',
                path: '/cicd/repair-monitor',
                label: '修復監視システム',
                icon: { name: 'MonitorHeart' },
                description: 'リアルタイム修復状況の監視',
                badge: { count: 3, color: 'warning' },
            },
            {
                id: 'system-health',
                path: '/cicd/system-health',
                label: 'システムヘルス',
                icon: { name: 'Speed' },
                description: 'システム全体の健康状態監視',
            },
            {
                id: 'cicd-logs',
                path: '/cicd/logs',
                label: 'CI/CDログ',
                icon: { name: 'Description' },
                description: 'ワークフロー実行ログの表示・分析',
                children: [
                    {
                        id: 'logs-realtime',
                        path: '/cicd/logs/realtime',
                        label: 'リアルタイムログ',
                        icon: { name: 'Timeline' },
                    },
                    {
                        id: 'logs-history',
                        path: '/cicd/logs/history',
                        label: 'ログ履歴',
                        icon: { name: 'History' },
                    },
                    {
                        id: 'logs-search',
                        path: '/cicd/logs/search',
                        label: 'ログ検索',
                        icon: { name: 'Search' },
                    },
                ],
            },
            {
                id: 'github-integration',
                path: '/cicd/github',
                label: 'GitHub連携',
                icon: { name: 'GitHub' },
                description: 'GitHub Actionsとの連携管理',
                permission: { roles: ['admin', 'developer'] },
            },
            {
                id: 'cicd-settings',
                path: '/cicd/settings',
                label: 'CI/CD設定',
                icon: { name: 'Settings' },
                description: '自動修復システムの設定管理',
                permission: { roles: ['admin'] },
                children: [
                    {
                        id: 'repair-config',
                        path: '/cicd/settings/repair',
                        label: '修復設定',
                        icon: { name: 'Tune' },
                    },
                    {
                        id: 'notification-config',
                        path: '/cicd/settings/notifications',
                        label: '通知設定',
                        icon: { name: 'Notifications' },
                    },
                    {
                        id: 'webhook-config',
                        path: '/cicd/settings/webhooks',
                        label: 'Webhook設定',
                        icon: { name: 'Link' },
                    },
                ],
                dividerAfter: true,
            },
        ],
    },
    // ナレッジ管理
    {
        id: 'knowledge-management',
        title: 'ナレッジ管理',
        items: [
            {
                id: 'knowledge-base',
                path: '/knowledge',
                label: 'ナレッジベース',
                icon: { name: 'MenuBook' },
                description: 'ナレッジ記事の管理',
                children: [
                    {
                        id: 'knowledge-articles',
                        path: '/knowledge/articles',
                        label: '記事一覧',
                        icon: { name: 'Article' },
                    },
                    {
                        id: 'knowledge-create',
                        path: '/knowledge/create',
                        label: '新規作成',
                        icon: { name: 'CreateNewFolder' },
                    },
                    {
                        id: 'knowledge-categories',
                        path: '/knowledge/categories',
                        label: 'カテゴリ管理',
                        icon: { name: 'Category' },
                    },
                ],
            },
            {
                id: 'faq-management',
                path: '/knowledge/faq',
                label: 'FAQ管理',
                icon: { name: 'Quiz' },
                description: 'よくある質問の管理',
            },
            {
                id: 'solution-procedures',
                path: '/knowledge/procedures',
                label: '解決手順書',
                icon: { name: 'Assignment' },
                description: '問題解決手順の管理',
            },
            {
                id: 'training-materials',
                path: '/knowledge/training',
                label: '教育・トレーニング',
                icon: { name: 'School' },
                description: 'トレーニング資料の管理',
                permission: { roles: ['admin', 'manager'] },
            },
        ],
    },
];
/**
 * クイックアクセス項目を取得
 */
export const getQuickAccessItems = () => {
    const quickItems = [];
    const findQuickAccessItems = (items) => {
        items.forEach(item => {
            if (item.quickAccess) {
                quickItems.push(item);
            }
            if (item.children) {
                findQuickAccessItems(item.children);
            }
        });
    };
    itsmMenuStructure.forEach(section => {
        findQuickAccessItems(section.items);
    });
    return quickItems;
};
/**
 * ユーザー権限に基づいてメニュー項目をフィルタリング
 */
export const filterMenuByPermissions = (menuItems, userRoles, userPermissions = []) => {
    return menuItems.filter(item => {
        // 権限設定がない場合は表示
        if (!item.permission)
            return true;
        // 役割チェック
        if (item.permission.roles) {
            const hasRole = item.permission.roles.some(role => userRoles.includes(role));
            if (!hasRole)
                return false;
        }
        // 権限チェック
        if (item.permission.permissions) {
            const hasPermission = item.permission.permissions.some(permission => userPermissions.includes(permission));
            if (!hasPermission)
                return false;
        }
        return true;
    }).map(item => ({
        ...item,
        children: item.children ? filterMenuByPermissions(item.children, userRoles, userPermissions) : undefined
    }));
};
/**
 * 検索用のフラットなメニュー項目を取得
 */
export const getFlatMenuItems = () => {
    const flatItems = [];
    const flattenItems = (items, parentPath = '') => {
        items.forEach(item => {
            const fullPath = parentPath ? `${parentPath} > ${item.label}` : item.label;
            flatItems.push({
                ...item,
                label: fullPath
            });
            if (item.children) {
                flattenItems(item.children, fullPath);
            }
        });
    };
    itsmMenuStructure.forEach(section => {
        flattenItems(section.items, section.title);
    });
    return flatItems;
};

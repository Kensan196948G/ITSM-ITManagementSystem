import React from 'react'
import { Link } from 'react-router-dom'

const DashboardTest: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">ダッシュボードテスト</h1>
      <p className="text-gray-600">実装されたダッシュボードページへのリンク</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/dashboard/performance"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-bold text-blue-600 mb-2">📊 パフォーマンス分析</h2>
          <p className="text-gray-600 text-sm">
            システムとビジネスのパフォーマンス指標を監視・分析
          </p>
          <ul className="mt-3 text-sm text-gray-500 space-y-1">
            <li>• チケット処理パフォーマンス</li>
            <li>• システムパフォーマンス監視</li>
            <li>• ビジネスメトリクス</li>
            <li>• ボトルネック分析</li>
          </ul>
        </Link>

        <Link
          to="/dashboard/sla"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-bold text-green-600 mb-2">🎯 SLA監視</h2>
          <p className="text-gray-600 text-sm">
            サービスレベル目標の遵守状況とリスク分析
          </p>
          <ul className="mt-3 text-sm text-gray-500 space-y-1">
            <li>• SLA遵守率監視</li>
            <li>• 優先度別分析</li>
            <li>• リスクチケット管理</li>
            <li>• エスカレーション履歴</li>
          </ul>
        </Link>

        <Link
          to="/dashboard/realtime"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-bold text-purple-600 mb-2">📱 リアルタイム監視</h2>
          <p className="text-gray-600 text-sm">
            システム状態とライブメトリクスの監視
          </p>
          <ul className="mt-3 text-sm text-gray-500 space-y-1">
            <li>• サーバー状態監視</li>
            <li>• サービス稼働状況</li>
            <li>• ライブフィード</li>
            <li>• システムイベント</li>
          </ul>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-800 mb-2">実装された機能</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">UI/UXコンポーネント</h4>
            <ul className="text-blue-600 space-y-1">
              <li>• Rechartsチャート（線グラフ、棒グラフ、円グラフ）</li>
              <li>• インタラクティブなメトリクスカード</li>
              <li>• ステータスインジケーター</li>
              <li>• リアルタイム更新機能</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">技術仕様</h4>
            <ul className="text-blue-600 space-y-1">
              <li>• TypeScript完全対応</li>
              <li>• レスポンシブデザイン</li>
              <li>• アクセシビリティ準拠</li>
              <li>• ダミーデータによる完全動作</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardTest
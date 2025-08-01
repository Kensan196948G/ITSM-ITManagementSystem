import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { RealTimeData, ServerStatus, ServiceStatus, Alert, Ticket, StatusChange, SystemEvent, UserActivity } from '../../types/dashboard'
import MetricCard from '../../components/dashboard/MetricCard'
import ChartCard from '../../components/dashboard/ChartCard'
import StatusIndicator from '../../components/dashboard/StatusIndicator'

// 安定したメトリクスカードコンポーネント
interface StableMetricCardProps {
  title: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'critical'
  icon: string
}

const StableMetricCard: React.FC<StableMetricCardProps> = React.memo(({ title, value, unit, status, icon }) => {
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-500 text-white'
      case 'warning':
        return 'bg-yellow-500 text-white'
      default:
        return 'bg-green-500 text-white'
    }
  }, [])

  return (
    <div className={`p-6 rounded-xl shadow-lg ${getStatusColor(status)} transition-colors duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
      <div className="text-4xl font-black mb-2">
        {value}<span className="text-xl font-medium ml-2">{unit}</span>
      </div>
      <div className="text-sm opacity-90">
        {status === 'good' ? '正常' : status === 'warning' ? '注意' : '異常'}
      </div>
    </div>
  )
})

const RealTimeMonitoring: React.FC = React.memo(() => {
  const [data, setData] = useState<RealTimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(300000) // 5分
  const [systemLoadHistory, setSystemLoadHistory] = useState<{ time: string; load: number }[]>([])

  // ダミーデータ生成をuseCallbackでメモ化
  const generateMockData = useCallback((): RealTimeData => {
    const currentTime = new Date()
    
    const servers: ServerStatus[] = [
      {
        id: 'srv-web-01',
        name: 'Webサーバー01',
        status: Math.random() > 0.1 ? 'online' : 'warning',
        cpu: Math.round(20 + Math.random() * 60),
        memory: Math.round(30 + Math.random() * 50),
        disk: Math.round(40 + Math.random() * 40),
        uptime: '15日 3時間 45分'
      },
      {
        id: 'srv-web-02',
        name: 'Webサーバー02',
        status: Math.random() > 0.1 ? 'online' : 'offline',
        cpu: Math.round(25 + Math.random() * 55),
        memory: Math.round(35 + Math.random() * 45),
        disk: Math.round(45 + Math.random() * 35),
        uptime: '12日 8時間 22分'
      },
      {
        id: 'srv-db-01',
        name: 'データベースサーバー',
        status: 'online',
        cpu: Math.round(40 + Math.random() * 40),
        memory: Math.round(60 + Math.random() * 30),
        disk: Math.round(70 + Math.random() * 20),
        uptime: '45日 12時間 18分'
      },
      {
        id: 'srv-app-01',
        name: 'アプリケーションサーバー',
        status: Math.random() > 0.05 ? 'online' : 'warning',
        cpu: Math.round(30 + Math.random() * 50),
        memory: Math.round(40 + Math.random() * 40),
        disk: Math.round(50 + Math.random() * 30),
        uptime: '8日 16時間 5分'
      }
    ]

    const services: ServiceStatus[] = [
      {
        id: 'svc-web',
        name: 'Webサービス',
        status: Math.random() > 0.1 ? 'operational' : 'degraded',
        responseTime: Math.round(150 + Math.random() * 200),
        uptime: 99.8,
        lastCheck: currentTime.toISOString()
      },
      {
        id: 'svc-api',
        name: 'APIサービス',
        status: 'operational',
        responseTime: Math.round(80 + Math.random() * 100),
        uptime: 99.9,
        lastCheck: currentTime.toISOString()
      },
      {
        id: 'svc-auth',
        name: '認証サービス',
        status: Math.random() > 0.05 ? 'operational' : 'outage',
        responseTime: Math.round(100 + Math.random() * 150),
        uptime: 99.7,
        lastCheck: currentTime.toISOString()
      },
      {
        id: 'svc-email',
        name: 'メールサービス',
        status: 'operational',
        responseTime: Math.round(200 + Math.random() * 300),
        uptime: 99.5,
        lastCheck: currentTime.toISOString()
      }
    ]

    const alerts: Alert[] = [
      {
        id: 'alert-001',
        type: Math.random() > 0.7 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'info',
        message: 'CPUリソース使用率が高くなっています',
        timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString(),
        source: 'システム監視'
      },
      {
        id: 'alert-002',
        type: 'warning',
        message: 'ディスク容量が80%を超過しました',
        timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString(),
        source: 'インフラ監視'
      },
      {
        id: 'alert-003',
        type: 'info',
        message: '定期メンテナンスが完了しました',
        timestamp: new Date(currentTime.getTime() - Math.random() * 900000).toISOString(),
        source: 'メンテナンス'
      }
    ]

    const recentTickets: Ticket[] = [
      {
        id: 'INC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        title: 'ネットワーク接続の不具合',
        priority: Math.random() > 0.7 ? 'high' : 'medium',
        status: 'open',
        assignee: '田中 太郎',
        created: new Date(currentTime.getTime() - Math.random() * 3600000).toISOString(),
        category: 'Network'
      },
      {
        id: 'INC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        title: 'アプリケーションエラー',
        priority: 'critical',
        status: 'in_progress',
        assignee: '佐藤 花子',
        created: new Date(currentTime.getTime() - Math.random() * 1800000).toISOString(),
        category: 'Application'
      }
    ]

    const statusChanges: StatusChange[] = [
      {
        id: 'change-001',
        ticketId: 'INC-123',
        from: 'open',
        to: 'in_progress',
        timestamp: new Date(currentTime.getTime() - Math.random() * 900000).toISOString(),
        user: '鈴木 次郎'
      },
      {
        id: 'change-002',
        ticketId: 'INC-124',
        from: 'in_progress',
        to: 'resolved',
        timestamp: new Date(currentTime.getTime() - Math.random() * 1200000).toISOString(),
        user: '高橋 美咲'
      }
    ]

    const systemEvents: SystemEvent[] = [
      {
        id: 'event-001',
        type: 'system',
        message: 'サーバー再起動が完了しました',
        timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString(),
        severity: 'low'
      },
      {
        id: 'event-002',
        type: 'security',
        message: '不正アクセス試行を検出',
        timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString(),
        severity: 'high'
      }
    ]

    const userActivity: UserActivity[] = [
      {
        id: 'activity-001',
        user: '山田 花子',
        action: 'ログイン',
        target: 'システム',
        timestamp: new Date(currentTime.getTime() - Math.random() * 300000).toISOString()
      },
      {
        id: 'activity-002',
        user: '伊藤 太郎',
        action: 'チケット更新',
        target: 'INC-125',
        timestamp: new Date(currentTime.getTime() - Math.random() * 600000).toISOString()
      }
    ]

    return {
      systemStatus: {
        servers,
        services,
        network: {
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          latency: Math.round(20 + Math.random() * 30),
          packetLoss: Math.round(Math.random() * 2 * 100) / 100,
          bandwidth: Math.round(800 + Math.random() * 200)
        },
        database: {
          status: Math.random() > 0.05 ? 'connected' : 'slow',
          connections: Math.round(15 + Math.random() * 35),
          queryTime: Math.round(50 + Math.random() * 100),
          size: '2.5GB'
        }
      },
      liveMetrics: {
        activeUsers: Math.round(45 + Math.random() * 20),
        activeTickets: Math.round(120 + Math.random() * 30),
        systemLoad: Math.round(30 + Math.random() * 40),
        alerts
      },
      liveFeed: {
        recentTickets,
        statusChanges,
        systemEvents,
        userActivity
      }
    }
  }, [])

  // データ取得関数をuseCallbackでメモ化 - 安定化
  const fetchData = useCallback(() => {
    if (!autoRefresh) return
    
    // loadingステートを直接操作しないで安定化
    const newData = generateMockData()
    setData(prevData => {
      // データが変わった場合のみ更新
      if (!prevData || JSON.stringify(prevData.liveMetrics.systemLoad) !== JSON.stringify(newData.liveMetrics.systemLoad)) {
        return newData
      }
      return prevData
    })
    
    // システム負荷履歴を更新 - 安定化
    const currentTime = new Date().toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    setSystemLoadHistory(prev => {
      const newHistory = [...prev, { time: currentTime, load: newData.liveMetrics.systemLoad }]
      return newHistory.length > 20 ? newHistory.slice(-20) : newHistory
    })
  }, [autoRefresh, generateMockData])

  // 初期ロード用のuseEffect
  useEffect(() => {
    const initialLoad = () => {
      setLoading(true)
      setTimeout(() => {
        setData(generateMockData())
        setLoading(false)
      }, 500)
    }
    
    initialLoad()
  }, [generateMockData])
  
  // リフレッシュ用のuseEffect - 分離して安定化
  useEffect(() => {
    if (autoRefresh && data) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, fetchData, data])

  // アイコンとカラー関数をuseMemoでメモ化
  const getAlertIcon = useMemo(() => (type: string) => {
    switch (type) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }, [])

  const getAlertColor = useMemo(() => (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800'
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800'
      case 'error': return 'border-red-500 bg-red-50 text-red-800'
      default: return 'border-blue-500 bg-blue-50 text-blue-800'
    }
  }, [])

  const getEventIcon = useMemo(() => (type: string) => {
    switch (type) {
      case 'system': return '⚙️'
      case 'security': return '🔒'
      case 'maintenance': return '🔧'
      case 'error': return '❌'
      default: return '📝'
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">リアルタイム監視ダッシュボード</h1>
              <p className="text-gray-600 mt-2">システム状態とライブメトリクスの監視</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700">自動更新</label>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                disabled={!autoRefresh}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="30000">30秒</option>
                <option value="60000">1分</option>
                <option value="300000">5分</option>
                <option value="600000">10分</option>
              </select>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>ライブ</span>
              </div>
            </div>
          </div>
        </div>

        {/* ライブメトリクス - 安定化 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StableMetricCard
            title="アクティブユーザー"
            value={data.liveMetrics.activeUsers}
            unit="人"
            status="good"
            icon="👥"
          />
          <StableMetricCard
            title="アクティブチケット"
            value={data.liveMetrics.activeTickets}
            unit="件"
            status="good"
            icon="🎟️"
          />
          <StableMetricCard
            title="システム負荷"
            value={data.liveMetrics.systemLoad}
            unit="%"
            status={data.liveMetrics.systemLoad > 80 ? 'critical' : data.liveMetrics.systemLoad > 60 ? 'warning' : 'good'}
            icon="📊"
          />
          <StableMetricCard
            title="アクティブアラート"
            value={data.liveMetrics.alerts.filter(a => a.type === 'critical' || a.type === 'warning').length}
            unit="件"
            status={data.liveMetrics.alerts.filter(a => a.type === 'critical').length > 0 ? 'critical' : 
                   data.liveMetrics.alerts.filter(a => a.type === 'warning').length > 0 ? 'warning' : 'good'}
            icon="🚨"
          />
        </div>

        {/* システム状態監視 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* サーバー状態 */}
          <ChartCard title="サーバー状態" subtitle="各サーバーのリアルタイム監視">
            <div className="space-y-4">
              {data.systemStatus.servers.map((server) => (
                <div key={server.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <StatusIndicator status={server.status} showLabel={false} />
                      <span className="font-medium">{server.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">稼働時間: {server.uptime}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>CPU</span>
                        <span>{server.cpu}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${server.cpu > 80 ? 'bg-red-500' : server.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${server.cpu}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>メモリ</span>
                        <span>{server.memory}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${server.memory > 80 ? 'bg-red-500' : server.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${server.memory}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>ディスク</span>
                        <span>{server.disk}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${server.disk > 80 ? 'bg-red-500' : server.disk > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${server.disk}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* サービス状態 */}
          <ChartCard title="サービス状態" subtitle="各サービスの稼働状況">
            <div className="space-y-4">
              {data.systemStatus.services.map((service) => (
                <div key={service.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <StatusIndicator status={service.status} showLabel={false} />
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">稼働率: {service.uptime}%</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>応答時間: {service.responseTime}ms</span>
                    <span>最終確認: {new Date(service.lastCheck).toLocaleTimeString('ja-JP')}</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* システム負荷履歴 */}
          <ChartCard title="システム負荷履歴" subtitle="過去20回の負荷推移" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={systemLoadHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value: number) => [`${value}%`, 'システム負荷']} />
                <Area 
                  type="monotone" 
                  dataKey="load" 
                  stroke="#3b82f6" 
                  fill="#93c5fd"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ライブフィード */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* アラート一覧 */}
          <ChartCard title="アクティブアラート" subtitle="現在のシステムアラート">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.liveMetrics.alerts.map((alert) => (
                <div key={alert.id} className={`p-3 border rounded-lg ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <div className="flex justify-between mt-1 text-xs">
                        <span>{alert.source}</span>
                        <span>{new Date(alert.timestamp).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* 最新チケット */}
          <ChartCard title="最新チケット" subtitle="最近作成されたチケット">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.liveFeed.recentTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{ticket.id}</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      ticket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {ticket.priority === 'critical' ? '緊急' :
                       ticket.priority === 'high' ? '高' :
                       ticket.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{ticket.title}</p>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>担当: {ticket.assignee}</span>
                    <span>{new Date(ticket.created).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* システムイベント */}
          <ChartCard title="システムイベント" subtitle="最新のシステムイベント">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.liveFeed.systemEvents.map((event) => (
                <div key={event.id} className="border-l-4 border-blue-400 pl-3 py-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getEventIcon(event.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm">{event.message}</p>
                      <div className="flex justify-between mt-1 text-xs text-gray-600">
                        <span className={`font-medium ${
                          event.severity === 'critical' ? 'text-red-600' :
                          event.severity === 'high' ? 'text-orange-600' :
                          event.severity === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {event.severity === 'critical' ? '重大' :
                           event.severity === 'high' ? '高' :
                           event.severity === 'medium' ? '中' : '低'}
                        </span>
                        <span>{new Date(event.timestamp).toLocaleString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* ユーザーアクティビティ */}
          <ChartCard title="ユーザーアクティビティ" subtitle="最新のユーザー操作">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.liveFeed.userActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {activity.user.split(' ')[0][0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-gray-600">{activity.action}: {activity.target}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleTimeString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ネットワーク・データベース状態 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="ネットワーク状態" subtitle="ネットワーク接続とパフォーマンス">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">全体状態</span>
                <StatusIndicator status={data.systemStatus.network.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">レイテンシ</div>
                  <div className="text-lg font-semibold">{data.systemStatus.network.latency}ms</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">パケットロス</div>
                  <div className="text-lg font-semibold">{data.systemStatus.network.packetLoss}%</div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">帯域幅使用量</div>
                <div className="text-lg font-semibold">{data.systemStatus.network.bandwidth} Mbps</div>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="データベース状態" subtitle="データベース接続とパフォーマンス">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">接続状態</span>
                <StatusIndicator status={data.systemStatus.database.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">アクティブ接続</div>
                  <div className="text-lg font-semibold">{data.systemStatus.database.connections}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-gray-600">クエリ時間</div>
                  <div className="text-lg font-semibold">{data.systemStatus.database.queryTime}ms</div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-gray-600">データベースサイズ</div>
                <div className="text-lg font-semibold">{data.systemStatus.database.size}</div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
})

export default RealTimeMonitoring
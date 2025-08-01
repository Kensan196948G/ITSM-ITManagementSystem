import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PerformanceData, TimeSeriesData, AgentStats, BottleneckAnalysis } from '../../types/dashboard'
import MetricCard from '../../components/dashboard/MetricCard'
import ChartCard from '../../components/dashboard/ChartCard'
// import { GradientAreaChart, AnimatedGaugeChart, HeatmapChart, TreemapChart } from '../../components/charts'
import { gradients, animations, chartColors } from '../../theme/theme'

// 新しいコンポーネントのインターフェース定義
interface EnhancedMetricCardProps {
  title: string
  value: number | string
  unit?: string
  change: number
  changeLabel: string
  target?: number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'error'
  animated?: boolean
}

interface SemicircleGaugeProps {
  value: number
  max: number
  thresholds: { good: number; warning: number }
  size: number
  animated?: boolean
  title: string
  unit: string
}

interface ImprovementCardProps {
  title: string
  impact: number
  priority: 'high' | 'medium' | 'low'
  suggestions: string[]
  actionable: boolean
}

// 強化されたメトリクスカードコンポーネント
const EnhancedMetricCard: React.FC<EnhancedMetricCardProps> = React.memo(({
  title,
  value,
  unit = '',
  change,
  changeLabel,
  target,
  icon,
  color,
  animated = true
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (animated && typeof value === 'number') {
      const duration = 1500
      const steps = 30
      const increment = value / steps
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setAnimatedValue(value)
          clearInterval(timer)
        } else {
          setAnimatedValue(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    } else {
      setAnimatedValue(typeof value === 'number' ? value : 0)
    }
  }, [value, animated])

  const getColorClasses = useCallback((color: string) => {
    switch (color) {
      case 'primary':
        return {
          bg: 'from-blue-500 to-blue-600',
          text: 'text-white',
          shadow: 'shadow-blue-500/25'
        }
      case 'success':
        return {
          bg: 'from-green-500 to-green-600',
          text: 'text-white',
          shadow: 'shadow-green-500/25'
        }
      case 'warning':
        return {
          bg: 'from-yellow-500 to-yellow-600',
          text: 'text-white',
          shadow: 'shadow-yellow-500/25'
        }
      case 'error':
        return {
          bg: 'from-red-500 to-red-600',
          text: 'text-white',
          shadow: 'shadow-red-500/25'
        }
      default:
        return {
          bg: 'from-gray-500 to-gray-600',
          text: 'text-white',
          shadow: 'shadow-gray-500/25'
        }
    }
  }, [])

  const colors = getColorClasses(color)
  const progressPercentage = target ? Math.min((typeof value === 'number' ? value : 0) / target * 100, 100) : 0

  return (
    <div className={`metric-card relative p-6 rounded-2xl bg-gradient-to-br ${colors.bg} ${colors.text} shadow-lg ${colors.shadow} transition-all duration-300 hover:scale-105`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="text-3xl opacity-80">{icon}</div>
        </div>

        <div className="mb-3">
          <div className="text-4xl font-black mb-1">
            {animated && mounted ? 
              (typeof value === 'number' ? 
                animatedValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) : 
                value
              ) : 
              (typeof value === 'number' ? value.toLocaleString() : value)
            }
            <span className="text-xl font-medium ml-2">{unit}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-3 text-sm">
          <span className="text-lg">{change > 0 ? '↗️' : change < 0 ? '↘️' : '→'}</span>
          <span className="font-bold">{Math.abs(change)}%</span>
          <span className="opacity-80">({changeLabel})</span>
        </div>

        {target && (
          <div className="mt-3">
            <div className="flex justify-between text-sm opacity-80 mb-1">
              <span>目標達成度</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
              <div 
                className="bg-white bg-opacity-80 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

// 半円形ゲージチャートコンポーネント
const SemicircleGauge: React.FC<SemicircleGaugeProps> = React.memo(({
  value,
  max,
  thresholds,
  size,
  animated = true,
  title,
  unit
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (animated) {
      const duration = 1500
      const steps = 30
      const increment = value / steps
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setAnimatedValue(value)
          clearInterval(timer)
        } else {
          setAnimatedValue(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    } else {
      setAnimatedValue(value)
    }
  }, [value, animated])

  const radius = size / 2 - 20
  const circumference = Math.PI * radius
  const percentage = (animatedValue / max) * 100
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = useCallback((value: number) => {
    if (value <= thresholds.good) return '#10B981'
    if (value <= thresholds.warning) return '#F59E0B'
    return '#EF4444'
  }, [thresholds])

  const currentColor = getColor(animatedValue)

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg width={size} height={size / 2 + 40}>
          <path
            d={`M 20 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          <path
            d={`M 20 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2}`}
            fill="none"
            stroke={currentColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: size / 4 }}>
          <div className="text-3xl font-black text-gray-800 mb-1">
            {mounted ? animatedValue.toFixed(1) : value.toFixed(1)}{unit}
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
    </div>
  )
})

// 改善提案カードコンポーネント
const ImprovementCard: React.FC<ImprovementCardProps> = React.memo(({
  title,
  impact,
  priority,
  suggestions,
  actionable
}) => {
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'from-red-50 to-red-100',
          border: 'border-red-200',
          badge: 'bg-red-500 text-white',
          text: 'text-red-800'
        }
      case 'medium':
        return {
          bg: 'from-yellow-50 to-yellow-100',
          border: 'border-yellow-200',
          badge: 'bg-yellow-500 text-white',
          text: 'text-yellow-800'
        }
      case 'low':
        return {
          bg: 'from-green-50 to-green-100',
          border: 'border-green-200',
          badge: 'bg-green-500 text-white',
          text: 'text-green-800'
        }
      default:
        return {
          bg: 'from-gray-50 to-gray-100',
          border: 'border-gray-200',
          badge: 'bg-gray-500 text-white',
          text: 'text-gray-800'
        }
    }
  }, [])

  const colors = getPriorityColor(priority)
  const priorityLabel = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'

  return (
    <div className={`relative p-6 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="absolute top-4 right-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
          優先度: {priorityLabel}
        </span>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-shrink-0">
          <div className={`w-16 h-16 rounded-full bg-white bg-opacity-80 flex items-center justify-center ${colors.text}`}>
            <span className="text-2xl font-bold">{impact}%</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${colors.text} mb-1`}>{title}</h3>
          <p className="text-sm text-gray-600">影響度レベル</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>インパクト</span>
          <span>{impact}%</span>
        </div>
        <div className="w-full bg-white bg-opacity-60 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-1000 ease-out ${
              priority === 'high' ? 'bg-gradient-to-r from-red-400 to-red-600' :
              priority === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
              'bg-gradient-to-r from-green-400 to-green-600'
            }`}
            style={{ width: `${impact}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h4 className={`font-semibold ${colors.text} mb-3 flex items-center`}>
          <span className="mr-2">🚀</span>
          改善提案
        </h4>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                {index + 1}
              </span>
              <span className="text-sm text-gray-700">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {actionable && (
        <button className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 hover:transform hover:scale-105 ${
          priority === 'high' ? 'bg-red-500 hover:bg-red-600' :
          priority === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' :
          'bg-green-500 hover:bg-green-600'
        }`}>
          改善施策を実行
        </button>
      )}
    </div>
  )
})

const PerformanceAnalytics: React.FC = React.memo(() => {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1d' | '7d' | '30d' | '90d'>('7d')

  // ダミーデータ生成をuseCallbackでメモ化
  const generateMockData = useCallback((): PerformanceData => {
    const resolutionTrend: TimeSeriesData[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 2.5 + Math.random() * 3 + Math.sin(i / 5) * 0.5,
      label: `Day ${i + 1}`
    }))

    const agentPerformance: AgentStats[] = [
      { id: '1', name: '田中 太郎', resolvedTickets: 45, avgResolutionTime: 2.3, efficiency: 92, rating: 4.8 },
      { id: '2', name: '佐藤 花子', resolvedTickets: 38, avgResolutionTime: 2.8, efficiency: 88, rating: 4.6 },
      { id: '3', name: '鈴木 次郎', resolvedTickets: 52, avgResolutionTime: 2.1, efficiency: 95, rating: 4.9 },
      { id: '4', name: '高橋 美咲', resolvedTickets: 41, avgResolutionTime: 2.6, efficiency: 90, rating: 4.7 },
      { id: '5', name: '渡辺 健一', resolvedTickets: 35, avgResolutionTime: 3.2, efficiency: 85, rating: 4.4 }
    ]

    const bottlenecks: BottleneckAnalysis[] = [
      {
        area: 'チケット承認プロセス',
        severity: 'high',
        impact: 35,
        suggestions: ['承認フローの簡素化', '権限委譲の拡大', '自動承認ルールの導入']
      },
      {
        area: 'データベースクエリ',
        severity: 'medium',
        impact: 22,
        suggestions: ['インデックスの最適化', 'クエリの改善', 'キャッシュ戦略の見直し']
      },
      {
        area: 'API レスポンス',
        severity: 'low',
        impact: 15,
        suggestions: ['CDNの活用', 'レスポンス圧縮', 'キャッシュヘッダーの最適化']
      }
    ]

    return {
      ticketMetrics: {
        avgResolutionTime: 2.6,
        resolutionTrend,
        agentPerformance,
        bottlenecks
      },
      systemMetrics: {
        apiResponseTime: 245,
        dbQueryTime: 180,
        serverLoad: 68,
        pageLoadSpeed: 1.8
      },
      businessMetrics: {
        customerSatisfaction: 4.3,
        efficiencyImprovement: 12.5,
        costEfficiency: 89.2,
        roi: 156.7
      }
    }
  }, [])

  useEffect(() => {
    const fetchData = () => {
      setLoading(true)
      setTimeout(() => {
        setData(generateMockData())
        setLoading(false)
      }, 500)
    }

    fetchData()
  }, [selectedTimeframe, generateMockData])

  // ヒートマップデータをuseMemoで計算
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00')
    const days = ['月', '火', '水', '木', '金', '土', '日']
    const heatmapDataArray: Array<{ x: string; y: string; value: number; label: string }> = []
    
    days.forEach(day => {
      hours.forEach(hour => {
        const baseValue = Math.random() * 100
        const dayMultiplier = ['土', '日'].includes(day) ? 0.3 : 1
        const hourMultiplier = parseInt(hour) < 9 || parseInt(hour) > 18 ? 0.5 : 1.2
        const value = Math.round(baseValue * dayMultiplier * hourMultiplier)
        
        heatmapDataArray.push({
          x: hour,
          y: day,
          value: value,
          label: `${day}曜日 ${hour} - パフォーマンス: ${value}%`
        })
      })
    })
    
    return heatmapDataArray
  }, [])

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
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
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* ヘッダー - 安定したレイアウト */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl text-white">📊</span>
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  パフォーマンス分析ダッシュボード
                </h1>
                <p className="text-gray-600 mt-2 text-lg">システムとビジネスのパフォーマンス指標をリアルタイム監視・分析</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                  className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-6 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 transition-colors duration-200"
                >
                  <option value="1d">📅 24時間</option>
                  <option value="7d">📅 7日間</option>
                  <option value="30d">📅 30日間</option>
                  <option value="90d">📅 90日間</option>
                </select>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <span>更新</span>
              </button>
            </div>
          </div>
          
          {/* ステータスインジケーター */}
          <div className="mt-6 flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">システム正常</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">リアルタイム更新中</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">最終更新: {new Date().toLocaleTimeString('ja-JP')}</span>
            </div>
          </div>
        </div>

        {/* KPI メトリクス - 安定したグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <EnhancedMetricCard
            title="チケット平均解決時間"
            value={data.ticketMetrics.avgResolutionTime}
            unit="時間"
            change={-8.2}
            changeLabel="前週比"
            target={4.0}
            icon={<span>⏱️</span>}
            color="success"
            animated={true}
          />
          <EnhancedMetricCard
            title="API応答時間"
            value={data.systemMetrics.apiResponseTime}
            unit="ms"
            change={5.1}
            changeLabel="前週比"
            target={200}
            icon={<span>🚀</span>}
            color="warning"
            animated={true}
          />
          <EnhancedMetricCard
            title="顧客満足度"
            value={data.businessMetrics.customerSatisfaction}
            unit="/5.0"
            change={3.2}
            changeLabel="前月比"
            target={5.0}
            icon={<span>⭐</span>}
            color="primary"
            animated={true}
          />
          <EnhancedMetricCard
            title="ROI"
            value={data.businessMetrics.roi}
            unit="%"
            change={12.4}
            changeLabel="前四半期比"
            target={200}
            icon={<span>📈</span>}
            color="success"
            animated={true}
          />
        </div>

        {/* チャートセクション - 安定したレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 解決時間トレンド */}
          <ChartCard title="🎯 チケット解決時間トレンド" subtitle="過去30日間の平均解決時間">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.ticketMetrics.resolutionTrend.map(item => ({
                ...item,
                date: new Date(item.timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#667eea" fill="#667eea" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* サーバー負荷の半円形ゲージ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <span className="mr-3">⚡</span>
                システムパフォーマンス
              </h3>
              <p className="text-gray-600">リアルタイム負荷監視</p>
            </div>
            
            <div className="flex flex-col items-center space-y-6">
              <div className="text-center">
                <div className="text-6xl font-black text-gray-800 mb-4">
                  {data.systemMetrics.serverLoad}%
                </div>
                <div className="text-xl font-semibold text-gray-600">サーバー負荷</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl font-black text-blue-600 mb-2">{data.systemMetrics.dbQueryTime}<span className="text-sm">ms</span></div>
                    <div className="text-sm font-semibold text-blue-700">データベースクエリ時間</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-600 mb-2">{data.systemMetrics.pageLoadSpeed}<span className="text-sm">s</span></div>
                    <div className="text-sm font-semibold text-green-700">ページ読み込み時間</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 担当者パフォーマンス */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <span className="mr-3">👥</span>
                担当者パフォーマンス
              </h3>
              <p className="text-gray-600">解決チケット数の比較</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {data.ticketMetrics.agentPerformance.map((agent, index) => {
                const maxTickets = Math.max(...data.ticketMetrics.agentPerformance.map(a => a.resolvedTickets))
                const heightPercentage = (agent.resolvedTickets / maxTickets) * 100
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500']
                const colorClass = colors[index % colors.length]
                
                return (
                  <div key={agent.id} className="flex flex-col justify-end h-32">
                    <div 
                      className={`${colorClass} rounded-t-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer relative group flex flex-col justify-end p-3 text-white`}
                      style={{ height: `${Math.max(heightPercentage, 20)}%` }}
                    >
                      <div className="text-center">
                        <div className="text-xl font-black mb-1">{agent.resolvedTickets}</div>
                        <div className="text-xs font-medium opacity-90">{agent.name.split(' ')[0]}</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-100 p-2 rounded-b-lg text-center">
                      <div className="text-xs text-gray-600 font-medium">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.efficiency}% 効率</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ボトルネック分析 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <span className="mr-3">🎯</span>
                ボトルネック分析
              </h3>
              <p className="text-gray-600">パフォーマンス改善領域</p>
            </div>
            
            <div className="space-y-4">
              {data.ticketMetrics.bottlenecks.map((bottleneck, index) => (
                <ImprovementCard
                  key={index}
                  title={bottleneck.area}
                  impact={bottleneck.impact}
                  priority={bottleneck.severity === 'high' ? 'high' : bottleneck.severity === 'medium' ? 'medium' : 'low'}
                  suggestions={bottleneck.suggestions}
                  actionable={true}
                />
              ))}
            </div>
          </div>

          {/* 時間帯別パフォーマンス - ヒートマップ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <span className="mr-3">🕒</span>
                時間帯別パフォーマンス
              </h3>
              <p className="text-gray-600">24時間×7日間のパフォーマンスヒートマップ</p>
            </div>
            
            <div className="overflow-x-auto min-w-[800px]">
              {/* Legend */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">パフォーマンス強度</div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-blue-100 rounded"></div>
                    <span>低</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-blue-400 rounded"></div>
                    <span>中</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-blue-700 rounded"></div>
                    <span>高</span>
                  </div>
                </div>
              </div>
              
              {/* Heatmap grid */}
              <div className="grid grid-cols-25 gap-1 overflow-x-auto min-w-[800px]" style={{ gridTemplateColumns: '60px repeat(24, 32px)' }}>
                {/* Hour labels */}
                <div></div>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="text-xs text-gray-500 text-center py-1">
                    {i.toString().padStart(2, '0')}
                  </div>
                ))}
                
                {/* Data rows */}
                {['月', '火', '水', '木', '金', '土', '日'].map((day, dayIndex) => (
                  <React.Fragment key={day}>
                    <div className="text-xs text-gray-600 py-2 flex items-center justify-center font-medium">
                      {day}
                    </div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const dataPoint = heatmapData.find(d => d.y === day && d.x === hour.toString().padStart(2, '0') + ':00')
                      const value = dataPoint ? dataPoint.value : 0
                      const intensity = value / 100
                      
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="w-8 h-8 rounded cursor-pointer hover:scale-105 transition-transform duration-200 flex items-center justify-center group relative"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${Math.max(intensity, 0.1)})`,
                            transition: 'all 0.2s ease'
                          }}
                          title={`${day}曜日 ${hour.toString().padStart(2, '0')}:00 - ${value}%`}
                        >
                          {value > 80 && (
                            <div className="text-white text-xs font-bold">
                              {value}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Summary statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.max(...heatmapData.map(d => d.value))}
                  </div>
                  <div className="text-sm text-blue-700">最高パフォーマンス</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(heatmapData.reduce((sum, d) => sum + d.value, 0) / heatmapData.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-blue-700">平均パフォーマンス</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {heatmapData.filter(d => d.value > 70).length}
                  </div>
                  <div className="text-sm text-blue-700">高パフォーマンス時間帯</div>
                </div>
              </div>
            </div>
          </div>

          {/* ビジネスメトリクス */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 lg:col-span-2">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <span className="mr-3">💼</span>
                ビジネスメトリクス
              </h3>
              <p className="text-gray-600">業務効率とコスト分析</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 業務効率改善率 */}
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <div className="text-center">
                  <div className="text-5xl font-black mb-3">
                    {data.businessMetrics.efficiencyImprovement}<span className="text-2xl">%</span>
                  </div>
                  <div className="text-xl font-semibold mb-2">業務効率改善率</div>
                  <div className="text-sm opacity-90">前四半期比較</div>
                </div>
                <div className="absolute top-4 right-4 text-3xl opacity-70">📈</div>
              </div>

              {/* コスト効率 */}
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-lg">
                <div className="text-center">
                  <div className="text-5xl font-black mb-3">
                    {data.businessMetrics.costEfficiency}<span className="text-2xl">%</span>
                  </div>
                  <div className="text-xl font-semibold mb-2">コスト効率</div>
                  <div className="text-sm opacity-90">最適化レベル</div>
                </div>
                <div className="absolute top-4 right-4 text-3xl opacity-70">💰</div>
              </div>

              {/* 投資収益率 */}
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                <div className="text-center">
                  <div className="text-5xl font-black mb-3">
                    {data.businessMetrics.roi}<span className="text-2xl">%</span>
                  </div>
                  <div className="text-xl font-semibold mb-2">投資収益率</div>
                  <div className="text-sm opacity-90">ROI指標</div>
                </div>
                <div className="absolute top-4 right-4 text-3xl opacity-70">🎯</div>
              </div>
            </div>
            
            {/* Summary cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800">月次成長率</h4>
                    <p className="text-3xl font-bold text-blue-600">+{(data.businessMetrics.efficiencyImprovement / 3).toFixed(1)}%</p>
                    <p className="text-sm text-blue-600">継続的改善トレンド</p>
                  </div>
                  <div className="text-4xl text-blue-500">📊</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-green-800">コスト削減額</h4>
                    <p className="text-3xl font-bold text-green-600">¥{(data.businessMetrics.costEfficiency * 1000).toLocaleString()}</p>
                    <p className="text-sm text-green-600">月間節約効果</p>
                  </div>
                  <div className="text-4xl text-green-500">💴</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default PerformanceAnalytics
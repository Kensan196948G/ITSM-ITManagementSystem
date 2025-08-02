import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ProtectedRoute from './components/auth/ProtectedRoute'
import NotificationSystem from './components/common/NotificationSystem'
import { AccessibilityProvider } from './components/common/AccessibilityHelper'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import {
  LazyTicketList,
  LazyTicketDetail,
  LazyCreateTicket,
  LazyUserList,
  LazyUserDetail,
  LazyCreateUser,
  TicketListSkeleton,
  DashboardSkeleton,
} from './components/common/LazyComponents'

// ITSM管理ページの動的インポート
const LazyIncidentList = lazy(() => import('./pages/incidents/IncidentList'))
const LazyProblemList = lazy(() => import('./pages/problems/ProblemList'))

// ダッシュボードページの動的インポート
const LazyPerformanceAnalytics = lazy(() => import('./pages/dashboards/PerformanceAnalytics'))
const LazySLAMonitoring = lazy(() => import('./pages/dashboards/SLAMonitoring'))
const LazyRealTimeMonitoring = lazy(() => import('./pages/dashboards/RealTimeMonitoring'))

// システム設定ページの動的インポート
const LazySystemSettings = lazy(() => import('./pages/settings/SystemSettings'))

// ブラウザエラー監視ページの動的インポート
const LazyBrowserErrorMonitor = lazy(() => import('./pages/BrowserErrorMonitorPage'))

// Protected Routes Component
const ProtectedApp: React.FC = () => {
  return (
    <Layout>
      <Routes>
        {/* デフォルトリダイレクト */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* ダッシュボード */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* インシデント管理 */}
        <Route 
          path="/incidents" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyIncidentList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/incidents/active" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyIncidentList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/incidents/pending" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyIncidentList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/incidents/resolved" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyIncidentList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/incidents/create" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>新規インシデント作成ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/incidents/:id" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>インシデント詳細ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* 問題管理 */}
        <Route 
          path="/problems" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyProblemList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/problems/open" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyProblemList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/problems/investigation" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyProblemList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/problems/closed" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyProblemList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/problems/rca" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>根本原因分析ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* 変更管理 */}
        <Route 
          path="/changes" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>変更管理一覧ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/changes/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>変更管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* リリース・展開管理 */}
        <Route 
          path="/releases" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>リリース管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/releases/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>リリース管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* 構成管理（CMDB） */}
        <Route 
          path="/cmdb/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>構成管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* サービスカタログ */}
        <Route 
          path="/services" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>サービスカタログページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/services/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>サービス管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* 容量・可用性管理 */}
        <Route 
          path="/capacity" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>容量管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/availability" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>可用性管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/performance" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <div>パフォーマンス分析ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* チケット管理（既存） */}
        <Route 
          path="/tickets" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyTicketList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tickets/create" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyCreateTicket />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tickets/:id" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyTicketDetail />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* ユーザー管理 - 管理者とマネージャーのみ */}
        <Route 
          path="/users" 
          element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <Suspense fallback={<TicketListSkeleton />}>
                <LazyUserList />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users/create" 
          element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyCreateUser />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users/:id" 
          element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyUserDetail />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* レポート・分析 */}
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>レポート・分析ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>詳細レポートページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* ナレッジ管理 */}
        <Route 
          path="/knowledge" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>ナレッジベースページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/knowledge/*" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <div>ナレッジ管理ページ（開発中）</div>
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* ブラウザエラー監視システム */}
        <Route 
          path="/browser-error-monitor" 
          element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyBrowserErrorMonitor />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/browser-error-monitor" 
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyBrowserErrorMonitor />
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* システム設定 */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazySystemSettings />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/:category" 
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazySystemSettings />
              </Suspense>
            </ProtectedRoute>
          } 
        />

        {/* ダッシュボード関連 */}
        <Route 
          path="/dashboard/performance" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyPerformanceAnalytics />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/sla" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazySLAMonitoring />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/realtime" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<DashboardSkeleton />}>
                <LazyRealTimeMonitoring />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* 404エラーページ */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {/* 通知システム */}
      <NotificationSystem />
    </Layout>
  )
}

// Login Route Component
const LoginRoute: React.FC = () => {
  const { authState, login, clearError } = useAuth()
  
  return (
    <Login 
      onLogin={login}
      loading={authState.loading}
      error={authState.error}
      clearError={clearError}
    />
  )
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AccessibilityProvider>
          <Routes>
            {/* Login Route */}
            <Route path="/login" element={<LoginRoute />} />
            
            {/* Protected Application Routes */}
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </AccessibilityProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
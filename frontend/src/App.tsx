import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './theme/theme'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import TicketList from './pages/tickets/TicketList'
import TicketDetail from './pages/tickets/TicketDetail'
import CreateTicket from './pages/tickets/CreateTicket'
import UserList from './pages/users/UserList'
import UserDetail from './pages/users/UserDetail'
import CreateUser from './pages/users/CreateUser'
import NotificationSystem from './components/common/NotificationSystem'

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            {/* デフォルトリダイレクト */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* ダッシュボード */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* チケット管理 */}
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/create" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            
            {/* ユーザー管理 */}
            <Route path="/users" element={<UserList />} />
            <Route path="/users/create" element={<CreateUser />} />
            <Route path="/users/:id" element={<UserDetail />} />
            
            {/* その他のページ */}
            <Route path="/reports" element={<div>レポート機能は開発中です</div>} />
            <Route path="/knowledge" element={<div>ナレッジベース機能は開発中です</div>} />
            <Route path="/settings" element={<div>設定機能は開発中です</div>} />
            
            {/* 404エラーページ */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          {/* 通知システム */}
          <NotificationSystem />
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
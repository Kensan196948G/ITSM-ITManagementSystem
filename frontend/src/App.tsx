import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import TicketList from './pages/tickets/TicketList'
import TicketDetail from './pages/tickets/TicketDetail'
import CreateTicket from './pages/tickets/CreateTicket'
import UserList from './pages/users/UserList'
import UserDetail from './pages/users/UserDetail'
import CreateUser from './pages/users/CreateUser'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Layout>
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Tickets */}
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/create" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            
            {/* Users */}
            <Route path="/users" element={<UserList />} />
            <Route path="/users/create" element={<CreateUser />} />
            <Route path="/users/:id" element={<UserDetail />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </Box>
    </ErrorBoundary>
  )
}

export default App
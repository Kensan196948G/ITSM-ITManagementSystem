// Dashboard Data Types
export interface TimeSeriesData {
  timestamp: string
  value: number
  label?: string
}

export interface AgentStats {
  id: string
  name: string
  resolvedTickets: number
  avgResolutionTime: number
  efficiency: number
  rating: number
}

export interface BottleneckAnalysis {
  area: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: number
  suggestions: string[]
}

export interface CategorySLAStats {
  category: string
  complianceRate: number
  avgResponseTime: number
  violationCount: number
  trend: 'up' | 'down' | 'stable'
}

export interface EscalationEvent {
  id: string
  ticketId: string
  timestamp: string
  from: string
  to: string
  reason: string
  status: 'pending' | 'completed' | 'cancelled'
}

export interface ServerStatus {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning'
  cpu: number
  memory: number
  disk: number
  uptime: string
}

export interface ServiceStatus {
  id: string
  name: string
  status: 'operational' | 'degraded' | 'outage'
  responseTime: number
  uptime: number
  lastCheck: string
}

export interface NetworkStatus {
  status: 'healthy' | 'degraded' | 'critical'
  latency: number
  packetLoss: number
  bandwidth: number
}

export interface DatabaseStatus {
  status: 'connected' | 'disconnected' | 'slow'
  connections: number
  queryTime: number
  size: string
}

export interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
  source: string
}

export interface Ticket {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignee: string
  created: string
  slaDeadline?: string
  category: string
}

export interface StatusChange {
  id: string
  ticketId: string
  from: string
  to: string
  timestamp: string
  user: string
}

export interface SystemEvent {
  id: string
  type: 'system' | 'security' | 'maintenance' | 'error'
  message: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface UserActivity {
  id: string
  user: string
  action: string
  target: string
  timestamp: string
}

// Main Dashboard Data Interfaces
export interface PerformanceData {
  ticketMetrics: {
    avgResolutionTime: number
    resolutionTrend: TimeSeriesData[]
    agentPerformance: AgentStats[]
    bottlenecks: BottleneckAnalysis[]
  }
  systemMetrics: {
    apiResponseTime: number
    dbQueryTime: number
    serverLoad: number
    pageLoadSpeed: number
  }
  businessMetrics: {
    customerSatisfaction: number
    efficiencyImprovement: number
    costEfficiency: number
    roi: number
  }
}

export interface SLAData {
  complianceRate: number
  violationCount: number
  riskTickets: Ticket[]
  categoryAnalysis: CategorySLAStats[]
  escalationHistory: EscalationEvent[]
  priorityBreakdown: {
    critical: { total: number; onTime: number; violated: number }
    high: { total: number; onTime: number; violated: number }
    medium: { total: number; onTime: number; violated: number }
    low: { total: number; onTime: number; violated: number }
  }
}

export interface RealTimeData {
  systemStatus: {
    servers: ServerStatus[]
    services: ServiceStatus[]
    network: NetworkStatus
    database: DatabaseStatus
  }
  liveMetrics: {
    activeUsers: number
    activeTickets: number
    systemLoad: number
    alerts: Alert[]
  }
  liveFeed: {
    recentTickets: Ticket[]
    statusChanges: StatusChange[]
    systemEvents: SystemEvent[]
    userActivity: UserActivity[]
  }
}

export interface MetricCard {
  title: string
  value: number | string
  unit?: string
  trend?: {
    direction: 'up' | 'down' | 'stable'
    percentage: number
    period: string
  }
  status?: 'good' | 'warning' | 'critical'
  icon?: string
}
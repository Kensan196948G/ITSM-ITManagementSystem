// Priority levels
export type Priority = 'low' | 'medium' | 'high' | 'critical'

// Ticket statuses
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'on_hold'

// User roles
export type UserRole = 'admin' | 'operator' | 'viewer' | 'manager'

// Base interface for all entities
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// Ticket interface
export interface Ticket extends BaseEntity {
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  category: string
  assigneeId?: string
  assigneeName?: string
  reporterId: string
  reporterName: string
  resolution?: string
  attachments?: Attachment[]
  comments?: Comment[]
  slaDeadline?: string
  estimatedResolutionTime?: number
  actualResolutionTime?: number
  tags?: string[]
}

// User interface
export interface User extends BaseEntity {
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: UserRole
  department: string
  manager?: string
  isActive: boolean
  lastLogin?: string
  permissions?: string[]
}

// Attachment interface
export interface Attachment extends BaseEntity {
  fileName: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedBy: string
}

// Comment interface
export interface Comment extends BaseEntity {
  content: string
  authorId: string
  authorName: string
  isInternal: boolean
}

// Dashboard metrics
export interface DashboardMetrics {
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  overdueTickets: number
  avgResolutionTime: number
  slaComplianceRate: number
  ticketsByPriority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  ticketsByStatus: {
    open: number
    in_progress: number
    resolved: number
    closed: number
    on_hold: number
  }
  recentTickets: Ticket[]
}

// Chart data interfaces
export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface TimeSeriesData {
  date: string
  tickets: number
  resolved: number
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

// Pagination interface
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    current: number
    total: number
    pages: number
    limit: number
  }
}

// Filter interfaces
export interface TicketFilters {
  status?: TicketStatus[]
  priority?: Priority[]
  category?: string[]
  assigneeId?: string[]
  reporterId?: string[]
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface UserFilters {
  role?: UserRole[]
  department?: string[]
  isActive?: boolean
  search?: string
}

// Form interfaces
export interface CreateTicketForm {
  title: string
  description: string
  priority: Priority
  category: string
  assigneeId?: string
  attachments?: File[]
}

export interface CreateUserForm {
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: UserRole
  department: string
  manager?: string
  permissions?: string[]
}

// Navigation item interface
export interface NavItem {
  path: string
  label: string
  icon: string
  children?: NavItem[]
  roles?: UserRole[]
}

// Theme interface
export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
}
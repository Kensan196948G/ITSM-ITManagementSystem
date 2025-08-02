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
  username: string
  firstName?: string
  lastName?: string
  name?: string // フルネーム（firstName + lastName）
  full_name?: string // バックエンド互換性
  display_name?: string // 表示名
  email: string
  phone?: string
  role: UserRole | string
  roles?: UserRole[] // 複数ロール対応
  department: string
  manager?: string
  isActive?: boolean
  is_active?: boolean // バックエンド互換性
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

// Authentication interfaces
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

export interface AuthContextType {
  authState: AuthState
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
}

// Detail Panel interfaces
export interface DetailPanelItem {
  id: string
  type: 'ticket' | 'user' | 'dashboard' | 'incident' | 'problem'
  title: string
  subtitle?: string
  data: any
  metadata?: Record<string, any>
}

export interface DetailPanelState {
  isOpen: boolean
  item: DetailPanelItem | null
  position: 'right' | 'bottom'
  width: number
  height: number
}

export interface DetailPanelProps {
  isOpen: boolean
  item: DetailPanelItem | null
  onClose: () => void
  position?: 'right' | 'bottom'
  width?: number | string
  maxWidth?: number | string
  minWidth?: number | string
}

export interface DetailPanelContentProps {
  item: DetailPanelItem
  onEdit?: (item: DetailPanelItem) => void
  onDelete?: (id: string) => void
  onRefresh?: (id: string) => void
}

// Extended interfaces for detail display
export interface TicketDetail extends Ticket {
  history?: TicketHistoryEntry[]
  relatedTickets?: Ticket[]
  workLogs?: WorkLog[]
  customFields?: CustomField[]
}

export interface UserDetail extends User {
  assignedTickets?: Ticket[]
  statistics?: UserStatistics
  auditLog?: AuditLogEntry[]
}

export interface TicketHistoryEntry {
  id: string
  timestamp: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  userId: string
  userName: string
  comment?: string
}

export interface WorkLog {
  id: string
  timestamp: string
  description: string
  timeSpent: number
  userId: string
  userName: string
  isInternal: boolean
}

export interface CustomField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'
  value: any
  options?: string[]
  required?: boolean
}

export interface UserStatistics {
  totalTicketsAssigned: number
  totalTicketsResolved: number
  averageResolutionTime: number
  slaComplianceRate: number
  currentWorkload: number
  performanceRating: number
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  entityType: string
  entityId: string
  details: string
  ipAddress?: string
  userAgent?: string
}
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import type { 
  ApiResponse, 
  PaginatedResponse,
  PaginationParams,
  Ticket, 
  TicketFilters,
  CreateTicketForm,
  User,
  UserFilters,
  CreateUserForm,
  DashboardMetrics
} from '../types'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const API_TIMEOUT = 30000 // 30 seconds

// API Client Instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor for authentication
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      // Add request ID for tracking
      config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      return config
    },
    (error) => {
      console.error('Request interceptor error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log successful responses in development
      if (import.meta.env.DEV) {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          data: response.data,
        })
      }
      return response
    },
    (error: AxiosError) => {
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const status = error.response.status
        const message = (error.response.data as any)?.message || error.message

        console.error(`❌ API Error ${status}:`, {
          url: error.config?.url,
          method: error.config?.method,
          status,
          message,
          data: error.response.data,
        })

        // Handle specific error codes
        switch (status) {
          case 401:
            // Unauthorized - redirect to login
            localStorage.removeItem('auth_token')
            if (window.notifications) {
              window.notifications.error('認証期限が切れました。再度ログインしてください。')
            }
            window.location.href = '/login'
            break
          
          case 403:
            // Forbidden
            if (window.notifications) {
              window.notifications.error('この操作を実行する権限がありません。')
            }
            break
          
          case 404:
            // Not found
            if (window.notifications) {
              window.notifications.warning('要求されたリソースが見つかりません。')
            }
            break
          
          case 422:
            // Validation error
            if (window.notifications) {
              window.notifications.error('入力データに問題があります。内容を確認してください。')
            }
            break
          
          case 429:
            // Rate limit exceeded
            if (window.notifications) {
              window.notifications.warning('リクエストが多すぎます。しばらく待ってから再試行してください。')
            }
            break
          
          case 500:
          case 502:
          case 503:
          case 504:
            // Server errors
            if (window.notifications) {
              window.notifications.error('サーバーエラーが発生しました。しばらく待ってから再試行してください。')
            }
            break
        }
      } else if (error.request) {
        // Network error
        console.error('🌐 Network Error:', error.message)
        if (window.notifications) {
          window.notifications.error('ネットワークエラーが発生しました。接続を確認してください。')
        }
      } else {
        // Other errors
        console.error('⚠️ Unknown Error:', error.message)
        if (window.notifications) {
          window.notifications.error('予期しないエラーが発生しました。')
        }
      }

      return Promise.reject(error)
    }
  )

  return client
}

const apiClient = createApiClient()

// Generic API methods
class ApiService {
  protected client: AxiosInstance

  constructor() {
    this.client = apiClient
  }

  protected async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params })
    return response.data.data
  }

  protected async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    return response.data.data
  }

  protected async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data)
    return response.data.data
  }

  protected async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data)
    return response.data.data
  }

  protected async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url)
    return response.data.data
  }

  protected async getPaginated<T>(
    url: string, 
    params?: PaginationParams & any
  ): Promise<PaginatedResponse<T>> {
    const response = await this.client.get<PaginatedResponse<T>>(url, { params })
    return response.data
  }
}

// Dashboard Service
class DashboardService extends ApiService {
  async getMetrics(timeRange?: string): Promise<DashboardMetrics> {
    return this.get<DashboardMetrics>('/dashboard/metrics', { timeRange })
  }

  async getRecentActivity(limit?: number): Promise<any[]> {
    return this.get<any[]>('/dashboard/activity', { limit })
  }

  async getSystemHealth(): Promise<any> {
    return this.get<any>('/dashboard/health')
  }
}

// Ticket Service
class TicketService extends ApiService {
  async getTickets(
    params?: PaginationParams & TicketFilters
  ): Promise<PaginatedResponse<Ticket>> {
    return this.getPaginated<Ticket>('/tickets', params)
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.get<Ticket>(`/tickets/${id}`)
  }

  async createTicket(ticket: CreateTicketForm): Promise<Ticket> {
    return this.post<Ticket>('/tickets', ticket)
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    return this.patch<Ticket>(`/tickets/${id}`, updates)
  }

  async deleteTicket(id: string): Promise<void> {
    return this.delete<void>(`/tickets/${id}`)
  }

  async addComment(
    id: string, 
    comment: { content: string; isInternal?: boolean }
  ): Promise<any> {
    return this.post<any>(`/tickets/${id}/comments`, comment)
  }

  async addAttachment(id: string, file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await this.client.post(`/tickets/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  }

  async getCategories(): Promise<string[]> {
    return this.get<string[]>('/tickets/categories')
  }

  async bulkUpdate(ids: string[], updates: Partial<Ticket>): Promise<void> {
    return this.post<void>('/tickets/bulk-update', { ids, updates })
  }
}

// User Service
class UserService extends ApiService {
  async getUsers(
    params?: PaginationParams & UserFilters
  ): Promise<PaginatedResponse<User>> {
    return this.getPaginated<User>('/users', params)
  }

  async getUser(id: string): Promise<User> {
    return this.get<User>(`/users/${id}`)
  }

  async createUser(user: CreateUserForm): Promise<User> {
    return this.post<User>('/users', user)
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return this.patch<User>(`/users/${id}`, updates)
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}`)
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>('/users/me')
  }

  async updateCurrentUser(updates: Partial<User>): Promise<User> {
    return this.patch<User>('/users/me', updates)
  }

  async getDepartments(): Promise<string[]> {
    return this.get<string[]>('/users/departments')
  }

  async getRoles(): Promise<any[]> {
    return this.get<any[]>('/users/roles')
  }
}

// Authentication Service
class AuthService extends ApiService {
  async login(credentials: { email: string; password: string }): Promise<{
    user: User
    token: string
    refreshToken: string
  }> {
    const response = await this.post<{
      user: User
      token: string
      refreshToken: string
    }>('/auth/login', credentials)
    
    // Store tokens
    localStorage.setItem('auth_token', response.token)
    localStorage.setItem('refresh_token', response.refreshToken)
    
    return response
  }

  async logout(): Promise<void> {
    try {
      await this.post<void>('/auth/logout')
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
    }
  }

  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await this.post<{ token: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken }
    )

    // Update stored tokens
    localStorage.setItem('auth_token', response.token)
    localStorage.setItem('refresh_token', response.refreshToken)

    return response
  }

  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    return this.post<void>('/auth/change-password', data)
  }

  async resetPassword(email: string): Promise<void> {
    return this.post<void>('/auth/reset-password', { email })
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>('/users/me')
  }
}

// Analytics Service
class AnalyticsService extends ApiService {
  async getPerformanceMetrics(timeRange: string): Promise<any> {
    return this.get<any>('/analytics/performance', { timeRange })
  }

  async getTicketTrends(timeRange: string): Promise<any> {
    return this.get<any>('/analytics/trends', { timeRange })
  }

  async getAgentPerformance(timeRange: string): Promise<any> {
    return this.get<any>('/analytics/agents', { timeRange })
  }

  async getCategoryAnalysis(timeRange: string): Promise<any> {
    return this.get<any>('/analytics/categories', { timeRange })
  }

  async getPredictions(type: string): Promise<any> {
    return this.get<any>('/analytics/predictions', { type })
  }
}

// Export service instances
export const dashboardService = new DashboardService()
export const ticketService = new TicketService()
export const userService = new UserService()
export const authService = new AuthService()
export const analyticsService = new AnalyticsService()

// Export the API client for custom requests
export { apiClient }

// Export types
export type { ApiService }
import axios from 'axios';
// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const API_TIMEOUT = 30000; // 30 seconds
// API Client Instance
const createApiClient = () => {
    const client = axios.create({
        baseURL: API_BASE_URL,
        timeout: API_TIMEOUT,
        headers: {
            'Content-Type': 'application/json',
        },
    });
    // Request interceptor for authentication
    client.interceptors.request.use((config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Add request ID for tracking
        config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return config;
    }, (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    });
    // Response interceptor for error handling
    client.interceptors.response.use((response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
            console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                data: response.data,
            });
        }
        return response;
    }, (error) => {
        // Handle different error types
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const message = error.response.data?.message || error.message;
            console.error(`❌ API Error ${status}:`, {
                url: error.config?.url,
                method: error.config?.method,
                status,
                message,
                data: error.response.data,
            });
            // Handle specific error codes
            switch (status) {
                case 401:
                    // Unauthorized - redirect to login
                    localStorage.removeItem('auth_token');
                    if (window.notifications) {
                        window.notifications.error('認証期限が切れました。再度ログインしてください。');
                    }
                    window.location.href = '/login';
                    break;
                case 403:
                    // Forbidden
                    if (window.notifications) {
                        window.notifications.error('この操作を実行する権限がありません。');
                    }
                    break;
                case 404:
                    // Not found
                    if (window.notifications) {
                        window.notifications.warning('要求されたリソースが見つかりません。');
                    }
                    break;
                case 422:
                    // Validation error
                    if (window.notifications) {
                        window.notifications.error('入力データに問題があります。内容を確認してください。');
                    }
                    break;
                case 429:
                    // Rate limit exceeded
                    if (window.notifications) {
                        window.notifications.warning('リクエストが多すぎます。しばらく待ってから再試行してください。');
                    }
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    // Server errors
                    if (window.notifications) {
                        window.notifications.error('サーバーエラーが発生しました。しばらく待ってから再試行してください。');
                    }
                    break;
            }
        }
        else if (error.request) {
            // Network error
            console.error('🌐 Network Error:', error.message);
            if (window.notifications) {
                window.notifications.error('ネットワークエラーが発生しました。接続を確認してください。');
            }
        }
        else {
            // Other errors
            console.error('⚠️ Unknown Error:', error.message);
            if (window.notifications) {
                window.notifications.error('予期しないエラーが発生しました。');
            }
        }
        return Promise.reject(error);
    });
    return client;
};
const apiClient = createApiClient();
// Generic API methods
class ApiService {
    constructor() {
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.client = apiClient;
    }
    async get(url, params) {
        const response = await this.client.get(url, { params });
        return response.data.data;
    }
    async post(url, data) {
        const response = await this.client.post(url, data);
        return response.data.data;
    }
    async put(url, data) {
        const response = await this.client.put(url, data);
        return response.data.data;
    }
    async patch(url, data) {
        const response = await this.client.patch(url, data);
        return response.data.data;
    }
    async delete(url) {
        const response = await this.client.delete(url);
        return response.data.data;
    }
    async getPaginated(url, params) {
        const response = await this.client.get(url, { params });
        return response.data;
    }
}
// Dashboard Service
class DashboardService extends ApiService {
    async getMetrics(timeRange) {
        return this.get('/dashboard/metrics', { timeRange });
    }
    async getRecentActivity(limit) {
        return this.get('/dashboard/activity', { limit });
    }
    async getSystemHealth() {
        return this.get('/dashboard/health');
    }
}
// Ticket Service
class TicketService extends ApiService {
    async getTickets(params) {
        return this.getPaginated('/tickets', params);
    }
    async getTicket(id) {
        return this.get(`/tickets/${id}`);
    }
    async createTicket(ticket) {
        return this.post('/tickets', ticket);
    }
    async updateTicket(id, updates) {
        return this.patch(`/tickets/${id}`, updates);
    }
    async deleteTicket(id) {
        return this.delete(`/tickets/${id}`);
    }
    async addComment(id, comment) {
        return this.post(`/tickets/${id}/comments`, comment);
    }
    async addAttachment(id, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.client.post(`/tickets/${id}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    }
    async getCategories() {
        return this.get('/tickets/categories');
    }
    async bulkUpdate(ids, updates) {
        return this.post('/tickets/bulk-update', { ids, updates });
    }
}
// User Service
class UserService extends ApiService {
    async getUsers(params) {
        return this.getPaginated('/users', params);
    }
    async getUser(id) {
        return this.get(`/users/${id}`);
    }
    async createUser(user) {
        return this.post('/users', user);
    }
    async updateUser(id, updates) {
        return this.patch(`/users/${id}`, updates);
    }
    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    }
    async getCurrentUser() {
        return this.get('/users/me');
    }
    async updateCurrentUser(updates) {
        return this.patch('/users/me', updates);
    }
    async getDepartments() {
        return this.get('/users/departments');
    }
    async getRoles() {
        return this.get('/users/roles');
    }
}
// Authentication Service
class AuthService extends ApiService {
    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        // Store tokens
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('refresh_token', response.refreshToken);
        return response;
    }
    async logout() {
        try {
            await this.post('/auth/logout');
        }
        finally {
            // Always clear local storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
        }
    }
    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        const response = await this.post('/auth/refresh', { refreshToken });
        // Update stored tokens
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('refresh_token', response.refreshToken);
        return response;
    }
    async changePassword(data) {
        return this.post('/auth/change-password', data);
    }
    async resetPassword(email) {
        return this.post('/auth/reset-password', { email });
    }
    async getCurrentUser() {
        return this.get('/users/me');
    }
}
// Analytics Service
class AnalyticsService extends ApiService {
    async getPerformanceMetrics(timeRange) {
        return this.get('/analytics/performance', { timeRange });
    }
    async getTicketTrends(timeRange) {
        return this.get('/analytics/trends', { timeRange });
    }
    async getAgentPerformance(timeRange) {
        return this.get('/analytics/agents', { timeRange });
    }
    async getCategoryAnalysis(timeRange) {
        return this.get('/analytics/categories', { timeRange });
    }
    async getPredictions(type) {
        return this.get('/analytics/predictions', { type });
    }
}
// Export service instances
export const dashboardService = new DashboardService();
export const ticketService = new TicketService();
export const userService = new UserService();
export const authService = new AuthService();
export const analyticsService = new AnalyticsService();
// Export the API client for custom requests
export { apiClient };

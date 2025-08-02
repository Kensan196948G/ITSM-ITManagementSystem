import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
// Initial auth state
const initialAuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true, // Start with loading true to check existing auth
    error: null,
};
// Auth reducer
const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_START':
            return {
                ...state,
                loading: true,
                error: null,
            };
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                loading: false,
                error: null,
            };
        case 'LOGIN_FAILURE':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: action.payload,
            };
        case 'LOGOUT':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: null,
            };
        case 'REFRESH_TOKEN_SUCCESS':
            return {
                ...state,
                token: action.payload.token,
                error: null,
            };
        case 'REFRESH_TOKEN_FAILURE':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: 'セッションの有効期限が切れました。再度ログインしてください。',
            };
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        case 'RESTORE_AUTH':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                loading: false,
                error: null,
            };
        default:
            return state;
    }
};
// Create auth context
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
    const [authState, dispatch] = useReducer(authReducer, initialAuthState);
    // Check for existing authentication on app start
    useEffect(() => {
        const checkExistingAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                    return;
                }
                // Try to get current user with existing token
                const user = await authService.getCurrentUser();
                dispatch({
                    type: 'RESTORE_AUTH',
                    payload: { user, token },
                });
            }
            catch (error) {
                // Token is invalid or expired
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        checkExistingAuth();
    }, []);
    // Login function
    const login = useCallback(async (credentials) => {
        dispatch({ type: 'LOGIN_START' });
        try {
            // テスト用ログイン（admin@company.com / admin123）
            if (credentials.email === 'admin@company.com' && credentials.password === 'admin123') {
                const mockUser = {
                    id: '12345678-1234-1234-1234-123456789012',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    username: 'admin',
                    firstName: 'System',
                    lastName: 'Administrator',
                    name: 'System Administrator',
                    full_name: 'System Administrator',
                    display_name: 'System Administrator',
                    email: 'admin@company.com',
                    phone: '+81-90-1234-5678',
                    role: 'ADMIN',
                    department: 'IT',
                    isActive: true,
                    is_active: true,
                    lastLogin: new Date().toISOString(),
                    permissions: ['read', 'write', 'admin']
                };
                const mockToken = 'mock-jwt-token-for-testing';
                localStorage.setItem('auth_token', mockToken);
                localStorage.setItem('refresh_token', mockToken);
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: {
                        user: mockUser,
                        token: mockToken,
                    },
                });
                return;
            }
            // 実際のAPI呼び出し
            const response = await authService.login({ email: credentials.email, password: credentials.password });
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                    user: response.user,
                    token: response.token,
                },
            });
        }
        catch (error) {
            let errorMessage = 'ログインに失敗しました。';
            if (error.response?.status === 401) {
                errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
            }
            else if (error.response?.status === 429) {
                errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください。';
            }
            else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            else if (error.message) {
                errorMessage = error.message;
            }
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: errorMessage,
            });
            throw error;
        }
    }, []);
    // Logout function
    const logout = useCallback(async () => {
        try {
            await authService.logout();
        }
        catch (error) {
            // Even if logout fails on server, we still clear local state
            console.error('Logout error:', error);
        }
        finally {
            dispatch({ type: 'LOGOUT' });
        }
    }, []);
    // Refresh token function
    const refreshToken = useCallback(async () => {
        try {
            const response = await authService.refreshToken();
            dispatch({
                type: 'REFRESH_TOKEN_SUCCESS',
                payload: { token: response.token },
            });
        }
        catch (error) {
            dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
            throw error;
        }
    }, []);
    // Clear error function
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);
    // Auto-refresh token when it's about to expire
    useEffect(() => {
        if (!authState.token || !authState.isAuthenticated) {
            return;
        }
        const refreshTokenBeforeExpiry = () => {
            try {
                // Decode JWT to get expiry time
                const tokenParts = authState.token.split('.');
                if (tokenParts.length !== 3)
                    return;
                const payload = JSON.parse(atob(tokenParts[1]));
                const exp = payload.exp * 1000; // Convert to milliseconds
                const now = Date.now();
                const timeToExpiry = exp - now;
                // Refresh token 5 minutes before expiry
                const refreshThreshold = 5 * 60 * 1000; // 5 minutes
                if (timeToExpiry > refreshThreshold) {
                    // Set timeout to refresh token
                    const timeout = setTimeout(() => {
                        refreshToken().catch(() => {
                            // If refresh fails, logout user
                            logout();
                        });
                    }, timeToExpiry - refreshThreshold);
                    return () => clearTimeout(timeout);
                }
                else if (timeToExpiry > 0) {
                    // Token is about to expire, refresh immediately
                    refreshToken().catch(() => {
                        logout();
                    });
                }
                else {
                    // Token has already expired
                    logout();
                }
            }
            catch (error) {
                console.error('Error parsing token for auto-refresh:', error);
            }
        };
        refreshTokenBeforeExpiry();
    }, [authState.token, authState.isAuthenticated, refreshToken, logout]);
    const contextValue = {
        authState,
        login,
        logout,
        refreshToken,
        clearError,
    };
    return (_jsx(AuthContext.Provider, { value: contextValue, children: children }));
};
// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export default AuthContext;

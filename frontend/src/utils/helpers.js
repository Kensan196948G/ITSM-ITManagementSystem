import { AxiosError } from 'axios';
// Date utilities
export const formatDate = (date, options) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    return dateObj.toLocaleString('ja-JP', { ...defaultOptions, ...options });
};
export const formatRelativeTime = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    if (diffInSeconds < 60)
        return 'たった今';
    if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 604800)
        return `${Math.floor(diffInSeconds / 86400)}日前`;
    return formatDate(dateObj, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
export const isDateExpired = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.getTime() < new Date().getTime();
};
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
// File utilities
export const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
export const getFileExtension = (filename) => {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};
export const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const extension = getFileExtension(filename).toLowerCase();
    return imageExtensions.includes(extension);
};
export const isDocumentFile = (filename) => {
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    const extension = getFileExtension(filename).toLowerCase();
    return docExtensions.includes(extension);
};
// String utilities
export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength).trim() + '...';
};
export const capitalize = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
export const slugify = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
export const sanitizeHtml = (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
};
// Number utilities
export const formatNumber = (num, options) => {
    return num.toLocaleString('ja-JP', options);
};
export const formatCurrency = (amount, currency = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency,
    }).format(amount);
};
export const formatPercentage = (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
};
export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
// Array utilities
export const groupBy = (array, getKey) => {
    return array.reduce((groups, item) => {
        const key = getKey(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
};
export const sortBy = (array, getKey, direction = 'asc') => {
    return [...array].sort((a, b) => {
        const aVal = getKey(a);
        const bVal = getKey(b);
        if (aVal < bVal)
            return direction === 'asc' ? -1 : 1;
        if (aVal > bVal)
            return direction === 'asc' ? 1 : -1;
        return 0;
    });
};
export const unique = (array) => {
    return [...new Set(array)];
};
export const uniqueBy = (array, getKey) => {
    const seen = new Set();
    return array.filter(item => {
        const key = getKey(item);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
// Object utilities
export const pick = (obj, keys) => {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};
export const omit = (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};
export const isEmpty = (value) => {
    if (value == null)
        return true;
    if (typeof value === 'string')
        return value.trim().length === 0;
    if (Array.isArray(value))
        return value.length === 0;
    if (typeof value === 'object')
        return Object.keys(value).length === 0;
    return false;
};
export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (obj instanceof Array)
        return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
};
// Error handling utilities
export const getErrorMessage = (error) => {
    if (error instanceof AxiosError) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        if (error.response?.data?.detail) {
            return error.response.data.detail;
        }
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return '予期しないエラーが発生しました';
};
export const isNetworkError = (error) => {
    return !error.response && !!error.request;
};
export const isServerError = (error) => {
    return error.response?.status ? error.response.status >= 500 : false;
};
export const isClientError = (error) => {
    return error.response?.status ? error.response.status >= 400 && error.response.status < 500 : false;
};
// Validation utilities
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
export const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[-\s\(\)]/g, ''));
};
// Local storage utilities
export const storage = {
    get: (key, defaultValue) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue || null;
        }
        catch {
            return defaultValue || null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        }
        catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    },
    clear: () => {
        try {
            localStorage.clear();
        }
        catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
};
// URL utilities
export const buildQueryString = (params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
                value.forEach(item => searchParams.append(key, String(item)));
            }
            else {
                searchParams.append(key, String(value));
            }
        }
    });
    return searchParams.toString();
};
export const parseQueryString = (queryString) => {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params.entries()) {
        if (key in result) {
            const existing = result[key];
            if (Array.isArray(existing)) {
                existing.push(value);
            }
            else {
                result[key] = [existing, value];
            }
        }
        else {
            result[key] = value;
        }
    }
    return result;
};
// Performance utilities
export const debounce = (func, wait) => {
    let timeout = null;
    return (...args) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
export const throttle = (func, limit) => {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
// Browser utilities
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        else {
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    }
    catch {
        return false;
    }
};
export const downloadFile = (data, filename, type) => {
    const blob = typeof data === 'string' ? new Blob([data], { type: type || 'text/plain' }) : data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
export const getDeviceInfo = () => ({
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android|Tablet/i.test(navigator.userAgent),
    isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
});
// Constants
export const PRIORITY_COLORS = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    critical: '#9c27b0',
};
export const STATUS_COLORS = {
    open: '#2196f3',
    in_progress: '#ff9800',
    resolved: '#4caf50',
    closed: '#9e9e9e',
    on_hold: '#ff5722',
};
export const CATEGORY_ICONS = {
    Infrastructure: 'dns',
    Network: 'wifi',
    Hardware: 'computer',
    Software: 'apps',
    Security: 'security',
    Email: 'email',
    Database: 'storage',
    License: 'card_membership',
};

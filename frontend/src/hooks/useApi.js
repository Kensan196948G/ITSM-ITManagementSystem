import { useState, useEffect, useCallback, useRef } from 'react';
export function useApi(apiFunction, options = {}) {
    const { immediate = true, initialData = null, onSuccess, onError, retryAttempts = 0, retryDelay = 1000, } = options;
    const [state, setState] = useState({
        data: initialData,
        loading: false,
        error: null,
        isInitialized: false,
    });
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(true);
    const execute = useCallback(async () => {
        if (!isMountedRef.current)
            return;
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const result = await apiFunction();
            if (!isMountedRef.current)
                return;
            setState({
                data: result,
                loading: false,
                error: null,
                isInitialized: true,
            });
            retryCountRef.current = 0;
            onSuccess?.(result);
        }
        catch (error) {
            if (!isMountedRef.current)
                return;
            const axiosError = error;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An error occurred';
            // Retry logic
            if (retryCountRef.current < retryAttempts) {
                retryCountRef.current++;
                setTimeout(() => {
                    if (isMountedRef.current) {
                        execute();
                    }
                }, retryDelay * retryCountRef.current);
                return;
            }
            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
                isInitialized: true,
            }));
            onError?.(axiosError);
        }
    }, [apiFunction, onSuccess, onError, retryAttempts, retryDelay]);
    const refresh = useCallback(() => {
        retryCountRef.current = 0;
        execute();
    }, [execute]);
    const reset = useCallback(() => {
        setState({
            data: initialData,
            loading: false,
            error: null,
            isInitialized: false,
        });
        retryCountRef.current = 0;
    }, [initialData]);
    useEffect(() => {
        if (immediate) {
            execute();
        }
        return () => {
            isMountedRef.current = false;
        };
    }, [immediate, execute]);
    return {
        ...state,
        execute,
        refresh,
        reset,
    };
}
export function useMutation(mutationFunction, options = {}) {
    const { onSuccess, onError, showSuccessNotification = true, showErrorNotification = true, successMessage = '操作が完了しました', } = options;
    const [state, setState] = useState({
        data: null,
        loading: false,
        error: null,
    });
    const isMountedRef = useRef(true);
    const mutate = useCallback(async (params) => {
        if (!isMountedRef.current)
            return;
        setState({ data: null, loading: true, error: null });
        try {
            const result = await mutationFunction(params);
            if (!isMountedRef.current)
                return;
            setState({
                data: result,
                loading: false,
                error: null,
            });
            onSuccess?.(result, params);
            if (showSuccessNotification && window.notifications) {
                window.notifications.success(successMessage);
            }
            return result;
        }
        catch (error) {
            if (!isMountedRef.current)
                return;
            const axiosError = error;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || 'エラーが発生しました';
            setState({
                data: null,
                loading: false,
                error: errorMessage,
            });
            onError?.(axiosError, params);
            if (showErrorNotification && window.notifications) {
                window.notifications.error(errorMessage);
            }
            throw error;
        }
    }, [mutationFunction, onSuccess, onError, showSuccessNotification, showErrorNotification, successMessage]);
    const reset = useCallback(() => {
        setState({
            data: null,
            loading: false,
            error: null,
        });
    }, []);
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    return {
        ...state,
        mutate,
        reset,
    };
}
export function usePaginatedData(fetchFunction, options = {}) {
    const { initialPage = 1, initialLimit = 10, immediate = true, onSuccess, onError, } = options;
    const [state, setState] = useState({
        data: [],
        pagination: {
            current: initialPage,
            total: 0,
            pages: 0,
            limit: initialLimit,
        },
        loading: false,
        error: null,
        isInitialized: false,
    });
    const [params, setParams] = useState({
        page: initialPage,
        limit: initialLimit,
    });
    const isMountedRef = useRef(true);
    const fetchData = useCallback(async (fetchParams) => {
        if (!isMountedRef.current)
            return;
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const result = await fetchFunction(fetchParams);
            if (!isMountedRef.current)
                return;
            setState({
                data: result.data,
                pagination: result.pagination,
                loading: false,
                error: null,
                isInitialized: true,
            });
            onSuccess?.(result.data, result.pagination);
        }
        catch (error) {
            if (!isMountedRef.current)
                return;
            const axiosError = error;
            const errorMessage = axiosError.response?.data?.message || axiosError.message || 'データの取得に失敗しました';
            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
                isInitialized: true,
            }));
            onError?.(axiosError);
        }
    }, [fetchFunction, onSuccess, onError]);
    const setPage = useCallback((page) => {
        const newParams = { ...params, page };
        setParams(newParams);
        fetchData(newParams);
    }, [params, fetchData]);
    const setLimit = useCallback((limit) => {
        const newParams = { ...params, limit, page: 1 };
        setParams(newParams);
        fetchData(newParams);
    }, [params, fetchData]);
    const setFilters = useCallback((filters) => {
        const newParams = { ...params, ...filters, page: 1 };
        setParams(newParams);
        fetchData(newParams);
    }, [params, fetchData]);
    const refresh = useCallback(() => {
        fetchData(params);
    }, [fetchData, params]);
    const reset = useCallback(() => {
        const resetParams = {
            page: initialPage,
            limit: initialLimit,
        };
        setParams(resetParams);
        setState({
            data: [],
            pagination: {
                current: initialPage,
                total: 0,
                pages: 0,
                limit: initialLimit,
            },
            loading: false,
            error: null,
            isInitialized: false,
        });
    }, [initialPage, initialLimit]);
    useEffect(() => {
        if (immediate) {
            fetchData(params);
        }
        return () => {
            isMountedRef.current = false;
        };
    }, [immediate]);
    return {
        ...state,
        setPage,
        setLimit,
        setFilters,
        refresh,
        reset,
        currentParams: params,
    };
}
export function usePolling(apiFunction, options = {}) {
    const { interval = 30000, // 30 seconds default
    enabled = true, ...apiOptions } = options;
    const intervalRef = useRef(null);
    const apiHook = useApi(apiFunction, { ...apiOptions, immediate: false });
    const startPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        apiHook.execute();
        intervalRef.current = setInterval(() => {
            apiHook.refresh();
        }, interval);
    }, [apiHook, interval]);
    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);
    useEffect(() => {
        if (enabled) {
            startPolling();
        }
        else {
            stopPolling();
        }
        return () => {
            stopPolling();
        };
    }, [enabled, startPolling, stopPolling]);
    return {
        ...apiHook,
        startPolling,
        stopPolling,
        isPolling: intervalRef.current !== null,
    };
}
// Export all hooks
export default useApi;

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AxiosError } from 'axios'

interface ApiErrorResponse {
  message?: string
  error?: string
  details?: any
}

// Generic API Hook
export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  isInitialized: boolean
}

export interface UseApiOptions<T> {
  immediate?: boolean
  initialData?: T
  onSuccess?: (data: T) => void
  onError?: (error: AxiosError) => void
  retryAttempts?: number
  retryDelay?: number
}

export function useApi<T>(
  apiFunction: () => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const {
    immediate = true,
    initialData = null,
    onSuccess,
    onError,
    retryAttempts = 0,
    retryDelay = 1000,
  } = options

  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
    isInitialized: false,
  })

  const retryCountRef = useRef(0)
  const isMountedRef = useRef(true)

  const execute = useCallback(async () => {
    if (!isMountedRef.current) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await apiFunction()
      
      if (!isMountedRef.current) return

      setState({
        data: result,
        loading: false,
        error: null,
        isInitialized: true,
      })

      retryCountRef.current = 0
      onSuccess?.(result)
    } catch (error) {
      if (!isMountedRef.current) return

      const axiosError = error as AxiosError<ApiErrorResponse>
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An error occurred'

      // Retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++
        setTimeout(() => {
          if (isMountedRef.current) {
            execute()
          }
        }, retryDelay * retryCountRef.current)
        return
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isInitialized: true,
      }))

      onError?.(axiosError)
    }
  }, [apiFunction, onSuccess, onError, retryAttempts, retryDelay])

  const refresh = useCallback(() => {
    retryCountRef.current = 0
    execute()
  }, [execute])

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      isInitialized: false,
    })
    retryCountRef.current = 0
  }, [initialData])

  useEffect(() => {
    if (immediate) {
      execute()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [immediate, execute])

  return {
    ...state,
    execute,
    refresh,
    reset,
  }
}

// Mutation Hook for POST/PUT/DELETE operations
export interface UseMutationState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseMutationOptions<T, P> {
  onSuccess?: (data: T, params: P) => void
  onError?: (error: AxiosError, params: P) => void
  showSuccessNotification?: boolean
  showErrorNotification?: boolean
  successMessage?: string
}

export function useMutation<T, P = any>(
  mutationFunction: (params: P) => Promise<T>,
  options: UseMutationOptions<T, P> = {}
) {
  const {
    onSuccess,
    onError,
    showSuccessNotification = true,
    showErrorNotification = true,
    successMessage = '操作が完了しました',
  } = options

  const [state, setState] = useState<UseMutationState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const isMountedRef = useRef(true)

  const mutate = useCallback(async (params: P) => {
    if (!isMountedRef.current) return

    setState({ data: null, loading: true, error: null })

    try {
      const result = await mutationFunction(params)
      
      if (!isMountedRef.current) return

      setState({
        data: result,
        loading: false,
        error: null,
      })

      onSuccess?.(result, params)

      if (showSuccessNotification && window.notifications) {
        window.notifications.success(successMessage)
      }

      return result
    } catch (error) {
      if (!isMountedRef.current) return

      const axiosError = error as AxiosError<ApiErrorResponse>
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'エラーが発生しました'

      setState({
        data: null,
        loading: false,
        error: errorMessage,
      })

      onError?.(axiosError, params)

      if (showErrorNotification && window.notifications) {
        window.notifications.error(errorMessage)
      }

      throw error
    }
  }, [mutationFunction, onSuccess, onError, showSuccessNotification, showErrorNotification, successMessage])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    })
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}

// Paginated Data Hook
export interface UsePaginatedDataState<T> {
  data: T[]
  pagination: {
    current: number
    total: number
    pages: number
    limit: number
  }
  loading: boolean
  error: string | null
  isInitialized: boolean
}

export interface UsePaginatedDataOptions<T> {
  initialPage?: number
  initialLimit?: number
  immediate?: boolean
  onSuccess?: (data: T[], pagination: any) => void
  onError?: (error: AxiosError) => void
}

export function usePaginatedData<T>(
  fetchFunction: (params: any) => Promise<{ data: T[]; pagination: any }>,
  options: UsePaginatedDataOptions<T> = {}
) {
  const {
    initialPage = 1,
    initialLimit = 10,
    immediate = true,
    onSuccess,
    onError,
  } = options

  const [state, setState] = useState<UsePaginatedDataState<T>>({
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
  })

  const [params, setParams] = useState({
    page: initialPage,
    limit: initialLimit,
  })

  const isMountedRef = useRef(true)

  const fetchData = useCallback(async (fetchParams: any) => {
    if (!isMountedRef.current) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await fetchFunction(fetchParams)
      
      if (!isMountedRef.current) return

      setState({
        data: result.data,
        pagination: result.pagination,
        loading: false,
        error: null,
        isInitialized: true,
      })

      onSuccess?.(result.data, result.pagination)
    } catch (error) {
      if (!isMountedRef.current) return

      const axiosError = error as AxiosError<ApiErrorResponse>
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'データの取得に失敗しました'

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isInitialized: true,
      }))

      onError?.(axiosError)
    }
  }, [fetchFunction, onSuccess, onError])

  const setPage = useCallback((page: number) => {
    const newParams = { ...params, page }
    setParams(newParams)
    fetchData(newParams)
  }, [params, fetchData])

  const setLimit = useCallback((limit: number) => {
    const newParams = { ...params, limit, page: 1 }
    setParams(newParams)
    fetchData(newParams)
  }, [params, fetchData])

  const setFilters = useCallback((filters: any) => {
    const newParams = { ...params, ...filters, page: 1 }
    setParams(newParams)
    fetchData(newParams)
  }, [params, fetchData])

  const refresh = useCallback(() => {
    fetchData(params)
  }, [fetchData, params])

  const reset = useCallback(() => {
    const resetParams = {
      page: initialPage,
      limit: initialLimit,
    }
    setParams(resetParams)
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
    })
  }, [initialPage, initialLimit])

  useEffect(() => {
    if (immediate) {
      fetchData(params)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [immediate])

  return {
    ...state,
    setPage,
    setLimit,
    setFilters,
    refresh,
    reset,
    currentParams: params,
  }
}

// Real-time Data Hook with polling
export interface UsePollingOptions<T> extends UseApiOptions<T> {
  interval?: number
  enabled?: boolean
}

export function usePolling<T>(
  apiFunction: () => Promise<T>,
  options: UsePollingOptions<T> = {}
) {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    ...apiOptions
  } = options

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const apiHook = useApi(apiFunction, { ...apiOptions, immediate: false })

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    apiHook.execute()

    intervalRef.current = setInterval(() => {
      apiHook.refresh()
    }, interval)
  }, [apiHook, interval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => {
      stopPolling()
    }
  }, [enabled, startPolling, stopPolling])

  return {
    ...apiHook,
    startPolling,
    stopPolling,
    isPolling: intervalRef.current !== null,
  }
}

// Export all hooks
export default useApi
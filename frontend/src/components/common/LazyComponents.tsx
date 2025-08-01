import React, { Suspense, lazy } from 'react'
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material'

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      gap: 2,
    }}
  >
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
)

// Skeleton fallback for specific components
export const TicketListSkeleton: React.FC = () => (
  <Box sx={{ p: 2 }}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="rectangular" width={80} height={24} />
        </Box>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="40%" />
      </Box>
    ))}
  </Box>
)

export const DashboardSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="30%" height={32} sx={{ my: 1 }} />
          <Skeleton variant="text" width="70%" />
        </Box>
      ))}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 2 }}>
      {Array.from({ length: 2 }).map((_, index) => (
        <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
        </Box>
      ))}
    </Box>
  </Box>
)

// Lazy loaded components
export const LazyTicketList = lazy(() => import('../../pages/tickets/TicketList'))
export const LazyTicketDetail = lazy(() => import('../../pages/tickets/TicketDetail'))
export const LazyCreateTicket = lazy(() => import('../../pages/tickets/CreateTicket'))
export const LazyUserList = lazy(() => import('../../pages/users/UserList'))
export const LazyUserDetail = lazy(() => import('../../pages/users/UserDetail'))
export const LazyCreateUser = lazy(() => import('../../pages/users/CreateUser'))
export const LazyAdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'))
export const LazyAdvancedFilters = lazy(() => import('./AdvancedFilters'))

// Higher-order component for lazy loading with custom fallback
export const withLazyLoading = <P = {}>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType,
  message?: string
) => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }))
  
  return (props: P) => (
    <Suspense fallback={fallback ? React.createElement(fallback) : <LoadingFallback message={message} />}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  )
}

// Wrapper component for lazy routes
interface LazyRouteProps {
  component: React.LazyExoticComponent<React.ComponentType<any>>
  fallback?: React.ComponentType
  message?: string
}

export const LazyRoute: React.FC<LazyRouteProps> = ({ 
  component: Component, 
  fallback, 
  message 
}) => (
  <Suspense fallback={fallback ? React.createElement(fallback) : <LoadingFallback message={message} />}>
    <Component />
  </Suspense>
)

// Code splitting utilities
export const loadComponent = async (importFn: () => Promise<any>) => {
  try {
    const module = await importFn()
    return module.default || module
  } catch (error) {
    console.error('Failed to load component:', error)
    throw error
  }
}

// Preload function for critical components
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Start loading the component but don't wait for it
  importFn().catch(error => {
    console.warn('Component preload failed:', error)
  })
}

// Progressive loading wrapper
interface ProgressiveLoadingProps {
  children: React.ReactNode
  skeleton: React.ComponentType
  delay?: number
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({ 
  children, 
  skeleton: Skeleton, 
  delay = 200 
}) => {
  const [showSkeleton, setShowSkeleton] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (showSkeleton) {
    return <Skeleton />
  }

  return <>{children}</>
}

// Intersection Observer for lazy loading sections
interface LazyLoadOnScrollProps {
  children: React.ReactNode
  placeholder?: React.ComponentType
  rootMargin?: string
  threshold?: number
}

export const LazyLoadOnScroll: React.FC<LazyLoadOnScrollProps> = ({
  children,
  placeholder: Placeholder,
  rootMargin = '50px',
  threshold = 0.1,
}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const [hasLoaded, setHasLoaded] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsIntersecting(true)
          setHasLoaded(true)
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [rootMargin, threshold, hasLoaded])

  return (
    <div ref={ref}>
      {isIntersecting ? (
        children
      ) : (
        Placeholder ? <Placeholder /> : <div style={{ height: '200px' }} />
      )}
    </div>
  )
}

// Image lazy loading component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  blurDataUrl?: string
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  blurDataUrl,
  className,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [isInView, setIsInView] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  return (
    <Box
      ref={imgRef}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'grey.100',
        ...style,
      }}
      className={className}
    >
      {isInView && (
        <>
          <img
            {...props}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.3s ease',
              opacity: isLoaded ? 1 : 0,
            }}
          />
          {!isLoaded && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.200',
              }}
            >
              {blurDataUrl ? (
                <img
                  src={blurDataUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'blur(5px)',
                  }}
                />
              ) : (
                <CircularProgress size={24} />
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default LazyRoute
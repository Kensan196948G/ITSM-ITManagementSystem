import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';
// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }) => (_jsxs(Box, { sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        gap: 2,
    }, children: [_jsx(CircularProgress, {}), _jsx(Typography, { variant: "body2", color: "text.secondary", children: message })] }));
// Skeleton fallback for specific components
export const TicketListSkeleton = () => (_jsx(Box, { sx: { p: 2 }, children: Array.from({ length: 5 }).map((_, index) => (_jsxs(Box, { sx: { mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 1 }, children: [_jsx(Skeleton, { variant: "text", width: "60%" }), _jsx(Skeleton, { variant: "rectangular", width: 80, height: 24 })] }), _jsx(Skeleton, { variant: "text", width: "80%" }), _jsx(Skeleton, { variant: "text", width: "40%" })] }, index))) }));
export const DashboardSkeleton = () => (_jsxs(Box, { sx: { p: 3 }, children: [_jsx(Skeleton, { variant: "text", width: "30%", height: 40, sx: { mb: 3 } }), _jsx(Box, { sx: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }, children: Array.from({ length: 4 }).map((_, index) => (_jsxs(Box, { sx: { p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }, children: [_jsx(Skeleton, { variant: "text", width: "50%" }), _jsx(Skeleton, { variant: "text", width: "30%", height: 32, sx: { my: 1 } }), _jsx(Skeleton, { variant: "text", width: "70%" })] }, index))) }), _jsx(Box, { sx: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 2 }, children: Array.from({ length: 2 }).map((_, index) => (_jsxs(Box, { sx: { p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }, children: [_jsx(Skeleton, { variant: "text", width: "40%" }), _jsx(Skeleton, { variant: "rectangular", width: "100%", height: 200, sx: { mt: 2 } })] }, index))) })] }));
// Lazy loaded components
export const LazyTicketList = lazy(() => import('../../pages/tickets/TicketList'));
export const LazyTicketDetail = lazy(() => import('../../pages/tickets/TicketDetail'));
export const LazyCreateTicket = lazy(() => import('../../pages/tickets/CreateTicket'));
export const LazyUserList = lazy(() => import('../../pages/users/UserList'));
export const LazyUserDetail = lazy(() => import('../../pages/users/UserDetail'));
export const LazyCreateUser = lazy(() => import('../../pages/users/CreateUser'));
export const LazyAdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'));
export const LazyAdvancedFilters = lazy(() => import('./AdvancedFilters'));
// Higher-order component for lazy loading with custom fallback
export const withLazyLoading = (Component, fallback, message) => {
    const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
    return (props) => (_jsx(Suspense, { fallback: fallback ? React.createElement(fallback) : _jsx(LoadingFallback, { message: message }), children: _jsx(LazyComponent, { ...props }) }));
};
export const LazyRoute = ({ component: Component, fallback, message }) => (_jsx(Suspense, { fallback: fallback ? React.createElement(fallback) : _jsx(LoadingFallback, { message: message }), children: _jsx(Component, {}) }));
// Code splitting utilities
export const loadComponent = async (importFn) => {
    try {
        const module = await importFn();
        return module.default || module;
    }
    catch (error) {
        console.error('Failed to load component:', error);
        throw error;
    }
};
// Preload function for critical components
export const preloadComponent = (importFn) => {
    // Start loading the component but don't wait for it
    importFn().catch(error => {
        console.warn('Component preload failed:', error);
    });
};
export const ProgressiveLoading = ({ children, skeleton: Skeleton, delay = 200 }) => {
    const [showSkeleton, setShowSkeleton] = React.useState(true);
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false);
        }, delay);
        return () => clearTimeout(timer);
    }, [delay]);
    if (showSkeleton) {
        return _jsx(Skeleton, {});
    }
    return _jsx(_Fragment, { children: children });
};
export const LazyLoadOnScroll = ({ children, placeholder: Placeholder, rootMargin = '50px', threshold = 0.1, }) => {
    const [isIntersecting, setIsIntersecting] = React.useState(false);
    const [hasLoaded, setHasLoaded] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !hasLoaded) {
                setIsIntersecting(true);
                setHasLoaded(true);
            }
        }, { rootMargin, threshold });
        if (ref.current) {
            observer.observe(ref.current);
        }
        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [rootMargin, threshold, hasLoaded]);
    return (_jsx("div", { ref: ref, children: isIntersecting ? (children) : (Placeholder ? _jsx(Placeholder, {}) : _jsx("div", { style: { height: '200px' } })) }));
};
export const LazyImage = ({ src, alt, placeholder, blurDataUrl, className, style, ...props }) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [isInView, setIsInView] = React.useState(false);
    const imgRef = React.useRef(null);
    React.useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsInView(true);
                observer.disconnect();
            }
        }, { threshold: 0.1 });
        if (imgRef.current) {
            observer.observe(imgRef.current);
        }
        return () => observer.disconnect();
    }, []);
    const handleLoad = () => {
        setIsLoaded(true);
    };
    return (_jsx(Box, { ref: imgRef, sx: {
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'grey.100',
            ...style,
        }, className: className, children: isInView && (_jsxs(_Fragment, { children: [_jsx("img", { ...props, src: src, alt: alt, onLoad: handleLoad, style: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'opacity 0.3s ease',
                        opacity: isLoaded ? 1 : 0,
                    } }), !isLoaded && (_jsx(Box, { sx: {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'grey.200',
                    }, children: blurDataUrl ? (_jsx("img", { src: blurDataUrl, alt: "", style: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(5px)',
                        } })) : (_jsx(CircularProgress, { size: 24 })) }))] })) }));
};
export default LazyRoute;

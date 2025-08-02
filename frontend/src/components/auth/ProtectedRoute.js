import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
const LoadingScreen = () => (_jsxs(Box, { sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
    }, children: [_jsx(CircularProgress, { size: 48, sx: { mb: 2 } }), _jsx(Typography, { variant: "h6", color: "textSecondary", children: "\u8A8D\u8A3C\u60C5\u5831\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059..." })] }));
const UnauthorizedScreen = () => (_jsxs(Box, { sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        textAlign: 'center',
    }, children: [_jsx(Typography, { variant: "h4", color: "error", gutterBottom: true, children: "\u30A2\u30AF\u30BB\u30B9\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093" }), _jsx(Typography, { variant: "body1", color: "textSecondary", children: "\u3053\u306E\u30DA\u30FC\u30B8\u306B\u30A2\u30AF\u30BB\u30B9\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002" })] }));
const ProtectedRoute = ({ children, roles, fallback, }) => {
    const { authState } = useAuth();
    const location = useLocation();
    // Show loading screen while authentication is being checked
    if (authState.loading) {
        return fallback || _jsx(LoadingScreen, {});
    }
    // Redirect to login if not authenticated
    if (!authState.isAuthenticated) {
        return (_jsx(Navigate, { to: "/login", state: { from: location }, replace: true }));
    }
    // Check role-based access if roles are specified
    if (roles && roles.length > 0) {
        const userRole = authState.user?.role;
        if (!userRole || !roles.includes(userRole)) {
            return _jsx(UnauthorizedScreen, {});
        }
    }
    // User is authenticated and authorized
    return _jsx(_Fragment, { children: children });
};
export default ProtectedRoute;

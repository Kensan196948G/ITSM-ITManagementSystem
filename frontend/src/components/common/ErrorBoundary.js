import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Box, Paper, Typography, Button, Alert, AlertTitle, Container, } from '@mui/material';
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({ hasError: false, error: undefined, errorInfo: undefined });
            }
        });
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }
    render() {
        if (this.state.hasError) {
            const { fallback: Fallback } = this.props;
            if (Fallback && this.state.error) {
                return _jsx(Fallback, { error: this.state.error, resetError: this.handleReset });
            }
            return (_jsx(Container, { maxWidth: "md", sx: { mt: 4 }, children: _jsxs(Paper, { elevation: 3, sx: {
                        p: 4,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                    }, children: [_jsxs(Alert, { severity: "error", sx: { mb: 3 }, children: [_jsx(AlertTitle, { children: "\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" }), "\u4E88\u671F\u3057\u306A\u3044\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3059\u308B\u304B\u3001\u3057\u3070\u3089\u304F\u6642\u9593\u3092\u304A\u3044\u3066\u304B\u3089\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"] }), _jsx(Typography, { variant: "h5", gutterBottom: true, color: "text.primary", children: "\u7533\u3057\u8A33\u3054\u3056\u3044\u307E\u305B\u3093" }), _jsx(Typography, { variant: "body1", color: "text.secondary", paragraph: true, children: "\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u3067\u554F\u984C\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u3053\u306E\u554F\u984C\u304C\u7D99\u7D9A\u3059\u308B\u5834\u5408\u306F\u3001 \u30B7\u30B9\u30C6\u30E0\u7BA1\u7406\u8005\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002" }), _jsxs(Box, { sx: { mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }, children: [_jsx(Button, { variant: "contained", startIcon: _jsx(RefreshIcon, {}), onClick: this.handleReset, size: "large", children: "\u518D\u8A66\u884C" }), _jsx(Button, { variant: "outlined", onClick: () => window.location.reload(), size: "large", children: "\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F" })] }), process.env.NODE_ENV === 'development' && this.state.error && (_jsxs(Box, { sx: { mt: 4, textAlign: 'left' }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "\u958B\u767A\u8005\u5411\u3051\u60C5\u5831:" }), _jsx(Paper, { sx: {
                                        p: 2,
                                        bgcolor: 'grey.100',
                                        fontFamily: '"Roboto Mono", monospace',
                                        fontSize: '0.875rem',
                                        overflow: 'auto',
                                        maxHeight: 300,
                                    }, children: _jsxs(Typography, { component: "pre", variant: "body2", children: [this.state.error.name, ": ", this.state.error.message, '\n\n', this.state.error.stack, this.state.errorInfo && '\n\nComponent Stack:', this.state.errorInfo?.componentStack] }) })] }))] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;

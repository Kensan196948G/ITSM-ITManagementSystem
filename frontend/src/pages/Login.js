import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, CardContent, TextField, Button, Typography, Alert, IconButton, InputAdornment, Container, Paper, useTheme, useMediaQuery, CircularProgress, } from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, Security, } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
const Login = ({ onLogin, loading, error, clearError }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        emailError: '',
        passwordError: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    // Clear errors when form data changes
    useEffect(() => {
        if (error) {
            clearError();
        }
    }, [formData.email, formData.password, error, clearError]);
    const validateEmail = (email) => {
        if (!email) {
            return 'メールアドレスを入力してください';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return '有効なメールアドレスを入力してください';
        }
        return '';
    };
    const validatePassword = (password) => {
        if (!password) {
            return 'パスワードを入力してください';
        }
        if (password.length < 6) {
            return 'パスワードは6文字以上で入力してください';
        }
        return '';
    };
    const handleInputChange = (field) => (event) => {
        const value = event.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value,
            [`${field}Error`]: '', // Clear field error when user types
        }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        // Validate form
        const emailError = validateEmail(formData.email);
        const passwordError = validatePassword(formData.password);
        if (emailError || passwordError) {
            setFormData(prev => ({
                ...prev,
                emailError,
                passwordError,
            }));
            return;
        }
        try {
            await onLogin({
                email: formData.email,
                password: formData.password,
            });
            // Navigate to intended page or dashboard
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        }
        catch (err) {
            // Error is handled by the auth context
            console.error('Login failed:', err);
        }
    };
    const handleShowPasswordToggle = () => {
        setShowPassword(prev => !prev);
    };
    return (_jsx(Container, { component: "main", maxWidth: "sm", children: _jsxs(Box, { sx: {
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
                py: 3,
            }, children: [_jsxs(Paper, { elevation: 4, sx: {
                        width: '100%',
                        maxWidth: 480,
                        borderRadius: 3,
                        overflow: 'hidden',
                    }, children: [_jsxs(Box, { sx: {
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                p: 4,
                                textAlign: 'center',
                            }, children: [_jsx(Security, { sx: { fontSize: 48, mb: 2 } }), _jsx(Typography, { variant: "h4", component: "h1", gutterBottom: true, children: "ITSM \u30B7\u30B9\u30C6\u30E0" }), _jsx(Typography, { variant: "subtitle1", sx: { opacity: 0.9 }, children: "IT\u30B5\u30FC\u30D3\u30B9\u7BA1\u7406\u30B7\u30B9\u30C6\u30E0\u306B\u30ED\u30B0\u30A4\u30F3" })] }), _jsxs(CardContent, { sx: { p: 4 }, children: [error && (_jsx(Alert, { severity: "error", sx: { mb: 3 }, children: error })), _jsxs(Box, { component: "form", onSubmit: handleSubmit, noValidate: true, children: [_jsx(TextField, { fullWidth: true, id: "email", name: "email", label: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", type: "email", value: formData.email, onChange: handleInputChange('email'), error: Boolean(formData.emailError), helperText: formData.emailError, margin: "normal", autoComplete: "email", autoFocus: true, disabled: loading, sx: { mb: 2 } }), _jsx(TextField, { fullWidth: true, id: "password", name: "password", label: "\u30D1\u30B9\u30EF\u30FC\u30C9", type: showPassword ? 'text' : 'password', value: formData.password, onChange: handleInputChange('password'), error: Boolean(formData.passwordError), helperText: formData.passwordError, margin: "normal", autoComplete: "current-password", disabled: loading, InputProps: {
                                                endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { "aria-label": "\u30D1\u30B9\u30EF\u30FC\u30C9\u8868\u793A\u5207\u66FF", onClick: handleShowPasswordToggle, edge: "end", disabled: loading, children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                            }, sx: { mb: 3 } }), _jsx(Button, { type: "submit", fullWidth: true, variant: "contained", size: "large", disabled: loading, startIcon: loading ? (_jsx(CircularProgress, { size: 20, color: "inherit" })) : (_jsx(LoginIcon, {})), sx: {
                                                height: 48,
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                mb: 2,
                                            }, children: loading ? 'ログイン中...' : 'ログイン' }), _jsx(Box, { sx: { textAlign: 'center', mt: 3 }, children: _jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5FD8\u308C\u305F\u5834\u5408\u306F\u3001\u30B7\u30B9\u30C6\u30E0\u7BA1\u7406\u8005\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044" }) })] })] })] }), _jsx(Box, { sx: { textAlign: 'center', mt: 4 }, children: _jsx(Typography, { variant: "body2", color: "textSecondary", children: "\u00A9 2024 ITSM \u30B7\u30B9\u30C6\u30E0. All rights reserved." }) })] }) }));
};
export default Login;

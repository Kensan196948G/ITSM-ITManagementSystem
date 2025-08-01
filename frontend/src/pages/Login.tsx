import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Security,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import type { LoginCredentials } from '../types'

interface LoginFormData extends LoginCredentials {
  emailError?: string
  passwordError?: string
}

interface LoginProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
}

const Login: React.FC<LoginProps> = ({ onLogin, loading, error, clearError }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    emailError: '',
    passwordError: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  // Clear errors when form data changes
  useEffect(() => {
    if (error) {
      clearError()
    }
  }, [formData.email, formData.password, error, clearError])

  const validateEmail = (email: string): string => {
    if (!email) {
      return 'メールアドレスを入力してください'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return '有効なメールアドレスを入力してください'
    }
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) {
      return 'パスワードを入力してください'
    }
    if (password.length < 6) {
      return 'パスワードは6文字以上で入力してください'
    }
    return ''
  }

  const handleInputChange = (field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    setFormData(prev => ({
      ...prev,
      [field]: value,
      [`${field}Error`]: '', // Clear field error when user types
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Validate form
    const emailError = validateEmail(formData.email)
    const passwordError = validatePassword(formData.password)

    if (emailError || passwordError) {
      setFormData(prev => ({
        ...prev,
        emailError,
        passwordError,
      }))
      return
    }

    try {
      await onLogin({
        email: formData.email,
        password: formData.password,
      })

      // Navigate to intended page or dashboard
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err)
    }
  }

  const handleShowPasswordToggle = () => {
    setShowPassword(prev => !prev)
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
          py: 3,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Security sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              ITSM システム
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              ITサービス管理システムにログイン
            </Typography>
          </Box>

          {/* Form Section */}
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={Boolean(formData.emailError)}
                helperText={formData.emailError}
                margin="normal"
                autoComplete="email"
                autoFocus
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                id="password"
                name="password"
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                error={Boolean(formData.passwordError)}
                helperText={formData.passwordError}
                margin="normal"
                autoComplete="current-password"
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="パスワード表示切替"
                        onClick={handleShowPasswordToggle}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <LoginIcon />
                  )
                }
                sx={{
                  height: 48,
                  fontSize: '1rem',
                  fontWeight: 600,
                  mb: 2,
                }}
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>

              {/* Additional Info */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="textSecondary">
                  パスワードを忘れた場合は、システム管理者にお問い合わせください
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="textSecondary">
            © 2024 ITSM システム. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}

export default Login
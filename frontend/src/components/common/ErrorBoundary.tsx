import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Container,
} from '@mui/material'
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} resetError={this.handleReset} />
      }

      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>アプリケーションエラーが発生しました</AlertTitle>
              予期しないエラーが発生しました。ページを再読み込みするか、しばらく時間をおいてから再試行してください。
            </Alert>

            <Typography variant="h5" gutterBottom color="text.primary">
              申し訳ございません
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              アプリケーションで問題が発生しました。この問題が継続する場合は、
              システム管理者にお問い合わせください。
            </Typography>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                size="large"
              >
                再試行
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                size="large"
              >
                ページを再読み込み
              </Button>
            </Box>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom>
                  開発者向け情報:
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  <Typography component="pre" variant="body2">
                    {this.state.error.name}: {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                    {this.state.errorInfo && '\n\nComponent Stack:'}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Container>
      )
    }

    return this.props.children
  }
}
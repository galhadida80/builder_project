import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Container, Alert, Typography, Button } from '@/mui'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = import.meta.env.DEV

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            bgcolor: 'background.default',
          }}
        >
          <Container maxWidth="md">
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                An unexpected error occurred in the application. Please try reloading the page.
              </Typography>
              {isDevelopment && this.state.error && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Error Details (Development Only):
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {this.state.error.message}
                  </Typography>
                  {this.state.errorInfo?.componentStack && (
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        mt: 1,
                        p: 2,
                        bgcolor: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        maxHeight: '200px',
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Box>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
                sx={{ mt: 2 }}
              >
                Reload Page
              </Button>
            </Alert>
          </Container>
        </Box>
      )
    }

    return this.props.children
  }
}

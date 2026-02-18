import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography, Button } from '@/mui'
import { i18n } from '../../i18n'

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

      const t = i18n.t.bind(i18n)

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            bgcolor: 'background.default',
            px: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom>
            {t('error.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480 }}>
            {t('error.message')}
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            {t('error.reload')}
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

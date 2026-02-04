import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ThemeProvider } from './theme'
import { ToastProvider } from './components/common/ToastProvider'
import './i18n/config'
import './styles/touch.css'

registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use')
  },
  onRegistered(registration) {
    console.log('Service worker registered:', registration)
  },
  onRegisterError(error) {
    console.error('Service worker registration error:', error)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

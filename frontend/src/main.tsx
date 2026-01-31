import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './theme'
import { NetworkProvider } from './contexts/NetworkContext'
import { ToastProvider } from './components/common/ToastProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <NetworkProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </NetworkProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

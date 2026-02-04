import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import App from './App'
import { ThemeProvider } from './theme'
import { ToastProvider } from './components/common/ToastProvider'
import { i18n } from './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

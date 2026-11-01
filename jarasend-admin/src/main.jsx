import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Registers the minimal service worker so the browser offers to install
// this as an app. Wrapped defensively - if this fails for any reason
// (older browser, blocked, etc.) the app itself still works completely
// normally, just without the install prompt.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal - the app works fine without it, just isn't installable.
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { hideBootSplash } from './components/Splash'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register the PWA service worker after the app boots.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}

// Splash hides it on mount; this is the safety net for screens without one.
window.setTimeout(hideBootSplash, 1500)

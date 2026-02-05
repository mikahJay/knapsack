import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

function ensureRuntimeEnv() {
  if (typeof window !== 'undefined' && window.__ENV__) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = '/env-config.js'
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })
}

ensureRuntimeEnv().finally(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})

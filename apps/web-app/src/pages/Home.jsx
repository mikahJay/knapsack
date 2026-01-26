import React from 'react'

// Prefer runtime config injected via env-config.js which sets window.__ENV__
const RUNTIME_ENV = typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {}
const NEED_URL = RUNTIME_ENV.VITE_API_NEED || import.meta.env.VITE_API_NEED || 'http://localhost:4020/need'
const RESOURCE_URL = RUNTIME_ENV.VITE_API_RESOURCE || import.meta.env.VITE_API_RESOURCE || 'http://localhost:4010/resource'
const AUTH_URL = RUNTIME_ENV.VITE_API_AUTH || import.meta.env.VITE_API_AUTH || 'http://localhost:4001/auth'

export default function Home(){
  return (
    <div style={{fontFamily:'sans-serif',padding:20}}>
      <h1>Knapsack — Web App</h1>
      <p>Welcome to Knapsack. The public site is hosted at your configured domain.</p>
    </div>
  )
}

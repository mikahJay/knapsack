import React, {useState} from 'react'

// Prefer runtime config injected via env-config.js which sets window.__ENV__
const RUNTIME_ENV = typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {}
const NEED_URL = RUNTIME_ENV.VITE_API_NEED || import.meta.env.VITE_API_NEED || 'http://localhost:4020/need'
const RESOURCE_URL = RUNTIME_ENV.VITE_API_RESOURCE || import.meta.env.VITE_API_RESOURCE || 'http://localhost:4010/resource'
const AUTH_URL = RUNTIME_ENV.VITE_API_AUTH || import.meta.env.VITE_API_AUTH || 'http://localhost:4001/auth'

export default function Home(){
  const [out, setOut] = useState('')

  async function check(url) {
    setOut('...')
    try {
      const res = await fetch(url, { method: 'GET' })
      const text = await res.text()
      setOut(`${res.status} — ${text.substring(0,200)}`)
    } catch (e) {
      setOut('ERROR: ' + e.message)
    }
  }

  return (
    <div style={{fontFamily:'sans-serif',padding:20}}>
      <h1>Knapsack — Web App (prototype)</h1>
      <p>Service endpoints (configured at dev start):</p>
      <ul>
        <li>need-server: <code>{NEED_URL}</code> <button onClick={() => check(NEED_URL)}>Check</button></li>
        <li>resource-server: <code>{RESOURCE_URL}</code> <button onClick={() => check(RESOURCE_URL)}>Check</button></li>
        <li>auth-server: <code>{AUTH_URL}</code> <button onClick={() => check(AUTH_URL)}>Check</button></li>
      </ul>
      <div style={{marginTop:20}}>
        <strong>Last response:</strong>
        <pre>{out}</pre>
      </div>
    </div>
  )
}

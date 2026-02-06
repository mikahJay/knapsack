import React, { useState } from 'react'
import { getUser, getIdToken } from '../utils/auth'

export default function FindResourcesPanel(){
  const [query, setQuery] = useState('')
  const RUNTIME_ENV = typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {}
  const API_BASE = RUNTIME_ENV.VITE_API_RESOURCE || import.meta.env.VITE_API_RESOURCE || import.meta.env.VITE_API_BASE || ''
  const [items, setItems] = useState([])
  const [status, setStatus] = useState(null)
  const [lastUrl, setLastUrl] = useState('')
  const [lastError, setLastError] = useState(null)

  async function doSearch(e){
    if(e) e.preventDefault()
    setStatus('searching')
    try{
      const url = `${API_BASE}/resources?search=${encodeURIComponent(query)}`
      setLastUrl(url)
      setLastError(null)
      console.debug('FindResourcesPanel: fetching', url)
      const headers = {}
      const idToken = getIdToken()
      if (idToken) headers.Authorization = `Bearer ${idToken}`
      const res = await fetch(url, { headers })
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const user = getUser()
      const email = user && user.email
      // show only public or owned by current user
      const filtered = data.filter(it => it.public || (email && it.owner === email))
      setItems(filtered)
      setStatus(null)
    }catch(err){
      console.error('search resources', err)
      const msg = err && err.message ? err.message : String(err)
      setLastError(msg)
      setStatus('error')
    }
  }

  return (
    <div>
      <form onSubmit={doSearch} className="mb-3">
        <div className="input-group">
          <input className="form-control" placeholder="Search resources" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="btn btn-primary" type="submit">Search</button>
        </div>
      </form>
      {status === 'searching' && <div>Searching…</div>}
      {status === 'error' && <div className="text-danger">Error</div>}
      <div className="mt-2 text-muted small">
        {lastUrl && <div>URL: {lastUrl}</div>}
        {lastError && <div className="text-danger">Error: {lastError}</div>}
      </div>
      <div>
        {items.length === 0 && <div className="text-muted">No results</div>}
        {items.length > 0 && (
          <ul className="list-group">
            {items.map(it => {
              const user = getUser()
              const isMine = user && user.email === it.owner
              const date = it.created_at || it.updated_at || it.date
              const dateStr = date ? (new Date(date)).toLocaleDateString() : ''
              return (
                <li key={it.id} className="list-group-item">
                  <div>
                    <strong>{it.name}{isMine ? ' (mine)' : ''}</strong>
                  </div>
                  <div className="text-muted small">{it.description}</div>
                  <div className="text-muted small">Offered by: {it.owner}{dateStr ? `, ${dateStr}` : ''}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

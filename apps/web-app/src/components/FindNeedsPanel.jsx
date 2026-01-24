import React, { useState } from 'react'
import { getUser } from '../utils/auth'

export default function FindNeedsPanel(){
  const [query, setQuery] = useState('')
  const API_BASE = import.meta.env.VITE_API_NEED || import.meta.env.VITE_API_BASE || ''
  const [items, setItems] = useState([])
  const [status, setStatus] = useState(null)
  const [lastUrl, setLastUrl] = useState('')
  const [lastError, setLastError] = useState(null)

  async function doSearch(e){
    if(e) e.preventDefault()
    setStatus('searching')
    try{
      const url = `${API_BASE}/needs?search=${encodeURIComponent(query)}`
      setLastUrl(url)
      setLastError(null)
      console.debug('FindNeedsPanel: fetching', url)
      const res = await fetch(url)
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const user = getUser()
      const email = user && user.email
      const filtered = data.filter(it => it.public || (email && it.owner === email))
      setItems(filtered)
      setStatus(null)
    }catch(err){
      console.error('search needs', err)
      const msg = err && err.message ? err.message : String(err)
      setLastError(msg)
      setStatus('error')
    }
  }

  return (
    <div>
      <form onSubmit={doSearch} className="mb-3">
        <div className="input-group">
          <input className="form-control" placeholder="Search needs" value={query} onChange={e=>setQuery(e.target.value)} />
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
            {items.map(it => (
              <li key={it.id} className="list-group-item">
                <span style={{ fontStyle: (getUser() && getUser().email === it.owner) ? 'italic' : 'normal' }}>
                  {it.name}{getUser() && getUser().email === it.owner ? ' (mine)' : ''}
                </span>
                <div className="text-muted small">{it.description}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { getUser } from '../utils/auth'

export default function FindNeedsPanel(){
  const [query, setQuery] = useState('')
  const RUNTIME_ENV = typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {}
  const API_BASE = RUNTIME_ENV.VITE_API_NEED || import.meta.env.VITE_API_NEED || import.meta.env.VITE_API_BASE || ''
  const [items, setItems] = useState([])
  const [status, setStatus] = useState(null)

  async function doSearch(e){
    if(e) e.preventDefault()
    setStatus('searching')
    try{
      const url = `${API_BASE}/needs?search=${encodeURIComponent(query)}`
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
                  <div className="text-muted small">Needed by: {it.owner}{dateStr ? `, ${dateStr}` : ''}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

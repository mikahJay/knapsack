import React, { useState } from 'react'
import { getUser, getIdToken, buildGoogleAuthUrl } from '../utils/auth'

function SlideDown({ open, children }) {
  return (
    <div style={{
      maxHeight: open ? '600px' : '0px',
      overflow: 'hidden',
      transition: 'max-height 300ms ease-in-out'
    }}>
      {children}
    </div>
  )
}

export default function MyNeedsPanel(){
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [status, setStatus] = useState(null)
  const [expandedMatches, setExpandedMatches] = useState({}) // Track which need's matches are shown
  const [matches, setMatches] = useState({}) // Store matches by need_id

  const RUNTIME_ENV = typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {}
  const API_BASE = RUNTIME_ENV.VITE_API_NEED || import.meta.env.VITE_API_NEED || import.meta.env.VITE_API_BASE || ''
  const MATCH_API_BASE = RUNTIME_ENV.VITE_API_MATCH || import.meta.env.VITE_API_MATCH || import.meta.env.VITE_API_BASE || ''
  const [items, setItems] = useState([])

  async function fetchMyNeeds(){
    const user = getUser()
    if(!user || !user.email) return setItems([])
    try{
      const headers = {}
      const idToken = getIdToken()
      if (idToken) headers.Authorization = `Bearer ${idToken}`
      const res = await fetch(`${API_BASE}/needs`, { headers })
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setItems(data)
    }catch(err){ console.error('fetch my needs', err) }
  }

  React.useEffect(()=>{ fetchMyNeeds() }, [])

  async function fetchMatches(needId) {
    try {
      const headers = {}
      const idToken = getIdToken()
      if (idToken) headers.Authorization = `Bearer ${idToken}`
      const res = await fetch(`${MATCH_API_BASE}/needs/${needId}/candidates`, { headers })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setMatches(prev => ({ ...prev, [needId]: data }))
    } catch (err) {
      console.error('fetch matches', err)
      setMatches(prev => ({ ...prev, [needId]: [] }))
    }
  }

  function toggleMatches(needId) {
    const isExpanded = expandedMatches[needId]
    if (!isExpanded && !matches[needId]) {
      fetchMatches(needId)
    }
    setExpandedMatches(prev => ({ ...prev, [needId]: !isExpanded }))
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  async function handleSubmit(e){
    e.preventDefault()
    setStatus('saving')
    const user = getUser()
    const payload = {
      name,
      description,
      quantity: quantity ? Number(quantity) : null,
      public: isPublic,
      attributes: {},
      owner: user ? (user.email || user.name) : null
    }
    try {
        const headers = { 'Content-Type': 'application/json' }
        const idToken = getIdToken()
        if(idToken) headers['Authorization'] = `Bearer ${idToken}`
        const res = await fetch(`${API_BASE}/needs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStatus('saved')
      fetchMyNeeds()
      setName('')
      setDescription('')
      setQuantity('')
      setIsPublic(false)
    } catch(err){
      setStatus('error')
      console.error(err)
    }
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'Create Need'}</button>
      <SlideDown open={open}>
        <div className="card mt-3 p-3">
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <label className="form-label">Name</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="mb-2">
              <label className="form-label">Description</label>
              <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="mb-2">
              <label className="form-label">Quantity</label>
              <input type="number" step="any" min="0" className="form-control" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id="publicCheck" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              <label className="form-check-label" htmlFor="publicCheck">Public</label>
            </div>
            <div className="mt-3">
              <button className="btn btn-success" type="submit">Submit</button>
              {status === 'saving' && <span className="ms-2">Saving…</span>}
              {status === 'saved' && <span className="ms-2 text-success">Saved</span>}
              {status === 'error' && <span className="ms-2 text-danger">Error</span>}
            </div>
          </form>
        </div>
      </SlideDown>
      <div className="mt-4">
        <h5>My needs</h5>
        {items.length === 0 && <div className="text-muted">No needs yet</div>}
        {items.length > 0 && (
          <table className="table table-sm">
            <thead>
              <tr><th>Name</th><th>Description</th><th>Qty</th><th>Public</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(it => (
                <React.Fragment key={it.id}>
                  <tr style={{ color: it.public ? 'darkgreen' : 'inherit' }}>
                    <td>{it.name}</td>
                    <td>{it.description}</td>
                    <td>{it.quantity}</td>
                    <td>
                      <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault()
                          const newPublic = !it.public
                          setItems(prev => prev.map(p => p.id === it.id ? { ...p, public: newPublic } : p))
                          try{
                            const url = `${API_BASE}/needs/${it.id}/toggle-public`
                            const body = JSON.stringify({ public: newPublic })
                            const headers = { 'Content-Type': 'application/json' }
                            const idToken = getIdToken()
                            if (idToken) headers.Authorization = `Bearer ${idToken}`
                            const res = await fetch(url, {
                              method: 'POST',
                              headers,
                              body
                            })
                            if(!res.ok){
                              const text = await res.text().catch(()=>'<no body>')
                              throw new Error(`status=${res.status} body=${text}`)
                            }
                            const updated = await res.json()
                            setItems(prev => prev.map(p => p.id === it.id ? updated : p))
                          }catch(err){
                            console.error('toggle public failed', { id: it.id, err })
                            setItems(prev => prev.map(p => p.id === it.id ? { ...p, public: it.public } : p))
                            setStatus('error')
                          }
                        }}
                        style={{ color: it.public ? 'darkgreen' : 'black', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {it.public ? 'Public' : 'Private'}
                      </a>
                    </td>
                    <td>
                      {it.public && (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            toggleMatches(it.id)
                          }}
                          style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9em' }}
                        >
                          {expandedMatches[it.id] ? 'Hide Matches' : 'Show Matches'}
                        </a>
                      )}
                    </td>
                  </tr>
                  {expandedMatches[it.id] && (
                    <tr>
                      <td colSpan="5" style={{ backgroundColor: '#f8f9fa', padding: '10px' }}>
                        {!matches[it.id] && <div className="text-muted">Loading matches...</div>}
                        {matches[it.id] && matches[it.id].length === 0 && (
                          <div className="text-muted">No matches found yet.</div>
                        )}
                        {matches[it.id] && matches[it.id].length > 0 && (
                          <div>
                            <strong>Potential Matches:</strong>
                            <div className="mt-2">
                              {matches[it.id].map(match => (
                                <div key={match.id} className="border-bottom pb-2 mb-2">
                                  <div><strong>{match.resource_name || 'Unknown Resource'}</strong></div>
                                  {match.match_reason && (
                                    <div className="text-muted" style={{ fontSize: '0.9em' }}>
                                      {match.match_reason}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.85em', color: '#666' }}>
                                    Matched {formatDate(match.created_at)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

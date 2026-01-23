import React, { useState } from 'react'
import { getUser, buildGoogleAuthUrl } from '../utils/auth'

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

export default function MyResourcesPanel(){
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [status, setStatus] = useState(null)

  // prefer the resource-specific env var set by the local start script
  const API_BASE = import.meta.env.VITE_API_RESOURCE || import.meta.env.VITE_API_BASE || ''
  const [items, setItems] = useState([])

  async function fetchMyResources(){
    const user = getUser()
    if(!user || !user.email) return setItems([])
    try{
      const headers = {}
      const idToken = sessionStorage.getItem('knapsack_id_token')
      if(idToken) headers['Authorization'] = `Bearer ${idToken}`
      const res = await fetch(`${API_BASE}/me/resources`, { headers })
      if(res.status === 401){
        // require login
        location.href = buildGoogleAuthUrl()
        return
      }
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setItems(data)
    }catch(err){ console.error('fetch my resources', err) }
  }

  React.useEffect(()=>{ fetchMyResources() }, [])

  async function handleSubmit(e){
    e.preventDefault()
    setStatus('saving')
    const user = getUser()
    const payload = {
      name,
      description,
      quantity: quantity ? Number(quantity) : null,
      public: isPublic,
      attributes: {}
    }
    try {
        const headers = { 'Content-Type': 'application/json' }
        const idToken = sessionStorage.getItem('knapsack_id_token')
        if(idToken) headers['Authorization'] = `Bearer ${idToken}`
        const res = await fetch(`${API_BASE}/resources`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStatus('saved')
      // refresh list
      fetchMyResources()
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
      <button className="btn btn-primary" onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'Create Resource'}</button>
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
        <h5>My resources</h5>
        {items.length === 0 && <div className="text-muted">No resources yet</div>}
        {items.length > 0 && (
          <table className="table table-sm">
            <thead>
              <tr><th>Name</th><th>Description</th><th>Qty</th><th>Public</th></tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.description}</td>
                  <td>{it.quantity}</td>
                  <td>{it.public ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

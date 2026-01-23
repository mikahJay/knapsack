import React, { useState } from 'react'

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

  const API_BASE = import.meta.env.VITE_API_BASE || ''

  async function handleSubmit(e){
    e.preventDefault()
    setStatus('saving')
    const payload = {
      name,
      description,
      quantity: quantity ? Number(quantity) : null,
      public: isPublic,
      attributes: {}
    }
    try {
      const res = await fetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if(!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStatus('saved')
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
    </div>
  )
}

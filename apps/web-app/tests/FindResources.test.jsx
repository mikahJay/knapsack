import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FindResources from '../src/pages/FindResources'
import FindResourcesPanel from '../src/components/FindResourcesPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({ getUser: () => ({ email: 'me@example.com', name: 'Me' }) }))

describe('Find Resources', () => {
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { vi.resetAllMocks() })

  test('shows only public items and marks owned items', async () => {
    const items = [
      { id: '1', name: 'Pub', description: 'p', public: true, owner: 'other@example.com' },
      { id: '2', name: 'PrivMine', description: 'x', public: false, owner: 'me@example.com' },
      { id: '3', name: 'Priv', description: 'y', public: false, owner: 'other@example.com' }
    ]
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(items) })

    render(<BrowserRouter><FindResourcesPanel /></BrowserRouter>)

    fireEvent.change(screen.getByPlaceholderText('Search resources'), { target: { value: 'q' } })
    fireEvent.click(screen.getByText('Search'))

    await waitFor(() => expect(screen.getByText('Pub')).toBeInTheDocument())
    const mineEl = screen.getByText(/PrivMine/)
    expect(mineEl).toBeInTheDocument()
    expect(screen.queryByText('Priv')).toBeNull()
    // owned is marked
    expect(mineEl.textContent).toContain('(mine)')
  })
})

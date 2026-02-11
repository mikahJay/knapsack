import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FindNeeds from '../src/pages/FindNeeds'
import FindNeedsPanel from '../src/components/FindNeedsPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({
  getUser: () => ({ email: 'me@example.com', name: 'Me' }),
  getIdToken: () => null
}))

describe('Find Needs', () => {
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { vi.resetAllMocks() })

  test('shows only public items and marks owned items', async () => {
    const items = [
      { id: '1', name: 'PublicNeed', description: 'p', public: true, owner: 'other@example.com' },
      { id: '2', name: 'PublicMine', description: 'x', public: true, owner: 'me@example.com' },
      { id: '3', name: 'PrivateMine', description: 'y', public: false, owner: 'me@example.com' },
      { id: '4', name: 'PrivateOther', description: 'z', public: false, owner: 'other@example.com' }
    ]
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(items) })

    render(<BrowserRouter><FindNeedsPanel /></BrowserRouter>)

    fireEvent.change(screen.getByPlaceholderText('Search needs'), { target: { value: 'q' } })
    fireEvent.click(screen.getByText('Search'))

    await waitFor(() => expect(screen.getByText('PublicNeed')).toBeInTheDocument())
    const mineEl = screen.getByText(/PublicMine/)
    expect(mineEl).toBeInTheDocument()
    expect(screen.queryByText('PrivateMine')).toBeNull()
    expect(screen.queryByText('PrivateOther')).toBeNull()
    // owned is marked
    expect(mineEl.textContent).toContain('(mine)')
  })
})

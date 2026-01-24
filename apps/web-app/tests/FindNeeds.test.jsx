import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FindNeedsPanel from '../src/components/FindNeedsPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({ getUser: () => ({ email: 'me@example.com', name: 'Me' }) }))

describe('Find Needs', () => {
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { vi.resetAllMocks() })

  test('shows only public items and marks owned items', async () => {
    const items = [
      { id: '1', name: 'PubNeed', description: 'p', public: true, owner: 'other@example.com' },
      { id: '2', name: 'MyNeed', description: 'x', public: false, owner: 'me@example.com' },
      { id: '3', name: 'PrivateNeed', description: 'y', public: false, owner: 'other@example.com' }
    ]
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(items) })

    render(<BrowserRouter><FindNeedsPanel /></BrowserRouter>)

    fireEvent.change(screen.getByPlaceholderText('Search needs'), { target: { value: 'term' } })
    fireEvent.click(screen.getByText('Search'))

    await waitFor(() => expect(screen.getByText('PubNeed')).toBeInTheDocument())
    const mineEl = screen.getByText(/MyNeed/)
    expect(mineEl).toBeInTheDocument()
    expect(screen.queryByText('PrivateNeed')).toBeNull()
    expect(mineEl.textContent).toContain('(mine)')
  })
})

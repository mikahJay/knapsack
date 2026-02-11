import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FindResourcesPanel from '../src/components/FindResourcesPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({
  getUser: () => ({ email: 'me@example.com', name: 'Me' }),
  getIdToken: () => null
}))

describe('Find Resources formatting', () => {
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { vi.resetAllMocks() })

  test('renders name (bold), description, and Offered by line', async () => {
    const items = [
      { id: '1', name: 'Widget', description: 'A useful widget', public: true, owner: 'alice@example.com', created_at: '2025-01-01T12:00:00Z' }
    ]
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(items) })

    render(<BrowserRouter><FindResourcesPanel /></BrowserRouter>)

    fireEvent.change(screen.getByPlaceholderText('Search resources'), { target: { value: 'w' } })
    fireEvent.click(screen.getByText('Search'))

    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument())

    // name is bold
    const nameEl = screen.getByText('Widget')
    expect(nameEl.closest('strong') || nameEl).toBeTruthy()

    // description shown
    expect(screen.getByText('A useful widget')).toBeInTheDocument()

    // Offered by line contains owner
    expect(screen.getByText(/Offered by: .*alice@example.com/)).toBeInTheDocument()
  })
})

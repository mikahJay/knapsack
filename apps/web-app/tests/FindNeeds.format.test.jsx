import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import FindNeedsPanel from '../src/components/FindNeedsPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({ getUser: () => ({ email: 'me@example.com', name: 'Me' }) }))

describe('Find Needs formatting', () => {
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { vi.resetAllMocks() })

  test('renders name (bold), description, and Needed by line', async () => {
    const items = [
      { id: '1', name: 'Gizmo', description: 'Need a gizmo', public: true, owner: 'bob@example.com', created_at: '2025-02-02T12:00:00Z' }
    ]
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(items) })

    render(<BrowserRouter><FindNeedsPanel /></BrowserRouter>)

    fireEvent.change(screen.getByPlaceholderText('Search needs'), { target: { value: 'g' } })
    fireEvent.click(screen.getByText('Search'))

    await waitFor(() => expect(screen.getByText('Gizmo')).toBeInTheDocument())

    const nameEl = screen.getByText('Gizmo')
    expect(nameEl.closest('strong') || nameEl).toBeTruthy()

    expect(screen.getByText('Need a gizmo')).toBeInTheDocument()

    expect(screen.getByText(/Needed by: .*bob@example.com/)).toBeInTheDocument()
  })
})

import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import MyNeeds from '../src/pages/MyNeeds'
import MyNeedsPanel from '../src/components/MyNeedsPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({
  getUser: () => ({ email: 'test@example.com', name: 'Test User' }),
  buildGoogleAuthUrl: () => '/auth-callback.html'
}))

describe('MyNeeds page', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('loads and displays user needs', async () => {
    const needs = [
      { id: '1', name: 'Need A', description: 'A', quantity: 1, public: false },
      { id: '2', name: 'Need B', description: 'B', quantity: 2, public: true }
    ]

    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/me/needs') || url.includes('/needs?owner=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(needs) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyNeeds />
      </BrowserRouter>
    )

    await waitFor(() => expect(screen.getByText('My Needs')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Need A')).toBeInTheDocument())
    expect(screen.getByText('Need B')).toBeInTheDocument()
  })

  test('creates a need and refreshes list', async () => {
    const created = { id: '3', name: 'New', description: 'new', quantity: 5, public: false }
    let call = 0
    global.fetch.mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        call++
        return Promise.resolve({ ok: true, json: () => Promise.resolve(created) })
      }
      if (url.includes('/me/needs') || url.includes('/needs?owner=')) {
        if (call === 0) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        return Promise.resolve({ ok: true, json: () => Promise.resolve([created]) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyNeedsPanel />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText('Create Need'))
    const textboxes = screen.getAllByRole('textbox')
    fireEvent.change(textboxes[0], { target: { value: 'New' } })
    fireEvent.change(textboxes[1], { target: { value: 'new' } })
    const quantityInput = screen.getByRole('spinbutton')
    fireEvent.change(quantityInput, { target: { value: '5' } })
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => expect(screen.getByText('New')).toBeInTheDocument())
  })

  test('requests needs for the current user and only shows those needs', async () => {
    const mine = { id: '10', name: 'Mine', description: 'mine', quantity: 1, public: false, owner: 'test@example.com' }
    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/me/needs') || url.includes('/needs?owner=')) {
        expect(url).toContain(encodeURIComponent('test@example.com'))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([mine]) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyNeeds />
      </BrowserRouter>
    )

    await waitFor(() => expect(screen.getByText('Mine')).toBeInTheDocument())
  })

  test('toggles public flag and updates UI color/text', async () => {
    const initial = { id: '1', name: 'ToggleMe', description: '', quantity: 1, public: false, owner: 'test@example.com' }
    let postCalled = false

    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/toggle-public') && opts && opts.method === 'POST') {
        const body = JSON.parse(opts.body)
        expect(body.public).toBe(true)
        postCalled = true
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...initial, public: true }) })
      }
      if (url.includes('/me/needs') || url.includes('/needs?owner=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([initial]) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyNeedsPanel />
      </BrowserRouter>
    )

    await waitFor(() => expect(screen.getByText('ToggleMe')).toBeInTheDocument())
    const row = screen.getByText('ToggleMe').closest('tr')
    const rowWithin = within(row)
    const toggleLink = rowWithin.getByRole('link')
    fireEvent.click(toggleLink)
    await waitFor(() => expect(rowWithin.getByRole('link').textContent).toBe('Public'))
    expect(row.style.color).toBe('darkgreen')
    expect(postCalled).toBe(true)
  })
})

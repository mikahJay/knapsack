import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import MyResources from '../src/pages/MyResources'
import MyResourcesPanel from '../src/components/MyResourcesPanel'
import { BrowserRouter } from 'react-router-dom'

vi.mock('../src/utils/auth', () => ({
  getUser: () => ({ email: 'test@example.com', name: 'Test User' }),
  buildGoogleAuthUrl: () => '/auth-callback.html',
  getIdToken: () => null
}))

describe('MyResources page', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('loads and displays user resources', async () => {
    const resources = [
      { id: '1', name: 'Res A', description: 'A', quantity: 1, public: false },
      { id: '2', name: 'Res B', description: 'B', quantity: 2, public: true }
    ]

    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/resources') && (!opts || !opts.method)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(resources) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyResources />
      </BrowserRouter>
    )

    // panel should show entries after fetch
    await waitFor(() => expect(screen.getByText('My Resources')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Res A')).toBeInTheDocument())
    expect(screen.getByText('Res B')).toBeInTheDocument()
  })

  test('creates a resource and refreshes list', async () => {
    const created = { id: '3', name: 'New', description: 'new', quantity: 5, public: false }
    // first fetch for list returns empty, then after create returns new item
    let call = 0
    global.fetch.mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        call++
        return Promise.resolve({ ok: true, json: () => Promise.resolve(created) })
      }
      // GET list
      if (url.includes('/resources') && (!opts || !opts.method)) {
        if (call === 0) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        return Promise.resolve({ ok: true, json: () => Promise.resolve([created]) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyResourcesPanel />
      </BrowserRouter>
    )

    // open form
    fireEvent.click(screen.getByText('Create Resource'))
    // fill form (inputs have no associated labels so use roles)
    const textboxes = screen.getAllByRole('textbox')
    // textboxes[0] = Name input, textboxes[1] = Description textarea
    fireEvent.change(textboxes[0], { target: { value: 'New' } })
    fireEvent.change(textboxes[1], { target: { value: 'new' } })
    const quantityInput = screen.getByRole('spinbutton')
    fireEvent.change(quantityInput, { target: { value: '5' } })
    // submit
    fireEvent.click(screen.getByText('Submit'))

    // after submit, list should refresh and show created
    await waitFor(() => expect(screen.getByText('New')).toBeInTheDocument())
  })

  test('requests resources and shows returned items', async () => {
    const mine = { id: '10', name: 'Mine', description: 'mine', quantity: 1, public: false, owner: 'test@example.com' }

    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/resources') && (!opts || !opts.method)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([mine]) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyResources />
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
      if (url.includes('/resources') && (!opts || !opts.method)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([initial]) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    render(
      <BrowserRouter>
        <MyResourcesPanel />
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

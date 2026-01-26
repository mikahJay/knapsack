import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import NavBar from '../src/components/NavBar'
import * as auth from '../src/utils/auth'

describe('NavBar', () => {
  test('renders Home, About and Login menu', () => {
    render(
      <BrowserRouter>
        <NavBar />
      </BrowserRouter>
    )

    expect(screen.getByText(/Home/i)).toBeInTheDocument()
    expect(screen.getByText(/About/i)).toBeInTheDocument()
    expect(screen.getByText(/Login/i)).toBeInTheDocument()
  })

  test('does not show Find menus when not authenticated', () => {
    vi.spyOn(auth, 'getUser').mockReturnValue(null)

    render(
      <BrowserRouter>
        <NavBar />
      </BrowserRouter>
    )

    expect(screen.queryByText(/Find Resources/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Find Needs/i)).not.toBeInTheDocument()
  })

  test('shows Find menus when authenticated', () => {
    vi.spyOn(auth, 'getUser').mockReturnValue({ name: 'Test User', email: 'test@example.com' })

    render(
      <BrowserRouter>
        <NavBar />
      </BrowserRouter>
    )

    expect(screen.getByText(/Find Resources/i)).toBeInTheDocument()
    expect(screen.getByText(/Find Needs/i)).toBeInTheDocument()
  })
})

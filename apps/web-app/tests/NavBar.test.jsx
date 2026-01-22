import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import NavBar from '../src/components/NavBar'

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
})

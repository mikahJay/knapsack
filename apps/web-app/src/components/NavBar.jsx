import React, {useState} from 'react'
import { Link } from 'react-router-dom'

export default function NavBar(){
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">Knapsack</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">About</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/my-resources">My Resources</Link>
            </li>
          </ul>

          <div className="d-flex position-relative">
            <div className="dropdown">
              <button className="btn btn-outline-primary dropdown-toggle" type="button" id="loginDropdown" data-bs-toggle="dropdown" aria-expanded={loginOpen} onClick={() => setLoginOpen(v => !v)}>
                Login
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="loginDropdown">
                <li><a className="dropdown-item" href="#">Sign in with Google</a></li>
                <li><a className="dropdown-item" href="#">Sign in with Apple</a></li>
                <li><a className="dropdown-item" href="#">Sign in with Facebook</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

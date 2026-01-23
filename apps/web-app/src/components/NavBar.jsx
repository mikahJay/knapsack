import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, setUser, clearUser, fetchGoogleProfile, buildGoogleAuthUrl } from '../utils/auth'

export default function NavBar(){
  const [user, setUserState] = useState(null)

  useEffect(()=>{
    setUserState(getUser())

    function parseJwt (token) {
      try{
        const payload = token.split('.')[1]
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        return JSON.parse(decodeURIComponent(escape(decoded)))
      }catch(e){ return null }
    }

    function handleAuthFragment(msg){
      try{
        if(!msg) return
        // message wrapper may include type/provider
        const frag = Object.assign({}, msg)

        console.debug('NavBar processing auth fragment', frag)

        // verify state
        const storedState = sessionStorage.getItem('knapsack_oauth_state')
        if(frag.state && storedState && frag.state !== storedState){
          console.warn('oauth state mismatch')
          return
        }

        if(frag.access_token){
          ;(async ()=>{
            try{
              const profile = await fetchGoogleProfile(frag.access_token)
              const u = { name: profile.name || profile.email, email: profile.email, picture: profile.picture }
              setUser(u)
              setUserState(u)
              // store tokens for API use
              if(msg.id_token) try{ sessionStorage.setItem('knapsack_id_token', msg.id_token) }catch(e){}
              if(msg.access_token) try{ sessionStorage.setItem('knapsack_access_token', msg.access_token) }catch(e){}
            }catch(err){ console.error('profile fetch', err) }
            finally{
              sessionStorage.removeItem('knapsack_oauth_state')
              sessionStorage.removeItem('knapsack_oauth_nonce')
            }
          })()
        } else if(frag.id_token){
          const p = parseJwt(frag.id_token)
          const storedNonce = sessionStorage.getItem('knapsack_oauth_nonce')
          if(!p){ console.warn('invalid id_token'); return }
          if(storedNonce && p.nonce !== storedNonce){ console.warn('nonce mismatch'); return }
          const u = { name: p.name || p.email, email: p.email, picture: p.picture }
          setUser(u)
          setUserState(u)
          // store id_token
          if(msg && msg.id_token) try{ sessionStorage.setItem('knapsack_id_token', msg.id_token) }catch(e){}
          sessionStorage.removeItem('knapsack_oauth_state')
          sessionStorage.removeItem('knapsack_oauth_nonce')
        }
      }catch(err){ console.error('auth fragment handling', err) }
    }

    function onMessage(e){
      try{ handleAuthFragment(e && e.data) }catch(err){ console.error(err) }
    }

    window.addEventListener('message', onMessage)
    // if same-window flow stored a fragment, process it now
    try{
      const raw = sessionStorage.getItem('knapsack_auth_fragment')
      if(raw){
        const parsed = JSON.parse(raw)
        handleAuthFragment(parsed)
        sessionStorage.removeItem('knapsack_auth_fragment')
      }
    }catch(e){}

    return ()=> window.removeEventListener('message', onMessage)
  }, [])

  const navigate = useNavigate()

  function handleLogout(e){
    e.preventDefault()
    clearUser()
    setUserState(null)
    try{ sessionStorage.removeItem('knapsack_id_token'); sessionStorage.removeItem('knapsack_access_token') }catch(e){}
    // navigate back to home and remove My Resources from view
    navigate('/')
  }

  function handleLogin(e){
    e && e.preventDefault()
    const url = buildGoogleAuthUrl()
    // navigate current window for auth (same-window flow)
    location.href = url
  }

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
            {user && (
              <li className="nav-item">
                <Link className="nav-link" to="/my-resources">My Resources</Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center">
            {!user ? (
              <button className="btn btn-outline-success" onClick={handleLogin}>Login</button>
            ) : (
              <>
                <img src={user.picture} alt="avatar" style={{width:28,height:28,borderRadius:14,marginRight:8}} />
                <span className="me-2">Hello, {user.name}</span>
                <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

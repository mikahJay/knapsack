const STORAGE_KEY = 'knapsack_user'

export function getUser(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) }catch(e){return null}
}

export function setUser(user){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearUser(){
  localStorage.removeItem(STORAGE_KEY)
  try{ sessionStorage.removeItem('knapsack_id_token'); sessionStorage.removeItem('knapsack_access_token') }catch(e){}
}

export function setIdToken(token){
  try{ sessionStorage.setItem('knapsack_id_token', token) }catch(e){}
}

export function getIdToken(){
  try{ return sessionStorage.getItem('knapsack_id_token') }catch(e){return null}
}

export async function fetchGoogleProfile(accessToken){
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if(!res.ok) throw new Error('failed to fetch profile')
  return res.json()
}

export function buildGoogleAuthUrl(){
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirect = `${location.origin}/auth-callback.html`
  const scope = 'openid profile email'
  // generate secure random state and nonce
  function rand(){ return crypto.getRandomValues(new Uint8Array(16)).reduce((s,b)=>s+('00'+b.toString(16)).slice(-2),'') }
  const state = rand()
  const nonce = rand()
  try{ sessionStorage.setItem('knapsack_oauth_state', state); sessionStorage.setItem('knapsack_oauth_nonce', nonce) }catch(e){ }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    // request both an access token and an ID token for client-side apps
    response_type: 'token id_token',
    scope,
    state,
    nonce,
    include_granted_scopes: 'true',
    prompt: 'select_account'
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

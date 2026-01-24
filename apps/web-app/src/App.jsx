import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import About from './pages/About'
import MyResources from './pages/MyResources'
import MyNeeds from './pages/MyNeeds'
import FindResources from './pages/FindResources'
import FindNeeds from './pages/FindNeeds'

export default function App(){
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/about" element={<About/>} />
        <Route path="/my-resources" element={<MyResources/>} />
        <Route path="/my-needs" element={<MyNeeds/>} />
        <Route path="/find-resources" element={<FindResources/>} />
        <Route path="/find-needs" element={<FindNeeds/>} />
      </Routes>
    </BrowserRouter>
  )
}

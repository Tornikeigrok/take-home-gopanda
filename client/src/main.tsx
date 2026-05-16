import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import React from 'react'

const Dashboard = React.lazy(()=> import("./Dashboard.tsx"));

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path='/' element={<App />}/>

      <Route path='/Dashboard' element={<Suspense  fallback={null}><Dashboard /></Suspense>}/>
    </Routes>
  </BrowserRouter>,
)

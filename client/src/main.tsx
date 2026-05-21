import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { Toaster } from 'react-hot-toast'

const Dashboard = React.lazy(()=> import("./Dashboard.tsx"));
const UserProfile = React.lazy(()=> import("./UserProfile.tsx"));

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Toaster toastOptions={{className: 'text-sm'}} position='top-center' />
    <Routes>
      <Route path='/' element={<App />}/>

      <Route path='/Dashboard' element={<Suspense  fallback={null}><Dashboard /></Suspense>}/>
      <Route path='/UserProfile' element={<Suspense  fallback={null}><UserProfile /></Suspense>}/>
    </Routes>
  </BrowserRouter>
)

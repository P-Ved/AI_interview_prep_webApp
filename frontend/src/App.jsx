import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Login from './Pages/Auth/Login'
import Signup from './Pages/Auth/SignUp'
import LandingPage from './Pages/LandingPage'
import Dashboard from './Pages/Home/Dashboard'
import InterviewPrep from './Pages/InterviewPrep/InterviewPrep'
import UserProvider from './context/Usercontext'

export const App = () => {
  return (
    <UserProvider>
    <div>
      
      <Router>
        <Routes>
          <Route path='/' element={<LandingPage />} />
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Signup />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/interview-prep/:sessionId' element={<InterviewPrep />} />
          <Route path='*' element={<h1 className='text-3xl font-bold underline'>404 Not Found</h1>} />
        </Routes>
      </Router>

      {/* ✅ Correct placement of Toaster */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: '',
          style: {
            border: '1px solid #4BB543',
            padding: '16px',
            color: '#4BB543', 
          },
        }}
      />
    </div>
    </UserProvider>
  )
}

export default App

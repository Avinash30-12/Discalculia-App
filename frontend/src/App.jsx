import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Assessment from './pages/Assessment'
import Results from './pages/Results'
import Activities from './pages/Activities'
import Screening from './pages/Screening'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import './styles/tailwind.css'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route path="/screening" element={<ProtectedRoute><Screening /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../auth'

export default function Navbar() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = getUser()

  const doLogout = () => {
    logout()
    navigate('/', { replace: true })
    setOpen(false)
  }

  // Lock background scroll + ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEsc)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  return (
    <header className="w-full bg-white shadow-sm relative z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold text-primary">
          Number Buddies
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-4">
          <Link to="/assessment" className="hover:text-primary">Assessment</Link>
          <Link to="/screening" className="hover:text-primary">Screening</Link>
          <Link to="/activities" className="hover:text-primary">Activities</Link>
          <Link to="/results" className="hover:text-primary">Results</Link>
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm">
                Hi, <strong>{user.name || user.email}</strong>
              </span>
              <button
                onClick={doLogout}
                className="px-3 py-1 bg-primary text-white rounded-md"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1 border rounded-md">Sign in</Link>
              <Link to="/register" className="px-3 py-1 bg-primary text-white rounded-md">Sign up</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
  className="md:hidden p-2 rounded-md text-black"
  aria-label="Open menu"
  onClick={() => setOpen(true)}
>
  ☰
</button>

      </div>

      {/* ================= MOBILE DRAWER ================= */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />

          {/* Drawer Container */}
          <aside
            className="absolute right-0 top-0 h-full w-full bg-white transform transition-transform duration-300"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5 h-full flex flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-primary">
                  Number Buddies
                </span>
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="text-xl md:hidden p-2 rounded-md text-black"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Navigation */}
          
<nav className="flex-1 space-y-3">
  <Link
    onClick={() => setOpen(false)}
    to="/assessment"
    className="flex items-center gap-3 px-4 py-4 rounded-xl
               bg-gray-100 hover:bg-gray-200 transition
               text-gray-900 hover:text-black"
  >
    <span className="text-xl">🧠</span>
    <span className="font-medium">Assessment</span>
  </Link>

  <Link
    onClick={() => setOpen(false)}
    to="/screening"
    className="flex items-center gap-3 px-4 py-4 rounded-xl
               bg-gray-100 hover:bg-gray-200 transition
               text-gray-900 hover:text-black"
  >
    <span className="text-xl">📝</span>
    <span className="font-medium">Screening</span>
  </Link>

  <Link
    onClick={() => setOpen(false)}
    to="/activities"
    className="flex items-center gap-3 px-4 py-4 rounded-xl
               bg-gray-100 hover:bg-gray-200 transition
               text-gray-900 hover:text-black"
  >
    <span className="text-xl">🎯</span>
    <span className="font-medium">Activities</span>
  </Link>

  <Link
    onClick={() => setOpen(false)}
    to="/results"
    className="flex items-center gap-3 px-4 py-4 rounded-xl
               bg-gray-100 hover:bg-gray-200 transition
               text-gray-900 hover:text-black"
  >
    <span className="text-xl">📊</span>
    <span className="font-medium">Results</span>
  </Link>
</nav>


<div className="my-6 h-px bg-gray-200" />

              {/* Drawer Auth */}
              {/* Drawer Auth Section */}
<div className="mt-auto space-y-3">
  {user ? (
    <div className="bg-gray-50 p-4 rounded-xl">
      <p className="text-sm text-gray-600 mb-3">
        Signed in as <strong>{user.name || user.email}</strong>
      </p>
      <button
        onClick={doLogout}
        className="w-full py-3 rounded-xl bg-primary text-white font-medium"
      >
        Log out
      </button>
    </div>
  ) : (
    <>
      <Link
  to="/login"
  onClick={() => setOpen(false)}
  className="block py-3 rounded-xl border text-center font-medium text-black"
>
  Sign in
</Link>

      <Link
        to="/register"
        onClick={() => setOpen(false)}
        className="block py-3 rounded-xl bg-primary text-white text-center font-medium"
      >
        Sign up
      </Link>
    </>
  )}
</div>
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import client from '../api/client'
import { setToken, setUser } from '../auth'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!email) throw { clientValidation: true, message: 'Email is required' }
      if (!password) throw { clientValidation: true, message: 'Password is required' }

      const res = await client.post('/api/auth/login', { email, password })
      const { token, ...user } = res.data
      setToken(token)
      setUser(user)
      setMessage('Logged in')
      const dest = location.state?.from?.pathname || '/'
      navigate(dest, { replace: true })
    } catch (err) {
      if (err?.clientValidation) {
        setError(err.message)
      } else {
        const msg = err.response?.data?.message || 'Login failed'
        setError(msg)
        setMessage('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full kid-card bg-white rounded-2xl p-6 shadow-sm">
        {/* Heading */}
        <h2 className="text-2xl font-bold mb-2 text-black md:text-gray-800">
          Sign In
        </h2>

        {error && <ErrorBanner message={error} onClose={() => setError('')} />}

        <form onSubmit={submit} className="space-y-4 mt-4">
          {/* Email */}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="
              w-full p-3 rounded-xl border
              bg-white text-black placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary
            "
          />

          {/* Password */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="
              w-full p-3 rounded-xl border
              bg-white text-black placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary
            "
          />

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded-xl flex items-center justify-center font-medium"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size={20} /> : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-4 text-sm text-gray-700">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary font-semibold">
            Create one
          </Link>
        </div>

        {message && (
          <div className="mt-3 text-sm text-green-600">{message}</div>
        )}
      </div>
    </div>
  )
}

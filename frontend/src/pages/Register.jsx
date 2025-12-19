import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { setToken, setUser } from '../auth'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('')
  const [language, setLanguage] = useState('')
  const [educationalBoard, setEducationalBoard] = useState('')
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Client-side validation
      if (!name.trim()) throw { clientValidation: true, message: 'Name is required' }
      if (!email.trim()) throw { clientValidation: true, message: 'Email is required' }
      if (!password || password.trim().length < 6)
        throw { clientValidation: true, message: 'Password must be at least 6 characters' }
      if (!consent)
        throw { clientValidation: true, message: 'Consent is required to create an account' }

      // 🔐 CLEAN + MOBILE-SAFE PAYLOAD
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        age: age ? Number(age) : null,
        grade: grade.trim(),
        language: language.trim(),
        educationalBoard: educationalBoard.trim(),
        consent,
      }

      const res = await client.post('/api/auth/register', payload)

      const { token, ...user } = res.data

      // Storage (safe even on mobile)
      try {
        setToken(token)
        setUser(user)
      } catch (storageErr) {
        console.error('Storage error:', storageErr)
      }

      setMessage('Registered and logged in')
      navigate('/', { replace: true })
    } catch (err) {
  console.log('REGISTER ERROR FULL 👉', err)
  console.log('REGISTER ERROR RESPONSE 👉', err.response)
  console.log('REGISTER ERROR DATA 👉', err.response?.data)

  if (err?.clientValidation) {
    setError(err.message)
  } else {
    setError(
      err.response?.data?.message ||
      JSON.stringify(err.response?.data) ||
      'Registration failed'
    )
  }
}
finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full kid-card bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-3 text-black md:text-gray-800">
          Create Account
        </h2>

        {error && <ErrorBanner message={error} onClose={() => setError('')} />}

        <form onSubmit={submit} className="space-y-4 mt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              type="number"
              className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Grade"
              className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Primary language"
            className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <input
            value={educationalBoard}
            onChange={(e) => setEducationalBoard(e.target.value)}
            placeholder="Educational board (optional)"
            className="w-full p-3 rounded-xl border bg-white text-black placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* ✅ MOBILE-SAFE CONSENT */}
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-5 h-5  md:accent-primary"
            />
            <span>
              I consent to storing my (or my child&apos;s) data for assessment and
              improvement purposes.
            </span>
          </label>

          <button
            className="w-full py-3 bg-primary text-white rounded-xl flex items-center justify-center font-medium"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size={20} /> : 'Create account'}
          </button>
        </form>

        {message && (
          <div className="mt-3 text-sm text-green-600">{message}</div>
        )}
      </div>
    </div>
  )
}

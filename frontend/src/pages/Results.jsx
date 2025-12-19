import React from 'react'
import client from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { detectErrorPatterns } from '../utils/errorAnalysis'

export default function Results() {
  const [results, setResults] = React.useState(null)
  const [error, setError] = React.useState('')
  const [csvLoading, setCsvLoading] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/api/assessments/results')
        setResults(res.data)
      } catch (err) {
        console.error(err)
        setError(err.response?.data?.message || 'Failed to load results')
      }
    })()
  }, [])

  const downloadCSV = async () => {
    setCsvLoading(true)
    try {
      const res = await client.get('/api/assessments/export', { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv' })
      let filename = 'assessment_results.csv'
      const cd = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition']
      if (cd) {
        const match = cd.match(/filename="?([^";]+)"?/) || cd.match(/filename=([^;]+)/)
        if (match) filename = match[1]
      }

      // Mobile-friendly download
      if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
        const reader = new FileReader()
        reader.onload = function (e) {
          const link = document.createElement('a')
          link.href = e.target.result
          link.download = filename
          document.body.appendChild(link)
          link.click()
          link.remove()
        }
        reader.readAsDataURL(blob)
      } else {
        // desktop
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Failed to download CSV', err)
      setError(err.response?.data?.message || 'Failed to download CSV')
    } finally {
      setCsvLoading(false)
    }
  }

  if (!results && !error) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <LoadingSpinner size={48} />
    </div>
  )

  if (Array.isArray(results) && results.length === 0) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-2xl w-full bg-white kid-card text-center p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-2 text-black">No assessments yet</h2>
        <p className="text-black mb-4">You haven't completed any assessments. Start a quick screening or a full assessment to see results and personalized suggestions.</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3">
          <a href="/assessment" className="px-4 py-2 bg-primary text-white rounded-md w-full md:w-auto text-center">Start Assessment</a>
          <a href="/screening" className="px-4 py-2 border rounded-md w-full md:w-auto text-center text-black">Try a Quick Screening</a>
        </div>
      </div>
    </div>
  )

  const trend = [...results].reverse().map((r) => ({
    label: new Date(r.createdAt).toLocaleDateString(),
    value: Math.round(r.scores.total || 0),
    raw: r
  }))

  const latest = results[0]
  const patterns = detectErrorPatterns(latest?.questions || [], latest?.answers || [])

  const domainLabel = (k) => {
    const m = {
      number_sense: 'Number Sense',
      arithmetic: 'Arithmetic',
      spatial: 'Spatial',
      memory: 'Working Memory'
    }
    return m[k] || k
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-4xl w-full kid-card">

        <h2 className="text-2xl font-bold mb-2 text-black">Assessment Results</h2>
        <p className="text-black mb-4">This shows your recent assessments and trends over time.</p>
        {error && <ErrorBanner message={error} onClose={() => setError('')} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Latest Assessment */}
          <div className="p-4 bg-white rounded-xl shadow-sm flex flex-col">
            <h3 className="font-semibold text-black">Latest assessment</h3>
            <div className="text-3xl font-bold text-black">{Math.round(latest.scores.total || 0)}%</div>
            <div className="text-sm text-black">Risk: <strong>{latest.dyscalculiaRiskIndex}</strong> · Confidence: {Math.round(latest.confidenceScore || 0)}%</div>

            <div className="mt-3">
              <h4 className="font-semibold mb-2 text-black">Domain breakdown</h4>
              <div className="w-full h-36">
                <BarChart data={latest.scores} />
              </div>

              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-black">Detected error patterns</div>
                <div className="text-xs text-black mt-1">Number reversals: {patterns.numberReversal} · Symbol confusion: {patterns.symbolConfusion} · Sequencing errors: {patterns.sequencingError}</div>
                <div className="text-xs text-black mt-2">These are simple heuristics — use them as a guide. For more detailed analysis, enable extended logging in settings.</div>
              </div>

              {latest.subtypeCounts && Object.keys(latest.subtypeCounts).length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-black">Subtype breakdown</div>
                  <div className="text-xs text-black mt-2 space-y-2">
                    {Object.entries(latest.subtypeCounts).map(([domain, subs]) => (
                      <div key={domain} className="flex items-start gap-3">
                        <div className="w-36 text-sm text-black">{domainLabel(domain)}</div>
                        <div className="flex-1 text-xs text-black">
                          {Object.entries(subs).map(([sub, count]) => (
                            <div key={sub} className="inline-block mr-3"><strong>{sub}</strong>: {count}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trend */}
          <div className="p-4 bg-white rounded-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-black">Trend (last {results.length} assessments)</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-3 py-1 bg-primary text-white rounded-md">Export / Print</button>
                <button onClick={downloadCSV} className="px-3 py-1 border rounded-md flex items-center gap-2 text-black">
                  {csvLoading ? <LoadingSpinner size={16} /> : 'Download CSV'}
                </button>
              </div>
            </div>
            <div className="mt-4 flex-1">
              <TrendChart data={trend} />
            </div>
          </div>
        </div>

        {/* Past assessments */}
        <div>
          <h4 className="font-semibold mb-2 text-black">Past assessments</h4>
          <ul className="space-y-3">
            {results.map(r => (
              <li key={r._id} className="p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-black">Score: {Math.round(r.scores.total || 0)}%</div>
                    <div className="text-sm text-black">Risk: {r.dyscalculiaRiskIndex} · Confidence: {Math.round(r.confidenceScore || 0)}%</div>
                  </div>
                  <div className="text-sm text-black">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ================= CHART HELPERS ================= */

function TrendChart({ data = [] }) {
  if (!data.length) return <div className="text-sm text-black">No trend data</div>
  const w = 400, h = 140, padding = 30
  const maxVal = Math.max(...data.map(d => d.value), 100)
  const stepX = (w - padding * 2) / Math.max(1, data.length - 1)

  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const y = h - padding - ((d.value / maxVal) * (h - padding * 2))
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
      <polyline points={points} fill="none" stroke="#4f46e5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = padding + i * stepX
        const y = h - padding - ((d.value / maxVal) * (h - padding * 2))
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="#4f46e5" />
            <text x={x} y={h - 6} fontSize="10" fill="#000" textAnchor="middle">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function BarChart({ data = {} }) {
  const ordered = ['number_sense', 'arithmetic', 'spatial', 'memory']
  const labelMap = {
    number_sense: 'Number Sense',
    arithmetic: 'Arithmetic',
    spatial: 'Spatial',
    memory: 'Working Memory'
  }

  const getValue = (k) => {
    if (k in data) return Number(data[k] || 0)
    const camel = k.replace(/_([a-z])/g, g => g[1].toUpperCase())
    if (camel in data) return Number(data[camel] || 0)
    return 0
  }

  const getColor = (v) => {
    if (v >= 75) return 'bg-emerald-500'
    if (v >= 50) return 'bg-yellow-500'
    return 'bg-rose-500'
  }

  return (
    <div className="space-y-3">
      {ordered.map((key) => {
        const v = Math.round(getValue(key) || 0)
        const label = labelMap[key] || key
        return (
          <div key={key} className="flex items-center gap-4">
            <div className="w-36 text-sm text-black">{label}</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} score`}>
                <div className={`${getColor(v)} h-4`} style={{ width: `${v}%` }} />
              </div>
            </div>
            <div className="w-12 text-right text-sm font-semibold text-black">{v}%</div>
          </div>
        )
      })}
      <div className="mt-2 text-xs text-black">Legend: green (good) · yellow (average) · red (needs support)</div>
    </div>
  )
}

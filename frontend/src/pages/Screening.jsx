import React, { useState, useEffect, useRef } from 'react'
import client from '../api/client'
import { getUser } from '../auth'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useNavigate } from 'react-router-dom'

export default function Screening(){
  const navigate = useNavigate()
  const SUBTEST_QUESTIONS = 6 // per domain

  const [phase, setPhase] = useState('menu') // menu | running | review
  const [domain, setDomain] = useState(null)
  const [subtype, setSubtype] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)
  const startTsRef = useRef(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    return ()=> clearInterval(timerRef.current)
  }, [])

  const domainConfigs = {
    number_sense: { label: 'Number Sense', time: 12, generator: genNumberSense },
    arithmetic: { label: 'Arithmetic', time: 15, generator: genArithmetic },
    spatial: { label: 'Spatial Reasoning', time: 18, generator: genSpatial },
    memory: { label: 'Memory', time: 10, generator: genMemory }
  }

  function startDomain(d){
    setDomain(d)
    setSubtype(null)
    setPhase('running')
    setQuestionIndex(0)
    const q = domainConfigs[d].generator(1, 0)
    setQuestions([q])
    setAnswers([])
    setSecondsLeft(domainConfigs[d].time)
    startTsRef.current = Date.now()
  }

  function startSubtest(d, subtype){
    setDomain(d)
    setSubtype(subtype)
    setPhase('running')
    setQuestionIndex(0)
    const q = domainConfigs[d].generator(1, 0, subtype)
    if (!q) {
      const fallback = { localId: `fallback-${Date.now()}`, questionType: d, questionText: 'Error generating question — try again', options: [{ text: 'OK' }], correctAnswer: null, difficulty: 1 }
      setQuestions([fallback])
    } else {
      setQuestions([q])
    }
    setAnswers([])
    setSecondsLeft(domainConfigs[d].time)
    startTsRef.current = Date.now()
  }

  useEffect(()=>{
    if(phase !== 'running') return
    clearInterval(timerRef.current)
    setSecondsLeft(domainConfigs[domain].time)
    timerRef.current = setInterval(()=>{
      setSecondsLeft(s => {
        if(s <= 1){
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return s-1
      })
    }, 1000)
    return ()=> clearInterval(timerRef.current)
  }, [phase, domain, questionIndex])

  useEffect(() => {
    if(phase !== 'running') return
    const q = questions[questionIndex]
    if(q && q.speechText && typeof window !== 'undefined' && window.speechSynthesis){
      try{
        const utter = new SpeechSynthesisUtterance(q.speechText)
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utter)
      }catch(e){}
    }
  }, [phase, questionIndex, questions])

  const playSpeech = (text) => {
    const t = text || (questions[questionIndex] && questions[questionIndex].speechText)
    if(!t || typeof window === 'undefined' || !window.speechSynthesis) return
    try{
      const utter = new SpeechSynthesisUtterance(t)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }catch(e){}
  }

  const handleTimeout = () => {
    selectInternal(null, domainConfigs[domain].time * 1000)
  }

  const select = (opt) => {
    const rt = Date.now() - startTsRef.current
    selectInternal(opt, rt)
  }

  const selectInternal = (opt, responseTime) => {
    setAnswers(a => [...a, { questionId: questions[questionIndex].localId, selected: opt, responseTime }])
    const wasCorrect = opt !== null && String(opt) === String(questions[questionIndex].correctAnswer)
    let nextDifficulty = Math.min(5, Math.max(1, questions[questionIndex].difficulty + (wasCorrect ? 1 : -1)))

    if(questionIndex < SUBTEST_QUESTIONS - 1){
      const nextQ = domainConfigs[domain].generator(nextDifficulty, questionIndex+1, subtype)
      setQuestions(qs => [...qs, nextQ])
      setQuestionIndex(i => i+1)
      startTsRef.current = Date.now()
    } else {
      setPhase('review')
    }
  }

  const submitSubtest = async () => {
    setSubmitting(true)
    setError('')
    try{
      const questionsPayload = questions.map(q => ({
        questionType: q.questionType,
        questionText: q.questionText,
        options: (q.options||[]).map(o => ({ text: String(o.text||o), image: o.image||'', isCorrect: !!o.isCorrect })),
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
        subtype: q.subtype ?? subtype ?? null,
        images: q.images ?? []
      }))
      const startRes = await client.post('/api/assessments/start', { userId: getUser()?._id, questions: questionsPayload })
      const assessment = startRes.data
      const mappedAnswers = answers.map((a, idx) => ({ questionId: assessment.questions[idx]?._id || null, selectedAnswer: a.selected, responseTime: a.responseTime || 0 }))
      await client.post('/api/assessments/submit', { assessmentId: assessment._id, answers: mappedAnswers })
      navigate('/results')
    }catch(err){
      setError(err.response?.data?.message || 'Failed to submit subtest')
    }finally{
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen p-6 flex items-start justify-center">
      <div className="max-w-4xl w-full kid-card">
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-2 text-black">Screening & Short Assessments</h2>
          <p className="text-black text-sm mb-4">Quick adaptive screening across multiple domains. Designed to be language-neutral and game-like.</p>

          {error && <ErrorBanner message={error} onClose={() => setError('')} />}

          {phase === 'menu' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.keys(domainConfigs).map(k => (
                  <div key={k} className="p-4 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-black">{domainConfigs[k].label}</div>
                        <div className="text-xs mt-1 text-black">Short {domainConfigs[k].label} screening — {SUBTEST_QUESTIONS} questions</div>
                      </div>
                      <div>
                        <button onClick={() => startDomain(k)} className="px-3 py-1 rounded-md bg-primary text-white">Start</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-black">Symbol–Quantity & Transcoding (Interactive)</div>
                    <div className="text-xs mt-1 text-black">Interactive tasks: spoken-word mapping, picture-to-number, and numeral reading/writing.</div>
                  </div>
                  <div>
                    <button onClick={() => startSubtest('number_sense','symbol_quantity')} className="px-3 py-1 rounded-md bg-primary text-white">Start Test</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === 'running' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-black">{domainConfigs[domain].label}</div>
                <div className="text-sm text-black">Question {questionIndex+1} of {SUBTEST_QUESTIONS} • Time left: {secondsLeft}s</div>
              </div>
              <div className="p-4 bg-gradient-to-r from-white to-soft rounded-2xl">
                <div className="mb-2 flex items-center gap-3">
                  <div className="text-xl flex-1 text-black">{questions[questionIndex]?.questionText}</div>
                  {questions[questionIndex]?.speechText && (
                    <button onClick={() => playSpeech()} aria-label="Play audio" className="px-3 py-1 rounded-md border bg-white text-sm text-black">Play</button>
                  )}
                </div>
                {questions[questionIndex]?.images && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {questions[questionIndex].images.map((src, i) => (
                      <img key={i} src={src} alt={`item-${i}`} className="w-16 h-16 rounded-md" />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
  {(questions[questionIndex]?.options || []).map((opt, i) => (
    <button
      key={i}
      onClick={() => select(opt.text ?? opt)}
      className="py-3 px-4 bg-primary/10 rounded-xl border-2 border-transparent hover:border-primary text-black"
      disabled={submitting}
    >
      {opt.text ?? opt}
    </button>
  ))}
</div>

              </div>
            </div>
          )}

          {phase === 'review' && (
            <div className="mt-4">
              <div className="text-sm text-black mb-3">Review your answers and submit this short screening so results can be saved.</div>
              <div className="space-y-2">
                {questions.map((q, i) => {
                  const a = answers[i]
                  const correct = String(q.correctAnswer)
                  const selected = a?.selected ?? null
                  return (
                    <div key={q.localId} className="p-3 bg-white rounded-md flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-black">{q.questionText}</div>
                        <div className="text-xs text-black">Your answer: <strong>{selected ?? '—'}</strong> • Correct: <strong>{correct}</strong></div>
                      </div>
                      <div>
                        <div className={`px-2 py-1 rounded ${String(selected) === correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{String(selected) === correct ? 'Correct' : 'Incorrect'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setPhase('running'); setQuestionIndex(0); startTsRef.current = Date.now() }} className="px-3 py-1 rounded-md border">Continue</button>
                <button onClick={submitSubtest} className="px-3 py-1 rounded-md bg-primary text-white">{submitting ? <LoadingSpinner size={16} /> : 'Submit subtest'}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// --- domain generators remain unchanged ---

// --- generators for each domain ---
function genNumberSense(difficulty = 1, idx = 0, subtype){
  // helper to build plausible distractors for numeric answers
  function buildNumericOptions(correctVal, count = 4){
    const n = Number(correctVal)
    const opts = new Set([String(correctVal)])
    // transposition for two-digit numbers: 23 -> 32
    if(!Number.isNaN(n) && Math.abs(n) >= 10 && Math.abs(n) < 100){
      const s = String(Math.abs(n))
      if(s.length === 2){
        const trans = Number(s.split('').reverse().join('')) * (n<0?-1:1)
        opts.add(String(trans))
      }
    }
    // place-value confusions: off-by-ten or off-by-hundred
    if(!Number.isNaN(n)){
      opts.add(String(n + 10))
      opts.add(String(Math.max(0, n - 10)))
      opts.add(String(n + 100))
      // swap adjacent digits for 3+ digit numbers
      const s = String(Math.abs(n))
      if(s.length >= 3){
        const arr = s.split('')
        const i = Math.max(0, Math.min(arr.length-2, 1))
        const swapped = arr.slice()
        const tmp = swapped[i]; swapped[i] = swapped[i+1]; swapped[i+1] = tmp
        opts.add(String(Number(swapped.join('')) * (n<0?-1:1)))
      }
    }
    // add small random offsets as distractors
    while(opts.size < count){
      const delta = Math.random() > 0.5 ? randInt(1, Math.max(1, Math.round(Math.abs(Number(correctVal))/3))) : -randInt(1, Math.max(1, Math.round(Math.abs(Number(correctVal))/3)))
      opts.add(String(Math.max(0, Number(correctVal) + delta)))
    }
    return Array.from(opts).slice(0, count).map(v => ({ text: String(v), isCorrect: String(v) === String(correctVal) }))
  }

  // symbol-quantity and transcoding specialized tasks
  if(subtype === 'symbol_quantity'){
    // choose between audio spoken-number mapping, picture-count, or numeral-reading
    const pick = Math.random()
    if(pick < 0.35){
      // spoken words -> numeral (audio playback handled in component)
      const val = randInt(0, Math.min(999, Math.pow(10, Math.min(3, difficulty + 1)) - 1))
      const words = numberToWords(val)
      const text = `Listen and choose the numeral that matches the spoken number.`
  const options = buildNumericOptions(val, 4)
      return { localId: `sq-audio-${Date.now()}-${idx}`, questionType: 'number_sense', questionText: text, options, correctAnswer: String(val), difficulty, speechText: words }
    } else if(pick < 0.7){
      // picture count: show N copies of an object
      const n = randInt(1, Math.min(8, difficulty * 3))
      const fruits = ['apple','banana','orange','grapes']
      const fruit = fruits[idx % fruits.length]
      const images = Array.from({length: n}, (_,i) => `/images/${fruit}.svg`)
      const text = `How many ${fruit}s are shown?`
  const options = buildNumericOptions(n, 4)
      // Make sure the prompt is spoken (do not include the answer in speech)
      return { localId: `sq-pic-${Date.now()}-${idx}`, questionType: 'number_sense', questionText: text, options, correctAnswer: String(n), difficulty, images, speechText: text }
    } else {
      // numeral reading/writing: show number words or place-value prompt
      const val = randInt(0, Math.min(999, Math.pow(10, Math.min(3, difficulty + 1)) - 1))
      const words = numberToWords(val)
      const text = Math.random() > 0.5 ? `Which numeral matches: "${words}"?` : `Which word matches the numeral: ${val}?`
      if(text.startsWith('Which numeral')){
  const options = buildNumericOptions(val, 4)
        // speak the words so the child hears the spoken number
        return { localId: `sq-read-${Date.now()}-${idx}`, questionType: 'number_sense', questionText: text, options, correctAnswer: String(val), difficulty, speechText: words }
      } else {
  // for word options, use word forms of nearby numbers including place-value confusions
  const nearby = []
  nearby.push(numberToWords(Math.max(0, val + 10)))
  nearby.push(numberToWords(Math.max(0, val - 10)))
  nearby.push(numberToWords(Math.max(0, val + 1)))
  const opts = new Set([words, ...nearby])
  while(opts.size < 4) opts.add(numberToWords(Math.max(0, val + (Math.random()>0.5 ? randInt(1,20) : -randInt(1,20)))))
  const options = Array.from(opts).map(v => ({ text: v, isCorrect: v === words }))
        // speak the numeral as words so the prompt is spoken for this variant
        return { localId: `sq-read-${Date.now()}-${idx}`, questionType: 'number_sense', questionText: text, options, correctAnswer: words, difficulty, speechText: numberToWords(val) }
      }
    }
  }

  // fallback: original comparison or missing number
  const a = randInt(1, Math.pow(10, difficulty))
  const b = randInt(1, Math.pow(10, difficulty))
  if(Math.random() > 0.5){
    const correct = a > b ? '>' : (a < b ? '<' : '=')
    const text = `${a}  ?  ${b}`
    const options = ['>', '<', '='].map(s => ({ text: s, isCorrect: s === correct }))
    return { localId: `n-${Date.now()}-${idx}`, questionType: 'number_sense', questionText: text, options, correctAnswer: correct, difficulty }
  } else {
    const missing = randInt(1, Math.max(3, Math.floor(a/2)+1))
    const total = a + missing
    const text = `${a} + ? = ${total}`
    const correct = String(missing)
    const opts = new Set([correct])
    while(opts.size < 4) opts.add(String(randInt(0, Math.max(3, Math.floor(total/2)))))
    const options = Array.from(opts).map(v => ({ text: v, isCorrect: v === correct }))
    return { localId: `n-${Date.now()}-${idx}`, questionType: 'number_sense', questionText: text, options, correctAnswer: correct, difficulty }
  }
}

function genArithmetic(difficulty = 1, idx = 0){
  // reuse arithmetic logic similar to Assessment.generateQuestion
  const a = randInt(1, Math.max(4, Math.pow(10, difficulty-1)))
  const b = randInt(1, Math.max(3, Math.pow(10, Math.max(0, difficulty-2))))
  const op = difficulty < 3 ? '+' : (difficulty < 5 ? '×' : '+')
  const text = op === '+' ? `${a} + ${b} = ?` : `${a} × ${b} = ?`
  const correct = op === '+' ? a + b : a * b
  const opts = new Set([String(correct)])
  while(opts.size < 4) opts.add(String(Math.max(0, correct + (Math.random()>0.5 ? randInt(1,3) : -randInt(1,3)))))
  const options = Array.from(opts).sort(()=> Math.random()-0.5).map(v => ({ text: v, isCorrect: v === String(correct) }))
    return { localId: `a-${Date.now()}-${idx}`, questionType: 'arithmetic', questionText: text, options, correctAnswer: String(correct), difficulty }
}

function genSpatial(difficulty = 1, idx = 0){
  // language neutral: shapes and counts
  const shapes = ['▲','■','●','◆']
  const shape = shapes[randInt(0, shapes.length-1)]
  const count = randInt(1, Math.min(9, difficulty * 3))
  const text = `${shape}  x ${count}  = ?` // visual symbols
  const correct = String(count)
  const opts = new Set([correct])
  while(opts.size < 4) opts.add(String(randInt(0, Math.max(3, count+3))))
  const options = Array.from(opts).map(v => ({ text: v, isCorrect: v === correct }))
    return { localId: `s-${Date.now()}-${idx}`, questionType: 'spatial', questionText: text, options, correctAnswer: correct, difficulty }
}

function genMemory(difficulty = 1, idx = 0){
  // short sequence recall: show a short sequence of digits then ask next
  const len = Math.min(6, 2 + difficulty)
  const seq = Array.from({length: len}, ()=> randInt(0,9)).join(' ')
  // ask e.g. what was the 2nd item
  const pos = randInt(1, len)
  const correct = seq.split(' ')[pos-1]
  const text = `Remember: ${seq}  — What was item ${pos}?`
  const opts = new Set([String(correct)])
  while(opts.size < 4) opts.add(String(randInt(0,9)))
  const options = Array.from(opts).map(v => ({ text: v, isCorrect: v === String(correct) }))
    return { localId: `m-${Date.now()}-${idx}`, questionType: 'memory', questionText: text, options, correctAnswer: String(correct), difficulty }
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// simple number to words converter for 0..999 (English, basic)
function numberToWords(n){
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  n = Number(n) || 0
  if(n < 20) return ones[n]
  if(n < 100){
    const t = Math.floor(n/10)
    const r = n % 10
    return tens[t] + (r ? ' ' + ones[r] : '')
  }
  const h = Math.floor(n/100)
  const rem = n % 100
  return ones[h] + ' hundred' + (rem ? ' ' + numberToWords(rem) : '')
}

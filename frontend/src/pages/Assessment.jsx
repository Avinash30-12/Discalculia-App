import { useState, useEffect, useRef } from 'react'
import client from '../api/client'
import { getUser } from '../auth'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useNavigate } from 'react-router-dom'

export default function Assessment() {
  const TOTAL_QUESTIONS = 8
  const TIMER_SECONDS = 20

  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const timerRef = useRef(null)
  const startTsRef = useRef(Date.now())
  const navigate = useNavigate()

  useEffect(() => {
    const first = generateAdaptiveQuestion(2, 0)
    setQuestions([first])
    setCurrent(first)
    startTsRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!current) return
    clearInterval(timerRef.current)
    setSecondsLeft(TIMER_SECONDS)

    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [current])

  const handleTimeout = () => {
    selectInternal(null, TIMER_SECONDS * 1000)
  }

  const select = (opt) => {
    const responseTime = Date.now() - startTsRef.current
    selectInternal(opt, responseTime)
  }

  const selectInternal = (opt, responseTime) => {
    setAnswers(a => [...a, { selected: opt, responseTime }])

    const wasCorrect = opt !== null && String(opt) === String(current.correctAnswer)
    const quick = responseTime < 5000
    let nextDifficulty = Math.min(
      5,
      Math.max(1, current.difficulty + (wasCorrect && quick ? 1 : 0) - (!wasCorrect ? 1 : 0))
    )

    if (questionIndex < TOTAL_QUESTIONS - 1) {
      const nextQ = generateAdaptiveQuestion(nextDifficulty, questionIndex + 1)
      setQuestions(q => [...q, nextQ])
      setCurrent(nextQ)
      setQuestionIndex(i => i + 1)
      startTsRef.current = Date.now()
    } else {
      submitAssessment()
    }
  }

  const submitAssessment = async () => {
    setSubmitting(true)
    try {
      const questionsPayload = questions.map(q => ({
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty
      }))

      const startRes = await client.post('/api/assessments/start', {
        userId: getUser()?._id,
        questions: questionsPayload
      })

      const assessmentId = startRes.data._id

      const mappedAnswers = answers.map((a, idx) => ({
        questionId: startRes.data.questions[idx]?._id,
        selectedAnswer: a.selected,
        responseTime: a.responseTime,
        attempts: 1
      }))

      await client.post('/api/assessments/submit', {
        assessmentId,
        answers: mappedAnswers
      })

      navigate('/results', { replace: true })
    } catch (err) {
      const serverMsg = err?.response?.data?.message
      setError(serverMsg || 'Failed to submit assessment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full kid-card">
        <div className="flex justify-between mb-3">
          <h2 className="text-2xl font-bold">Assessment</h2>
          <span>Q {questionIndex + 1}/{TOTAL_QUESTIONS}</span>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="mb-3 text-lg">{current?.questionText}</div>
        <div className="text-sm mb-3">Difficulty: {current?.difficulty} | ⏱ {secondsLeft}s</div>

        {/* DOT QUESTIONS - render if dots count present */}
        {current?.dots && (
          <div className="flex gap-2 flex-wrap mb-4">
            {Array.from({ length: current.dots }).map((_, i) => (
              <div key={i} className="w-5 h-5 bg-blue-500 rounded-full" />
            ))}
          </div>
        )}

        {/* SHAPE & COLOR - render if shapes array present */}
        {current?.shapes && (
          <div className="flex gap-4 mb-4">
            {current.shapes.map((s, i) => (
              <div
                key={i}
                className={`w-12 h-12 ${s.color} ${s.shape}`}
              />
            ))}
          </div>
        )}

        {/* IMAGE QUESTION - render if image available */}
        {current?.image && (
          (typeof current.image === 'string' && current.image.length > 0) ? (
            <img src={current.image} alt={current.questionText || 'question image'} className="w-40 mb-4 rounded-xl" />
          ) : (
            <div className="w-40 h-24 mb-4 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">No image</div>
          )
        )}

        <div className="grid grid-cols-2 gap-3">
          {(current?.options || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => select(opt.text)}
              disabled={submitting}
              className="py-3 px-4 rounded-xl bg-primary/10 hover:border-primary border-2"
            >
              {submitting ? <LoadingSpinner size={18} /> : opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================= HELPERS ================= */

function generateAdaptiveQuestion(difficulty, idx) {
  const types = [
    'arithmetic',
    'count_dots',
    'comparison',
    'missing',
    'image_based',
    'shape_color'
  ]
  const type = types[randInt(0, types.length - 1)]

  switch (type) {
    case 'count_dots': return generateCountDots(difficulty, idx)
    case 'comparison': return generateComparison(difficulty, idx)
    case 'missing': return generateMissing(difficulty, idx)
    case 'image_based': return generateImageQuestion(difficulty, idx)
    case 'shape_color': return generateShapeColor(difficulty, idx)
    default: return generateArithmetic(difficulty, idx)
  }
}

function generateArithmetic(difficulty, idx) {
  const a = randInt(1, difficulty * 5)
  const b = randInt(1, difficulty * 5)
  const correct = a + b
  return build(` ${a} + ${b} = ?`, correct, difficulty, idx)
}

function generateCountDots(difficulty, idx) {
  const dots = randInt(3, difficulty * 4)
  return {
    ...build('How many dots?', dots, difficulty, idx),
    // normalize to backend enum
    questionType: 'number_sense',
    dots
  }
}

function generateComparison(difficulty, idx) {
  const a = randInt(1, difficulty * 10)
  const b = randInt(1, difficulty * 10)
  const correct = a > b ? '>' : '<'
  // comparison questions map to number sense domain
  return { ...build(`${a} ? ${b}`, correct, difficulty, idx, ['>', '<']), questionType: 'number_sense' }
}

function generateMissing(difficulty, idx) {
  const start = randInt(1, 10)
  const step = randInt(1, difficulty + 1)
  const correct = start + step * 2
  // sequence/missing number -> number sense
  return { ...build(`Find missing: ${start}, ${start + step}, ?, ${start + step * 3}`, correct, difficulty, idx), questionType: 'number_sense' }
}

function generateImageQuestion(difficulty, idx) {
  const correct = 'Apple'
  return {
    localId: `img-${idx}`,
    // visual recognition -> spatial domain
    questionType: 'spatial',
    questionText: 'Which fruit is this?',
    // Use one of the public images under /public/images
    image: `/images/${['apple','banana','orange','grapes'][idx % 4]}.svg`,
    options: [
      { text: 'Apple', isCorrect: true },
      { text: 'Banana' },
      { text: 'Orange' },
      { text: 'Grapes' }
    ],
    correctAnswer: correct,
    difficulty
  }
}

function generateShapeColor(difficulty, idx) {
  const correct = 'Red'
  return {
    localId: `shape-${idx}`,
    // shapes/colors -> spatial reasoning
    questionType: 'spatial',
    questionText: 'What color are the shapes?',
    shapes: [
      { shape: 'rounded-full', color: 'bg-red-500' },
      { shape: 'rounded-full', color: 'bg-red-500' }
    ],
    options: generateOptions(correct),
    correctAnswer: correct,
    difficulty
  }
}

function build(text, correct, difficulty, idx, opts) {
  return {
    localId: `q-${idx}`,
    questionType: 'arithmetic',
    questionText: text,
    options: opts ? opts.map(o => ({ text: o })) : generateOptions(correct),
    correctAnswer: String(correct),
    difficulty
  }
}

function generateOptions(correct) {
  const set = new Set([correct])
  while (set.size < 4) set.add(correct + randInt(-5, 5))
  return [...set].map(v => ({ text: String(v) })).sort(() => Math.random() - 0.5)
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

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

  /* ================= INIT ================= */
  useEffect(() => {
    const first = generateAdaptiveQuestion(2, 0)
    setQuestions([first])
    setCurrent(first)
    startTsRef.current = Date.now()

    return () => clearInterval(timerRef.current)
  }, [])

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!current) return

    clearInterval(timerRef.current)
    setSecondsLeft(TIMER_SECONDS)

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          setTimeout(() => handleTimeout(), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [current])

  /* ================= HANDLERS ================= */
  const handleTimeout = () => {
    handleSelect(null, TIMER_SECONDS * 1000)
  }

  const select = (opt) => {
    if (submitting) return
    const responseTime = Date.now() - startTsRef.current
    handleSelect(opt, responseTime)
  }

  const handleSelect = (opt, responseTime) => {
    setAnswers((prev) => {
      const updated = [...prev, { selected: opt, responseTime }]

      if (questionIndex < TOTAL_QUESTIONS - 1) {
        const wasCorrect =
          opt !== null && String(opt) === String(current.correctAnswer)
        const quick = responseTime < 5000

        const nextDifficulty = Math.min(
          5,
          Math.max(
            1,
            current.difficulty +
              (wasCorrect && quick ? 1 : 0) -
              (!wasCorrect ? 1 : 0)
          )
        )

        const nextQ = generateAdaptiveQuestion(
          nextDifficulty,
          questionIndex + 1
        )
        setQuestions((q) => [...q, nextQ])
        setCurrent(nextQ)
        setQuestionIndex((i) => i + 1)
        startTsRef.current = Date.now()
      } else {
        submitAssessment(updated)
      }

      return updated
    })
  }

  /* ================= SUBMIT ================= */
  const submitAssessment = async (finalAnswers) => {
    if (submitting) return
    setSubmitting(true)

    try {
      questions.forEach((q, i) => {
        if (!q.questionType) {
          throw new Error(`Question ${i} missing questionType`)
        }
      })

      const questionsPayload = questions.map((q) => ({
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
      }))

      const startRes = await client.post('/api/assessments/start', {
        userId: getUser()?._id,
        questions: questionsPayload,
      })

      const assessmentId = startRes.data._id

      const mappedAnswers = finalAnswers.map((a, idx) => ({
        questionId: startRes.data.questions[idx]?._id,
        selectedAnswer: a.selected,
        responseTime: a.responseTime,
        attempts: 1,
      }))

      await client.post('/api/assessments/submit', {
        assessmentId,
        answers: mappedAnswers,
      })

      navigate('/results', { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to submit assessment')
    } finally {
      setSubmitting(false)
    }
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-black">
      <div className="max-w-3xl w-full bg-white rounded-2xl p-5 shadow-sm text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-black">Assessment</h2>
          <span className="text-sm text-black">
            Q {questionIndex + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="mb-3 text-lg font-medium text-black">
          {current?.questionText}
        </div>

        <div className="text-sm mb-4 text-black">
          Difficulty: {current?.difficulty} | ⏱ {secondsLeft}s
        </div>

        {current?.dots && (
          <div className="flex gap-2 flex-wrap mb-4">
            {Array.from({ length: current.dots }).map((_, i) => (
              <div key={i} className="w-5 h-5 bg-blue-500 rounded-full" />
            ))}
          </div>
        )}

        {current?.shapes && (
          <div className="flex gap-4 mb-4">
            {current.shapes.map((s, i) => (
              <div key={i} className={`w-12 h-12 ${s.color} ${s.shape}`} />
            ))}
          </div>
        )}

        {current?.image && (
          <img
            src={current.image}
            alt="question"
            loading="lazy"
            width={160}
            height={160}
            className="w-40 mb-4 rounded-xl border"
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          {(current?.options || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => select(opt.text)}
              disabled={submitting}
              className="py-3 px-4 rounded-xl border-2 border-gray-300 font-medium text-black hover:border-primary hover:bg-primary/10 transition"
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
    'shape_color',
  ]
  const type = types[randInt(0, types.length - 1)]

  switch (type) {
    case 'count_dots':
      return generateCountDots(difficulty, idx)
    case 'comparison':
      return generateComparison(difficulty, idx)
    case 'missing':
      return generateMissing(difficulty, idx)
    case 'image_based':
      return generateImageQuestion(difficulty, idx)
    case 'shape_color':
      return generateShapeColor(difficulty, idx)
    default:
      return generateArithmetic(difficulty, idx)
  }
}

function generateArithmetic(difficulty, idx) {
  const a = randInt(1, difficulty * 5)
  const b = randInt(1, difficulty * 5)
  return build(`${a} + ${b} = ?`, a + b, difficulty, idx, 'arithmetic')
}

function generateCountDots(difficulty, idx) {
  const dots = randInt(3, difficulty * 4)
  return { ...build('How many dots?', dots, difficulty, idx, 'number_sense'), dots }
}

function generateComparison(difficulty, idx) {
  const a = randInt(1, difficulty * 10)
  const b = randInt(1, difficulty * 10)
  return build(`${a} ? ${b}`, a > b ? '>' : '<', difficulty, idx, 'number_sense')
}

function generateMissing(difficulty, idx) {
  const start = randInt(1, 10)
  const step = randInt(1, difficulty + 1)
  return build(
    `Find missing: ${start}, ${start + step}, ?, ${start + step * 3}`,
    start + step * 2,
    difficulty,
    idx,
    'number_sense'
  )
}

function generateImageQuestion(difficulty, idx) {
  const fruits = ['Apple', 'Banana', 'Orange', 'Grapes']
  return {
    localId: `img-${idx}`,
    questionType: 'spatial',
    questionText: 'Which fruit is this?',
    image: `/images/${fruits[idx % fruits.length].toLowerCase()}.svg`,
    options: fruits.map((f) => ({ text: f })),
    correctAnswer: fruits[idx % fruits.length],
    difficulty,
  }
}

function generateShapeColor(difficulty, idx) {
  return {
    localId: `shape-${idx}`,
    questionType: 'spatial',
    questionText: 'What color are the shapes?',
    shapes: [
      { shape: 'rounded-full', color: 'bg-red-500' },
      { shape: 'rounded-full', color: 'bg-red-500' },
    ],
    options: generateOptions('Red'),
    correctAnswer: 'Red',
    difficulty,
  }
}

function build(text, correct, difficulty, idx, questionType) {
  return {
    localId: `q-${idx}`,
    questionType,
    questionText: text,
    options: generateOptions(String(correct)),
    correctAnswer: String(correct),
    difficulty,
  }
}

function generateOptions(correct) {
  if (!isNaN(Number(correct))) {
    const set = new Set([String(correct)])
    while (set.size < 4) {
      set.add(String(Number(correct) + randInt(-5, 5)))
    }
    return [...set].map((v) => ({ text: v })).sort(() => Math.random() - 0.5)
  }

  const pool = ['Red', 'Blue', 'Green', 'Yellow', 'Apple', 'Banana', 'Orange', 'Grapes', '>', '<']
  const set = new Set([correct])

  while (set.size < 4) {
    set.add(pool[randInt(0, pool.length - 1)])
  }

  return [...set].map((v) => ({ text: v })).sort(() => Math.random() - 0.5)
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

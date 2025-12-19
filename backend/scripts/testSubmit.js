// Quick test runner to reproduce submitAssessment server-side without HTTP/auth
// Usage: node backend/scripts/testSubmit.js

require('dotenv').config()
const connectDB = require('../config/db')
const mongoose = require('mongoose')
const Assessment = require('../models/assessment')
const Result = require('../models/result')
const { submitAssessment } = require('../controllers/assessmentController')

async function run(){
  await connectDB()
  console.log('Connected DB for test')

  // create a lightweight assessment with two questions
  const fakeUserId = new mongoose.Types.ObjectId()
  const q1 = { questionType: 'number_sense', questionText: '2 + 2 = ?', correctAnswer: '4', options: [{ text: '3' }, { text: '4', isCorrect: true }, { text: '5' }], difficulty: 1 }
  const q2 = { questionType: 'arithmetic', questionText: '5 - 3 = ?', correctAnswer: '2', options: [{ text: '2', isCorrect: true }, { text: '3' }], difficulty: 1 }

  const assessment = await Assessment.create({ userId: fakeUserId, questions: [q1, q2], status: 'in_progress' })
  console.log('Created assessment', assessment._id)

  // build answers payload that mimics frontend mapping (questionId from assessment.questions)
  const answers = assessment.questions.map((q, i) => ({ questionId: q._id.toString(), selectedAnswer: q.correctAnswer }))

  // craft req/res
  const req = { body: { assessmentId: assessment._id.toString(), answers }, user: { id: fakeUserId.toString() } }
  const res = {
    statusCode: 200,
    status(code){ this.statusCode = code; return this },
    json(obj){ console.log('RESULT JSON (status', this.statusCode, '):', JSON.stringify(obj, null, 2)); return obj }
  }

  try{
    await submitAssessment(req, res)
  }catch(e){
    console.error('submitAssessment threw:', e)
  }finally{
    // cleanup created documents
    await Assessment.findByIdAndDelete(assessment._id)
    // also remove any result that was created with this assessmentId
    await Result.deleteMany({ assessmentId: assessment._id })
    console.log('Cleaned up test documents')
    process.exit(0)
  }
}

run().catch(e=>{ console.error(e); process.exit(1) })

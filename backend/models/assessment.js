const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionType: {
    type: String,
    enum: ['number_sense', 'arithmetic', 'spatial', 'memory'],
    required: true
  },
  questionText: String,
  imageUrl: String, // For visual questions
  options: [{
    text: String,
    image: String,
    isCorrect: Boolean
  }],
  correctAnswer: mongoose.Schema.Types.Mixed,
  difficulty: {
    type: Number,
    min: 1,
    max: 5
  }
});

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
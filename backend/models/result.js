const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    responseTime: Number, // in milliseconds
    attempts: Number
  }],
  // Detected error patterns summary
  errorPatterns: {
    numberReversal: { type: Number, default: 0 },
    symbolConfusion: { type: Number, default: 0 },
    sequencingError: { type: Number, default: 0 }
  },
  // Counts of subtypes per domain, e.g. { number_sense: { symbol_quantity: 3, transcoding: 2 }, arithmetic: {} }
  subtypeCounts: {
    type: Object,
    default: {}
  },
  scores: {
    numberSense: Number,
    arithmetic: Number,
    spatial: Number,
    memory: Number,
    total: Number
  },
  dyscalculiaRiskIndex: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    default: 'low'
  },
  confidenceScore: Number, // ML model confidence
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', resultSchema);
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'parent', 'teacher', 'admin'],
    default: 'student'
  },
  age: Number,
  grade: String,
  language: String,
  educationalBoard: String,
  // data privacy / consent flags
  consent: {
    type: Boolean,
    default: false
  },
  consentDate: Date,
  dataSharing: {
    type: Boolean,
    default: false
  },
  childProfile: { // For parents linking to child
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
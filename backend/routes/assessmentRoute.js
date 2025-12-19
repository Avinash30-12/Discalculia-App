const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  startAssessment,
  submitAssessment,
  getUserResults
} = require('../controllers/assessmentController');

const { exportResultsCSV } = require('../controllers/assessmentController');

// Protected routes
router.post('/start', protect, startAssessment);
router.post('/submit', protect, submitAssessment);
router.get('/results', protect, getUserResults);
// Export CSV of results for a user (self or allowed by role)
router.get('/export', protect, exportResultsCSV);

module.exports = router;
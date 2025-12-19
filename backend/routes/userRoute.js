const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserProfile,
  updateUserProfile,
  getChildProfile,
  linkChildToParent,
  getAllStudents
} = require('../controllers/userController');

// All routes are protected
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/child/:childId', protect, getChildProfile);
router.post('/link-child', protect, linkChildToParent);
router.get('/students', protect, getAllStudents);

module.exports = router;
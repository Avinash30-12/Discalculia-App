const User = require('../models/user');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { name, age, grade, language, educationalBoard } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (age) user.age = age;
    if (grade) user.grade = grade;
    if (language) user.language = language;
    if (educationalBoard) user.educationalBoard = educationalBoard;
    
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      age: updatedUser.age,
      grade: updatedUser.grade,
      language: updatedUser.language,
      educationalBoard: updatedUser.educationalBoard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get child profile (for parents/teachers)
const getChildProfile = async (req, res) => {
  try {
    const { childId } = req.params;
    
    const child = await User.findById(childId).select('-password');
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    // Check if current user is authorized (parent/teacher/admin)
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'teacher' &&
      child.childProfile?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(child);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Link child to parent
const linkChildToParent = async (req, res) => {
  try {
    const { childId } = req.body;
    
    // Verify child exists
    const child = await User.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    // Verify user is a parent
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can link children' });
    }
    
    // Link child to parent
    child.childProfile = req.user.id;
    await child.save();
    
    res.json({ message: 'Child linked successfully', childId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all students (for teachers/admins)
const getAllStudents = async (req, res) => {
  try {
    // Check authorization
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const students = await User.find({ role: 'student' })
      .select('name email age grade language educationalBoard createdAt')
      .sort({ createdAt: -1 });
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getChildProfile,
  linkChildToParent,
  getAllStudents
};
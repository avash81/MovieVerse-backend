const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Register user
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.error('Missing registration fields:', { email, password });
    return res.status(400).json({ msg: 'Please provide email and password' });
  }
  try {
    let user = await User.findOne({ email });
    if (user) {
      console.warn('User already exists:', email);
      return res.status(400).json({ msg: 'User already exists' });
    }
    user = new User({ email, password });
    await user.save();
    console.log('User registered:', email);
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error('Register error:', {
      email,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.error('Missing login fields:', { email, password });
    return res.status(400).json({ msg: 'Please provide email and password' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn('User not found:', email);
      return res.status(400).json({ msg: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn('Invalid password for user:', email);
      return res.status(400).json({ msg: 'Invalid email or password' });
    }
    console.log('User logged in:', email);
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error('Login error:', {
      email,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
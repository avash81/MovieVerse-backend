const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user's watchlist
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.error('User not found for watchlist:', req.user.userId);
      return res.status(404).json({ msg: 'User not found' });
    }
    console.log('Returning watchlist for user:', req.user.userId);
    res.json(user.watchlist);
  } catch (error) {
    console.error('Get watchlist error:', {
      userId: req.user.userId,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add movie to watchlist
router.post('/', auth, async (req, res) => {
  const { externalId, title, poster, source } = req.body;
  if (!externalId || !title || !source) {
    console.error('Missing required fields:', { externalId, title, source });
    return res.status(400).json({ msg: 'Missing required fields' });
  }
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.error('User not found for watchlist:', req.user.userId);
      return res.status(404).json({ msg: 'User not found' });
    }
    if (user.watchlist.some((movie) => movie.externalId === externalId && movie.source === source)) {
      console.warn('Movie already in watchlist:', { externalId, source });
      return res.status(400).json({ msg: 'Movie already in watchlist' });
    }
    user.watchlist.push({ externalId, title, poster, source });
    await user.save();
    console.log('Added movie to watchlist:', { externalId, title, source, userId: req.user.userId });
    res.json(user.watchlist);
  } catch (error) {
    console.error('Add to watchlist error:', {
      userId: req.user.userId,
      body: req.body,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

// Remove movie from watchlist
router.delete('/:externalId', auth, async (req, res) => {
  const { externalId } = req.params;
  const { source } = req.query;
  if (!source) {
    console.error('Source is required:', { externalId });
    return res.status(400).json({ msg: 'Source is required' });
  }
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.error('User not found for watchlist:', req.user.userId);
      return res.status(404).json({ msg: 'User not found' });
    }
    const initialLength = user.watchlist.length;
    user.watchlist = user.watchlist.filter(
      (movie) => !(movie.externalId === externalId && movie.source === source)
    );
    if (user.watchlist.length === initialLength) {
      console.warn('Movie not found in watchlist:', { externalId, source, userId: req.user.userId });
      return res.status(404).json({ msg: 'Movie not found in watchlist' });
    }
    await user.save();
    console.log('Removed movie from watchlist:', { externalId, source, userId: req.user.userId });
    res.json(user.watchlist);
  } catch (error) {
    console.error('Remove from watchlist error:', {
      userId: req.user.userId,
      externalId,
      source,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
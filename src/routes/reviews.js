const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Submit a new review
router.post('/:source/:externalId', async (req, res) => {
  const { source, externalId } = req.params;
  const { text, name, email } = req.body;

  try {
    if (!text || text.trim().length < 3) {
      return res.status(400).json({ msg: 'Review must be at least 3 characters long' });
    }
    if (!name || !email) {
      return res.status(400).json({ msg: 'Name and email are required' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    const review = await Review.create({
      source,
      externalId,
      text: text.trim(),
      name,
      email,
      replies: [],
    });

    res.status(201).json(review);
  } catch (err) {
    console.error('Review submission error:', {
      message: err.message,
      stack: err.stack,
      requestBody: req.body,
    });
    res.status(500).json({ msg: 'Server error during review submission' });
  }
});

// Submit a reply to a review
router.post('/:source/:externalId/reply/:reviewId', async (req, res) => {
  const { source, externalId, reviewId } = req.params;
  const { text, name, email } = req.body;

  try {
    if (!text || text.trim().length < 3) {
      return res.status(400).json({ msg: 'Reply must be at least 3 characters long' });
    }
    if (!name || !email) {
      return res.status(400).json({ msg: 'Name and email are required' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      console.error(`Review not found for ID: ${reviewId}`);
      return res.status(404).json({ msg: 'Review not found' });
    }

    // Ensure source and externalId match
    if (review.source !== source || review.externalId !== externalId) {
      console.error(`Review mismatch: expected source=${source}, externalId=${externalId}; found source=${review.source}, externalId=${review.externalId}`);
      return res.status(400).json({ msg: 'Review does not match the specified movie' });
    }

    review.replies.push({
      text: text.trim(),
      name,
      email,
      createdAt: new Date(),
    });

    await review.save();

    res.status(201).json(review);
  } catch (err) {
    console.error('Reply submission error:', {
      message: err.message,
      stack: err.stack,
      reviewId,
      requestBody: req.body,
    });
    res.status(500).json({ msg: 'Server error during reply submission' });
  }
});

// Get all reviews for a movie
router.get('/:source/:externalId', async (req, res) => {
  const { source, externalId } = req.params;

  try {
    const reviews = await Review.find({ source, externalId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ msg: 'Server error fetching reviews' });
  }
});

module.exports = router;
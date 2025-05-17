const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  source: { type: String, required: true },
  externalId: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema], // Ensure replies is an array of subdocuments
});

module.exports = mongoose.model('Review', reviewSchema);
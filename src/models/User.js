const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  watchlist: [{
    externalId: { type: String, required: true },
    title: { type: String, required: true },
    poster: { type: String },
    source: { type: String, required: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
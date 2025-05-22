const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  source: { type: String, required: true },
  externalId: { type: String, required: true },
  title: { type: String, required: true },
  poster: { type: String },
  releaseYear: { type: String },
  releaseDate: { type: String },
  imdbRating: { type: String },
  genres: { type: String },
  overview: { type: String },
  director: { type: String },
  cast: { type: [String] },
  runtime: { type: String },
  budget: { type: String },
  revenue: { type: String },
  productionCompanies: { type: String },
  language: { type: String },
  country: { type: String },
  status: { type: String },
  tagline: { type: String },
  trailer: { type: String },
  watchProviders: { type: Object },
  category: { type: String },
  reactionCounts: {
    excellent: { type: Number, default: 0 },
    good: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
  },
  userReactions: [
    {
      userId: { type: String, required: true },
      reaction: { type: String, enum: ['excellent', 'good', 'average', 'sad'], required: true },
    },
  ],
});

module.exports = mongoose.model('Movie', movieSchema);
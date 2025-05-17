const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  source: { type: String, required: true },
  externalId: { type: String, required: true },
  title: { type: String, default: 'N/A' },
  poster: { type: String, default: 'https://placehold.co/300x450?text=No+Poster' },
  category: { type: String, default: 'trending' },
  genre_ids: { type: [Number], default: [] },
  genres: { type: [String], default: ['N/A'] },
  overview: { type: String, default: 'N/A' },
  imdbRating: { type: String, default: 'N/A' },
  releaseDate: { type: String, default: 'N/A' },
  runtime: { type: String, default: 'N/A' },
  director: { type: String, default: 'N/A' },
  cast: { type: [String], default: ['N/A'] },
  budget: { type: String, default: 'N/A' },
  revenue: { type: String, default: 'N/A' },
  productionCompanies: { type: [String], default: ['N/A'] },
  language: { type: String, default: 'N/A' },
  country: { type: String, default: 'N/A' },
  status: { type: String, default: 'N/A' },
  tagline: { type: String, default: 'N/A' },
  watchProviders: { type: Object, default: {} },
  trailer: { type: String, default: null },
  directLink: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  reactionCounts: {
    type: Object,
    default: { excellent: 0, loved: 0, thanks: 0, wow: 0, sad: 0 },
  },
  screenshots: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model('Movie', movieSchema);
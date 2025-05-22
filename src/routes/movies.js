const express = require('express');
const router = express.Router();
const moviesController = require('../controllers/moviesController');
const axios = require('axios');
const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const reactionData = {};

const genreMap = {
  action: 28,
  comedy: 35,
  drama: 18,
  bollywood: 'bollywood',
  hollywood: 'hollywood',
  tamil: 'tamil',
  telugu: 'telugu',
  webseries: 'webseries',
  tvshows: 'tvshows',
  topimdb: 'topimdb',
  classics: 'classics',
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const mapToFrontendFormat = (item, isTv = false) => ({
  source: 'tmdb',
  externalId: item.id.toString(),
  title: isTv ? item.name : item.title,
  poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://placehold.co/200x300?text=No+Poster',
  imdbRating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
  releaseDate: isTv ? item.first_air_date : item.release_date,
  overview: item.overview || 'No overview available',
  genres: item.genre_ids ? item.genre_ids.join(',') : 'N/A',
  trailer: 'N/A',
  watchProviders: {},
  directLink: null,
  genre_ids: item.genre_ids || [],
});

router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MovieVerse API - Movies Route',
    availableCategories: Object.keys(genreMap),
    usage: 'Use /api/movies/categories/:categoryId to fetch movies by category (e.g., /api/movies/categories/trending)',
  });
});

router.get('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  console.log(`[Movies Route] GET /categories/${categoryId}`);

  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not defined');
      return res.status(500).json({ msg: 'Server configuration error: TMDB_API_KEY missing' });
    }

    const cachedMovies = await Movie.find({ category: categoryId });
    if (cachedMovies.length >= 20) {
      console.log(`Serving ${categoryId} movies from cache:`, cachedMovies.length);
      return res.json(cachedMovies);
    }

    let movies = [];
    let isTv = false;
    let endpoint = '';
    let params = { api_key: TMDB_API_KEY, page: 1 };

    if (categoryId === 'trending') {
      endpoint = '/trending/all/week';
    } else if (['action', 'comedy', 'drama'].includes(categoryId)) {
      endpoint = '/discover/movie';
      params.with_genres = genreMap[categoryId];
    } else if (categoryId === 'bollywood') {
      endpoint = '/discover/movie';
      params.with_original_language = 'hi';
    } else if (categoryId === 'hollywood') {
      endpoint = '/discover/movie';
      params.with_original_language = 'en';
      params.region = 'US';
    } else if (categoryId === 'tamil') {
      endpoint = '/discover/movie';
      params.with_original_language = 'ta';
    } else if (categoryId === 'telugu') {
      endpoint = '/discover/movie';
      params.with_original_language = 'te';
    } else if (categoryId === 'webseries' || categoryId === 'tvshows') {
      endpoint = '/discover/tv';
      isTv = true;
    } else if (categoryId === 'topimdb') {
      endpoint = '/movie/top_rated';
    } else if (categoryId === 'classics') {
      endpoint = '/discover/movie';
      params.sort_by = 'vote_average.desc';
      params.primary_release_date = { lte: '1990-12-31' };
    } else {
      console.error('Invalid category:', categoryId);
      return res.status(400).json({ msg: 'Invalid category' });
    }

    console.log(`Fetching from TMDB: ${endpoint}`, params);
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params,
      timeout: 5000,
    });

    movies = response.data.results.slice(0, 20);
    console.log(`${categoryId} movies fetched from TMDB:`, movies.length);

    const formattedMovies = movies.map(item => ({
      ...mapToFrontendFormat(item, isTv),
      category: categoryId,
    }));

    for (const movie of formattedMovies) {
      await Movie.findOneAndUpdate(
        { source: movie.source, externalId: movie.externalId, category: categoryId },
        movie,
        { upsert: true, new: true }
      );
    }

    await delay(500);
    res.json(formattedMovies);
  } catch (err) {
    console.error(`Error fetching category ${categoryId}:`, {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    if (err.response?.status === 429) {
      return res.status(429).json({ msg: 'TMDB rate limit exceeded. Please try again later.' });
    } else if (err.response?.status === 401) {
      return res.status(401).json({ msg: 'Invalid TMDB API key.' });
    } else if (err.response?.status === 404) {
      return res.status(404).json({ msg: `No movies found for category ${categoryId}.` });
    }

    res.status(500).json({ msg: 'Failed to fetch movies. Please try again.' });
  }
});

router.get('/details/:source/:externalId', (req, res, next) => {
  console.log(`[Movies Route] GET /details/${req.params.source}/${req.params.externalId}`);
  moviesController.getMovieDetails(req, res, next);
});

router.post('/reactions/:source/:externalId', (req, res, next) => {
  console.log(`[Movies Route] POST /reactions/${req.params.source}/${req.params.externalId}`);
  moviesController.handleReaction(req, res, next);
});

router.get('/reactions/:source/:externalId', async (req, res) => {
  try {
    const { source, externalId } = req.params;
    console.log(`[Movies Route] GET /reactions/${source}/${externalId}`);
    const movie = await Movie.findOne({ source, externalId });
    if (!movie) {
      return res.status(404).json({ msg: 'Movie not found' });
    }
    const reactions = Object.fromEntries(movie.reactionCounts || new Map());
    res.status(200).json(reactions);
  } catch (err) {
    console.error('Error fetching reactions:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/notices', async (req, res) => {
  try {
    console.log('[Movies Route] GET /notices');
    const notices = [
      { id: 1, message: 'Welcome to MovieVerse! Check out the latest movies.' },
      { id: 2, message: 'New features coming soon!' },
    ];
    res.status(200).json(notices);
  } catch (err) {
    console.error('Error fetching notices:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Movie = require('../models/Movie');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

// Delay function to mitigate TMDB rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Map TMDB movie/TV data to frontend format
const mapToFrontendFormat = (item, isTv = false) => ({
  source: 'tmdb',
  externalId: item.id.toString(),
  title: isTv ? item.name : item.title,
  poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://placehold.co/200x300?text=No+Poster',
  imdbRating: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
  releaseDate: isTv ? item.first_air_date : item.release_date,
  overview: item.overview || 'No overview available',
  genres: item.genre_ids ? item.genre_ids.join(',') : 'N/A',
  trailer: 'N/A', // Simplified; implement YouTube API if needed
  watchProviders: {}, // Simplified; implement watch providers API if needed
  directLink: null,
  genre_ids: item.genre_ids || [],
});

// Route to fetch movies by category
router.get('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  console.log('Fetching movies for category:', categoryId);

  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not defined');
      return res.status(500).json({ msg: 'Server configuration error: TMDB_API_KEY missing' });
    }

    // Check MongoDB cache
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
      params.primary_release_year = 1990;
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

    // Map and save to MongoDB
    const formattedMovies = movies.map(item => ({
      ...mapToFrontendFormat(item, isTv),
      category: categoryId,
    }));

    // Save to MongoDB (upsert to avoid duplicates)
    for (const movie of formattedMovies) {
      await Movie.findOneAndUpdate(
        { source: movie.source, externalId: movie.externalId, category: categoryId },
        movie,
        { upsert: true, new: true }
      );
    }

    await delay(500); // Delay to avoid rate limiting
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

// Route to fetch movie details
router.get('/details/:source/:externalId', async (req, res) => {
  const { source, externalId } = req.params;
  console.log(`Fetching details for ${source}:${externalId}`);

  try {
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not defined');
      return res.status(500).json({ msg: 'Server configuration error: TMDB_API_KEY missing' });
    }

    if (source !== 'tmdb') {
      console.error('Invalid source:', source);
      return res.status(400).json({ msg: 'Invalid source' });
    }

    // Check MongoDB cache
    const cachedMovie = await Movie.findOne({ source, externalId });
    if (cachedMovie && cachedMovie.screenshots.length > 0) {
      console.log(`Serving movie details from cache: ${externalId}`);
      return res.json(cachedMovie);
    }

    // Fetch movie details from TMDB
    const endpoint = `/movie/${externalId}`;
    const params = {
      api_key: TMDB_API_KEY,
      append_to_response: 'credits,videos,images',
    };

    console.log(`Fetching from TMDB: ${endpoint}`, params);
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params,
      timeout: 5000,
    });

    const data = response.data;

    // Fetch screenshots (backdrops or posters)
    const screenshots = data.images?.backdrops?.slice(0, 5).map(img => 
      `https://image.tmdb.org/t/p/w500${img.file_path}`
    ) || [];

    const movie = {
      source: 'tmdb',
      externalId: data.id.toString(),
      title: data.title,
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://placehold.co/300x450?text=No+Poster',
      imdbRating: data.vote_average ? data.vote_average.toFixed(1) : 'N/A',
      releaseDate: data.release_date || 'N/A',
      overview: data.overview || 'No overview available',
      genres: data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A',
      director: data.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A',
      cast: data.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || 'N/A',
      runtime: data.runtime ? `${data.runtime} min` : 'N/A',
      budget: data.budget ? `$${data.budget.toLocaleString()}` : 'N/A',
      revenue: data.revenue ? `$${data.revenue.toLocaleString()}` : 'N/A',
      productionCompanies: data.production_companies ? data.production_companies.map(c => c.name).join(', ') : 'N/A',
      language: data.original_language || 'N/A',
      country: data.production_countries ? data.production_countries.map(c => c.name).join(', ') : 'N/A',
      status: data.status || 'N/A',
      tagline: data.tagline || 'N/A',
      trailer: data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key
        ? `https://www.youtube.com/watch?v=${data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube').key}`
        : 'N/A',
      watchProviders: data.watch_providers?.results || {},
      directLink: null,
      genre_ids: data.genre_ids || [],
      reactionCounts: cachedMovie?.reactionCounts || { excellent: 0, loved: 0, thanks: 0, wow: 0, sad: 0 },
      screenshots,
    };

    // Save to MongoDB
    await Movie.findOneAndUpdate(
      { source: movie.source, externalId: movie.externalId },
      movie,
      { upsert: true, new: true }
    );

    await delay(500); // Delay to avoid rate limiting
    res.json(movie);
  } catch (err) {
    console.error(`Error fetching movie ${source}:${externalId}:`, {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    if (err.response?.status === 429) {
      return res.status(429).json({ msg: 'TMDB rate limit exceeded. Please try again later.' });
    } else if (err.response?.status === 401) {
      return res.status(401).json({ msg: 'Invalid TMDB API key.' });
    } else if (err.response?.status === 404) {
      return res.status(404).json({ msg: 'Movie not found.' });
    }

    res.status(500).json({ msg: 'Failed to fetch movie details. Please try again.' });
  }
});

// Route to handle reactions
router.post('/reactions/:source/:externalId', async (req, res) => {
  const { source, externalId } = req.params;
  const { reaction } = req.body;

  try {
    if (!['excellent', 'loved', 'thanks', 'wow', 'sad'].includes(reaction)) {
      return res.status(400).json({ msg: 'Invalid reaction type' });
    }

    const movie = await Movie.findOne({ source, externalId });
    if (!movie) {
      return res.status(404).json({ msg: 'Movie not found' });
    }

    // Increment the reaction count
    movie.reactionCounts = movie.reactionCounts || { excellent: 0, loved: 0, thanks: 0, wow: 0, sad: 0 };
    movie.reactionCounts[reaction] = (movie.reactionCounts[reaction] || 0) + 1;

    await movie.save();

    res.json({ reactionCounts: movie.reactionCounts });
  } catch (err) {
    console.error(`Error submitting reaction for ${source}:${externalId}:`, err);
    res.status(500).json({ msg: 'Failed to submit reaction. Please try again.' });
  }
});

// Route to fetch notices
router.get('/notices', async (req, res) => {
  console.log('Fetching notices');
  try {
    // Static notices; replace with MongoDB query if Notice model exists
    const notices = [
      { text: 'New movies added to Trending and Top IMDb!' },
      { text: 'Check out our latest Bollywood releases!' },
      { text: 'Web Series section updated with new episodes!' },
      { text: 'Login to submit reviews and join the community!' },
    ];
    console.log('Notices fetched:', notices.length);
    res.json(notices);
  } catch (err) {
    console.error('Error fetching notices:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ msg: 'Failed to fetch notices. Please try again.' });
  }
});

module.exports = router;
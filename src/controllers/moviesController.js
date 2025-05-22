const Movie = require('../models/Movie');
const axios = require('axios');

const cache = {
  categories: {},
  notices: null,
};

const getMoviesByCategory = async (req, res) => {
  const { category } = req.params;
  console.log(`[moviesController] Fetching movies for category: ${category}`);
  try {
    if (cache.categories[category]) {
      console.log(`[moviesController] Serving ${category} movies from cache: ${cache.categories[category].length}`);
      return res.json(cache.categories[category]);
    }
    let movies = await Movie.find({ category }).limit(20);
    if (!movies.length) {
      const tmdbResponse = await axios.get(
        `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${category}`
      );
      movies = tmdbResponse.data.results.map((movie) => ({
        source: 'tmdb',
        externalId: movie.id.toString(),
        title: movie.title,
        poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        releaseYear: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
        imdbRating: movie.vote_average || 'N/A',
        genres: movie.genre_ids || [],
        overview: movie.overview || 'No overview available.',
      }));
      await Movie.insertMany(movies.map((m) => ({ ...m, category })));
    }
    cache.categories[category] = movies;
    res.json(movies);
  } catch (err) {
    console.error('[moviesController] Error fetching category movies:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error' });
  }
};

const getNotices = async (req, res) => {
  try {
    if (cache.notices) {
      console.log('[moviesController] Serving notices from cache');
      return res.json(cache.notices);
    }
    const notices = [
      { text: 'New movies added this week!' },
      { text: 'Check out our latest web series.' },
    ];
    cache.notices = notices;
    res.json(notices);
  } catch (err) {
    console.error('[moviesController] Error fetching notices:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error' });
  }
};

const getMovieDetails = async (req, res) => {
  const { source, externalId } = req.params;
  console.log(`[moviesController] getMovieDetails Start: source=${source}, externalId=${externalId}`);

  try {
    let movie = await Movie.findOne({ source, externalId });
    console.log(`[moviesController] Database query: ${movie ? `Found: ${movie.title}` : 'Not found'}`);

    if (movie) {
      console.log(`[moviesController] Serving from database: ${movie.title}`);
      return res.json(movie);
    }

    console.log('[moviesController] Fetching from TMDB API');
    let tmdbMovie;
    try {
      const tmdbResponse = await axios.get(
        `https://api.themoviedb.org/3/movie/${externalId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,videos,watch/providers`,
        { timeout: 5000 }
      );
      tmdbMovie = tmdbResponse.data;
      console.log('[moviesController] TMDB API response received');
    } catch (tmdbErr) {
      console.error('[moviesController] TMDB API error:', {
        message: tmdbErr.message,
        status: tmdbErr.response?.status,
        data: tmdbErr.response?.data,
      });
      console.log('[moviesController] Returning fallback response');
      return res.status(200).json({
        source,
        externalId,
        title: 'Movie Not Found',
        poster: 'https://placehold.co/200x300?text=No+Poster',
        overview: 'Movie details not available.',
        releaseYear: 'N/A',
        releaseDate: 'N/A',
        imdbRating: 'N/A',
        genres: 'N/A',
        director: 'N/A',
        cast: ['N/A'],
        runtime: 'N/A',
        budget: 'N/A',
        revenue: 'N/A',
        productionCompanies: 'N/A',
        language: 'N/A',
        country: 'N/A',
        status: 'N/A',
        tagline: 'N/A',
        trailer: 'N/A',
        watchProviders: {},
        reactionCounts: { excellent: 0, good: 0, average: 0, sad: 0 },
      });
    }

    movie = {
      source: 'tmdb',
      externalId: tmdbMovie.id.toString(),
      title: tmdbMovie.title || 'Unknown Title',
      poster: tmdbMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : 'https://placehold.co/200x300?text=No+Poster',
      releaseYear: tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : 'N/A',
      releaseDate: tmdbMovie.release_date || 'N/A',
      imdbRating: tmdbMovie.vote_average ? tmdbMovie.vote_average.toFixed(1) : 'N/A',
      genres: tmdbMovie.genres ? tmdbMovie.genres.map((g) => g.name).join(', ') : 'N/A',
      overview: tmdbMovie.overview || 'No overview available.',
      director: tmdbMovie.credits?.crew?.find((c) => c.job === 'Director')?.name || 'N/A',
      cast: tmdbMovie.credits?.cast?.slice(0, 5).map((c) => c.name) || ['N/A'],
      runtime: tmdbMovie.runtime ? `${tmdbMovie.runtime} min` : 'N/A',
      budget: tmdbMovie.budget ? `$${tmdbMovie.budget.toLocaleString()}` : 'N/A',
      revenue: tmdbMovie.revenue ? `$${tmdbMovie.revenue.toLocaleString()}` : 'N/A',
      productionCompanies: tmdbMovie.production_companies
        ? tmdbMovie.production_companies.map((c) => c.name).join(', ')
        : 'N/A',
      language: tmdbMovie.original_language || 'N/A',
      country: tmdbMovie.production_countries
        ? tmdbMovie.production_countries.map((c) => c.name).join(', ')
        : 'N/A',
      status: tmdbMovie.status || 'N/A',
      tagline: tmdbMovie.tagline || 'N/A',
      trailer: tmdbMovie.videos?.results?.find((v) => v.type === 'Trailer')?.key
        ? `https://www.youtube.com/watch?v=${
            tmdbMovie.videos.results.find((v) => v.type === 'Trailer').key
          }`
        : 'N/A',
      watchProviders: tmdbMovie['watch/providers']?.results || {},
      reactionCounts: { excellent: 0, good: 0, average: 0, sad: 0 },
    };

    try {
      await Movie.create(movie);
      console.log(`[moviesController] Movie saved to database: ${movie.title}`);
    } catch (dbErr) {
      console.error('[moviesController] Database save error:', dbErr.message, dbErr.stack);
    }

    console.log(`[moviesController] Returning movie: ${movie.title}`);
    res.json(movie);
  } catch (err) {
    console.error('[moviesController] Unexpected error in getMovieDetails:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(200).json({
      source,
      externalId,
      title: 'Movie Not Found',
      poster: 'https://placehold.co/200x300?text=No+Poster',
      overview: 'Movie details not available.',
      releaseYear: 'N/A',
      releaseDate: 'N/A',
      imdbRating: 'N/A',
      genres: 'N/A',
      director: 'N/A',
      cast: ['N/A'],
      runtime: 'N/A',
      budget: 'N/A',
      revenue: 'N/A',
      productionCompanies: 'N/A',
      language: 'N/A',
      country: 'N/A',
      status: 'N/A',
      tagline: 'N/A',
      trailer: 'N/A',
      watchProviders: {},
      reactionCounts: { excellent: 0, good: 0, average: 0, sad: 0 },
    });
  }
};

const handleReaction = async (req, res) => {
  const { source, externalId } = req.params;
  const { reaction, userId } = req.body;
  console.log(`[moviesController] Handling reaction: ${reaction} for ${source}/${externalId} by user ${userId}`);

  try {
    if (!['excellent', 'good', 'average', 'sad'].includes(reaction)) {
      return res.status(400).json({ msg: 'Invalid reaction type' });
    }
    if (!userId) {
      return res.status(400).json({ msg: 'User ID is required' });
    }

    const movie = await Movie.findOne({ source, externalId });
    if (!movie) {
      return res.status(404).json({ msg: 'Movie not found' });
    }

    // Check if user has already reacted
    const existingReaction = movie.userReactions.find(r => r.userId === userId);
    if (existingReaction) {
      return res.status(400).json({ msg: 'User has already submitted a reaction for this movie' });
    }

    // Add user reaction and increment reaction count
    movie.userReactions.push({ userId, reaction });
    movie.reactionCounts[reaction] = (movie.reactionCounts[reaction] || 0) + 1;

    await movie.save();
    console.log(`[moviesController] Reaction saved: ${reaction} for ${source}/${externalId} by user ${userId}`);

    res.json({ reactionCounts: movie.reactionCounts });
  } catch (err) {
    console.error('[moviesController] Error handling reaction:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  getMoviesByCategory,
  getNotices,
  getMovieDetails,
  handleReaction,
};
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./src/config/db');
const fs = require('fs');

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(__dirname, '.env.prod') });
} else {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
}

console.log('Environment variables loaded:', {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? '[set]' : 'undefined',
  JWT_SECRET: process.env.JWT_SECRET ? '[set]' : 'undefined',
  TMDB_API_KEY: process.env.TMDB_API_KEY ? '[set]' : 'undefined',
  OMDB_API_KEY: process.env.OMDB_API_KEY ? '[set]' : 'undefined',
});

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(require('./src/middleware/errorHandler'));

// Serve static files from the 'public/build' directory
const buildPath = path.join(__dirname, 'public', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
} else {
  console.warn(`Warning: Directory ${buildPath} does not exist. Static files will not be served.`);
}

// Add root route for backend health check
app.get('/api', (req, res) => {
  res.json({ message: 'MovieVerse Backend is running!' });
});

// Routes
let moviesRouter, authRouter, watchlistRouter, reviewsRouter;

try {
  moviesRouter = require('./src/routes/movies');
  app.use('/api/movies', moviesRouter);
  console.log('Movies route loaded successfully');
} catch (err) {
  console.error('Failed to load movies route:', err.message, err.stack);
}

try {
  authRouter = require('./src/routes/auth');
  app.use('/api/auth', authRouter);
  console.log('Auth route loaded successfully');
} catch (err) {
  console.error('Failed to load auth route:', err.message, err.stack);
}

try {
  watchlistRouter = require('./src/routes/watchlist');
  app.use('/api/watchlist', watchlistRouter);
  console.log('Watchlist route loaded successfully');
} catch (err) {
  console.error('Failed to load watchlist route:', err.message, err.stack);
}

try {
  reviewsRouter = require('./src/routes/reviews');
  app.use('/api/reviews', reviewsRouter);
  console.log('Reviews route loaded successfully');
} catch (err) {
  console.error('Failed to load reviews route:', err.message, err.stack);
}

// Fallback to serve index.html for React Router
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ message: 'Frontend build not found. Please run `npm run build` in the frontend directory and copy the build folder to backend/public.' });
  }
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please free the port or change PORT in .env.prod.`);
      } else {
        console.error('Server startup error:', err.message, err.stack);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start server due to MongoDB connection error:', err.message, err.stack);
    process.exit(1);
  }
};

startServer();
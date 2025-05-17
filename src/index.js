const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.prod') });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
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
app.use(cors());
app.use(express.json());
app.use(require('./middleware/errorHandler'));

// Add root route
app.get('/', (req, res) => {
  res.json({ message: 'MovieVerse Backend is running!' });
});

// Routes
let moviesRouter, authRouter, watchlistRouter, reviewsRouter;

try {
  moviesRouter = require('./routes/movies');
  app.use('/api/movies', moviesRouter);
  console.log('Movies route loaded');
} catch (err) {
  console.error('Failed to load movies route:', err.message);
}

try {
  authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
  console.log('Auth route loaded');
} catch (err) {
  console.error('Failed to load auth route:', err.message);
}

try {
  watchlistRouter = require('./routes/watchlist');
  app.use('/api/watchlist', watchlistRouter);
  console.log('Watchlist route loaded');
} catch (err) {
  console.error('Failed to load watchlist route:', err.message);
}

try {
  reviewsRouter = require('./routes/reviews');
  app.use('/api/reviews', reviewsRouter);
  console.log('Reviews route loaded');
} catch (err) {
  console.error('Failed to load reviews route:', err.message);
}

const DEFAULT_PORT = process.env.PORT || 5001;
const tryPort = (port) => {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Port ${port} is available`);
      server.close();
      resolve(port);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(null);
      } else {
        console.error('Port check error:', err.message);
        resolve(null);
      }
    });
  });
};

const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to start server due to MongoDB connection error:', err.message);
    process.exit(1);
  }

  let port = DEFAULT_PORT;
  let availablePort = await tryPort(port);
  if (!availablePort) {
    console.log(`Port ${port} in use, trying ${port + 1}`);
    port += 1;
    availablePort = await tryPort(port);
  }
  if (availablePort) {
    app.listen(availablePort, () => console.log(`Server running on port ${availablePort}`));
  } else {
    console.error('No available ports');
    process.exit(1);
  }
};

startServer();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const movieRoutes = require('./api/routes/movieRoutes');
const healthRoutes = require('./api/routes/healthRoutes');
const logger = require('./utils/logger');
const adminRoutes = require('./api/routes/adminRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Rate limiting - general API (100 requests per minute per IP)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});

// Rate limiting - admin routes (5 requests per 10 minutes per IP)
const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many admin requests, please try again later' }
});

app.use('/api', apiLimiter);
app.use('/api/admin', adminLimiter);

// CORS (basic setup)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Mount routers at correct paths
app.use('/api', movieRoutes);   // movieRoutes handles movies, genres, platforms, statistics
app.use('/api/health', healthRoutes); // health routes
app.use('/api', adminRoutes); //admin routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Movie Catalog Ingestion Service',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      movies: '/api/movies',
      genres: '/api/genres',
      platforms: '/api/platforms',
      statistics: '/api/statistics'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = app;


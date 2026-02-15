const express = require('express');
const { query, param, validationResult } = require('express-validator');
const movieController = require('../controllers/MovieController');

const router = express.Router();

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Shared pagination & sort validators
const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('sortBy').optional().isIn(['popularity', 'voteAverage', 'releaseDate', 'title']).withMessage('sortBy must be one of: popularity, voteAverage, releaseDate, title'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc')
];

const minRatingRule = query('minRating').optional().isFloat({ min: 0, max: 10 }).withMessage('minRating must be between 0 and 10').toFloat();

const monetizationRule = query('monetizationTypes').optional().customSanitizer(v => v.split(',')).custom(types => {
  const allowed = ['flatrate', 'rent', 'buy', 'ads', 'free'];
  return types.every(t => allowed.includes(t));
}).withMessage('monetizationTypes must be comma-separated values from: flatrate, rent, buy, ads, free');

// Movies
router.get('/movies', [
  ...paginationRules,
  query('genres').optional().isString(),
  query('platforms').optional().isString(),
  query('releaseYear').optional().isInt({ min: 1888, max: 2100 }).withMessage('releaseYear must be between 1888 and 2100').toInt(),
  minRatingRule,
  monetizationRule,
  query('q').optional().isString().trim().isLength({ min: 1, max: 200 }).withMessage('Search query must be 1-200 characters')
], validate, movieController.getMovies.bind(movieController));

router.get('/movies/:id', [
  param('id').isString().trim().notEmpty().withMessage('Movie ID is required')
], validate, movieController.getMovieById.bind(movieController));

// Genre-based queries
router.get('/genres', movieController.getGenres.bind(movieController));

router.get('/genres/:genreSlug/movies', [
  param('genreSlug').isSlug().withMessage('Invalid genre slug'),
  ...paginationRules
], validate, movieController.getMoviesByGenre.bind(movieController));

// Platform-based queries
router.get('/platforms', movieController.getPlatforms.bind(movieController));

router.get('/platforms/:platformSlug/movies', [
  param('platformSlug').isSlug().withMessage('Invalid platform slug'),
  ...paginationRules,
  minRatingRule,
  monetizationRule
], validate, movieController.getMoviesByPlatform.bind(movieController));

// Statistics
router.get('/statistics', movieController.getStatistics.bind(movieController));

module.exports = router;

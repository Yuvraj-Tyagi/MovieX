const movieService = require('../../services/MovieService');
const logger = require('../../utils/logger');

class MovieController {
  /**
   * Get all movies with filters
   */
  async getMovies(req, res) {
    try {
      const filters = {
        genres: req.query.genres ? req.query.genres.split(',') : [],
        platforms: req.query.platforms ? req.query.platforms.split(',') : [],
        releaseYear: req.query.releaseYear ?? null,
        minRating: req.query.minRating ?? null,
        monetizationTypes: req.query.monetizationTypes || ['flatrate', 'free', 'ads'],
        query: req.query.q || null
      };

      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sortBy: req.query.sortBy || 'popularity',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await movieService.searchMovies(filters, pagination);

      res.json({
        success: true,
        data: result.movies,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getMovies controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch movies'
      });
    }
  }

  /**
   * Get movie by ID
   */
  async getMovieById(req, res) {
    try {
      const { id } = req.params;
      const movie = await movieService.getMovieById(id);

      if (!movie) {
        return res.status(404).json({
          success: false,
          error: 'Movie not found'
        });
      }

      res.json({
        success: true,
        data: movie
      });
    } catch (error) {
      logger.error('Error in getMovieById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch movie'
      });
    }
  }

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(req, res) {
    try {
      const { genreSlug } = req.params;
      
      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sortBy: req.query.sortBy || 'popularity',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await movieService.getMoviesByGenre(genreSlug, pagination);

      res.json({
        success: true,
        data: result.movies,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getMoviesByGenre controller:', error);
      
      if (error.message === 'Genre not found') {
        return res.status(404).json({
          success: false,
          error: 'Genre not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch movies by genre'
      });
    }
  }

  /**
   * Get movies by platform
   */
  async getMoviesByPlatform(req, res) {
    try {
      const { platformSlug } = req.params;
      
      const filters = {
        minRating: req.query.minRating ?? null,
        monetizationTypes: req.query.monetizationTypes || ['flatrate', 'free', 'ads']
      };

      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sortBy: req.query.sortBy || 'popularity',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await movieService.getMoviesByPlatform(
        platformSlug,
        filters,
        pagination
      );

      res.json({
        success: true,
        data: result.movies,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getMoviesByPlatform controller:', error);
      
      if (error.message === 'Platform not found') {
        return res.status(404).json({
          success: false,
          error: 'Platform not found'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch movies by platform'
      });
    }
  }

  /**
   * Get all genres
   */
  async getGenres(req, res) {
    try {
      const genres = await movieService.getAllGenres();

      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      logger.error('Error in getGenres controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch genres'
      });
    }
  }

  /**
   * Get all platforms
   */
  async getPlatforms(req, res) {
    try {
      const platforms = await movieService.getAllPlatforms();

      res.json({
        success: true,
        data: platforms
      });
    } catch (error) {
      logger.error('Error in getPlatforms controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch platforms'
      });
    }
  }

  /**
   * Get catalog statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await movieService.getCatalogStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getStatistics controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
}

module.exports = new MovieController();
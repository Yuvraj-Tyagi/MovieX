const movieRepository = require('../repositories/MovieRepository');
const availabilityRepository = require('../repositories/AvailabilityRepository');
const genreRepository = require('../repositories/GenreRepository');
const platformRepository = require('../repositories/PlatformRepository');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/apiHelpers');

class MovieService {
  /**
   * Get movie by ID
   */
  async getMovieById(id) {
    try {
      const movie = await movieRepository.findByJustWatchId(id);
      
      if (!movie) {
        return null;
      }

      // Get availabilities for this movie
      const availabilities = await availabilityRepository.findByMovie(movie._id);

      return {
        ...movie.toObject(),
        availabilities
      };
    } catch (error) {
      logger.error('Error getting movie by ID:', error);
      throw error;
    }
  }

  /**
   * Search and filter movies
   */
  async searchMovies(filters = {}, pagination = {}) {
    try {
      const {
        genres = [],
        platforms = [],
        releaseYear = null,
        minRating = null,
        monetizationTypes = ['flatrate', 'free', 'ads'],
        query = null
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'popularity',
        sortOrder = 'desc'
      } = pagination;

      const skip = (page - 1) * limit;

      // Build query
      const movieQuery = {};
      
      if (releaseYear) {
        movieQuery.releaseYear = releaseYear;
      }

      if (minRating) {
        movieQuery.voteAverage = { $gte: minRating };
      }

      if (query) {
        movieQuery.title = { $regex: escapeRegex(query), $options: 'i' };
      }

      // If platforms are specified, filter by availability
      let movies;
      if (platforms && platforms.length > 0) {
        // Use availability-based filtering
        const platformDocs = await platformRepository.findAll();
        const platformIds = platformDocs
          .filter(p => platforms.includes(p.slug) || platforms.includes(p._id.toString()))
          .map(p => p._id);

        const availabilityResults = await availabilityRepository.findMoviesOnPlatforms(
          platformIds,
          {
            monetizationTypes,
            genres: genres.length > 0 ? genres : undefined,
            minRating,
            limit,
            skip
          }
        );

        movies = availabilityResults.map(r => r.movie);
      } else {
        // Standard movie search
        movies = await movieRepository.findByFilters(
          movieQuery,
          {
            genres: genres.length > 0 ? genres : undefined,
            sortBy,
            sortOrder,
            limit,
            skip
          }
        );
      }

      // Get total count
      const total = await movieRepository.countByFilters(movieQuery);

      return {
        movies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching movies:', error);
      throw error;
    }
  }

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreSlug, pagination = {}) {
    try {
      const genre = await genreRepository.findByName(genreSlug);
      
      if (!genre) {
        throw new Error('Genre not found');
      }

      return await this.searchMovies(
        { genres: [genre._id] },
        pagination
      );
    } catch (error) {
      logger.error('Error getting movies by genre:', error);
      throw error;
    }
  }

  /**
   * Get movies by platform
   */
  async getMoviesByPlatform(platformSlug, filters = {}, pagination = {}) {
    try {
      const platform = await platformRepository.findByName(platformSlug);
      
      if (!platform) {
        throw new Error('Platform not found');
      }

      return await this.searchMovies(
        { ...filters, platforms: [platform._id] },
        pagination
      );
    } catch (error) {
      logger.error('Error getting movies by platform:', error);
      throw error;
    }
  }

  /**
   * Get all genres
   */
  async getAllGenres() {
    try {
      return await genreRepository.findAll();
    } catch (error) {
      logger.error('Error getting all genres:', error);
      throw error;
    }
  }

  /**
   * Get all platforms
   */
  async getAllPlatforms() {
    try {
      return await platformRepository.findAll();
    } catch (error) {
      logger.error('Error getting all platforms:', error);
      throw error;
    }
  }

  /**
   * Get catalog statistics
   */
  async getCatalogStatistics() {
    try {
      const movieStats = await movieRepository.getStatistics();
      const availabilityStats = await availabilityRepository.getStatistics();
      const genres = await genreRepository.findAll();
      const platforms = await platformRepository.findAll();

      return {
        movies: movieStats,
        availabilities: availabilityStats,
        genres: {
          total: genres.length
        },
        platforms: {
          total: platforms.length,
          active: platforms.filter(p => p.isActive).length
        }
      };
    } catch (error) {
      logger.error('Error getting catalog statistics:', error);
      throw error;
    }
  }
}

module.exports = new MovieService();
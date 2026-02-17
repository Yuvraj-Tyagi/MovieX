const Movie = require('../models/Movie');
const logger = require('../utils/logger');

class MovieRepository {
  /**
   * Find movie by JustWatch ID
   */
  async findByJustWatchId(justWatchId) {
    try {
      return await Movie.findOne({ justWatchId }).populate('genres');
    } catch (error) {
      logger.error('Error finding movie by JustWatch ID:', error);
      throw error;
    }
  }

  /**
   * Find movie by TMDB ID
   */
  async findByTmdbId(tmdbId) {
    try {
      return await Movie.findOne({ tmdbId }).populate('genres');
    } catch (error) {
      logger.error('Error finding movie by TMDB ID:', error);
      throw error;
    }
  }

  /**
   * Find movie by IMDb ID
   */
  async findByImdbId(imdbId) {
    try {
      return await Movie.findOne({ imdbId }).populate('genres');
    } catch (error) {
      logger.error('Error finding movie by IMDb ID:', error);
      throw error;
    }
  }

  /**
   * Create new movie
   */
  async create(movieData) {
    try {
      const movie = new Movie(movieData);
      await movie.save();
      
      logger.debug(`Created new movie: ${movie.title}`);
      return movie;
    } catch (error) {
      logger.error('Error creating movie:', error);
      throw error;
    }
  }

  /**
   * Update movie
   */
  async update(id, updateData) {
    try {
      return await Movie.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('genres');
    } catch (error) {
      logger.error('Error updating movie:', error);
      throw error;
    }
  }

  /**
   * Upsert movie by JustWatch ID
   */
  async upsertByJustWatchId(movieData) {
    try {
      const movie = await Movie.findOneAndUpdate(
        { justWatchId: movieData.justWatchId },
        { $set: movieData },
        { new: true, upsert: true, runValidators: true }
      ).populate('genres');
      
      return movie;
    } catch (error) {
      logger.error('Error upserting movie:', error);
      throw error;
    }
  }

  /**
   * Find movies that need enrichment
   */
  async findNeedingEnrichment(limit = 50) {
    try {
      return await Movie.find({
        $or: [
          { isEnriched: false },
          { isEnriched: { $exists: false } }
        ]
      })
      .limit(limit)
      .sort({ createdAt: 1 });
    } catch (error) {
      logger.error('Error finding movies needing enrichment:', error);
      throw error;
    }
  }

  /**
   * Mark movie as enriched
   */
  async markAsEnriched(id) {
    try {
      return await this.update(id, {
        isEnriched: true,
        lastEnrichedAt: new Date()
      });
    } catch (error) {
      logger.error('Error marking movie as enriched:', error);
      throw error;
    }
  }

  /**
   * Find movies by filters
   */
  async findByFilters(filters = {}, options = {}) {
    try {
      const {
        genres,
        releaseYear,
        minRating,
        sortBy = 'popularity',
        sortOrder = 'desc',
        limit = 20,
        skip = 0,
        textSearch = false
      } = options;

      const query = { ...filters };

      if (genres && genres.length > 0) {
        query.genres = { $in: genres };
      }

      if (releaseYear) {
        query.releaseYear = releaseYear;
      }

      if (minRating) {
        query.voteAverage = { $gte: minRating };
      }

      // When text search is active and no explicit sort override, sort by relevance
      const useTextScore = textSearch && sortBy === 'popularity';

      let sort;
      if (useTextScore) {
        sort = { score: { $meta: 'textScore' } };
      } else {
        sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }

      let dbQuery = Movie.find(query);

      if (textSearch) {
        dbQuery = dbQuery.select({ score: { $meta: 'textScore' } });
      }

      return await dbQuery
        .populate('genres')
        .sort(sort)
        .limit(limit)
        .skip(skip);
    } catch (error) {
      logger.error('Error finding movies by filters:', error);
      throw error;
    }
  }

  /**
   * Count movies by filters
   */
  async countByFilters(filters = {}) {
    try {
      return await Movie.countDocuments(filters);
    } catch (error) {
      logger.error('Error counting movies:', error);
      throw error;
    }
  }

  /**
   * Get movie statistics
   */
  async getStatistics() {
    try {
      const total = await Movie.countDocuments();
      const enriched = await Movie.countDocuments({ isEnriched: true });
      const needingEnrichment = total - enriched;

      return {
        total,
        enriched,
        needingEnrichment
      };
    } catch (error) {
      logger.error('Error getting movie statistics:', error);
      throw error;
    }
  }
}

module.exports = new MovieRepository();
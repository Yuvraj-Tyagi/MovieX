const Availability = require('../models/Availability');
const logger = require('../utils/logger');

class AvailabilityRepository {
  /**
   * Find availability by movie, platform, and monetization type
   */
  async findOne(movieId, platformId, monetizationType) {
    try {
      return await Availability.findOne({
        movie: movieId,
        platform: platformId,
        monetizationType
      })
      .populate('movie')
      .populate('platform');
    } catch (error) {
      logger.error('Error finding availability:', error);
      throw error;
    }
  }

  /**
   * Find all availabilities for a movie
   */
  async findByMovie(movieId, includeUnavailable = false) {
    try {
      const query = { movie: movieId };
      
      if (!includeUnavailable) {
        query.isAvailable = true;
      }

      return await Availability.find(query)
        .populate('platform')
        .sort({ platform: 1, monetizationType: 1 });
    } catch (error) {
      logger.error('Error finding availabilities by movie:', error);
      throw error;
    }
  }

  /**
   * Find all availabilities for a platform
   */
  async findByPlatform(platformId, includeUnavailable = false) {
    try {
      const query = { platform: platformId };
      
      if (!includeUnavailable) {
        query.isAvailable = true;
      }

      return await Availability.find(query)
        .populate('movie')
        .sort({ lastSeenAt: -1 });
    } catch (error) {
      logger.error('Error finding availabilities by platform:', error);
      throw error;
    }
  }

  /**
   * Upsert availability
   */
  async upsert(availabilityData) {
    try {
      const { movie, platform, monetizationType } = availabilityData;

      const availability = await Availability.findOneAndUpdate(
        { movie, platform, monetizationType },
        {
          $set: {
            ...availabilityData,
            isAvailable: true,
            lastSeenAt: new Date()
          },
          $setOnInsert: {
            firstSeenAt: new Date()
          }
        },
        { new: true, upsert: true, runValidators: true }
      );

      return availability;
    } catch (error) {
      logger.error('Error upserting availability:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert availabilities
   */
  async bulkUpsert(availabilitiesData) {
    try {
      const operations = availabilitiesData.map(data => ({
        updateOne: {
          filter: {
            movie: data.movie,
            platform: data.platform,
            monetizationType: data.monetizationType
          },
          update: {
            $set: {
              ...data,
              isAvailable: true,
              lastSeenAt: new Date()
            },
            $setOnInsert: {
              firstSeenAt: new Date()
            }
          },
          upsert: true
        }
      }));

      const result = await Availability.bulkWrite(operations);
      
      logger.debug(`Bulk upserted availabilities: ${result.upsertedCount} created, ${result.modifiedCount} updated`);
      
      return result;
    } catch (error) {
      logger.error('Error in bulk upsert availabilities:', error);
      throw error;
    }
  }

  /**
   * Mark stale availabilities as unavailable
   */
  async markStaleAsUnavailable(platformId, cutoffDate) {
    try {
      const result = await Availability.updateMany(
        {
          platform: platformId,
          isAvailable: true,
          lastSeenAt: { $lt: cutoffDate }
        },
        {
          $set: {
            isAvailable: false,
            lastUnavailableAt: new Date()
          }
        }
      );

      logger.info(`Marked ${result.modifiedCount} availabilities as unavailable for platform ${platformId}`);
      
      return result;
    } catch (error) {
      logger.error('Error marking stale availabilities:', error);
      throw error;
    }
  }

  /**
   * Find movies available on specific platforms with filters
   */
  async findMoviesOnPlatforms(platformIds, filters = {}) {
    try {
      const {
        monetizationTypes = ['flatrate', 'free', 'ads'],
        genres,
        minRating,
        limit = 20,
        skip = 0
      } = filters;

      const pipeline = [
        // Match available movies on specified platforms
        {
          $match: {
            platform: { $in: platformIds },
            isAvailable: true,
            monetizationType: { $in: monetizationTypes }
          }
        },
        // Lookup movie details
        {
          $lookup: {
            from: 'movies',
            localField: 'movie',
            foreignField: '_id',
            as: 'movieData'
          }
        },
        { $unwind: '$movieData' },
        // Apply movie filters
        {
          $match: {
            ...(genres && genres.length > 0 && { 'movieData.genres': { $in: genres } }),
            ...(minRating && { 'movieData.voteAverage': { $gte: minRating } })
          }
        },
        // Group by movie to avoid duplicates
        {
          $group: {
            _id: '$movie',
            movie: { $first: '$movieData' },
            platforms: { $addToSet: '$platform' },
            monetizationTypes: { $addToSet: '$monetizationType' }
          }
        },
        // Sort and paginate
        { $sort: { 'movie.popularity': -1 } },
        { $skip: skip },
        { $limit: limit }
      ];

      const results = await Availability.aggregate(pipeline);
      
      return results;
    } catch (error) {
      logger.error('Error finding movies on platforms:', error);
      throw error;
    }
  }

  /**
   * Build platform summary for a movie (denormalized platforms array)
   */
  async buildPlatformSummary(movieId) {
    try {
      return await Availability.aggregate([
        { $match: { movie: movieId, isAvailable: true } },
        {
          $lookup: {
            from: 'platforms',
            localField: 'platform',
            foreignField: '_id',
            as: 'platformData'
          }
        },
        { $unwind: '$platformData' },
        {
          $group: {
            _id: '$platform',
            platformName: { $first: '$platformData.name' },
            platformSlug: { $first: '$platformData.slug' },
            monetizationTypes: { $addToSet: '$monetizationType' }
          }
        },
        {
          $project: {
            platformId: '$_id',
            platformName: 1,
            platformSlug: 1,
            monetizationTypes: 1,
            _id: 0
          }
        }
      ]);
    } catch (error) {
      logger.error('Error building platform summary:', error);
      throw error;
    }
  }

  /**
   * Get availability statistics
   */
  async getStatistics() {
    try {
      const total = await Availability.countDocuments();
      const available = await Availability.countDocuments({ isAvailable: true });
      const unavailable = total - available;

      const byPlatform = await Availability.aggregate([
        { $match: { isAvailable: true } },
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'platforms',
            localField: '_id',
            foreignField: '_id',
            as: 'platform'
          }
        },
        { $unwind: '$platform' },
        {
          $project: {
            platformName: '$platform.name',
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        total,
        available,
        unavailable,
        byPlatform
      };
    } catch (error) {
      logger.error('Error getting availability statistics:', error);
      throw error;
    }
  }
}

module.exports = new AvailabilityRepository();
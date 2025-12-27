const Genre = require('../models/Genre');
const logger = require('../utils/logger');

class GenreRepository {
  /**
   * Find genre by TMDB ID
   */
  async findByTmdbId(tmdbId) {
    try {
      return await Genre.findOne({ tmdbId });
    } catch (error) {
      logger.error('Error finding genre by TMDB ID:', error);
      throw error;
    }
  }

  /**
   * Find genre by name (case-insensitive)
   */
  async findByName(name) {
    try {
      return await Genre.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });
    } catch (error) {
      logger.error('Error finding genre by name:', error);
      throw error;
    }
  }

  /**
   * Find or create genre (slug-safe)
   */
  async findOrCreate(genreData) {
    try {
      const existing = await this.findByTmdbId(genreData.tmdbId);
      if (existing) {
        return existing;
      }

      const genre = await Genre.findOneAndUpdate(
        { tmdbId: genreData.tmdbId },
        {
          $set: {
            name: genreData.name,
            slug: genreData.slug,
            updatedAt: new Date()
          },
          $setOnInsert: {
            tmdbId: genreData.tmdbId,
            createdAt: new Date()
          }
        },
        {
          new: true,
          upsert: true
        }
      );

      logger.debug(`Created new genre: ${genre.name}`);
      return genre;
    } catch (error) {
      logger.error('Error in findOrCreate genre:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert genres (slug-safe, index-safe)
   */
  async bulkUpsert(genresData) {
    try {
      const operations = genresData.map(g => ({
        updateOne: {
          filter: { tmdbId: g.tmdbId },
          update: {
            $set: {
              name: g.name,
              slug: g.slug,
              updatedAt: new Date()
            },
            $setOnInsert: {
              tmdbId: g.tmdbId,
              createdAt: new Date()
            }
          },
          upsert: true
        }
      }));

      const result = await Genre.bulkWrite(operations, { ordered: false });

      logger.debug(
        `Bulk upserted genres — inserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`
      );

      return result;
    } catch (error) {
      logger.error('Error in bulk upsert genres:', error);
      throw error;
    }
  }

  /**
   * Get all genres
   */
  async findAll() {
    try {
      return await Genre.find().sort({ name: 1 });
    } catch (error) {
      logger.error('Error finding all genres:', error);
      throw error;
    }
  }

  /**
   * Find genres by IDs
   */
  async findByIds(ids) {
    try {
      return await Genre.find({ _id: { $in: ids } });
    } catch (error) {
      logger.error('Error finding genres by IDs:', error);
      throw error;
    }
  }
}

module.exports = new GenreRepository();

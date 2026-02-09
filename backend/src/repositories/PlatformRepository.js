const Platform = require('../models/Platform');
const logger = require('../utils/logger');

class PlatformRepository {
  /**
   * Find platform by JustWatch ID
   */
  async findByJustWatchId(justWatchId) {
    try {
      if (!justWatchId) return null;
      return await Platform.findOne({ justWatchId: justWatchId.toString() });
    } catch (error) {
      logger.error('Error finding platform by JustWatch ID:', error);
      throw error;
    }
  }

  /**
   * Find platform by name
   */
  async findByName(name) {
    try {
      return await Platform.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    } catch (error) {
      logger.error('Error finding platform by name:', error);
      throw error;
    }
  }

  /**
   * Find or create platform
   * Ensures slug is always set
   */
  async findOrCreate(platformData) {
    try {
      // First try to find by justWatchId
      let existing = await this.findByJustWatchId(platformData.justWatchId);
      if (existing) {
        return existing;
      }

      // Generate slug
      const slug = platformData.slug || platformData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Also try to find by slug (handles case where same platform has different JustWatch IDs)
      existing = await Platform.findOne({ slug });
      if (existing) {
        return existing;
      }

      // Create new platform
      const platform = new Platform({
        ...platformData,
        slug
      });

      await platform.save();
      logger.debug(`Created new platform: ${platform.name} (slug: ${platform.slug})`);
      return platform;
    } catch (error) {
      // Handle race condition - another process created it
      if (error.code === 11000) {
        const slug = platformData.slug || platformData.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const existing = await Platform.findOne({
          $or: [{ justWatchId: platformData.justWatchId }, { slug }]
        });
        if (existing) return existing;
      }
      logger.error('Error in findOrCreate platform:', error);
      throw error;
    }
  }

  /**
   * Get all active platforms
   */
  async findAllActive() {
    try {
      return await Platform.find({ isActive: true }).sort({ name: 1 });
    } catch (error) {
      logger.error('Error finding active platforms:', error);
      throw error;
    }
  }

  /**
   * Get all platforms
   */
  async findAll() {
    try {
      return await Platform.find().sort({ name: 1 });
    } catch (error) {
      logger.error('Error finding all platforms:', error);
      throw error;
    }
  }

  /**
   * Update platform
   */
  async update(id, updateData) {
    try {
      return await Platform.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } catch (error) {
      logger.error('Error updating platform:', error);
      throw error;
    }
  }

  /**
   * Deactivate platform
   */
  async deactivate(id) {
    try {
      return await this.update(id, { isActive: false });
    } catch (error) {
      logger.error('Error deactivating platform:', error);
      throw error;
    }
  }
}

module.exports = new PlatformRepository();

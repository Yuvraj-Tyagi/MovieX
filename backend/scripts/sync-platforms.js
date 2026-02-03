require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const availabilityRepository = require('../src/repositories/AvailabilityRepository');
const logger = require('../src/utils/logger');

/**
 * Platform sync script to populate the `platforms` array on all existing movies
 * from their availability data.
 *
 * This is a one-time script to backfill the denormalized platforms field.
 *
 * Usage:
 *   node scripts/sync-platforms.js                # Process all movies
 *   node scripts/sync-platforms.js --limit 10     # Process first 10 movies
 *   node scripts/sync-platforms.js --batch-size 50 # Process 50 at a time
 */

async function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 0,        // 0 = no limit
    batchSize: 50
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1]);
      i++;
    }
  }

  return options;
}

async function syncPlatforms() {
  const options = await parseArgs();

  try {
    logger.info('=================================================');
    logger.info('PLATFORM SYNC SCRIPT');
    logger.info('=================================================');
    logger.info(`Options:`);
    logger.info(`  - Limit: ${options.limit || 'none'}`);
    logger.info(`  - Batch size: ${options.batchSize}`);
    logger.info('=================================================');

    // Connect to database
    logger.info('Connecting to database...');
    await database.connect();

    // Get total movie count
    const query = {};
    const totalCount = await Movie.countDocuments(query);
    const processCount = options.limit > 0 ? Math.min(options.limit, totalCount) : totalCount;

    logger.info(`Found ${totalCount} movies (will process ${processCount})`);

    if (processCount === 0) {
      logger.info('No movies to process. Exiting.');
      await database.disconnect();
      process.exit(0);
    }

    // Stats
    let processed = 0;
    let updated = 0;
    let noPlatforms = 0;
    let errors = 0;

    // Process in batches
    let skip = 0;
    while (skip < processCount) {
      const batchLimit = Math.min(options.batchSize, processCount - skip);

      const movies = await Movie.find(query)
        .select('_id title')
        .sort({ _id: 1 })
        .skip(skip)
        .limit(batchLimit);

      if (movies.length === 0) break;

      logger.info(`Processing batch ${Math.floor(skip / options.batchSize) + 1} (${movies.length} movies)...`);

      for (const movie of movies) {
        try {
          const platformSummary = await availabilityRepository.buildPlatformSummary(movie._id);

          if (platformSummary && platformSummary.length > 0) {
            await Movie.findByIdAndUpdate(movie._id, { platforms: platformSummary });
            updated++;
            logger.debug(`Updated: ${movie.title} (${platformSummary.length} platforms)`);
          } else {
            noPlatforms++;
            // Clear platforms array if no availability exists
            await Movie.findByIdAndUpdate(movie._id, { platforms: [] });
          }

          processed++;
        } catch (error) {
          errors++;
          logger.warn(`Error syncing platforms for ${movie.title}: ${error.message}`);
        }

        // Progress log every 50 movies
        if (processed % 50 === 0) {
          const progress = ((processed / processCount) * 100).toFixed(1);
          logger.info(`Progress: ${processed}/${processCount} (${progress}%) - Updated: ${updated}, No platforms: ${noPlatforms}, Errors: ${errors}`);
        }
      }

      skip += options.batchSize;
    }

    logger.info('=================================================');
    logger.info('PLATFORM SYNC COMPLETED');
    logger.info('=================================================');
    logger.info(`Summary:`);
    logger.info(`  - Total processed: ${processed}`);
    logger.info(`  - Movies with platforms: ${updated}`);
    logger.info(`  - Movies without platforms: ${noPlatforms}`);
    logger.info(`  - Errors: ${errors}`);
    logger.info('=================================================');

    await database.disconnect();
    process.exit(0);

  } catch (error) {
    logger.error('Platform sync script failed:', error);
    await database.disconnect();
    process.exit(1);
  }
}

// Run
syncPlatforms();

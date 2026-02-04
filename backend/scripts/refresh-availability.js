require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const Platform = require('../src/models/Platform');
const Availability = require('../src/models/Availability');
const jwClient = require('../src/services/external/JustWatchClient');
const availabilityRepository = require('../src/repositories/AvailabilityRepository');
const movieRepository = require('../src/repositories/MovieRepository');
const logger = require('../src/utils/logger');

/**
 * Refresh availability data for existing movies only (no new movies added)
 *
 * Usage:
 *   node scripts/refresh-availability.js
 *   node scripts/refresh-availability.js --limit 100
 *   node scripts/refresh-availability.js --batch-size 20
 */

async function parseArgs() {
  const args = process.argv.slice(2);
  const options = { limit: 0, batchSize: 50 };

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

async function refreshAvailability() {
  const options = await parseArgs();

  try {
    logger.info('=================================================');
    logger.info('REFRESH AVAILABILITY SCRIPT');
    logger.info('=================================================');
    logger.info(`Options: limit=${options.limit || 'none'}, batchSize=${options.batchSize}`);
    logger.info('=================================================');

    await database.connect();

    // Build platform lookup map
    const platforms = await Platform.find().lean();
    const platformByJwId = new Map(platforms.map(p => [p.justWatchId, p]));
    logger.info(`Loaded ${platforms.length} platforms`);

    // Get movies that need availability refresh (no platforms or empty)
    const query = {
      $or: [
        { platforms: { $exists: false } },
        { platforms: { $size: 0 } }
      ]
    };

    const totalCount = await Movie.countDocuments(query);
    const processCount = options.limit > 0 ? Math.min(options.limit, totalCount) : totalCount;

    logger.info(`Found ${totalCount} movies without availability (will process ${processCount})`);

    if (processCount === 0) {
      logger.info('No movies to process.');
      await database.disconnect();
      return;
    }

    let processed = 0;
    let updated = 0;
    let noOffers = 0;
    let errors = 0;
    let totalAvailabilities = 0;

    let skip = 0;
    while (skip < processCount) {
      const batchLimit = Math.min(options.batchSize, processCount - skip);
      const movies = await Movie.find(query)
        .select('_id title justWatchId')
        .sort({ _id: 1 })
        .skip(skip)
        .limit(batchLimit)
        .lean();

      if (movies.length === 0) break;

      logger.info(`Processing batch ${Math.floor(skip / options.batchSize) + 1} (${movies.length} movies)...`);

      for (const movie of movies) {
        try {
          // Fetch movie details from JustWatch API
          const jwData = await jwClient.getTitleDetails(movie.justWatchId);

          if (!jwData || !jwData.offers || jwData.offers.length === 0) {
            noOffers++;
            processed++;
            continue;
          }

          // Extract and save offers
          const offers = jwClient.extractOffers(jwData);
          let availabilitiesCreated = 0;

          for (const offer of offers) {
            if (!offer.providerId) continue;

            const platform = platformByJwId.get(offer.providerId);
            if (!platform) {
              logger.debug(`Platform not found for providerId: ${offer.providerId}`);
              continue;
            }

            try {
              await availabilityRepository.upsert({
                movie: movie._id,
                platform: platform._id,
                monetizationType: offer.monetizationType,
                quality: offer.quality,
                externalUrl: offer.url
              });
              availabilitiesCreated++;
            } catch (err) {
              logger.debug(`Failed to upsert availability: ${err.message}`);
            }
          }

          // Update movie's platform summary
          if (availabilitiesCreated > 0) {
            const platformSummary = await availabilityRepository.buildPlatformSummary(movie._id);
            await movieRepository.update(movie._id, { platforms: platformSummary });
            updated++;
            totalAvailabilities += availabilitiesCreated;
            logger.debug(`Updated: ${movie.title} (${availabilitiesCreated} availabilities)`);
          } else {
            noOffers++;
          }

          processed++;
        } catch (error) {
          errors++;
          processed++;
          logger.debug(`Error processing ${movie.title}: ${error.message}`);
        }

        // Progress log
        if (processed % 25 === 0) {
          const progress = ((processed / processCount) * 100).toFixed(1);
          logger.info(`Progress: ${processed}/${processCount} (${progress}%) - Updated: ${updated}, No offers: ${noOffers}, Errors: ${errors}`);
        }

        // Rate limiting - small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      skip += options.batchSize;
    }

    logger.info('=================================================');
    logger.info('REFRESH COMPLETE');
    logger.info('=================================================');
    logger.info(`Summary:`);
    logger.info(`  - Processed: ${processed}`);
    logger.info(`  - Updated with availability: ${updated}`);
    logger.info(`  - No offers found: ${noOffers}`);
    logger.info(`  - Errors: ${errors}`);
    logger.info(`  - Total availabilities created: ${totalAvailabilities}`);
    logger.info('=================================================');

    await database.disconnect();

  } catch (error) {
    logger.error('Script failed:', error);
    await database.disconnect();
    process.exit(1);
  }
}

refreshAvailability();

require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const tmdbClient = require('../src/services/external/TMDBClient');
const genreRepository = require('../src/repositories/GenreRepository');
const logger = require('../src/utils/logger');

/**
 * Re-enrichment script to backfill existing movies with:
 * - Directors, cast, writers, production companies from TMDB
 * - Fill any empty fields (overview, runtime, etc.)
 *
 * Usage:
 *   node scripts/re-enrich.js                    # Process all movies
 *   node scripts/re-enrich.js --limit 10         # Process first 10 movies
 *   node scripts/re-enrich.js --batch-size 20    # Process 20 at a time
 *   node scripts/re-enrich.js --delay 500        # 500ms delay between batches
 *   node scripts/re-enrich.js --force            # Re-enrich even if already enriched
 */

async function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 0,        // 0 = no limit
    batchSize: 10,
    delay: 1000,     // ms between batches
    force: false     // force re-enrichment
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      options.delay = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--force') {
      options.force = true;
    }
  }

  return options;
}

async function enrichMovie(movie) {
  // Skip movies without TMDB ID
  if (!movie.tmdbId) {
    return { skipped: true, reason: 'no_tmdb_id' };
  }

  try {
    // Fetch full movie details from TMDB
    const tmdbData = await tmdbClient.getMovieDetails(movie.tmdbId);

    if (!tmdbData) {
      return { skipped: true, reason: 'tmdb_not_found' };
    }

    // Normalize the TMDB data (includes directors, cast, writers, productionCompanies)
    const normalized = tmdbClient.normalizeMovieData(tmdbData);

    // Build update object - only update fields that are missing or need refresh
    const updateData = {
      // Always update cast/crew (new fields)
      directors: normalized.directors,
      cast: normalized.cast,
      writers: normalized.writers,
      productionCompanies: normalized.productionCompanies,

      // Update enrichment status
      isEnriched: true,
      lastEnrichedAt: new Date()
    };

    // Fill in missing fields
    if (!movie.overview && normalized.overview) {
      updateData.overview = normalized.overview;
    }
    if (!movie.tagline && normalized.tagline) {
      updateData.tagline = normalized.tagline;
    }
    if (!movie.runtime && normalized.runtime) {
      updateData.runtime = normalized.runtime;
    }
    if (!movie.posterPath && normalized.posterPath) {
      updateData.posterPath = normalized.posterPath;
    }
    if (!movie.backdropPath && normalized.backdropPath) {
      updateData.backdropPath = normalized.backdropPath;
    }
    if (!movie.voteAverage && normalized.voteAverage) {
      updateData.voteAverage = normalized.voteAverage;
    }
    if (!movie.voteCount && normalized.voteCount) {
      updateData.voteCount = normalized.voteCount;
    }
    if (!movie.popularity && normalized.popularity) {
      updateData.popularity = normalized.popularity;
    }
    if (!movie.imdbId && normalized.imdbId) {
      updateData.imdbId = normalized.imdbId;
    }
    if (!movie.originalLanguage && normalized.originalLanguage) {
      updateData.originalLanguage = normalized.originalLanguage;
    }
    if ((!movie.spokenLanguages || movie.spokenLanguages.length === 0) && normalized.spokenLanguages?.length) {
      updateData.spokenLanguages = normalized.spokenLanguages;
    }
    if ((!movie.productionCountries || movie.productionCountries.length === 0) && normalized.productionCountries?.length) {
      updateData.productionCountries = normalized.productionCountries;
    }

    // Handle genres if TMDB data has them
    if (tmdbData.genres && tmdbData.genres.length > 0) {
      const genreIds = [];
      for (const genre of tmdbData.genres) {
        const dbGenre = await genreRepository.findOrCreate(genre.id, genre.name);
        if (dbGenre) {
          genreIds.push(dbGenre._id);
        }
      }
      if (genreIds.length > 0 && (!movie.genres || movie.genres.length === 0)) {
        updateData.genres = genreIds;
      }
    }

    // Update the movie
    await Movie.findByIdAndUpdate(movie._id, updateData);

    return {
      success: true,
      directorsCount: normalized.directors.length,
      castCount: normalized.cast.length
    };

  } catch (error) {
    return { error: error.message };
  }
}

async function reEnrich() {
  const options = await parseArgs();

  try {
    logger.info('=================================================');
    logger.info('MOVIE RE-ENRICHMENT SCRIPT');
    logger.info('=================================================');
    logger.info(`Options:`);
    logger.info(`  - Limit: ${options.limit || 'none'}`);
    logger.info(`  - Batch size: ${options.batchSize}`);
    logger.info(`  - Delay between batches: ${options.delay}ms`);
    logger.info(`  - Force re-enrich: ${options.force}`);
    logger.info('=================================================');

    // Connect to database
    logger.info('Connecting to database...');
    await database.connect();

    // Build query
    const query = { tmdbId: { $exists: true, $ne: null } };
    if (!options.force) {
      // Only process movies that don't have directors (new field)
      query.$or = [
        { directors: { $exists: false } },
        { directors: { $size: 0 } }
      ];
    }

    // Get total count
    const totalCount = await Movie.countDocuments(query);
    const processCount = options.limit > 0 ? Math.min(options.limit, totalCount) : totalCount;

    logger.info(`Found ${totalCount} movies to process (will process ${processCount})`);

    if (processCount === 0) {
      logger.info('No movies to process. Exiting.');
      await database.disconnect();
      process.exit(0);
    }

    // Stats
    let processed = 0;
    let enriched = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches
    let skip = 0;
    while (skip < processCount) {
      const batchLimit = Math.min(options.batchSize, processCount - skip);

      const movies = await Movie.find(query)
        .sort({ popularity: -1 })
        .skip(skip)
        .limit(batchLimit);

      if (movies.length === 0) break;

      logger.info(`Processing batch ${Math.floor(skip / options.batchSize) + 1} (${movies.length} movies)...`);

      for (const movie of movies) {
        const result = await enrichMovie(movie);
        processed++;

        if (result.success) {
          enriched++;
          logger.debug(`Enriched: ${movie.title} (${result.directorsCount} directors, ${result.castCount} cast)`);
        } else if (result.skipped) {
          skipped++;
          logger.debug(`Skipped: ${movie.title} (${result.reason})`);
        } else if (result.error) {
          errors++;
          logger.warn(`Error enriching ${movie.title}: ${result.error}`);
        }

        // Progress log every 10 movies
        if (processed % 10 === 0) {
          const progress = ((processed / processCount) * 100).toFixed(1);
          logger.info(`Progress: ${processed}/${processCount} (${progress}%) - Enriched: ${enriched}, Skipped: ${skipped}, Errors: ${errors}`);
        }
      }

      skip += options.batchSize;

      // Delay between batches (rate limiting)
      if (skip < processCount) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }

    logger.info('=================================================');
    logger.info('RE-ENRICHMENT COMPLETED');
    logger.info('=================================================');
    logger.info(`Summary:`);
    logger.info(`  - Total processed: ${processed}`);
    logger.info(`  - Successfully enriched: ${enriched}`);
    logger.info(`  - Skipped: ${skipped}`);
    logger.info(`  - Errors: ${errors}`);
    logger.info('=================================================');

    await database.disconnect();
    process.exit(0);

  } catch (error) {
    logger.error('Re-enrichment script failed:', error);
    await database.disconnect();
    process.exit(1);
  }
}

// Run
reEnrich();

const justWatchClient = require('../external/JustWatchClient');
const platformRepository = require('../../repositories/PlatformRepository');
const movieRepository = require('../../repositories/MovieRepository');
const availabilityRepository = require('../../repositories/AvailabilityRepository');
const logger = require('../../utils/logger');

class JustWatchIngestion {
  /**
   * Sync platforms from JustWatch (GraphQL)
   */
  async syncPlatforms() {
    try {
      logger.info('Syncing platforms from JustWatch...');
      
      const providers = await justWatchClient.getProviders();
      
      if (providers.length === 0) {
        logger.warn('No providers fetched from JustWatch');
        return [];
      }

      const platforms = [];

      for (const provider of providers) {
        try {
          const platform = await platformRepository.findOrCreate({
            justWatchId: provider.packageId?.toString() || provider.id?.toString(),
            name: provider.clearName || provider.shortName || provider.technicalName,
            icon: provider.icon || null
          });

          platforms.push(platform);
        } catch (err) {
          logger.warn(`Skipping duplicate platform: ${provider.clearName || provider.shortName}`);
        }
      }

      logger.info(`Synced ${platforms.length} platforms from JustWatch`);
      return platforms;
    } catch (error) {
      logger.error('Error syncing platforms:', error);
      throw error;
    }
  }

  /**
   * Ingest popular movies from JustWatch
   * Processes all movies and their availability across all platforms
   */
  async ingestPopularMovies(maxPages = 20) {
    try {
      logger.info(`Starting ingestion of popular movies (max ${maxPages} pages)...`);

      // Clear cursor cache for fresh pagination
      justWatchClient.clearCursorCache();

      let totalMovies = 0;
      let totalAvailabilities = 0;
      let page = 1;
      let hasMorePages = true;

      while (page <= maxPages && hasMorePages) {
        logger.info(`Fetching page ${page}/${maxPages}...`);

        let response;
        try {
          response = await justWatchClient.getPopularMovies(page, 50);
        } catch (error) {
          logger.error(`Failed to fetch movies on page ${page}`, {
            message: error.message,
            stack: error.stack
          });
          break;
        }

        if (!response.items || response.items.length === 0) {
          if (page === 1) {
            logger.warn('No movies returned from JustWatch');
          } else {
            logger.info(`No more movies on page ${page}`);
          }
          break;
        }

        logger.info(`Processing ${response.items.length} movies (page ${page}, total available: ${response.total_count || 'unknown'})`);

        // Process each movie
        for (const jwMovie of response.items) {
          try {
            const result = await this.processJustWatchMovie(jwMovie, null);

            if (result) {
              totalMovies++;
              totalAvailabilities += result.availabilitiesCreated;
            }
          } catch (error) {
            logger.error(`Error processing movie ${jwMovie.id}:`, {
              message: error.message,
              stack: error.stack
            });
          }
        }

        hasMorePages = response.has_next_page === true;

        if (!hasMorePages) {
          logger.info(`Reached last page (${page})`);
          break;
        }

        page++;

        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (page > maxPages && hasMorePages) {
        logger.info(`Stopped at max pages (${maxPages}), more content available`);
      }

      logger.info(`Ingestion complete: ${totalMovies} movies, ${totalAvailabilities} availabilities`);

      return {
        movies: totalMovies,
        availabilities: totalAvailabilities
      };
    } catch (error) {
      logger.error('Error ingesting popular movies:', error);
      throw error;
    }
  }

  /**
   * Process a single JustWatch movie and its offers
   */
  async processJustWatchMovie(jwMovie, defaultPlatform = null) {
    try {
      let movieData;
      try {
        movieData = justWatchClient.normalizeMovieData(jwMovie);
      } catch (err) {
        logger.error(`Failed to normalize JustWatch movie ${jwMovie.id}`, { error: err });
        return null;
      }

      if (!movieData.justWatchId) {
        logger.warn(`Movie missing justWatchId, skipping`);
        return null;
      }

      // Check if movie already exists
      let movie = await movieRepository.findByJustWatchId(movieData.justWatchId);

      if (movie) {
        // Update existing movie if needed (preserve enriched data)
        const updateData = {
          title: movieData.title,
          originalTitle: movieData.originalTitle,
          releaseYear: movieData.releaseYear
        };

        // Only update TMDB/IMDb IDs if they're missing
        if (!movie.tmdbId && movieData.tmdbId) updateData.tmdbId = movieData.tmdbId;
        if (!movie.imdbId && movieData.imdbId) updateData.imdbId = movieData.imdbId;
        if (!movie.posterPath && movieData.posterPath) updateData.posterPath = movieData.posterPath;
        if (!movie.backdropPath && movieData.backdropPath) updateData.backdropPath = movieData.backdropPath;
        if (!movie.overview && movieData.overview) updateData.overview = movieData.overview;

        movie = await movieRepository.update(movie._id, updateData);
      } else {
        // Create new movie
        movie = await movieRepository.create(movieData);
        logger.info(`Created new movie: ${movie.title} (${movieData.releaseYear || 'N/A'})`);
      }

      // Extract and process offers (availability)
      const offers = justWatchClient.extractOffers(jwMovie);
      let availabilitiesCreated = 0;

      for (const offer of offers) {
        if (!offer.providerId && !defaultPlatform) {
          continue;
        }

        let offerPlatform = null;

        // Try to find platform by provider ID from the offer
        if (offer.providerId) {
          offerPlatform = await platformRepository.findByJustWatchId(offer.providerId);

          // Create platform if it doesn't exist
          if (!offerPlatform && offer.providerName) {
            try {
              offerPlatform = await platformRepository.findOrCreate({
                justWatchId: offer.providerId,
                name: offer.providerName
              });
              logger.debug(`Created platform: ${offer.providerName}`);
            } catch (err) {
              logger.warn(`Failed to create platform ${offer.providerName}: ${err.message}`);
            }
          }
        }

        // Fall back to default platform if provided
        if (!offerPlatform && defaultPlatform) {
          offerPlatform = defaultPlatform;
        }

        if (!offerPlatform) continue;

        // Create or update availability
        try {
          await availabilityRepository.upsert({
            movie: movie._id,
            platform: offerPlatform._id,
            monetizationType: offer.monetizationType,
            quality: offer.quality,
            externalUrl: offer.url
          });
          availabilitiesCreated++;
        } catch (err) {
          logger.warn(`Failed to upsert availability: ${err.message}`);
        }
      }

      // After processing all offers, update movie with platform summary
      if (availabilitiesCreated > 0) {
        try {
          const platformSummary = await availabilityRepository.buildPlatformSummary(movie._id);
          await movieRepository.update(movie._id, { platforms: platformSummary });
        } catch (err) {
          logger.warn(`Failed to sync platform summary for movie ${movie._id}: ${err.message}`);
        }
      }

      return { movie, availabilitiesCreated };
    } catch (error) {
      logger.error(`Error processing JustWatch movie:`, error);
      throw error;
    }
  }

  /**
   * Ingest from multiple platforms (delegates to ingestPopularMovies)
   */
  async ingestFromPlatforms(platformIds, maxPages = 20) {
    logger.info(`Ingesting movies (requested platforms: ${platformIds.length})...`);

    // Use the unified popular movies approach
    const result = await this.ingestPopularMovies(maxPages);

    return {
      results: [{ ...result }],
      summary: {
        totalMovies: result.movies,
        totalAvailabilities: result.availabilities,
        errors: 0
      }
    };
  }

  /**
   * Ingest popular movies from JustWatch
   */
  async ingestFromAllPlatforms(maxPages = 20) {
    try {
      logger.info('Starting ingestion of popular movies from JustWatch...');

      const result = await this.ingestPopularMovies(maxPages);

      return {
        results: [{ ...result }],
        summary: {
          totalMovies: result.movies,
          totalAvailabilities: result.availabilities,
          errors: 0
        }
      };
    } catch (error) {
      logger.error('Error ingesting movies:', error);
      throw error;
    }
  }
}

module.exports = new JustWatchIngestion();


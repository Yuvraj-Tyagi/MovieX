const justWatchIngestion = require('./JustWatchIngestion');
const tmdbEnrichment = require('./TMDBEnrichment');
const logger = require('../../utils/logger');

class IngestionOrchestrator {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.lastRunStatus = null;
  }

  /**
   * Execute full ingestion pipeline
   */
  async executePipeline(options = {}) {
    const {
      syncPlatforms = false,
      syncGenres = false,
      ingestMovies = true,
      enrichMovies = true,
      maxMoviesToEnrich = 50,
      platformIds = null
    } = options;

    if (this.isRunning) {
      logger.warn('Ingestion pipeline is already running');
      return {
        success: false,
        message: 'Pipeline already running'
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    logger.info('=================================================');
    logger.info('Starting catalog ingestion pipeline...');
    logger.info('=================================================');

    const results = {
      platformsSync: null,
      genresSync: null,
      moviesIngestion: null,
      moviesEnrichment: null,
      duration: null,
      success: false
    };

    try {
      // Step 1: Sync platforms (if requested)
      if (syncPlatforms) {
        logger.info('[Step 1/4] Syncing platforms from JustWatch...');
        try {
          const platforms = await justWatchIngestion.syncPlatforms();
          results.platformsSync = {
            success: true,
            count: platforms.length
          };
          logger.info(`✓ Platform sync complete: ${platforms.length} platforms`);
        } catch (error) {
          logger.error('✗ Platform sync failed:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data || null
          });
          results.platformsSync = {
            success: false,
            error: error.message || 'Unknown error'
          };
        }
      } else {
        logger.info('[Step 1/4] Skipping platform sync');
      }

      // Step 2: Sync genres (if requested)
      if (syncGenres) {
        logger.info('[Step 2/4] Syncing genres from TMDB...');
        try {
          const genres = await tmdbEnrichment.syncGenres();
          results.genresSync = {
            success: true,
            count: genres.length
          };
          logger.info(`✓ Genre sync complete: ${genres.length} genres`);
        } catch (error) {
          logger.error('✗ Genre sync failed:', {
            message: error.message,
            stack: error.stack
          });
          results.genresSync = {
            success: false,
            error: error.message || 'Unknown error'
          };
        }
      } else {
        logger.info('[Step 2/4] Skipping genre sync');
      }

      // Step 3: Ingest movies from JustWatch
      if (ingestMovies) {
        logger.info('[Step 3/4] Ingesting movies from JustWatch...');
        try {
          let ingestionResult;

          if (platformIds && platformIds.length > 0) {
            // Fetch all movies for each selected platform
            ingestionResult = await justWatchIngestion.ingestFromAllPlatforms(platformIds);
          } else {
            // Fetch all movies from all platforms
            ingestionResult = await justWatchIngestion.ingestFromAllPlatforms();
          }

          results.moviesIngestion = {
            success: true,
            totalMovies: ingestionResult?.totalMovies || 0,
            totalAvailabilities: ingestionResult?.totalAvailabilities || 0
          };
          logger.info(`✓ Movie ingestion complete: ${results.moviesIngestion.totalMovies} movies, ${results.moviesIngestion.totalAvailabilities} availabilities`);
        } catch (error) {
          logger.error('✗ Movie ingestion failed:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data || null
          });
          results.moviesIngestion = {
            success: false,
            error: error.message || 'Unknown error'
          };
        }
      } else {
        logger.info('[Step 3/4] Skipping movie ingestion');
      }

      // Step 4: Enrich movies with TMDB data
      if (enrichMovies) {
        logger.info('[Step 4/4] Enriching movies with TMDB data...');
        try {
          const enrichmentResult = await tmdbEnrichment.enrichPendingMovies(maxMoviesToEnrich);

          results.moviesEnrichment = {
            success: true,
            ...enrichmentResult
          };
          logger.info(`✓ Movie enrichment complete: ${enrichmentResult.enriched} enriched, ${enrichmentResult.failed} failed`);
        } catch (error) {
          logger.error('✗ Movie enrichment failed:', {
            message: error.message,
            stack: error.stack
          });
          results.moviesEnrichment = {
            success: false,
            error: error.message || 'Unknown error'
          };
        }
      } else {
        logger.info('[Step 4/4] Skipping movie enrichment');
      }

      results.success = true;
      results.duration = Date.now() - startTime;

      this.lastRunTime = new Date();
      this.lastRunStatus = 'success';

      logger.info('=================================================');
      logger.info(`✓ Pipeline complete in ${Math.round(results.duration / 1000)}s`);
      logger.info('=================================================');

      return results;
    } catch (error) {
      logger.error('Pipeline execution failed:', {
        message: error.message,
        stack: error.stack
      });
      
      results.success = false;
      results.error = error.message || 'Unknown error';
      results.duration = Date.now() - startTime;

      this.lastRunTime = new Date();
      this.lastRunStatus = 'failed';

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Bootstrap catalog (initial setup)
   */
  async bootstrap(platformIds = null) {
    logger.info('=================================================');
    logger.info('BOOTSTRAP: Initializing catalog from scratch');
    logger.info('=================================================');

    return await this.executePipeline({
      syncPlatforms: true,
      syncGenres: true,
      ingestMovies: true,
      enrichMovies: true,
      maxMoviesToEnrich: 100,
      platformIds
    });
  }

  /**
   * Update catalog (scheduled maintenance)
   */
  async updateCatalog() {
    logger.info('=================================================');
    logger.info('UPDATE: Refreshing catalog data');
    logger.info('=================================================');

    return await this.executePipeline({
      syncPlatforms: false,
      syncGenres: false,
      ingestMovies: true,
      enrichMovies: true,
      maxMoviesToEnrich: 50
    });
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      lastRunStatus: this.lastRunStatus
    };
  }
}

module.exports = new IngestionOrchestrator();


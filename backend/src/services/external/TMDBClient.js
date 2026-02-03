const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { RateLimiter, retryWithBackoff } = require('../../utils/apiHelpers');

class TMDBClient {
  constructor() {
    this.baseUrl = config.tmdb.baseUrl;
    this.apiKey = config.tmdb.apiKey;
    this.rateLimiter = new RateLimiter(config.tmdb.requestsPerSecond);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      params: {
        api_key: this.apiKey
      }
    });
  }

  /**
   * Make rate-limited request with retry
   */
  async request(endpoint, params = {}) {
    await this.rateLimiter.throttle();

    return retryWithBackoff(
      async () => {
        try {
          const response = await this.client.get(endpoint, { params });
          return response.data;
        } catch (error) {
          if (error.response) {
            logger.error(`TMDB API error: ${error.response.status}`, {
              endpoint,
              message: error.response.data?.status_message
            });
            
            // Don't retry on 404 or 401
            if (error.response.status === 404 || error.response.status === 401) {
              throw new Error('TMDB_NOT_FOUND');
            }
          }
          throw error;
        }
      },
      {
        onRetry: (attempt, delay) => {
          logger.warn(`Retrying TMDB request (attempt ${attempt})`, { endpoint });
        }
      }
    );
  }

  /**
   * Get movie details by TMDB ID
   */
  async getMovieDetails(tmdbId) {
    try {
      logger.debug(`Fetching TMDB details for movie ${tmdbId}`);
      
      return await this.request(`/movie/${tmdbId}`, {
        append_to_response: 'credits,external_ids'
      });
    } catch (error) {
      if (error.message === 'TMDB_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search movies by title and year
   */
  async searchMovie(title, year = null) {
    try {
      logger.debug(`Searching TMDB for: ${title}${year ? ` (${year})` : ''}`);
      
      const params = { query: title };
      if (year) {
        params.year = year;
      }

      const data = await this.request('/search/movie', params);
      return data.results || [];
    } catch (error) {
      logger.error('Error searching TMDB:', error);
      return [];
    }
  }

  /**
   * Find movie by IMDb ID
   */
  async findByImdbId(imdbId) {
    try {
      logger.debug(`Finding movie by IMDb ID: ${imdbId}`);
      
      const data = await this.request('/find/' + imdbId, {
        external_source: 'imdb_id'
      });

      return data.movie_results?.[0] || null;
    } catch (error) {
      if (error.message === 'TMDB_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all genres
   */
  async getGenres() {
    try {
      logger.debug('Fetching TMDB genres');
      
      const data = await this.request('/genre/movie/list');
      return data.genres || [];
    } catch (error) {
      logger.error('Error fetching TMDB genres:', error);
      return [];
    }
  }

  /**
   * Get movie external IDs
   */
  async getExternalIds(tmdbId) {
    try {
      logger.debug(`Fetching external IDs for TMDB movie ${tmdbId}`);
      
      return await this.request(`/movie/${tmdbId}/external_ids`);
    } catch (error) {
      if (error.message === 'TMDB_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Normalize movie data from TMDB
   */
  normalizeMovieData(tmdbMovie) {
    // Extract directors from crew
    const directors = (tmdbMovie.credits?.crew || [])
      .filter(person => person.job === 'Director')
      .slice(0, 5)
      .map(person => ({
        tmdbId: person.id,
        name: person.name,
        profilePath: person.profile_path
      }));

    // Extract top 15 cast members
    const cast = (tmdbMovie.credits?.cast || [])
      .slice(0, 15)
      .map(person => ({
        tmdbId: person.id,
        name: person.name,
        character: person.character,
        profilePath: person.profile_path,
        order: person.order
      }));

    // Extract writers from crew
    const writers = (tmdbMovie.credits?.crew || [])
      .filter(person => person.department === 'Writing')
      .slice(0, 5)
      .map(person => ({
        tmdbId: person.id,
        name: person.name,
        profilePath: person.profile_path,
        job: person.job
      }));

    // Extract production companies
    const productionCompanies = (tmdbMovie.production_companies || [])
      .slice(0, 10)
      .map(company => ({
        tmdbId: company.id,
        name: company.name,
        logoPath: company.logo_path,
        originCountry: company.origin_country
      }));

    return {
      tmdbId: tmdbMovie.id,
      imdbId: tmdbMovie.imdb_id || tmdbMovie.external_ids?.imdb_id || null,
      title: tmdbMovie.title,
      originalTitle: tmdbMovie.original_title,
      overview: tmdbMovie.overview || null,
      tagline: tmdbMovie.tagline || null,
      releaseDate: tmdbMovie.release_date ? new Date(tmdbMovie.release_date) : null,
      releaseYear: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
      runtime: tmdbMovie.runtime || null,
      posterPath: tmdbMovie.poster_path,
      backdropPath: tmdbMovie.backdrop_path,
      voteAverage: tmdbMovie.vote_average || 0,
      voteCount: tmdbMovie.vote_count || 0,
      popularity: tmdbMovie.popularity || 0,
      status: this.mapStatus(tmdbMovie.status),
      originalLanguage: tmdbMovie.original_language,
      spokenLanguages: tmdbMovie.spoken_languages?.map(l => ({
        iso: l.iso_639_1,
        name: l.name
      })) || [],
      productionCountries: tmdbMovie.production_countries?.map(c => ({
        iso: c.iso_3166_1,
        name: c.name
      })) || [],
      // Cast & Crew
      directors,
      cast,
      writers,
      productionCompanies
    };
  }

  /**
   * Map TMDB status to our status enum
   */
  mapStatus(tmdbStatus) {
    const statusMap = {
      'Rumored': 'rumored',
      'Planned': 'planned',
      'In Production': 'in_production',
      'Post Production': 'post_production',
      'Released': 'released',
      'Canceled': 'canceled'
    };

    return statusMap[tmdbStatus] || 'released';
  }
}

module.exports = new TMDBClient();
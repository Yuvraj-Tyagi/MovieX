const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { RateLimiter, retryWithBackoff } = require('../../utils/apiHelpers');

class JustWatchClient {
  constructor() {
    this.baseUrl = 'https://apis.justwatch.com';
    this.graphqlUrl = 'https://apis.justwatch.com/graphql';
    this.region = config.justWatch.region || 'IN';
    this.language = config.justWatch.language || 'en';
    this.rateLimiter = new RateLimiter(config.justWatch.requestsPerSecond);

    this.client = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.justwatch.com',
        'Referer': 'https://www.justwatch.com/'
      }
    });
  }

  /**
   * Make rate-limited request with retry
   */
  async request(url, method = 'GET', data = null, headers = {}) {
    await this.rateLimiter.throttle();

    return retryWithBackoff(
      async () => {
        try {
          const requestConfig = {
            method,
            url,
            headers: { ...this.client.defaults.headers, ...headers }
          };
          if (data) requestConfig.data = data;
          const response = await this.client(requestConfig);
          return response.data;
        } catch (error) {
          if (error.response) {
            logger.error(`JustWatch API error: ${error.response.status}`, {
              url,
              status: error.response.status,
              data: error.response.data
            });
          }
          throw error;
        }
      },
      {
        onRetry: (attempt) => {
          logger.warn(`Retrying JustWatch request (attempt ${attempt})`, { url });
        }
      }
    );
  }

  /**
   * Get available providers (platforms) for a region using GraphQL
   */
  async getProviders() {
    try {
      logger.debug(`Fetching JustWatch providers for region: ${this.region}`);

      const query = `
        query GetPackages($country: Country!) {
          packages(country: $country) {
            id
            packageId
            clearName
            technicalName
            shortName
            icon
          }
        }
      `;

      const variables = { country: this.region };

      const response = await this.request(this.graphqlUrl, 'POST', { query, variables });

      return response.data?.packages || [];
    } catch (error) {
      logger.error('Error fetching JustWatch providers:', error.message);
      return [];
    }
  }

  /**
   * Search for popular titles using updated GraphQL schema
   */
  async searchTitlesGraphQL(options = {}) {
    try {
      const { page = 1, pageSize = 30 } = options;

      logger.debug(`Searching JustWatch titles (page ${page})`);

      const query = `
        query GetPopularTitles($country: Country!, $first: Int!) {
          popularTitles(country: $country, first: $first) {
            edges {
              node {
                id
                objectId
                objectType
                content(country: $country, language: "en") {
                  title
                  originalReleaseYear
                  originalReleaseDate
                  shortDescription
                  posterUrl
                  backdrops { backdropUrl }
                  externalIds { imdbId tmdbId }
                  genres { shortName translation(language: "en") }
                }
                offers(country: $country, platform: WEB) {
                  monetizationType
                  presentationType
                  package {
                    id
                    packageId
                    clearName
                  }
                  standardWebURL
                }
              }
            }
            pageInfo { endCursor hasNextPage }
            totalCount
          }
        }
      `;

      const variables = { country: this.region, first: pageSize };

      const response = await this.request(this.graphqlUrl, 'POST', { query, variables });

      const edges = response.data?.popularTitles?.edges || [];
      const items = edges.map(edge => this.normalizeGraphQLNode(edge.node));

      const pageInfo = response.data?.popularTitles?.pageInfo || {};
      const totalCount = response.data?.popularTitles?.totalCount || 0;

      return {
        items,
        total_pages: Math.ceil(totalCount / pageSize),
        has_next_page: pageInfo.hasNextPage
      };
    } catch (error) {
      logger.error('Error searching JustWatch titles:', error.message);
      return { items: [], total_pages: 0, has_next_page: false };
    }
  }

  /**
   * Get titles by provider
   */
  async getTitlesByProvider(providerId, page = 1, pageSize = 30) {
    try {
      logger.debug(`Fetching titles from provider ${providerId}, page ${page}`);

      // Instead of using packages, we filter after getting popularTitles
      const result = await this.searchTitlesGraphQL({ page, pageSize });
      const filteredItems = result.items.filter(item =>
        item.offers.some(o => o.providerId?.toString() === providerId)
      );

      return { ...result, items: filteredItems };
    } catch (error) {
      logger.error(`Error fetching titles from provider ${providerId}:`, error.message);
      return { items: [], total_pages: 0 };
    }
  }

  normalizeGraphQLNode(node) {
    const content = node.content || {};
    return {
      id: node.objectId?.toString() || node.id,
      object_type: node.objectType,
      title: content.title,
      original_title: content.title,
      original_release_year: content.originalReleaseYear,
      release_date: content.originalReleaseDate,
      short_description: content.shortDescription,
      poster: content.posterUrl,
      backdrops: content.backdrops?.map(b => b.backdropUrl) || [],
      external_ids: {
        imdb_id: content.externalIds?.imdbId,
        tmdb_id: content.externalIds?.tmdbId
      },
      genres: content.genres || [],
      offers: node.offers || []
    };
  }

  async getTitleDetails(justWatchId) {
    try {
      logger.debug(`Fetching JustWatch title details: ${justWatchId}`);
      const endpoint = `${this.baseUrl}/content/titles/movie/${justWatchId}/locale/${this.region}`;
      return await this.request(endpoint);
    } catch (error) {
      logger.error(`Error fetching JustWatch title ${justWatchId}:`, error.message);
      return null;
    }
  }

  async searchTitles(query, page = 1) {
    try {
      logger.debug(`Searching JustWatch for: ${query}`);

      const graphqlQuery = `
        query SearchTitles($searchQuery: String!, $country: Country!) {
          titleSearch(searchQuery: $searchQuery, country: $country, first: 10) {
            edges {
              node {
                id
                objectId
                objectType
                content(country: $country, language: "en") {
                  title
                  originalReleaseYear
                }
              }
            }
          }
        }
      `;

      const response = await this.request(this.graphqlUrl, 'POST', {
        query: graphqlQuery,
        variables: { searchQuery: query, country: this.region }
      });

      const edges = response.data?.titleSearch?.edges || [];
      return edges.map(edge => this.normalizeGraphQLNode(edge.node));
    } catch (error) {
      logger.error('Error searching JustWatch:', error.message);
      return [];
    }
  }

  normalizeMovieData(jwMovie) {
    const releaseYear =
      jwMovie.original_release_year ||
      (jwMovie.release_date ? new Date(jwMovie.release_date).getFullYear() : null);

    return {
      justWatchId: jwMovie.id?.toString(),
      title: jwMovie.title,
      originalTitle: jwMovie.original_title || jwMovie.title,
      releaseYear,
      overview: jwMovie.short_description || null,
      posterPath: jwMovie.poster ? this.normalizePosterPath(jwMovie.poster) : null,
      backdropPath: jwMovie.backdrops?.[0]
        ? this.normalizePosterPath(jwMovie.backdrops[0])
        : null,
      tmdbId: jwMovie.external_ids?.tmdb_id || null,
      imdbId: jwMovie.external_ids?.imdb_id || null
    };
  }

  normalizePosterPath(poster) {
    if (!poster) return null;
    if (typeof poster === 'string') {
      if (poster.startsWith('http')) return poster;
      if (poster.includes('/poster/')) {
        const match = poster.match(/\/poster\/(\d+)/);
        return match ? `/jw_poster_${match[1]}` : null;
      }
    }
    return poster;
  }

  extractOffers(jwMovie) {
    if (!jwMovie.offers || jwMovie.offers.length === 0) return [];
    return jwMovie.offers.map(offer => ({
      providerId: offer.package?.packageId?.toString() || offer.package?.id?.toString(),
      providerName: offer.package?.clearName || null,
      monetizationType: this.mapMonetizationType(offer.monetizationType),
      quality: offer.presentationType || 'unknown',
      url: offer.standardWebURL || null
    }));
  }

  mapMonetizationType(jwType) {
    const typeMap = {
      FLATRATE: 'flatrate',
      RENT: 'rent',
      BUY: 'buy',
      ADS: 'ads',
      FREE: 'free',
      FLATRATE_AND_BUY: 'flatrate'
    };
    return typeMap[jwType?.toUpperCase()] || 'flatrate';
  }

  extractGenres(jwMovie) {
    if (!jwMovie.genres) return [];
    return jwMovie.genres.map(genre => ({
      name: genre.translation || genre.shortName,
      slug: genre.shortName
    }));
  }
}

module.exports = new JustWatchClient();


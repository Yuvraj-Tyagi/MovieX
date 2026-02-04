require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const Platform = require('../src/models/Platform');
const jwClient = require('../src/services/external/JustWatchClient');
const availabilityRepository = require('../src/repositories/AvailabilityRepository');
const logger = require('../src/utils/logger');

/**
 * Fix movies with TMDB IDs by looking up their real JustWatch IDs
 * Uses JustWatch search API to find movies by title + year
 *
 * Usage:
 *   node scripts/fix-justwatch-ids.js
 *   node scripts/fix-justwatch-ids.js --limit 50
 */

async function parseArgs() {
  const args = process.argv.slice(2);
  const options = { limit: 0 };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1]);
      i++;
    }
  }
  return options;
}

async function searchJustWatch(title, year, tmdbId) {
  try {
    const query = `
      query SearchTitles($country: Country!, $searchQuery: String!, $first: Int!) {
        popularTitles(
          country: $country,
          first: $first,
          filter: {
            objectTypes: [MOVIE],
            searchQuery: $searchQuery
          }
        ) {
          edges {
            node {
              id
              objectId
              objectType
              content(country: $country, language: "en") {
                title
                originalReleaseYear
                externalIds { imdbId tmdbId }
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
        }
      }
    `;

    const variables = {
      country: 'IN',
      searchQuery: title,
      first: 15
    };

    const response = await jwClient.request('https://apis.justwatch.com/graphql', 'POST', { query, variables });

    const edges = response.data?.popularTitles?.edges || [];
    if (edges.length === 0) return null;

    // First try to match by TMDB ID (most accurate)
    if (tmdbId) {
      for (const edge of edges) {
        const nodeTmdbId = edge.node.content?.externalIds?.tmdbId;
        if (nodeTmdbId && nodeTmdbId.toString() === tmdbId.toString()) {
          return normalizeNode(edge.node);
        }
      }
    }

    // Then try to match by year
    for (const edge of edges) {
      const nodeYear = edge.node.content?.originalReleaseYear;
      if (nodeYear === year || Math.abs((nodeYear || 0) - year) <= 1) {
        return normalizeNode(edge.node);
      }
    }

    // Return first result if title matches exactly
    const first = edges[0];
    if (first.node.content?.title?.toLowerCase() === title.toLowerCase()) {
      return normalizeNode(first.node);
    }

    return null;
  } catch (error) {
    return null;
  }
}

function normalizeNode(node) {
  // Process offers into the format we need
  const offers = (node.offers || []).map(offer => ({
    providerId: offer.package?.packageId?.toString(),
    providerName: offer.package?.clearName,
    monetizationType: mapMonetizationType(offer.monetizationType),
    quality: normalizeQuality(offer.presentationType),
    url: offer.standardWebURL
  })).filter(o => o.providerId);

  return {
    id: node.objectId?.toString() || node.id,
    title: node.content?.title,
    original_release_year: node.content?.originalReleaseYear,
    offers
  };
}

function mapMonetizationType(type) {
  if (!type) return 'unknown';
  const map = {
    'FLATRATE': 'flatrate',
    'RENT': 'rent',
    'BUY': 'buy',
    'ADS': 'ads',
    'FREE': 'free'
  };
  return map[type.toUpperCase()] || type.toLowerCase();
}

function normalizeQuality(quality) {
  if (!quality) return 'unknown';
  const q = quality.toUpperCase();
  if (q.includes('4K') || q === 'UHD') return '4K';
  if (q === 'HD' || q.includes('HD')) return 'HD';
  if (q === 'SD') return 'SD';
  return 'unknown';
}

async function fixJustWatchIds() {
  const options = await parseArgs();

  try {
    console.log('=================================================');
    console.log('FIX JUSTWATCH IDs SCRIPT');
    console.log('=================================================');

    await database.connect();

    // Build platform lookup map
    const platforms = await Platform.find().lean();
    const platformByJwId = new Map(platforms.map(p => [p.justWatchId, p]));
    console.log(`Loaded ${platforms.length} platforms`);

    // Find movies with tmdb_ prefix
    const query = { justWatchId: /^tmdb_/ };
    const totalCount = await Movie.countDocuments(query);
    const processCount = options.limit > 0 ? Math.min(options.limit, totalCount) : totalCount;

    console.log(`Found ${totalCount} movies with TMDB IDs (will process ${processCount})`);

    if (processCount === 0) {
      console.log('No movies to fix.');
      await database.disconnect();
      return;
    }

    let processed = 0;
    let fixed = 0;
    let notFound = 0;
    let duplicates = 0;
    let errors = 0;
    let totalAvailabilities = 0;

    const movies = await Movie.find(query)
      .select('_id title justWatchId releaseYear tmdbId')
      .sort({ _id: 1 })
      .limit(processCount)
      .lean();

    for (const movie of movies) {
      try {
        const year = movie.releaseYear || 0;
        const tmdbId = movie.tmdbId || movie.justWatchId?.replace('tmdb_', '');

        // Search JustWatch for this movie
        const jwMovie = await searchJustWatch(movie.title, year, tmdbId);

        if (!jwMovie || !jwMovie.id) {
          notFound++;
          processed++;
          continue;
        }

        const newJustWatchId = jwMovie.id.toString();

        // Check if another movie already has this JustWatch ID
        const existing = await Movie.findOne({
          justWatchId: newJustWatchId,
          _id: { $ne: movie._id }
        });

        if (existing) {
          duplicates++;
          processed++;
          continue;
        }

        // Update movie with correct JustWatch ID
        await Movie.findByIdAndUpdate(movie._id, { justWatchId: newJustWatchId });

        // Process offers/availability
        let availabilitiesCreated = 0;
        for (const offer of jwMovie.offers) {
          const platform = platformByJwId.get(offer.providerId);
          if (!platform) continue;

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
            // Ignore duplicate errors
          }
        }

        // Update platform summary
        if (availabilitiesCreated > 0) {
          const platformSummary = await availabilityRepository.buildPlatformSummary(movie._id);
          await Movie.findByIdAndUpdate(movie._id, { platforms: platformSummary });
        }

        fixed++;
        totalAvailabilities += availabilitiesCreated;
        console.log(`✓ ${movie.title} → JW:${newJustWatchId} (${availabilitiesCreated} platforms)`);

        processed++;
      } catch (error) {
        errors++;
        processed++;
        console.log(`✗ ${movie.title}: ${error.message}`);
      }

      // Progress log every 20
      if (processed % 20 === 0 && processed > 0) {
        console.log(`--- Progress: ${processed}/${processCount} | Fixed: ${fixed} | Not found: ${notFound} | Duplicates: ${duplicates} ---`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log('=================================================');
    console.log('FIX COMPLETE');
    console.log('=================================================');
    console.log(`Summary:`);
    console.log(`  - Processed: ${processed}`);
    console.log(`  - Fixed with JustWatch ID: ${fixed}`);
    console.log(`  - Not found on JustWatch: ${notFound}`);
    console.log(`  - Duplicates (already exist): ${duplicates}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Availabilities created: ${totalAvailabilities}`);
    console.log('=================================================');

    const remaining = await Movie.countDocuments({ justWatchId: /^tmdb_/ });
    console.log(`Movies still with TMDB IDs: ${remaining}`);

    await database.disconnect();

  } catch (error) {
    console.error('Script failed:', error.message);
    await database.disconnect();
    process.exit(1);
  }
}

fixJustWatchIds();

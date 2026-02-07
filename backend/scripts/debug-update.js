require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const Platform = require('../src/models/Platform');
const jwClient = require('../src/services/external/JustWatchClient');
const availabilityRepository = require('../src/repositories/AvailabilityRepository');

(async () => {
  await database.connect();

  const platforms = await Platform.find().lean();
  const platformByJwId = new Map(platforms.map(p => [p.justWatchId, p]));

  // Find a movie with real JW ID and empty platforms that has offers
  const movies = await Movie.find({
    justWatchId: { $not: /^tmdb_/ },
    $or: [{ platforms: { $exists: false } }, { platforms: { $size: 0 } }]
  }).select('_id title justWatchId').limit(10).lean();

  for (const movie of movies) {
    console.log(`\nTesting: ${movie.title} (JW: ${movie.justWatchId})`);

    const jwData = await jwClient.getTitleDetails(movie.justWatchId);
    if (!jwData || !jwData.offers || jwData.offers.length === 0) {
      console.log('  No offers found');
      continue;
    }

    const offers = jwClient.extractOffers(jwData);
    console.log(`  Extracted ${offers.length} offers`);

    let created = 0;
    for (const offer of offers) {
      if (!offer.providerId) continue;
      const platform = platformByJwId.get(offer.providerId);
      if (!platform) {
        console.log(`  Platform not found for providerId: ${offer.providerId}`);
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
        created++;
      } catch (e) {
        console.log(`  Upsert error: ${e.message}`);
      }
    }

    if (created > 0) {
      console.log(`  Created ${created} availabilities`);
      const summary = await availabilityRepository.buildPlatformSummary(movie._id);
      console.log(`  Summary: ${JSON.stringify(summary)}`);

      try {
        await Movie.findByIdAndUpdate(movie._id, { $set: { platforms: summary } }, { runValidators: true });
        console.log('  Movie update: OK');
      } catch (e) {
        console.log(`  Movie update ERROR: ${e.message}`);
        if (e.errors) {
          Object.entries(e.errors).forEach(([key, val]) => {
            console.log(`    ${key}: ${val.message}`);
          });
        }
      }
      // Only need to test one successful case
      break;
    }
  }

  await database.disconnect();
})();

require('dotenv').config();
const database = require('../src/config/database');
const jwClient = require('../src/services/external/JustWatchClient');
const Platform = require('../src/models/Platform');
const Availability = require('../src/models/Availability');
const Movie = require('../src/models/Movie');

async function debug() {
  await database.connect();

  console.log('\n=== FETCHING 1 PAGE OF POPULAR MOVIES FROM JUSTWATCH ===\n');

  // Fetch just 1 page to see what we get
  const result = await jwClient.getPopularMovies(1, 5);

  console.log(`Fetched ${result.items.length} movies\n`);

  for (const movie of result.items) {
    console.log('-------------------------------------------');
    console.log(`Movie: ${movie.title}`);
    console.log(`JustWatch ID from API: ${movie.id}`);
    console.log(`Offers count: ${movie.offers?.length || 0}`);

    if (movie.offers && movie.offers.length > 0) {
      console.log('\nSample offers from API:');
      movie.offers.slice(0, 3).forEach((offer, i) => {
        console.log(`  [${i + 1}] Provider: ${offer.package?.clearName || 'unknown'}`);
        console.log(`      packageId: ${offer.package?.packageId}`);
        console.log(`      id: ${offer.package?.id}`);
        console.log(`      monetizationType: ${offer.monetizationType}`);
      });

      // Test extractOffers
      const extracted = jwClient.extractOffers(movie);
      console.log(`\nExtracted offers: ${extracted.length}`);
      extracted.slice(0, 3).forEach((offer, i) => {
        console.log(`  [${i + 1}] providerId: "${offer.providerId}" | providerName: "${offer.providerName}"`);
      });
    } else {
      console.log('  NO OFFERS returned from JustWatch API');
    }
  }

  // Check what platforms exist in DB and their JustWatch IDs
  console.log('\n\n=== PLATFORM ID COMPARISON ===\n');

  const dbPlatforms = await Platform.find().select('name justWatchId').lean();
  const platformMap = new Map(dbPlatforms.map(p => [p.justWatchId, p.name]));

  // Get unique provider IDs from first few movies
  const providerIds = new Set();
  for (const movie of result.items) {
    if (movie.offers) {
      movie.offers.forEach(o => {
        const id = o.package?.packageId?.toString() || o.package?.id?.toString();
        if (id) providerIds.add(id);
      });
    }
  }

  console.log('Provider IDs from JustWatch API offers:');
  for (const id of providerIds) {
    const dbMatch = platformMap.get(id);
    const dbMatchTmdb = platformMap.get(`tmdb_${id}`);
    console.log(`  "${id}" -> DB match: ${dbMatch || 'NOT FOUND'} | tmdb_${id} match: ${dbMatchTmdb || 'NOT FOUND'}`);
  }

  // Show sample of DB platform justWatchIds
  console.log('\nSample platform justWatchIds in database:');
  dbPlatforms.slice(0, 10).forEach(p => {
    console.log(`  ${p.name}: "${p.justWatchId}"`);
  });

  await database.disconnect();
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});

require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const Availability = require('../src/models/Availability');
const logger = require('../src/utils/logger');

/**
 * Remove movies that have TMDB IDs instead of JustWatch IDs
 * These movies can't have availability data fetched from JustWatch
 */
async function cleanup() {
  await database.connect();

  console.log('\n=== CLEANUP: MOVIES WITH TMDB IDs ===\n');

  // Find movies with tmdb_ prefix in justWatchId
  const tmdbMovies = await Movie.find({ justWatchId: /^tmdb_/ }).select('_id title justWatchId').lean();

  // Find movies with proper JustWatch IDs (numeric only)
  const jwMovies = await Movie.find({ justWatchId: { $not: /^tmdb_/ } }).select('_id title justWatchId').lean();

  console.log(`Movies with TMDB IDs (tmdb_*): ${tmdbMovies.length}`);
  console.log(`Movies with proper JustWatch IDs: ${jwMovies.length}`);

  if (tmdbMovies.length === 0) {
    console.log('\nNo movies with TMDB IDs found. Nothing to clean up.');
    await database.disconnect();
    return;
  }

  console.log('\nSample TMDB movies to be deleted:');
  tmdbMovies.slice(0, 5).forEach(m => console.log(`  - ${m.title} (${m.justWatchId})`));

  console.log('\nSample JustWatch movies to be kept:');
  jwMovies.slice(0, 5).forEach(m => console.log(`  - ${m.title} (${m.justWatchId})`));

  // Ask for confirmation
  console.log(`\n⚠️  This will DELETE ${tmdbMovies.length} movies with TMDB IDs.`);
  console.log('These movies cannot have availability data from JustWatch.');
  console.log('\nTo proceed, run: node scripts/cleanup-tmdb-movies.js --confirm\n');

  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    await database.disconnect();
    return;
  }

  // Delete availabilities for these movies (if any exist)
  const movieIds = tmdbMovies.map(m => m._id);
  const availResult = await Availability.deleteMany({ movie: { $in: movieIds } });
  console.log(`Deleted ${availResult.deletedCount} availability records`);

  // Delete the movies
  const movieResult = await Movie.deleteMany({ justWatchId: /^tmdb_/ });
  console.log(`Deleted ${movieResult.deletedCount} movies with TMDB IDs`);

  console.log('\n=== CLEANUP COMPLETE ===\n');

  // Show remaining stats
  const remaining = await Movie.countDocuments();
  const withPlatforms = await Movie.countDocuments({ 'platforms.0': { $exists: true } });
  console.log(`Remaining movies: ${remaining}`);
  console.log(`Movies with platforms: ${withPlatforms}`);

  await database.disconnect();
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});

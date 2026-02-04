require('dotenv').config();
const database = require('../src/config/database');
const Movie = require('../src/models/Movie');
const Availability = require('../src/models/Availability');
const Platform = require('../src/models/Platform');

async function debug() {
  await database.connect();

  console.log('\n=== DATABASE STATS ===\n');

  // Count records
  const movieCount = await Movie.countDocuments();
  const availabilityCount = await Availability.countDocuments();
  const platformCount = await Platform.countDocuments();

  console.log(`Movies: ${movieCount}`);
  console.log(`Availability records: ${availabilityCount}`);
  console.log(`Platforms: ${platformCount}`);

  // Check movies with platforms populated
  const moviesWithPlatforms = await Movie.countDocuments({ 'platforms.0': { $exists: true } });
  console.log(`\nMovies with platforms array populated: ${moviesWithPlatforms}`);

  // Sample a movie
  const sampleMovie = await Movie.findOne().lean();
  if (sampleMovie) {
    console.log('\n=== SAMPLE MOVIE ===\n');
    console.log(`Title: ${sampleMovie.title}`);
    console.log(`JustWatch ID: ${sampleMovie.justWatchId}`);
    console.log(`Platforms array: ${JSON.stringify(sampleMovie.platforms, null, 2)}`);

    // Check availabilities for this movie
    const avails = await Availability.find({ movie: sampleMovie._id }).populate('platform').lean();
    console.log(`\nAvailability records for this movie: ${avails.length}`);
    if (avails.length > 0) {
      console.log('Sample availability:');
      console.log(JSON.stringify(avails[0], null, 2));
    }
  }

  // List all platforms
  console.log('\n=== ALL PLATFORMS ===\n');
  const platforms = await Platform.find().select('name slug justWatchId').lean();
  platforms.forEach(p => console.log(`- ${p.name} (${p.slug}) [JW: ${p.justWatchId}]`));

  await database.disconnect();
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});

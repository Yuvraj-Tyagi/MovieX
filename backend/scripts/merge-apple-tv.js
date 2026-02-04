require('dotenv').config();
const database = require('../src/config/database');
const Platform = require('../src/models/Platform');
const Availability = require('../src/models/Availability');

async function mergeAppleTV() {
  await database.connect();

  console.log('\n=== MERGING DUPLICATE APPLE TV PLATFORMS ===\n');

  // Find both platforms
  const appleTV = await Platform.findOne({ justWatchId: 'tmdb_2' });
  const appleTVStore = await Platform.findOne({ justWatchId: '2' });

  if (!appleTV) {
    console.log('No "Apple TV" with tmdb_2 found. Nothing to merge.');
    await database.disconnect();
    return;
  }

  if (!appleTVStore) {
    // Just fix the ID if there's no conflict
    console.log('No conflict - just fixing the ID...');
    await Platform.findByIdAndUpdate(appleTV._id, { justWatchId: '2' });
    console.log(`Fixed: Apple TV: "tmdb_2" → "2"`);
    await database.disconnect();
    return;
  }

  console.log(`Found duplicates:`);
  console.log(`  - "${appleTV.name}" (${appleTV._id}) with justWatchId: "${appleTV.justWatchId}"`);
  console.log(`  - "${appleTVStore.name}" (${appleTVStore._id}) with justWatchId: "${appleTVStore.justWatchId}"`);

  // Move all availability records from appleTV to appleTVStore
  const updateResult = await Availability.updateMany(
    { platform: appleTV._id },
    { $set: { platform: appleTVStore._id } }
  );
  console.log(`\nMoved ${updateResult.modifiedCount} availability records to "${appleTVStore.name}"`);

  // Delete the duplicate platform
  await Platform.findByIdAndDelete(appleTV._id);
  console.log(`Deleted duplicate platform: "${appleTV.name}"`);

  // Optionally rename "Apple TV Store" to just "Apple TV" for consistency
  await Platform.findByIdAndUpdate(appleTVStore._id, { name: 'Apple TV' });
  console.log(`Renamed "Apple TV Store" to "Apple TV"`);

  console.log('\n=== MERGE COMPLETE ===\n');

  await database.disconnect();
}

mergeAppleTV().catch(err => {
  console.error(err);
  process.exit(1);
});

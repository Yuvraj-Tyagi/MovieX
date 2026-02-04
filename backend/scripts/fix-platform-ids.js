require('dotenv').config();
const database = require('../src/config/database');
const Platform = require('../src/models/Platform');
const logger = require('../src/utils/logger');

/**
 * Fix platform justWatchIds by removing the incorrect "tmdb_" prefix
 */
async function fixPlatformIds() {
  await database.connect();

  console.log('\n=== FIXING PLATFORM JUSTWATCH IDS ===\n');

  // Find all platforms with tmdb_ prefix
  const platforms = await Platform.find({ justWatchId: /^tmdb_/ }).lean();

  console.log(`Found ${platforms.length} platforms with "tmdb_" prefix\n`);

  let fixed = 0;
  for (const platform of platforms) {
    const oldId = platform.justWatchId;
    const newId = oldId.replace('tmdb_', '');

    // Check if a platform with the correct ID already exists
    const existing = await Platform.findOne({ justWatchId: newId });
    if (existing) {
      console.log(`SKIP: ${platform.name} - "${newId}" already exists (will merge later)`);
      continue;
    }

    await Platform.findByIdAndUpdate(platform._id, { justWatchId: newId });
    console.log(`FIXED: ${platform.name}: "${oldId}" → "${newId}"`);
    fixed++;
  }

  console.log(`\n=== FIXED ${fixed} PLATFORMS ===\n`);

  // Show current state
  const allPlatforms = await Platform.find().select('name justWatchId').sort({ name: 1 }).lean();
  console.log('Current platform IDs:');
  allPlatforms.forEach(p => console.log(`  ${p.name}: "${p.justWatchId}"`));

  await database.disconnect();
}

fixPlatformIds().catch(err => {
  console.error(err);
  process.exit(1);
});

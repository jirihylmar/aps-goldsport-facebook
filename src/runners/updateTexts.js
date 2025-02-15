const fs = require('fs');
const path = require('path');
const TextPusher = require('../pushers/textPusher');

async function findCampaignDetailsFile(campaignId) {
  const outputDir = path.join(process.cwd(), '_scratch');
  const files = fs.readdirSync(outputDir)
    .filter(f => f.startsWith(`campaign_${campaignId}___`) && f.endsWith('___details.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error(`No campaign details file found for campaign ID ${campaignId}`);
  }

  return path.join(outputDir, files[0]);
}

async function updateTexts(campaignId, textsFilePath) {
  try {
    console.log('Updating texts for campaign:', campaignId);
    console.log('Using texts from:', textsFilePath);

    // Find and read the campaign details file
    const campaignDetailsPath = await findCampaignDetailsFile(campaignId);
    console.log('Using campaign details from:', campaignDetailsPath);
    
    const campaignDetails = JSON.parse(fs.readFileSync(campaignDetailsPath, 'utf8'));
    
    // Extract all ad IDs from the campaign
    const adIds = campaignDetails.ads.map(ad => ad.id);
    
    if (adIds.length === 0) {
      throw new Error('No ads found in campaign details');
    }

    // Create text pusher instance
    const pusher = new TextPusher();

    // Update texts for each ad
    const results = [];
    for (const adId of adIds) {
      console.log(`Updating texts for ad: ${adId}`);
      const result = await pusher.loadAndPushTexts(adId, textsFilePath);
      results.push({ adId, result });
    }

    // Check if any updates failed
    const failures = results.filter(r => !r.result.success);
    if (failures.length > 0) {
      console.error('Some updates failed:', failures);
      process.exit(1);
    }

    console.log('All texts updated successfully!');
    
  } catch (error) {
    console.error('Error updating texts:', error);
    process.exit(1);
  }
}

// If called directly
if (require.main === module) {
  const campaignId = process.argv[2];
  const textsFilePath = process.argv[3];
  
  if (!campaignId || !textsFilePath) {
    console.error('Usage: node updateTexts.js <campaignId> <textsFilePath>');
    process.exit(1);
  }
  
  updateTexts(campaignId, textsFilePath);
}

module.exports = { updateTexts };
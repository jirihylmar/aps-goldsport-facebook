// fetchDetails.js
const CampaignDetailsFetcher = require('../fetchers/campaign/campaignDetailsFetcher');
const AdSetDetailsFetcher = require('../fetchers/adset/adsetDetailsFetcher');
const AdDetailsFetcher = require('../fetchers/ad/adDetailsFetcher');
const fs = require('fs').promises;
const path = require('path');

class DetailsFetcher {
    constructor() {
        this.campaignFetcher = new CampaignDetailsFetcher();
        this.adSetFetcher = new AdSetDetailsFetcher();
        this.adFetcher = new AdDetailsFetcher();
        this.outputDir = path.join(__dirname, '../output');
    }

    _formatCampaignId(campaignId) {
        const numericId = campaignId.match(/\d+/);
        if (numericId) {
            return numericId[0];
        }
        return campaignId;
    }

    async fetchAllDetails(campaignId) {
        console.log(`\nStarting detailed fetch for campaign: ${campaignId}`);
        
        try {
            const formattedCampaignId = this._formatCampaignId(campaignId);
            console.log(`Using formatted campaign ID: ${formattedCampaignId}`);
            
            const details = await this._fetchCampaignStructure(formattedCampaignId);
            await this._saveResults(formattedCampaignId, details);
            return details;
        } catch (error) {
            console.error('Error in fetch process:', error);
            throw error;
        }
    }

    async _fetchCampaignStructure(campaignId) {
        const results = {
            campaign: {},
            adSets: [],
            ads: []
        };

        try {
            // 1. Campaign Details
            console.log('\n1. Fetching campaign details...');
            results.campaign = await this._fetchCampaignDetails(campaignId);
            
            if (!results.campaign || !results.campaign.id) {
                throw new Error('Failed to fetch campaign details');
            }
            
            console.log('Campaign basic info retrieved:', results.campaign.name);

            // 2. Ad Sets
            console.log('\n2. Fetching ad sets...');
            const adSets = await this.adSetFetcher.fetchAdSets(campaignId);
            console.log(`Found ${adSets.length} ad sets`);

            // 3. Process Ad Sets and Ads
            console.log('\n3. Processing ad sets and their ads...');
            for (const adSet of adSets) {
                const adSetDetails = await this._processAdSet(adSet);
                results.adSets.push(adSetDetails);
                
                if (adSetDetails.ads) {
                    results.ads.push(...adSetDetails.ads);
                }
            }

            return results;
        } catch (error) {
            console.error('Error in campaign structure fetch:', error);
            throw error;
        }
    }

    async _fetchCampaignDetails(campaignId) {
        try {
            console.log(`Fetching details for campaign ID: ${campaignId}`);
            
            const [basic, budget, schedule, insights] = await Promise.all([
                this.campaignFetcher.fetchBasicDetails(campaignId),
                this.campaignFetcher.fetchBudgetDetails(campaignId),
                this.campaignFetcher.fetchScheduleDetails(campaignId),
                this.campaignFetcher.fetchInsightsDetails(campaignId)
            ]);

            if (!basic || !basic.id) {
                throw new Error('Failed to fetch basic campaign details');
            }

            // Combine all details
            const details = {
                id: basic.id,
                name: basic.name,
                objective: basic.objective,
                status: basic.status,
                special_ad_categories: basic.special_ad_categories,
                
                // Budget details
                daily_budget: budget.daily_budget,
                lifetime_budget: budget.lifetime_budget,
                budget_remaining: budget.budget_remaining,
                spend_cap: budget.spend_cap,

                // Schedule details
                start_time: schedule.start_time,
                stop_time: schedule.stop_time,
                updated_time: schedule.updated_time,
                created_time: schedule.created_time,

                // Insights
                insights: insights,

                // Track missing fields
                _missingFields: []
            };

            // Check for missing required fields
            const requiredFields = ['id', 'name', 'status', 'objective'];
            details._missingFields = requiredFields.filter(field => !details[field]);

            return details;
        } catch (error) {
            console.error('Error fetching campaign details:', error);
            throw error;
        }
    }

    async _processAdSet(adSet) {
        try {
            console.log(`\nProcessing ad set: ${adSet.name} (${adSet.id})`);
            
            const [targeting, scheduleAndBudget] = await Promise.all([
                this.adSetFetcher.fetchTargetingDetails(adSet.id),
                this.adSetFetcher.fetchScheduleAndBudget(adSet.id)
            ]);

            const ads = await this.adFetcher.fetchAds(adSet.id);
            console.log(`Found ${ads.length} ads in ad set`);

            const processedAds = await Promise.all(
                ads.map(ad => this._processAd(ad))
            );

            return {
                ...adSet,
                targeting,
                scheduleAndBudget,
                ads: processedAds.filter(Boolean),
                _missingFields: [
                    ...(targeting._missingFields || []),
                    ...(scheduleAndBudget._missingFields || [])
                ]
            };
        } catch (error) {
            console.error(`Error processing ad set ${adSet.id}:`, error);
            return {
                ...adSet,
                _error: error.message
            };
        }
    }

    async _processAd(ad) {
        try {
            console.log(`Processing ad: ${ad.name} (${ad.id})`);

            if (!ad.creative?.id) {
                console.warn(`No creative ID found for ad ${ad.id}`);
                return {
                    ...ad,
                    _error: 'No creative ID found'
                };
            }

            const media = await this.adFetcher.fetchMediaDetails(ad.creative.id);

            return {
                ...ad,
                media,
                _missingFields: media._missingFields || []
            };
        } catch (error) {
            console.error(`Error processing ad ${ad.id}:`, error);
            return {
                ...ad,
                _error: error.message
            };
        }
    }

    async _saveResults(campaignId, results) {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // Sanitize campaign name to be filename-safe (replace spaces and special chars with underscores)
            const safeNameFormat = results.campaign.name.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `campaign_${campaignId}___${safeNameFormat}___${timestamp}___details.json`;

            // Save detailed results
            const detailsPath = path.join(this.outputDir, filename);
            await fs.writeFile(detailsPath, JSON.stringify(results, null, 2));

            console.log(`\nFile saved: ${detailsPath}`);

            return { detailsPath };
        } catch (error) {
            console.error('Error saving results:', error);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const campaignId = process.argv[2];
    if (!campaignId) {
        console.error('Please provide a campaign ID as an argument');
        process.exit(1);
    }

    const fetcher = new DetailsFetcher();
    fetcher.fetchAllDetails(campaignId)
        .then(results => {
            console.log('\nFetch completed successfully!');
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = DetailsFetcher;
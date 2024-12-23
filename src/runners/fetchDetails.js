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

    _generateSummary(results) {
        // Process campaign details
        const campaign = {
            basic: {
                id: results.campaign.id,
                name: results.campaign.name,
                status: results.campaign.status,
                objective: results.campaign.objective,
                special_ad_categories: results.campaign.special_ad_categories || []
            },
            timing: {
                created: results.campaign.created_time,
                updated: results.campaign.updated_time,
                start: results.campaign.start_time,
                end: results.campaign.stop_time
            },
            budget: {
                daily: results.campaign.daily_budget,
                lifetime: results.campaign.lifetime_budget,
                remaining: results.campaign.budget_remaining
            }
        };

        // Process ad sets
        const adSets = results.adSets.map(adSet => ({
            id: adSet.id,
            name: adSet.name,
            status: adSet.status,
            targeting: {
                demographics: {
                    age: {
                        min: adSet.targeting?.targeting?.age_min,
                        max: adSet.targeting?.targeting?.age_max
                    },
                    locales: adSet.targeting?.targeting?.locales
                },
                locations: adSet.targeting?.targeting?.geo_locations,
                excluded_audiences: adSet.targeting?.targeting?.excluded_custom_audiences?.map(aud => ({
                    id: aud.id,
                    name: aud.name
                }))
            },
            optimization: {
                goal: adSet.targeting?.optimization_goal,
                billing: adSet.targeting?.billing_event
            },
            budget: {
                daily: adSet.scheduleAndBudget?.daily_budget,
                lifetime: adSet.scheduleAndBudget?.lifetime_budget
            },
            schedule: {
                start: adSet.scheduleAndBudget?.start_time,
                end: adSet.scheduleAndBudget?.end_time
            }
        }));

        // Process ads and their creatives
        const ads = results.ads.map(ad => ({
            id: ad.id,
            name: ad.name,
            status: ad.status,
            creative: {
                id: ad.creative?.id,
                content: ad.media?.content
            }
        }));

        // Compile final summary
        return {
            campaign,
            statistics: {
                counts: {
                    adSets: adSets.length,
                    ads: ads.length
                },
                status: {
                    campaign: campaign.basic.status,
                    adSets: adSets.reduce((acc, as) => {
                        acc[as.status] = (acc[as.status] || 0) + 1;
                        return acc;
                    }, {}),
                    ads: ads.reduce((acc, ad) => {
                        acc[ad.status] = (acc[ad.status] || 0) + 1;
                        return acc;
                    }, {})
                }
            },
            targeting: {
                locations: Array.from(new Set(adSets.flatMap(as => 
                    as.targeting.locations?.cities?.map(c => c.name) || []
                ))),
                ages: {
                    min: Math.min(...adSets.map(as => as.targeting.demographics.age.min).filter(Boolean)),
                    max: Math.max(...adSets.map(as => as.targeting.demographics.age.max).filter(Boolean))
                }
            },
            details: {
                adSets,
                ads
            }
        };
    }

    async _saveResults(campaignId, results) {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseFilename = `campaign_${campaignId}_${timestamp}`;

            // Save detailed results
            const detailsPath = path.join(this.outputDir, `${baseFilename}_details.json`);
            await fs.writeFile(detailsPath, JSON.stringify(results, null, 2));

            // Generate and save summary
            const summary = this._generateSummary(results);
            const summaryPath = path.join(this.outputDir, `${baseFilename}_summary.json`);
            await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

            console.log(`\nFiles saved:`);
            console.log(`- Details: ${detailsPath}`);
            console.log(`- Summary: ${summaryPath}`);

            return { detailsPath, summaryPath };
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
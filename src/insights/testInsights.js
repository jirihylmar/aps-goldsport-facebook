// testInsights.js
const FB = require('fb');
const fs = require('fs').promises;
const path = require('path');
const FacebookConfig = require('../utils/fbConfig');

class CampaignInsights {
    constructor() {
        const fbConfig = new FacebookConfig();
        
        FB.setAccessToken(fbConfig.getAccessToken());
        FB.options({ version: fbConfig.getApiVersion() });
        
        this.accountId = fbConfig.getAccountId();
    }

    async getCampaignInsights(params = {}) {
        const {
            datePreset = 'last_7d',
            fields = [
                'campaign_id',
                'campaign_name',
                'impressions',
                'clicks',
                'spend',
                'reach',
                'cpc',
                'ctr',
                'unique_clicks'
            ],
            level = 'campaign',
            filtering = null
        } = params;

        try {
            const endpoint = `/act_${this.accountId}/insights`;
            
            const queryParams = {
                date_preset: datePreset,
                fields: fields.join(','),
                level: level
            };

            if (filtering) {
                queryParams.filtering = JSON.stringify(filtering);
            }

            return await this._makeApiCall(endpoint, 'GET', queryParams);
        } catch (error) {
            throw new Error(`Failed to get campaign insights: ${error.message}`);
        }
    }

    async getSpecificCampaignInsights(campaignIds, params = {}) {
        const campaigns = Array.isArray(campaignIds) ? campaignIds : [campaignIds];
        
        try {
            const baseParams = {
                ...params,
                filtering: [{
                    field: "campaign.id",
                    operator: "IN",
                    value: campaigns
                }]
            };

            return await this.getCampaignInsights(baseParams);
        } catch (error) {
            throw new Error(`Failed to get specific campaign insights: ${error.message}`);
        }
    }

    _makeApiCall(endpoint, method, params) {
        return new Promise((resolve, reject) => {
            console.log('\nMaking API call:');
            console.log('Endpoint:', endpoint);
            console.log('Method:', method);
            console.log('Params:', JSON.stringify(params, null, 2));
            
            FB.api(endpoint, method, params, (response) => {
                if (!response || response.error) {
                    const error = response?.error || { message: 'Unknown error' };
                    console.error('API Error:', JSON.stringify(error, null, 2));
                    reject(error);
                    return;
                }
                
                console.log('API Response:', JSON.stringify(response, null, 2));
                resolve(response);
            });
        });
    }
}

class TestLogger {
    constructor(outputPath) {
        this.outputPath = outputPath;
        this.logs = [];
    }

    log(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ');
        console.log(message);
        this.logs.push(message);
    }

    error(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ');
        console.error(message);
        this.logs.push(`ERROR: ${message}`);
    }

    async saveToFile() {
        try {
            await fs.writeFile(this.outputPath, this.logs.join('\n'));
            console.log(`\nTest results saved to ${this.outputPath}`);
        } catch (error) {
            console.error(`Failed to save test results: ${error.message}`);
        }
    }
}
 
async function testInsights() {
    const logger = new TestLogger(path.join(__dirname, 'testInsightsOutput.txt'));
    
    try {
        logger.log('=== Testing Facebook Campaign Insights ===');
        const insights = new CampaignInsights();
        
        // Test 1: Get list of campaigns with IDs
        logger.log('\nTest 1: Getting campaign list with IDs');
        const campaignList = await insights.getCampaignInsights({
            datePreset: 'last_7d',
            fields: ['campaign_id', 'campaign_name', 'impressions', 'clicks', 'spend'],
            level: 'campaign'
        });

        logger.log('Campaign List:', campaignList);

        // Store campaign IDs for specific testing
        const campaigns = campaignList.data.map(campaign => ({
            id: campaign.campaign_id,
            name: campaign.campaign_name
        }));

        if (campaigns.length > 0) {
            // Test 2: Get specific campaign details
            logger.log('\nTest 2: Getting specific campaign details');
            const specificCampaign = campaigns[0];
            logger.log(`Testing campaign: ${specificCampaign.name}`);
            
            const specificInsights = await insights.getSpecificCampaignInsights([specificCampaign.id], {
                datePreset: 'last_7d',
                fields: [
                    'campaign_name',
                    'impressions',
                    'clicks',
                    'spend',
                    'reach',
                    'cpc',
                    'ctr',
                    'unique_clicks'
                ]
            });

            logger.log('Specific Campaign Insights:', specificInsights);

            if (specificInsights.data) {
                logger.log('\nCampaign Performance Summary:');
                specificInsights.data.forEach(campaign => {
                    logger.log(`\nCampaign: ${campaign.campaign_name}`);
                    logger.log(`- Impressions: ${campaign.impressions || 0}`);
                    logger.log(`- Clicks: ${campaign.clicks || 0}`);
                    logger.log(`- Spend: ${campaign.spend || 0}`);
                    logger.log(`- Reach: ${campaign.reach || 0}`);
                    logger.log(`- CPC: ${campaign.cpc || 0}`);
                    logger.log(`- CTR: ${campaign.ctr || 0}%`);
                    logger.log(`- Unique Clicks: ${campaign.unique_clicks || 0}`);
                });
            }
        }

        // Test 3: Compare campaigns
        if (campaigns.length > 1) {
            logger.log('\nTest 3: Comparing campaign performance');
            const campaignIds = campaigns.map(c => c.id);
            
            const comparison = await insights.getSpecificCampaignInsights(campaignIds, {
                datePreset: 'last_7d',
                fields: [
                    'campaign_name',
                    'impressions',
                    'reach',
                    'clicks',
                    'spend',
                    'cpc',
                    'ctr'
                ]
            });
            
            logger.log('Campaigns Comparison:', comparison);

            if (comparison.data) {
                logger.log('\nCampaigns Comparison Summary:');
                comparison.data.forEach(campaign => {
                    logger.log(`\nCampaign: ${campaign.campaign_name}`);
                    logger.log(`- Impressions: ${campaign.impressions || 0}`);
                    logger.log(`- Clicks: ${campaign.clicks || 0}`);
                    logger.log(`- Spend: ${campaign.spend || 0}`);
                    logger.log(`- CTR: ${campaign.ctr || 0}%`);
                    logger.log(`- CPC: ${campaign.cpc || 0}`);
                });
            }
        }

    } catch (error) {
        logger.error('Error:', error.message);
    } finally {
        await logger.saveToFile();
    }
}

// Run if called directly
if (require.main === module) {
    testInsights().catch(console.error);
}

module.exports = testInsights;
// src/fetchers/insights/insightsFetcher.js
const path = require('path');
const fs = require('fs').promises;
const BaseFetcher = require('../base/baseFetcher');

class InsightsFetcher extends BaseFetcher {
    constructor() {
        super();
        this.outputPath = path.join(process.cwd(), 'src', 'output');
        this.waitTime = 60000; // 1 minute between requests
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchAllInsights(params = {}) {
        const { activeOnly = false } = params;
        
        try {
            console.log(`Starting to fetch campaigns (${activeOnly ? 'active only' : 'all status'})`);
            
            // Add effective_status filter for active campaigns
            const campaignParams = {
                fields: ['id', 'name', 'status', 'effective_status'],
                limit: 1000
            };

            if (activeOnly) {
                campaignParams.filtering = [{
                    field: "effective_status",
                    operator: "IN",
                    value: ['ACTIVE', 'CAMPAIGN_PAUSED']
                }];
            }

            const campaigns = await this.makeApiCall(
                `/act_${this.accountId}/campaigns`,
                'GET',
                campaignParams
            );

            console.log(`Found ${campaigns.data.length} campaigns to process`);
            console.log('Processing each campaign sequentially...\n');

            for (const campaign of campaigns.data) {
                console.log(`\nStarting to process campaign: ${campaign.name} (Status: ${campaign.effective_status})`);
                await this._fetchAndSaveInsights(campaign, activeOnly);
                
                console.log(`Waiting 1 minute before processing next campaign...\n`);
                await this.sleep(this.waitTime);
            }

            return { success: true };
        } catch (error) {
            return this.handleError(error, 'fetchAllInsights');
        }
    }

    async _fetchAndSaveInsights(campaign, activeOnly) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const fields = [
            'impressions',
            'clicks',
            'spend',
            'reach',
            'cpc',
            'ctr',
            'unique_clicks'
        ];

        try {
            // 1. Get campaign insights
            console.log(`Fetching insights for campaign ${campaign.name}...`);
            const campaignInsights = await this.makeApiCall(
                `/${campaign.id}/insights`,
                'GET',
                {
                    fields: fields.join(','),
                    date_preset: 'last_30d',
                }
            );
            await this.sleep(this.waitTime);

            // 2. Get ad sets
            console.log(`Fetching ad sets for campaign ${campaign.name}...`);
            const adSetParams = {
                fields: ['id', 'name', 'status', 'effective_status']
            };

            if (activeOnly) {
                adSetParams.filtering = [{
                    field: "effective_status",
                    operator: "IN",
                    value: ['ACTIVE', 'PAUSED']
                }];
            }

            const adSets = await this.makeApiCall(
                `/${campaign.id}/adsets`,
                'GET',
                adSetParams
            );
            await this.sleep(this.waitTime);

            // 3. Get ad set insights one by one
            const adSetInsights = [];
            for (const adSet of adSets.data) {
                console.log(`Fetching insights for ad set ${adSet.name} (Status: ${adSet.effective_status})...`);
                const insights = await this.makeApiCall(
                    `/${adSet.id}/insights`,
                    'GET',
                    {
                        fields: fields.join(','),
                        date_preset: 'last_30d',
                    }
                );
                adSetInsights.push({ success: true, data: insights.data || [] });
                await this.sleep(this.waitTime);
            }

            // 4. Get ads
            console.log(`Fetching ads for campaign ${campaign.name}...`);
            const adParams = {
                fields: ['id', 'name', 'status', 'effective_status']
            };

            if (activeOnly) {
                adParams.filtering = [{
                    field: "effective_status",
                    operator: "IN",
                    value: ['ACTIVE', 'PAUSED']
                }];
            }

            const ads = await this.makeApiCall(
                `/${campaign.id}/ads`,
                'GET',
                adParams
            );
            await this.sleep(this.waitTime);

            // 5. Get ad insights one by one
            const adInsights = [];
            for (const ad of ads.data) {
                console.log(`Fetching insights for ad ${ad.name} (Status: ${ad.effective_status})...`);
                const insights = await this.makeApiCall(
                    `/${ad.id}/insights`,
                    'GET',
                    {
                        fields: fields.join(','),
                        date_preset: 'last_30d',
                    }
                );
                adInsights.push({ success: true, data: insights.data || [] });
                await this.sleep(this.waitTime);
            }

            // Prepare data structure
            const insightsData = {
                metadata: {
                    fetchedAt: new Date().toISOString(),
                    activeOnly: activeOnly
                },
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    status: campaign.status,
                    effectiveStatus: campaign.effective_status,
                    insights: campaignInsights.data || []
                },
                adSets: adSets.data.map((adSet, index) => ({
                    id: adSet.id,
                    name: adSet.name,
                    status: adSet.status,
                    effectiveStatus: adSet.effective_status,
                    insights: adSetInsights[index].data
                })),
                ads: ads.data.map((ad, index) => ({
                    id: ad.id,
                    name: ad.name,
                    status: ad.status,
                    effectiveStatus: ad.effective_status,
                    insights: adInsights[index].data
                }))
            };

            // Save to file
            const fileName = `insight_${campaign.id}___${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}___${timestamp}.json`;
            const filePath = path.join(this.outputPath, fileName);

            await fs.mkdir(this.outputPath, { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(insightsData, null, 2));

            console.log(`Saved insights for campaign ${campaign.name} to ${filePath}`);
            return { success: true };
        } catch (error) {
            console.error(`Error processing campaign ${campaign.name}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = InsightsFetcher;
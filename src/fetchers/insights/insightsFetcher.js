// src/fetchers/insights/insightsFetcher.js
const path = require('path');
const fs = require('fs').promises;
const FB = require('fb');
const FacebookConfig = require('../../utils/fbConfig');

class InsightsFetcher {
    constructor() {
        console.log('Initializing InsightsFetcher...');
        const fbConfig = new FacebookConfig();
        FB.setAccessToken(fbConfig.getAccessToken());
        FB.options({ version: fbConfig.getApiVersion() });
        this.accountId = fbConfig.getAccountId();
        this.outputPath = path.join(process.cwd(), '_scratch');
        this.waitTime = 2000;
        this.fields = [
            'campaign_name',
            'adset_name',
            'ad_name',
            'reach',
            'impressions',
            'frequency',
            'objective',
            'spend',
            'cpm',
            'cpc',
            'ctr',
            'actions',
            'action_values',
            'cost_per_action_type',
            'video_p25_watched_actions',
            'video_p50_watched_actions',
            'video_p75_watched_actions',
            'video_p100_watched_actions',
            'date_start',
            'date_stop'
        ];
    }

    async makeApiCall(endpoint, method, params) {
        try {
            return new Promise((resolve, reject) => {
                console.log('\nMaking API call:');
                console.log('Endpoint:', endpoint);
                console.log('Method:', method);
                console.log('Params:', JSON.stringify(params, null, 2));
               
                FB.api(endpoint, method, params, (response) => {
                    if (!response) {
                        console.error('No response received from Facebook API');
                        reject(new Error('No response received'));
                        return;
                    }
                   
                    if (response.error) {
                        console.error('Facebook API Error:', response.error);
                        reject(response.error);
                        return;
                    }
    
                    console.log('API Response:', JSON.stringify(response, null, 2));
                    resolve(response);
                });
            });
        } catch (error) {
            console.error('Error in API call:', error);
            throw error;
        }
    }

    handleError(error, context) {
        const errorDetails = {
            success: false,
            error: error.message || 'Unknown error occurred',
            context: context,
            timestamp: new Date().toISOString()
        };
        console.error('Error occurred:', errorDetails);
        return errorDetails;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getExistingDates(campaignName) {
        try {
            const campaignPath = path.join(this.outputPath, `campaign=${campaignName}`, 'type=insights');
            try {
                const days = await fs.readdir(campaignPath);
                return days.map(date => date.replace('date=', ''));
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return [];
                }
                throw error;
            }
        } catch (error) {
            console.error('Error getting existing dates:', error);
            return [];
        }
    }

    async createOutputDirectory(campaignName, date) {
        try {
            const dirPath = path.join(
                this.outputPath,
                `campaign=${campaignName}`,
                'type=insights',
                `date=${date}`
            );
            await fs.mkdir(dirPath, { recursive: true });
            return dirPath;
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    }

    generateFileName(campaignId, campaignName, date, type, timestamp) {
        return `insight_${campaignId}___${campaignName}___${type}__${date}__czech_republic___${timestamp}.json`;
    }

    async fetchDailyInsights(entityId, date) {
        try {
            const insights = await this.makeApiCall(
                `/${entityId}/insights`,
                'GET',
                {
                    fields: this.fields.join(','),
                    time_range: {
                        since: date,
                        until: date
                    }
                }
            );
            return insights.data || [];
        } catch (error) {
            console.error(`Error fetching daily insights for date ${date}:`, error);
            return [];
        }
    }

    async fetchToDateInsights(entityId, fromDate, toDate) {
        try {
            const insights = await this.makeApiCall(
                `/${entityId}/insights`,
                'GET',
                {
                    fields: this.fields.join(','),
                    time_range: {
                        since: fromDate,
                        until: toDate
                    }
                }
            );
            return insights.data || [];
        } catch (error) {
            console.error(`Error fetching to-date insights for date range ${fromDate} to ${toDate}:`, error);
            return [];
        }
    }

    async fetchInsights(params = {}) {
        const { campaignName, fromDate, toDate } = params;
        if (!campaignName) {
            throw new Error('Campaign name is required');
        }

        try {
            // Get campaign
            const campaigns = await this.makeApiCall(
                `/act_${this.accountId}/campaigns`,
                'GET',
                {
                    fields: ['id', 'name', 'status', 'effective_status'],
                    filtering: [{
                        field: "name",
                        operator: "EQUAL",
                        value: campaignName
                    }]
                }
            );

            if (!campaigns.data || campaigns.data.length === 0) {
                throw new Error(`No campaign found with name: ${campaignName}`);
            }

            const campaign = campaigns.data[0];

            // Get ads
            const ads = await this.makeApiCall(
                `/${campaign.id}/ads`,
                'GET',
                {
                    fields: ['id', 'name', 'status', 'effective_status', 'adset_id'],
                    limit: 1000
                }
            );

            // Get adset details for budget info
            const adSets = new Map();
            for (const ad of ads.data) {
                if (!adSets.has(ad.adset_id)) {
                    const adsetDetails = await this.makeApiCall(
                        `/${ad.adset_id}`,
                        'GET',
                        {
                            fields: ['daily_budget', 'lifetime_budget']
                        }
                    );
                    adSets.set(ad.adset_id, adsetDetails);
                    await this.sleep(this.waitTime);
                }
            }

            // Process each date
            let currentDate = new Date(fromDate);
            const targetDate = new Date(toDate);

            while (currentDate <= targetDate) {
                const dateStr = currentDate.toISOString().split('T')[0];

                // Get campaign daily insights
                const campaignDailyInsights = await this.fetchDailyInsights(campaign.id, dateStr);
                await this.sleep(this.waitTime);

                // Get campaign to-date insights
                const campaignToDateInsights = await this.fetchToDateInsights(campaign.id, fromDate, dateStr);
                await this.sleep(this.waitTime);

                // Get daily insights for each ad
                const adDailyInsightsList = [];
                const adToDateInsightsList = [];

                for (const ad of ads.data) {
                    // Get ad daily insights
                    const dailyInsights = await this.fetchDailyInsights(ad.id, dateStr);
                    if (dailyInsights.length > 0) {
                        const adsetDetails = adSets.get(ad.adset_id);
                        adDailyInsightsList.push({
                            adId: ad.id,
                            adsetId: ad.adset_id,
                            name: ad.name,
                            status: ad.status,
                            effectiveStatus: ad.effective_status,
                            insights: dailyInsights.map(insight => ({
                                ...insight,
                                result_type: "Link clicks",
                                results: insight.actions?.find(a => a.action_type === 'link_click')?.value || 0,
                                ad_set_budget: adsetDetails.daily_budget || adsetDetails.lifetime_budget,
                                ad_set_budget_type: adsetDetails.daily_budget ? 'Daily' : 'Lifetime'
                            }))
                        });
                    }
                    await this.sleep(this.waitTime);

                    // Get ad to-date insights
                    const toDateInsights = await this.fetchToDateInsights(ad.id, fromDate, dateStr);
                    if (toDateInsights.length > 0) {
                        const adsetDetails = adSets.get(ad.adset_id);
                        adToDateInsightsList.push({
                            adId: ad.id,
                            adsetId: ad.adset_id,
                            name: ad.name,
                            status: ad.status,
                            effectiveStatus: ad.effective_status,
                            insights: toDateInsights.map(insight => ({
                                ...insight,
                                result_type: "Link clicks",
                                results: insight.actions?.find(a => a.action_type === 'link_click')?.value || 0,
                                ad_set_budget: adsetDetails.daily_budget || adsetDetails.lifetime_budget,
                                ad_set_budget_type: adsetDetails.daily_budget ? 'Daily' : 'Lifetime'
                            }))
                        });
                    }
                    await this.sleep(this.waitTime);
                }

                // Save daily insights
                if (campaignDailyInsights.length > 0 || adDailyInsightsList.length > 0) {
                    const outputDir = await this.createOutputDirectory(campaign.name, dateStr);
                    const timestamp = new Date().toISOString().replace(/:/g, '-');

                    const dailyFileName = this.generateFileName(
                        campaign.id,
                        campaign.name,
                        dateStr,
                        'date',
                        timestamp
                    );

                    const dailyData = {
                        metadata: {
                            fetchedAt: new Date().toISOString(),
                            reportingPeriod: {
                                date: dateStr,
                                type: 'daily'
                            }
                        },
                        campaign: {
                            id: campaign.id,
                            name: campaign.name,
                            status: campaign.status,
                            effectiveStatus: campaign.effective_status,
                            insights: campaignDailyInsights.map(insight => ({
                                ...insight,
                                result_type: "Link clicks",
                                results: insight.actions?.find(a => a.action_type === 'link_click')?.value || 0
                            }))
                        },
                        ads: adDailyInsightsList
                    };

                    await fs.writeFile(
                        path.join(outputDir, dailyFileName),
                        JSON.stringify(dailyData, null, 2)
                    );
                }

                // Save to-date insights
                if (campaignToDateInsights.length > 0 || adToDateInsightsList.length > 0) {
                    const outputDir = await this.createOutputDirectory(campaign.name, dateStr);
                    const timestamp = new Date().toISOString().replace(/:/g, '-');

                    const toDateFileName = this.generateFileName(
                        campaign.id,
                        campaign.name,
                        `${fromDate}_${dateStr}`,
                        'to_date',
                        timestamp
                    );

                    const toDateData = {
                        metadata: {
                            fetchedAt: new Date().toISOString(),
                            reportingPeriod: {
                                startDate: fromDate,
                                endDate: dateStr,
                                type: 'toDate'
                            }
                        },
                        campaign: {
                            id: campaign.id,
                            name: campaign.name,
                            status: campaign.status,
                            effectiveStatus: campaign.effective_status,
                            insights: campaignToDateInsights.map(insight => ({
                                ...insight,
                                result_type: "Link clicks",
                                results: insight.actions?.find(a => a.action_type === 'link_click')?.value || 0
                            }))
                        },
                        ads: adToDateInsightsList
                    };

                    await fs.writeFile(
                        path.join(outputDir, toDateFileName),
                        JSON.stringify(toDateData, null, 2)
                    );
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return { success: true };

        } catch (error) {
            return this.handleError(error, 'fetchInsights');
        }
    }
}

module.exports = InsightsFetcher;
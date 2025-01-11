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
        this.outputPath = path.join(process.cwd(), 'src', 'output');
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
            'video_p25_watched_actions',
            'video_p50_watched_actions',
            'video_p75_watched_actions',
            'video_p100_watched_actions',
            'date_start',
            'date_stop'
        ];
    }

    async makeApiCall(endpoint, method, params) {
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
                    console.error('Facebook API Error:');
                    console.error('- Message:', response.error.message);
                    console.error('- Type:', response.error.type);
                    console.error('- Code:', response.error.code);
                    console.error('- Subcode:', response.error.error_subcode);
                    reject(response.error);
                    return;
                }

                if (method === 'GET' && Array.isArray(response.data) && response.data.length === 0) {
                    console.warn('No data found for the query');
                }

                console.log('API Response:', JSON.stringify(response, null, 2));
                resolve(response);
            });
        });
    }

    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        return {
            success: false,
            error: error.message,
            context
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

	getDateRangeForWeek(year, week) {
		// Validate inputs
		if (week < 1 || week > 53) {
			throw new Error('Week must be between 1 and 53');
		}
	
		// Find January 4th for the given year, which is always in week 1 according to ISO 8601
		const jan4th = new Date(year, 0, 4);
		
		// Get the Monday of week 1 by finding the previous Monday from January 4th
		const firstMonday = new Date(jan4th);
		const daysSinceMonday = jan4th.getDay() - 1; // Days since last Monday (0 = Monday in our calc)
		firstMonday.setDate(jan4th.getDate() - (daysSinceMonday < 0 ? 6 : daysSinceMonday));
	
		// Calculate the start date by adding the required weeks
		const startDate = new Date(firstMonday);
		startDate.setDate(firstMonday.getDate() + (week - 1) * 7);
	
		// Calculate the end date (start date + 6 days)
		const endDate = new Date(startDate);
		endDate.setDate(startDate.getDate() + 6);
	
		// Format dates as YYYY-MM-DD
		const formatDate = (date) => {
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, '0');
			const d = String(date.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		};
	
		return {
			since: formatDate(startDate),
			until: formatDate(endDate)
		};
	}

	async fetchAllInsights(params = {}) {
		console.log('fetchAllInsights called with params:', params);
		const { activeOnly = false, year, week } = params;
		let retries = 3;
		
		while (retries > 0) {
			try {
				const dateRange = this.getDateRangeForWeek(year, week);
				console.log(`Fetching data for week ${week} of ${year} (${dateRange.since} to ${dateRange.until})`);
				console.log(`Using account ID: ${this.accountId}`);
				
				// First, get only active campaigns if activeOnly is true
				const campaignParams = {
					fields: ['id', 'name', 'status', 'effective_status'],
					limit: 1000
				};
	
				if (activeOnly) {
					campaignParams.filtering = [{
						field: "effective_status",
						operator: "IN",
						value: ['ACTIVE'] // Only ACTIVE, not PAUSED
					}];
				}
	
				const campaigns = await this.makeApiCall(
					`/act_${this.accountId}/campaigns`,
					'GET',
					campaignParams
				);
	
				if (!campaigns.data || campaigns.data.length === 0) {
					console.log('No active campaigns found. Please verify:');
					console.log('1. Account ID is correct');
					console.log('2. Access token has necessary permissions');
					console.log('3. There are active campaigns in the account');
					return { success: false, error: 'No active campaigns found' };
				}
	
				// Process only active campaigns
				for (const campaign of campaigns.data) {
					try {
						await this._fetchAndSaveInsights(campaign, activeOnly, dateRange, year, week);
						await this.sleep(this.waitTime);
					} catch (error) {
						console.error(`Error processing campaign ${campaign.name}:`, error.message);
					}
				}
	
				return { success: true };
			} catch (error) {
				console.error('API call failed, retries left:', retries - 1);
				retries--;
				if (retries === 0) {
					return this.handleError(error, 'fetchAllInsights');
				}
				await this.sleep(5000);
			}
		}
	}

	async _fetchAndSaveInsights(campaign, activeOnly, dateRange, year, week) {
		const timestamp = new Date().toISOString().replace(/:/g, '-');
		const weekStr = String(week).padStart(2, '0');
	
		try {
			// Fetch campaign insights - no status filtering here
			console.log(`\nFetching insights for campaign ${campaign.name}`);
			const campaignInsights = await this.makeApiCall(
				`/${campaign.id}/insights`,
				'GET',
				{
					fields: this.fields.join(','),
					time_range: {
						since: dateRange.since,
						until: dateRange.until
					}
				}
			);
			
			// Only proceed if campaign has insights
			if (!campaignInsights.data || campaignInsights.data.length === 0) {
				console.log(`No insights found for campaign ${campaign.name} - skipping`);
				return { success: true, skipped: true };
			}
	
			// Initialize data structure
			const initialData = {
				metadata: {
					fetchedAt: new Date().toISOString(),
					activeOnly,
					reportingPeriod: {
						year,
						week: parseInt(weekStr),
						startDate: dateRange.since,
						endDate: dateRange.until
					}
				},
				campaign: {
					id: campaign.id,
					name: campaign.name,
					status: campaign.status,
					effectiveStatus: campaign.effective_status,
					insights: campaignInsights.data || []
				},
				ads: []
			};
	
			// Save initial campaign data
			const fileName = `insight_${campaign.id}___${campaign.name.split('__')[0]}__traffic__${campaign.id}___${year}${weekStr}___${timestamp}.json`;
			const filePath = path.join(this.outputPath, fileName);
			await fs.mkdir(this.outputPath, { recursive: true });
			await fs.writeFile(filePath, JSON.stringify(initialData, null, 2));
			console.log(`Saved initial campaign insights to ${filePath}`);
	
			await this.sleep(this.waitTime);
	
			// Fetch ads with status filtering
			const adParams = {
				fields: ['id', 'name', 'status', 'effective_status', 'adset_id'],
				limit: 1000
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
	
			const adInsights = [];
			for (const ad of ads.data || []) {
				try {
					// Fetch ad insights - no status filtering here
					const insights = await this.makeApiCall(
						`/${ad.id}/insights`,
						'GET',
						{
							fields: this.fields.join(','),
							time_range: {
								since: dateRange.since,
								until: dateRange.until
							}
						}
					);
					
					if (insights.data && insights.data.length > 0) {
						adInsights.push({
							adId: ad.id,
							adsetId: ad.adset_id,
							name: ad.name,
							status: ad.status,
							effectiveStatus: ad.effective_status,
							insights: insights.data
						});
						
						// Update file with each new ad insight
						initialData.ads = adInsights;
						await fs.writeFile(filePath, JSON.stringify(initialData, null, 2));
						console.log(`Updated insights file with ad ${ad.name}`);
					} else {
						console.log(`No insights found for ad ${ad.name}`);
					}
					
					await this.sleep(this.waitTime);
				} catch (error) {
					console.error(`Error fetching insights for ad ${ad.name}:`, error.message);
				}
			}
	
			console.log(`Completed processing campaign ${campaign.name} with ${adInsights.length} ads`);
			return { success: true, adsCount: adInsights.length };
		} catch (error) {
			console.error(`Error processing campaign ${campaign.name}:`, error.message);
			return { success: false, error: error.message };
		}
	}
}

module.exports = InsightsFetcher;
// campaignDetailsFetcher.js
const BaseFetcher = require('../base/baseFetcher');

class CampaignDetailsFetcher extends BaseFetcher {
    constructor() {
        super();
    }

    async fetchBasicDetails(campaignId) {
        try {
            const fields = [
                'id',
                'name',
                'objective',
                'special_ad_categories',
                'status'
            ];

            const response = await this.makeApiCall(
                `/act_${this.accountId}/campaigns`,
                'GET',
                { 
                    fields: fields.join(','),
                    filtering: [{
                        field: "id",
                        operator: "EQUAL",
                        value: campaignId
                    }]
                }
            );

            if (!response.data || !response.data.length) {
                throw new Error('Campaign not found');
            }

            // Return the first (and should be only) campaign
            return response.data[0];

        } catch (error) {
            return this.handleError(error, 'fetchBasicDetails');
        }
    }

    async fetchBudgetDetails(campaignId) {
        try {
            const fields = [
                'daily_budget',
                'lifetime_budget',
                'budget_remaining',
                'spend_cap'
            ];

            const response = await this.makeApiCall(
                `/${campaignId}`,
                'GET',
                { fields: fields.join(',') }
            );

            return response;
        } catch (error) {
            console.warn(`Warning: Could not fetch budget details: ${error.message}`);
            return {};
        }
    }

    async fetchScheduleDetails(campaignId) {
        try {
            const fields = [
                'start_time',
                'stop_time',
                'updated_time',
                'created_time'
            ];

            const response = await this.makeApiCall(
                `/${campaignId}`,
                'GET',
                { fields: fields.join(',') }
            );

            return response;
        } catch (error) {
            console.warn(`Warning: Could not fetch schedule details: ${error.message}`);
            return {};
        }
    }

    async fetchInsightsDetails(campaignId) {
        try {
            const fields = [
                'reach',
                'impressions',
                'spend',
                'clicks',
                'ctr'
            ];

            const response = await this.makeApiCall(
                `/${campaignId}/insights`,
                'GET',
                { 
                    fields: fields.join(','),
                    date_preset: 'lifetime'
                }
            );

            return response.data ? response.data[0] : {};
        } catch (error) {
            console.warn(`Warning: Could not fetch insights: ${error.message}`);
            return {};
        }
    }
}

module.exports = CampaignDetailsFetcher;
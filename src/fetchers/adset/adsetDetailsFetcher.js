const BaseFetcher = require('../base/baseFetcher');

class AdSetDetailsFetcher extends BaseFetcher {
    constructor() {
        super();
    }

    async fetchAdSets(campaignId) {
        try {
            const fields = [
                'id',
                'name',
                'status',
                'targeting'
            ];

            const response = await this.makeApiCall(
                `/${campaignId}/adsets`,
                'GET',
                { fields: fields.join(',') }
            );

            return response.data.map(adset => 
                this.validateResponse(adset, ['id', 'name'])
            );
        } catch (error) {
            return this.handleError(error, 'fetchAdSets');
        }
    }

    async fetchTargetingDetails(adSetId) {
        try {
            const fields = [
                'targeting',
                'promoted_object',
                'optimization_goal',
                'billing_event'
            ];

            const response = await this.makeApiCall(
                `/${adSetId}`,
                'GET',
                { fields: fields.join(',') }
            );

            return this.validateResponse(response, ['targeting']);
        } catch (error) {
            return this.handleError(error, 'fetchTargetingDetails');
        }
    }

    async fetchScheduleAndBudget(adSetId) {
        try {
            const fields = [
                'start_time',
                'end_time',
                'daily_budget',
                'lifetime_budget',
                'optimization_goal',
                'bid_amount'
            ];

            const response = await this.makeApiCall(
                `/${adSetId}`,
                'GET',
                { fields: fields.join(',') }
            );

            return this.validateResponse(response, ['optimization_goal']);
        } catch (error) {
            return this.handleError(error, 'fetchScheduleAndBudget');
        }
    }
}

module.exports = AdSetDetailsFetcher;
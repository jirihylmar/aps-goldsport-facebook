const FB = require('fb');
const FacebookConfig = require('../../utils/fbConfig');

class BaseFetcher {
    constructor() {
        const fbConfig = new FacebookConfig();
        FB.setAccessToken(fbConfig.getAccessToken());
        FB.options({ version: fbConfig.getApiVersion() });
        this.accountId = fbConfig.getAccountId();
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

    validateResponse(response, requiredFields) {
        const missingFields = requiredFields.filter(field => !response[field]);
        if (missingFields.length > 0) {
            console.warn('Missing fields:', missingFields);
            return {
                ...response,
                _missingFields: missingFields
            };
        }
        return response;
    }
}

module.exports = BaseFetcher;
// fbConfig.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class FacebookConfig {
    constructor() {
        this.accountId = process.env.FB_PROD_ACCOUNT_ID;
        this.accessToken = process.env.FB_PROD_ACCESS_TOKEN;
        
        if (!this.accountId || !this.accessToken) {
            console.error('Environment variables status:');
            console.error('FB_PROD_ACCOUNT_ID:', this.accountId ? 'Set' : 'Not set');
            console.error('FB_PROD_ACCESS_TOKEN:', this.accessToken ? 'Set' : 'Not set');
            throw new Error('Missing required environment variables');
        }

        // Clean up account ID
        this.accountId = this.accountId.replace('act_', '');
        this.apiVersion = 'v18.0';
    }

    getAccountId() {
        return this.accountId;
    }

    getAccessToken() {
        return this.accessToken;
    }

    getApiVersion() {
        return this.apiVersion;
    }
}

module.exports = FacebookConfig;
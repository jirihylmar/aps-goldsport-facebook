// src/runners/fetchInsights.js
const InsightsFetcher = require('../fetchers/insights/insightsFetcher');

async function run() {
    try {
        const params = process.argv.slice(2).reduce((acc, arg) => {
            const [key, value] = arg.split('=');
            switch (key) {
                case '--campaign-name':
                    acc.campaignName = value;
                    break;
                case '--from-date':
                    acc.fromDate = value;
                    break;
                case '--to-date':
                    acc.toDate = value;
                    break;
            }
            return acc;
        }, {});

        console.log('Running with parameters:', params);
        
        if (!params.campaignName) {
            throw new Error('Campaign name parameter is required (--campaign-name=XXXXX)');
        }

        if (!params.fromDate) {
            throw new Error('From date parameter is required (--from-date=YYYY-MM-DD)');
        }

        console.log('Creating InsightsFetcher instance...');
        const fetcher = new InsightsFetcher();
        
        console.log('Fetcher instance created:', fetcher);
        console.log('Checking fetchInsights method:', typeof fetcher.fetchInsights);
        
        if (typeof fetcher.fetchInsights !== 'function') {
            throw new Error('fetchInsights is not properly defined on the InsightsFetcher instance');
        }

        console.log('Calling fetchInsights...');
        const result = await fetcher.fetchInsights(params);
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
        console.log('Insights fetching completed successfully');
    } catch (error) {
        console.error('Error running insights fetcher:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    run().catch(console.error);
}

module.exports = run;
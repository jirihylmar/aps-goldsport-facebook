// src/runners/fetchInsights.js
const InsightsFetcher = require('../fetchers/insights/insightsFetcher');

async function run() {
    try {
        const params = process.argv.slice(2).reduce((acc, arg) => {
            const [key, value] = arg.split('=');
            switch (key) {
                case '--active':
                    acc.activeOnly = value === 'true';
                    break;
                case '--year':
                    acc.year = parseInt(value);
                    break;
                case '--week':
                    acc.week = parseInt(value);
                    break;
            }
            return acc;
        }, { activeOnly: false });

        console.log('Running with parameters:', params);

        if (!params.year || !params.week) {
            throw new Error('Year and week parameters are required (--year=YYYY --week=WW)');
        }

        console.log('Creating InsightsFetcher instance...');
        const fetcher = new InsightsFetcher();
        
        console.log('Fetcher instance created:', fetcher);
        console.log('Checking fetchAllInsights method:', typeof fetcher.fetchAllInsights);
        
        if (typeof fetcher.fetchAllInsights !== 'function') {
            throw new Error('fetchAllInsights is not properly defined on the InsightsFetcher instance');
        }

        console.log('Calling fetchAllInsights...');
        const result = await fetcher.fetchAllInsights(params);
        
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
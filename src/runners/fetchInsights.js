// src/runners/fetchInsights.js
const InsightsFetcher = require('../fetchers/insights/insightsFetcher');

async function run() {
    try {
        const params = process.argv.slice(2).reduce((acc, arg) => {
            const [key, value] = arg.split('=');
            if (key === '--active') {
                acc.activeOnly = value === 'true';
            }
            return acc;
        }, { activeOnly: false }); // default to false if not specified

        const fetcher = new InsightsFetcher();
        const result = await fetcher.fetchAllInsights(params);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log('Insights fetching completed successfully');
    } catch (error) {
        console.error('Error running insights fetcher:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    run().catch(console.error);
}

module.exports = run;
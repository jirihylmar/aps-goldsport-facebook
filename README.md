# Facebook Marketing API SDK

Example usage

See `/home/hylmarj/doc-digital-horizon-goldsport/run_analytics.sh`.

## Features

Currently Implemented:
- Campaign Insights retrieval
- Performance metrics
- Transformation to sql structures

Coming Soon:
- Campaign creation and management
- Ad set operations
- Creative management
- Audience targeting
- Budget optimization
- Automated reporting

## Project Structure

```
aps-goldsport-facebook/
├── src/
│   ├── insights/      # Campaign insights functionality
│   ├── campaigns/     # Campaign management (future)
│   ├── ads/          # Ad management (future)
│   ├── creatives/    # Creative management (future)
│   └── utils/        # Shared utilities
├── tests/           # Test scripts
└── readme.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file in the root directory:
```env
# Business Configuration
FB_BUSSINESS_MANAGER_ID=your_business_manager_id
FB_APP_ID=your_app_id

# Account IDs
FB_ADD_ACCOOUNT_ID=your_add_account_id
FB_PROD_ACCOUNT_ID=your_prod_account_id
FB_SANDBOX_ACCOUNT_ID=your_sandbox_account_id

# Access Tokens
FB_PROD_ACCESS_TOKEN=your_prod_token
FB_SANDBOX_ACCESS_TOKEN=your_sandbox_token
```

## Usage Examples

### Campaign Insights
```javascript
const CampaignInsights = require('./src/insights/campaignInsights');

// Initialize with environment
const insights = new CampaignInsights('production'); // or 'sandbox'

// Get campaign insights
const results = await insights.getCampaignInsights({
    datePreset: 'last_7d',
    fields: ['campaign_name', 'impressions', 'clicks', 'spend']
});
```

### Testing
```bash
# Run in production mode
node src/insights/testInsights.js

# Future test commands will follow similar pattern:
node src/campaigns/testCampaigns.js
node src/ads/testAds.js
```

## Available Metrics

### Campaign Insights
- campaign_name
- impressions
- clicks
- spend
- reach
- cpc
- ctr
- unique_clicks
- (more metrics to be added)

### Environment Support

#### Production
- Live ad account
- Real campaign data
- Actual spending
- Full access to all features

#### Sandbox
- Test environment
- No real spending
- Limited data
- Safe for testing new features

## Error Handling

The SDK includes comprehensive error handling for:
- Invalid credentials
- Missing permissions
- API limits
- Network issues
- Invalid configurations

## Dependencies

Core:
- fb: Facebook API client
- dotenv: Environment configuration

Development:
- (Additional dependencies will be listed as features are added)

## Security Best Practices

1. Environment Management:
   - Never commit .env file
   - Use separate tokens for production and sandbox
   - Rotate access tokens regularly

2. Access Control:
   - Use minimum required permissions
   - Monitor API usage
   - Implement rate limiting
   - Regular security audits

## Reference Links

### Facebook Business Tools
- BUSINESS MANAGER: https://business.facebook.com/settings/pages/133539183473160?business_id=1714956209349952
- APPS DASHBOARD: https://developers.facebook.com/apps/3761290517467776/dashboard/?business_id=1714956209349952
- ADS MANAGER: https://adsmanager.facebook.com/adsmanager/manage/accounts?act=1609138539679924&business_id=1714956209349952

### API Documentation
- [Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)


## Contributing

1. Code Structure:
   - Maintain environment separation
   - Use consistent error handling
   - Follow existing patterns for new features

2. Testing:
   - Test in sandbox first
   - Include test scripts for new features
   - Document test cases

## Coming Soon

- Automated reports
- Custom metrics
- Data visualization


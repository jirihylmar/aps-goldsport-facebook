=== File: src/fetchers/insights/readme_insightsFetcher.md ===
=== Size: 2KB ===

# Facebook Insights Fetcher

Node.js utility for fetching Facebook Ads insights data across campaigns, ad sets, and ads.

## Features

- Fetches insights for all levels: campaigns, ad sets, and ads
- Option to fetch only active items
- Built-in rate limit handling with 60-second delays
- Sequential processing to avoid API limits

## Usage

### Basic Run
Fetch insights for all ads:
```bash
node src/runners/fetchInsights.js
```

### Active Only
Fetch insights for active ads only:
```bash
node src/runners/fetchInsights.js --active=true
```

## Output Files

Files are saved in `src/output/` with format:
```
insight_{campaign_id}___{campaign_name}___{timestamp}.json
```

Example output structure:
```json
{
  "metadata": {
    "fetchedAt": "2024-12-28T12:00:00.000Z",
    "activeOnly": true
  },
  "campaign": {
    "id": "123456789",
    "name": "Campaign Name",
    "status": "ACTIVE",
    "effectiveStatus": "ACTIVE",
    "insights": [
      {
        "impressions": "1000",
        "clicks": "100",
        "spend": "50.00",
        "reach": "800",
        "cpc": "0.50",
        "ctr": "10",
        "unique_clicks": "95"
      }
    ]
  },
  "adSets": [...],
  "ads": [...]
}
```

## Rate Limiting

- 60-second delay between API calls
- Sequential processing (no parallel requests)
- Automatic handling of rate limit errors

## Common Issues

### Rate Limit Error
```
Facebook API Error:
- Message: User request limit reached
- Type: OAuthException
- Code: 17
- Subcode: 2446079
```
Solution: Script will automatically wait and retry. Default wait time is 60 seconds between requests.

## Configuration

In src/utils/fbConfig.js:
```javascript
class FacebookConfig {
    constructor() {
        this.accessToken = 'YOUR_ACCESS_TOKEN';
        this.apiVersion = 'v18.0';
        this.accountId = 'YOUR_ACCOUNT_ID';
    }
    // ...
}
```
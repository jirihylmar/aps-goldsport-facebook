=== File: src/fetchers/insights/readme_insightsFetcher.md ===
=== Size: 3KB ===

# Facebook Insights Fetcher

Automated tool for fetching and storing Facebook ad campaign insights data.

## Features

- Fetches daily and to-date insights for campaigns and ads
- Skips already processed dates for efficiency
- Stores data in organized directory structure
- Rate limiting with configurable wait times
- Error handling and logging
- Automatic date range handling (from specified start date to current date)

## Installation

```bash
git clone [repository-url]
cd [repository-name]
npm install
```

## Prerequisites

- Node.js installed
- Facebook API credentials configured in `utils/fbConfig.js`
- Required npm packages: `fb`, `fs`, `path`

## Usage

```bash
cd $HOME/aps-goldsport-facebook
node src/runners/fetchInsights.js --campaign-name=<campaign_name> --from-date=<YYYY-MM-DD>
```

### Parameters

- `--campaign-name`: (Required) Name of the Facebook campaign
- `--from-date`: (Required) Start date in YYYY-MM-DD format

## Data Structure

Data is stored in the following directory structure:
```
_scratch/
└── campaign=<campaign_name>/
    └── type=insights/
        └── date=<YYYY-MM-DD>/
            ├── insight_<campaign_id>___<campaign_name>___date__<date>__czech_republic___<timestamp>.json
            └── insight_<campaign_id>___<campaign_name>___to_date__<from_date>_<date>__czech_republic___<timestamp>.json
```

### Output Files

#### Daily Insights (date)
Contains metrics for a specific date:
- Campaign level insights
- Ad level insights
- Budget information
- Performance metrics

#### To-Date Insights (to_date)
Contains cumulative metrics from the start date to the current date:
- Campaign level insights
- Ad level insights
- Budget information
- Performance metrics

## Configuration

Key configurations in `InsightsFetcher` class:
- `waitTime`: Delay between API calls (default: 2000ms)
- `fields`: List of metrics to fetch
- `outputPath`: Base directory for storing data

## Error Handling

- Logs errors with context and timestamps
- Continues processing on non-fatal errors
- Returns detailed error information in responses

## License

[License information]
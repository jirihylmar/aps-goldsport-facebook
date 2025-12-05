# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Facebook campaign monitoring and WhatsApp messaging tools. Uses Meta Graph API (`fb` npm package) for both platforms.

## Commands

```bash
# Install dependencies
npm install

# Fetch campaign insights
node src/runners/fetchInsights.js --campaign-name=<name> --from-date=YYYY-MM-DD

# WhatsApp broadcast
node src/whatsapp/broadcast.js --phones=<file.csv> --template=<template_name>

# ETL: Daily metrics to CSV
python3 src/etls/etl__fb_day.py <insights_directory>

# ETL: Cumulative metrics to CSV
python3 src/etls/etl__fb_to_date.py <insights_directory>

# ETL: Extract phone numbers from orders
python3 src/etls/etl__phone_numbers.py <orders_file.tsv>
```

## Architecture

### Structure

```
src/
├── fetchers/
│   ├── base/baseFetcher.js    # Shared Meta API client
│   └── insights/              # FB insights fetching
├── whatsapp/                  # WhatsApp Business API
├── runners/                   # CLI entry points
├── etls/                      # Python data transformations
└── utils/fbConfig.js          # API config from .env
```

### Key Patterns

- **BaseFetcher**: Common Meta Graph API wrapper used by both FB and WhatsApp modules
- **Runners**: CLI scripts that orchestrate fetchers, parse args, handle output
- **ETLs**: Python scripts transforming JSON/TSV to CSV for analytics

### Data Flow

1. `fetchInsights.js` → `InsightsFetcher` → JSON in `_scratch/campaign=<name>/type=insights/`
2. ETL scripts → CSV files for SQL import
3. `etl__phone_numbers.py` extracts validated phone numbers → used by WhatsApp broadcast

## Environment

Required `.env` in project root:
```
FB_PROD_ACCOUNT_ID=<account_id>
FB_PROD_ACCESS_TOKEN=<access_token>
WHATSAPP_PHONE_NUMBER_ID=<phone_number_id>
```

API version: `v18.0` (set in `fbConfig.js`)

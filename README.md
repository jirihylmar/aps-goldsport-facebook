# Facebook & WhatsApp Marketing Tools

Tools for monitoring Facebook ad campaigns and WhatsApp messaging.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
FB_PROD_ACCOUNT_ID=your_account_id
FB_PROD_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

## Facebook Insights

Fetch campaign performance metrics:

```bash
node src/runners/fetchInsights.js --campaign-name=<name> --from-date=YYYY-MM-DD
```

Data saved to `_scratch/campaign=<name>/type=insights/date=<date>/`

### ETL to CSV

```bash
# Daily metrics
python3 src/etls/etl__fb_day.py <insights_directory>

# Cumulative metrics
python3 src/etls/etl__fb_to_date.py <insights_directory>
```

## WhatsApp Messaging

Broadcast messages to phone numbers.

```bash
node src/whatsapp/broadcast.js --phones=<file.csv> --template=<template_name>
```

### Phone Number ETL

Extract and validate phone numbers from order data:

```bash
python3 src/etls/etl__phone_numbers.py <orders_file.tsv>
```

## Reference Links

- [Business Manager](https://business.facebook.com/settings/)
- [Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)

# Facebook Campaign ETL Scripts

Transforms json data to sql structure.

Scripts for processing Facebook Insights JSON data into CSV files.

## Scripts

### etl__fb_day.py
Processes daily metrics from Facebook insights files.
- Input: Files with pattern `*date__*.json` (excluding `to_date__`)
- Output: 
  - `campaign_days.csv`: Daily campaign metrics
  - `ads_days.csv`: Daily ad-level metrics

### etl__fb_to_date.py
Processes cumulative metrics from Facebook insights files.
- Input: Files with pattern `*to_date__*.json`
- Output:
  - `campaign_to_date.csv`: Cumulative campaign metrics
  - `ads_to_date.csv`: Cumulative ad-level metrics

## Usage
```bash
# Process daily metrics
python3 etl__fb_day.py <insights_directory>

# Process cumulative metrics
python3 etl__fb_to_date.py <insights_directory>
```

## Output Schema
Both scripts generate CSVs with columns:
- name: Campaign/Ad name
- type: Data type (day_campaign/day_ad or to_date_campaign/to_date_ad)
- reach: Reach count
- impressions: Impression count
- spend: Amount spent
- video_p{25,50,75,100}_watched_actions: Video view completion rates
- date_start: Start date
- date_stop: End date
- result_type: Type of result tracked
- results: Result count

## Directory Structure
Example structure:
```
type=insights/
├── date=2024-12-27/
    ├── *day__2024-12-27__*.json      # Daily metrics
    └── *to_date__2024-12-27_*.json   # Cumulative metrics
```

## Installation
Required packages:
```
pandas
```

## File Pattern Examples
Daily metrics:
```
insight_120214867158120063___dual_interest_winter_sports__awareness__120214867158120063___date__2024-12-12__czech_republic___2025-01-15T16-47-14.877Z.json
```

Cumulative metrics:
```
insight_120214867158120063___dual_interest_winter_sports__awareness__120214867158120063___to_date__2024-12-12_2024-12-13__czech_republic___2025-01-15T16-47-46.918Z.json
```

## Error Handling
- Script logs errors for invalid files
- Continues processing on missing video metrics
- Validates directory structure and file patterns
- Creates output directory if missing

## Output Location
All CSVs are saved to `type=insights_data/` directory next to input directory.
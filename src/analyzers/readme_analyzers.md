# Facebook Campaign Analysis Scripts

Example usage

```bash
python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_day.py $HOME/aps-goldsport-facebook/_scratch/campaign=adult_ski_beginner__traffic__120215321990480063/type=insights
python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_to_date.py $HOME/aps-goldsport-facebook/_scratch/campaign=adult_ski_beginner__traffic__120215321990480063/type=insights

python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_day.py $HOME/aps-goldsport-facebook/_scratch/campaign=families_with_children__traffic__120215323827970063/type=insights
python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_to_date.py $HOME/aps-goldsport-facebook/_scratch/campaign=families_with_children__traffic__120215323827970063/type=insights
```

History. Not all results processed, runners modifications needed.

```bash
xxx python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_day.py $HOME/aps-goldsport-facebook/_scratch/campaign=dual_interest_winter_sports__awareness__120214867158120063/type=insights
python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_to_date.py $HOME/aps-goldsport-facebook/_scratch/campaign=dual_interest_winter_sports__awareness__120214867158120063/type=insights

xxx python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_day.py $HOME/aps-goldsport-facebook/_scratch/campaign=ski_instructors_are_waiting_for_you__awareness__120214861308510063/type=insights
python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_to_date.py $HOME/aps-goldsport-facebook/_scratch/campaign=ski_instructors_are_waiting_for_you__awareness__120214861308510063/type=insights

xxx python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_day.py $HOME/aps-goldsport-facebook/_scratch/campaign=hug_our_bear_brumik__awareness__120214866537440063/type=insights
xxx python3 /home/hylmarj/aps-goldsport-facebook/src/analyzers/analyze_to_date.py $HOME/aps-goldsport-facebook/_scratch/campaign=hug_our_bear_brumik__awareness__120214866537440063/type=insights

```

This repository contains two Python scripts for analyzing Facebook campaign data:
1. `analyze_day.py` - Processes daily campaign metrics
2. `analyze_to_date.py` - Processes cumulative (to-date) campaign metrics

## Prerequisites

- Python 3.6+
- Required Python packages:
  - pandas
  - pathlib

## Directory Structure

The scripts expect a directory structure like this:

```
campaign=<campaign_id>/
├── type=insights/
│   ├── day=YYYY-MM-DD/
│   │   ├── *___day__*.json      # Daily metrics
│   │   └── *to_date__*.json     # Cumulative metrics
│   ├── day=YYYY-MM-DD/
│   │   ├── *___day__*.json
│   │   └── *to_date__*.json
```

## Script Details

### analyze_day.py

Processes daily campaign metrics from files matching the pattern `*___day__*.json`.

#### Usage
```bash
python3 analyze_day.py <insights_directory>
```

#### Input
- JSON files containing daily campaign metrics
- Each file should contain:
  - Campaign-level metrics
  - Ad-level metrics for each ad in the campaign

#### Output
Creates two CSV files in `type=campaign_analysis/`:
1. `campaign.csv` - Campaign-level metrics
2. `ads.csv` - Ad-level metrics

#### Metrics Tracked
- name
- reach
- video_p25_watched_actions
- video_p50_watched_actions
- video_p75_watched_actions
- video_p100_watched_actions
- date_start
- date_stop
- result_type
- results

### analyze_to_date.py

Processes cumulative campaign metrics from files matching the pattern `*to_date__*.json`.

#### Usage
```bash
python3 analyze_to_date.py <insights_directory>
```

#### Input
- JSON files containing cumulative campaign metrics
- Each file includes:
  - Metadata with reporting period dates
  - Campaign-level metrics
  - Ad-level metrics for each ad

#### Output
Creates two CSV files in `type=campaign_analysis/`:
1. `campaign_to_date.csv` - Cumulative campaign metrics
2. `ads_to_date.csv` - Cumulative ad metrics

#### Metrics Tracked
Same metrics as analyze_day.py, but representing cumulative values over the reporting period.

## Error Handling

Both scripts include:
- Comprehensive logging
- Input validation
- Error reporting for file processing issues
- Proper exception handling

## Output Directory

Both scripts create an output directory:
```
campaign=<campaign_id>/
├── type=campaign_analysis/
│   ├── campaign_days.csv          # Daily campaign metrics
│   ├── ads_days.csv              # Daily ad metrics
│   ├── campaign_to_date.csv # Cumulative campaign metrics
│   └── ads_to_date.csv      # Cumulative ad metrics
```

## Best Practices

1. Always check the logs for any processing errors
2. Verify input directory structure before running scripts
3. Ensure all required Python packages are installed
4. Back up any existing analysis files before running scripts

## Data Format Requirements

Input JSON files must contain:
1. Campaign object with insights array
2. Ads array with insights for each ad
3. Proper metric fields as specified in the Metrics Tracked section
4. Valid dates in YYYY-MM-DD format

## Debugging

If you encounter issues:
1. Check the log output for specific error messages
2. Verify file permissions
3. Ensure JSON files have the correct structure
4. Validate directory paths are correct
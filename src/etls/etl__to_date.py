import json
import pandas as pd
from pathlib import Path
import sys
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_output_directory(input_path):
    """
    Transform input path to desired output path format.
    
    From: /home/hylmarj/aps-goldsport-facebook/_scratch/campaign=adult_ski_beginner__traffic__120215321990480063/type=insights
    To: /home/hylmarj/_scratch/staging-goldsport-analytics/goldsport__fa_adult_ski_beginner__traffic__120215321990480063___gsp_dataset___auto_full/method=auto_full/source=goldsport
    """
    # Extract the campaign identifier from the input path
    campaign_part = input_path.split('campaign=')[1].split('/')[0]
    
    # Construct new path components
    base_dir = '/home/hylmarj/_scratch/staging-goldsport-analytics'
    campaign_dir = f'goldsport__fa_{campaign_part}___gsp_dataset___auto_full'
    method_dir = 'method=auto_full'
    source_dir = 'source=goldsport'
    
    # Combine into final path
    return Path(base_dir) / campaign_dir / method_dir / source_dir

def get_video_actions(actions, action_type):
    """Extract video action values from the actions list."""
    try:
        if not actions:
            return 0
        for action in actions:
            if action.get('action_type') == action_type:
                return float(action.get('value', 0))
        return 0
    except (TypeError, ValueError):
        return 0

def process_json_file(file_path):
    """Process a single JSON file and extract relevant metrics."""
    logging.info(f"Processing file: {file_path}")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
            
        if not data.get('ads') or not data['ads'][0].get('insights'):
            return None, None
            
        reporting_period = data['metadata']['reportingPeriod']
        campaign_insights = data['campaign']['insights'][0]
        ads_insights = [ad['insights'][0] for ad in data['ads']]
        
        return campaign_insights, ads_insights, reporting_period['startDate'], reporting_period['endDate']
    except Exception as e:
        logging.error(f"Error processing file {file_path}: {str(e)}")
        return None, None, None, None

def create_campaign_df(insights, start_date, end_date):
    """Create DataFrame for campaign-level metrics."""
    return pd.DataFrame({
        'name': insights['campaign_name'],
        'type': 'to_date_campaign',
        'reach': float(insights['reach']),
        'impressions': float(insights['impressions']),
        'spend': float(insights['spend']),
        'video_p25_watched_actions': get_video_actions(insights.get('video_p25_watched_actions'), 'video_view'),
        'video_p50_watched_actions': get_video_actions(insights.get('video_p50_watched_actions'), 'video_view'),
        'video_p75_watched_actions': get_video_actions(insights.get('video_p75_watched_actions'), 'video_view'),
        'video_p100_watched_actions': get_video_actions(insights.get('video_p100_watched_actions'), 'video_view'),
        'date_start': start_date,
        'date_stop': end_date,
        'result_type': insights['result_type'],
        'results': float(insights.get('results', 0))
    }, index=[0])

def create_ads_df(insights_list, start_date, end_date):
    """Create DataFrame for ad-level metrics."""
    ads_data = []
    for insights in insights_list:
        video_metrics = {
            metric: get_video_actions(insights.get(metric), 'video_view')
            for metric in [
                'video_p25_watched_actions',
                'video_p50_watched_actions',
                'video_p75_watched_actions',
                'video_p100_watched_actions'
            ]
        }
        
        ads_data.append({
            'name': insights['ad_name'],
            'type': 'to_date_ad',
            'reach': float(insights['reach']),
            'impressions': float(insights['impressions']),
            'spend': float(insights['spend']),
            **video_metrics,
            'date_start': start_date,
            'date_stop': end_date,
            'result_type': insights['result_type'],
            'results': float(insights.get('results', 0))
        })
    return pd.DataFrame(ads_data)

def find_to_date_files(insights_dir):
    """Find all to_date files in the directory structure."""
    to_date_files = []
    for path in Path(insights_dir).rglob('*.json'):
        try:
            if 'to_date__' in path.name:
                date_str = path.parent.name.split('=')[1]
                if date_str in path.name:
                    to_date_files.append(path)
        except (IndexError, ValueError) as e:
            logging.warning(f"Skipping invalid directory name: {path.parent.name}")
            continue
    return sorted(to_date_files)

def main():
    if len(sys.argv) != 2:
        logging.error("Usage: python3 analyze_to_date.py <insights_directory>")
        sys.exit(1)
    
    insights_dir = Path(sys.argv[1])
    if not insights_dir.exists():
        logging.error(f"Directory does not exist: {insights_dir}")
        sys.exit(1)
    
    logging.info(f"Processing directory: {insights_dir}")
    
    # Find all to_date files
    to_date_files = find_to_date_files(insights_dir)
    
    if not to_date_files:
        logging.error("No valid to_date files found in the directory structure")
        sys.exit(1)
    
    # Create output directory
    output_dir = get_output_directory(str(insights_dir))
    output_dir.mkdir(parents=True, exist_ok=True)
    logging.info(f"Created output directory: {output_dir}")
    
    campaign_dfs = []
    ads_dfs = []
    
    # Process each to_date file
    for file_path in to_date_files:
        try:
            campaign_insights, ads_insights, start_date, end_date = process_json_file(file_path)
            campaign_dfs.append(create_campaign_df(campaign_insights, start_date, end_date))
            ads_dfs.append(create_ads_df(ads_insights, start_date, end_date))
        except Exception as e:
            logging.error(f"Error processing file {file_path}: {str(e)}")
            continue
    
    if not campaign_dfs:
        logging.error("No data was successfully processed")
        sys.exit(1)
    
    # Combine and save results
    try:
        campaign_df = pd.concat(campaign_dfs, ignore_index=True)
        ads_df = pd.concat(ads_dfs, ignore_index=True)
        
        # Sort by end date (date_stop)
        campaign_df['date_stop'] = pd.to_datetime(campaign_df['date_stop'])
        ads_df['date_stop'] = pd.to_datetime(ads_df['date_stop'])
        
        campaign_df = campaign_df.sort_values('date_stop')
        ads_df = ads_df.sort_values('date_stop')
        
        # Save to CSV
        campaign_csv = output_dir / 'campaign_to_date.csv'
        ads_csv = output_dir / 'ads_to_date.csv'
        
        campaign_df.to_csv(campaign_csv, index=False)
        ads_df.to_csv(ads_csv, index=False)
        
        logging.info(f"Successfully saved campaign to-date data to: {campaign_csv}")
        logging.info(f"Successfully saved ads to-date data to: {ads_csv}")
        
    except Exception as e:
        logging.error(f"Error saving results: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
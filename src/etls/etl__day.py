import json
import pandas as pd
from pathlib import Path
import sys
from datetime import datetime
import logging

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

def find_day_files(insights_dir):
    """Find daily insight files in the directory structure."""
    day_files = []
    for path in Path(insights_dir).rglob('*.json'):
        try:
            # Extract date from directory name
            date_str = path.parent.name.split('=')[1]
            if 'date__' in path.name and 'to_date__' not in path.name:
                if date_str in path.name:
                    day_files.append(path)
        except (IndexError, ValueError) as e:
            logging.warning(f"Skipping invalid directory name: {path.parent.name}")
            continue
    return sorted(day_files)

def process_json_file(file_path):
    """Process a single JSON file and extract relevant metrics."""
    logging.info(f"Processing file: {file_path}")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
            
        # Check if file has actual data
        if not data.get('ads') or not data['ads'][0].get('insights'):
            return None, None
            
        campaign_insights = data['campaign']['insights'][0]
        ads_insights = [ad['insights'][0] for ad in data['ads']]
        
        return campaign_insights, ads_insights
    except Exception as e:
        logging.error(f"Error processing file {file_path}: {str(e)}")
        return None, None

def create_campaign_df(insights):
    """Create DataFrame for campaign-level metrics."""
    return pd.DataFrame({
        'name': insights['campaign_name'],
        'type': 'day_campaign',
        'reach': float(insights['reach']),
        'impressions': float(insights['impressions']),
        'spend': float(insights['spend']),
        'video_p25_watched_actions': get_video_actions(insights.get('video_p25_watched_actions'), 'video_view'),
        'video_p50_watched_actions': get_video_actions(insights.get('video_p50_watched_actions'), 'video_view'),
        'video_p75_watched_actions': get_video_actions(insights.get('video_p75_watched_actions'), 'video_view'),
        'video_p100_watched_actions': get_video_actions(insights.get('video_p100_watched_actions'), 'video_view'),
        'date_start': insights['date_start'],
        'date_stop': insights['date_stop'],
        'result_type': insights['result_type'],
        'results': insights['results']
    }, index=[0])

def create_ads_df(insights_list):
    """Create DataFrame for ad-level metrics."""
    ads_data = []
    for insights in insights_list:
        ad_data = {
            'name': insights['ad_name'],
            'type': 'day_ad',
            'reach': float(insights['reach']),
            'impressions': float(insights['impressions']),
            'spend': float(insights['spend']),
            'date_start': insights['date_start'],
            'date_stop': insights['date_stop'],
            'result_type': insights['result_type'],
            'results': insights['results']
        }
        
        video_metrics = [
            'video_p25_watched_actions',
            'video_p50_watched_actions', 
            'video_p75_watched_actions',
            'video_p100_watched_actions'
        ]
        
        for metric in video_metrics:
            actions = insights.get(metric, [])
            value = 0
            if actions:
                for action in actions:
                    if action.get('action_type') == 'video_view':
                        try:
                            value = float(action.get('value', 0))
                        except (ValueError, TypeError):
                            value = 0
                        break
            ad_data[metric] = value
            
        ads_data.append(ad_data)
    return pd.DataFrame(ads_data)

def main():
    if len(sys.argv) != 2:
        logging.error("Usage: python3 analyze_day.py <insights_directory>")
        sys.exit(1)
    
    insights_dir = Path(sys.argv[1])
    if not insights_dir.exists():
        logging.error(f"Directory does not exist: {insights_dir}")
        sys.exit(1)
    
    logging.info(f"Processing directory: {insights_dir}")
    
    # Create output directory
    output_dir = get_output_directory(str(insights_dir))
    output_dir.mkdir(parents=True, exist_ok=True)
    logging.info(f"Created output directory: {output_dir}")
    
    campaign_dfs = []
    ads_dfs = []
    
    # Process each day file
    day_files = find_day_files(insights_dir)
    if not day_files:
        logging.error("No valid day files found in the directory structure")
        sys.exit(1)
        
    for file_path in day_files:
        campaign_insights, ads_insights = process_json_file(file_path)
        if campaign_insights and ads_insights:
            try:
                campaign_dfs.append(create_campaign_df(campaign_insights))
                ads_dfs.append(create_ads_df(ads_insights))
            except Exception as e:
                logging.error(f"Error creating dataframes for {file_path}: {str(e)}")
                continue
    
    if not campaign_dfs:
        logging.error("No data was successfully processed")
        sys.exit(1)
    
    # Combine and save results
    try:
        campaign_df = pd.concat(campaign_dfs, ignore_index=True)
        ads_df = pd.concat(ads_dfs, ignore_index=True)
        
        # Sort by date
        campaign_df['date_start'] = pd.to_datetime(campaign_df['date_start'])
        ads_df['date_start'] = pd.to_datetime(ads_df['date_start'])
        
        campaign_df = campaign_df.sort_values('date_start')
        ads_df = ads_df.sort_values('date_start')
        
        # Save to CSV
        campaign_csv = output_dir / 'campaign_days.csv'
        ads_csv = output_dir / 'ads_days.csv'
        
        campaign_df.to_csv(campaign_csv, index=False)
        ads_df.to_csv(ads_csv, index=False)
        
        logging.info(f"Successfully saved campaign data to: {campaign_csv}")
        logging.info(f"Successfully saved ads data to: {ads_csv}")
        
    except Exception as e:
        logging.error(f"Error saving results: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
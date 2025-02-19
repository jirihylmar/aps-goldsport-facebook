import pandas as pd
import glob
import os
from datetime import datetime

def get_season_range(season_str):
    """
    Convert season string (e.g., '19/20') to date range.
    Returns tuple of (season_start, season_end) in YYYY-MM-DD format.
    """
    try:
        start_year = int("20" + season_str.split('/')[0])
        end_year = int("20" + season_str.split('/')[1])
        return f"{start_year}-12-01", f"{end_year}-03-31"
    except:
        return None

def main():
    # Input and output paths
    input_path = "/home/hylmarj/_scratch/staging-goldsport-analytics/goldsport__orders___gsp_dataset___hand_increment/method=hand_increment/source=goldsport"
    output_path = "/home/hylmarj/_scratch/staging-goldsport-analytics/goldsport__orders___gsp_dataset___auto_full/method=auto_full/source=goldsport"
    
    print(f"Script started")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_path, exist_ok=True)
    
    # Look for TSV files
    all_files = glob.glob(os.path.join(input_path, "*.tsv"))
    print(f"\nFound {len(all_files)} TSV files:")
    for file in all_files:
        print(f"  - {file}")
    
    # Initialize an empty list to store all DataFrames
    dfs = []
    
    # Read all TSV files
    for file in all_files:
        try:
            df = pd.read_csv(file, sep='\t')
            dfs.append(df)
            print(f"Successfully read {file}")
        except Exception as e:
            print(f"Error reading {file}: {str(e)}")
            continue
    
    # Combine all DataFrames
    combined_df = pd.concat(dfs, ignore_index=False)
    print(f"\nCombined DataFrame shape: {combined_df.shape}")
    
    # Get unique seasons
    unique_seasons = sorted(combined_df['season'].unique())
    print(f"Unique seasons found: {unique_seasons}")
    
    # Process each season
    for season in unique_seasons:
        season_range = get_season_range(season)
        if season_range:
            season_key = f"orders_{season_range[0]}_{season_range[1]}"
            
            # Get data for this season
            season_df = combined_df[combined_df['season'] == season].copy()
            
            # Sort by date_order
            season_df = season_df.sort_values('date_order')
            
            # Save to file
            output_file = os.path.join(output_path, f"{season_key}.tsv")
            season_df.to_csv(output_file, sep='\t', index=False)
            print(f"Created {season_key}.tsv with {len(season_df)} rows")

if __name__ == "__main__":
    main()
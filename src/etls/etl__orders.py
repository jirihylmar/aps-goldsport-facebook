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

def validate_and_fix_dataframe(df, filename):
    """
    Validates and fixes data quality issues in the DataFrame.
    """
    expected_columns = [
        'id_order', 'date_order', 'contact_sales', 'location_meeting', 
        'season', 'level', 'group_size', 'participants', 'language',
        'name_sponsor', 'name_participant', 'age_participant', 'date_lesson',
        'timestamp_start_lesson', 'timestamp_end_lesson', 'price_currency',
        'price_discount_percent', 'price_without_vat', 'price_to_pay', 'note'
    ]

    # Detect invalid data types in key columns
    if not pd.to_numeric(df['id_order'], errors='coerce').notna().all():
        print(f"\nDetected non-numeric id_order in {filename}, fixing...")
        
        # Get correct data by looking at patterns
        correct_data = []
        for _, row in df.iterrows():
            fixed_row = row.copy()
            
            # Fix common data shift issues
            if isinstance(row['id_order'], str) and isinstance(row['date_order'], str):
                if row['date_order'].startswith('20'):  # Looks like a date
                    # Shift data back to correct columns
                    fixed_row['id_order'] = None  # Will be filled later
                    fixed_row['date_order'] = row['date_order']
                    fixed_row['contact_sales'] = row['contact_sales']
                    fixed_row['location_meeting'] = row['location_meeting']
                    fixed_row['season'] = row['season']
                    # ... rest of the columns stay as is
            
            correct_data.append(fixed_row)
        
        df = pd.DataFrame(correct_data)
        
        # Clean up season column - remove invalid seasons
        valid_seasons = ['19/20', '20/21', '21/22', '22/23', '23/24', '24/25']
        df = df[df['season'].isin(valid_seasons)]
        
        # Generate sequential IDs for rows without valid id_order
        if df.shape[0] > 0:
            max_existing_id = 3000  # Starting point for new IDs
            df.loc[df['id_order'].isna(), 'id_order'] = range(max_existing_id, max_existing_id + df['id_order'].isna().sum())

    # Fix timestamp columns with more robust regex
    time_columns = ['timestamp_start_lesson', 'timestamp_end_lesson']
    for col in time_columns:
        if col in df.columns:
            # Add space between timezone and time if missing
            df[col] = df[col].str.replace(r'(?<=\+01:00)(?=\d)', ' ', regex=True)
            # Remove any accidental double spaces
            df[col] = df[col].str.replace(r'\s+', ' ', regex=True)
            # Ensure consistent timezone format
            df[col] = df[col].str.replace(r'(?<!\s)\+01:00', ' +01:00', regex=True)

    # Ensure consistent price formatting - remove thousand separators before calculations
    price_columns = ['price_without_vat', 'price_to_pay']
    for col in price_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', ''), errors='coerce')
            df[col] = df[col].fillna(0.0)  # Replace NaN with 0
    
    # Ensure numeric columns are properly typed
    numeric_columns = {
        'id_order': 'int64',
        'participants': 'int64',
        'age_participant': 'float64',
        'price_discount_percent': 'float64',
        'price_without_vat': 'float64',
        'price_to_pay': 'float64'
    }
    
    for col, dtype in numeric_columns.items():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype(dtype)

    return df

def read_tsv_file(file):
    """
    Reads TSV file with proper error handling and encoding detection.
    """
    try:
        # Try reading with different encodings
        for encoding in ['utf-8', 'latin1', 'cp1252']:
            try:
                df = pd.read_csv(file, sep='\t', encoding=encoding)
                return df
            except UnicodeDecodeError:
                continue
            
        raise ValueError(f"Could not read file with any encoding")
        
    except Exception as e:
        print(f"Error reading {file}: {str(e)}")
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
    
    # Read all TSV files with improved error handling
    for file in all_files:
        df = read_tsv_file(file)
        if df is None:
            continue
            
        if df.empty:
            print(f"Warning: Empty DataFrame from {file}")
            continue
        
        # Add validation step
        df = validate_and_fix_dataframe(df, file)
        if df is None:
            print(f"Error: Could not fix data format in {file}")
            continue

        print(f"Successfully read {file}")
        print(f"Shape: {df.shape}")
        print("Columns:", df.columns.tolist())
        
        # Only try to print first row if DataFrame is not empty
        if not df.empty:
            print("First row:", df.iloc[0].to_dict())
        else:
            print("No data rows in this file")
        
        # Only append non-empty DataFrames
        if not df.empty:
            dfs.append(df)

    # Check if we have any data before continuing
    if not dfs:
        print("Error: No valid data found in any files")
        return
    
    # Combine all DataFrames
    combined_df = pd.concat(dfs, ignore_index=False)
    print(f"\nCombined DataFrame shape: {combined_df.shape}")
    
    # Get unique seasons
    unique_seasons = sorted(combined_df['season'].unique())
    print(f"Unique seasons found: {unique_seasons}")
    
    # Process each season
    for season in unique_seasons:
        # Skip invalid seasons
        if not season.endswith('/20') and not season.endswith('/21') and not season.endswith('/22') and not season.endswith('/23') and not season.endswith('/24') and not season.endswith('/25'):
            print(f"\nSkipping invalid season: {season}")
            continue
            
        season_range = get_season_range(season)
        if season_range:
            season_key = f"orders_{season_range[0]}_{season_range[1]}"
            
            # Get data for this season
            season_df = combined_df[combined_df['season'] == season].copy()
            
            # Sort by date_order
            season_df = season_df.sort_values('date_order')
            
            # Print sample of the data with better formatting
            print(f"\n{'='*80}")
            print(f"Sample rows from {season_key}:")
            print(f"{'='*80}")
            display_columns = ['id_order', 'date_order', 'name_participant', 'season', 'level', 'price_to_pay']
            print(season_df[display_columns].head(3))
            
            # Format price columns consistently before saving 
            for col in ['price_without_vat', 'price_to_pay']:
                season_df[col] = season_df[col].apply(lambda x: '{:.2f}'.format(float(x)) if pd.notnull(x) else '0.00')
            
            # Ensure timestamps are properly formatted
            for col in ['timestamp_start_lesson', 'timestamp_end_lesson']:
                season_df[col] = season_df[col].apply(lambda x: 
                    x if pd.notnull(x) and '+01:00' in x 
                    else None if pd.isnull(x)
                    else x + ' +01:00' if 'T' in str(x) 
                    else x)
            
            # Save to file with proper encoding
            output_file = os.path.join(output_path, f"{season_key}.tsv")
            season_df.to_csv(output_file, sep='\t', index=False, encoding='utf-8')
            print(f"\nCreated {output_file}")
            print(f"File size: {os.path.getsize(output_file):,} bytes")
            
            # Verify file was created and show first few lines
            if os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    print("\nFirst 2 lines of created file:")
                    print(f.readline().strip())  # header
                    print(f.readline().strip())  # first data row
            
            print(f"Total rows saved: {len(season_df)}")

if __name__ == "__main__":
    main()
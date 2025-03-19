

#!/usr/bin/env python3
"""
Script to divide a CSV file into batches of maximum 80 entries without breaking dates.
python3 /home/hylmarj/aps-goldsport-facebook/src/etls/etl__phone_numbers_batches.py /home/hylmarj/aps-goldsport-twilio/data/numbers/phone_numbers_unique_2024-12-01_2025-03-31.csv "/home/hylmarj/aps-goldsport-twilio/data/numbers/phone_numbers_unique_2024-12-01_2025-03-31__{0:02d}.csv" 80
"""

import csv
import os
import sys
from collections import defaultdict
from pathlib import Path

def batch_csv_by_date(input_path, output_pattern, max_batch_size=80):
    """
    Divides a CSV file into batches of maximum size, ensuring entries with the same date
    are kept together in the same batch.
    
    Args:
        input_path (str): Path to the input CSV file
        output_pattern (str): Pattern for output files with '{0:02d}' placeholder for batch number
        max_batch_size (int): Maximum number of entries per batch
    """
    # Read the input file and group by date
    date_groups = defaultdict(list)
    
    with open(input_path, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        header = reader.fieldnames
        
        for row in reader:
            date = row['date_order']
            date_groups[date].append(row)
    
    # Sort dates to ensure chronological order
    sorted_dates = sorted(date_groups.keys())
    
    # Create batches without breaking date groups
    batches = []
    current_batch = []
    current_batch_size = 0
    
    for date in sorted_dates:
        date_entries = date_groups[date]
        date_entry_count = len(date_entries)
        
        # If adding this date group would exceed the batch size
        # and the current batch is not empty, start a new batch
        if current_batch_size + date_entry_count > max_batch_size and current_batch_size > 0:
            batches.append(current_batch)
            current_batch = []
            current_batch_size = 0
        
        # If a single date group is larger than max_batch_size, 
        # it will be its own batch (we can't split dates)
        current_batch.extend(date_entries)
        current_batch_size += date_entry_count
        
        # If we've reached or exceeded max_batch_size, start a new batch
        if current_batch_size >= max_batch_size:
            batches.append(current_batch)
            current_batch = []
            current_batch_size = 0
    
    # Add the last batch if it's not empty
    if current_batch:
        batches.append(current_batch)
    
    # Write batches to files
    for i, batch in enumerate(batches, 1):
        output_path = output_pattern.format(i).replace("{01}", f"{i:02d}")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=header)
            writer.writeheader()
            writer.writerows(batch)
    
    return len(batches)

def main():
    if len(sys.argv) < 3:
        print("Usage: python script.py <input_path> <output_pattern> [max_batch_size]")
        print("Example: python script.py data.csv output/data_{0:02d}.csv 80")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_pattern = sys.argv[2]
    max_batch_size = int(sys.argv[3]) if len(sys.argv) > 3 else 80
    
    try:
        num_batches = batch_csv_by_date(input_path, output_pattern, max_batch_size)
        print(f"Successfully created {num_batches} batch files.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
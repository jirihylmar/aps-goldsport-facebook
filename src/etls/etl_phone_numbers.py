#!/usr/bin/env python3
import pandas as pd
import re
from datetime import datetime
import logging
from pathlib import Path
import sys
from typing import Tuple, Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_phone_number(number: str) -> Tuple[Optional[str], Optional[str], str]:
    """
    Enhanced phone number cleaning function with improved pattern matching
    """
    if not isinstance(number, str):
        return None, None, str(number)
    
    # Store original for reporting
    original = number
    
    # Remove any text descriptions and extract the number part
    number = re.sub(r'(?i)checkyeti|osoba|\bč\.p\.|privátní|výuka|děda|instruktorka|telefoní číslo|=|let|cena|\bhod\.|kč|zimmer nr|jezdí|během|zdarma|platí|rental|,', '', number)
    
    # Initial cleanup - remove common non-essential characters
    cleaned = re.sub(r'[^\d+\s-]', '', number.strip())
    cleaned = re.sub(r'\s+', '', cleaned)
    
    # Handle various prefixes and formats
    if cleaned.startswith('00'):
        cleaned = '+' + cleaned[2:]
    elif cleaned.startswith('0049'):
        cleaned = '+49' + cleaned[4:]
    elif cleaned.startswith('0048'):
        cleaned = '+48' + cleaned[4:]
    elif cleaned.startswith('00420'):
        cleaned = '+420' + cleaned[5:]
    elif cleaned.startswith('0031'):
        cleaned = '+31' + cleaned[4:]
    
    # Handle numbers with redundant leading zeros after country code
    if cleaned.startswith('+49'):
        cleaned = re.sub(r'^\+490+', '+49', cleaned)
    elif cleaned.startswith('+48'):
        cleaned = re.sub(r'^\+480+', '+48', cleaned)
    elif cleaned.startswith('+420'):
        cleaned = re.sub(r'^\+4200+', '+420', cleaned)
    
    # Add missing plus for country codes
    if not cleaned.startswith('+'):
        if cleaned.startswith('420'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('49'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('48'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('31'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('353'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('972'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('43'):
            cleaned = '+' + cleaned
        # Handle Czech numbers without prefix (9 digits starting with 6 or 7)
        elif len(cleaned) == 9 and cleaned[0] in ['6', '7']:
            cleaned = '+420' + cleaned
    
    # Basic validation before format-specific cleaning
    if not cleaned or len(cleaned) < 9:
        return None, None, original
    
    # Country-specific cleaning and validation
    if cleaned.startswith('+420'):  # Czech
        if len(cleaned) > 13:
            cleaned = cleaned[:13]
        if not re.match(r'^\+420[6-7][0-9]{8}$', cleaned):
            return None, None, original
        return cleaned, 'CZ', original
        
    elif cleaned.startswith('+49'):  # German
        if len(cleaned) > 14:
            cleaned = cleaned[:14]
        if not re.match(r'^\+49[1][5-7][0-9]{7,10}$', cleaned):
            return None, None, original
        return cleaned, 'DE', original
        
    elif cleaned.startswith('+48'):  # Polish
        if len(cleaned) > 12:
            cleaned = cleaned[:12]
        if not re.match(r'^\+48[4-8][0-9]{8}$', cleaned):
            return None, None, original
        return cleaned, 'PL', original
        
    elif cleaned.startswith('+31'):  # Dutch
        if len(cleaned) > 12:
            cleaned = cleaned[:12]
        if not re.match(r'^\+31[6][0-9]{8}$', cleaned):
            return None, None, original
        return cleaned, 'NL', original
        
    elif cleaned.startswith('+353'):  # Irish
        if not re.match(r'^\+353[8][0-9]{8}$', cleaned):
            return None, None, original
        return cleaned, 'IE', original
        
    elif cleaned.startswith('+972'):  # Israeli
        if not re.match(r'^\+972[5][0-9]{8}$', cleaned):
            return None, None, original
        return cleaned, 'IL', original
        
    elif cleaned.startswith('+43'):  # Austrian
        if not re.match(r'^\+43[6][0-9]{9,10}$', cleaned):
            return None, None, original
        return cleaned, 'AT', original
    
    return None, None, original

def extract_phone_numbers(text: str) -> List[str]:
    """
    Enhanced phone number extraction with improved pattern matching
    """
    if not isinstance(text, str):
        return []
    
    # Split text by common separators
    parts = re.split(r'[,;\n]', text)
    numbers = []
    
    for part in parts:
        # Skip parts that are clearly not phone numbers
        if not re.search(r'\d', part):
            continue
            
        # Handle typical Czech 9-digit format first
        czech_matches = re.finditer(r'(?:^|[^\d])([67][0-9]{2}[\s-]?[0-9]{3}[\s-]?[0-9]{3})(?:$|[^\d])', part)
        for match in czech_matches:
            num = match.group(1)
            if num and len(re.sub(r'[^\d]', '', num)) == 9:
                numbers.append(num)
        
        # Look for international formats
        patterns = [
            # International format with + 
            r'\+\s*(?:420|49|48|31|353|972|43)[0-9\s-]{8,}',
            
            # Format starting with 00
            r'00\s*(?:420|49|48|31|353|972|43)[0-9\s-]{8,}',
            
            # Without + but with country code
            r'(?:^|[^\d])(?:420|49|48|31|353|972|43)[0-9\s-]{8,}(?:$|[^\d])',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, part)
            for match in matches:
                num = match.group().strip()
                # Clean up captures
                num = re.sub(r'^[^\d+]+', '', num)
                num = re.sub(r'[^\d+]+$', '', num)
                
                # Only add if not a partial number
                if len(re.sub(r'[^\d]', '', num)) >= 9:
                    numbers.append(num)
    
    # Remove duplicates while preserving first occurrence order
    seen = set()
    return [x for x in numbers if not (x in seen or seen.add(x))]

def is_valid_number(number: str, country: str) -> bool:
    """
    Enhanced validation with more flexible country-specific patterns
    """
    if not isinstance(number, str):
        return False
        
    patterns = {
        'CZ': r'^\+420[6-7][0-9]{8}$',  # Czech mobile
        'DE': r'^\+49[1][5-7][0-9]{7,10}$',  # German mobile
        'PL': r'^\+48[4-8][0-9]{8}$',  # Polish mobile
        'NL': r'^\+31[6][0-9]{8}$',  # Dutch mobile
        'IE': r'^\+353[8][0-9]{8}$',  # Irish mobile
        'IL': r'^\+972[5][0-9]{8}$',  # Israeli mobile
        'AT': r'^\+43[6][0-9]{9,10}$',  # Austrian mobile
    }
    
    if country not in patterns:
        return False
        
    return bool(re.match(patterns[country], number))

def process_file(input_path: str) -> None:
    """
    Process input TSV file and create output CSV with standardized phone numbers
    """
    try:
        # Read input file
        logger.info(f"Reading input file: {input_path}")
        df = pd.read_csv(input_path, sep='\t', low_memory=False)
        
        # Prepare output data
        output_data = []
        invalid_numbers = []
        
        # Process each row
        for _, row in df.iterrows():
            if pd.isna(row['note']):
                continue
                
            numbers = extract_phone_numbers(str(row['note']))
            
            for number in numbers:
                cleaned_number, country, original = clean_phone_number(number)
                if cleaned_number and is_valid_number(cleaned_number, country):
                    output_data.append({
                        'id_order': row['id_order'],
                        'date_order': row['date_order'],
                        'phone_number': cleaned_number,
                        'country': country
                    })
                else:
                    invalid_numbers.append({
                        'id_order': row['id_order'],
                        'date_order': row['date_order'],
                        'original_number': original,
                        'attempted_clean': cleaned_number if cleaned_number else 'None',
                        'attempted_country': country if country else 'None'
                    })
        
        # Create output dataframes
        output_df = pd.DataFrame(output_data)
        invalid_df = pd.DataFrame(invalid_numbers)
        
        # Sort and remove duplicates
        output_df = output_df.sort_values(['id_order', 'date_order', 'phone_number'])\
                            .drop_duplicates()
        
        # Generate output paths
        input_filename = Path(input_path).name
        date_range = re.search(r'(\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2})', input_filename).group(1)
        
        output_base = Path("/home/hylmarj/_scratch/staging-goldsport-analytics/goldsport__phone_numbers___gsp_dataset___auto_full/method=auto_full/source=goldsport")
        output_base.mkdir(parents=True, exist_ok=True)
        
        # Save valid numbers
        output_path = output_base / f'phone_numbers_{date_range}.csv'
        logger.info(f"Saving {len(output_df)} valid numbers to: {output_path}")
        output_df.to_csv(output_path, index=False)
        
        # Save invalid numbers to the same base path
        invalid_path = output_base / f'invalid_numbers_{date_range}.csv'
        logger.info(f"Saving {len(invalid_df)} invalid numbers to: {invalid_path}")
        invalid_df.to_csv(invalid_path, index=False)
        
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        raise

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 etl_phone_numbers.py <input_path>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    
    try:
        process_file(input_path)
    except Exception as e:
        logger.error(f"Script failed: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()
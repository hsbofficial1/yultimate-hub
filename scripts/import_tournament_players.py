#!/usr/bin/env python3
"""
Tournament Player CSV Import Script
Imports player registration data from CSV into Supabase database

Usage:
    python scripts/import_tournament_players.py --csv path/to/data.csv --tournament-id UUID

Requirements:
    pip install supabase python-dotenv pandas
"""

import argparse
import csv
import os
from datetime import datetime
from typing import Dict, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def parse_date(date_str: str) -> Optional[str]:
    """Parse date from DD/MM/YYYY or DD-MM-YYYY format to YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return None
    
    date_str = date_str.strip()
    
    # Try DD/MM/YYYY
    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%Y-%m-%d']:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    print(f"Warning: Could not parse date: {date_str}")
    return None

def map_gender(gender: str) -> str:
    """Map gender from Hindi/English to database format"""
    gender_lower = gender.lower()
    
    if 'male' in gender_lower or 'पुरुष' in gender or gender_lower == 'm':
        return 'male'
    elif 'female' in gender_lower or 'महिला' in gender or gender_lower == 'f':
        return 'female'
    else:
        return 'other'

def map_participation_days(days: str) -> Optional[str]:
    """Map participation days to database format"""
    if not days or days.strip() == '':
        return 'both_days'
    
    days_lower = days.lower()
    
    if 'both' in days_lower or 'दोनो' in days:
        return 'both_days'
    elif 'day 1' in days_lower or 'दिन 1' in days:
        return 'day_1'
    elif 'day 2' in days_lower or 'दिन 2' in days:
        return 'day_2'
    
    return 'both_days'  # Default

def parse_permissions(permissions: str) -> tuple[bool, bool]:
    """Parse permissions text to extract parental and media consent"""
    if not permissions:
        return (False, False)
    
    permissions_lower = permissions.lower()
    
    # Check for parental consent
    has_parental_consent = (
        'permission' in permissions_lower or
        'permit' in permissions_lower or
        'participate' in permissions_lower or
        'parents' in permissions_lower
    )
    
    # Check for media consent
    has_media_consent = (
        'media' in permissions_lower or
        'promotional' in permissions_lower or
        'image' in permissions_lower or
        'video' in permissions_lower or
        'social media' in permissions_lower
    )
    
    return (has_parental_consent, has_media_consent)

def import_csv_data(csv_path: str, tournament_id: str, supabase: Client):
    """Import CSV data into Supabase"""
    
    # First, read all rows to group by team
    teams_data: Dict[str, List[Dict]] = {}
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            team_name = row.get('Team Name (टीम का नाम):', '').strip()
            if not team_name:
                print(f"Warning: Skipping row with no team name")
                continue
            
            if team_name not in teams_data:
                teams_data[team_name] = []
            
            teams_data[team_name].append(row)
    
    print(f"Found {len(teams_data)} teams with {sum(len(players) for players in teams_data.values())} players")
    
    # Process each team
    for team_name, players in teams_data.items():
        print(f"\nProcessing team: {team_name}")
        
        # Get or create team
        community = players[0].get('Community (समुदाय):', '').strip()
        
        # Check if team already exists
        team_response = supabase.table('teams').select('id').eq('name', team_name).eq('tournament_id', tournament_id).execute()
        
        if team_response.data:
            team_id = team_response.data[0]['id']
            print(f"  Team already exists: {team_id}")
        else:
            # Get the first player's details to create captain info
            first_player = players[0]
            
            # Create team
            # Note: You'll need to provide captain_id - this requires a profile to exist
            print(f"  WARNING: Team does not exist. Please create team '{team_name}' manually first.")
            print(f"  Skipping players for this team.")
            continue
        
        # Import players
        success_count = 0
        error_count = 0
        
        for player_row in players:
            try:
                player_name = player_row.get('Player Full Name ( खिलाड़ी पूरा का नाम):', '').strip()
                gender = map_gender(player_row.get('Gender (लिंग):', ''))
                dob = parse_date(player_row.get('Date of Birth (DOB) (जन्म तिथि):', ''))
                participation_days = map_participation_days(player_row.get('Participating on which day?(किस दिन भाग ले रहे हैं?)', ''))
                permissions = player_row.get('Permissions (अनुमतियाँ):', '')
                queries = player_row.get('Any Queries or Comments (कोई प्रश्न या टिप्पणी):', '').strip() or None
                standard_cert = player_row.get('Standard WFDF Accreditation Certificate', '').strip() or None
                advance_cert = player_row.get('Advance WFDF Accreditation Certificate', '').strip() or None
                contact = player_row.get('Contact Number (संपर्क नंबर):', '').strip() or None
                parent_contact = player_row.get('Parents Contact Number (संपर्क नंबर):', '').strip() or None
                timestamp = player_row.get('Timestamp', '').strip()
                
                parental_consent, media_consent = parse_permissions(permissions)
                
                # Parse timestamp if provided
                reg_timestamp = None
                if timestamp:
                    try:
                        reg_timestamp = datetime.strptime(timestamp.split()[0], '%m/%d/%Y').isoformat() if timestamp else None
                    except:
                        reg_timestamp = None
                
                player_data = {
                    'team_id': team_id,
                    'name': player_name,
                    'gender': gender,
                    'email': f"{player_name.lower().replace(' ', '_')}@temp.local",
                    'date_of_birth': dob,
                    'contact_number': contact,
                    'parent_contact': parent_contact,
                    'participation_days': participation_days,
                    'parental_consent': parental_consent,
                    'media_consent': media_consent,
                    'queries_comments': queries,
                    'standard_wfdf_certificate_url': standard_cert if standard_cert and standard_cert != 'Google Drive Links' else None,
                    'advance_wfdf_certificate_url': advance_cert if advance_cert and advance_cert != 'Google Drive Links' else None,
                    'community': community,
                    'registration_timestamp': reg_timestamp,
                    'verified': False
                }
                
                # Insert player
                result = supabase.table('team_players').insert(player_data).execute()
                success_count += 1
                print(f"    ✓ {player_name}")
                
            except Exception as e:
                error_count += 1
                print(f"    ✗ Error importing {player_row.get('Player Full Name ( खिलाड़ी पूरा का नाम):', 'Unknown')}: {str(e)}")
        
        print(f"  Completed: {success_count} successful, {error_count} errors")
    
    print("\nImport complete!")

def main():
    parser = argparse.ArgumentParser(description='Import tournament player data from CSV')
    parser.add_argument('--csv', required=True, help='Path to CSV file')
    parser.add_argument('--tournament-id', required=True, help='Tournament UUID')
    parser.add_argument('--supabase-url', help='Supabase URL (or use SUPABASE_URL env var)')
    parser.add_argument('--supabase-key', help='Supabase anon key (or use SUPABASE_ANON_KEY env var)')
    
    args = parser.parse_args()
    
    # Get Supabase credentials
    url = args.supabase_url or os.getenv('SUPABASE_URL')
    key = args.supabase_key or os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("Error: Supabase credentials not provided")
        print("Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables or pass as arguments")
        return 1
    
    # Create Supabase client
    supabase: Client = create_client(url, key)
    
    # Import data
    try:
        import_csv_data(args.csv, args.tournament_id, supabase)
        return 0
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        return 1

if __name__ == '__main__':
    exit(main())



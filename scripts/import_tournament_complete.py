#!/usr/bin/env python3
"""
Complete Tournament CSV Import Script
Automatically creates tournament, teams, and imports all players from CSV

Usage:
    python scripts/import_tournament_complete.py --csv "path/to/file.csv"

Requirements:
    pip install supabase python-dotenv
"""

import argparse
import csv
import os
from datetime import datetime
from typing import Dict, List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import uuid

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
        'parents' in permissions_lower or
        'yes' in permissions_lower
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

def get_or_create_tournament(supabase: Client, tournament_name: str, tournament_date: str) -> str:
    """Get existing tournament or create a new one"""
    
    # Try to find existing tournament
    result = supabase.table('tournaments').select('id').eq('name', tournament_name).execute()
    
    if result.data and len(result.data) > 0:
        tournament_id = result.data[0]['id']
        print(f"Using existing tournament: {tournament_name} ({tournament_id})")
        return tournament_id
    
    # Create new tournament - we need a user to be created_by
    # Get any admin from user_roles table
    admin_result = supabase.table('user_roles').select('user_id').eq('role', 'admin').limit(1).execute()
    
    if admin_result.data and len(admin_result.data) > 0:
        created_by = admin_result.data[0]['user_id']
    else:
        # Try to get any existing user
        any_user_result = supabase.table('profiles').select('id').limit(1).execute()
        
        if any_user_result.data and len(any_user_result.data) > 0:
            created_by = any_user_result.data[0]['id']
            print("WARNING: No admin user found. Using first available user.")
        else:
            print("ERROR: No users found in database. Please create a user profile first.")
            raise Exception("No users available")
    
    # Parse tournament date
    start_date = parse_date(tournament_date) if tournament_date else datetime.now().strftime('%Y-%m-%d')
    end_date = start_date  # Same day tournament
    
    # Create tournament
    tournament_data = {
        'name': tournament_name,
        'start_date': start_date,
        'end_date': end_date,
        'location': 'To be determined',
        'status': 'registration_open',
        'created_by': created_by
    }
    
    result = supabase.table('tournaments').insert(tournament_data).execute()
    
    if result.data:
        tournament_id = result.data[0]['id']
        print(f"Created tournament: {tournament_name} ({tournament_id})")
        return tournament_id
    else:
        raise Exception("Failed to create tournament")

def get_or_create_team(supabase: Client, tournament_id: str, team_name: str, community: str) -> str:
    """Get existing team or create a new one"""
    
    # Try to find existing team
    result = supabase.table('teams').select('id').eq('name', team_name).eq('tournament_id', tournament_id).execute()
    
    if result.data and len(result.data) > 0:
        team_id = result.data[0]['id']
        print(f"  Team exists: {team_name}")
        return team_id
    
    # Get or create a captain user
    # Get any existing user to use as captain
    any_user = supabase.table('profiles').select('id').limit(1).execute()
    if any_user.data and len(any_user.data) > 0:
        captain_id = any_user.data[0]['id']
    else:
        print("ERROR: No users found. Cannot create teams without a user.")
        raise Exception("No users available")
    
    # Create team
    team_data = {
        'tournament_id': tournament_id,
        'name': team_name,
        'captain_id': captain_id,
        'email': f'{team_name.lower().replace(" ", "_")}@team.local',
        'phone': '0000000000',
        'status': 'approved',
        'community': community or 'Unknown'
    }
    
    result = supabase.table('teams').insert(team_data).execute()
    
    if result.data:
        team_id = result.data[0]['id']
        print(f"  Created team: {team_name}")
        return team_id
    else:
        raise Exception(f"Failed to create team: {team_name}")

def import_csv_data(csv_path: str, supabase: Client, tournament_name: str = "UDAAN 2025", tournament_date: str = None):
    """Import CSV data into Supabase"""
    
    # First, read all rows to group by team
    teams_data: Dict[str, List[Dict]] = {}
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Try different possible column names
            team_name = (row.get('Team Name (टीम का नाम):', '') or 
                        row.get('Team Name', '') or 
                        row.get('टीम का नाम:', '')).strip()
            
            if not team_name:
                print(f"Warning: Skipping row with no team name")
                continue
            
            if team_name not in teams_data:
                teams_data[team_name] = []
            
            teams_data[team_name].append(row)
    
    print(f"\n📊 Found {len(teams_data)} teams with {sum(len(players) for players in teams_data.values())} players\n")
    
    # Get or create tournament
    tournament_id = get_or_create_tournament(supabase, tournament_name, tournament_date)
    
    # Process each team
    total_success = 0
    total_errors = 0
    
    for team_name, players in teams_data.items():
        print(f"\n{'='*60}")
        print(f"Processing team: {team_name}")
        print(f"{'='*60}")
        
        # Get community from first player
        first_player = players[0]
        community = (first_player.get('Community (समुदाय):', '') or 
                    first_player.get('Community', '') or 
                    first_player.get('समुदाय:', '')).strip()
        
        # Get or create team
        try:
            team_id = get_or_create_team(supabase, tournament_id, team_name, community)
        except Exception as e:
            print(f"  ❌ Error creating team: {e}")
            continue
        
        # Import players
        success_count = 0
        error_count = 0
        
        for player_row in players:
            try:
                # Try different possible column names for each field
                player_name = (player_row.get('Player Full Name ( खिलाड़ी पूरा का नाम):', '') or 
                              player_row.get('Player Full Name', '') or 
                              player_row.get('खिलाड़ी पूरा का नाम:', '')).strip()
                
                gender = map_gender(player_row.get('Gender (लिंग):', '') or player_row.get('Gender', ''))
                dob = parse_date(player_row.get('Date of Birth (DOB) (जन्म तिथि):', '') or 
                                player_row.get('Date of Birth', '') or
                                player_row.get('DOB', ''))
                
                participation_days = map_participation_days(
                    player_row.get('Participating on which day?(किस दिन भाग ले रहे हैं?)', '') or
                    player_row.get('Participating day', '')
                )
                
                permissions = player_row.get('Permissions (अनुमतियाँ):', '') or player_row.get('Permissions', '')
                queries = (player_row.get('Any Queries or Comments (कोई प्रश्न या टिप्पणी):', '') or
                          player_row.get('Queries', '')).strip() or None
                
                standard_cert = (player_row.get('Standard WFDF Accreditation Certificate', '').strip() or None)
                advance_cert = (player_row.get('Advance WFDF Accreditation Certificate', '').strip() or None)
                contact = (player_row.get('Contact Number (संपर्क नंबर):', '').strip() or None)
                parent_contact = (player_row.get('Parents Contact Number (संपर्क नंबर):', '').strip() or None)
                timestamp = player_row.get('Timestamp', '').strip()
                
                parental_consent, media_consent = parse_permissions(permissions)
                
                # Parse timestamp if provided
                reg_timestamp = None
                if timestamp:
                    try:
                        reg_timestamp = datetime.strptime(timestamp.split()[0], '%m/%d/%Y').isoformat() if timestamp else None
                    except:
                        try:
                            reg_timestamp = datetime.strptime(timestamp.split()[0], '%d/%m/%Y').isoformat()
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
                    'community': community or None,
                    'registration_timestamp': reg_timestamp,
                    'verified': False
                }
                
                # Insert player
                result = supabase.table('team_players').insert(player_data).execute()
                success_count += 1
                total_success += 1
                
                print(f"    ✅ {player_name} ({gender})")
                
            except Exception as e:
                error_count += 1
                total_errors += 1
                player_name = player_row.get('Player Full Name ( खिलाड़ी पूरा का नाम):', 'Unknown')
                print(f"    ❌ Error importing {player_name}: {str(e)}")
        
        print(f"\n  Team Summary: {success_count} successful, {error_count} errors")
    
    print(f"\n{'='*60}")
    print(f"🎉 IMPORT COMPLETE!")
    print(f"{'='*60}")
    print(f"Total Success: {total_success} players")
    print(f"Total Errors: {total_errors} players")
    print(f"Tournament ID: {tournament_id}")
    print(f"\n✅ Check your Supabase dashboard to verify the data!")

def main():
    parser = argparse.ArgumentParser(description='Complete tournament import: CSV → Database')
    parser.add_argument('--csv', required=True, help='Path to CSV file')
    parser.add_argument('--tournament-name', default='UDAAN 2025', help='Tournament name')
    parser.add_argument('--tournament-date', help='Tournament date (DD/MM/YYYY)')
    parser.add_argument('--supabase-url', help='Supabase URL (or use SUPABASE_URL env var)')
    parser.add_argument('--supabase-key', help='Supabase service role key (or use SUPABASE_SERVICE_ROLE_KEY env var)')
    
    args = parser.parse_args()
    
    # Get Supabase credentials - use service role key to bypass RLS
    url = args.supabase_url or os.getenv('SUPABASE_URL')
    key = args.supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("❌ Error: Supabase credentials not provided")
        print("\nSet SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        print("or pass as arguments: --supabase-url and --supabase-key")
        print("\nGet credentials from: Supabase Dashboard → Settings → API")
        print("⚠️  IMPORTANT: Use the 'service_role' key (NOT 'anon public' key) for imports")
        return 1
    
    # Create Supabase client
    supabase: Client = create_client(url, key)
    
    # Import data
    try:
        import_csv_data(args.csv, supabase, args.tournament_name, args.tournament_date)
        return 0
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    exit(main())


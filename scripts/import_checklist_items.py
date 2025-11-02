#!/usr/bin/env python3
"""
Import Tournament Planning Checklist Items from CSV

This script reads a CSV file with default checklist items and imports them into the tournament_checklists table.

CSV Format:
    category, task_name, description, priority, due_date

Usage:
    python scripts/import_checklist_items.py --csv "checklist.csv" --tournament-id "<tournament-uuid>"

Requirements:
    pip install supabase python-dotenv
"""

import argparse
import csv
import os
from datetime import datetime
from typing import Optional
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def parse_date(date_str: str) -> Optional[str]:
    """Parse date from DD/MM/YYYY or DD-MM-YYYY format to YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return None
    
    date_str = date_str.strip()
    
    # Try different formats
    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%Y-%m-%d', '%d/%m/%y', '%m/%d/%y']:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    print(f"Warning: Could not parse date: {date_str}")
    return None

def validate_category(category: str) -> bool:
    """Validate category is in allowed list"""
    valid_categories = [
        'pre_registration', 'registration', 'pre_tournament', 'during_tournament',
        'post_tournament', 'ceremony', 'logistics', 'rules', 'seeding'
    ]
    return category.lower() in valid_categories

def validate_priority(priority: str) -> str:
    """Validate and normalize priority"""
    valid_priorities = ['low', 'medium', 'high', 'critical']
    priority_lower = priority.lower()
    
    if priority_lower in valid_priorities:
        return priority_lower
    
    # Try to match common variations
    if 'low' in priority_lower or priority_lower == 'l':
        return 'low'
    elif 'medium' in priority_lower or priority_lower == 'm':
        return 'medium'
    elif 'high' in priority_lower or priority_lower == 'h':
        return 'high'
    elif 'critical' in priority_lower or 'urgent' in priority_lower or priority_lower == 'c':
        return 'critical'
    
    return 'medium'  # Default

def import_checklist_items(csv_path: str, supabase, tournament_id: str):
    """Import checklist items from CSV into Supabase"""
    
    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV file not found: {csv_path}")
        return False
    
    success_count = 0
    error_count = 0
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        print(f"\nReading checklist items from: {csv_path}\n")
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
            try:
                # Get required fields (case-insensitive)
                category = None
                task_name = None
                
                # Try different possible column names
                for col_name in row.keys():
                    if not col_name:
                        continue
                    col_lower = col_name.lower()
                    value = row[col_name]
                    if not value:
                        continue
                    
                    if 'category' in col_lower:
                        category = value.strip()
                    elif 'task' in col_lower or 'name' in col_lower:
                        task_name = value.strip()
                
                # Validate required fields
                if not category:
                    print(f"  Row {row_num}: Missing category")
                    error_count += 1
                    continue
                
                if not task_name:
                    print(f"  Row {row_num}: Missing task name")
                    error_count += 1
                    continue
                
                # Validate category
                if not validate_category(category):
                    print(f"  Row {row_num}: Invalid category '{category}'")
                    error_count += 1
                    continue
                
                # Get optional fields
                description = None
                priority = 'medium'
                due_date = None
                
                for col_name, value in row.items():
                    if not col_name:
                        continue
                    col_lower = col_name.lower()
                    if 'description' in col_lower or 'detail' in col_lower:
                        description = value.strip() if value and value.strip() else None
                    elif 'priority' in col_lower:
                        if value and value.strip():
                            priority = validate_priority(value)
                    elif 'due' in col_lower or 'date' in col_lower:
                        if value and value.strip():
                            due_date = parse_date(value)
                
                # Create checklist item
                item_data = {
                    'tournament_id': tournament_id,
                    'category': category,
                    'task_name': task_name,
                    'description': description,
                    'priority': priority,
                    'status': 'pending'
                }
                
                if due_date:
                    item_data['due_date'] = due_date
                
                # Insert into database
                result = supabase.table('tournament_checklists').insert(item_data).execute()
                
                if result.data:
                    success_count += 1
                    print(f"  [OK] {task_name[:50]}")
                else:
                    error_count += 1
                    print(f"  [FAIL] Failed to insert: {task_name[:50]}")
                    
            except Exception as e:
                error_count += 1
                print(f"  [ERROR] Row {row_num}: {str(e)}")
    
    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE!")
    print(f"{'='*60}")
    print(f"Total Success: {success_count} items")
    print(f"Total Errors: {error_count} items")
    print(f"Tournament ID: {tournament_id}")
    print(f"\n[SUCCESS] Checklist items imported successfully!")
    
    return error_count == 0

def main():
    parser = argparse.ArgumentParser(description='Import tournament checklist items from CSV')
    parser.add_argument('--csv', required=True, help='Path to CSV file')
    parser.add_argument('--tournament-id', required=True, help='Tournament UUID')
    parser.add_argument('--supabase-url', help='Supabase URL (or use SUPABASE_URL env var)')
    parser.add_argument('--supabase-key', help='Supabase service role key (or use SUPABASE_SERVICE_ROLE_KEY env var)')
    
    args = parser.parse_args()
    
    # Get Supabase credentials - use service role key to bypass RLS
    url = args.supabase_url or os.getenv('SUPABASE_URL')
    key = args.supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("[ERROR] Supabase credentials not provided")
        print("\nSet SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        print("or pass as arguments: --supabase-url and --supabase-key")
        print("\nGet credentials from: Supabase Dashboard -> Settings -> API")
        print("[WARNING] IMPORTANT: Use the 'service_role' key (NOT 'anon public' key) for imports")
        return 1
    
    # Check if using service_role key
    is_service_role = (
        args.supabase_key or 
        (os.getenv('SUPABASE_SERVICE_ROLE_KEY') and os.getenv('SUPABASE_SERVICE_ROLE_KEY') != os.getenv('SUPABASE_ANON_KEY'))
    )
    
    if not is_service_role:
        print("[WARNING] ⚠️  NOT using SERVICE_ROLE_KEY - Using ANON key instead!")
        print("This WILL FAIL due to Row Level Security (RLS) policies.")
        print("\nTo fix this:")
        print("1. Get your service_role key from: Supabase Dashboard -> Settings -> API")
        print("2. Add to .env file: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key")
        print("3. Or pass it with: --supabase-key YOUR_SERVICE_ROLE_KEY")
        print("\nThe service_role key bypasses RLS for backend imports.\n")
        print("Continuing anyway, but expect RLS errors...\n")
    
    # Create Supabase client
    supabase = create_client(url, key)
    
    # Import data
    try:
        success = import_checklist_items(args.csv, supabase, args.tournament_id)
        return 0 if success else 1
    except Exception as e:
        print(f"[FATAL] Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    exit(main())


# CSV Import Guide - Tournament Player Data

## Overview
This guide shows you how to import player registration data from your CSV file (`UDAAN 2025 - Hackathon Reference - Udaan 2025.csv`) into your Supabase database.

---

## Method 1: Python Script (Recommended for Bulk Import)

### Prerequisites
1. Python 3.7+ installed
2. Access to your Supabase credentials

### Step 1: Install Required Packages

Open terminal/PowerShell in your project directory and run:

```bash
pip install supabase python-dotenv
```

### Step 2: Get Your Supabase Credentials

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key

### Step 3: Create Environment File (Optional)

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Get Tournament ID

Before importing, you need to create a tournament in your database or get an existing tournament ID:

1. Go to Supabase Dashboard → **Table Editor**
2. Open the `tournaments` table
3. Note the `id` (UUID) of the tournament you want to use
   - Or create a new tournament first

### Step 5: Create Teams First

⚠️ **IMPORTANT**: The script requires teams to exist before importing players.

**Option A: Create teams manually in Supabase**
1. Go to **Table Editor** → `teams` table
2. For each unique team name in your CSV, create a team with:
   - `tournament_id`: Your tournament UUID
   - `name`: Team name from CSV
   - `captain_id`: UUID of a user profile (can create temporary captain)
   - `email`: Team email
   - `phone`: Team phone
   - `status`: 'approved'
   - `community`: Community name from CSV

**Option B: Use SQL to create teams** (see SQL script below)

### Step 6: Run the Import Script

```bash
python scripts/import_tournament_players.py \
  --csv "C:\Users\busin\Downloads\UDAAN 2025 - Hackathon Reference - Udaan 2025.csv" \
  --tournament-id "YOUR-TOURNAMENT-UUID-HERE"
```

Or if using environment variables:

```bash
python scripts/import_tournament_players.py \
  --csv "path\to\your\file.csv" \
  --tournament-id "YOUR-TOURNAMENT-UUID"
```

### Step 7: Verify Import

Check in Supabase Dashboard:
- `team_players` table should have all imported players
- Verify fields like `date_of_birth`, `community`, `parental_consent`, etc.

---

## Method 2: Quick SQL Script to Create Teams First

Run this in Supabase SQL Editor to automatically create teams from your CSV data:

```sql
-- First, ensure you have a tournament
-- Replace 'YOUR-TOURNAMENT-ID' with actual tournament UUID
DO $$
DECLARE
  _tournament_id UUID := 'YOUR-TOURNAMENT-ID'::UUID;
  _admin_user_id UUID;
  _team_names TEXT[] := ARRAY[
    'Team Name 1',
    'Team Name 2',
    -- Add all unique team names from your CSV here
  ];
  _team_name TEXT;
BEGIN
  -- Get admin user ID (or create one if needed)
  SELECT id INTO _admin_user_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  IF _admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Please create an admin profile first.';
  END IF;
  
  -- Create teams
  FOREACH _team_name IN ARRAY _team_names
  LOOP
    INSERT INTO public.teams (
      tournament_id,
      name,
      captain_id,
      email,
      phone,
      status,
      community
    )
    SELECT 
      _tournament_id,
      _team_name,
      _admin_user_id,
      LOWER(REPLACE(_team_name, ' ', '_')) || '@team.local',
      '0000000000',
      'approved',
      'Unknown' -- Update with actual community if available
    WHERE NOT EXISTS (
      SELECT 1 FROM public.teams 
      WHERE name = _team_name 
      AND tournament_id = _tournament_id
    );
    
    RAISE NOTICE 'Created team: %', _team_name;
  END LOOP;
END $$;
```

---

## Method 3: Web-Based Import (Using BulkImportWizard Component)

If your app has the `BulkImportWizard` component available:

1. Log into your web application
2. Navigate to the page that has bulk import functionality
3. Upload your CSV file
4. Map columns to database fields
5. Review and import

**Note**: This component may need updates to handle tournament-specific fields.

---

## Troubleshooting

### Error: "Team does not exist"
- **Solution**: Create teams first using Method 2 (SQL script) or manually in Supabase

### Error: "Tournament not found"
- **Solution**: Create a tournament first in the `tournaments` table

### Error: "Invalid date format"
- **Solution**: The script handles common date formats. If issues persist, check your CSV date format

### Error: "Permission denied"
- **Solution**: Ensure your Supabase anon key has INSERT permissions on `team_players` and `teams` tables

### Missing Columns
- The script handles both English and Hindi column names from your CSV
- If a column is missing, check the CSV header row for variations

---

## CSV Column Mapping

The script automatically maps these CSV columns to database fields:

| CSV Column (English/Hindi) | Database Field |
|---------------------------|----------------|
| `Player Full Name` / `खिलाड़ी पूरा का नाम` | `name` |
| `Gender` / `लिंग` | `gender` |
| `Date of Birth (DOB)` / `जन्म तिथि` | `date_of_birth` |
| `Contact Number` / `संपर्क नंबर` | `contact_number` |
| `Parents Contact Number` | `parent_contact` |
| `Participating on which day?` / `किस दिन भाग ले रहे हैं?` | `participation_days` |
| `Permissions` / `अनुमतियाँ` | `parental_consent`, `media_consent` |
| `Any Queries or Comments` | `queries_comments` |
| `Standard WFDF Accreditation Certificate` | `standard_wfdf_certificate_url` |
| `Advance WFDF Accreditation Certificate` | `advance_wfdf_certificate_url` |
| `Community` / `समुदाय` | `community` |
| `Team Name` / `टीम का नाम` | Used for team grouping |

---

## Next Steps After Import

1. **Verify Data**: Check a few player records in Supabase
2. **Update Team Information**: Add proper captain, email, phone for each team
3. **Verify Players**: Mark verified players in `team_players.verified = true`
4. **Upload Certificates**: If certificates are URLs, verify they're accessible
5. **Test Application**: Ensure players show up in your tournament views

---

## Quick Reference Commands

```bash
# Install dependencies
pip install supabase python-dotenv

# Run import
python scripts/import_tournament_players.py --csv "path/to/file.csv" --tournament-id "UUID"

# With explicit credentials
python scripts/import_tournament_players.py \
  --csv "path/to/file.csv" \
  --tournament-id "UUID" \
  --supabase-url "https://xxx.supabase.co" \
  --supabase-key "your-anon-key"
```



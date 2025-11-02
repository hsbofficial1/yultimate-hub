# Quick Start Guide - Tournament Enhancements

## TL;DR: Get Started in 3 Steps

### 1️⃣ Run the Migration

In your Supabase SQL Editor, run:

```bash
# Option A: Using Supabase CLI
cd /path/to/your/project
supabase db push

# Option B: Copy-paste migration
# Open: supabase/migrations/20250113000000_tournament_team_enhancements.sql
# Copy entire content → Paste in Supabase Dashboard SQL Editor → Execute
```

### 2️⃣ Create Tournament & Teams

```sql
-- Step 1: Create tournament
INSERT INTO tournaments (name, start_date, end_date, location, max_teams, status, created_by)
VALUES (
  'UDAAN 2025', 
  '2025-01-11', 
  '2025-01-12', 
  'New Delhi', 
  50, 
  'registration_open', 
  '<your-user-id>'  -- Replace with actual user ID
)
RETURNING id; -- Copy this ID for next step

-- Step 2: For each team in CSV, create team record
-- First, you need a captain profile ID
INSERT INTO profiles (id, email, name, phone)
VALUES (
  gen_random_uuid(),
  'captain1@example.com',
  'Captain Name',
  '+911234567890'
)
RETURNING id; -- Use this as captain_id

-- Step 3: Create team
INSERT INTO teams (tournament_id, name, captain_id, email, phone, status, community)
VALUES (
  '<tournament-id>',  -- From Step 1
  'Garhi Ultimate',   -- Your team name from CSV
  '<captain-id>',     -- From Step 2
  'captain1@example.com',
  '+911234567890',
  'approved',
  'Garhi'  -- Community name from CSV
)
RETURNING id; -- Copy this team_id
```

### 3️⃣ Import CSV Data

**Quick Import (Python):**

```bash
# Install dependencies
pip install supabase python-dotenv

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Run import script
python scripts/import_tournament_players.py \
  --csv "Downloads/UDAAN 2025 - Hackathon Reference - Udaan 2025.csv" \
  --tournament-id "your-tournament-uuid"
```

**Alternative: Manual UI Import**

The enhanced `BulkImportWizard` component can now handle team player imports with all new fields.

## What You Get

✅ **New Player Fields:**
- Date of birth (auto-calculates age)
- Contact info (player + parent)
- Participation days (both_days, day_1, day_2)
- Consent tracking (parental + media)
- WFDF certificates
- Community tracking
- Verification status

✅ **Analytics Views:**
- `team_registration_summary` - Team-level stats
- `player_verification_status` - Player verification tracking
- `community_participation_stats` - Community analytics

✅ **Security:**
- Role-based access control
- Private document storage
- Data validation

✅ **Missing Tables Created:**
- `home_visits` - Track coaching visits
- `home_visit_photos` - Store visit photos

## Verify Installation

```sql
-- Check new fields were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_players' 
  AND column_name IN ('date_of_birth', 'parental_consent', 'media_consent', 'participation_days');

-- Check views were created
SELECT viewname 
FROM pg_views 
WHERE viewname IN ('team_registration_summary', 'player_verification_status', 'community_participation_stats');

-- Test age calculation
SELECT public.calculate_player_age('2006-06-06'::DATE);
-- Should return: 18 (or current age)
```

## Common Issues & Fixes

### ❌ "Permission denied" errors
**Fix:** Ensure your user has `tournament_director` or `admin` role:
```sql
-- Check your roles
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Add role (as admin)
INSERT INTO user_roles (user_id, role)
VALUES ('<user-id>', 'tournament_director');
```

### ❌ "Team does not exist" during import
**Fix:** Create teams first (see Step 2 above)

### ❌ TypeScript errors in IDE
**Fix:** Regenerate types:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### ❌ Date parsing errors
**Fix:** Check CSV date format. Script handles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD

## Next Steps

1. **Verify Data:** Check player registrations were imported correctly
2. **Upload Certificates:** Add WFDF certificates to `player-documents` storage bucket
3. **Review Analytics:** Use the analytics views for reporting
4. **Process Verifications:** Mark players as verified after manual review

## Quick Reference

### Key Tables
- `team_players` - Player registration data
- `teams` - Team information
- `home_visits` - Coaching visit tracking

### Key Functions
- `calculate_player_age(dob)` - Calculate age from DOB
- `import_player_data(...)` - Import player with all fields

### Key Views
- `team_registration_summary` - Team stats
- `player_verification_status` - Verification tracking
- `community_participation_stats` - Community analytics

## Need Help?

📖 Read full docs: `TOURNAMENT_ENHANCEMENTS_README.md`
🐛 Check migrations: `supabase/migrations/20250113000000_tournament_team_enhancements.sql`
📊 View analytics: Query the views listed above



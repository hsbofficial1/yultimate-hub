# Tournament Registration Enhancements - UDAAN 2025

## Overview

This enhancement adds comprehensive tournament player registration fields based on the UDAAN 2025 Hackathon Reference CSV data structure. It includes support for player certifications, permissions, community tracking, and detailed player information.

## What Was Added

### 1. Database Schema Enhancements

#### New Fields in `team_players` Table

| Field | Type | Description |
|-------|------|-------------|
| `date_of_birth` | DATE | Player date of birth (auto-calculates age) |
| `contact_number` | TEXT | Player's contact number |
| `parent_contact` | TEXT | Parent/guardian contact number |
| `participation_days` | TEXT | Which days player participates: `both_days`, `day_1`, or `day_2` |
| `parental_consent` | BOOLEAN | Parent/guardian consent for participation |
| `media_consent` | BOOLEAN | Consent for media/photos usage |
| `queries_comments` | TEXT | Any queries or comments from player |
| `standard_wfdf_certificate_url` | TEXT | Standard WFDF accreditation certificate |
| `advance_wfdf_certificate_url` | TEXT | Advanced WFDF accreditation certificate |
| `community` | TEXT | Community/neighborhood player represents |
| `registration_timestamp` | TIMESTAMP | Original registration timestamp |
| `verified` | BOOLEAN | Whether registration verified by staff |
| `verification_notes` | TEXT | Notes from verification process |

#### New Field in `teams` Table

| Field | Type | Description |
|-------|------|-------------|
| `community` | TEXT | Community/neighborhood the team represents |

#### New Tables

**`home_visits` Table** (was referenced in components but missing)
- Tracks home visits for coaching/program management
- Fields: visit_date, duration, purpose, observations, notes, action_items
- Fully integrated with RLS policies

**`home_visit_photos` Table**
- Stores photos from home visits
- Linked to home_visits with foreign key

### 2. Helper Functions

- **`calculate_player_age(dob DATE)`** - Calculates age from date of birth
- **`update_player_age_from_dob()`** - Trigger function to auto-update age when DOB is set
- **`import_player_data()`** - Function to import player data with all fields

### 3. Views for Analytics

**`team_registration_summary`**
- Summary of team registrations
- Player counts by participation days
- Verification and consent status

**`player_verification_status`**
- Verification status for all players
- Shows consent, certificate status
- Links to team and tournament info

**`community_participation_stats`**
- Community-level statistics
- Gender distribution
- Participation patterns
- Consent tracking

### 4. Storage Buckets

**`player-documents`** bucket
- Private storage for player certificates and documents
- 10MB limit per file
- Only tournament directors and admins can access

## Role-Based Permissions

### Team Players Access

**View Access:**
- Anyone can view players of approved teams
- Tournament directors and admins can view all players

**Modify Access:**
- Team captains can manage their own team's players
- Tournament directors and admins can manage all players

### Teams Access

**View Access:**
- Anyone can view approved teams
- Team captains can view their own teams

**Modify Access:**
- Team captains can register and update their teams (when status is pending)
- Tournament directors and admins can manage all teams

### Home Visits Access

**View & Modify Access:**
- Coaches and program managers can view and manage home visits
- Admins have full access

## Installation & Setup

### 1. Run the Migration

```bash
# If using Supabase CLI locally
supabase migration up

# Or apply via Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20250113000000_tournament_team_enhancements.sql
```

### 2. Generate TypeScript Types

After running the migration, regenerate your TypeScript types:

```bash
# Using Supabase CLI
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Or via Dashboard: Settings > Database > Type Generation
```

### 3. Import CSV Data

You have two options for importing the CSV data:

#### Option A: Using the Python Script

1. Install dependencies:
```bash
pip install supabase python-dotenv pandas
```

2. Set up environment variables in `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

3. Run the import:
```bash
python scripts/import_tournament_players.py \
  --csv "path/to/UDAAN 2025 - Hackathon Reference - Udaan 2025.csv" \
  --tournament-id <your-tournament-id>
```

**Note:** The script will:
- Parse dates in DD/MM/YYYY format
- Map Hindi/English gender terms to database format
- Extract participation days from Hindi/English text
- Parse consent permissions from text
- Handle missing/empty fields gracefully

#### Option B: Manual Import via UI

1. Use the existing `BulkImportWizard` component (if extended for team_players)
2. Or create team via UI first, then add players with new fields

### 4. Create Tournament and Teams First

Before importing players, you need:

1. **Create Tournament:**
```sql
INSERT INTO tournaments (name, start_date, end_date, location, max_teams, status, created_by)
VALUES ('UDAAN 2025', '2025-01-01', '2025-01-02', 'Location', 20, 'registration_open', '<admin-user-id>');
```

2. **Create Teams:**
For each unique team name in the CSV, create a team:
```sql
INSERT INTO teams (tournament_id, name, captain_id, email, phone, status)
VALUES (
  '<tournament-id>',
  'Team Name',
  '<captain-profile-id>',  -- Must create captain profile first
  'captain@email.com',
  '+911234567890',
  'approved'
);
```

**Note:** You'll need to create profile records for team captains before importing players.

## CSV Field Mapping

| CSV Column | Database Field | Transformation |
|------------|---------------|----------------|
| Team Name (टीम का नाम) | teams.name | Direct |
| Community (समुदाय) | teams.community, team_players.community | Direct |
| Player Full Name | team_players.name | Direct |
| Gender (लिंग) | team_players.gender | Map: Male/पुरुष → male, Female/महिला → female |
| Participating on which day? | team_players.participation_days | Map: Both/दोनो → both_days, Day 1 → day_1, Day 2 → day_2 |
| Date of Birth (DOB) | team_players.date_of_birth | Parse DD/MM/YYYY → YYYY-MM-DD |
| Contact Number | team_players.contact_number | Direct |
| Parents Contact Number | team_players.parent_contact | Direct |
| Permissions | team_players.parental_consent, media_consent | Extract from text |
| Any Queries or Comments | team_players.queries_comments | Direct |
| Standard WFDF Certificate | team_players.standard_wfdf_certificate_url | Direct (if URL provided) |
| Advance WFDF Certificate | team_players.advance_wfdf_certificate_url | Direct (if URL provided) |
| Timestamp | team_players.registration_timestamp | Parse timestamp |

## Usage Examples

### Query Player Information

```typescript
// Get all players with verification status
const { data, error } = await supabase
  .from('player_verification_status')
  .select('*')
  .eq('tournament_name', 'UDAAN 2025');

// Get team registration summary
const { data: teams } = await supabase
  .from('team_registration_summary')
  .select('*')
  .eq('tournament_id', tournamentId);
```

### Import a Single Player

```typescript
const { data, error } = await supabase.rpc('import_player_data', {
  _team_id: teamId,
  _player_name: 'John Doe',
  _gender: 'male',
  _dob: '2006-06-06',
  _participation_days: 'both_days',
  _parental_consent: true,
  _media_consent: true,
  _community: 'Garhi'
});
```

### Get Community Statistics

```typescript
const { data: stats } = await supabase
  .from('community_participation_stats')
  .select('*')
  .order('total_players', { ascending: false });
```

## Data Validation

The migration includes several validation constraints:

1. **Age Calculation**: Age is automatically calculated from date of birth
2. **Date Validation**: Date of birth cannot be in the future
3. **Participation Days**: Must be one of: both_days, day_1, day_2
4. **Gender**: Must be one of: male, female, other
5. **Unique Constraints**: Prevents duplicate registrations

## Security

All tables have Row Level Security (RLS) enabled with role-based policies:

- **Public data** (approved teams, verified players): Anyone can view
- **Team management**: Only captains can modify their own teams
- **Administrative data**: Only admins and tournament directors can modify
- **Private documents**: Stored in private bucket with restricted access

## Next Steps

1. ✅ Run the migration
2. ✅ Create tournament and teams
3. ⏳ Import CSV data
4. ⏳ Verify player registrations
5. ⏳ Add certificate documents to storage
6. ⏳ Use analytics views for reporting

## Troubleshooting

### Error: Team does not exist
- Create teams manually first via UI or SQL
- Ensure you have the correct tournament_id

### Error: Invalid date format
- The Python script handles multiple date formats
- Check your CSV date format matches expected patterns

### Error: Permission denied
- Verify your user has the correct role (tournament_director or admin)
- Check RLS policies are enabled

### Missing home_visits table
- The migration creates this table automatically
- If you see errors, ensure migration ran completely

## Files Modified/Created

```
supabase/migrations/20250113000000_tournament_team_enhancements.sql  [NEW]
scripts/import_tournament_players.py  [NEW]
TOURNAMENT_ENHANCEMENTS_README.md  [NEW]
src/integrations/supabase/types.ts  [Will be auto-generated]
```

## Support

For issues or questions:
1. Check migration logs in Supabase Dashboard
2. Verify RLS policies are enabled
3. Check user roles are assigned correctly
4. Review CSV data format matches expected structure



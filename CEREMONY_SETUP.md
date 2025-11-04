# Ceremony Page Setup Guide

## Quick Fix Steps

### 1. Run the Database Migration

The ceremony page requires additional columns in the `ceremony_speakers` table. Run this migration:

```bash
# If using Supabase CLI
supabase migration up

# Or manually apply the migration file
# supabase/migrations/20250119000000_update_existing_tasks_categories.sql
```

The migration adds:
- `team_id` column (UUID, references teams table)
- `team_name` column (TEXT)

### 2. Verify the Page is Working

1. Navigate to any tournament detail page
2. Click on the "Ceremony" tab
3. You should see the Ceremony Planning interface with sections:
   - Ceremony Details
   - Team Speeches
   - Parents' Response (max 3)
   - Open to Everyone (max 5)
   - Special Mention
   - Medal Ceremony

### 3. Features

- **Team Speeches**: Add one speech per team (3 minutes each, with participation certificate)
- **Parents' Response**: Add up to 3 parent responses (5 minutes total)
- **Open to Everyone**: Add up to 5 volunteer/donor speakers (5 minutes total)
- **Special Mention**: Thank venue partners and sponsors (2 minutes)
- **Medal Ceremony**: Add awards with jersey counts and winner names

### 4. Troubleshooting

If you see errors:

1. **Check browser console** for any error messages
2. **Verify migration ran** - Check if `team_id` and `team_name` columns exist in `ceremony_speakers` table
3. **Check permissions** - Make sure you have admin or tournament_director role

### 5. Using the Ceremony Page

1. **Edit Ceremony Details**: Click "Edit Details" to set date, time, location, duration
2. **Add Team Speeches**: 
   - Click "Add Team Speech"
   - Select a team from the dropdown
   - Enter speaker name and details
   - Each team can only have one speech
3. **Add Parent Responses**:
   - Click "Add Parent" (max 3)
   - Enter parent name and speech topic
4. **Add Open Speakers**:
   - Click "Add Speaker" (max 5)
   - Enter volunteer/donor details
5. **Add Special Mentions**:
   - Click "Add Mention"
   - Add venue partners and sponsors
6. **Add Awards**:
   - Click "Add Award"
   - Enter award category, winner name, jersey count
   - Awards are displayed in the Medal Ceremony section

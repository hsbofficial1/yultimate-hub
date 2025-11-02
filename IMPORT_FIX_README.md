# 🛠️ CSV Import RLS Fix

## Problem
The CSV import was failing with:
```
❌ Fatal error: {'message': 'new row violates row-level security policy for table "tournaments"'}
```

## Root Cause
Row Level Security (RLS) policies require authenticated users with specific roles (`admin` or `tournament_director`). The import script was using the `anon public` key, which doesn't have permissions to bypass RLS.

## Solution
The import script has been updated to use the **service_role** key, which bypasses RLS and allows backend operations.

## How to Run the Import

### Option 1: Using Command Line Arguments (Quick Test)

    1. Get your **service_role** key from Supabase:
    - Go to: https://supabase.com/dashboard/project/glktlcjpcepphphgaqrc/settings/api
    - Scroll to "Project API keys"
    - Find **service_role** (NOT 'anon public')
    - Click **Reveal** to show the secret key
    - Copy the entire key (starts with `eyJ...`)

2. Run the import:
   ```powershell
   python scripts\import_tournament_complete.py `
     --csv "C:\Users\busin\Downloads\UDAAN2025HackathonReferenceUdaan2025.csv" `
     --supabase-url "https://glktlcjpcepphphgaqrc.supabase.co" `
     --supabase-key "YOUR_SERVICE_ROLE_KEY_HERE"
   ```

### Option 2: Using .env File (Recommended)

1. Create a `.env` file in the project root:
   ```env
   SUPABASE_URL=https://glktlcjpcepphphgaqrc.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. Add `.env` to `.gitignore` (IMPORTANT - never commit this file!)

3. Run the import:
   ```powershell
   python scripts\import_tournament_complete.py --csv "C:\Users\busin\Downloads\UDAAN2025HackathonReferenceUdaan2025.csv"
   ```

### Option 3: Using the Batch Script

1. Create `.env` file with your credentials (see Option 2)

2. Run:
   ```cmd
   RUN_IMPORT.bat
   ```

## Security Notes

⚠️ **IMPORTANT**: The service_role key is a **secret key** with full database access:
- ✅ Use it for backend scripts and imports
- ❌ NEVER commit it to git or share it publicly
- ❌ NEVER use it in frontend code (browser/client-side)
- ✅ Add `.env` to `.gitignore` to keep it safe

## Files Changed

The following files were updated to support the service_role key:

1. **`scripts/import_tournament_complete.py`**
   - Updated to use `SUPABASE_SERVICE_ROLE_KEY` env var
   - Falls back to `SUPABASE_ANON_KEY` for compatibility
   - Added helpful error message about using service_role key

2. **`env.example.txt`**
   - Added `SUPABASE_SERVICE_ROLE_KEY` with security warnings

3. **`QUICK_START_IMPORT.md`**
   - Updated all examples to use service_role key
   - Added troubleshooting for RLS errors
   - Added security warnings

4. **`RUN_IMPORT.bat`**
   - Updated prompts to request service_role key
   - Added instructions on where to find it

## Verification

After running the import, verify in Supabase Dashboard:
- ✅ `tournaments` table → Should see "UDAAN 2025"
- ✅ `teams` table → Should see all 16 teams
- ✅ `team_players` table → Should see all 340 players

## Troubleshooting

### "Key not found" error
Make sure you copied the **entire** service_role key (it's very long, starting with `eyJ`)

### "Permission denied" error
Double-check you're using the **service_role** key, not the anon public key

### "No admin user found" warning
This is okay - the script will use the first available user as a fallback

### Import succeeds but no data appears
Check the Supabase logs for RLS violations on related tables (teams, team_players)

---

**Status**: ✅ Fixed and ready to use!

**Last Updated**: 2025-01-14


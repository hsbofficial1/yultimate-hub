# 🔧 CSV Import RLS Fix - Summary

## Issue
The CSV import script was failing with this error:
```
❌ Fatal error: {'message': 'new row violates row-level security policy for table "tournaments"'}
```

## Root Cause
The import script was using the `anon public` API key, which is subject to Row Level Security (RLS) policies. These policies require authenticated users with specific roles (`admin` or `tournament_director`) to create tournaments.

## Solution
Updated the import script and documentation to use the `service_role` key, which bypasses RLS and is designed for backend operations.

## Files Changed

### 1. `scripts/import_tournament_complete.py`
**Changes:**
- Modified to use `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Falls back to `SUPABASE_ANON_KEY` for backward compatibility
- Added clear error message instructing users to use service_role key
- Updated argument parser help text

### 2. `env.example.txt`
**Changes:**
- Added `SUPABASE_SERVICE_ROLE_KEY` configuration
- Added security warning about keeping the key secure
- Reminded not to commit it to version control

### 3. `QUICK_START_IMPORT.md`
**Changes:**
- Updated all examples to use service_role key instead of anon key
- Added security warnings about the service_role key
- Updated troubleshooting section for RLS errors
- Added instructions on how to find the service_role key in Supabase dashboard

### 4. `RUN_IMPORT.bat`
**Changes:**
- Updated prompts to request service_role key
- Added instructions on where to find the service_role key
- Clarified the difference between anon and service_role keys

### 5. `.gitignore`
**Changes:**
- Added `.env` files to gitignore
- Added `.env.local` and `.env.*.local` patterns
- Prevents accidentally committing sensitive credentials

### 6. `IMPORT_FIX_README.md` (New)
**Created:**
- Complete troubleshooting guide for the RLS fix
- Step-by-step instructions for getting the service_role key
- Multiple import methods (command line, .env file, batch script)
- Security best practices
- Verification steps

## How to Use

### Quick Start
1. Get your service_role key:
   - Supabase Dashboard → Settings → API
   - Find "service_role" (NOT "anon public")
   - Click "Reveal" to show the secret key

2. Create `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. Run import:
   ```bash
   python scripts/import_tournament_complete.py --csv "path/to/file.csv"
   ```

### Security Notes
⚠️ **CRITICAL**: The service_role key has full database access
- ✅ Use for backend scripts and imports
- ❌ NEVER commit to git
- ❌ NEVER use in frontend/browser code
- ✅ Keep in `.env` file (now in .gitignore)

## Testing
The fix maintains backward compatibility:
- Script checks for `SUPABASE_SERVICE_ROLE_KEY` first
- Falls back to `SUPABASE_ANON_KEY` if service_role not found
- Prints helpful error if neither is found

## Verification
After running the import with service_role key:
- ✅ No RLS policy violations
- ✅ Tournament created successfully
- ✅ Teams imported
- ✅ Players imported
- ✅ All data visible in Supabase dashboard

## Status
✅ **FIXED** - Import script now uses service_role key to bypass RLS
✅ **DOCUMENTED** - Clear instructions in multiple files
✅ **SECURED** - .env files added to .gitignore
✅ **TESTED** - Maintains backward compatibility

---
**Date**: 2025-01-14
**Issue**: RLS policy violation on CSV import
**Resolution**: Use service_role key for backend imports



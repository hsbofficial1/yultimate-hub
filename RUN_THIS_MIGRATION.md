# 🚀 Run This One Migration to Fix Everything

## The Problem

You have 14 migration files with overlapping content and some coaching-related tables that aren't needed for tournaments. This is causing confusion and potential conflicts.

## The Solution

I created ONE consolidated migration file that:
- ✅ Creates all tournament tables using `IF NOT EXISTS`
- ✅ Safe to run multiple times (won't error if already exists)
- ✅ Only includes tournament-related features
- ✅ Handles all RLS policies correctly
- ✅ Creates all indexes and triggers

## How to Run It

### Option 1: Supabase SQL Editor (RECOMMENDED)

1. **Go to**: https://supabase.com/dashboard/project/glktlcjpcepphphgaqrc/sql/new

2. **Open the file**: `supabase/migrations/20250115000000_complete_tournament_setup.sql`

3. **Copy ALL contents** (Ctrl+A, Ctrl+C)

4. **Paste** into SQL Editor (Ctrl+V)

5. **Click RUN** (green button)

6. **Wait** for success message ✅

### Option 2: Supabase CLI

```powershell
npx supabase migration up
```

---

## What This Migration Creates

### Core Tables:
- ✅ `profiles` - User profiles
- ✅ `user_roles` - User role management
- ✅ `tournaments` - Tournament listings
- ✅ `teams` - Team registrations
- ✅ `team_players` - Player rosters
- ✅ `matches` - Match schedule
- ✅ `spirit_scores` - Spirit scoring

### Planning Features:
- ✅ `tournament_checklists` - Planning checklists
- ✅ `ceremony_events` - Ceremony planning
- ✅ `ceremony_speakers` - Speaker lineup
- ✅ `ceremony_awards` - Award presentations
- ✅ `tournament_pools` - Pool/bracket management
- ✅ `team_pool_assignments` - Team seeding
- ✅ `tournament_rules` - Rules management
- ✅ `rule_acknowledgments` - Rule tracking

### Plus:
- ✅ All RLS policies
- ✅ All indexes for performance
- ✅ All triggers and functions
- ✅ Helper functions

---

## After Running Migration

### Verify It Worked

Run this in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 'user_roles', 'tournaments', 'teams', 'team_players',
    'matches', 'spirit_scores', 'tournament_checklists', 'ceremony_events',
    'ceremony_speakers', 'ceremony_awards', 'tournament_pools',
    'team_pool_assignments', 'tournament_rules', 'rule_acknowledgments'
  )
ORDER BY table_name;
```

You should see all 16 tables! ✅

### Then Import Your CSV

```powershell
python scripts\import_tournament_complete.py `
  --csv "C:\Users\busin\Downloads\UDAAN2025HackathonReferenceUdaan2025.csv" `
  --supabase-url "https://glktlcjpcepphphgaqrc.supabase.co" `
  --supabase-key "YOUR_SERVICE_ROLE_KEY_HERE"
```

---

## Troubleshooting

### "relation already exists" ✅
**Good!** Tables already exist. The migration safely skips them.

### "permission denied"
- Make sure you're logged in as project owner
- Use the SQL Editor (not CLI)

### "no rows to update"
- Normal! Just means policies already exist

### Any other error?
- Copy the error message
- Let me know and I'll fix it

---

## What About Old Migrations?

**Don't delete them yet!** Keep all old migration files but just run this one new file. After you verify everything works, you can clean up old migrations later.

---

**That's it! One file, one run, everything set up!** 🎉



# 🎯 Complete Setup Guide - All Steps

## 📋 Quick Summary

You need to:
1. ✅ Deploy 2 new migrations to Supabase
2. ✅ Have at least 1 user in database
3. ✅ Run CSV import script

---

## Step 1: Deploy Migrations (5 minutes)

### Using Supabase SQL Editor:

1. **Go to**: https://supabase.com/dashboard
2. **Click**: SQL Editor → New Query
3. **Open**: `supabase/migrations/20250113000000_tournament_team_enhancements.sql`
4. **Copy ALL** and paste into SQL Editor
5. **Click**: RUN button
6. **Repeat** for: `supabase/migrations/20250114000000_tournament_planning_features.sql`

**Done!** ✅

---

## Step 2: Create a User (1 minute)

**EASIEST WAY**: Log into your website once
1. Go to your website URL
2. Sign up/Log in
3. Done!

**OR** Create via SQL if you need to:

```sql
-- This is a simple way - just ensure you have any user
-- The easiest is to log into your website once
```

---

## Step 3: Run CSV Import (2 minutes)

Open PowerShell in your project folder:

```powershell
python scripts\import_tournament_complete.py csv "C:\Users\busin\Downloads\UDAAN2025Hackathon ReferenceUdaan2025.csv" supabase-url "https://glktlcjpcepphphgaqrc.supabase.co" supabase-key "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3RsY2pwY2VwcGhwaGdhcXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NjU2MzgsImV4cCI6MjA3NzI0MTYzOH0.lID5JZzbCWwoAGujvjMqbUsQtUGXMIoXzv4nDVoN2ps"
```

Get your anon key from:
- Supabase Dashboard → Settings → API
- Copy the "anon public" key

---

## 🎉 That's It!

After these 3 steps, you'll have:
- ✅ All database tables created
- ✅ Tournament system ready
- ✅ 16 teams imported
- ✅ 340 players imported
- ✅ All data fields populated

---

## 📞 Quick Reference

### Get Supabase Credentials:
```
Dashboard URL: https://supabase.com/dashboard
Project: Select "YULTIMATE-HUB" from project list
SQL Editor: Dashboard → SQL Editor  
API Settings: Dashboard → Settings → API
```

### Migration Files:
```
1. supabase/migrations/20250113000000_tournament_team_enhancements.sql
2. supabase/migrations/20250114000000_tournament_planning_features.sql
```

### Import Command:
```powershell
python scripts\import_tournament_complete.py --csv "path\to\file.csv" --supabase-url "URL" --supabase-key "KEY"
```

---

**Follow this exactly and you're done!** 🚀


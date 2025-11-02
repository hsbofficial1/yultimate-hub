# 🚀 Deploy Everything NOW

## ⚠️ DO THIS FIRST: Run The One Migration!

**NEW**: Just run ONE migration file that has everything!

---

## Step 1: Run Complete Tournament Migration

1. **Go to**: https://supabase.com/dashboard/project/glktlcjpcepphphgaqrc/sql/new
2. **Open**: `supabase/migrations/20250115000000_complete_tournament_setup.sql`
3. **Copy ALL** contents (Ctrl+A, Ctrl+C)
4. **Paste** into SQL Editor (Ctrl+V)
5. **Click**: RUN button (green button at bottom)
6. **Wait**: For success message ✅

That's it! One migration, everything set up!

---

## Step 2: Find Your CSV File

The file might have a different name. Check:

```powershell
# Search for CSV files
Get-ChildItem C:\Users\busin\Downloads -Filter "*.csv" | Select-Object Name

# Or search everywhere
Get-ChildItem C:\Users\busin -Filter "*UDAAN*.csv" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

---

## Step 3: Run CSV Import

Once you find the file, run:

```powershell
python scripts\import_tournament_complete.py `
  --csv "C:\Users\busin\Downloads\UDAAN2025HackathonReferenceUdaan2025.csv" `
  --supabase-url "https://glktlcjpcepphphgaqrc.supabase.co" `
  --supabase-key "YOUR_SERVICE_ROLE_KEY_HERE"
```

⚠️ **IMPORTANT**: Use the **service_role** key (NOT anon public key)!
See `IMPORT_FIX_README.md` for how to get it.

---

## Quick Summary

1. ✅ Run ONE migration: `20250115000000_complete_tournament_setup.sql`
2. ✅ Import CSV using service_role key
3. ✅ View tabs in Tournament Detail page

**See `RUN_THIS_MIGRATION.md` for detailed instructions!**


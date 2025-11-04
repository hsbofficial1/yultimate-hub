# Quick Checklist Import Guide

Your import failed due to Row Level Security (RLS) - you need to use the service_role key or run SQL directly.

## Option 1: SQL Direct Import (Easiest) ✅

**Recommended for quick setup!**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open file: `scripts/default_checklist_items.sql`
3. Find and replace `TOURNAMENT_ID_HERE` with your tournament ID: `b696c04b-ac49-4763-9ccd-1460b236f9ac`
4. Click **Run** button
5. Done! 🎉

The SQL file contains all 50+ default checklist items ready to import.

## Option 2: Fix Python Script (For Automation)

The CSV import script failed because it needs the `service_role` key to bypass RLS.

### Get Your Service Role Key:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find **service_role** key (secret!)
3. Click **Reveal** to see it

### Then run:

```bash
python scripts/import_checklist_items.py \
  --csv "scripts/tournament_checklist_template.csv" \
  --tournament-id "b696c04b-ac49-4763-9ccd-1460b236f9ac" \
  --supabase-url "https://glktlcjpcepphphgaqrc.supabase.co" \
  --supabase-key "YOUR_SERVICE_ROLE_KEY_HERE"
```

Or add to `.env` file:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Then run:
```bash
python scripts/import_checklist_items.py --csv "scripts/tournament_checklist_template.csv" --tournament-id "b696c04b-ac49-4763-9ccd-1460b236f9ac"
```

## Option 3: Use the Batch File

Double-click: `RUN_CHECKLIST_IMPORT.bat`

It will prompt you for credentials if `.env` doesn't exist.

---

## Why Option 1 is Best

SQL import:
- ✅ No credentials needed (runs as admin in dashboard)
- ✅ Fast and simple
- ✅ No RLS issues
- ✅ Works immediately

Try Option 1 first! 🚀





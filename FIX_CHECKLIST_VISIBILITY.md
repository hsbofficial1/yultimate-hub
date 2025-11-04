# Fix Checklist Visibility Issue

## Problem
Checklist items are imported but not visible because RLS (Row Level Security) policy is too restrictive.

## Solution
Run the migration to update the RLS policy to allow authenticated users to view checklist items.

## Quick Fix (Choose One)

### Option 1: Run SQL in Supabase Dashboard (Easiest) ✅

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of: `supabase/migrations/20250116000000_fix_checklist_rls.sql`
3. Paste and click **Run**
4. Refresh your web page - checklist items should appear!

### Option 2: Run via Command Line

If you have Supabase CLI:
```bash
supabase db push
```

## What This Fixes

The migration updates the RLS policy so that:
- ✅ Any authenticated user can **view** checklist items for tournaments that are not in 'draft' status
- ✅ Only tournament creators, admins, and tournament directors can **manage** (add/edit/delete) items
- ✅ This matches the tournament visibility rules

## Verify It Works

After running the migration:
1. Refresh your browser
2. Go to Planning tab
3. You should see all 59 checklist items! 🎉

---

**Migration file:** `supabase/migrations/20250116000000_fix_checklist_rls.sql`





# 🚀 Deploy Migrations to Supabase

Since CLI is having network issues, here's how to deploy migrations directly.

---

## ✅ Method 1: Supabase SQL Editor (EASIEST!)

### Step 1: Open SQL Editor
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in left sidebar
3. Click **New query**

### Step 2: Run Migration 1

1. Click **New Query** button
2. Open file: `supabase/migrations/20250113000000_tournament_team_enhancements.sql`
3. Copy ALL contents (Ctrl+A, Ctrl+C)
4. Paste into SQL Editor (Ctrl+V)
5. Click **RUN** button (or press F5)
6. Wait for success ✅

### Step 3: Run Migration 2

1. Click **New Query** again
2. Open file: `supabase/migrations/20250114000000_tournament_planning_features.sql`
3. Copy ALL contents (Ctrl+A, Ctrl+C)
4. Paste into SQL Editor (Ctrl+V)
5. Click **RUN** button (or press F5)
6. Wait for success ✅

### Step 4: Verify

Run this query to verify:

```sql
-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'home_visits', 'home_visit_photos', 'tournament_checklists',
    'ceremony_events', 'ceremony_speakers', 'ceremony_awards',
    'tournament_day_schedules', 'tournament_pools', 'team_pool_assignments',
    'tournament_rules', 'rule_acknowledgments', 'match_commentary',
    'match_highlights', 'match_officials'
  )
ORDER BY table_name;
```

You should see 14 tables!

---

## 🎯 Method 2: Using Supabase CLI (When Network Works)

If network connection improves:

```bash
# Link to your project
npx supabase link --project-ref glktlcjpcepphphgaqrc

# Push migrations
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

---

## 📋 Migration Order

Run these in order:

1. ✅ **Existing migrations** (should already be applied)
   - `20251029100422_remix_batch_1_migrations.sql`
   - `20251029101205_3e01f444-dc2e-4c72-b361-1c679baff6ff.sql`
   - (all others in numerical order)

2. ✅ **NEW Migration 1**
   - `20250113000000_tournament_team_enhancements.sql`
   - Adds team/player registration fields

3. ✅ **NEW Migration 2**
   - `20250114000000_tournament_planning_features.sql`
   - Adds tournament planning features

---

## 🐛 Troubleshooting

### "relation already exists"
- **Good!** Tables already created
- Continue to next migration

### "function already exists"
- **Good!** Functions already created
- Continue to next migration

### "permission denied"
- Check your Supabase credentials
- Ensure you're logged in as project owner

### "column does not exist"
- Run migrations in order
- Don't skip migrations

---

## ✅ Success Indicators

After running migrations, you should have:

- ✅ 14+ new tables
- ✅ Views created
- ✅ Functions created
- ✅ RLS policies active
- ✅ Storage buckets ready

Check with:

```sql
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

**Once migrations are done, proceed to CSV import!** 🎉



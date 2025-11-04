# Tournament Planning Checklist CSV Import Guide

This guide explains how to import default checklist items into your tournament using a CSV file.

## Quick Start

1. **Use the template CSV** (`scripts/tournament_checklist_template.csv`)
2. **Run the import script** with your tournament ID
3. **Check your tournament** - items will appear in the Planning tab!

## Requirements

Install Python dependencies:
```bash
pip install supabase python-dotenv
```

## Setup Environment Variables

Create a `.env` file in the project root:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important**: Use the `service_role` key, NOT the `anon` key for imports.

Get your credentials from: Supabase Dashboard → Settings → API

## CSV Format

The CSV should have these columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `category` | Yes | Task category | `pre_tournament` |
| `task_name` | Yes | Task name | `Secure tournament venue` |
| `description` | No | Detailed description | `Book and confirm venue availability for all dates` |
| `priority` | No | Priority level | `high` |
| `due_date` | No | Due date | `2025-01-15` |

### Valid Categories

- `pre_registration` - Pre-Registration
- `registration` - Registration
- `pre_tournament` - Pre-Tournament
- `during_tournament` - During Tournament
- `post_tournament` - Post-Tournament
- `ceremony` - Ceremony
- `logistics` - Logistics
- `rules` - Rules
- `seeding` - Seeding

### Valid Priorities

- `low` - Low priority
- `medium` - Medium priority (default)
- `high` - High priority
- `critical` - Critical priority

### Date Format

Dates can be in any of these formats:
- `DD/MM/YYYY` - e.g., `15/01/2025`
- `DD-MM-YYYY` - e.g., `15-01-2025`
- `YYYY-MM-DD` - e.g., `2025-01-15`
- `MM/DD/YYYY` - e.g., `01/15/2025`

## Import Methods

### Method 1: Using the Template (Recommended)

The template CSV (`scripts/tournament_checklist_template.csv`) includes 50+ common tournament tasks:

```bash
python scripts/import_checklist_items.py \
  --csv "scripts/tournament_checklist_template.csv" \
  --tournament-id "your-tournament-uuid-here"
```

### Method 2: Using Your Own CSV

1. Create a CSV file with the required columns
2. Run the import script:

```bash
python scripts/import_checklist_items.py \
  --csv "path/to/your/checklist.csv" \
  --tournament-id "your-tournament-uuid-here"
```

### Method 3: Using Environment Variables

If your `.env` file is configured:

```bash
python scripts/import_checklist_items.py \
  --csv "checklist.csv" \
  --tournament-id "your-tournament-uuid-here"
```

### Method 4: Passing Credentials Directly

For one-time imports without `.env`:

```bash
python scripts/import_checklist_items.py \
  --csv "checklist.csv" \
  --tournament-id "your-tournament-uuid-here" \
  --supabase-url "https://your-project.supabase.co" \
  --supabase-key "your-service-role-key"
```

## Finding Your Tournament ID

**Option 1: From Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to Table Editor → `tournaments`
3. Find your tournament and copy the `id` (UUID)

**Option 2: From the Web App**
1. Log into the web application
2. Navigate to `/tournaments`
3. The URL will show the tournament ID

**Option 3: Using SQL Query**
```sql
SELECT id, name, start_date FROM tournaments ORDER BY created_at DESC;
```

## Customizing the Template

Edit `scripts/tournament_checklist_template.csv` to:
- Add your own tasks
- Remove tasks you don't need
- Change priorities
- Add due dates
- Add more detailed descriptions

**Example custom CSV:**
```csv
category,task_name,description,priority,due_date
pre_tournament,Book main field,Reserve Field #1 for both days,high,2025-01-10
pre_tournament,Order water bottles,50 cases for both days,critical,2025-01-12
ceremony,Invite chief guest,Invite local dignitary as chief guest,medium,2025-01-08
```

## Import Results

After running the script, you'll see:
```
📋 Reading checklist items from: checklist.csv

  ✅ Secure tournament venue
  ✅ Obtain required permits
  ✅ Set tournament budget
  ...

🎉 IMPORT COMPLETE!
============================================================
Total Success: 50 items
Total Errors: 0 items
Tournament ID: abc123...
============================================================

✅ Checklist items imported successfully!
```

## Viewing Imported Items

1. Log into the web application
2. Navigate to your tournament: `/tournament/<tournament-id>`
3. Click on the **Planning** tab
4. All imported items will be displayed, grouped by category

## Error Handling

### Common Errors

**Error: CSV file not found**
- Make sure the CSV path is correct
- Use absolute path if relative path doesn't work

**Error: Invalid category**
- Check category spelling (must match exactly)
- Use one of the 9 valid categories

**Error: Missing tournament**
- Verify the tournament ID is correct
- Check that the tournament exists in database

**Error: Permission denied**
- Make sure you're using `service_role` key (not `anon` key)
- Check RLS policies allow tournament management

## Updating Existing Items

The script only **creates new items**. To update existing items:
1. Use the web interface (Planning tab → Edit)
2. Or delete old items first, then re-import

## Multiple Imports

You can run the import script multiple times. Each run will:
- Create new items if they don't exist
- **Not** create duplicates (if CSV has same data)

To avoid duplicates, check existing items in the Planning tab first.

## Next Steps

After importing checklist items:

1. ✅ **Review items** - Check Planning tab
2. ✅ **Assign due dates** - Edit items to add specific dates
3. ✅ **Assign to team members** - Set up assignments
4. ✅ **Start checking off** - Mark items as in progress
5. ✅ **Add custom tasks** - Use "+ Add Task" button
6. ✅ **Track progress** - Use filters to see what's pending

## Troubleshooting

**Problem**: Import says "successful" but no items appear

**Solutions**:
- Check you're looking at the correct tournament
- Refresh the browser page
- Verify you have permissions to view Planning tab
- Check Supabase Dashboard for data in `tournament_checklists` table

**Problem**: Some rows fail to import

**Solutions**:
- Check error messages in console
- Verify CSV format matches requirements
- Ensure all categories are valid
- Check for special characters that might break parsing

**Problem**: Script can't connect to Supabase

**Solutions**:
- Verify your `.env` file is in project root
- Check credentials are correct
- Ensure network connection is active
- Try using explicit `--supabase-url` and `--supabase-key` flags

## Support

For issues or questions:
1. Check migration logs in Supabase Dashboard
2. Verify RLS policies are enabled
3. Review CSV format against template
4. Check console output for detailed error messages

---

**Ready to import?** Use the template and run:

```bash
python scripts/import_checklist_items.py \
  --csv "scripts/tournament_checklist_template.csv" \
  --tournament-id "YOUR-TOURNAMENT-ID"
```

Good luck with your tournament! 🎉





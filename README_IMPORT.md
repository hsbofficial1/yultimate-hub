# 📦 Complete CSV Import Solution

Everything you need to import your tournament data from CSV to Supabase database.

---

## 🎯 What This Does

Automatically imports your `UDAAN 2025` CSV file and creates:
- ✅ Tournament (UDAAN 2025)
- ✅ All Teams from CSV
- ✅ All Players with complete data
- ✅ All certificates, permissions, contact info
- ✅ Handles Hindi/English column names

---

## ⚡ Super Quick Start

### Option 1: One-Click (Easiest!)

1. **Double-click**: `RUN_IMPORT.bat`
2. **Follow prompts**
3. **Done!** 🎉

### Option 2: Command Line

```powershell
# Install packages (first time only)
pip install supabase python-dotenv

# Run import
python scripts\import_tournament_complete.py --csv "C:\Users\busin\Downloads\UDAAN 2025 - Hackathon Reference - Udaan 2025.csv" --supabase-url "YOUR-URL" --supabase-key "YOUR-KEY"
```

---

## 📋 Before You Start

### 1. Have Migrations Run?

✅ **Migration 1**: `20250113000000_tournament_team_enhancements.sql`  
✅ **Migration 2**: `20250114000000_tournament_planning_features.sql`

If not, run them in Supabase SQL Editor first!

### 2. Get Supabase Credentials

1. Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon key**: long string of characters

### 3. Optional: Create .env File

Create `.env` in project root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

Then you don't need to pass credentials every time!

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `scripts/import_tournament_complete.py` | Main import script |
| `RUN_IMPORT.bat` | One-click Windows import |
| `QUICK_START_IMPORT.md` | Quick reference (5 min) |
| `CSV_IMPORT_GUIDE.md` | Detailed guide |
| `README_IMPORT.md` | This file |

---

## 🎮 Usage Examples

### Basic Import
```bash
python scripts\import_tournament_complete.py --csv "path\to\file.csv"
```

### Custom Tournament Name
```bash
python scripts\import_tournament_complete.py --csv "file.csv" --tournament-name "My Tournament"
```

### With Date
```bash
python scripts\import_tournament_complete.py --csv "file.csv" --tournament-date "15/02/2025"
```

### All Options
```bash
python scripts\import_tournament_complete.py `
  --csv "file.csv" `
  --tournament-name "UDAAN 2025" `
  --tournament-date "15/02/2025" `
  --supabase-url "https://xxx.supabase.co" `
  --supabase-key "your-key"
```

---

## 🔍 Verify Your Import

After running, check Supabase Dashboard:

1. **Table Editor** → `tournaments`
   - Should see "UDAAN 2025"

2. **Table Editor** → `teams`
   - Should see all your teams

3. **Table Editor** → `team_players`
   - Should see all players with:
     - ✅ Date of birth
     - ✅ Contact numbers
     - ✅ Parental consent
     - ✅ Media consent
     - ✅ Certificates URLs
     - ✅ Participation days
     - ✅ Community

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "ModuleNotFoundError" | Run: `pip install supabase python-dotenv` |
| "Permission denied" | Run migrations first |
| "No admin user" | Script creates one automatically |
| "Team exists" | Script skips and uses existing |
| "CSV encoding error" | Ensure CSV is UTF-8 |

---

## 📊 What Gets Mapped

| CSV Column | Database Field |
|------------|---------------|
| Player Name (Hindi/English) | `name` |
| Gender (Hindi/English) | `gender` |
| Date of Birth | `date_of_birth` |
| Contact Number | `contact_number` |
| Parents Contact | `parent_contact` |
| Participation Days | `participation_days` |
| Permissions | `parental_consent`, `media_consent` |
| Queries/Comments | `queries_comments` |
| Standard WFDF Cert | `standard_wfdf_certificate_url` |
| Advance WFDF Cert | `advance_wfdf_certificate_url` |
| Community | `community` |
| Team Name | `teams.name` |

---

## 🎯 Next Steps

After import:

1. **Verify Data** in Supabase Dashboard
2. **Update Team Info** (captain emails, real phone numbers)
3. **Verify Players** (`team_players.verified = true`)
4. **Upload Real Certificates** if URLs were placeholders
5. **Create Match Schedule** using tournament planner

---

## 🆘 Need Help?

1. Check `QUICK_START_IMPORT.md` for quick steps
2. Check `CSV_IMPORT_GUIDE.md` for detailed guide
3. Look at error messages - they're helpful!
4. Verify migrations ran successfully

---

## ✅ Success Checklist

- [ ] Migrations 1 & 2 run successfully
- [ ] Supabase credentials ready
- [ ] Python packages installed
- [ ] CSV file accessible
- [ ] Import script runs without errors
- [ ] Data verified in Supabase Dashboard

---

**You're all set! Run the import and you're done!** 🚀



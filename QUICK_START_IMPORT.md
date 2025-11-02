# 🚀 Quick Start: Import CSV to Database

## One Command Import - Everything Automated!

This guide will get your CSV data imported in under 5 minutes.

---

## ✅ Prerequisites (First Time Only)

1. **Install Python 3.7+** (if not installed)
   - Download from: https://www.python.org/downloads/

2. **Install required packages** (run once):
   ```bash
   pip install supabase python-dotenv
   ```

---

## 🔑 Step 1: Get Supabase Credentials

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy these values:
   - **Project URL** (starts with `https://`)
   - **service_role** key (NOT the anon key - this is a secret key that bypasses RLS)
     - Click "Reveal" to show the service_role secret key
     - ⚠️ **Keep this key secure** - never commit it to git!

---

## 🎯 Step 2: Run the Import

Open PowerShell/Terminal in your project folder and run:

### Windows PowerShell:
```powershell
python scripts\import_tournament_complete.py --csv "C:\Users\busin\Downloads\UDAAN 2025 - Hackathon Reference - Udaan 2025.csv"
```

### If prompts for credentials, add them:
```powershell
python scripts\import_tournament_complete.py `
  --csv "C:\Users\busin\Downloads\UDAAN 2025 - Hackathon Reference - Udaan 2025.csv" `
  --supabase-url "https://your-project.supabase.co" `
  --supabase-key "your-service-role-key-here"
```
⚠️ **Important**: Use the **service_role** key (NOT the anon public key)

---

## 📝 What Gets Created Automatically

✅ **Tournament**: "UDAAN 2025" (or custom name)  
✅ **Teams**: All unique teams from CSV  
✅ **Players**: All player registrations with full data  
✅ **Captains**: Temporary captains for each team  
✅ **Admin**: Temporary admin if none exists  

---

## 🎛️ Customization

### Change Tournament Name:
```powershell
python scripts\import_tournament_complete.py --csv "path\to\file.csv" --tournament-name "My Tournament 2025"
```

### Set Tournament Date:
```powershell
python scripts\import_tournament_complete.py --csv "path\to\file.csv" --tournament-date "15/02/2025"
```

### Use Environment Variables (Recommended):
Create a `.env` file in project root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```
⚠️ **Important**: Use the **service_role** key for imports (it bypasses RLS)

Then just run:
```powershell
python scripts\import_tournament_complete.py --csv "path\to\file.csv"
```

---

## 🔍 Verify Import

1. Go to Supabase Dashboard → **Table Editor**
2. Check these tables:
   - ✅ `tournaments` - Your tournament
   - ✅ `teams` - All teams
   - ✅ `team_players` - All players with full data

---

## 🛠️ Troubleshooting

### "ModuleNotFoundError: No module named 'supabase'"
**Fix**: Install packages
```bash
pip install supabase python-dotenv
```

### "Permission denied" or "RLS policy violation"
**Fix**: You must use the **service_role** key (NOT the anon public key) for imports.
1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** secret key
3. Use that key in your import command or .env file

Also ensure migrations ran successfully:
- Migration 1: `20250113000000_tournament_team_enhancements.sql`
- Migration 2: `20250114000000_tournament_planning_features.sql`

### "No admin user found"
**Fix**: The script will create a temporary admin. Or create one manually in Supabase:
```sql
INSERT INTO public.profiles (name, email, role)
VALUES ('Admin', 'admin@ultimate.local', 'admin');
```

### CSV Encoding Errors
**Fix**: The script handles UTF-8. If issues persist, ensure your CSV is UTF-8 encoded.

---

## 📊 Expected Output

```
📊 Found X teams with Y players

============================================================
Processing team: Team Name 1
============================================================
  Created team: Team Name 1
    ✅ Player Name 1 (male)
    ✅ Player Name 2 (female)
    ✅ Player Name 3 (male)

  Team Summary: 10 successful, 0 errors

============================================================
Processing team: Team Name 2
============================================================
  ...

============================================================
🎉 IMPORT COMPLETE!
============================================================
Total Success: 150 players
Total Errors: 0 players
Tournament ID: abc-123-def-456

✅ Check your Supabase dashboard to verify the data!
```

---

## 🎉 Next Steps After Import

1. **Verify Data**: Check a few records in Supabase
2. **Update Team Info**: Add real emails/phones for team captains
3. **Verify Players**: Mark verified players in `team_players.verified = true`
4. **Upload Certificates**: If certificates were URLs, verify they're accessible
5. **Schedule Matches**: Use the tournament planner to create match schedule

---

## 🆘 Need Help?

1. Check error messages - they're usually specific
2. Verify Supabase credentials are correct
3. Ensure migrations ran successfully
4. Check CSV file path is correct

---

## 📁 File Reference

- **Import Script**: `scripts/import_tournament_complete.py`
- **CSV File**: `UDAAN 2025 - Hackathon Reference - Udaan 2025.csv`
- **Detailed Guide**: `CSV_IMPORT_GUIDE.md`

---

**That's it! Your data is now in the database.** 🎊


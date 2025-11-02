# 🚀 Quick Fix for CSV Import

## ⚠️ IMPORTANT: You Need a User First!

The import needs at least one user in your database. Here's how to fix it:

---

## ✅ Step 1: Create a User (Required!)

**Option A: If you already have a web app account**
- Just log into your app once to create your profile
- Then the import will work!

**Option B: Create admin via SQL**
Run this in Supabase SQL Editor:

```sql
-- Check if you have any users
SELECT COUNT(*) as user_count FROM public.profiles;

-- If 0 users, you need to create one manually through your app
-- Or use this helper script (see Option C)
```

**Option C: Use Auth UI**
1. Go to your website
2. Sign up for an account
3. Done! Your profile is created

---

## 🎯 Step 2: Run Import

After you have at least ONE user, run:

```powershell
python scripts\import_tournament_complete.py --csv "C:\Users\busin\Downloads\UDAAN 2025 - Hackathon Reference - Udaan 2025.csv" --supabase-url "YOUR-URL" --supabase-key "YOUR-KEY"
```

That's it! The script will now work.

---

## 💡 Why This Happened

Your database uses `user_roles` table instead of `profiles.role` column. The script has been fixed to work with your schema, but it needs at least one user profile to exist.

---

## 🆘 Still Having Issues?

1. **Check you have a user**: 
   ```sql
   SELECT * FROM public.profiles LIMIT 1;
   ```

2. **If empty, create one** through your app or run this:
   ```sql
   -- This creates a temp admin (you'll need to update it)
   INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
   VALUES ('temp@admin.local', crypt('changeme', gen_salt('bf')), NOW(), '{}'::jsonb)
   RETURNING id;
   ```

3. **Then create profile** (use the ID from above):
   ```sql
   INSERT INTO public.profiles (id, email, name)
   VALUES ('076b281d-5da3-4be4-881a-0625bfaba8db', 'pm@yultimate.com', 'Admin');
   
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('USER_ID_FROM_ABOVE', 'admin'::user_role);
   ```

---

**Try the import again!** 🚀



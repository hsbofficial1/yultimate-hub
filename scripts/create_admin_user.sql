-- Quick script to create an admin user for imports
-- Run this in Supabase SQL Editor BEFORE running the import script

-- Create admin user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@tournament.local',
  crypt('temp_password_change_me', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Tournament Admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
RETURNING id;

-- Note: Copy the returned ID and use it below

-- Then create profile for this user (replace USER_ID with the ID from above)
-- Uncomment and run these after getting the user ID:

/*
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@tournament.local' LIMIT 1
)
INSERT INTO public.profiles (id, email, name)
SELECT id, 'admin@tournament.local', 'Tournament Admin'
FROM new_user;
*/

/*
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@tournament.local' LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM new_user;
*/

-- OR use this simpler approach if you already have at least one user:

-- Check if you have any users
SELECT COUNT(*) as user_count FROM public.profiles;

-- If you have users, just run the import - it will use the first available user




-- Add captain_name and previous_experience fields to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS captain_name TEXT,
ADD COLUMN IF NOT EXISTS previous_experience TEXT;

-- Update the status check constraint to include 'registered'
ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_status_check;

ALTER TABLE public.teams 
ADD CONSTRAINT teams_status_check 
CHECK (status IN ('pending', 'approved', 'registered', 'rejected'));

-- Create a trigger to send email confirmation on team registration
CREATE OR REPLACE FUNCTION public.send_team_registration_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TODO: Implement actual email sending logic using Supabase Edge Functions or external service
  -- For now, this is a placeholder that logs the registration
  RAISE NOTICE 'Team registration email would be sent to: %', NEW.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_registered
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.send_team_registration_email();

-- Add a unique constraint to prevent duplicate team names per tournament
CREATE UNIQUE INDEX IF NOT EXISTS unique_team_name_per_tournament 
ON public.teams (tournament_id, LOWER(TRIM(name)));

-- Add age limits constraint to team_players (already exists in schema but ensure it)
ALTER TABLE public.team_players 
ADD CONSTRAINT check_player_age 
CHECK (age >= 10 AND age <= 100);

-- Create storage bucket for team assets (logos, documents, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-assets',
  'team-assets',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can view public team assets
CREATE POLICY "Anyone can view team assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-assets');

-- Storage policy: Authenticated users can upload team assets
CREATE POLICY "Authenticated users can upload team assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-assets' 
  AND auth.role() = 'authenticated'
);

-- Storage policy: Users can update their own team assets
CREATE POLICY "Users can update own team assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);


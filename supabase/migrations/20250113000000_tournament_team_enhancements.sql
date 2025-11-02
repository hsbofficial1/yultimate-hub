    -- Tournament Team Registration Enhancements
    -- Based on UDAAN 2025 Hackathon Reference data structure
    -- Adds comprehensive fields for player registration, certifications, and permissions

    -- =============================================================================
    -- PART 1: Add missing fields to team_players table for comprehensive registration
    -- =============================================================================

    -- Add date_of_birth field (CSV has DOB)
    ALTER TABLE public.team_players 
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS contact_number TEXT,
    ADD COLUMN IF NOT EXISTS parent_contact TEXT,
    ADD COLUMN IF NOT EXISTS participation_days TEXT CHECK (participation_days IN ('both_days', 'day_1', 'day_2')),
    ADD COLUMN IF NOT EXISTS parental_consent BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS media_consent BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS queries_comments TEXT,
    ADD COLUMN IF NOT EXISTS standard_wfdf_certificate_url TEXT,
    ADD COLUMN IF NOT EXISTS advance_wfdf_certificate_url TEXT,
    ADD COLUMN IF NOT EXISTS community TEXT,
    ADD COLUMN IF NOT EXISTS registration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT;

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_team_players_date_of_birth ON public.team_players(date_of_birth);
    CREATE INDEX IF NOT EXISTS idx_team_players_community ON public.team_players(community);
    CREATE INDEX IF NOT EXISTS idx_team_players_participation ON public.team_players(participation_days);

    -- Add constraint to ensure date_of_birth is not in the future
    ALTER TABLE public.team_players 
    ADD CONSTRAINT check_date_of_birth 
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE);

    -- =============================================================================
    -- PART 2: Add community field to teams table
    -- =============================================================================

    ALTER TABLE public.teams 
    ADD COLUMN IF NOT EXISTS community TEXT;

    -- Create index for community lookups
    CREATE INDEX IF NOT EXISTS idx_teams_community ON public.teams(community);

    -- =============================================================================
    -- PART 3: Create home_visits table (referenced in components but missing)
    -- =============================================================================

    CREATE TABLE IF NOT EXISTS public.home_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    duration_minutes INTEGER,
    purpose TEXT NOT NULL CHECK (purpose IN ('initial_visit', 'follow_up', 'parent_meeting', 'welfare_check', 'other')),
    observations TEXT,
    notes TEXT,
    action_items TEXT,
    visited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Create home_visit_photos table
    CREATE TABLE IF NOT EXISTS public.home_visit_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.home_visits(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Create indexes for home_visits
    CREATE INDEX IF NOT EXISTS idx_home_visits_child_id ON public.home_visits(child_id);
    CREATE INDEX IF NOT EXISTS idx_home_visits_visit_date ON public.home_visits(visit_date DESC);
    CREATE INDEX IF NOT EXISTS idx_home_visits_visited_by ON public.home_visits(visited_by);
    CREATE INDEX IF NOT EXISTS idx_home_visit_photos_visit_id ON public.home_visit_photos(visit_id);

-- Enable RLS for home_visits
ALTER TABLE public.home_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_visit_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for home_visits
DROP POLICY IF EXISTS "Coaches and managers can view home visits" ON public.home_visits;
DROP POLICY IF EXISTS "Coaches and managers can manage home visits" ON public.home_visits;
DROP POLICY IF EXISTS "Coaches and managers can view visit photos" ON public.home_visit_photos;
DROP POLICY IF EXISTS "Coaches and managers can manage visit photos" ON public.home_visit_photos;

CREATE POLICY "Coaches and managers can view home visits"
  ON public.home_visits FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage home visits"
  ON public.home_visits FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- RLS Policies for home_visit_photos
CREATE POLICY "Coaches and managers can view visit photos"
  ON public.home_visit_photos FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage visit photos"
  ON public.home_visit_photos FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

    -- =============================================================================
    -- PART 4: Update RLS policies for tournament/team system
    -- =============================================================================

    -- Update team_players RLS policies to be more comprehensive
    DROP POLICY IF EXISTS "Anyone can view players of approved teams" ON public.team_players;
    DROP POLICY IF EXISTS "Captains can manage their team players" ON public.team_players;

    -- New comprehensive policies for team_players
    CREATE POLICY "Anyone can view players of approved teams"
    ON public.team_players FOR SELECT
    USING (
        EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = team_id AND status = 'approved'
        )
    );

    CREATE POLICY "Captains can manage their team players"
    ON public.team_players FOR ALL
    USING (
        EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = team_id AND captain_id = auth.uid()
        )
    );

    CREATE POLICY "Tournament directors and admins can manage all team players"
    ON public.team_players FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    );

    -- Update teams RLS policies
    DROP POLICY IF EXISTS "Anyone can view approved teams" ON public.teams;
    DROP POLICY IF EXISTS "Captains can register teams" ON public.teams;
    DROP POLICY IF EXISTS "Captains can update their teams" ON public.teams;
    DROP POLICY IF EXISTS "Directors can manage all teams" ON public.teams;

    -- New comprehensive policies for teams
    CREATE POLICY "Anyone can view approved teams"
    ON public.teams FOR SELECT
    USING (status = 'approved' OR captain_id = auth.uid());

    CREATE POLICY "Captains can register teams"
    ON public.teams FOR INSERT
    WITH CHECK (auth.uid() = captain_id);

    CREATE POLICY "Captains can update their teams"
    ON public.teams FOR UPDATE
    USING (auth.uid() = captain_id AND status = 'pending');

    CREATE POLICY "Tournament directors and admins can manage all teams"
    ON public.teams FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    );

    -- =============================================================================
    -- PART 5: Create helper views and functions
    -- =============================================================================

    -- View for team registration summary
    CREATE OR REPLACE VIEW public.team_registration_summary AS
    SELECT 
    t.id as team_id,
    t.name as team_name,
    t.community,
    t.status,
    t.tournament_id,
    t.created_at,
    COUNT(DISTINCT tp.id) as player_count,
    COUNT(DISTINCT CASE WHEN tp.participation_days = 'both_days' THEN tp.id END) as both_days_count,
    COUNT(DISTINCT CASE WHEN tp.participation_days = 'day_1' THEN tp.id END) as day_1_count,
    COUNT(DISTINCT CASE WHEN tp.participation_days = 'day_2' THEN tp.id END) as day_2_count,
    COUNT(DISTINCT CASE WHEN tp.verified = true THEN tp.id END) as verified_count,
    COUNT(DISTINCT CASE WHEN tp.parental_consent = true THEN tp.id END) as parental_consent_count,
    COUNT(DISTINCT CASE WHEN tp.media_consent = true THEN tp.id END) as media_consent_count
    FROM public.teams t
    LEFT JOIN public.team_players tp ON tp.team_id = t.id
    GROUP BY t.id, t.name, t.community, t.status, t.tournament_id, t.created_at;

    -- Grant access to the view
    GRANT SELECT ON public.team_registration_summary TO authenticated;

    -- View for player verification status
    CREATE OR REPLACE VIEW public.player_verification_status AS
    SELECT 
    tp.id,
    tp.name,
    tp.age,
    tp.gender,
    tp.community,
    tp.parental_consent,
    tp.media_consent,
    tp.verified,
    tp.verification_notes,
    t.name as team_name,
    t.status as team_status,
    tt.name as tournament_name,
    CASE 
        WHEN tp.verified = false THEN 'pending'
        WHEN tp.parental_consent = false THEN 'consent_missing'
        WHEN tp.standard_wfdf_certificate_url IS NULL AND tp.advance_wfdf_certificate_url IS NULL THEN 'certificate_missing'
        ELSE 'complete'
    END as verification_status
    FROM public.team_players tp
    INNER JOIN public.teams t ON t.id = tp.team_id
    INNER JOIN public.tournaments tt ON tt.id = t.tournament_id;

    -- Grant access to the view
    GRANT SELECT ON public.player_verification_status TO authenticated;

    -- Function to calculate player age from date of birth
    CREATE OR REPLACE FUNCTION public.calculate_player_age(player_dob DATE)
    RETURNS INTEGER
    LANGUAGE SQL
    IMMUTABLE
    AS $$
    SELECT EXTRACT(YEAR FROM AGE(player_dob))::INTEGER;
    $$;

    -- Function to update player age from date of birth
    CREATE OR REPLACE FUNCTION public.update_player_age_from_dob()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age := public.calculate_player_age(NEW.date_of_birth);
    END IF;
    RETURN NEW;
    END;
    $$;

    -- Trigger to auto-update age when DOB is set
    DROP TRIGGER IF EXISTS update_age_from_dob ON public.team_players;
    CREATE TRIGGER update_age_from_dob
    BEFORE INSERT OR UPDATE ON public.team_players
    FOR EACH ROW
    EXECUTE FUNCTION public.update_player_age_from_dob();

    -- =============================================================================
    -- PART 6: Create community analytics views
    -- =============================================================================

-- View for community participation statistics
CREATE OR REPLACE VIEW public.community_participation_stats AS
SELECT 
  COALESCE(t.community, tp.community) as community,
  COUNT(DISTINCT t.id) as total_teams,
  COUNT(DISTINCT tp.id) as total_players,
  COUNT(DISTINCT CASE WHEN tp.gender = 'male' THEN tp.id END) as male_players,
  COUNT(DISTINCT CASE WHEN tp.gender = 'female' THEN tp.id END) as female_players,
  COUNT(DISTINCT CASE WHEN tp.gender = 'other' THEN tp.id END) as other_players,
  ROUND(AVG(tp.age), 1) as avg_age,
  COUNT(DISTINCT CASE WHEN tp.participation_days = 'both_days' THEN tp.id END) as both_days_participants,
  COUNT(DISTINCT CASE WHEN tp.parental_consent = true THEN tp.id END) as parental_consent_count,
  COUNT(DISTINCT CASE WHEN tp.media_consent = true THEN tp.id END) as media_consent_count
FROM public.teams t
LEFT JOIN public.team_players tp ON tp.team_id = t.id
WHERE t.status IN ('approved', 'pending', 'registered')
GROUP BY COALESCE(t.community, tp.community)
ORDER BY total_players DESC;

    -- Grant access to the view
    GRANT SELECT ON public.community_participation_stats TO authenticated;

    -- =============================================================================
    -- PART 7: Add storage bucket for player documents and certificates
    -- =============================================================================

    -- Create storage bucket for player documents (certificates, etc.)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
    'player-documents',
    'player-documents',
    false,  -- Private bucket for security
    10485760,  -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO NOTHING;

    -- Storage policy: Tournament directors and admins can view player documents
    CREATE POLICY "Tournament personnel can view player documents"
    ON storage.objects FOR SELECT
    USING (
    bucket_id = 'player-documents' 
    AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    )
    );

    -- Storage policy: Authenticated users can upload their own documents
    CREATE POLICY "Users can upload player documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
    bucket_id = 'player-documents' 
    AND auth.role() = 'authenticated'
    );

    -- Storage policy: Tournament directors and admins can delete player documents
    CREATE POLICY "Tournament personnel can delete player documents"
    ON storage.objects FOR DELETE
    USING (
    bucket_id = 'player-documents' 
    AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    )
    );

    -- =============================================================================
    -- PART 8: Create function to assist with CSV import
    -- =============================================================================

    -- Function to import player data from CSV
    CREATE OR REPLACE FUNCTION public.import_player_data(
    _team_id UUID,
    _player_name TEXT,
    _gender TEXT,
    _dob DATE DEFAULT NULL,
    _contact_number TEXT DEFAULT NULL,
    _parent_contact TEXT DEFAULT NULL,
    _participation_days TEXT DEFAULT NULL,
    _parental_consent BOOLEAN DEFAULT false,
    _media_consent BOOLEAN DEFAULT false,
    _queries_comments TEXT DEFAULT NULL,
    _standard_cert_url TEXT DEFAULT NULL,
    _advance_cert_url TEXT DEFAULT NULL,
    _community TEXT DEFAULT NULL,
    _registration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
    _player_id UUID;
    _calculated_age INTEGER;
    BEGIN
    -- Calculate age if DOB provided
    IF _dob IS NOT NULL THEN
        _calculated_age := public.calculate_player_age(_dob);
    ELSE
        -- Default age based on gender if DOB not provided
        _calculated_age := 20;
    END IF;

    -- Insert player data
    INSERT INTO public.team_players (
        team_id,
        name,
        age,
        gender,
        email, -- Generate a temporary email if not provided
        date_of_birth,
        contact_number,
        parent_contact,
        participation_days,
        parental_consent,
        media_consent,
        queries_comments,
        standard_wfdf_certificate_url,
        advance_wfdf_certificate_url,
        community,
        registration_timestamp,
        verified
    ) VALUES (
        _team_id,
        _player_name,
        _calculated_age,
        _gender,
        LOWER(REPLACE(_player_name, ' ', '_')) || '@temp.ultimate.local',
        _dob,
        _contact_number,
        _parent_contact,
        _participation_days,
        _parental_consent,
        _media_consent,
        _queries_comments,
        _standard_cert_url,
        _advance_cert_url,
        _community,
        _registration_timestamp,
        false
    )
    RETURNING id INTO _player_id;

    RETURN _player_id;
    END;
    $$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.import_player_data TO authenticated;

    -- =============================================================================
    -- PART 9: Comments for documentation
    -- =============================================================================

    COMMENT ON TABLE public.team_players IS 'Comprehensive player registration data including certificates, permissions, and contact information';
    COMMENT ON COLUMN public.team_players.date_of_birth IS 'Player date of birth - used to calculate age automatically';
    COMMENT ON COLUMN public.team_players.participation_days IS 'Which days player will participate: both_days, day_1, or day_2';
    COMMENT ON COLUMN public.team_players.parental_consent IS 'Parent/guardian consent for participation';
    COMMENT ON COLUMN public.team_players.media_consent IS 'Consent for media/photos to be used for promotional purposes';
    COMMENT ON COLUMN public.team_players.standard_wfdf_certificate_url IS 'Standard WFDF accreditation certificate URL';
    COMMENT ON COLUMN public.team_players.advance_wfdf_certificate_url IS 'Advanced WFDF accreditation certificate URL';
    COMMENT ON COLUMN public.team_players.community IS 'Community/neighborhood the player represents';
    COMMENT ON COLUMN public.team_players.verified IS 'Whether player registration has been verified by tournament staff';

    COMMENT ON TABLE public.home_visits IS 'Home visits for coaching/program management purposes';
    COMMENT ON TABLE public.home_visit_photos IS 'Photos captured during home visits';


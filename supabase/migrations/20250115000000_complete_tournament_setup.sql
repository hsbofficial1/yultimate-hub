-- Complete Tournament System Migration
-- This migration creates all tournament-related tables and features
-- Safe to run multiple times (uses IF NOT EXISTS)

-- =============================================================================
-- PART 1: User Roles and Profiles (if not exists)
-- =============================================================================

-- Create user roles enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'admin',
            'tournament_director',
            'team_captain',
            'player',
            'coach',
            'program_manager',
            'volunteer'
        );
    END IF;
END$$;

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into profiles
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User')
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Insert role into user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
    ) ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- PART 2: Core Tournament Tables (if not exists)
-- =============================================================================

-- Tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location TEXT NOT NULL,
    max_teams INTEGER NOT NULL DEFAULT 16,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'in_progress', 'completed')),
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published tournaments" ON public.tournaments;
CREATE POLICY "Anyone can view published tournaments"
    ON public.tournaments FOR SELECT
    USING (status != 'draft' OR created_by = auth.uid());

DROP POLICY IF EXISTS "Directors and admins can manage tournaments" ON public.tournaments;
CREATE POLICY "Directors and admins can manage tournaments"
    ON public.tournaments FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    );

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    captain_id UUID REFERENCES public.profiles(id) NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(tournament_id, name)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved teams" ON public.teams;
CREATE POLICY "Anyone can view approved teams"
    ON public.teams FOR SELECT
    USING (status = 'approved' OR captain_id = auth.uid());

DROP POLICY IF EXISTS "Captains can register teams" ON public.teams;
CREATE POLICY "Captains can register teams"
    ON public.teams FOR INSERT
    WITH CHECK (auth.uid() = captain_id);

DROP POLICY IF EXISTS "Captains can update their teams" ON public.teams;
CREATE POLICY "Captains can update their teams"
    ON public.teams FOR UPDATE
    USING (auth.uid() = captain_id AND status = 'pending');

DROP POLICY IF EXISTS "Tournament directors and admins can manage all teams" ON public.teams;
CREATE POLICY "Tournament directors and admins can manage all teams"
    ON public.teams FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    );

-- Team Players table
CREATE TABLE IF NOT EXISTS public.team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 120),
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view players of approved teams" ON public.team_players;
CREATE POLICY "Anyone can view players of approved teams"
    ON public.team_players FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = team_id AND status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Captains can manage their team players" ON public.team_players;
CREATE POLICY "Captains can manage their team players"
    ON public.team_players FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = team_id AND captain_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tournament directors and admins can manage all team players" ON public.team_players;
CREATE POLICY "Tournament directors and admins can manage all team players"
    ON public.team_players FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director')
    );

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    team_a_id UUID REFERENCES public.teams(id) NOT NULL,
    team_b_id UUID REFERENCES public.teams(id) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    field TEXT,
    team_a_score INTEGER DEFAULT 0,
    team_b_score INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches"
    ON public.matches FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Directors and volunteers can manage matches" ON public.matches;
CREATE POLICY "Directors and volunteers can manage matches"
    ON public.matches FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director') OR
        public.has_role(auth.uid(), 'volunteer')
    );

-- Spirit Scores table
CREATE TABLE IF NOT EXISTS public.spirit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    from_team_id UUID REFERENCES public.teams(id) NOT NULL,
    to_team_id UUID REFERENCES public.teams(id) NOT NULL,
    rules INTEGER NOT NULL CHECK (rules >= 0 AND rules <= 4),
    fouls INTEGER NOT NULL CHECK (fouls >= 0 AND fouls <= 4),
    fairness INTEGER NOT NULL CHECK (fairness >= 0 AND fairness <= 4),
    attitude INTEGER NOT NULL CHECK (attitude >= 0 AND attitude <= 4),
    communication INTEGER NOT NULL CHECK (communication >= 0 AND communication <= 4),
    total INTEGER GENERATED ALWAYS AS (rules + fouls + fairness + attitude + communication) STORED,
    comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(match_id, from_team_id)
);

ALTER TABLE public.spirit_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view spirit scores" ON public.spirit_scores;
CREATE POLICY "Anyone can view spirit scores"
    ON public.spirit_scores FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Team captains can submit spirit scores" ON public.spirit_scores;
CREATE POLICY "Team captains can submit spirit scores"
    ON public.spirit_scores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams
            WHERE id = from_team_id AND captain_id = auth.uid()
        )
    );

-- =============================================================================
-- PART 3: Tournament Planning Features (if not exists)
-- =============================================================================

-- Tournament Checklists
CREATE TABLE IF NOT EXISTS public.tournament_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'pre_registration', 'registration', 'pre_tournament', 'during_tournament',
        'post_tournament', 'ceremony', 'logistics', 'rules', 'seeding'
    )),
    task_name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID REFERENCES public.profiles(id),
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournament_checklists_tournament_id ON public.tournament_checklists(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_checklists_category ON public.tournament_checklists(category);

ALTER TABLE public.tournament_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament personnel can view checklists" ON public.tournament_checklists;
CREATE POLICY "Tournament personnel can view checklists"
    ON public.tournament_checklists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

DROP POLICY IF EXISTS "Tournament personnel can manage checklists" ON public.tournament_checklists;
CREATE POLICY "Tournament personnel can manage checklists"
    ON public.tournament_checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Ceremony Events
CREATE TABLE IF NOT EXISTS public.ceremony_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('closing_ceremony', 'opening_ceremony', 'awards_ceremony', 'special_event')),
    scheduled_date DATE,
    scheduled_time TIME,
    location TEXT,
    duration_minutes INTEGER,
    description TEXT,
    organizer_notes TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ceremony_events_tournament_id ON public.ceremony_events(tournament_id);

ALTER TABLE public.ceremony_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament personnel can view ceremonies" ON public.ceremony_events;
CREATE POLICY "Tournament personnel can view ceremonies"
    ON public.ceremony_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

DROP POLICY IF EXISTS "Tournament personnel can manage ceremonies" ON public.ceremony_events;
CREATE POLICY "Tournament personnel can manage ceremonies"
    ON public.ceremony_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Ceremony Speakers
CREATE TABLE IF NOT EXISTS public.ceremony_speakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ceremony_id UUID NOT NULL REFERENCES public.ceremony_events(id) ON DELETE CASCADE,
    speaker_name TEXT NOT NULL,
    speaker_title TEXT,
    speaker_role TEXT,
    speech_topic TEXT,
    allocated_minutes INTEGER,
    speaking_order INTEGER,
    notes TEXT,
    confirmed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ceremony_speakers_ceremony_id ON public.ceremony_speakers(ceremony_id);

ALTER TABLE public.ceremony_speakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament personnel can view speakers" ON public.ceremony_speakers;
CREATE POLICY "Tournament personnel can view speakers"
    ON public.ceremony_speakers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ceremony_events ce
            INNER JOIN public.tournaments t ON t.id = ce.tournament_id
            WHERE ce.id = ceremony_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

DROP POLICY IF EXISTS "Tournament personnel can manage speakers" ON public.ceremony_speakers;
CREATE POLICY "Tournament personnel can manage speakers"
    ON public.ceremony_speakers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.ceremony_events ce
            INNER JOIN public.tournaments t ON t.id = ce.tournament_id
            WHERE ce.id = ceremony_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Ceremony Awards
CREATE TABLE IF NOT EXISTS public.ceremony_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ceremony_id UUID NOT NULL REFERENCES public.ceremony_events(id) ON DELETE CASCADE,
    award_category TEXT NOT NULL,
    award_description TEXT,
    recipient_type TEXT CHECK (recipient_type IN ('individual', 'team', 'both')),
    recipient_id UUID,
    recipient_name TEXT,
    presentor_name TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ceremony_awards_ceremony_id ON public.ceremony_awards(ceremony_id);

ALTER TABLE public.ceremony_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament personnel can view awards" ON public.ceremony_awards;
CREATE POLICY "Tournament personnel can view awards"
    ON public.ceremony_awards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ceremony_events ce
            INNER JOIN public.tournaments t ON t.id = ce.tournament_id
            WHERE ce.id = ceremony_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

DROP POLICY IF EXISTS "Tournament personnel can manage awards" ON public.ceremony_awards;
CREATE POLICY "Tournament personnel can manage awards"
    ON public.ceremony_awards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.ceremony_events ce
            INNER JOIN public.tournaments t ON t.id = ce.tournament_id
            WHERE ce.id = ceremony_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Tournament Pools
CREATE TABLE IF NOT EXISTS public.tournament_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    pool_name TEXT NOT NULL,
    pool_type TEXT NOT NULL CHECK (pool_type IN ('pool_a', 'pool_b', 'pool_c', 'pool_d', 'final', 'semifinal', 'quarterfinal')),
    round_number INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
    seed_order JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournament_pools_tournament_id ON public.tournament_pools(tournament_id);

ALTER TABLE public.tournament_pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published pools" ON public.tournament_pools;
CREATE POLICY "Anyone can view published pools"
    ON public.tournament_pools FOR SELECT
    USING (status = 'published' OR EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
        AND (
            t.created_by = auth.uid() OR
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'tournament_director')
        )
    ));

DROP POLICY IF EXISTS "Tournament personnel can manage pools" ON public.tournament_pools;
CREATE POLICY "Tournament personnel can manage pools"
    ON public.tournament_pools FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Team Pool Assignments
CREATE TABLE IF NOT EXISTS public.team_pool_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.tournament_pools(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    seed_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(pool_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_pool_assignments_pool_id ON public.team_pool_assignments(pool_id);
CREATE INDEX IF NOT EXISTS idx_team_pool_assignments_team_id ON public.team_pool_assignments(team_id);

ALTER TABLE public.team_pool_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view pool assignments" ON public.team_pool_assignments;
CREATE POLICY "Anyone can view pool assignments"
    ON public.team_pool_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournament_pools tp
            WHERE tp.id = pool_id
            AND (tp.status = 'published' OR EXISTS (
                SELECT 1 FROM public.tournaments t
                WHERE t.id = tp.tournament_id
                AND (
                    t.created_by = auth.uid() OR
                    public.has_role(auth.uid(), 'admin') OR
                    public.has_role(auth.uid(), 'tournament_director')
                )
            ))
        )
    );

DROP POLICY IF EXISTS "Tournament personnel can manage pool assignments" ON public.team_pool_assignments;
CREATE POLICY "Tournament personnel can manage pool assignments"
    ON public.team_pool_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournament_pools tp
            INNER JOIN public.tournaments t ON t.id = tp.tournament_id
            WHERE tp.id = pool_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Tournament Rules
CREATE TABLE IF NOT EXISTS public.tournament_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    rule_category TEXT NOT NULL CHECK (rule_category IN (
        'general', 'eligibility', 'field_of_play', 'equipment', 'match_rules',
        'spirit_of_the_game', 'player_conduct', 'penalties', 'appeals', 'other'
    )),
    rule_title TEXT NOT NULL,
    rule_content TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    applies_to TEXT CHECK (applies_to IN ('all', 'players', 'teams', 'officials')),
    published BOOLEAN DEFAULT false NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournament_rules_tournament_id ON public.tournament_rules(tournament_id);

ALTER TABLE public.tournament_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published rules" ON public.tournament_rules;
CREATE POLICY "Anyone can view published rules"
    ON public.tournament_rules FOR SELECT
    USING (published = true OR EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
        AND (
            t.created_by = auth.uid() OR
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'tournament_director')
        )
    ));

DROP POLICY IF EXISTS "Tournament personnel can manage rules" ON public.tournament_rules;
CREATE POLICY "Tournament personnel can manage rules"
    ON public.tournament_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_id
            AND (
                t.created_by = auth.uid() OR
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'tournament_director')
            )
        )
    );

-- Rule Acknowledgments
CREATE TABLE IF NOT EXISTS public.rule_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.tournament_rules(id) ON DELETE CASCADE,
    acknowledged_by UUID NOT NULL REFERENCES public.profiles(id),
    team_id UUID REFERENCES public.teams(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(rule_id, acknowledged_by, team_id)
);

CREATE INDEX IF NOT EXISTS idx_rule_acknowledgments_rule_id ON public.rule_acknowledgments(rule_id);

ALTER TABLE public.rule_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own acknowledgments" ON public.rule_acknowledgments;
CREATE POLICY "Users can view their own acknowledgments"
    ON public.rule_acknowledgments FOR SELECT
    USING (auth.uid() = acknowledged_by OR EXISTS (
        SELECT 1 FROM public.tournament_rules tr
        INNER JOIN public.tournaments t ON t.id = tr.tournament_id
        WHERE tr.id = rule_id
        AND (
            t.created_by = auth.uid() OR
            public.has_role(auth.uid(), 'admin') OR
            public.has_role(auth.uid(), 'tournament_director')
        )
    ));

DROP POLICY IF EXISTS "Users can acknowledge rules" ON public.rule_acknowledgments;
CREATE POLICY "Users can acknowledge rules"
    ON public.rule_acknowledgments FOR INSERT
    WITH CHECK (auth.uid() = acknowledged_by);

-- =============================================================================
-- PART 4: Helper Functions and Triggers
-- =============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tournament_checklists_updated_at ON public.tournament_checklists;
CREATE TRIGGER update_tournament_checklists_updated_at
    BEFORE UPDATE ON public.tournament_checklists
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ceremony_events_updated_at ON public.ceremony_events;
CREATE TRIGGER update_ceremony_events_updated_at
    BEFORE UPDATE ON public.ceremony_events
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_pools_updated_at ON public.tournament_pools;
CREATE TRIGGER update_tournament_pools_updated_at
    BEFORE UPDATE ON public.tournament_pools
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_rules_updated_at ON public.tournament_rules;
CREATE TRIGGER update_tournament_rules_updated_at
    BEFORE UPDATE ON public.tournament_rules
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at_column();

-- Get user roles function
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_roles TO authenticated;

-- =============================================================================
-- PART 5: Add missing fields to existing tables
-- =============================================================================

-- Add tournament format fields
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tournament_format TEXT CHECK (tournament_format IN ('pool_play', 'bracket', 'round_robin', 'hybrid')),
ADD COLUMN IF NOT EXISTS match_duration_minutes INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS time_cap_minutes INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS halftime_duration_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS game_to_score INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS schedule_url TEXT,
ADD COLUMN IF NOT EXISTS schedule_pdf_url TEXT;

-- Add pool information to matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS pool TEXT,
ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS bracket_position INTEGER,
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS day_number INTEGER,
ADD COLUMN IF NOT EXISTS schedule_date DATE;

CREATE INDEX IF NOT EXISTS idx_matches_tournament_time ON public.matches(tournament_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_matches_pool ON public.matches(pool);
CREATE INDEX IF NOT EXISTS idx_matches_round ON public.matches(round);

-- Add fields to team_players
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

-- Add constraint to ensure date_of_birth is not in the future
ALTER TABLE public.team_players 
DROP CONSTRAINT IF EXISTS check_date_of_birth;
ALTER TABLE public.team_players 
ADD CONSTRAINT check_date_of_birth 
CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE);

CREATE INDEX IF NOT EXISTS idx_team_players_date_of_birth ON public.team_players(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_team_players_community ON public.team_players(community);

-- Add community field to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS community TEXT;

CREATE INDEX IF NOT EXISTS idx_teams_community ON public.teams(community);

-- =============================================================================
-- SUCCESS!
-- =============================================================================

COMMENT ON TABLE public.tournament_checklists IS 'Tournament planning checklist items with task management';
COMMENT ON TABLE public.ceremony_events IS 'Opening/closing ceremony and special event planning';
COMMENT ON TABLE public.ceremony_speakers IS 'Speaker lineup for ceremonies';
COMMENT ON TABLE public.ceremony_awards IS 'Awards to be presented during ceremonies';
COMMENT ON TABLE public.tournament_pools IS 'Tournament pools/brackets for competition structure';
COMMENT ON TABLE public.team_pool_assignments IS 'Team assignments to pools with seeding';
COMMENT ON TABLE public.tournament_rules IS 'Tournament rules and regulations by category';

-- Migration complete!



-- Tournament Planning & Management Features
-- Comprehensive tournament planning system with checklists, ceremony management,
-- seeding pools, rules, commentary sheets, and schedule management

-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 1: Tournament Planning Checklist
-- =============================================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_checklists_tournament_id ON public.tournament_checklists(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_checklists_category ON public.tournament_checklists(category);
CREATE INDEX IF NOT EXISTS idx_tournament_checklists_status ON public.tournament_checklists(status);
CREATE INDEX IF NOT EXISTS idx_tournament_checklists_assigned_to ON public.tournament_checklists(assigned_to);

-- Enable RLS
ALTER TABLE public.tournament_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament checklists
DROP POLICY IF EXISTS "Tournament personnel can view checklists" ON public.tournament_checklists;
DROP POLICY IF EXISTS "Tournament personnel can manage checklists" ON public.tournament_checklists;
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

-- =============================================================================
-- PART 2: Closing Ceremony Planning
-- =============================================================================

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

CREATE TABLE IF NOT EXISTS public.ceremony_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id UUID NOT NULL REFERENCES public.ceremony_events(id) ON DELETE CASCADE,
  award_category TEXT NOT NULL,
  award_description TEXT,
  recipient_type TEXT CHECK (recipient_type IN ('individual', 'team', 'both')),
  recipient_id UUID, -- Can be team_id or profile_id
  recipient_name TEXT,
  presentor_name TEXT,
  awarded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ceremony_events_tournament_id ON public.ceremony_events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ceremony_events_type ON public.ceremony_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ceremony_speakers_ceremony_id ON public.ceremony_speakers(ceremony_id);
CREATE INDEX IF NOT EXISTS idx_ceremony_awards_ceremony_id ON public.ceremony_awards(ceremony_id);

-- Enable RLS
ALTER TABLE public.ceremony_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremony_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremony_awards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Tournament personnel can view ceremonies" ON public.ceremony_events;
DROP POLICY IF EXISTS "Tournament personnel can manage ceremonies" ON public.ceremony_events;
DROP POLICY IF EXISTS "Tournament personnel can view speakers" ON public.ceremony_speakers;
DROP POLICY IF EXISTS "Tournament personnel can manage speakers" ON public.ceremony_speakers;
DROP POLICY IF EXISTS "Tournament personnel can view awards" ON public.ceremony_awards;
DROP POLICY IF EXISTS "Tournament personnel can manage awards" ON public.ceremony_awards;
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

-- =============================================================================
-- PART 3: Schedule & Format Management
-- =============================================================================

-- Add format fields to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tournament_format TEXT CHECK (tournament_format IN ('pool_play', 'bracket', 'round_robin', 'hybrid')),
ADD COLUMN IF NOT EXISTS match_duration_minutes INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS time_cap_minutes INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS halftime_duration_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS game_to_score INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS schedule_url TEXT,
ADD COLUMN IF NOT EXISTS schedule_pdf_url TEXT;

-- Create tournament_day_schedules table
CREATE TABLE IF NOT EXISTS public.tournament_day_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  start_time TIME,
  end_time TIME,
  description TEXT,
  notes TEXT,
  published BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(tournament_id, schedule_date)
);

-- Add foreign key to matches for schedule reference
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS day_number INTEGER,
ADD COLUMN IF NOT EXISTS schedule_date DATE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_day_schedules_tournament_id ON public.tournament_day_schedules(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_day_schedules_date ON public.tournament_day_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_matches_day_number ON public.matches(day_number);
CREATE INDEX IF NOT EXISTS idx_matches_schedule_date ON public.matches(schedule_date);

-- Enable RLS
ALTER TABLE public.tournament_day_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view published schedules" ON public.tournament_day_schedules;
DROP POLICY IF EXISTS "Tournament personnel can manage schedules" ON public.tournament_day_schedules;
CREATE POLICY "Anyone can view published schedules"
  ON public.tournament_day_schedules FOR SELECT
  USING (published = true OR EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id
    AND (
      t.created_by = auth.uid() OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'tournament_director')
    )
  ));

CREATE POLICY "Tournament personnel can manage schedules"
  ON public.tournament_day_schedules FOR ALL
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

-- =============================================================================
-- PART 4: Seeding & Pools
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tournament_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  pool_name TEXT NOT NULL,
  pool_type TEXT NOT NULL CHECK (pool_type IN ('pool_a', 'pool_b', 'pool_c', 'pool_d', 'final', 'semifinal', 'quarterfinal')),
  round_number INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  seed_order JSONB, -- Array of team_ids in seeded order
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_pool_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.tournament_pools(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  seed_number INTEGER, -- Position within the pool
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(pool_id, team_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_pools_tournament_id ON public.tournament_pools(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_pools_round ON public.tournament_pools(round_number);
CREATE INDEX IF NOT EXISTS idx_team_pool_assignments_pool_id ON public.team_pool_assignments(pool_id);
CREATE INDEX IF NOT EXISTS idx_team_pool_assignments_team_id ON public.team_pool_assignments(team_id);

-- Enable RLS
ALTER TABLE public.tournament_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_pool_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view published pools" ON public.tournament_pools;
DROP POLICY IF EXISTS "Tournament personnel can manage pools" ON public.tournament_pools;
DROP POLICY IF EXISTS "Anyone can view pool assignments" ON public.team_pool_assignments;
DROP POLICY IF EXISTS "Tournament personnel can manage pool assignments" ON public.team_pool_assignments;
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

-- =============================================================================
-- PART 5: Tournament Rules & Regulations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tournament_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  rule_category TEXT NOT NULL CHECK (rule_category IN (
    'general', 'eligibility', 'field_of_play', 'equipment', 'match_rules',
    'spirit_of_the_game', 'player_conduct', 'penalties', 'appeals', 'other'
  )),
  rule_title TEXT NOT NULL,
  rule_content TEXT NOT NULL,
  priority INTEGER DEFAULT 0, -- For ordering
  applies_to TEXT CHECK (applies_to IN ('all', 'players', 'teams', 'officials')),
  published BOOLEAN DEFAULT false NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rule_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.tournament_rules(id) ON DELETE CASCADE,
  acknowledged_by UUID NOT NULL REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(rule_id, acknowledged_by, team_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_rules_tournament_id ON public.tournament_rules(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rules_category ON public.tournament_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_rule_acknowledgments_rule_id ON public.rule_acknowledgments(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_acknowledgments_user ON public.rule_acknowledgments(acknowledged_by);

-- Enable RLS
ALTER TABLE public.tournament_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view published rules" ON public.tournament_rules;
DROP POLICY IF EXISTS "Tournament personnel can manage rules" ON public.tournament_rules;
DROP POLICY IF EXISTS "Users can view their own acknowledgments" ON public.rule_acknowledgments;
DROP POLICY IF EXISTS "Users can acknowledge rules" ON public.rule_acknowledgments;
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

CREATE POLICY "Users can acknowledge rules"
  ON public.rule_acknowledgments FOR INSERT
  WITH CHECK (auth.uid() = acknowledged_by);

-- =============================================================================
-- PART 6: Commentary Sheets & Match Notes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.match_commentary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  commentator_id UUID REFERENCES public.profiles(id),
  commentary_type TEXT NOT NULL CHECK (commentary_type IN ('pre_match', 'live', 'post_match', 'highlights', 'analysis')),
  timestamp TIMESTAMP WITH TIME ZONE,
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.match_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  highlight_type TEXT NOT NULL CHECK (highlight_type IN ('goal', 'assist', 'save', 'foul', 'timeout', 'timeout_call', 'spirit_gesture', 'other')),
  player_id UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  description TEXT,
  timestamp TIME, -- Time in match
  video_url TEXT,
  photo_url TEXT,
  points_value INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.match_officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  official_id UUID REFERENCES public.profiles(id),
  official_name TEXT NOT NULL,
  official_role TEXT NOT NULL CHECK (official_role IN ('observer', 'commentator', 'statistician', 'photographer', 'medic', 'security', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_match_commentary_match_id ON public.match_commentary(match_id);
CREATE INDEX IF NOT EXISTS idx_match_commentary_type ON public.match_commentary(commentary_type);
CREATE INDEX IF NOT EXISTS idx_match_highlights_match_id ON public.match_highlights(match_id);
CREATE INDEX IF NOT EXISTS idx_match_highlights_type ON public.match_highlights(highlight_type);
CREATE INDEX IF NOT EXISTS idx_match_officials_match_id ON public.match_officials(match_id);

-- Enable RLS
ALTER TABLE public.match_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_officials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view public commentary" ON public.match_commentary;
DROP POLICY IF EXISTS "Tournament personnel can manage commentary" ON public.match_commentary;
DROP POLICY IF EXISTS "Anyone can view match highlights" ON public.match_highlights;
DROP POLICY IF EXISTS "Tournament personnel can manage highlights" ON public.match_highlights;
DROP POLICY IF EXISTS "Anyone can view match officials" ON public.match_officials;
DROP POLICY IF EXISTS "Tournament personnel can manage officials" ON public.match_officials;
CREATE POLICY "Anyone can view public commentary"
  ON public.match_commentary FOR SELECT
  USING (is_public = true OR EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id
    AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'tournament_director') OR
      public.has_role(auth.uid(), 'volunteer')
    )
  ));

CREATE POLICY "Tournament personnel can manage commentary"
  ON public.match_commentary FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director') OR
        public.has_role(auth.uid(), 'volunteer')
      )
    )
  );

CREATE POLICY "Anyone can view match highlights"
  ON public.match_highlights FOR SELECT
  USING (true);

CREATE POLICY "Tournament personnel can manage highlights"
  ON public.match_highlights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director') OR
        public.has_role(auth.uid(), 'volunteer')
      )
    )
  );

CREATE POLICY "Anyone can view match officials"
  ON public.match_officials FOR SELECT
  USING (true);

CREATE POLICY "Tournament personnel can manage officials"
  ON public.match_officials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'tournament_director') OR
        public.has_role(auth.uid(), 'volunteer')
      )
    )
  );

-- =============================================================================
-- PART 7: Helper Views
-- =============================================================================

-- View for tournament planning overview
CREATE OR REPLACE VIEW public.tournament_planning_overview AS
SELECT 
  t.id as tournament_id,
  t.name as tournament_name,
  t.start_date,
  t.end_date,
  t.status,
  COUNT(DISTINCT tc.id) FILTER (WHERE tc.status = 'completed') as completed_tasks,
  COUNT(DISTINCT tc.id) FILTER (WHERE tc.status IN ('pending', 'in_progress')) as pending_tasks,
  COUNT(DISTINCT tc.id) FILTER (WHERE tc.status = 'in_progress') as in_progress_tasks,
  COUNT(DISTINCT ce.id) as ceremony_count,
  COUNT(DISTINCT tp.id) as pool_count,
  COUNT(DISTINCT tr.id) FILTER (WHERE tr.published = true) as published_rules_count,
  COUNT(DISTINCT m.id) as total_matches,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_matches,
  COUNT(DISTINCT tg.id) as team_count,
  COUNT(DISTINCT tpl.id) FILTER (WHERE tpl.verified = true) as verified_players
FROM public.tournaments t
LEFT JOIN public.tournament_checklists tc ON tc.tournament_id = t.id
LEFT JOIN public.ceremony_events ce ON ce.tournament_id = t.id
LEFT JOIN public.tournament_pools tp ON tp.tournament_id = t.id
LEFT JOIN public.tournament_rules tr ON tr.tournament_id = t.id
LEFT JOIN public.matches m ON m.tournament_id = t.id
LEFT JOIN public.teams tg ON tg.tournament_id = t.id
LEFT JOIN public.team_players tpl ON tpl.team_id = tg.id
GROUP BY t.id, t.name, t.start_date, t.end_date, t.status;

-- Grant access
GRANT SELECT ON public.tournament_planning_overview TO authenticated;

-- View for pool standings
CREATE OR REPLACE VIEW public.pool_standings AS
SELECT 
  pool_id,
  pool_name,
  tournament_id,
  team_id,
  team_name,
  seed_number,
  wins,
  losses,
  draws,
  goals_for,
  goals_against
FROM (
  SELECT 
    tp.id as pool_id,
    tp.pool_name,
    tp.tournament_id,
    tg.id as team_id,
    tg.name as team_name,
    tpa.seed_number,
    COALESCE(
      (SELECT SUM(CASE 
        WHEN (m.team_a_id = tg.id AND m.team_a_score > m.team_b_score) OR
             (m.team_b_id = tg.id AND m.team_b_score > m.team_a_score) THEN 1 ELSE 0
      END) FROM public.matches m WHERE m.status = 'completed' AND (m.team_a_id = tg.id OR m.team_b_id = tg.id))
    , 0) as wins,
    COALESCE(
      (SELECT SUM(CASE 
        WHEN (m.team_a_id = tg.id AND m.team_a_score < m.team_b_score) OR
             (m.team_b_id = tg.id AND m.team_b_score < m.team_a_score) THEN 1 ELSE 0
      END) FROM public.matches m WHERE m.status = 'completed' AND (m.team_a_id = tg.id OR m.team_b_id = tg.id))
    , 0) as losses,
    COALESCE(
      (SELECT SUM(CASE 
        WHEN m.team_a_score = m.team_b_score THEN 1 ELSE 0
      END) FROM public.matches m WHERE m.status = 'completed' AND (m.team_a_id = tg.id OR m.team_b_id = tg.id))
    , 0) as draws,
    COALESCE(
      (SELECT SUM(CASE 
        WHEN m.team_a_id = tg.id THEN m.team_a_score
        ELSE m.team_b_score
      END) FROM public.matches m WHERE m.status = 'completed' AND (m.team_a_id = tg.id OR m.team_b_id = tg.id))
    , 0) as goals_for,
    COALESCE(
      (SELECT SUM(CASE 
        WHEN m.team_a_id = tg.id THEN m.team_b_score
        ELSE m.team_a_score
      END) FROM public.matches m WHERE m.status = 'completed' AND (m.team_a_id = tg.id OR m.team_b_id = tg.id))
    , 0) as goals_against
  FROM public.tournament_pools tp
  INNER JOIN public.team_pool_assignments tpa ON tpa.pool_id = tp.id
  INNER JOIN public.teams tg ON tg.id = tpa.team_id
) standings
ORDER BY pool_id, wins DESC, (goals_for - goals_against) DESC;

-- Grant access
GRANT SELECT ON public.pool_standings TO authenticated;

-- =============================================================================
-- PART 8: Helper Functions
-- =============================================================================

-- Function to get tournament planning progress
CREATE OR REPLACE FUNCTION public.get_tournament_planning_progress(_tournament_id UUID)
RETURNS TABLE (
  total_tasks INTEGER,
  completed_tasks INTEGER,
  in_progress_tasks INTEGER,
  pending_tasks INTEGER,
  completion_percentage NUMERIC,
  critical_tasks_pending INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed,
    COUNT(*) FILTER (WHERE status = 'in_progress')::INTEGER as in_progress,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending,
    ROUND(
      CASE 
        WHEN COUNT(*) > 0 
        THEN 100.0 * COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)
        ELSE 0
      END
    , 2) as percentage,
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND priority = 'critical')::INTEGER as critical
  FROM public.tournament_checklists
  WHERE tournament_id = _tournament_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_tournament_planning_progress TO authenticated;

-- Function to auto-assign seeding based on team performance
CREATE OR REPLACE FUNCTION public.auto_seed_teams(_tournament_id UUID, _pool_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_record RECORD;
  _seed_num INTEGER := 1;
BEGIN
  -- Delete existing assignments for this pool
  DELETE FROM public.team_pool_assignments WHERE pool_id = _pool_id;
  
  -- Assign seeds based on wins, point differential, etc.
  FOR _team_record IN
    SELECT 
      t.id,
      COUNT(*) FILTER (WHERE m.status = 'completed' AND 
        ((m.team_a_id = t.id AND m.team_a_score > m.team_b_score) OR
         (m.team_b_id = t.id AND m.team_b_score > m.team_a_score))) as wins,
      SUM(CASE 
        WHEN m.team_a_id = t.id THEN m.team_a_score - m.team_b_score
        ELSE m.team_b_score - m.team_a_score
      END) as point_diff
    FROM public.teams t
    LEFT JOIN public.matches m ON (m.team_a_id = t.id OR m.team_b_id = t.id) AND m.tournament_id = _tournament_id
    WHERE t.tournament_id = _tournament_id AND t.status = 'approved'
    GROUP BY t.id
    ORDER BY wins DESC, point_diff DESC
  LOOP
    INSERT INTO public.team_pool_assignments (pool_id, team_id, seed_number)
    VALUES (_pool_id, _team_record.id, _seed_num);
    _seed_num := _seed_num + 1;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_seed_teams TO authenticated;

-- Function to check if all teams have acknowledged rules
CREATE OR REPLACE FUNCTION public.check_rules_acknowledgment(_tournament_id UUID)
RETURNS TABLE (
  rule_id UUID,
  rule_title TEXT,
  total_teams INTEGER,
  acknowledged_teams INTEGER,
  pending_teams INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.rule_title,
    COUNT(DISTINCT t.id)::INTEGER as total,
    COUNT(DISTINCT ra.team_id)::INTEGER as acknowledged,
    (COUNT(DISTINCT t.id) - COUNT(DISTINCT ra.team_id))::INTEGER as pending
  FROM public.tournament_rules tr
  CROSS JOIN public.teams t
  LEFT JOIN public.rule_acknowledgments ra ON ra.rule_id = tr.id AND ra.team_id = t.id
  WHERE tr.tournament_id = _tournament_id
    AND t.tournament_id = _tournament_id
    AND tr.published = true
  GROUP BY tr.id, tr.rule_title;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_rules_acknowledgment TO authenticated;

-- =============================================================================
-- PART 9: Trigger Functions
-- =============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_tournament_checklists_updated_at
  BEFORE UPDATE ON public.tournament_checklists
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ceremony_events_updated_at
  BEFORE UPDATE ON public.ceremony_events
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_pools_updated_at
  BEFORE UPDATE ON public.tournament_pools
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_rules_updated_at
  BEFORE UPDATE ON public.tournament_rules
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_day_schedules_updated_at
  BEFORE UPDATE ON public.tournament_day_schedules
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_commentary_updated_at
  BEFORE UPDATE ON public.match_commentary
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 10: Comments for documentation
-- =============================================================================

COMMENT ON TABLE public.tournament_checklists IS 'Tournament planning checklist items with task management';
COMMENT ON TABLE public.ceremony_events IS 'Opening/closing ceremony and special event planning';
COMMENT ON TABLE public.ceremony_speakers IS 'Speaker lineup for ceremonies';
COMMENT ON TABLE public.ceremony_awards IS 'Awards to be presented during ceremonies';
COMMENT ON TABLE public.tournament_day_schedules IS 'Overall schedule for each day of the tournament';
COMMENT ON TABLE public.tournament_pools IS 'Tournament pools/brackets for competition structure';
COMMENT ON TABLE public.team_pool_assignments IS 'Team assignments to pools with seeding';
COMMENT ON TABLE public.tournament_rules IS 'Tournament rules and regulations by category';
COMMENT ON TABLE public.rule_acknowledgments IS 'Track which teams/users have acknowledged rules';
COMMENT ON TABLE public.match_commentary IS 'Live and post-match commentary';
COMMENT ON TABLE public.match_highlights IS 'Match highlights including goals, assists, saves, etc.';
COMMENT ON TABLE public.match_officials IS 'Officials assigned to matches (observers, commentators, etc.)';


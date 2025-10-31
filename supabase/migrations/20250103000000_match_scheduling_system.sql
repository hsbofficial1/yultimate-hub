-- Add tournament settings table for bracket configuration
CREATE TABLE IF NOT EXISTS public.tournament_settings (
  tournament_id UUID PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  bracket_type TEXT NOT NULL DEFAULT 'round_robin' CHECK (bracket_type IN ('round_robin', 'single_elimination', 'double_elimination', 'pools')),
  match_duration_minutes INTEGER DEFAULT 90 NOT NULL,
  break_time_minutes INTEGER DEFAULT 10 NOT NULL,
  fields TEXT[] DEFAULT ARRAY['Field 1', 'Field 2']::TEXT[],
  start_time TIME DEFAULT '09:00:00' NOT NULL,
  end_time TIME DEFAULT '18:00:00' NOT NULL,
  pool_count INTEGER DEFAULT 4,
  pool_size INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament settings"
  ON public.tournament_settings FOR SELECT
  USING (true);

CREATE POLICY "Directors and admins can manage tournament settings"
  ON public.tournament_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tournament_director')
    )
  );

-- Add index for faster lookups
CREATE INDEX idx_tournament_settings_tournament_id ON public.tournament_settings(tournament_id);

-- Add pool information to matches table for pool-based tournaments
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS pool TEXT,
ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS bracket_position INTEGER,
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_tournament_time ON public.matches(tournament_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_matches_pool ON public.matches(pool);
CREATE INDEX IF NOT EXISTS idx_matches_round ON public.matches(round);
CREATE INDEX IF NOT EXISTS idx_matches_team_a ON public.matches(team_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b ON public.matches(team_b_id);

-- Create function to check for match conflicts
CREATE OR REPLACE FUNCTION public.check_match_conflict(
  _tournament_id UUID,
  _team_id UUID,
  _scheduled_time TIMESTAMP WITH TIME ZONE,
  _match_duration_minutes INTEGER,
  _exclude_match_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  _end_time TIMESTAMP WITH TIME ZONE;
  _conflict_count INTEGER;
BEGIN
  _end_time := _scheduled_time + (_match_duration_minutes || ' minutes')::INTERVAL;
  
  SELECT COUNT(*) INTO _conflict_count
  FROM public.matches
  WHERE tournament_id = _tournament_id
    AND (team_a_id = _team_id OR team_b_id = _team_id)
    AND status != 'completed'
    AND id != COALESCE(_exclude_match_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (_scheduled_time >= scheduled_time 
       AND _scheduled_time < (scheduled_time + (_match_duration_minutes || ' minutes')::INTERVAL))
      OR
      (_end_time > scheduled_time 
       AND _end_time <= (scheduled_time + (_match_duration_minutes || ' minutes')::INTERVAL))
      OR
      (scheduled_time >= _scheduled_time 
       AND scheduled_time < _end_time)
    );
  
  RETURN _conflict_count > 0;
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tournament_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tournament_settings_updated_at
  BEFORE UPDATE ON public.tournament_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tournament_settings_timestamp();


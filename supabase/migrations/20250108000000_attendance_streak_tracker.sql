-- Attendance Streak Tracker & Gamification System
-- Tracks consecutive attendance, awards badges, and manages leaderboards

-- Create attendance_streaks table
CREATE TABLE IF NOT EXISTS public.attendance_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_session_date DATE,
  streak_started_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(child_id)
);

-- Create attendance_badges table
CREATE TABLE IF NOT EXISTS public.attendance_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('bronze', 'silver', 'gold', 'platinum')),
  milestone_sessions INTEGER NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notified BOOLEAN DEFAULT false NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(child_id, badge_type)
);

-- Create streak_leaderboard view
CREATE OR REPLACE VIEW public.streak_leaderboard AS
SELECT 
  c.id as child_id,
  c.name as child_name,
  c.age,
  c.photo_url,
  s.current_streak,
  s.longest_streak,
  s.streak_started_date,
  ROW_NUMBER() OVER (ORDER BY s.current_streak DESC, s.longest_streak DESC) as rank
FROM public.children c
INNER JOIN public.attendance_streaks s ON s.child_id = c.id
WHERE c.active = true AND s.current_streak > 0
ORDER BY s.current_streak DESC, s.longest_streak DESC;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_streaks_child_id ON public.attendance_streaks(child_id);
CREATE INDEX IF NOT EXISTS idx_attendance_streaks_current ON public.attendance_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_badges_child_id ON public.attendance_badges(child_id);
CREATE INDEX IF NOT EXISTS idx_attendance_badges_type ON public.attendance_badges(badge_type);

-- Enable RLS
ALTER TABLE public.attendance_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_streaks
CREATE POLICY "Coaches and managers can view streaks"
  ON public.attendance_streaks FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "System can manage streaks"
  ON public.attendance_streaks FOR ALL
  USING (true); -- Function will use SECURITY DEFINER

-- RLS Policies for attendance_badges
CREATE POLICY "Coaches and managers can view badges"
  ON public.attendance_badges FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "System can manage badges"
  ON public.attendance_badges FOR ALL
  USING (true); -- Function will use SECURITY DEFINER

-- Grant access to leaderboard view
GRANT SELECT ON public.streak_leaderboard TO authenticated;

-- Function to update attendance streak
CREATE OR REPLACE FUNCTION public.update_attendance_streak(
  _child_id UUID,
  _session_id UUID,
  _present BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_date DATE;
  _current_streak INTEGER := 0;
  _longest_streak INTEGER := 0;
  _streak_started DATE;
  _last_session_date DATE;
  _previous_streak INTEGER := 0;
  _child_name TEXT;
  _parent_whatsapp TEXT;
BEGIN
  -- Get session date
  SELECT date INTO _session_date
  FROM public.sessions
  WHERE id = _session_id;

  IF _session_date IS NULL THEN
    RETURN;
  END IF;

  -- Get or create streak record
  INSERT INTO public.attendance_streaks (child_id, current_streak, longest_streak, last_session_date)
  VALUES (_child_id, 0, 0, NULL)
  ON CONFLICT (child_id) DO NOTHING;

  -- Get current streak data
  SELECT 
    current_streak,
    longest_streak,
    last_session_date,
    streak_started_date
  INTO 
    _previous_streak,
    _longest_streak,
    _last_session_date,
    _streak_started
  FROM public.attendance_streaks
  WHERE child_id = _child_id;

  -- Update streak based on attendance
  IF _present THEN
    -- Check if this continues the streak (consecutive days/sessions)
    IF _last_session_date IS NULL OR 
       _session_date = _last_session_date + INTERVAL '1 day' OR
       _session_date = _last_session_date THEN
      -- Continue streak
      _current_streak := COALESCE(_previous_streak, 0) + 1;
      
      IF _streak_started IS NULL THEN
        _streak_started := _session_date;
      END IF;
    ELSE
      -- New streak (gap in sessions)
      _current_streak := 1;
      _streak_started := _session_date;
    END IF;

    -- Update longest streak if needed
    IF _current_streak > _longest_streak THEN
      _longest_streak := _current_streak;
    END IF;

    -- Check for milestone badges
    PERFORM public.check_milestone_badges(_child_id, _current_streak);
  ELSE
    -- Absent - check if streak was broken
    IF _previous_streak > 0 THEN
      -- Check if there's already a recent streak broken alert for this child
      IF NOT EXISTS (
        SELECT 1 FROM public.absence_alerts
        WHERE child_id = _child_id
          AND alert_type = 'consecutive_absence'
          AND acknowledged = false
          AND created_at > NOW() - INTERVAL '7 days'
      ) THEN
        -- Streak broken - create alert for coaches
        INSERT INTO public.absence_alerts (
          child_id,
          session_id,
          consecutive_absences,
          alert_type,
          message
        )
        SELECT 
          _child_id,
          _session_id,
          _previous_streak,
          'consecutive_absence',
          format('%s''s attendance streak of %s consecutive sessions has been broken. This may be an opportunity to check in.', 
                 name, _previous_streak)
        FROM public.children
        WHERE id = _child_id;
      END IF;
    END IF;

    -- Reset streak
    _current_streak := 0;
    _streak_started := NULL;
  END IF;

  -- Update streak record
  UPDATE public.attendance_streaks
  SET 
    current_streak = _current_streak,
    longest_streak = _longest_streak,
    last_session_date = _session_date,
    streak_started_date = _streak_started,
    updated_at = NOW()
  WHERE child_id = _child_id;
END;
$$;

-- Function to check and award milestone badges
CREATE OR REPLACE FUNCTION public.check_milestone_badges(
  _child_id UUID,
  _current_streak INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _badge_type TEXT;
  _milestone INTEGER;
  _child_name TEXT;
  _parent_whatsapp TEXT;
  _parent_name TEXT;
BEGIN
  -- Define milestones
  IF _current_streak = 5 AND NOT EXISTS (
    SELECT 1 FROM public.attendance_badges 
    WHERE child_id = _child_id AND badge_type = 'bronze'
  ) THEN
    _badge_type := 'bronze';
    _milestone := 5;
  ELSIF _current_streak = 10 AND NOT EXISTS (
    SELECT 1 FROM public.attendance_badges 
    WHERE child_id = _child_id AND badge_type = 'silver'
  ) THEN
    _badge_type := 'silver';
    _milestone := 10;
  ELSIF _current_streak = 20 AND NOT EXISTS (
    SELECT 1 FROM public.attendance_badges 
    WHERE child_id = _child_id AND badge_type = 'gold'
  ) THEN
    _badge_type := 'gold';
    _milestone := 20;
  ELSIF _current_streak = 50 AND NOT EXISTS (
    SELECT 1 FROM public.attendance_badges 
    WHERE child_id = _child_id AND badge_type = 'platinum'
  ) THEN
    _badge_type := 'platinum';
    _milestone := 50;
  ELSE
    RETURN; -- No milestone reached
  END IF;

  -- Award badge
  INSERT INTO public.attendance_badges (child_id, badge_type, milestone_sessions)
  VALUES (_child_id, _badge_type, _milestone)
  ON CONFLICT (child_id, badge_type) DO NOTHING;

  -- Get child and parent info for notification
  SELECT name, parent_whatsapp, parent_name
  INTO _child_name, _parent_whatsapp, _parent_name
  FROM public.children
  WHERE id = _child_id;

  -- Log milestone (in production, this would trigger WhatsApp notification via edge function)
  RAISE NOTICE 'Milestone achieved: % reached % sessions! Badge: %', 
    _child_name, _milestone, _badge_type;

  -- Note: WhatsApp notification would be sent via Supabase Edge Function
  -- or external service integration
END;
$$;

-- Function to get streak broken notifications for coaches
CREATE OR REPLACE FUNCTION public.get_streak_broken_notifications()
RETURNS TABLE (
  child_id UUID,
  child_name TEXT,
  broken_streak INTEGER,
  last_session_date DATE,
  parent_name TEXT,
  parent_whatsapp TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This would typically be called when checking for notifications
  -- For now, returns empty - streak broken tracking would need additional table
  RETURN QUERY
  SELECT NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::DATE, NULL::TEXT, NULL::TEXT
  WHERE false;
END;
$$;

-- Update the attendance trigger to also update streaks
CREATE OR REPLACE FUNCTION public.trigger_update_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update streak when attendance is marked
  IF NEW.present IS NOT NULL THEN
    PERFORM public.update_attendance_streak(NEW.child_id, NEW.session_id, NEW.present);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on attendance insert/update
DROP TRIGGER IF EXISTS update_streak_trigger ON public.attendance;
CREATE TRIGGER update_streak_trigger
  AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_streak();

-- Initialize streaks for existing active children
INSERT INTO public.attendance_streaks (child_id, current_streak, longest_streak)
SELECT id, 0, 0
FROM public.children
WHERE active = true
ON CONFLICT (child_id) DO NOTHING;


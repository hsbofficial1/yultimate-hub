-- Attendance History Timeline & Absence Tracking with Alerts
-- Tracks consecutive absences and generates alerts

-- Create absence_alerts table
CREATE TABLE IF NOT EXISTS public.absence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  consecutive_absences INTEGER NOT NULL DEFAULT 3,
  alert_type TEXT NOT NULL DEFAULT 'consecutive_absence' CHECK (alert_type IN ('consecutive_absence', 'pattern_absence')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  acknowledged BOOLEAN DEFAULT false NOT NULL,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false NOT NULL,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_absence_alerts_child_id ON public.absence_alerts(child_id);
CREATE INDEX IF NOT EXISTS idx_absence_alerts_acknowledged ON public.absence_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_absence_alerts_resolved ON public.absence_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_absence_alerts_created_at ON public.absence_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.absence_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for absence_alerts
CREATE POLICY "Coaches and managers can view alerts"
  ON public.absence_alerts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage alerts"
  ON public.absence_alerts FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- Function to check consecutive absences
CREATE OR REPLACE FUNCTION public.check_consecutive_absences(
  _child_id UUID,
  _session_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _consecutive_count INTEGER := 0;
  _session_date DATE;
  _previous_date DATE;
  _current_date DATE;
  _child_name TEXT;
  _last_alert_id UUID;
BEGIN
  -- Get the session date
  SELECT date INTO _session_date
  FROM public.sessions
  WHERE id = _session_id;

  IF _session_date IS NULL THEN
    RETURN;
  END IF;

  -- Get child name for alert message
  SELECT name INTO _child_name
  FROM public.children
  WHERE id = _child_id;

  -- Count consecutive absences before this session
  -- Get all sessions for this child's program type, ordered by date desc
  WITH child_sessions AS (
    SELECT 
      s.id,
      s.date,
      s.program_type
    FROM public.sessions s
    WHERE s.program_type IN (
      SELECT DISTINCT program_type 
      FROM public.sessions 
      WHERE id = _session_id
    )
    AND s.date <= _session_date
    ORDER BY s.date DESC
  ),
  attendance_records AS (
    SELECT 
      cs.id as session_id,
      cs.date,
      COALESCE(a.present, false) as present
    FROM child_sessions cs
    LEFT JOIN public.attendance a ON a.session_id = cs.id AND a.child_id = _child_id
  )
  SELECT COUNT(*) INTO _consecutive_count
  FROM (
    SELECT date, present
    FROM attendance_records
    WHERE date <= _session_date
    ORDER BY date DESC
    LIMIT 3
  ) recent
  WHERE present = false;

  -- Only create alert if we have exactly 3 consecutive absences
  -- and no unacknowledged alert already exists
  IF _consecutive_count >= 3 THEN
    -- Check if there's already an unacknowledged alert for this child
    SELECT id INTO _last_alert_id
    FROM public.absence_alerts
    WHERE child_id = _child_id
      AND acknowledged = false
      AND resolved = false
      AND alert_type = 'consecutive_absence'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Only create new alert if one doesn't exist
    IF _last_alert_id IS NULL THEN
      INSERT INTO public.absence_alerts (
        child_id,
        session_id,
        consecutive_absences,
        alert_type,
        message
      ) VALUES (
        _child_id,
        _session_id,
        _consecutive_count,
        'consecutive_absence',
        format('%s has been absent for %s consecutive sessions. Please check in with the child/parent.', _child_name, _consecutive_count)
      );
    END IF;
  END IF;
END;
$$;

-- Trigger to check for consecutive absences when attendance is marked as absent
CREATE OR REPLACE FUNCTION public.trigger_check_absences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if the child was marked as absent
  IF NEW.present = false THEN
    PERFORM public.check_consecutive_absences(NEW.child_id, NEW.session_id);
  ELSE
    -- If marked present, mark any existing alerts as resolved (optional)
    -- You can uncomment this if you want auto-resolve on attendance
    -- UPDATE public.absence_alerts
    -- SET resolved = true,
    --     resolved_at = NOW(),
    --     resolved_by = auth.uid()
    -- WHERE child_id = NEW.child_id
    --   AND acknowledged = false
    --   AND resolved = false;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on attendance insert/update
DROP TRIGGER IF EXISTS check_absence_trigger ON public.attendance;
CREATE TRIGGER check_absence_trigger
  AFTER INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_absences();

-- Create view for attendance history per child
CREATE OR REPLACE VIEW public.child_attendance_history AS
SELECT 
  c.id as child_id,
  c.name as child_name,
  s.id as session_id,
  s.date as session_date,
  s.time as session_time,
  s.location,
  s.program_type,
  COALESCE(a.present, false) as present,
  a.marked_at,
  s.notes as session_notes
FROM public.children c
CROSS JOIN public.sessions s
LEFT JOIN public.attendance a ON a.child_id = c.id AND a.session_id = s.id
WHERE c.active = true
ORDER BY s.date DESC, s.time DESC;

-- Grant access to the view
GRANT SELECT ON public.child_attendance_history TO authenticated;

-- Create function to get attendance timeline for a child
CREATE OR REPLACE FUNCTION public.get_child_attendance_timeline(
  _child_id UUID,
  _limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  session_id UUID,
  session_date DATE,
  session_time TIME,
  location TEXT,
  program_type TEXT,
  present BOOLEAN,
  marked_at TIMESTAMP WITH TIME ZONE,
  session_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.date,
    s.time,
    s.location,
    s.program_type,
    COALESCE(a.present, false),
    a.marked_at,
    s.notes
  FROM public.sessions s
  LEFT JOIN public.attendance a ON a.session_id = s.id AND a.child_id = _child_id
  WHERE s.date <= CURRENT_DATE
  ORDER BY s.date DESC, s.time DESC
  LIMIT _limit;
END;
$$;


-- Coach Workload Management System
-- Auto-tracks coach hours, manages workload, and sends burnout alerts

-- Create work_types enum for different types of work
DO $$ BEGIN
  CREATE TYPE work_type AS ENUM ('session', 'travel', 'administrative', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add duration to sessions table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN duration_minutes INTEGER DEFAULT 90 NOT NULL;
  END IF;
END $$;

-- Create coach_work_logs table to track all hours worked
CREATE TABLE IF NOT EXISTS public.coach_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  work_type work_type NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 12),
  description TEXT,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(coach_id, work_date, work_type, session_id) -- Prevent duplicate entries
);

-- Create coach_workload_alerts table for burnout alerts
CREATE TABLE IF NOT EXISTS public.coach_workload_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  hours_over_limit DECIMAL(5,2) NOT NULL,
  alert_sent BOOLEAN DEFAULT false NOT NULL,
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged BOOLEAN DEFAULT false NOT NULL,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false NOT NULL,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coach_work_logs_coach_id ON public.coach_work_logs(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_work_logs_work_date ON public.coach_work_logs(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_work_logs_type ON public.coach_work_logs(work_type);
CREATE INDEX IF NOT EXISTS idx_coach_work_logs_session_id ON public.coach_work_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_workload_alerts_coach_id ON public.coach_workload_alerts(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_workload_alerts_week ON public.coach_workload_alerts(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_coach_workload_alerts_acknowledged ON public.coach_workload_alerts(acknowledged);

-- Enable RLS
ALTER TABLE public.coach_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_workload_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coach_work_logs
CREATE POLICY "Coaches can view their own work logs"
  ON public.coach_work_logs FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can manage their own work logs"
  ON public.coach_work_logs FOR ALL
  USING (
    auth.uid() = coach_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Admins and program managers can view all work logs"
  ON public.coach_work_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- RLS Policies for coach_workload_alerts
CREATE POLICY "Coaches can view their own alerts"
  ON public.coach_workload_alerts FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Admins and program managers can view all alerts"
  ON public.coach_workload_alerts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Admins and program managers can manage alerts"
  ON public.coach_workload_alerts FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- Create view for weekly coach workload
CREATE OR REPLACE VIEW public.coach_weekly_workload AS
SELECT 
  cwl.coach_id,
  p.name as coach_name,
  p.email as coach_email,
  DATE_TRUNC('week', cwl.work_date)::DATE as week_start_date,
  SUM(cwl.hours) as total_hours,
  SUM(CASE WHEN cwl.work_type = 'session' THEN cwl.hours ELSE 0 END) as session_hours,
  SUM(CASE WHEN cwl.work_type = 'travel' THEN cwl.hours ELSE 0 END) as travel_hours,
  SUM(CASE WHEN cwl.work_type = 'administrative' THEN cwl.hours ELSE 0 END) as admin_hours,
  SUM(CASE WHEN cwl.work_type = 'other' THEN cwl.hours ELSE 0 END) as other_hours,
  COUNT(DISTINCT CASE WHEN cwl.work_type = 'session' THEN cwl.session_id END) as session_count
FROM public.coach_work_logs cwl
INNER JOIN public.profiles p ON p.id = cwl.coach_id
GROUP BY cwl.coach_id, p.name, p.email, DATE_TRUNC('week', cwl.work_date)::DATE
ORDER BY week_start_date DESC, total_hours DESC;

-- Grant access to the view
GRANT SELECT ON public.coach_weekly_workload TO authenticated;

-- Function to automatically log session hours when a session is created/updated
CREATE OR REPLACE FUNCTION public.auto_log_session_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hours DECIMAL(4,2);
BEGIN
  -- Calculate hours from duration_minutes (default to 90 minutes = 1.5 hours if not specified)
  _hours := COALESCE(NEW.duration_minutes, 90) / 60.0;
  
  -- Insert or update work log for this session
  INSERT INTO public.coach_work_logs (
    coach_id,
    work_date,
    work_type,
    hours,
    description,
    session_id
  ) VALUES (
    NEW.coach_id,
    NEW.date,
    'session',
    _hours,
    'Training session: ' || COALESCE(NEW.location, '') || ' (' || COALESCE(NEW.program_type, '') || ')',
    NEW.id
  )
  ON CONFLICT (coach_id, work_date, work_type, session_id)
  DO UPDATE SET
    hours = _hours,
    description = EXCLUDED.description;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-log session hours
DROP TRIGGER IF EXISTS auto_log_session_hours_trigger ON public.sessions;
CREATE TRIGGER auto_log_session_hours_trigger
  AFTER INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  WHEN (NEW.date <= CURRENT_DATE + INTERVAL '30 days') -- Only for recent/future sessions
  EXECUTE FUNCTION public.auto_log_session_hours();

-- Function to check for coach burnout (exceeds 25 hours/week)
CREATE OR REPLACE FUNCTION public.check_coach_burnout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coach_record RECORD;
  _week_start DATE;
  _week_end DATE;
  _total_hours DECIMAL(5,2);
  _hours_over_limit DECIMAL(5,2);
  _coach_name TEXT;
  _coach_email TEXT;
BEGIN
  -- Check workload for current week
  _week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  _week_end := _week_start + INTERVAL '6 days';
  
  -- Check all coaches
  FOR _coach_record IN 
    SELECT DISTINCT coach_id
    FROM public.coach_work_logs
    WHERE work_date BETWEEN _week_start AND _week_end
  LOOP
    -- Get total hours for the week
    SELECT SUM(hours) INTO _total_hours
    FROM public.coach_work_logs
    WHERE coach_id = _coach_record.coach_id
      AND work_date BETWEEN _week_start AND _week_end;
    
    -- Get coach info
    SELECT name, email INTO _coach_name, _coach_email
    FROM public.profiles
    WHERE id = _coach_record.coach_id;
    
    -- Check if exceeds 25 hours
    IF _total_hours > 25 THEN
      _hours_over_limit := _total_hours - 25;
      
      -- Check if alert already exists and is unsent
      IF NOT EXISTS (
        SELECT 1 FROM public.coach_workload_alerts
        WHERE coach_id = _coach_record.coach_id
          AND week_start_date = _week_start
          AND alert_sent = false
          AND resolved = false
      ) THEN
        INSERT INTO public.coach_workload_alerts (
          coach_id,
          week_start_date,
          total_hours,
          hours_over_limit,
          alert_sent
        ) VALUES (
          _coach_record.coach_id,
          _week_start,
          _total_hours,
          _hours_over_limit,
          false
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to get email addresses for program managers
CREATE OR REPLACE FUNCTION public.get_program_manager_emails()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emails TEXT[];
BEGIN
  SELECT ARRAY_AGG(email)
  INTO _emails
  FROM public.profiles
  WHERE public.has_role(id, 'program_manager');
  
  RETURN COALESCE(_emails, ARRAY[]::TEXT[]);
END;
$$;

-- Function to mark alert as sent (called after email is sent)
CREATE OR REPLACE FUNCTION public.mark_alert_as_sent(_alert_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coach_workload_alerts
  SET 
    alert_sent = true,
    alert_sent_at = NOW()
  WHERE id = _alert_id;
END;
$$;

-- Create view for current week workload comparison across coaches
CREATE OR REPLACE VIEW public.coach_workload_comparison AS
SELECT 
  cwl.coach_id,
  p.name as coach_name,
  p.email as coach_email,
  SUM(cwl.hours) as total_hours,
  SUM(CASE WHEN cwl.work_type = 'session' THEN cwl.hours ELSE 0 END) as session_hours,
  SUM(CASE WHEN cwl.work_type = 'travel' THEN cwl.hours ELSE 0 END) as travel_hours,
  SUM(CASE WHEN cwl.work_type = 'administrative' THEN cwl.hours ELSE 0 END) as admin_hours,
  SUM(CASE WHEN cwl.work_type = 'other' THEN cwl.hours ELSE 0 END) as other_hours,
  COUNT(DISTINCT cwl.work_date) as days_worked,
  CASE 
    WHEN SUM(cwl.hours) > 25 THEN 'high'
    WHEN SUM(cwl.hours) > 15 THEN 'medium'
    ELSE 'low'
  END as workload_status,
  GREATEST(0, SUM(cwl.hours) - 25) as hours_over_limit
FROM public.coach_work_logs cwl
INNER JOIN public.profiles p ON p.id = cwl.coach_id
WHERE cwl.work_date >= DATE_TRUNC('week', CURRENT_DATE)::DATE
  AND cwl.work_date < DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '7 days'
GROUP BY cwl.coach_id, p.name, p.email
ORDER BY total_hours DESC;

-- Grant access to the view
GRANT SELECT ON public.coach_workload_comparison TO authenticated;

-- Function to suggest workload redistribution
CREATE OR REPLACE FUNCTION public.suggest_workload_redistribution()
RETURNS TABLE (
  overloaded_coach_id UUID,
  overloaded_coach_name TEXT,
  overloaded_coach_hours DECIMAL(5,2),
  underloaded_coach_id UUID,
  underloaded_coach_name TEXT,
  underloaded_coach_hours DECIMAL(5,2),
  suggested_hours DECIMAL(4,2),
  suggestion_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _avg_hours DECIMAL(5,2);
BEGIN
  -- Get average hours for current week
  SELECT AVG(total_hours) INTO _avg_hours
  FROM public.coach_workload_comparison
  WHERE total_hours > 0;
  
  -- Find coaches who are overloaded (>25 hours) and underloaded (<15 hours)
  RETURN QUERY
  WITH overloaded AS (
    SELECT coach_id, coach_name, total_hours
    FROM public.coach_workload_comparison
    WHERE total_hours > 25
  ),
  underloaded AS (
    SELECT coach_id, coach_name, total_hours
    FROM public.coach_workload_comparison
    WHERE total_hours < 15 AND total_hours > 0
  )
  SELECT 
    o.coach_id,
    o.coach_name::TEXT,
    o.total_hours,
    u.coach_id,
    u.coach_name::TEXT,
    u.total_hours,
    LEAST((o.total_hours - 20), (20 - u.total_hours)) as suggested_transfer,
    format('Consider transferring %.1f hours from %s to %s to balance workload', 
           LEAST((o.total_hours - 20), (20 - u.total_hours)),
           o.coach_name,
           u.coach_name)::TEXT
  FROM overloaded o
  CROSS JOIN underloaded u
  WHERE LEAST((o.total_hours - 20), (20 - u.total_hours)) > 0
  ORDER BY suggested_transfer DESC
  LIMIT 10;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_coach_work_logs_updated_at
  BEFORE UPDATE ON public.coach_work_logs
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at_column();

-- Note: Schedule the check_coach_burnout function to run weekly via cron job
-- This can be set up in Supabase Dashboard under Database > Extensions > pg_cron


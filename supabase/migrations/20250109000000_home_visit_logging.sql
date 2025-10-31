-- Home Visit Logging System
-- Tracks home visits, observations, photos, and alerts for overdue visits

-- Create home_visits table
CREATE TABLE IF NOT EXISTS public.home_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  duration_minutes INTEGER,
  purpose TEXT NOT NULL CHECK (purpose IN ('initial_visit', 'follow_up', 'parent_meeting', 'welfare_check', 'other')),
  observations TEXT, -- Rich text observations
  notes TEXT, -- Additional notes
  action_items TEXT, -- Action items/next steps
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
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create overdue_visit_alerts table
CREATE TABLE IF NOT EXISTS public.overdue_visit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  days_since_last_visit INTEGER NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'overdue_visit' CHECK (alert_type IN ('overdue_visit', 'long_overdue')),
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
CREATE INDEX IF NOT EXISTS idx_home_visits_child_id ON public.home_visits(child_id);
CREATE INDEX IF NOT EXISTS idx_home_visits_visit_date ON public.home_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_home_visit_photos_visit_id ON public.home_visit_photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_overdue_visit_alerts_child_id ON public.overdue_visit_alerts(child_id);
CREATE INDEX IF NOT EXISTS idx_overdue_visit_alerts_acknowledged ON public.overdue_visit_alerts(acknowledged);

-- Enable RLS
ALTER TABLE public.home_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_visit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overdue_visit_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for home_visits
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
CREATE POLICY "Coaches and managers can view photos"
  ON public.home_visit_photos FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage photos"
  ON public.home_visit_photos FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- RLS Policies for overdue_visit_alerts
CREATE POLICY "Coaches and managers can view overdue alerts"
  ON public.overdue_visit_alerts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage overdue alerts"
  ON public.overdue_visit_alerts FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- Function to check for overdue visits (no visit in 3 months / 90 days)
CREATE OR REPLACE FUNCTION public.check_overdue_visits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _child_record RECORD;
  _days_since_visit INTEGER;
  _last_visit_date DATE;
  _child_name TEXT;
BEGIN
  -- Check all active children
  FOR _child_record IN 
    SELECT id, name
    FROM public.children
    WHERE active = true
  LOOP
    -- Get last visit date
    SELECT MAX(visit_date) INTO _last_visit_date
    FROM public.home_visits
    WHERE child_id = _child_record.id;

    -- Calculate days since last visit
    IF _last_visit_date IS NULL THEN
      -- Never visited - use join date or current date
      SELECT COALESCE(join_date, CURRENT_DATE) INTO _last_visit_date
      FROM public.children
      WHERE id = _child_record.id;
      _days_since_visit := CURRENT_DATE - _last_visit_date;
    ELSE
      _days_since_visit := CURRENT_DATE - _last_visit_date;
    END IF;

    -- Check if overdue (90 days = 3 months)
    IF _days_since_visit >= 90 THEN
      -- Check if alert already exists and is unacknowledged
      IF NOT EXISTS (
        SELECT 1 FROM public.overdue_visit_alerts
        WHERE child_id = _child_record.id
          AND acknowledged = false
          AND resolved = false
          AND created_at > NOW() - INTERVAL '30 days' -- Only create new alert if last one is older than 30 days
      ) THEN
        INSERT INTO public.overdue_visit_alerts (
          child_id,
          days_since_last_visit,
          alert_type,
          message
        ) VALUES (
          _child_record.id,
          _days_since_visit,
          CASE 
            WHEN _days_since_visit >= 180 THEN 'long_overdue'
            ELSE 'overdue_visit'
          END,
          format('No home visit logged for %s in %s days (last visit: %s). Please schedule a visit.', 
                 _child_record.name, 
                 _days_since_visit,
                 COALESCE(_last_visit_date::TEXT, 'Never'))
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to automatically resolve overdue alert when visit is logged
CREATE OR REPLACE FUNCTION public.resolve_overdue_on_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resolve any overdue alerts for this child when a new visit is logged
  UPDATE public.overdue_visit_alerts
  SET 
    resolved = true,
    resolved_by = NEW.visited_by,
    resolved_at = NOW()
  WHERE child_id = NEW.child_id
    AND resolved = false;

  RETURN NEW;
END;
$$;

-- Trigger to auto-resolve overdue alerts when visit is logged
CREATE TRIGGER resolve_overdue_on_visit_trigger
  AFTER INSERT ON public.home_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_overdue_on_visit();

-- Create view for home visit timeline per child
CREATE OR REPLACE VIEW public.child_home_visit_timeline AS
SELECT 
  hv.id,
  hv.child_id,
  c.name as child_name,
  hv.visit_date,
  hv.duration_minutes,
  hv.purpose,
  hv.observations,
  hv.notes,
  hv.action_items,
  hv.visited_by,
  p.name as visitor_name,
  hv.created_at,
  COUNT(hvp.id) as photo_count
FROM public.home_visits hv
INNER JOIN public.children c ON c.id = hv.child_id
LEFT JOIN public.profiles p ON p.id = hv.visited_by
LEFT JOIN public.home_visit_photos hvp ON hvp.visit_id = hv.id
GROUP BY hv.id, hv.child_id, c.name, hv.visit_date, hv.duration_minutes, 
         hv.purpose, hv.observations, hv.notes, hv.action_items, 
         hv.visited_by, p.name, hv.created_at
ORDER BY hv.visit_date DESC;

-- Grant access to the view
GRANT SELECT ON public.child_home_visit_timeline TO authenticated;

-- Function to get home visit timeline for a child
CREATE OR REPLACE FUNCTION public.get_child_home_visit_timeline(
  _child_id UUID,
  _limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  visit_date DATE,
  duration_minutes INTEGER,
  purpose TEXT,
  observations TEXT,
  notes TEXT,
  action_items TEXT,
  visitor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  photo_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hv.id,
    hv.visit_date,
    hv.duration_minutes,
    hv.purpose,
    hv.observations,
    hv.notes,
    hv.action_items,
    p.name,
    hv.created_at,
    COUNT(hvp.id)::BIGINT
  FROM public.home_visits hv
  LEFT JOIN public.profiles p ON p.id = hv.visited_by
  LEFT JOIN public.home_visit_photos hvp ON hvp.visit_id = hv.id
  WHERE hv.child_id = _child_id
  GROUP BY hv.id, hv.visit_date, hv.duration_minutes, hv.purpose, 
           hv.observations, hv.notes, hv.action_items, p.name, hv.created_at
  ORDER BY hv.visit_date DESC
  LIMIT _limit;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_home_visits_updated_at
  BEFORE UPDATE ON public.home_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: Storage bucket for home visit photos needs to be created manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named 'home-visit-photos'
-- 3. Set it to public if you want photos to be publicly accessible
-- 4. Add RLS policies if needed for access control


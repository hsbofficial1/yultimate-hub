-- LSAS Assessment System
-- Tracks child development across Physical, Social, Emotional, and Cognitive domains
-- Supports baseline, endline, and periodic assessments with cohort comparisons

-- Create assessment_types enum
DO $$ BEGIN
  CREATE TYPE assessment_type AS ENUM ('baseline', 'endline', 'periodic');
END $$;

-- Create lsas_assessments table
CREATE TABLE IF NOT EXISTS public.lsas_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  assessment_type assessment_type NOT NULL,
  assessed_by UUID REFERENCES public.profiles(id),
  
  -- Physical domain (motor skills, coordination)
  physical_score INTEGER NOT NULL CHECK (physical_score >= 1 AND physical_score <= 5),
  physical_notes TEXT,
  
  -- Social domain (teamwork, communication)
  social_score INTEGER NOT NULL CHECK (social_score >= 1 AND social_score <= 5),
  social_notes TEXT,
  
  -- Emotional domain (confidence, resilience)
  emotional_score INTEGER NOT NULL CHECK (emotional_score >= 1 AND emotional_score <= 5),
  emotional_notes TEXT,
  
  -- Cognitive domain (focus, problem-solving)
  cognitive_score INTEGER NOT NULL CHECK (cognitive_score >= 1 AND cognitive_score <= 5),
  cognitive_notes TEXT,
  
  -- Overall assessment
  overall_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create assessment_alerts table for overdue assessments
CREATE TABLE IF NOT EXISTS public.assessment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  assessment_type assessment_type NOT NULL,
  days_overdue INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_lsas_assessments_child_id ON public.lsas_assessments(child_id);
CREATE INDEX IF NOT EXISTS idx_lsas_assessments_date ON public.lsas_assessments(assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_lsas_assessments_type ON public.lsas_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_alerts_child_id ON public.assessment_alerts(child_id);
CREATE INDEX IF NOT EXISTS idx_assessment_alerts_acknowledged ON public.assessment_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_assessment_alerts_type ON public.assessment_alerts(assessment_type);

-- Enable RLS
ALTER TABLE public.lsas_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lsas_assessments
CREATE POLICY "Coaches and managers can view assessments"
  ON public.lsas_assessments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage assessments"
  ON public.lsas_assessments FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- RLS Policies for assessment_alerts
CREATE POLICY "Coaches and managers can view assessment alerts"
  ON public.assessment_alerts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

CREATE POLICY "Coaches and managers can manage assessment alerts"
  ON public.assessment_alerts FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'coach') OR
    public.has_role(auth.uid(), 'program_manager')
  );

-- Create view for assessment timeline per child
CREATE OR REPLACE VIEW public.child_assessment_timeline AS
SELECT 
  la.id,
  la.child_id,
  c.name as child_name,
  la.assessment_date,
  la.assessment_type,
  la.physical_score,
  la.social_score,
  la.emotional_score,
  la.cognitive_score,
  (la.physical_score + la.social_score + la.emotional_score + la.cognitive_score) / 4.0 as average_score,
  la.physical_notes,
  la.social_notes,
  la.emotional_notes,
  la.cognitive_notes,
  la.overall_notes,
  la.assessed_by,
  p.name as assessor_name,
  la.created_at,
  la.updated_at
FROM public.lsas_assessments la
INNER JOIN public.children c ON c.id = la.child_id
LEFT JOIN public.profiles p ON p.id = la.assessed_by
ORDER BY la.assessment_date DESC;

-- Grant access to the view
GRANT SELECT ON public.child_assessment_timeline TO authenticated;

-- Create view for cohort averages (same age/program children)
CREATE OR REPLACE VIEW public.cohort_assessment_averages AS
SELECT 
  la.assessment_date,
  la.assessment_type,
  c.age,
  prog.program_type,
  AVG(la.physical_score) as avg_physical,
  AVG(la.social_score) as avg_social,
  AVG(la.emotional_score) as avg_emotional,
  AVG(la.cognitive_score) as avg_cognitive,
  AVG((la.physical_score + la.social_score + la.emotional_score + la.cognitive_score) / 4.0) as avg_overall,
  COUNT(*) as cohort_size
FROM public.lsas_assessments la
INNER JOIN public.children c ON c.id = la.child_id
LEFT JOIN public.child_program_enrollments cpe ON cpe.child_id = c.id AND cpe.status = 'active'
LEFT JOIN public.programs prog ON prog.id = cpe.program_id
GROUP BY la.assessment_date, la.assessment_type, c.age, prog.program_type
HAVING COUNT(*) >= 3 -- Only show cohort averages if at least 3 children
ORDER BY la.assessment_date DESC;

-- Grant access to the view
GRANT SELECT ON public.cohort_assessment_averages TO authenticated;

-- Function to check for overdue assessments
CREATE OR REPLACE FUNCTION public.check_overdue_assessments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _child_record RECORD;
  _days_since_baseline INTEGER;
  _days_since_endline INTEGER;
  _days_since_periodic INTEGER;
  _baseline_date DATE;
  _endline_date DATE;
  _periodic_date DATE;
  _child_name TEXT;
BEGIN
  -- Check all active children
  FOR _child_record IN 
    SELECT id, name, join_date
    FROM public.children
    WHERE active = true
  LOOP
    -- Get last assessment date for each type
    SELECT MAX(assessment_date) INTO _baseline_date
    FROM public.lsas_assessments
    WHERE child_id = _child_record.id AND assessment_type = 'baseline';
    
    SELECT MAX(assessment_date) INTO _endline_date
    FROM public.lsas_assessments
    WHERE child_id = _child_record.id AND assessment_type = 'endline';
    
    SELECT MAX(assessment_date) INTO _periodic_date
    FROM public.lsas_assessments
    WHERE child_id = _child_record.id AND assessment_type = 'periodic';
    
    -- Check if baseline assessment is missing or overdue (>30 days since join or last assessment)
    IF _baseline_date IS NULL THEN
      _days_since_baseline := CURRENT_DATE - _child_record.join_date;
    ELSE
      _days_since_baseline := CURRENT_DATE - _baseline_date;
    END IF;
    
    IF _days_since_baseline > 30 THEN
      -- Check if alert already exists and is unacknowledged
      IF NOT EXISTS (
        SELECT 1 FROM public.assessment_alerts
        WHERE child_id = _child_record.id
          AND assessment_type = 'baseline'
          AND acknowledged = false
          AND resolved = false
          AND created_at > NOW() - INTERVAL '30 days'
      ) THEN
        INSERT INTO public.assessment_alerts (
          child_id,
          assessment_type,
          days_overdue,
          message
        ) VALUES (
          _child_record.id,
          'baseline',
          _days_since_baseline,
          format('Baseline assessment overdue for %s (%s days). Please complete baseline assessment.', 
                 _child_record.name, _days_since_baseline)
        );
      END IF;
    END IF;
    
    -- Check for overdue periodic assessments (should occur every 3 months)
    IF _periodic_date IS NOT NULL THEN
      _days_since_periodic := CURRENT_DATE - _periodic_date;
      
      IF _days_since_periodic > 90 THEN
        -- Check if alert already exists
        IF NOT EXISTS (
          SELECT 1 FROM public.assessment_alerts
          WHERE child_id = _child_record.id
            AND assessment_type = 'periodic'
            AND acknowledged = false
            AND resolved = false
            AND created_at > NOW() - INTERVAL '30 days'
        ) THEN
          INSERT INTO public.assessment_alerts (
            child_id,
            assessment_type,
            days_overdue,
            message
          ) VALUES (
            _child_record.id,
            'periodic',
            _days_since_periodic,
            format('Periodic assessment overdue for %s (%s days since last). Please complete periodic assessment.', 
                   _child_record.name, _days_since_periodic)
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to automatically resolve assessment alert when assessment is completed
CREATE OR REPLACE FUNCTION public.resolve_assessment_alert_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resolve any overdue alerts for this child when a new assessment of the same type is completed
  UPDATE public.assessment_alerts
  SET 
    resolved = true,
    resolved_by = NEW.assessed_by,
    resolved_at = NOW()
  WHERE child_id = NEW.child_id
    AND assessment_type = NEW.assessment_type
    AND resolved = false;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-resolve assessment alerts when assessment is completed
CREATE TRIGGER resolve_assessment_alert_on_completion_trigger
  AFTER INSERT ON public.lsas_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_assessment_alert_on_completion();

-- Function to get child assessment progress with cohort comparison
CREATE OR REPLACE FUNCTION public.get_child_assessment_progress(
  _child_id UUID
)
RETURNS TABLE (
  assessment_date DATE,
  assessment_type assessment_type,
  physical_score INTEGER,
  social_score INTEGER,
  emotional_score INTEGER,
  cognitive_score INTEGER,
  average_score NUMERIC,
  cohort_physical NUMERIC,
  cohort_social NUMERIC,
  cohort_emotional NUMERIC,
  cohort_cognitive NUMERIC,
  cohort_average NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _child_age INTEGER;
  _child_program_type TEXT;
BEGIN
  -- Get child's age and program type for cohort matching
  SELECT age, prog.program_type
  INTO _child_age, _child_program_type
  FROM public.children c
  LEFT JOIN public.child_program_enrollments cpe ON cpe.child_id = c.id AND cpe.status = 'active'
  LEFT JOIN public.programs prog ON prog.id = cpe.program_id
  WHERE c.id = _child_id;
  
  -- Return assessment data with cohort averages
  RETURN QUERY
  SELECT 
    la.assessment_date,
    la.assessment_type,
    la.physical_score,
    la.social_score,
    la.emotional_score,
    la.cognitive_score,
    (la.physical_score + la.social_score + la.emotional_score + la.cognitive_score) / 4.0 as avg_score,
    caa.avg_physical,
    caa.avg_social,
    caa.avg_emotional,
    caa.avg_cognitive,
    caa.avg_overall
  FROM public.lsas_assessments la
  LEFT JOIN public.cohort_assessment_averages caa ON 
    caa.assessment_date = la.assessment_date 
    AND caa.assessment_type = la.assessment_type
    AND caa.age = _child_age
    AND (caa.program_type = _child_program_type OR (caa.program_type IS NULL AND _child_program_type IS NULL))
  WHERE la.child_id = _child_id
  ORDER BY la.assessment_date DESC;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_lsas_assessments_updated_at
  BEFORE UPDATE ON public.lsas_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: Schedule the check_overdue_assessments function to run daily via cron job or scheduled function
-- This can be set up in Supabase Dashboard under Database > Extensions > pg_cron


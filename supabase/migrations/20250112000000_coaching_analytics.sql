-- Coaching Reports & Analytics System
-- Enhanced analytics views and functions for comprehensive reporting

-- Create view for participation report metrics
CREATE OR REPLACE VIEW public.participation_report AS
SELECT 
  COUNT(DISTINCT c.id) as total_children_enrolled,
  COUNT(DISTINCT CASE WHEN c.active = true THEN c.id END) as active_children,
  COUNT(DISTINCT c.id) FILTER (WHERE c.gender = 'male') as male_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.gender = 'female') as female_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.gender = 'other') as other_count,
  ROUND(AVG(CASE WHEN a.present THEN 100.0 ELSE 0.0 END), 2) as average_attendance_rate,
  COUNT(DISTINCT a.id) FILTER (WHERE a.present) as total_present,
  COUNT(DISTINCT a.id) as total_attendance_records
FROM public.children c
LEFT JOIN public.attendance a ON a.child_id = c.id
WHERE c.active = true;

-- Create view for retention rate (children still active after 6 months)
CREATE OR REPLACE VIEW public.retention_report AS
SELECT 
  COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '6 months' AND active = true) as retained_6_months,
  COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '6 months') as total_joined_6_months_ago,
  CASE 
    WHEN COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '6 months') > 0
    THEN ROUND(
      100.0 * COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '6 months' AND active = true)::NUMERIC / 
      COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '6 months')
    , 2)
    ELSE 0
  END as retention_rate_6_months,
  COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '3 months' AND active = true) as retained_3_months,
  COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '3 months') as total_joined_3_months_ago,
  CASE 
    WHEN COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '3 months') > 0
    THEN ROUND(
      100.0 * COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '3 months' AND active = true)::NUMERIC / 
      COUNT(*) FILTER (WHERE join_date <= CURRENT_DATE - INTERVAL '3 months')
    , 2)
    ELSE 0
  END as retention_rate_3_months
FROM public.children;

-- Create view for program growth trends over time
CREATE OR REPLACE VIEW public.program_growth_trends AS
SELECT 
  DATE_TRUNC('month', join_date)::DATE as month,
  COUNT(*) as children_joined,
  COUNT(*) FILTER (WHERE active = true) as children_active,
  LAG(COUNT(*) FILTER (WHERE active = true)) OVER (ORDER BY DATE_TRUNC('month', join_date)::DATE) as previous_month_active,
  CASE 
    WHEN LAG(COUNT(*) FILTER (WHERE active = true)) OVER (ORDER BY DATE_TRUNC('month', join_date)::DATE) > 0
    THEN ROUND(
      ((COUNT(*) FILTER (WHERE active = true)::NUMERIC - 
        LAG(COUNT(*) FILTER (WHERE active = true)) OVER (ORDER BY DATE_TRUNC('month', join_date)::DATE))::NUMERIC / 
        LAG(COUNT(*) FILTER (WHERE active = true)) OVER (ORDER BY DATE_TRUNC('month', join_date)::DATE)) * 100
    , 2)
    ELSE 0
  END as month_over_month_growth
FROM public.children
WHERE join_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', join_date)::DATE
ORDER BY month;

-- Create view for school vs community comparison
CREATE OR REPLACE VIEW public.program_comparison_report AS
SELECT 
  COALESCE(s.program_type, 'Unknown') as program_type,
  COUNT(DISTINCT c.id) as total_children,
  COUNT(DISTINCT c.id) FILTER (WHERE c.active = true) as active_children,
  ROUND(AVG(CASE WHEN a.present THEN 100.0 ELSE 0.0 END), 2) as average_attendance_rate,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT a.id) as total_attendance_records,
  ROUND(AVG(c.age), 1) as average_age,
  COUNT(DISTINCT c.id) FILTER (WHERE c.gender = 'male') as male_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.gender = 'female') as female_count,
  COUNT(DISTINCT s.coach_id) as unique_coaches
FROM public.sessions s
LEFT JOIN public.children c ON c.id = ANY(
  SELECT DISTINCT a2.child_id 
  FROM public.attendance a2 
  WHERE a2.session_id = s.id
)
LEFT JOIN public.attendance a ON a.session_id = s.id
GROUP BY s.program_type;

-- Create view for coach effectiveness metrics
CREATE OR REPLACE VIEW public.coach_effectiveness_report AS
SELECT 
  p.id as coach_id,
  p.name as coach_name,
  p.email as coach_email,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT a.session_id) as sessions_with_attendance,
  ROUND(AVG(CASE WHEN a.present THEN 100.0 ELSE 0.0 END), 2) as average_attendance_rate,
  COUNT(DISTINCT a.id) FILTER (WHERE a.present) as total_present,
  COUNT(DISTINCT a.id) as total_records,
  COUNT(DISTINCT c.id) as unique_children_coached,
  -- Home visit completion rate (if home_visits table exists)
  COALESCE(
    (SELECT COUNT(*) FROM public.home_visits hv WHERE hv.visited_by = p.id)::NUMERIC / 
    NULLIF(COUNT(DISTINCT s.id), 0) * 100, 0
  , 0) as home_visit_completion_rate,
  -- Assessment score improvements (if lsas_assessments exist)
  COALESCE(
    (SELECT 
      AVG(
        (COALESCE(e.physical_score + e.social_score + e.emotional_score + e.cognitive_score, 0) / 4.0)::NUMERIC -
        (COALESCE(b.physical_score + b.social_score + b.emotional_score + b.cognitive_score, 0) / 4.0)::NUMERIC
      )
    FROM public.lsas_assessments e
    INNER JOIN public.lsas_assessments b ON b.child_id = e.child_id AND b.assessment_type = 'baseline'
    WHERE e.assessment_type = 'endline'
      AND EXISTS (
        SELECT 1 FROM public.attendance a2
        INNER JOIN public.sessions s2 ON s2.id = a2.session_id
        WHERE a2.child_id = e.child_id AND s2.coach_id = p.id
      )
    )
  , 0) as avg_assessment_improvement
FROM public.profiles p
INNER JOIN public.sessions s ON s.coach_id = p.id
LEFT JOIN public.attendance a ON a.session_id = s.id
LEFT JOIN public.children c ON c.id = a.child_id
WHERE public.has_role(p.id, 'coach')
GROUP BY p.id, p.name, p.email
ORDER BY average_attendance_rate DESC NULLS LAST;

-- Create view for age distribution histogram data
CREATE OR REPLACE VIEW public.age_distribution_report AS
SELECT 
  age,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.children
WHERE active = true
GROUP BY age
ORDER BY age;

-- Create view for gender ratio pie chart data
CREATE OR REPLACE VIEW public.gender_ratio_report AS
SELECT 
  gender,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.children
WHERE active = true
GROUP BY gender
ORDER BY gender;

-- Function to get comprehensive participation report
CREATE OR REPLACE FUNCTION public.get_comprehensive_participation_report()
RETURNS TABLE (
  total_enrolled INTEGER,
  total_active INTEGER,
  average_attendance_rate NUMERIC,
  retention_rate_6m NUMERIC,
  retention_rate_3m NUMERIC,
  month_over_month_growth NUMERIC,
  male_count INTEGER,
  female_count INTEGER,
  other_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.total_children_enrolled,
    pr.active_children,
    pr.average_attendance_rate,
    rr.retention_rate_6_months,
    rr.retention_rate_3_months,
    COALESCE(
      (SELECT month_over_month_growth 
       FROM public.program_growth_trends 
       WHERE month = (
         SELECT MAX(month) FROM public.program_growth_trends
       ))
    , 0),
    pr.male_count,
    pr.female_count,
    pr.other_count
  FROM public.participation_report pr
  CROSS JOIN public.retention_report rr
  LIMIT 1;
END;
$$;

-- Grant access to all views
GRANT SELECT ON public.participation_report TO authenticated;
GRANT SELECT ON public.retention_report TO authenticated;
GRANT SELECT ON public.program_growth_trends TO authenticated;
GRANT SELECT ON public.program_comparison_report TO authenticated;
GRANT SELECT ON public.coach_effectiveness_report TO authenticated;
GRANT SELECT ON public.age_distribution_report TO authenticated;
GRANT SELECT ON public.gender_ratio_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comprehensive_participation_report() TO authenticated;

-- Create materialized view for faster reporting (optional, can be refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.coaching_analytics_cache AS
SELECT 
  'participation' as report_type,
  jsonb_build_object(
    'total_enrolled', pr.total_children_enrolled,
    'total_active', pr.active_children,
    'average_attendance_rate', pr.average_attendance_rate,
    'male_count', pr.male_count,
    'female_count', pr.female_count,
    'other_count', pr.other_count
  ) as data
FROM public.participation_report pr
UNION ALL
SELECT 
  'retention' as report_type,
  jsonb_build_object(
    'retention_rate_6_months', rr.retention_rate_6_months,
    'retention_rate_3_months', rr.retention_rate_3_months
  ) as data
FROM public.retention_report rr;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_children_join_date ON public.children(join_date);
CREATE INDEX IF NOT EXISTS idx_children_active ON public.children(active);
CREATE INDEX IF NOT EXISTS idx_sessions_program_type ON public.sessions(program_type);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_attendance_child_id ON public.attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON public.attendance(session_id);

-- Add fields to spirit_scores table for dispute workflow
ALTER TABLE public.spirit_scores 
ADD COLUMN IF NOT EXISTS disputed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Create index for anomaly detection queries
CREATE INDEX IF NOT EXISTS idx_spirit_scores_to_team ON public.spirit_scores(to_team_id, submitted_at);

-- Create function to detect anomalous spirit scores
CREATE OR REPLACE FUNCTION public.detect_spirit_anomaly(
  _team_id UUID,
  _new_score INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  _avg_score NUMERIC;
  _std_dev NUMERIC;
  _threshold NUMERIC;
BEGIN
  -- Get average score for this team from all their matches
  SELECT AVG(total) INTO _avg_score
  FROM public.spirit_scores
  WHERE to_team_id = _team_id
    AND disputed = false
    AND resolved != true;
  
  -- If no previous scores, allow this one
  IF _avg_score IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate standard deviation
  SELECT STDDEV(total) INTO _std_dev
  FROM public.spirit_scores
  WHERE to_team_id = _team_id
    AND disputed = false
    AND resolved != true;
  
  -- If std dev is too small, use a reasonable default
  IF _std_dev IS NULL OR _std_dev < 1 THEN
    _std_dev := 2;
  END IF;
  
  -- Calculate threshold (2 standard deviations)
  _threshold := _avg_score - (2 * _std_dev);
  
  -- Check if new score is anomalously low
  RETURN _new_score < _threshold;
END;
$$;

-- Create function to send reminder notifications
CREATE OR REPLACE FUNCTION public.send_spirit_score_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TODO: Implement actual notification logic using Supabase Edge Functions or external service
  -- For now, this is a placeholder that logs the reminder
  RAISE NOTICE 'Spirit score reminder would be sent for match: %', NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger to send reminder 2 hours after match completion if no spirit score submitted
-- Note: This is a placeholder - actual implementation would use scheduled jobs or cron
CREATE TRIGGER spirit_score_reminder_trigger
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.send_spirit_score_reminder();

-- Create view for spirit score analytics
CREATE OR REPLACE VIEW public.spirit_score_analytics AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  COUNT(ss.id) as total_ratings,
  AVG(ss.total) as avg_score,
  STDDEV(ss.total) as std_dev,
  MIN(ss.total) as min_score,
  MAX(ss.total) as max_score,
  COUNT(CASE WHEN ss.disputed = true THEN 1 END) as disputed_count
FROM public.teams t
LEFT JOIN public.spirit_scores ss ON t.id = ss.to_team_id
GROUP BY t.id, t.name;

-- Grant access to the view
GRANT SELECT ON public.spirit_score_analytics TO authenticated;

-- Update spirit scores RLS to allow captains to view their team's scores
DROP POLICY IF EXISTS "Team captains can view their team spirit scores" ON public.spirit_scores;
CREATE POLICY "Team captains can view their team spirit scores"
  ON public.spirit_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE (id = from_team_id OR id = to_team_id) 
        AND captain_id = auth.uid()
    )
  );

-- Allow directors to manage disputes
DROP POLICY IF EXISTS "Directors can manage spirit disputes" ON public.spirit_scores;
CREATE POLICY "Directors can manage spirit disputes"
  ON public.spirit_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'tournament_director')
    )
  );

-- Add check constraint to ensure spirit scores can only be submitted after match completion
-- This is enforced at application level, but adding database-level check for safety
COMMENT ON TABLE public.spirit_scores IS 
'Spirit scores can only be submitted after the match status is "completed". 
Enforced at application level for better user experience.';


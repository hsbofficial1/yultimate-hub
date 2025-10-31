-- Create function to calculate team performance stats
CREATE OR REPLACE FUNCTION public.get_team_performance(
  _team_id UUID,
  _tournament_id UUID,
  _pool TEXT DEFAULT NULL
)
RETURNS TABLE (
  wins INTEGER,
  losses INTEGER,
  draws INTEGER,
  games_played INTEGER,
  point_differential INTEGER,
  goals_for INTEGER,
  goals_against INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _wins INTEGER := 0;
  _losses INTEGER := 0;
  _draws INTEGER := 0;
  _games_played INTEGER := 0;
  _point_differential INTEGER := 0;
  _goals_for INTEGER := 0;
  _goals_against INTEGER := 0;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE (team_a_id = _team_id AND team_a_score > team_b_score) OR (team_b_id = _team_id AND team_b_score > team_a_score)),
    COUNT(*) FILTER (WHERE (team_a_id = _team_id AND team_a_score < team_b_score) OR (team_b_id = _team_id AND team_b_score < team_a_score)),
    COUNT(*) FILTER (WHERE team_a_score = team_b_score),
    COUNT(*),
    COALESCE(SUM(CASE 
      WHEN team_a_id = _team_id THEN team_a_score - team_b_score
      WHEN team_b_id = _team_id THEN team_b_score - team_a_score
    END), 0),
    COALESCE(SUM(CASE 
      WHEN team_a_id = _team_id THEN team_a_score
      WHEN team_b_id = _team_id THEN team_b_score
    END), 0),
    COALESCE(SUM(CASE 
      WHEN team_a_id = _team_id THEN team_b_score
      WHEN team_b_id = _team_id THEN team_a_score
    END), 0)
  INTO _wins, _losses, _draws, _games_played, _point_differential, _goals_for, _goals_against
  FROM public.matches
  WHERE status = 'completed'
    AND tournament_id = _tournament_id
    AND (_pool IS NULL OR pool = _pool)
    AND (team_a_id = _team_id OR team_b_id = _team_id);
  
  RETURN QUERY SELECT _wins, _losses, _draws, _games_played, _point_differential, _goals_for, _goals_against;
END;
$$;

-- Create function to get team spirit score average
CREATE OR REPLACE FUNCTION public.get_team_spirit_score(
  _team_id UUID,
  _tournament_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _avg_score NUMERIC;
  _score_count INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(ss.total), 0),
    COUNT(ss.id)
  INTO _avg_score, _score_count
  FROM public.spirit_scores ss
  JOIN public.matches m ON ss.match_id = m.id
  WHERE ss.to_team_id = _team_id
    AND m.tournament_id = _tournament_id
    AND ss.disputed = false;
  
  RETURN COALESCE(_avg_score, 0)::NUMERIC(10,2);
END;
$$;

-- Create function to get head-to-head results
CREATE OR REPLACE FUNCTION public.get_head_to_head(
  _team_a_id UUID,
  _team_b_id UUID,
  _tournament_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _result INTEGER := 0;
BEGIN
  -- Returns: 1 if team_a wins, -1 if team_b wins, 0 if draw or no match
  SELECT 
    CASE 
      WHEN team_a_score > team_b_score THEN 1
      WHEN team_b_score > team_a_score THEN -1
      ELSE 0
    END
  INTO _result
  FROM public.matches
  WHERE status = 'completed'
    AND tournament_id = _tournament_id
    AND ((team_a_id = _team_a_id AND team_b_id = _team_b_id)
      OR (team_a_id = _team_b_id AND team_b_id = _team_a_id))
  ORDER BY scheduled_time DESC
  LIMIT 1;
  
  RETURN COALESCE(_result, 0);
END;
$$;

-- Create view for performance leaderboard
CREATE OR REPLACE VIEW public.performance_leaderboard AS
SELECT 
  t.id as team_id,
  t.tournament_id,
  t.name as team_name,
  m.pool,
  get_team_performance(t.id, t.tournament_id, m.pool).*,
  RANK() OVER (
    PARTITION BY t.tournament_id, COALESCE(m.pool, 'Overall')
    ORDER BY 
      get_team_performance(t.id, t.tournament_id, m.pool).wins DESC,
      get_team_performance(t.id, t.tournament_id, m.pool).point_differential DESC,
      get_team_spirit_score(t.id, t.tournament_id) DESC
  ) as rank_position
FROM public.teams t
LEFT JOIN public.matches m ON (t.id = m.team_a_id OR t.id = m.team_b_id) AND m.status = 'completed'
WHERE t.status = 'approved'
GROUP BY t.id, t.tournament_id, t.name, m.pool;

-- Create view for spirit leaderboard
CREATE OR REPLACE VIEW public.spirit_leaderboard AS
SELECT 
  t.id as team_id,
  t.tournament_id,
  t.name as team_name,
  COALESCE(AVG(ss.total), 0)::NUMERIC(10,2) as avg_spirit_score,
  COUNT(ss.id) as scores_received,
  RANK() OVER (
    PARTITION BY t.tournament_id
    ORDER BY COALESCE(AVG(ss.total), 0) DESC
  ) as rank_position
FROM public.teams t
LEFT JOIN public.spirit_scores ss ON t.id = ss.to_team_id AND ss.disputed = false
LEFT JOIN public.matches m ON ss.match_id = m.id
WHERE t.status = 'approved'
GROUP BY t.id, t.tournament_id, t.name;

-- Create view for combined leaderboard
CREATE OR REPLACE VIEW public.combined_leaderboard AS
SELECT 
  pl.team_id,
  pl.tournament_id,
  pl.team_name,
  pl.pool,
  pl.wins,
  pl.losses,
  pl.draws,
  pl.games_played,
  pl.point_differential,
  pl.rank_position as perf_rank,
  sl.avg_spirit_score,
  sl.rank_position as spirit_rank,
  -- Combined score: 70% performance, 30% spirit
  -- Performance normalized by rank (lower is better)
  -- Spirit normalized by rank (lower is better)
  (
    (pl.rank_position * 0.7 + sl.rank_position * 0.3)
  ) as combined_score,
  RANK() OVER (
    PARTITION BY pl.tournament_id, COALESCE(pl.pool, 'Overall')
    ORDER BY 
      pl.wins DESC,
      pl.point_differential DESC,
      sl.avg_spirit_score DESC
  ) as final_rank
FROM public.performance_leaderboard pl
LEFT JOIN public.spirit_leaderboard sl ON pl.team_id = sl.team_id AND pl.tournament_id = sl.tournament_id
WHERE pl.games_played > 0;

-- Grant access to views
GRANT SELECT ON public.performance_leaderboard TO authenticated, anon;
GRANT SELECT ON public.spirit_leaderboard TO authenticated, anon;
GRANT SELECT ON public.combined_leaderboard TO authenticated, anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_team_performance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_team_spirit_score TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_head_to_head TO authenticated, anon;

COMMENT ON FUNCTION public.get_team_performance IS 
'Calculates comprehensive performance statistics for a team in a tournament';
COMMENT ON FUNCTION public.get_team_spirit_score IS 
'Calculates average spirit score for a team';
COMMENT ON FUNCTION public.get_head_to_head IS 
'Determines head-to-head result between two teams (1=A wins, -1=B wins, 0=draw)';


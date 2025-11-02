import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Clock, AlertCircle, ChevronRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface UpcomingMatch {
  id: string;
  scheduled_time: string;
  team_a: { name: string };
  team_b: { name: string };
  tournament: { name: string; id: string };
}

interface LeaderboardPosition {
  tournament_id: string;
  tournament_name: string;
  rank_position: number;
  total_teams: number;
  pool?: string;
}

interface PendingSpiritScore {
  match_id: string;
  scheduled_time: string;
  opponent: string;
  tournament_name: string;
  tournament_id: string;
}

export const TeamCaptainDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [leaderboardPositions, setLeaderboardPositions] = useState<LeaderboardPosition[]>([]);
  const [pendingSpiritScores, setPendingSpiritScores] = useState<PendingSpiritScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamCaptainData();
  }, [user]);

  const fetchTeamCaptainData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get teams where user is the captain
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, tournament_id')
        .eq('captain_id', user.id)
        .or('status.eq.approved,status.eq.pending');

      if (!teamsData || teamsData.length === 0) {
        setLoading(false);
        return;
      }

      const teamIds = teamsData.map(t => t.id);
      const tournamentIds = [...new Set(teamsData.map(t => t.tournament_id).filter(Boolean))];

      // Fetch upcoming matches (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          scheduled_time,
          team_a:teams!team_a_id(name),
          team_b:teams!team_b_id(name),
          tournament:tournaments(id, name)
        `)
        .or(`team_a_id.in.(${teamIds}),team_b_id.in.(${teamIds})`)
        .eq('status', 'scheduled')
        .gte('scheduled_time', new Date().toISOString())
        .lte('scheduled_time', nextWeek.toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(5);

      setUpcomingMatches(matchesData as UpcomingMatch[] || []);

      // Fetch leaderboard positions
      if (tournamentIds.length > 0) {
        const { data: leaderboardData } = await supabase
          .from('combined_leaderboard')
          .select('tournament_id, tournament_name, rank_position, pool')
          .in('tournament_id', tournamentIds)
          .in('team_id', teamIds)
          .order('tournament_id', { ascending: true });

        if (leaderboardData) {
          // Get total teams per tournament for context
          const positions = await Promise.all(
            leaderboardData.map(async (pos) => {
              const { count } = await supabase
                .from('combined_leaderboard')
                .select('*', { count: 'exact', head: true })
                .eq('tournament_id', pos.tournament_id);
              
              return {
                ...pos,
                total_teams: count || 0,
              };
            })
          );
          setLeaderboardPositions(positions);
        }
      }

      // Fetch pending spirit scores (completed matches without spirit scores from this team)
      const { data: completedMatches } = await supabase
        .from('matches')
        .select(`
          id,
          scheduled_time,
          status,
          tournament:tournaments(id, name),
          spirit_scores!inner(id, from_team_id)
        `)
        .or(`team_a_id.in.(${teamIds}),team_b_id.in.(${teamIds})`)
        .eq('status', 'completed')
        .gte('scheduled_time', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
        .limit(10);

      if (completedMatches) {
        // Check which matches don't have spirit scores from our team
        const pendingMatches: PendingSpiritScore[] = [];
        
        for (const match of completedMatches) {
          const isTeamA = teamIds.includes((match as any).team_a_id);
          const isTeamB = teamIds.includes((match as any).team_b_id);
          
          if (isTeamA || isTeamB) {
            const hasSpiritScore = (match as any).spirit_scores?.some(
              (ss: any) => teamIds.includes(ss.from_team_id)
            );

            if (!hasSpiritScore) {
              // Get opponent name
              const { data: opponentTeam } = await supabase
                .from('matches')
                .select(`
                  team_a:teams!team_a_id(name),
                  team_b:teams!team_b_id(name)
                `)
                .eq('id', match.id)
                .single();

              const opponent = isTeamA 
                ? (opponentTeam as any)?.team_b?.name 
                : (opponentTeam as any)?.team_a?.name;

              pendingMatches.push({
                match_id: match.id,
                scheduled_time: match.scheduled_time,
                opponent: opponent || 'Unknown',
                tournament_name: (match.tournament as any)?.name || 'Unknown',
                tournament_id: (match.tournament as any)?.id || '',
              });
            }
          }
        }

        setPendingSpiritScores(pendingMatches);
      }
    } catch (error) {
      console.error('Error fetching team captain data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Team Captain Dashboard</h3>

        {/* Upcoming Matches */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Matches
            </CardTitle>
            <CardDescription>Your next 7 days of matches</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming matches scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {match.team_a.name} vs {match.team_b.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.tournament.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(match.scheduled_time), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard Positions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Your Rankings
            </CardTitle>
            <CardDescription>Current tournament positions</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboardPositions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active tournaments
              </p>
            ) : (
              <div className="space-y-3">
                {leaderboardPositions.map((position, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          #{position.rank_position}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{position.tournament_name}</p>
                        {position.pool && (
                          <p className="text-xs text-muted-foreground">
                            Pool {position.pool}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          of {position.total_teams} teams
                        </p>
                      </div>
                    </div>
                    {position.rank_position === 1 && (
                      <Badge variant="default">
                        <Trophy className="h-3 w-3 mr-1" />
                        Leader
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Spirit Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Spirit Scores
            </CardTitle>
            <CardDescription>Submit spirit scores for completed matches</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingSpiritScores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All spirit scores submitted ✓
              </p>
            ) : (
              <div className="space-y-3">
                {pendingSpiritScores.slice(0, 5).map((pending) => (
                  <div
                    key={pending.match_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        vs {pending.opponent}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pending.tournament_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(pending.scheduled_time), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge variant="destructive" className="cursor-pointer"
                      onClick={() => navigate(`/match/${pending.match_id}`)}
                    >
                      Submit
                    </Badge>
                  </div>
                ))}
                {pendingSpiritScores.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{pendingSpiritScores.length - 5} more pending
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};



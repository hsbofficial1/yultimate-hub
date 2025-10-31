import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpiritScoreDialog } from '@/components/SpiritScoreDialog';
import { ArrowLeft, Plus, Minus } from 'lucide-react';

interface Match {
  id: string;
  field: string;
  scheduled_time: string;
  team_a_score: number;
  team_b_score: number;
  status: string;
  tournament_id: string;
  team_a: { id: string; name: string };
  team_b: { id: string; name: string };
}

const MatchScoring = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [spiritScoreSubmitted, setSpiritScoreSubmitted] = useState(false);

  useEffect(() => {
    fetchMatch();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('match-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setMatch((prev) => (prev ? { ...prev, ...payload.new } : null));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(id, name),
          team_b:teams!team_b_id(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setMatch(data);

      // Check if user has already submitted spirit score
      if (data && user) {
        const userTeamId = data.team_a_id;
        const { data: spiritScores } = await supabase
          .from('spirit_scores')
          .select('id')
          .eq('match_id', id)
          .eq('from_team_id', userTeamId)
          .limit(1);

        setSpiritScoreSubmitted(spiritScores && spiritScores.length > 0);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching match',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (team: 'a' | 'b', increment: number) => {
    if (!match) return;

    const newScore =
      team === 'a'
        ? Math.max(0, match.team_a_score + increment)
        : Math.max(0, match.team_b_score + increment);

    try {
      const { error } = await supabase
        .from('matches')
        .update(
          team === 'a' ? { team_a_score: newScore } : { team_b_score: newScore }
        )
        .eq('id', match.id);

      if (error) throw error;

      setMatch({
        ...match,
        [team === 'a' ? 'team_a_score' : 'team_b_score']: newScore,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating score',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateStatus = async (status: string) => {
    if (!match) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ status })
        .eq('id', match.id);

      if (error) throw error;

      setMatch({ ...match, status });
      toast({ title: `Match ${status}` });
    } catch (error: any) {
      toast({
        title: 'Error updating match status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Match not found</p>
      </div>
    );
  }
//HSB
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/tournament/${match.tournament_id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Live Scoring</h1>
              <p className="text-sm text-muted-foreground">Field {match.field}</p>
            </div>
            <Badge className="ml-auto">{match.status}</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Team A */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {match.team_a?.name || 'Team A'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-6xl font-bold">{match.team_a_score}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="flex-1"
                  variant="outline"
                  onClick={() => updateScore('a', -1)}
                  disabled={match.team_a_score === 0}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => updateScore('a', 1)}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team B */}
          <Card className="border-2 border-secondary/20">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {match.team_b?.name || 'Team B'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-6xl font-bold">{match.team_b_score}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="flex-1"
                  variant="outline"
                  onClick={() => updateScore('b', -1)}
                  disabled={match.team_b_score === 0}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => updateScore('b', 1)}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Match Controls */}
        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="flex flex-wrap gap-4 justify-center">
              {match.status === 'upcoming' && (
                <Button onClick={() => updateStatus('live')} size="lg">
                  Start Match
                </Button>
              )}
              {match.status === 'live' && (
                <>
                  <Button variant="outline" size="lg">
                    Half Time
                  </Button>
                  <Button
                    onClick={() => updateStatus('completed')}
                    size="lg"
                    variant="secondary"
                  >
                    Final Score
                  </Button>
                </>
              )}
              {match.status === 'completed' && (
                <div className="text-center">
                  <p className="text-lg font-semibold text-secondary">Match Completed</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Winner:{' '}
                    {match.team_a_score > match.team_b_score
                      ? match.team_a?.name
                      : match.team_a_score < match.team_b_score
                      ? match.team_b?.name
                      : 'Draw'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spirit Score Submission */}
        {match.status === 'completed' && !spiritScoreSubmitted && (
          <Card className="mt-6 border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-center">Spirit of the Game</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-muted-foreground">
                  Rate {match.team_b?.name} on spirit of the game
                </p>
                <SpiritScoreDialog
                  matchId={match.id}
                  fromTeamId={match.team_a.id}
                  toTeamId={match.team_b.id}
                  toTeamName={match.team_b?.name || 'Opponent'}
                  matchStatus={match.status}
                  onSuccess={() => {
                    setSpiritScoreSubmitted(true);
                    fetchMatch();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MatchScoring;

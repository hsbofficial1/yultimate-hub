import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MapPin, Users, Play, UserPlus } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  max_teams: number;
  status: string;
}

interface Team {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  field: string;
  scheduled_time: string;
  team_a_score: number;
  team_b_score: number;
  status: string;
  team_a: { name: string };
  team_b: { name: string };
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', id);

      setTeams(teamsData || []);

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(name),
          team_b:teams!team_b_id(name)
        `)
        .eq('tournament_id', id)
        .order('scheduled_time');

      setMatches(matchesData || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching tournament',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ status: 'approved' })
        .eq('id', teamId);

      if (error) throw error;

      toast({ title: 'Team approved' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error approving team',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Tournament not found</p>
      </div>
    );
  }

  const canManage = userRole === 'admin' || userRole === 'tournament_director';
  const canRegister = tournament.status === 'registration_open' && teams.length < tournament.max_teams;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/tournaments')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{tournament.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {tournament.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{tournament.status.replace('_', ' ')}</Badge>
              {canRegister && (
                <Button onClick={() => navigate(`/tournament/${id}/register`)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register Team
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="teams">
          <TabsList>
            <TabsTrigger value="teams">Teams ({teams.length}/{tournament.max_teams})</TabsTrigger>
            <TabsTrigger value="matches">Matches ({matches.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <Badge variant={team.status === 'approved' ? 'default' : 'secondary'}>
                        {team.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{team.email}</p>
                    <p className="text-sm text-muted-foreground">{team.phone}</p>
                    {canManage && team.status === 'pending' && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => approveTeam(team.id)}
                      >
                        Approve Team
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4 mt-6">
            {matches.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No matches scheduled</h3>
                  <p className="text-muted-foreground">Matches will appear here once scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{match.team_a?.name || 'TBD'}</p>
                          <p className="text-2xl font-bold">{match.team_a_score}</p>
                        </div>
                        <div className="text-center px-4">
                          <Badge>{match.status}</Badge>
                          <p className="text-sm text-muted-foreground mt-2">
                            {new Date(match.scheduled_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">Field {match.field}</p>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-semibold">{match.team_b?.name || 'TBD'}</p>
                          <p className="text-2xl font-bold">{match.team_b_score}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Leaderboard feature coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TournamentDetail;

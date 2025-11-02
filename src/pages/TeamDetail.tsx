import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Trophy, Heart, Calendar, MapPin, Phone, Mail, Flag, Loader2, Award } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  captain_name: string;
  email: string;
  phone: string;
  status: string;
  logo_url: string | null;
  previous_experience: string | null;
  tournament_id: string;
  tournament: {
    name: string;
  } | null;
}

interface Player {
  id: string;
  name: string;
  age: number;
  gender: string;
  email: string;
}

interface Match {
  id: string;
  scheduled_time: string;
  field: string;
  team_a_score: number;
  team_b_score: number;
  status: string;
  team_a: { id: string; name: string };
  team_b: { id: string; name: string };
}

interface PerformanceStats {
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  point_differential: number;
  goals_for: number;
  goals_against: number;
}

interface SpiritScore {
  id: string;
  rules: number;
  fouls: number;
  fairness: number;
  attitude: number;
  communication: number;
  total: number;
  comments: string | null;
  submitted_at: string;
  from_team: { name: string };
  match_id: string;
}

const TeamDetail = () => {
  const { id, tournamentId } = useParams<{ id: string; tournamentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [spiritScores, setSpiritScores] = useState<SpiritScore[]>([]);

  useEffect(() => {
    if (id) {
      fetchTeamData();
    }
  }, [id, tournamentId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          tournament:tournaments(name)
        `)
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', id)
        .order('name');

      if (playersError) throw playersError;
      setPlayers(playersData || []);

      // Fetch matches for this team
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(id, name),
          team_b:teams!team_b_id(id, name)
        `)
        .or(`team_a_id.eq.${id},team_b_id.eq.${id}`)
        .order('scheduled_time', { ascending: false });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Fetch performance statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_team_performance', {
          _team_id: id,
          _tournament_id: teamData.tournament_id,
        });

      if (statsError) {
        console.error('Error fetching stats:', statsError);
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch spirit scores received by this team
      const { data: spiritData, error: spiritError } = await supabase
        .from('spirit_scores')
        .select(`
          *,
          from_team:teams!from_team_id(name)
        `)
        .eq('to_team_id', id)
        .order('submitted_at', { ascending: false });

      if (spiritError) {
        console.error('Error fetching spirit scores:', spiritError);
      } else {
        setSpiritScores(spiritData || []);
      }
    } catch (error: any) {
      console.error('Error fetching team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (total: number) => {
    if (total >= 18) return 'text-green-600';
    if (total >= 15) return 'text-primary';
    if (total >= 12) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOpponent = (match: Match, teamId: string) => {
    if (match.team_a.id === teamId) return match.team_b;
    return match.team_a;
  };

  const getTeamScore = (match: Match, teamId: string) => {
    if (match.team_a.id === teamId) return match.team_a_score;
    return match.team_b_score;
  };

  const getOpponentScore = (match: Match, teamId: string) => {
    if (match.team_a.id === teamId) return match.team_b_score;
    return match.team_a_score;
  };

  const getWinLossDraw = (match: Match, teamId: string) => {
    const teamScore = getTeamScore(match, teamId);
    const opponentScore = getOpponentScore(match, teamId);

    if (match.status !== 'completed') return null;
    if (teamScore > opponentScore) return 'W';
    if (teamScore < opponentScore) return 'L';
    return 'D';
  };

  const averageSpiritScore = spiritScores.length > 0
    ? (spiritScores.reduce((sum, score) => sum + score.total, 0) / spiritScores.length).toFixed(1)
    : 'N/A';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading team details...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Team Not Found</h2>
            <p className="text-muted-foreground mb-6">The team you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-start gap-6">
            {team.logo_url && (
              <img src={team.logo_url} alt={team.name} className="w-24 h-24 object-cover rounded-lg border-4 border-background shadow-lg" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{team.name}</h1>
                <Badge variant={
                  team.status === 'approved' || team.status === 'registered' ? 'default' :
                  team.status === 'rejected' ? 'destructive' : 'secondary'
                }>
                  {team.status}
                </Badge>
              </div>
              {team.tournament && (
                <p className="text-lg text-muted-foreground">{team.tournament.name}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{team.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{team.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Players</p>
                  <p className="text-3xl font-bold">{players.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Matches</p>
                  <p className="text-3xl font-bold">{matches.filter(m => m.status === 'completed').length}</p>
                </div>
                <Trophy className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-3xl font-bold">
                    {stats && stats.games_played > 0
                      ? `${((stats.wins / stats.games_played) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
                <Award className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Spirit Avg</p>
                  <p className="text-3xl font-bold">{averageSpiritScore}</p>
                </div>
                <Heart className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Team Info</TabsTrigger>
            <TabsTrigger value="players">Players ({players.length})</TabsTrigger>
            <TabsTrigger value="matches">Matches ({matches.length})</TabsTrigger>
            <TabsTrigger value="spirit">Spirit ({spiritScores.length})</TabsTrigger>
          </TabsList>

          {/* Team Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Captain</p>
                    <p className="text-lg">{team.captain_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Contact Email</p>
                    <p className="text-lg">{team.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Contact Phone</p>
                    <p className="text-lg">{team.phone}</p>
                  </div>
                  {team.previous_experience && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Previous Experience</p>
                      <p className="text-base whitespace-pre-wrap">{team.previous_experience}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats ? (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">{stats.wins}</p>
                          <p className="text-sm text-muted-foreground">Wins</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-destructive">{stats.losses}</p>
                          <p className="text-sm text-muted-foreground">Losses</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-blue-600">{stats.draws}</p>
                          <p className="text-sm text-muted-foreground">Draws</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Games Played</span>
                          <span className="font-semibold">{stats.games_played}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Point Differential</span>
                          <span className="font-semibold">{stats.point_differential >= 0 ? '+' : ''}{stats.point_differential}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Goals For</span>
                          <span className="font-semibold">{stats.goals_for}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Goals Against</span>
                          <span className="font-semibold">{stats.goals_against}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No statistics available yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Roster</CardTitle>
                <CardDescription>{players.length} players registered</CardDescription>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No players registered</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {players.map((player) => (
                          <TableRow key={player.id}>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>{player.age}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {player.gender}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{player.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Match History</CardTitle>
                <CardDescription>All matches played by {team.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No matches scheduled yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => {
                      const opponent = getOpponent(match, id!);
                      const teamScore = getTeamScore(match, id!);
                      const opponentScore = getOpponentScore(match, id!);
                      const result = getWinLossDraw(match, id!);

                      return (
                        <Card key={match.id} className="cursor-pointer hover:shadow-lg transition-all">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold">{opponent.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                                    {match.status}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {match.field}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(match.scheduled_time).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-center px-6">
                                {match.status === 'completed' && (
                                  <Badge
                                    variant={
                                      result === 'W' ? 'default' :
                                      result === 'L' ? 'destructive' :
                                      'secondary'
                                    }
                                    className="mb-2"
                                  >
                                    {result}
                                  </Badge>
                                )}
                                <p className="text-2xl font-bold">
                                  {teamScore} - {opponentScore}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spirit Scores Tab */}
          <TabsContent value="spirit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Spirit Scores</CardTitle>
                <CardDescription>
                  Average: <span className={getScoreColor(parseFloat(averageSpiritScore.toString()))}>{averageSpiritScore}</span>/20
                </CardDescription>
              </CardHeader>
              <CardContent>
                {spiritScores.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No spirit scores received yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {spiritScores.map((score) => (
                      <Card key={score.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {score.from_team.name}
                            </CardTitle>
                            <div className="flex items-center">
                              <span className={`text-3xl font-black ${getScoreColor(score.total)}`}>
                                {score.total}
                              </span>
                              <span className="text-sm text-muted-foreground ml-1">/20</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            {([
                              { key: 'rules', value: score.rules },
                              { key: 'fouls', value: score.fouls },
                              { key: 'fairness', value: score.fairness },
                              { key: 'attitude', value: score.attitude },
                              { key: 'communication', value: score.communication },
                            ]).map((item) => (
                              <div key={item.key} className="text-center">
                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                  {item.key.substring(0, 4)}
                                </div>
                                <div className="text-2xl font-black text-primary">
                                  {item.value}
                                </div>
                              </div>
                            ))}
                          </div>
                          {score.comments && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{score.comments}</p>
                            </div>
                          )}
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(score.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeamDetail;


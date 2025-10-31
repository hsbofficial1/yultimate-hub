import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Download, FileSpreadsheet, Trophy, Award, Target, TrendingUp, Clock, MapPin, Users } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
}

interface MVP {
  team_id: string;
  team_name: string;
  avg_score: number;
  avg_spirit: number;
  combined_score: number;
}

interface SpiritTrend {
  date: string;
  avg_score: number;
}

interface PoolCompetitiveness {
  pool: string;
  avg_differential: number;
  close_games: number;
}

const TournamentReports = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [finalStandings, setFinalStandings] = useState<any[]>([]);
  const [spiritScores, setSpiritScores] = useState<any[]>([]);
  const [mvps, setMvps] = useState<MVP[]>([]);
  const [spiritTrend, setSpiritTrend] = useState<SpiritTrend[]>([]);
  const [poolCompetitiveness, setPoolCompetitiveness] = useState<PoolCompetitiveness[]>([]);
  const [fieldUtilization, setFieldUtilization] = useState<any[]>([]);
  const [avgMatchDuration, setAvgMatchDuration] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [compareYear, setCompareYear] = useState<string>('');
  const [previousYears, setPreviousYears] = useState<string[]>([]);

  const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(25, 95%, 53%)', 'hsl(280, 70%, 55%)'];

  useEffect(() => {
    if (id) {
      fetchTournamentData();
      fetchPreviousTournaments();
    }
  }, [id, compareYear]);

  const fetchPreviousTournaments = async () => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('id, name, start_date')
        .eq('status', 'completed')
        .order('start_date', { ascending: false });

      const years = data?.map(t => new Date(t.start_date).getFullYear().toString()) || [];
      setPreviousYears([...new Set(years)]);
    } catch (error) {
      console.error('Error fetching previous tournaments:', error);
    }
  };

  const fetchTournamentData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch tournament details
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      setTournament(tournamentData);

      // Fetch final standings
      const { data: standings } = await supabase
        .from('combined_leaderboard')
        .select('*')
        .eq('tournament_id', id)
        .order('final_rank', { ascending: true });

      setFinalStandings(standings || []);

      // Fetch spirit scores by team
      const { data: spirit } = await supabase
        .from('spirit_leaderboard')
        .select('*')
        .eq('tournament_id', id)
        .order('avg_spirit_score', { ascending: false });

      setSpiritScores(spirit || []);

      // Calculate MVPs (top scorer + highest spirit)
      await calculateMVPs(id);

      // Fetch spirit trends over time
      await fetchSpiritTrends(id);

      // Calculate pool competitiveness
      await calculatePoolCompetitiveness(id);

      // Calculate field utilization
      await calculateFieldUtilization(id);

    } catch (error: any) {
      toast({
        title: 'Error fetching tournament data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMVPs = async (tournamentId: string) => {
    try {
      // Get top scoring teams
      const { data: topScorers } = await supabase
        .from('performance_leaderboard')
        .select('team_id, team_name, goals_for')
        .eq('tournament_id', tournamentId)
        .order('goals_for', { ascending: false })
        .limit(10);

      // Get top spirit teams
      const { data: topSpirit } = await supabase
        .from('spirit_leaderboard')
        .select('team_id, team_name, avg_spirit_score')
        .eq('tournament_id', tournamentId)
        .order('avg_spirit_score', { ascending: false })
        .limit(10);

      // Combine and calculate MVP scores
      const mvpMap = new Map<string, MVP>();
      
      topScorers?.forEach((team: any) => {
        mvpMap.set(team.team_id, {
          team_id: team.team_id,
          team_name: team.team_name,
          avg_score: team.goals_for,
          avg_spirit: 0,
          combined_score: team.goals_for,
        });
      });

      topSpirit?.forEach((team: any) => {
        const existing = mvpMap.get(team.team_id);
        if (existing) {
          existing.avg_spirit = team.avg_spirit_score;
          existing.combined_score = existing.avg_score * 0.5 + team.avg_spirit_score * 0.5;
        } else {
          mvpMap.set(team.team_id, {
            team_id: team.team_id,
            team_name: team.team_name,
            avg_score: 0,
            avg_spirit: team.avg_spirit_score,
            combined_score: team.avg_spirit_score * 0.5,
          });
        }
      });

      const mvpList = Array.from(mvpMap.values())
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, 5);

      setMvps(mvpList);
    } catch (error) {
      console.error('Error calculating MVPs:', error);
    }
  };

  const fetchSpiritTrends = async (tournamentId: string) => {
    try {
      const { data: matches } = await supabase
        .from('matches')
        .select('id, scheduled_time')
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .order('scheduled_time', { ascending: true });

      if (!matches) return;

      const trend = await Promise.all(
        matches.slice(0, 10).map(async (match: any) => {
          const { data: spirits } = await supabase
            .from('spirit_scores')
            .select('total')
            .eq('match_id', match.id);

          const avg = spirits && spirits.length > 0
            ? spirits.reduce((sum: number, s: any) => sum + s.total, 0) / spirits.length
            : 0;

          return {
            date: new Date(match.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            avg_score: parseFloat(avg.toFixed(1)),
          };
        })
      );

      setSpiritTrend(trend);
    } catch (error) {
      console.error('Error fetching spirit trends:', error);
    }
  };

  const calculatePoolCompetitiveness = async (tournamentId: string) => {
    try {
      const { data: matches } = await supabase
        .from('matches')
        .select('pool, team_a_score, team_b_score')
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed');

      if (!matches) return;

      const poolMap = new Map<string, { totals: number[], closeGames: number }>();

      matches.forEach((match: any) => {
        if (!match.pool) return;
        
        const differential = Math.abs(match.team_a_score - match.team_b_score);
        const existing = poolMap.get(match.pool) || { totals: [], closeGames: 0 };
        existing.totals.push(differential);
        if (differential <= 2) existing.closeGames++;
        poolMap.set(match.pool, existing);
      });

      const competitiveness = Array.from(poolMap.entries()).map(([pool, data]) => ({
        pool,
        avg_differential: parseFloat((data.totals.reduce((a, b) => a + b, 0) / data.totals.length).toFixed(1)),
        close_games: data.closeGames,
      })).sort((a, b) => a.avg_differential - b.avg_differential);

      setPoolCompetitiveness(competitiveness);
    } catch (error) {
      console.error('Error calculating pool competitiveness:', error);
    }
  };

  const calculateFieldUtilization = async (tournamentId: string) => {
    try {
      const { data: matches } = await supabase
        .from('matches')
        .select('field')
        .eq('tournament_id', tournamentId);

      if (!matches) return;

      const fieldCounts = matches.reduce((acc: any, match: any) => {
        acc[match.field] = (acc[match.field] || 0) + 1;
        return acc;
      }, {});

      const utilization = Object.entries(fieldCounts).map(([field, count]) => ({
        field,
        matches: count,
      }));

      setFieldUtilization(utilization);
    } catch (error) {
      console.error('Error calculating field utilization:', error);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Fetch all match results
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(name),
          team_b:teams!team_b_id(name)
        `)
        .eq('tournament_id', id)
        .eq('status', 'completed');

      // Create comprehensive data object
      const exportData = {
        tournament: tournament,
        finalStandings: finalStandings,
        spiritScores: spiritScores,
        mvps: mvps,
        matchResults: matches || [],
      };

      // Convert to JSON for now (can be enhanced with Excel library)
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tournament?.name || 'tournament'}_report_${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Report exported',
        description: 'Tournament report has been downloaded',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading tournament reports...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/tournament/${id}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{tournament.name} - Reports</h1>
                <p className="text-sm text-muted-foreground">{tournament.location}</p>
              </div>
            </div>
            <Button onClick={exportToExcel} disabled={exporting}>
              {exporting ? (
                'Exporting...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="mvps">MVPs</TabsTrigger>
            <TabsTrigger value="comparison">Historical</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {/* Final Standings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Final Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {finalStandings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No standings available yet</p>
                ) : (
                  <div className="space-y-3">
                    {finalStandings.slice(0, 10).map((team: any, index: number) => (
                      <div key={team.team_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-black text-primary w-8">#{team.final_rank}</span>
                          <div>
                            <h3 className="font-bold">{team.team_name}</h3>
                            <p className="text-sm text-muted-foreground">Perf: #{team.perf_rank} | Spirit: #{team.spirit_rank}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{team.wins}-{team.losses}</div>
                          <div className="text-sm text-muted-foreground">
                            {team.avg_spirit_score.toFixed(1)} avg spirit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spirit Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Spirit Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spiritScores.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No spirit scores yet</p>
                ) : (
                  <div className="space-y-3">
                    {spiritScores.slice(0, 5).map((team: any) => (
                      <div key={team.team_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-black text-primary">#{team.rank_position}</span>
                          <h3 className="font-bold">{team.team_name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-primary">{team.avg_spirit_score}</div>
                          <div className="text-sm text-muted-foreground">{team.scores_received} ratings</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Spirit Score Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Spirit Score Trends</CardTitle>
                <CardDescription>Average spirit scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                {spiritTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={spiritTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avg_score" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={2}
                        name="Average Spirit Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No spirit score data available</p>
                )}
              </CardContent>
            </Card>

            {/* Pool Competitiveness */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pool Competitiveness</CardTitle>
                  <CardDescription>Closest average score differentials</CardDescription>
                </CardHeader>
                <CardContent>
                  {poolCompetitiveness.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={poolCompetitiveness}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="pool" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avg_differential" fill="hsl(217, 91%, 60%)" name="Avg Differential" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No pool data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Field Utilization</CardTitle>
                  <CardDescription>Matches per field</CardDescription>
                </CardHeader>
                <CardContent>
                  {fieldUtilization.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={fieldUtilization}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ field, matches }) => `${field}: ${matches}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="matches"
                        >
                          {fieldUtilization.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No field data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MVPs Tab */}
          <TabsContent value="mvps">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  MVP Teams
                </CardTitle>
                <CardDescription>Top scorers with best spirit scores</CardDescription>
              </CardHeader>
              <CardContent>
                {mvps.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No MVP data available yet</p>
                ) : (
                  <div className="space-y-4">
                    {mvps.map((mvp, index) => (
                      <Card key={mvp.team_id} className={index === 0 ? 'border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {index === 0 && <Trophy className="h-8 w-8 text-yellow-500" />}
                              <div>
                                <h3 className="font-bold text-lg">{mvp.team_name}</h3>
                                <p className="text-sm text-muted-foreground">MVP Score: {mvp.combined_score.toFixed(1)}</p>
                              </div>
                            </div>
                            <div className="flex gap-8">
                              <div className="text-center">
                                <div className="text-2xl font-black text-primary">{mvp.avg_score}</div>
                                <div className="text-sm text-muted-foreground">Goals</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-black text-primary">{mvp.avg_spirit.toFixed(1)}</div>
                                <div className="text-sm text-muted-foreground">Spirit</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Comparison */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Historical Comparison</CardTitle>
                <CardDescription>Compare with previous tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={compareYear} onValueChange={setCompareYear}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select year to compare" />
                    </SelectTrigger>
                    <SelectContent>
                      {previousYears.map(year => (
                        <SelectItem key={year} value={year}>{year} Tournaments</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {compareYear && (
                    <p className="text-center text-muted-foreground py-8">
                      Comparison feature coming soon
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TournamentReports;


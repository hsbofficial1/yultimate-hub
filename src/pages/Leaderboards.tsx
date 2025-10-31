import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Heart, Medal } from 'lucide-react';

interface PerformanceTeam {
  team_id: string;
  team_name: string;
  pool: string | null;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  point_differential: number;
  goals_for: number;
  goals_against: number;
  rank_position: number;
}

interface SpiritTeam {
  team_id: string;
  team_name: string;
  avg_spirit_score: number;
  scores_received: number;
  rank_position: number;
}

interface CombinedTeam {
  team_id: string;
  team_name: string;
  pool: string | null;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  point_differential: number;
  perf_rank: number;
  avg_spirit_score: number;
  spirit_rank: number;
  combined_score: number;
  final_rank: number;
}

const Leaderboards = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [activeTab, setActiveTab] = useState('performance');
  const [selectedPool, setSelectedPool] = useState<string>('all');
  const [pools, setPools] = useState<string[]>([]);
  const [performanceTeams, setPerformanceTeams] = useState<PerformanceTeam[]>([]);
  const [spiritTeams, setSpiritTeams] = useState<SpiritTeam[]>([]);
  const [combinedTeams, setCombinedTeams] = useState<CombinedTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tournamentId) {
      fetchLeaderboards();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('leaderboard-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `tournament_id=eq.${tournamentId}`,
          },
          () => fetchLeaderboards()
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'spirit_scores',
          },
          () => fetchLeaderboards()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tournamentId, selectedPool]);

  const fetchLeaderboards = async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);

      // Fetch pools
      const { data: poolsData } = await supabase
        .from('matches')
        .select('pool')
        .eq('tournament_id', tournamentId)
        .not('pool', 'is', null);

      const uniquePools = [...new Set(poolsData?.map(m => m.pool).filter(Boolean) || [])] as string[];
      setPools(uniquePools);

      // Fetch performance leaderboard
      const { data: perfData } = await supabase
        .from('performance_leaderboard')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('rank_position', { ascending: true });

      const filteredPerf = selectedPool === 'all' 
        ? perfData || []
        : perfData?.filter(t => t.pool === selectedPool) || [];
      setPerformanceTeams(filteredPerf as PerformanceTeam[]);

      // Fetch spirit leaderboard
      const { data: spiritData } = await supabase
        .from('spirit_leaderboard')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('rank_position', { ascending: true });

      setSpiritTeams(spiritData as SpiritTeam[] || []);

      // Fetch combined leaderboard
      const { data: combinedData } = await supabase
        .from('combined_leaderboard')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('final_rank', { ascending: true });

      const filteredCombined = selectedPool === 'all'
        ? combinedData || []
        : combinedData?.filter(t => t.pool === selectedPool) || [];
      setCombinedTeams(filteredCombined as CombinedTeam[] || []);

    } catch (error: any) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground w-5">#{rank}</span>;
  };

  const getPerformanceRankColor = (rank: number) => {
    if (rank === 1) return 'border-yellow-500 border-2 bg-yellow-50 dark:bg-yellow-950/20';
    if (rank === 2) return 'border-gray-400 border-2 bg-gray-50 dark:bg-gray-950/20';
    if (rank === 3) return 'border-amber-600 border-2 bg-amber-50 dark:bg-amber-950/20';
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading leaderboards...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link to={`/tournament/${tournamentId}`} className="text-primary hover:underline mb-2 inline-block">
            ← Back to Tournament
          </Link>
          <h1 className="text-4xl font-bold mb-2">Leaderboards</h1>
          <p className="text-muted-foreground">Real-time tournament standings and spirit scores</p>
        </div>

        {/* Pool Filter */}
        {pools.length > 0 && (
          <div className="mb-6">
            <Select value={selectedPool} onValueChange={setSelectedPool}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by pool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pools</SelectItem>
                {pools.map(pool => (
                  <SelectItem key={pool} value={pool}>{pool}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="spirit" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Spirit
            </TabsTrigger>
            <TabsTrigger value="combined" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Combined
            </TabsTrigger>
          </TabsList>

          {/* Performance Leaderboard */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceTeams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No completed matches yet</p>
                ) : (
                  <div className="space-y-3">
                    {performanceTeams.map((team) => (
                      <Card key={team.team_id} className={getPerformanceRankColor(team.rank_position)}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center w-12">
                                {getRankIcon(team.rank_position)}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{team.team_name}</h3>
                                {team.pool && (
                                  <Badge variant="outline" className="mt-1">{team.pool}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-6 text-center">
                              <div>
                                <div className="text-2xl font-black text-primary">{team.wins}-{team.losses}</div>
                                <div className="text-xs text-muted-foreground">W-L</div>
                              </div>
                              <div>
                                <div className="text-2xl font-black text-primary">{team.draws}</div>
                                <div className="text-xs text-muted-foreground">Draws</div>
                              </div>
                              <div>
                                <div className="text-2xl font-black text-primary">{team.games_played}</div>
                                <div className="text-xs text-muted-foreground">GP</div>
                              </div>
                              <div>
                                <div className={`text-2xl font-black ${team.point_differential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {team.point_differential > 0 ? '+' : ''}{team.point_differential}
                                </div>
                                <div className="text-xs text-muted-foreground">Diff</div>
                              </div>
                              <div>
                                <div className="text-2xl font-black text-primary">{team.goals_for}/{team.goals_against}</div>
                                <div className="text-xs text-muted-foreground">GF/GA</div>
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

          {/* Spirit Leaderboard */}
          <TabsContent value="spirit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Spirit of the Game Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spiritTeams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No spirit scores submitted yet</p>
                ) : (
                  <div className="space-y-3">
                    {spiritTeams.map((team) => (
                      <Card key={team.team_id} className={getPerformanceRankColor(team.rank_position)}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center w-12">
                                {getRankIcon(team.rank_position)}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{team.team_name}</h3>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-12 text-center">
                              <div>
                                <div className="text-3xl font-black text-primary">{team.avg_spirit_score.toFixed(1)}</div>
                                <div className="text-xs text-muted-foreground">Average Score /20</div>
                              </div>
                              <div>
                                <div className="text-3xl font-black text-primary">{team.scores_received}</div>
                                <div className="text-xs text-muted-foreground">Scores Received</div>
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

          {/* Combined Leaderboard */}
          <TabsContent value="combined">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Combined Leaderboard (70% Performance, 30% Spirit)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {combinedTeams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {combinedTeams.map((team) => (
                      <Card key={team.team_id} className={getPerformanceRankColor(team.final_rank)}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center w-12">
                                {getRankIcon(team.final_rank)}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{team.team_name}</h3>
                                {team.pool && (
                                  <Badge variant="outline" className="mt-1">{team.pool}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-6 text-center">
                              <div>
                                <div className="text-2xl font-black text-primary">{team.wins}-{team.losses}</div>
                                <div className="text-xs text-muted-foreground">W-L (#{team.perf_rank})</div>
                              </div>
                              <div>
                                <div className={`text-2xl font-black ${team.point_differential >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {team.point_differential > 0 ? '+' : ''}{team.point_differential}
                                </div>
                                <div className="text-xs text-muted-foreground">Diff</div>
                              </div>
                              <div>
                                <div className="text-2xl font-black text-primary">{team.avg_spirit_score.toFixed(1)}</div>
                                <div className="text-xs text-muted-foreground">Spirit (#{team.spirit_rank})</div>
                              </div>
                              <div>
                                <div className="text-2xl font-black text-primary">{team.combined_score.toFixed(1)}</div>
                                <div className="text-xs text-muted-foreground">Combined</div>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboards;


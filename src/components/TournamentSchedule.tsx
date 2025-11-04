import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Loader2,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Match {
  id: string;
  match_number?: string;
  scheduled_time: string;
  field: string;
  pool?: string;
  round?: string;
  team_a: { id: string; name: string };
  team_b: { id: string; name: string };
  team_a_score: number;
  team_b_score: number;
  status: string;
  winner?: string;
  loser?: string;
}

interface PoolStanding {
  team_id: string;
  team_name: string;
  seed: number;
  pool_code: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  points: number;
}

interface TournamentScheduleProps {
  tournamentId: string;
  canManage: boolean;
}

const POOL_COLORS: Record<string, string> = {
  'Pool A': 'bg-red-100 border-red-300',
  'Pool B': 'bg-orange-100 border-orange-300',
  'Pool C': 'bg-green-100 border-green-300',
  'Pool D': 'bg-blue-100 border-blue-300',
  'Pool E': 'bg-purple-100 border-purple-300',
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  'QF': 'bg-blue-500 text-white',
  'SF': 'bg-purple-500 text-white',
  'Finals': 'bg-yellow-500 text-white',
  '3PF': 'bg-orange-500 text-white',
  '5SF': 'bg-indigo-500 text-white',
  '5PF': 'bg-teal-500 text-white',
  '7PF': 'bg-pink-500 text-white',
};

export const TournamentSchedule = ({ tournamentId, canManage }: TournamentScheduleProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [poolStandings, setPoolStandings] = useState<Record<string, PoolStanding[]>>({});
  const [tournament, setTournament] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [showMeals, setShowMeals] = useState(true);
  const [showFormat, setShowFormat] = useState(true);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch tournament
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      setTournament(tournamentData);

      // Fetch matches with team details
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(id, name, seed_number),
          team_b:teams!team_b_id(id, name, seed_number)
        `)
        .eq('tournament_id', tournamentId)
        .order('scheduled_time', { ascending: true });

      if (matchesError) throw matchesError;

      // Process matches
      const processedMatches: Match[] = (matchesData || []).map((match: any, index: number) => {
        const winner = match.status === 'completed'
          ? match.team_a_score > match.team_b_score
            ? match.team_a.name
            : match.team_b_score > match.team_a_score
            ? match.team_b.name
            : 'Draw'
          : undefined;

        const loser = match.status === 'completed' && winner && winner !== 'Draw'
          ? match.team_a_score > match.team_b_score
            ? match.team_b.name
            : match.team_a.name
          : undefined;

        return {
          id: match.id,
          match_number: `M${index + 1}`,
          scheduled_time: match.scheduled_time,
          field: match.field,
          pool: match.pool,
          round: match.round,
          team_a: match.team_a,
          team_b: match.team_b,
          team_a_score: match.team_a_score,
          team_b_score: match.team_b_score,
          status: match.status,
          winner,
          loser,
        };
      });

      setMatches(processedMatches);

      // Calculate pool standings
      await calculatePoolStandings(processedMatches);
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast({
        title: 'Error loading schedule',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePoolStandings = async (matches: Match[]) => {
    try {
      // Fetch teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, seed_number')
        .eq('tournament_id', tournamentId)
        .in('status', ['approved', 'registered']);

      if (!teamsData) return;

      // Fetch pools
      const { data: poolsData } = await supabase
        .from('tournament_pools')
        .select('id, pool_name')
        .eq('tournament_id', tournamentId);

      // Fetch pool assignments separately
      const poolIds = poolsData?.map(p => p.id) || [];
      const { data: assignmentsData } = await supabase
        .from('team_pool_assignments')
        .select('pool_id, team_id, seed_number')
        .in('pool_id', poolIds);

      const poolMap: Record<string, PoolStanding[]> = {};

      // Initialize standings for each pool
      if (poolsData && assignmentsData) {
        poolsData.forEach((pool: any) => {
          const poolName = pool.pool_name;
          poolMap[poolName] = [];

          const poolAssignments = assignmentsData.filter(a => a.pool_id === pool.id);
          poolAssignments.forEach((assignment: any) => {
            const team = teamsData.find(t => t.id === assignment.team_id);
            if (team) {
              poolMap[poolName].push({
                team_id: team.id,
                team_name: team.name,
                seed: assignment.seed_number || team.seed_number || 0,
                pool_code: pool.pool_name,
                games_played: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                goals_scored: 0,
                goals_conceded: 0,
                goal_difference: 0,
                points: 0,
              });
            }
          });
        });
      }

      // Calculate statistics from completed matches
      matches
        .filter(m => m.status === 'completed' && m.pool)
        .forEach(match => {
          const pool = poolMap[match.pool || ''];
          if (!pool) return;

          // Find team standings
          const teamA = pool.find(t => t.team_id === match.team_a.id);
          const teamB = pool.find(t => t.team_id === match.team_b.id);

          if (teamA && teamB) {
            // Update Team A
            teamA.games_played++;
            teamA.goals_scored += match.team_a_score;
            teamA.goals_conceded += match.team_b_score;
            teamA.goal_difference = teamA.goals_scored - teamA.goals_conceded;

            // Update Team B
            teamB.games_played++;
            teamB.goals_scored += match.team_b_score;
            teamB.goals_conceded += match.team_a_score;
            teamB.goal_difference = teamB.goals_scored - teamB.goals_conceded;

            // Determine winner/loser/draw
            if (match.team_a_score > match.team_b_score) {
              teamA.wins++;
              teamA.points += 3;
              teamB.losses++;
            } else if (match.team_b_score > match.team_a_score) {
              teamB.wins++;
              teamB.points += 3;
              teamA.losses++;
            } else {
              teamA.draws++;
              teamB.draws++;
              teamA.points += 1;
              teamB.points += 1;
            }
          }
        });

      // Sort by points, goal difference, goals scored
      Object.keys(poolMap).forEach(poolName => {
        poolMap[poolName].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
          return b.goals_scored - a.goals_scored;
        });
      });

      setPoolStandings(poolMap);
    } catch (error: any) {
      console.error('Error calculating standings:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMatchType = (match: Match): string => {
    if (match.round === 'quarterfinal' || match.round?.includes('QF')) return 'QF';
    if (match.round === 'semifinal' || match.round?.includes('SF')) return 'SF';
    if (match.round === 'final' || match.round?.includes('Final')) return 'Finals';
    if (match.round?.includes('3PF')) return '3PF';
    if (match.round?.includes('5SF')) return '5SF';
    if (match.round?.includes('5PF')) return '5PF';
    if (match.round?.includes('7PF')) return '7PF';
    return match.pool || '';
  };

  const getDays = () => {
    const days = new Set<string>();
    matches.forEach(match => {
      const date = new Date(match.scheduled_time);
      days.add(date.toISOString().split('T')[0]);
    });
    return Array.from(days).sort();
  };

  const getFields = () => {
    const fields = new Set<string>();
    matches.forEach(match => fields.add(match.field));
    return Array.from(fields).sort();
  };

  const filteredMatches = matches.filter(match => {
    const matchDate = new Date(match.scheduled_time).toISOString().split('T')[0];
    const dayMatch = selectedDay === 'all' || matchDate === selectedDay;
    const fieldMatch = selectedField === 'all' || match.field === selectedField;
    return dayMatch && fieldMatch;
  });

  const groupMatchesByDayAndField = () => {
    const grouped: Record<string, Record<string, Match[]>> = {};

    filteredMatches.forEach(match => {
      const date = new Date(match.scheduled_time);
      const dayKey = date.toISOString().split('T')[0];
      const fieldKey = match.field;

      if (!grouped[dayKey]) grouped[dayKey] = {};
      if (!grouped[dayKey][fieldKey]) grouped[dayKey][fieldKey] = [];

      grouped[dayKey][fieldKey].push(match);
    });

    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading tournament schedule...</p>
        </CardContent>
      </Card>
    );
  }

  const days = getDays();
  const fields = getFields();
  const groupedMatches = groupMatchesByDayAndField();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Tournament Schedule & Results</h3>
          <p className="text-muted-foreground">View matches, standings, and brackets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Days</option>
                {days.map(day => (
                  <option key={day} value={day}>
                    {formatDate(day)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Fields</option>
                {fields.map(field => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMeals(!showMeals)}
            >
              {showMeals ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showMeals ? 'Hide' : 'Show'} Meals
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFormat(!showFormat)}
            >
              {showFormat ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showFormat ? 'Hide' : 'Show'} Format
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Format */}
      {showFormat && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="bg-red-500 text-white rounded-t-lg">
            <CardTitle>Format</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p>• Pools 1-12 (3 pools of 4 teams). Then Re-seed within pools.</p>
              <p>• Top 8 play Quarter final, semi final and finals, Winner takes higher Seed</p>
              <p>• Teams 9-12 will play round robin (Pool E) to determine final position.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Match Schedules */}
        <div className="lg:col-span-2 space-y-6">
          {days.map(day => (
            <Card key={day}>
              <CardHeader className="bg-primary text-primary-foreground">
                <CardTitle>{formatDate(day)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.map(field => {
                    const fieldMatches = groupedMatches[day]?.[field] || [];
                    if (fieldMatches.length === 0) return null;

                    return (
                      <div key={field} className="space-y-4">
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {field}
                        </h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Match</TableHead>
                                <TableHead className="w-20">Start</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Team 1</TableHead>
                                <TableHead className="w-20">Score</TableHead>
                                <TableHead>Team 2</TableHead>
                                <TableHead>Winner</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fieldMatches.map((match) => {
                                const matchType = getMatchType(match);
                                const isCompleted = match.status === 'completed';
                                const typeColor = MATCH_TYPE_COLORS[matchType] || 'bg-gray-500 text-white';

                                return (
                                  <TableRow key={match.id} className={isCompleted ? 'bg-green-50' : ''}>
                                    <TableCell className="font-mono font-bold">
                                      {match.match_number}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                      {formatTime(match.scheduled_time)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={typeColor}>{matchType}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {match.team_a.name}
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-center">
                                      {isCompleted
                                        ? `${match.team_a_score} v ${match.team_b_score}`
                                        : 'v'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {match.team_b.name}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {match.winner && (
                                        <span className={match.winner === 'Draw' ? 'text-orange-600' : 'text-green-600 font-bold'}>
                                          {match.winner}
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right Column: Pool Standings & Info */}
        <div className="space-y-6">
          {/* Pool Standings */}
          {Object.entries(poolStandings).map(([poolName, standings]) => {
            const poolColor = POOL_COLORS[poolName] || 'bg-gray-100 border-gray-300';
            const headerColor = poolName.includes('A') ? 'bg-red-500'
              : poolName.includes('B') ? 'bg-orange-500'
              : poolName.includes('C') ? 'bg-green-500'
              : poolName.includes('D') ? 'bg-blue-500'
              : 'bg-purple-500';

            return (
              <Card key={poolName} className={`${poolColor} border-2`}>
                <CardHeader className={`${headerColor} text-white rounded-t-lg`}>
                  <CardTitle>{poolName} Standings</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Seed</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="w-8">n</TableHead>
                          <TableHead className="w-8">s</TableHead>
                          <TableHead className="w-8">w</TableHead>
                          <TableHead className="w-12">GS</TableHead>
                          <TableHead className="w-12">GC</TableHead>
                          <TableHead className="w-12">GD</TableHead>
                          <TableHead className="w-12">Pts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {standings.map((team, index) => (
                          <TableRow key={team.team_id}>
                            <TableCell className="font-bold">{team.seed || index + 1}</TableCell>
                            <TableCell className="text-sm font-semibold">{team.team_name}</TableCell>
                            <TableCell className="text-center">{team.games_played}</TableCell>
                            <TableCell className="text-center text-green-600 font-bold">{team.wins}</TableCell>
                            <TableCell className="text-center text-red-600 font-bold">{team.losses}</TableCell>
                            <TableCell className="text-center">{team.goals_scored}</TableCell>
                            <TableCell className="text-center">{team.goals_conceded}</TableCell>
                            <TableCell className={`text-center font-bold ${team.goal_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {team.goal_difference >= 0 ? '+' : ''}{team.goal_difference}
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-600">{team.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Meal Schedule */}
          {showMeals && (
            <Card>
              <CardHeader>
                <CardTitle>Meal Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-blue-50 rounded">Breakfast for Pool A</div>
                  <div className="p-2 bg-orange-50 rounded">Breakfast for Pool B</div>
                  <div className="p-2 bg-green-50 rounded">Breakfast for Pool C</div>
                  <div className="p-2 bg-yellow-50 rounded mt-4">Lunch for M27 to M30</div>
                  <div className="p-2 bg-yellow-50 rounded">Lunch for Pool D</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

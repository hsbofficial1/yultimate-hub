import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trophy, Users, BarChart3, LogOut, UserCircle2, Baby, CalendarDays, Target, Award, Activity, AlertTriangle, Sparkles, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AbsenceAlerts } from '@/components/AbsenceAlerts';
import { StreakLeaderboard } from '@/components/StreakLeaderboard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts';

const Dashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [tournamentCount, setTournamentCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [recentMatches, setRecentMatches] = useState<Array<{ id: string; created_at?: string }>>([]);
  const [trends] = useState<Array<{ label: string; matches: number; players: number }>>([
    { label: 'Mon', matches: 12, players: 45 },
    { label: 'Tue', matches: 18, players: 52 },
    { label: 'Wed', matches: 15, players: 49 },
    { label: 'Thu', matches: 20, players: 58 },
    { label: 'Fri', matches: 22, players: 61 },
    { label: 'Sat', matches: 26, players: 73 },
    { label: 'Sun', matches: 14, players: 40 },
  ]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  const fetchStats = async () => {
    try {
      const [tournaments, teams, matches, children] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact' }),
        supabase.from('teams').select('id', { count: 'exact' }),
        supabase.from('matches').select('id', { count: 'exact' }),
        supabase.from('children').select('id', { count: 'exact' }),
      ]);

      setTournamentCount(tournaments.count || 0);
      setTeamCount(teams.count || 0);
      setMatchCount(matches.count || 0);
      setChildrenCount(children.count || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && data) setRecentMatches(data as any);
    } catch (err) {
      // ignore
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Y-Ultimate
              </h1>
              <p className="text-xs text-muted-foreground">
                Ultimate Frisbee Management
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tournaments, teams, players..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30">
              <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-xs font-medium">{user?.email}</p>
                  <Badge variant="outline" className="text-xs">{userRole?.replace('_', ' ')}</Badge>
                </div>
              </button>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-base font-medium text-muted-foreground">Loading stats...</p>
          </div>
        ) : (
          <div className="space-y-8 section-appear">
            {/* Stats Grid */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-foreground">Overview</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card 
                  className="cursor-pointer border border-border bg-card group elevated-card"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">Tournaments</CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Trophy className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-foreground mb-1">{tournamentCount}</div>
                    <p className="text-xs text-muted-foreground">Active competitions</p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer border border-border bg-card group elevated-card"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">Teams</CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors">
                      <Target className="h-4 w-4 text-secondary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-foreground mb-1">{teamCount}</div>
                    <p className="text-xs text-muted-foreground">Registered teams</p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer border border-border bg-card group elevated-card"
                  onClick={() => navigate('/matches')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">Matches</CardTitle>
                    <div className="h-9 w-9 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors">
                      <Award className="h-4 w-4 text-secondary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold text-foreground mb-1">{matchCount}</div>
                    <p className="text-xs text-muted-foreground">Total games</p>
                  </CardContent>
                </Card>

                {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                  <Card 
                    className="cursor-pointer border border-border bg-card group elevated-card"
                    onClick={() => navigate('/children')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium text-muted-foreground">Players</CardTitle>
                      <div className="h-9 w-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                        <Baby className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-semibold text-foreground mb-1">{childrenCount}</div>
                      <p className="text-xs text-muted-foreground">Active players</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-foreground">Quick Access</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card 
                  className="cursor-pointer group border border-border bg-card elevated-card"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold mb-0.5">Tournaments</CardTitle>
                        <CardDescription className="text-xs">Browse & manage</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                  <>
                    <Card 
                      className="cursor-pointer group border border-border bg-card elevated-card"
                      onClick={() => navigate('/children')}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors flex items-center justify-center">
                            <Baby className="h-5 w-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold mb-0.5">Players</CardTitle>
                            <CardDescription className="text-xs">Manage participants</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Card 
                      className="cursor-pointer group border border-border bg-card elevated-card"
                      onClick={() => navigate('/sessions')}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors flex items-center justify-center">
                            <CalendarDays className="h-5 w-5 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold mb-0.5">Sessions</CardTitle>
                            <CardDescription className="text-xs">Schedule & track</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Card 
                      className="cursor-pointer group border border-border bg-card elevated-card"
                      onClick={() => navigate('/reports')}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold mb-0.5">Reports</CardTitle>
                            <CardDescription className="text-xs">Analytics & insights</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* Trends and Streaks */}
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="border border-border bg-card lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Weekly Trends</CardTitle>
                  <CardDescription>Matches and player participation</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
                      <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
                      <ReTooltip cursor={{ stroke: 'hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="matches" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="players" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                <div className="lg:col-span-2">
                  <StreakLeaderboard limit={5} />
                  <div className="flex justify-end mt-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/streak-leaderboard')}>
                      View All
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity and Alerts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest match updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentMatches.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No recent matches.</div>
                  ) : (
                    <ul className="space-y-3">
                      {recentMatches.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-sm font-medium">Match {m.id.slice(0, 6)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Absence Alerts</CardTitle>
                    <CardDescription>Participants with attendance issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AbsenceAlerts limit={5} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Welcome Card */}
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-semibold mb-2">Welcome Back, {user?.email?.split('@')[0]}!</CardTitle>
                <CardDescription>
                  {userRole === 'admin' && 'You have full administrative access to the platform.'}
                  {userRole === 'tournament_director' && 'Manage tournaments, teams, and match schedules.'}
                  {userRole === 'coach' && 'Track your sessions and monitor attendance.'}
                  {userRole === 'program_manager' && 'Oversee programs and manage participants.'}
                  {userRole === 'volunteer' && 'Assist with tournament operations and scoring.'}
                  {userRole === 'player' && 'View tournaments and register your team.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Platform Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-primary"></span>
                        Create and manage ultimate frisbee tournaments
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-secondary"></span>
                        Register teams and track player rosters
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-secondary"></span>
                        Live match scoring and spirit score tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-primary"></span>
                        Youth program management and attendance tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-secondary"></span>
                        Comprehensive analytics and reporting
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

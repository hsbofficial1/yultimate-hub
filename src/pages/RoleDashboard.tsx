import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, BarChart3, LogOut, UserCircle2, Baby, CalendarDays, Target, Award, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts';

const RoleDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [tournamentCount, setTournamentCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
      const [tournaments, teams, matches] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact' }),
        supabase.from('teams').select('id', { count: 'exact' }),
        supabase.from('matches').select('id', { count: 'exact' }),
      ]);
      setTournamentCount(tournaments.count || 0);
      setTeamCount(teams.count || 0);
      setMatchCount(matches.count || 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const { data } = await supabase
        .from('matches')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentMatches((data || []) as any);
    } catch {}
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const roleLabel = userRole?.replace('_', ' ') || 'user';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{roleLabel === 'player' ? 'Player Dashboard' : 'Team Captain Dashboard'}</h1>
              <p className="text-xs text-muted-foreground">Clean, single-page overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30">
              <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-xs font-medium">{user?.email}</p>
                  <Badge variant="outline" className="text-xs capitalize">{roleLabel}</Badge>
                </div>
              </button>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-base font-medium text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              {/* Overview */}
              <div>
                <h2 className="text-base font-semibold mb-4">Overview</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <Card className="border bg-card elevated-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Tournaments</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-semibold">{tournamentCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="border bg-card elevated-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Teams</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-semibold">{teamCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="border bg-card elevated-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Matches</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-semibold">{matchCount}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Quick Access */}
              <div>
                <h2 className="text-base font-semibold mb-4">Quick Access</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <Card className="border bg-card elevated-card cursor-pointer" onClick={() => navigate('/tournaments')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">Tournaments</CardTitle>
                          <CardDescription className="text-xs">Browse & manage</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                  <Card className="border bg-card elevated-card cursor-pointer" onClick={() => navigate('/matches')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Award className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">Matches</CardTitle>
                          <CardDescription className="text-xs">Schedule & view</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                  <Card className="border bg-card elevated-card cursor-pointer" onClick={() => navigate('/profile')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">Profile</CardTitle>
                          <CardDescription className="text-xs">View & edit</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              </div>

              {/* Recent Activity */}
              <Card className="border bg-card elevated-card">
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest matches</CardDescription>
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
            </div>

            <div className="space-y-6">
              {/* Trends */}
              <Card className="border bg-card elevated-card">
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RoleDashboard;



import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, BarChart3, LogOut, UserCircle2, Baby, CalendarDays, Target, Award, Activity, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AbsenceAlerts } from '@/components/AbsenceAlerts';

const Dashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [tournamentCount, setTournamentCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/8 via-secondary/6 to-accent/6 grass-texture">
      {/* Header */}
      <header className="border-b-2 border-primary/30 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg border-2 border-background transform rotate-3 hover:rotate-6 transition-transform">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-accent rounded-full border-2 border-background"></div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Y-ULTIMATE
              </h1>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ultimate Frisbee Hub
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border border-border/50">
              <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-sm font-bold">{user?.email}</p>
                <Badge variant="secondary" className="text-xs font-semibold uppercase">{userRole?.replace('_', ' ')}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive border border-border/50">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-semibold text-muted-foreground">Loading stats...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Stats Grid */}
            <div>
              <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-foreground/90">The Scoreboard</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-l-4 border-l-primary bg-card/95 backdrop-blur-sm shadow-lg group"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide">Tournaments</CardTitle>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-primary mb-1">{tournamentCount}</div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active comps</p>
                  </CardContent>
                </Card>

                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-l-4 border-l-secondary bg-card/95 backdrop-blur-sm shadow-lg group"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide">Teams</CardTitle>
                    <div className="h-10 w-10 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-colors">
                      <Target className="h-5 w-5 text-secondary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-secondary mb-1">{teamCount}</div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registered</p>
                  </CardContent>
                </Card>

                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-l-4 border-l-accent bg-card/95 backdrop-blur-sm shadow-lg group"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide">Matches</CardTitle>
                    <div className="h-10 w-10 rounded-lg bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center transition-colors">
                      <Award className="h-5 w-5 text-accent" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black text-accent mb-1">{matchCount}</div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total games</p>
                  </CardContent>
                </Card>

                {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                  <Card 
                    className="hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-l-4 border-l-primary bg-card/95 backdrop-blur-sm shadow-lg group"
                    onClick={() => navigate('/children')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-sm font-bold uppercase tracking-wide">Players</CardTitle>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                        <Baby className="h-5 w-5 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-primary mb-1">{childrenCount}</div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-foreground/90">Quick Access</h2>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <Card 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-primary/20 hover:border-primary/50 bg-card/95 backdrop-blur-sm shadow-md"
                  onClick={() => navigate('/tournaments')}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center border-2 border-primary/30">
                        <Trophy className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg font-black uppercase tracking-wide mb-1">Tournaments</CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase">Browse & manage</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                  <>
                    <Card 
                      className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-secondary/20 hover:border-secondary/50 bg-card/95 backdrop-blur-sm shadow-md"
                      onClick={() => navigate('/children')}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors flex items-center justify-center border-2 border-secondary/30">
                            <Baby className="h-7 w-7 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-black uppercase tracking-wide mb-1">Players</CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase">Manage participants</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Card 
                      className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-accent/20 hover:border-accent/50 bg-card/95 backdrop-blur-sm shadow-md"
                      onClick={() => navigate('/sessions')}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors flex items-center justify-center border-2 border-accent/30">
                            <CalendarDays className="h-7 w-7 text-accent" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-black uppercase tracking-wide mb-1">Sessions</CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase">Schedule & track</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Card 
                      className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-primary/20 hover:border-primary/50 bg-card/95 backdrop-blur-sm shadow-md"
                      onClick={() => navigate('/reports')}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center border-2 border-primary/30">
                            <BarChart3 className="h-7 w-7 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-black uppercase tracking-wide mb-1">Reports</CardTitle>
                            <CardDescription className="text-xs font-semibold uppercase">Analytics & insights</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* Absence Alerts Section */}
            {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
              <div>
                <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-foreground/90 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  Absence Alerts
                </h2>
                <AbsenceAlerts limit={5} />
              </div>
            )}

            {/* Welcome Card */}
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black uppercase tracking-wide mb-2">Welcome Back, {user?.email?.split('@')[0]}!</CardTitle>
                <CardDescription className="text-base font-semibold">
                  {userRole === 'admin' && 'You have full administrative access to the platform.'}
                  {userRole === 'tournament_director' && 'Manage tournaments, teams, and match schedules.'}
                  {userRole === 'coach' && 'Track your sessions and monitor attendance.'}
                  {userRole === 'program_manager' && 'Oversee programs and manage participants.'}
                  {userRole === 'volunteer' && 'Assist with tournament operations and scoring.'}
                  {userRole === 'player' && 'View tournaments and register your team.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4 p-5 rounded-xl bg-card/80 border-2 border-primary/20 shadow-inner">
                  <Users className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-black uppercase tracking-wide mb-2 text-lg">Platform Features</h4>
                    <ul className="text-sm font-semibold text-muted-foreground space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                        Create and manage ultimate frisbee tournaments
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
                        Register teams and track player rosters
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
                        Live match scoring and spirit score tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                        Youth program management and attendance tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
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

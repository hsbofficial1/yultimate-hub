import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, BarChart3, LogOut, UserCircle2, Baby, CalendarDays, Target, Award, Activity, AlertTriangle, Sparkles, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AbsenceAlerts } from '@/components/AbsenceAlerts';
import { StreakLeaderboard } from '@/components/StreakLeaderboard';
import { CoachWorkloadDashboard } from '@/components/CoachWorkloadDashboard';
import { TeamCaptainDashboard } from '@/components/TeamCaptainDashboard';
import { CoachDashboard } from '@/components/CoachDashboard';
import { AppSidebar } from '@/components/AppSidebar';

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full"></span>
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs font-medium">{user?.email}</p>
                <Badge variant="outline" className="text-xs">{userRole?.replace('_', ' ')}</Badge>
              </div>
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
          <div className="space-y-8">
            {/* Stats Grid */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-foreground">Overview</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card 
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer border border-border bg-card group"
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
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer border border-border bg-card group"
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
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer border border-border bg-card group"
                  onClick={() => navigate('/tournaments')}
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
                    className="hover:shadow-md transition-shadow duration-200 cursor-pointer border border-border bg-card group"
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
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer group border border-border bg-card"
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
                      className="hover:shadow-md transition-shadow duration-200 cursor-pointer group border border-border bg-card"
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
                      className="hover:shadow-md transition-shadow duration-200 cursor-pointer group border border-border bg-card"
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
                      className="hover:shadow-md transition-shadow duration-200 cursor-pointer group border border-border bg-card"
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

            {/* Team Captain Section */}
            {userRole === 'team_captain' && (
              <TeamCaptainDashboard />
            )}

            {/* Coach Section */}
            {userRole === 'coach' && (
              <CoachDashboard />
            )}

            {/* Streak Leaderboard Section */}
            {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Streak Leaderboard
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/streak-leaderboard')}
                  >
                    View All
                  </Button>
                </div>
                <StreakLeaderboard limit={5} />
              </div>
            )}

            {/* Coach Workload Section */}
            {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
              <div>
                <CoachWorkloadDashboard />
              </div>
            )}

            {/* Absence Alerts Section */}
            {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Absence Alerts
                </h2>
                <AbsenceAlerts limit={5} />
              </div>
            )}

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

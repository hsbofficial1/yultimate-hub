import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, BarChart3, LogOut, UserCircle2, Baby, CalendarDays, Target, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-bounce-soft">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Y-Ultimate</h1>
              <p className="text-sm text-muted-foreground">Tournament & Coaching Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
                <Badge variant="secondary" className="text-xs">{userRole}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 border-l-4 border-l-primary" onClick={() => navigate('/tournaments')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
                  <Trophy className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{tournamentCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active competitions</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 border-l-4 border-l-secondary" onClick={() => navigate('/tournaments')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Teams</CardTitle>
                  <Target className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">{teamCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered teams</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 border-l-4 border-l-accent" onClick={() => navigate('/tournaments')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Matches</CardTitle>
                  <Award className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">{matchCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total matches</p>
                </CardContent>
              </Card>

              {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 border-l-4 border-l-primary" onClick={() => navigate('/children')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Children</CardTitle>
                    <Baby className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{childrenCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active participants</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/tournaments')}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Tournaments</CardTitle>
                        <CardDescription>Browse & manage tournaments</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                  <>
                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/children')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                            <Baby className="h-6 w-6 text-secondary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Children</CardTitle>
                            <CardDescription>Manage participants</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/sessions')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                            <CalendarDays className="h-6 w-6 text-accent" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Sessions</CardTitle>
                            <CardDescription>Schedule & track sessions</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/reports')}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <BarChart3 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Reports</CardTitle>
                            <CardDescription>View analytics & insights</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </>
                )}
              </div>
            </div>

            {/* Role-specific Info */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Welcome Back!</CardTitle>
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
                <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Users className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Platform Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Create and manage ultimate frisbee tournaments</li>
                      <li>• Register teams and track player rosters</li>
                      <li>• Live match scoring and spirit score tracking</li>
                      <li>• Youth program management and attendance tracking</li>
                      <li>• Comprehensive analytics and reporting</li>
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

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, TrendingUp, Users, Trophy, Calendar } from 'lucide-react';

interface Stats {
  tournaments: { total: number; active: number; completed: number };
  teams: { total: number; pending: number; approved: number };
  matches: { total: number; live: number; completed: number };
  children: { total: number; active: number };
  sessions: { total: number; thisMonth: number };
  attendance: { total: number; averageRate: number };
}

const Reports = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [stats, setStats] = useState<Stats>({
    tournaments: { total: 0, active: 0, completed: 0 },
    teams: { total: 0, pending: 0, approved: 0 },
    matches: { total: 0, live: 0, completed: 0 },
    children: { total: 0, active: 0 },
    sessions: { total: 0, thisMonth: 0 },
    attendance: { total: 0, averageRate: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Tournaments
      const { data: tournaments } = await supabase.from('tournaments').select('status');
      const tournamentStats = {
        total: tournaments?.length || 0,
        active: tournaments?.filter(t => t.status === 'in_progress').length || 0,
        completed: tournaments?.filter(t => t.status === 'completed').length || 0,
      };

      // Teams
      const { data: teams } = await supabase.from('teams').select('status');
      const teamStats = {
        total: teams?.length || 0,
        pending: teams?.filter(t => t.status === 'pending').length || 0,
        approved: teams?.filter(t => t.status === 'approved').length || 0,
      };

      // Matches
      const { data: matches } = await supabase.from('matches').select('status');
      const matchStats = {
        total: matches?.length || 0,
        live: matches?.filter(m => m.status === 'live').length || 0,
        completed: matches?.filter(m => m.status === 'completed').length || 0,
      };

      // Children
      const { data: children } = await supabase.from('children').select('active');
      const childrenStats = {
        total: children?.length || 0,
        active: children?.filter(c => c.active).length || 0,
      };

      // Sessions
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: sessions } = await supabase.from('sessions').select('date');
      const { data: thisMonthSessions } = await supabase
        .from('sessions')
        .select('date')
        .gte('date', firstOfMonth.toISOString());

      const sessionStats = {
        total: sessions?.length || 0,
        thisMonth: thisMonthSessions?.length || 0,
      };

      // Attendance
      const { data: attendance } = await supabase.from('attendance').select('present');
      const attendanceStats = {
        total: attendance?.length || 0,
        averageRate: attendance?.length
          ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
          : 0,
      };

      setStats({
        tournaments: tournamentStats,
        teams: teamStats,
        matches: matchStats,
        children: childrenStats,
        sessions: sessionStats,
        attendance: attendanceStats,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = (type: string) => {
    // Placeholder for export functionality
    console.log('Exporting', type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Reports & Analytics</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading statistics...</p>
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
                <TabsTrigger value="training">Training Programs</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      Tournaments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.tournaments.total}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.tournaments.active} active • {stats.tournaments.completed} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" />
                      Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.teams.total}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.teams.pending} pending • {stats.teams.approved} approved
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-accent" />
                      Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.matches.total}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.matches.live} live • {stats.matches.completed} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Children
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.children.total}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.children.active} active participants
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Training Sessions</CardTitle>
                    <CardDescription>Session activity overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Total Sessions</span>
                          <span className="font-bold">{stats.sessions.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">This Month</span>
                          <span className="font-bold text-primary">{stats.sessions.thisMonth}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance</CardTitle>
                    <CardDescription>Overall attendance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Total Records</span>
                          <span className="font-bold">{stats.attendance.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Average Rate</span>
                          <span className="font-bold text-secondary">{stats.attendance.averageRate}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tournaments">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tournament Reports</CardTitle>
                      <CardDescription>Detailed tournament statistics and data</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportData('tournaments')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{stats.tournaments.total}</p>
                        <p className="text-sm text-muted-foreground">Total Tournaments</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-secondary">{stats.teams.total}</p>
                        <p className="text-sm text-muted-foreground">Registered Teams</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-accent">{stats.matches.total}</p>
                        <p className="text-sm text-muted-foreground">Matches Played</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {(userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager') && (
              <TabsContent value="training">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Training Program Reports</CardTitle>
                        <CardDescription>Session and attendance analytics</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportData('training')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{stats.children.active}</p>
                          <p className="text-sm text-muted-foreground">Active Children</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-secondary">{stats.sessions.thisMonth}</p>
                          <p className="text-sm text-muted-foreground">Sessions This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-accent">{stats.attendance.averageRate}%</p>
                          <p className="text-sm text-muted-foreground">Attendance Rate</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Reports;

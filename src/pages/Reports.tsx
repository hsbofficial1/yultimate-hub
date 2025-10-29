import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, TrendingUp, Calendar, ArrowLeft, Download, FileSpreadsheet, Trophy, Target, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
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

const Reports = () => {
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [activeTournaments, setActiveTournaments] = useState(0);
  const [completedTournaments, setCompletedTournaments] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);
  const [approvedTeams, setApprovedTeams] = useState(0);
  const [pendingTeams, setPendingTeams] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [completedMatches, setCompletedMatches] = useState(0);
  const [upcomingMatches, setUpcomingMatches] = useState(0);
  const [totalChildren, setTotalChildren] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [programDistribution, setProgramDistribution] = useState<any[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<any[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(25, 95%, 53%)', 'hsl(280, 70%, 55%)'];

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'program_manager' || userRole === 'coach') {
      fetchStats();
      fetchAttendanceTrend();
      fetchProgramDistribution();
      fetchAgeDistribution();
      fetchGenderDistribution();
    }
  }, [userRole]);

  const fetchStats = async () => {
    try {
      // Tournaments
      const { data: tournaments } = await supabase.from('tournaments').select('status');
      setTotalTournaments(tournaments?.length || 0);
      setActiveTournaments(tournaments?.filter((t: any) => t.status === 'in_progress' || t.status === 'registration_open').length || 0);
      setCompletedTournaments(tournaments?.filter((t: any) => t.status === 'completed').length || 0);

      // Teams
      const { data: teams } = await supabase.from('teams').select('status');
      setTotalTeams(teams?.length || 0);
      setApprovedTeams(teams?.filter((t: any) => t.status === 'approved').length || 0);
      setPendingTeams(teams?.filter((t: any) => t.status === 'pending').length || 0);

      // Matches
      const { data: matches } = await supabase.from('matches').select('status');
      setTotalMatches(matches?.length || 0);
      setCompletedMatches(matches?.filter((m: any) => m.status === 'completed').length || 0);
      setUpcomingMatches(matches?.filter((m: any) => m.status === 'upcoming').length || 0);

      // Children
      const { data: children } = await supabase.from('children').select('active');
      setTotalChildren(children?.filter((c: any) => c.active).length || 0);

      // Sessions
      const { data: sessions } = await supabase.from('sessions').select('id');
      setTotalSessions(sessions?.length || 0);

      // Attendance
      const { data: attendance } = await supabase.from('attendance').select('present');
      const rate = attendance?.length
        ? Math.round((attendance.filter((a: any) => a.present).length / attendance.length) * 100)
        : 0;
      setAttendanceRate(rate);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceTrend = async () => {
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, date')
        .order('date', { ascending: true })
        .limit(10);

      if (!sessions) return;

      const trend = await Promise.all(
        sessions.map(async (session: any) => {
          const { count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('present', true);

          return {
            date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            attendance: count || 0,
          };
        })
      );

      setAttendanceTrend(trend);
    } catch (error) {
      console.error('Error fetching attendance trend:', error);
    }
  };

  const fetchProgramDistribution = async () => {
    try {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('program_type');

      if (!sessions) return;

      const distribution = sessions.reduce((acc: any, session: any) => {
        acc[session.program_type] = (acc[session.program_type] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(distribution).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value,
      }));

      setProgramDistribution(chartData);
    } catch (error) {
      console.error('Error fetching program distribution:', error);
    }
  };

  const fetchAgeDistribution = async () => {
    try {
      const { data: children } = await supabase
        .from('children')
        .select('age')
        .eq('active', true);

      if (!children) return;

      const ageGroups: any = {
        '5-7': 0,
        '8-10': 0,
        '11-13': 0,
        '14+': 0,
      };

      children.forEach((child: any) => {
        if (child.age >= 5 && child.age <= 7) ageGroups['5-7']++;
        else if (child.age >= 8 && child.age <= 10) ageGroups['8-10']++;
        else if (child.age >= 11 && child.age <= 13) ageGroups['11-13']++;
        else if (child.age >= 14) ageGroups['14+']++;
      });

      const chartData = Object.entries(ageGroups).map(([name, value]) => ({
        name,
        count: value,
      }));

      setAgeDistribution(chartData);
    } catch (error) {
      console.error('Error fetching age distribution:', error);
    }
  };

  const fetchGenderDistribution = async () => {
    try {
      const { data: children } = await supabase
        .from('children')
        .select('gender')
        .eq('active', true);

      if (!children) return;

      const genderCount = children.reduce((acc: any, child: any) => {
        acc[child.gender] = (acc[child.gender] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(genderCount).map(([name, value]) => ({
        name: (name as string).charAt(0).toUpperCase() + (name as string).slice(1),
        value,
      }));

      setGenderDistribution(chartData);
    } catch (error) {
      console.error('Error fetching gender distribution:', error);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There is no data available to export',
        variant: 'destructive',
      });
      return;
    }

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `${filename}.csv has been downloaded`,
    });
  };

  const exportAllData = async () => {
    try {
      const { data: children } = await supabase.from('children').select('*');
      const { data: sessions } = await supabase.from('sessions').select('*');
      const { data: attendance } = await supabase.from('attendance').select('*');

      if (children) exportToCSV(children, 'children_data');
      if (sessions) exportToCSV(sessions, 'sessions_data');
      if (attendance) exportToCSV(attendance, 'attendance_data');

      toast({
        title: 'Full export complete',
        description: 'All data has been exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Analytics & Reports</h1>
            </div>
          </div>
          <Button onClick={exportAllData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
              <Card className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
                  <Trophy className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTournaments}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeTournaments} active
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registered Teams</CardTitle>
                  <Target className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTeams}</div>
                  <p className="text-xs text-muted-foreground">
                    {approvedTeams} approved
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Children</CardTitle>
                  <Users className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalChildren}</div>
                  <p className="text-xs text-muted-foreground">Active participants</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Across {totalSessions} sessions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Tabs */}
            <Tabs defaultValue="attendance" className="w-full animate-fade-in">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="programs">Programs</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Trend</CardTitle>
                    <CardDescription>Last 10 sessions attendance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="attendance" stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No attendance data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="programs" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Program Distribution</CardTitle>
                      <CardDescription>Session types breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {programDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={programDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {programDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No program data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sessions Overview</CardTitle>
                      <CardDescription>Total sessions per program</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {programDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={programDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="hsl(142, 76%, 36%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No session data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="demographics" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Age Distribution</CardTitle>
                      <CardDescription>Active children by age group</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ageDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={ageDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="hsl(217, 91%, 60%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No age data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Gender Distribution</CardTitle>
                      <CardDescription>Participant diversity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {genderDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={genderDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {genderDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No gender data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tournaments" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tournament Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-2xl font-bold">{totalTournaments}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Active</span>
                        <span className="text-2xl font-bold text-secondary">{activeTournaments}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Completed</span>
                        <span className="text-2xl font-bold text-muted-foreground">{completedTournaments}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Team Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Registered</span>
                        <span className="text-2xl font-bold">{totalTeams}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Approved</span>
                        <span className="text-2xl font-bold text-secondary">{approvedTeams}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Pending</span>
                        <span className="text-2xl font-bold text-accent">{pendingTeams}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Match Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-2xl font-bold">{totalMatches}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Completed</span>
                        <span className="text-2xl font-bold text-secondary">{completedMatches}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Upcoming</span>
                        <span className="text-2xl font-bold text-primary">{upcomingMatches}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Export Actions */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Export Options
                </CardTitle>
                <CardDescription>Download specific data sets</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Button
                  variant="outline"
                  onClick={() => supabase.from('children').select('*').then(({ data }) => data && exportToCSV(data, 'children'))}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Children
                </Button>
                <Button
                  variant="outline"
                  onClick={() => supabase.from('sessions').select('*').then(({ data }) => data && exportToCSV(data, 'sessions'))}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Sessions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => supabase.from('attendance').select('*').then(({ data }) => data && exportToCSV(data, 'attendance'))}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Attendance
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;

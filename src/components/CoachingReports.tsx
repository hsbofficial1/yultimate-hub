import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, Users, Target, Award, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF, exportMultipleSheets } from '@/lib/reportExports';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(25, 95%, 53%)', 'hsl(280, 70%, 55%)'];

export const CoachingReports = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  // Participation Report Data
  const [participationData, setParticipationData] = useState<any>(null);
  const [retentionData, setRetentionData] = useState<any>(null);
  const [growthTrends, setGrowthTrends] = useState<any[]>([]);
  const [programComparison, setProgramComparison] = useState<any[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<any[]>([]);
  const [genderRatio, setGenderRatio] = useState<any[]>([]);
  
  // Coach Effectiveness Data
  const [coachEffectiveness, setCoachEffectiveness] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'program_manager' || userRole === 'coach') {
      fetchAllReports();
    }
  }, [userRole]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);

      // Fetch participation report
      const { data: participation, error: pError } = await supabase
        .from('participation_report')
        .select('*')
        .single();
      if (!pError) setParticipationData(participation);

      // Fetch retention report
      const { data: retention, error: rError } = await supabase
        .from('retention_report')
        .select('*')
        .single();
      if (!rError) setRetentionData(retention);

      // Fetch growth trends
      const { data: trends, error: tError } = await supabase
        .from('program_growth_trends')
        .select('*')
        .order('month', { ascending: true });
      if (!tError) setGrowthTrends(trends || []);

      // Fetch program comparison
      const { data: comparison, error: compError } = await supabase
        .from('program_comparison_report')
        .select('*');
      if (!compError) setProgramComparison(comparison || []);

      // Fetch age distribution
      const { data: ageDist, error: ageError } = await supabase
        .from('age_distribution_report')
        .select('*')
        .order('age', { ascending: true });
      if (!ageError) setAgeDistribution(ageDist || []);

      // Fetch gender ratio
      const { data: genderData, error: genderError } = await supabase
        .from('gender_ratio_report')
        .select('*');
      if (!genderError) setGenderRatio(genderData || []);

      // Fetch coach effectiveness
      const { data: coachData, error: coachError } = await supabase
        .from('coach_effectiveness_report')
        .select('*')
        .order('average_attendance_rate', { ascending: false });
      if (!coachError) setCoachEffectiveness(coachData || []);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      // Don't show toast for missing views - migrations may not be run yet
      if (error.code !== 'PGRST116' && error.message) {
        toast({
          title: 'Error loading reports',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatGrowthTrends = growthTrends.map(trend => ({
    month: new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    Children_Joined: trend.children_joined,
    Active: trend.children_active,
    Growth: trend.month_over_month_growth,
  }));

  const handleExportParticipationReport = async () => {
    if (!participationData || !retentionData) {
      toast({
        title: 'No data to export',
        description: 'Please wait for data to load',
        variant: 'destructive',
      });
      return;
    }

    const sheets = [
      {
        name: 'Summary',
        data: [
          {
            Metric: 'Total Children Enrolled',
            Value: participationData.total_children_enrolled,
          },
          {
            Metric: 'Active Children',
            Value: participationData.active_children,
          },
          {
            Metric: 'Average Attendance Rate (%)',
            Value: participationData.average_attendance_rate,
          },
          {
            Metric: 'Retention Rate (6 months) (%)',
            Value: retentionData.retention_rate_6_months,
          },
          {
            Metric: 'Retention Rate (3 months) (%)',
            Value: retentionData.retention_rate_3_months,
          },
        ],
      },
      {
        name: 'Gender Distribution',
        data: genderRatio,
      },
      {
        name: 'Age Distribution',
        data: ageDistribution,
      },
      {
        name: 'Program Comparison',
        data: programComparison,
      },
    ];

    exportMultipleSheets(sheets, 'Participation_Report');
    toast({
      title: 'Export successful',
      description: 'Participation report exported successfully',
    });
  };

  const handleExportCoachEffectiveness = async () => {
    if (coachEffectiveness.length === 0) {
      toast({
        title: 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    exportToExcel(coachEffectiveness, 'Coach_Effectiveness_Report', 'Coach Effectiveness Report');
    toast({
      title: 'Export successful',
      description: 'Coach effectiveness report exported successfully',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Participation Report Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Participation Report
          </h2>
          <Button onClick={handleExportParticipationReport} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        {participationData && retentionData && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{participationData.total_children_enrolled}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {participationData.active_children} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {participationData.average_attendance_rate?.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average attendance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Retention (6M)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {retentionData.retention_rate_6_months?.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {retentionData.retained_6_months}/{retentionData.total_joined_6_months_ago}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Retention (3M)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {retentionData.retention_rate_3_months?.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {retentionData.retained_3_months}/{retentionData.total_joined_3_months_ago}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">MoM Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold flex items-center">
                  {growthTrends[growthTrends.length - 1]?.month_over_month_growth?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Latest month
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gender Ratio Pie Chart */}
        {genderRatio.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gender Ratio</CardTitle>
              <CardDescription>Distribution of participants by gender</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderRatio}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {genderRatio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Age Distribution Histogram */}
        {ageDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Age Distribution</CardTitle>
              <CardDescription>Number of children by age</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Program Growth Trends */}
        {formatGrowthTrends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Program Growth Trends</CardTitle>
              <CardDescription>Monthly enrollment and active participants</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatGrowthTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Children_Joined" stroke="hsl(142, 76%, 36%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Active" stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Growth" stroke="hsl(25, 95%, 53%)" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* School vs Community Comparison */}
        {programComparison.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Program Comparison (Table)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Children</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programComparison.map((program, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{program.program_type}</TableCell>
                        <TableCell>{program.active_children}</TableCell>
                        <TableCell>{program.average_attendance_rate?.toFixed(1)}%</TableCell>
                        <TableCell>{program.total_sessions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Comparison (Chart)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={programComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="program_type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="active_children" fill="hsl(217, 91%, 60%)" name="Children" />
                    <Bar dataKey="total_sessions" fill="hsl(142, 76%, 36%)" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Coach Effectiveness Section */}
      {(userRole === 'admin' || userRole === 'program_manager') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Coach Effectiveness Metrics
            </h2>
            <Button onClick={handleExportCoachEffectiveness} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coach Performance</CardTitle>
              <CardDescription>
                Attendance rates, assessment improvements, and home visit completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coachEffectiveness.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead>Children Coached</TableHead>
                      <TableHead>Home Visits</TableHead>
                      <TableHead>Assessment Improvement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coachEffectiveness.map((coach, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{coach.coach_name}</TableCell>
                        <TableCell>{coach.total_sessions}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {coach.average_attendance_rate?.toFixed(1)}%
                            <Badge
                              variant={
                                coach.average_attendance_rate >= 80
                                  ? 'default'
                                  : coach.average_attendance_rate >= 60
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {coach.average_attendance_rate >= 80
                                ? 'Excellent'
                                : coach.average_attendance_rate >= 60
                                  ? 'Good'
                                  : 'Needs Improvement'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{coach.unique_children_coached}</TableCell>
                        <TableCell>{coach.home_visit_completion_rate?.toFixed(0) || 0}%</TableCell>
                        <TableCell>
                          {coach.avg_assessment_improvement > 0 ? (
                            <span className="text-green-600">
                              +{coach.avg_assessment_improvement.toFixed(2)}
                            </span>
                          ) : coach.avg_assessment_improvement < 0 ? (
                            <span className="text-red-600">
                              {coach.avg_assessment_improvement.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No coach effectiveness data available
                </p>
              )}
            </CardContent>
          </Card>

          {coachEffectiveness.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={coachEffectiveness}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="coach_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average_attendance_rate" fill="hsl(217, 91%, 60%)" name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};


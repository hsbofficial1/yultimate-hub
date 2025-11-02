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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, AlertTriangle, TrendingUp, Mail, Users } from 'lucide-react';
import { CoachWorkloadDialog } from './CoachWorkloadDialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface WeeklyWorkload {
  week_start_date: string;
  total_hours: number;
  session_hours: number;
  travel_hours: number;
  admin_hours: number;
  other_hours: number;
  session_count: number;
}

interface WorkloadComparison {
  coach_id: string;
  coach_name: string;
  total_hours: number;
  session_hours: number;
  travel_hours: number;
  admin_hours: number;
  other_hours: number;
  days_worked: number;
  workload_status: string;
  hours_over_limit: number;
}

interface WorkloadAlert {
  id: string;
  coach_name: string;
  coach_email: string;
  week_start_date: string;
  total_hours: number;
  hours_over_limit: number;
  alert_sent: boolean;
  acknowledged: boolean;
}

interface RedistributionSuggestion {
  overloaded_coach_id: string;
  overloaded_coach_name: string;
  overloaded_coach_hours: number;
  underloaded_coach_id: string;
  underloaded_coach_name: string;
  underloaded_coach_hours: number;
  suggested_hours: number;
  suggestion_reason: string;
}

export const CoachWorkloadDashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [weeklyWorkload, setWeeklyWorkload] = useState<WeeklyWorkload[]>([]);
  const [currentWeekWorkload, setCurrentWeekWorkload] = useState<WeeklyWorkload | null>(null);
  const [workloadComparison, setWorkloadComparison] = useState<WorkloadComparison[]>([]);
  const [alerts, setAlerts] = useState<WorkloadAlert[]>([]);
  const [redistributionSuggestions, setRedistributionSuggestions] = useState<RedistributionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkloadData();
  }, [user, userRole]);

  const fetchWorkloadData = async () => {
    try {
      setLoading(true);

      // Fetch weekly workload for current coach or all coaches
      const workloadQuery = userRole === 'program_manager' || userRole === 'admin'
        ? supabase.from('coach_weekly_workload').select('*').limit(20)
        : supabase.from('coach_weekly_workload').select('*').eq('coach_id', user?.id).limit(20);

      const { data: weeklyData, error: weeklyError } = await workloadQuery;
      if (weeklyError && weeklyError.code !== 'PGRST116') {
        // PGRST116 = table/view not found - silently skip if migrations not run yet
        console.error('Error fetching weekly workload:', weeklyError);
      }

      setWeeklyWorkload(weeklyData || []);
      
      // Get current week workload
      const currentWeekData = weeklyData?.find(
        (w) => new Date(w.week_start_date).getTime() >= new Date().getTime() - 7 * 24 * 60 * 60 * 1000
      );
      setCurrentWeekWorkload(currentWeekData || null);

      // Fetch workload comparison (admins and program managers only)
      if (userRole === 'program_manager' || userRole === 'admin') {
        const { data: comparisonData, error: comparisonError } = await supabase
          .from('coach_workload_comparison')
          .select('*');
        if (comparisonError && comparisonError.code !== 'PGRST116') {
          console.error('Error fetching comparison:', comparisonError);
        }
        setWorkloadComparison(comparisonData || []);

        // Fetch active alerts
        const { data: alertsData, error: alertsError } = await supabase
          .from('coach_workload_alerts')
          .select(`
            *,
            coach:profiles!coach_id(name, email)
          `)
          .eq('resolved', false)
          .order('created_at', { ascending: false });
        if (alertsError && alertsError.code !== 'PGRST116') {
          console.error('Error fetching alerts:', alertsError);
        }

        const formattedAlerts = alertsData?.map((alert: any) => ({
          id: alert.id,
          coach_name: alert.coach?.name || 'Unknown',
          coach_email: alert.coach?.email || '',
          week_start_date: alert.week_start_date,
          total_hours: alert.total_hours,
          hours_over_limit: alert.hours_over_limit,
          alert_sent: alert.alert_sent,
          acknowledged: alert.acknowledged,
        })) || [];
        setAlerts(formattedAlerts);

        // Fetch redistribution suggestions
        const { data: suggestionsData, error: suggestionsError } = await supabase.rpc(
          'suggest_workload_redistribution'
        );
        if (suggestionsError && suggestionsError.code !== 'PGRST116') {
          console.error('Error fetching suggestions:', suggestionsError);
        }
        setRedistributionSuggestions(suggestionsData || []);
      }
    } catch (error: any) {
      console.error('Error fetching workload data:', error);
      // Don't show toast for missing tables/views - migrations may not be run yet
      if (error.code !== 'PGRST116' && error.message) {
        toast({
          title: 'Error loading workload data',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('coach_workload_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert acknowledged',
        description: 'The alert has been acknowledged.',
      });

      fetchWorkloadData();
    } catch (error: any) {
      toast({
        title: 'Error acknowledging alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('coach_workload_alerts')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert resolved',
        description: 'The alert has been marked as resolved.',
      });

      fetchWorkloadData();
    } catch (error: any) {
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendBurnoutEmail = async (alert: WorkloadAlert) => {
    try {
      // Get program manager emails
      const { data: pmEmails, error: emailError } = await supabase.rpc('get_program_manager_emails');
      if (emailError) throw emailError;

      // Mark alert as sent
      const { error: markError } = await supabase.rpc('mark_alert_as_sent', {
        _alert_id: alert.id,
      });
      if (markError) throw markError;

      toast({
        title: 'Email sent',
        description: `Burnout alert sent to ${pmEmails?.length || 0} program manager(s).`,
      });

      fetchWorkloadData();
    } catch (error: any) {
      toast({
        title: 'Error sending email',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getWorkloadStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 mx-auto mb-4 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading workload data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Coach Workload Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage coach hours to prevent burnout
          </p>
        </div>
        {userRole === 'coach' && (
          <CoachWorkloadDialog onSuccess={fetchWorkloadData} />
        )}
      </div>

      {/* Current Week Summary */}
      {currentWeekWorkload && (
        <Card>
          <CardHeader>
            <CardTitle>This Week's Workload</CardTitle>
            <CardDescription>
              Week of {format(new Date(currentWeekWorkload.week_start_date), 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
                <p className="text-3xl font-semibold">
                  {currentWeekWorkload.total_hours.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Session Hours</p>
                <p className="text-3xl font-semibold text-primary">
                  {currentWeekWorkload.session_hours.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Travel Hours</p>
                <p className="text-3xl font-semibold">
                  {currentWeekWorkload.travel_hours.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Admin Hours</p>
                <p className="text-3xl font-semibold">
                  {currentWeekWorkload.admin_hours.toFixed(1)}
                </p>
              </div>
            </div>
            {currentWeekWorkload.total_hours > 25 && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Burnout Risk</AlertTitle>
                <AlertDescription>
                  You've exceeded 25 hours this week. Consider redistributing workload.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Burnout Alerts */}
      {(userRole === 'program_manager' || userRole === 'admin') && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Burnout Alerts
            </CardTitle>
            <CardDescription>Coaches exceeding 25 hours per week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {alert.coach_name} - {format(new Date(alert.week_start_date), 'MMM d')}
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">
                      Total hours: <strong>{alert.total_hours.toFixed(1)}</strong> (
                      <strong>{alert.hours_over_limit.toFixed(1)}</strong> over limit)
                    </p>
                    <div className="flex gap-2">
                      {!alert.alert_sent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendBurnoutEmail(alert)}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Send Email
                        </Button>
                      )}
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workload Comparison Bar Chart */}
      {(userRole === 'program_manager' || userRole === 'admin') && workloadComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Workload Comparison
            </CardTitle>
            <CardDescription>Current week hours across all coaches</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="coach_name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="session_hours" fill="hsl(var(--primary))" name="Session" />
                <Bar dataKey="travel_hours" fill="hsl(var(--secondary))" name="Travel" />
                <Bar dataKey="admin_hours" fill="hsl(var(--muted-foreground))" name="Admin" />
                <Bar dataKey="other_hours" fill="hsl(var(--accent))" name="Other" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Redistribution Suggestions */}
      {(userRole === 'program_manager' || userRole === 'admin') &&
        redistributionSuggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Workload Redistribution Suggestions
              </CardTitle>
              <CardDescription>Balance workload across coaches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {redistributionSuggestions.map((suggestion, index) => (
                  <Alert key={index}>
                    <AlertTitle>
                      {suggestion.overloaded_coach_name} → {suggestion.underloaded_coach_name}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">
                        <strong>{suggestion.overloaded_coach_name}</strong> has{' '}
                        <strong>{suggestion.overloaded_coach_hours.toFixed(1)} hours</strong>, while{' '}
                        <strong>{suggestion.underloaded_coach_name}</strong> has{' '}
                        <strong>{suggestion.underloaded_coach_hours.toFixed(1)} hours</strong>
                      </p>
                      <p>
                        <strong>Suggested transfer:</strong>{' '}
                        {suggestion.suggested_hours.toFixed(1)} hours
                      </p>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Workload Comparison Table */}
      {(userRole === 'program_manager' || userRole === 'admin') && workloadComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Comparison</CardTitle>
            <CardDescription>Breakdown by coach for current week</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coach</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Travel</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Other</TableHead>
                  <TableHead>Days Worked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workloadComparison.map((coach) => (
                  <TableRow key={coach.coach_id}>
                    <TableCell className="font-medium">{coach.coach_name}</TableCell>
                    <TableCell>
                      <strong>{coach.total_hours.toFixed(1)}</strong>
                      {coach.hours_over_limit > 0 && (
                        <span className="text-destructive ml-1">
                          (+{coach.hours_over_limit.toFixed(1)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{coach.session_hours.toFixed(1)}</TableCell>
                    <TableCell>{coach.travel_hours.toFixed(1)}</TableCell>
                    <TableCell>{coach.admin_hours.toFixed(1)}</TableCell>
                    <TableCell>{coach.other_hours.toFixed(1)}</TableCell>
                    <TableCell>{coach.days_worked}</TableCell>
                    <TableCell>
                      <Badge variant={getWorkloadStatusColor(coach.workload_status) as any}>
                        {coach.workload_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Weeks History */}
      {weeklyWorkload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly History</CardTitle>
            <CardDescription>Recent weeks workload tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Travel</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Other</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyWorkload.slice(0, 8).map((week, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(week.week_start_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <strong>{week.total_hours.toFixed(1)}</strong>
                    </TableCell>
                    <TableCell>
                      {week.session_hours.toFixed(1)} ({week.session_count})
                    </TableCell>
                    <TableCell>{week.travel_hours.toFixed(1)}</TableCell>
                    <TableCell>{week.admin_hours.toFixed(1)}</TableCell>
                    <TableCell>{week.other_hours.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


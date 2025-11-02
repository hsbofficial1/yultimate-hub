import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TodaysSession {
  id: string;
  date: string;
  time: string;
  location: string;
  program_type: string;
  children_count: number;
  attendance_rate: number;
}

interface PendingAssessment {
  child_id: string;
  child_name: string;
  last_assessment_date: string;
  days_overdue: number;
  program_type: string;
}

export const CoachDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todaysSessions, setTodaysSessions] = useState<TodaysSession[]>([]);
  const [todaysAttendanceSummary, setTodaysAttendanceSummary] = useState({
    total_children: 0,
    present: 0,
    absent: 0,
    attendance_rate: 0,
  });
  const [pendingAssessments, setPendingAssessments] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoachData();
  }, [user]);

  const fetchCoachData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);

      // Fetch today's sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('coach_id', user.id)
        .gte('date', today.toISOString())
        .lt('date', tomorrow.toISOString())
        .order('time', { ascending: true });

      if (sessionsData) {
        setTodaysSessions(sessionsData as TodaysSession[]);

        // Calculate attendance summary for today
        const sessionIds = sessionsData.map(s => s.id);
        
        if (sessionIds.length > 0) {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*')
            .in('session_id', sessionIds);

          if (attendanceData) {
            const totalRecords = attendanceData.length;
            const present = attendanceData.filter(a => a.present).length;
            const absent = totalRecords - present;
            
            // Get unique children
            const uniqueChildren = new Set(attendanceData.map(a => a.child_id));

            setTodaysAttendanceSummary({
              total_children: uniqueChildren.size,
              present,
              absent,
              attendance_rate: totalRecords > 0 ? (present / totalRecords) * 100 : 0,
            });
          }
        }
      }

      // Fetch pending assessments (no assessment in last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: assessmentsData } = await supabase
        .from('lsas_assessments')
        .select('child_id, assessment_date')
        .gte('assessment_date', sixMonthsAgo.toISOString())
        .order('assessment_date', { ascending: false });

      // Get all children the coach has sessions with
      const { data: sessionChildrenData } = await supabase
        .from('sessions')
        .select('id, program_type, attendance!inner(child_id, children(name))')
        .eq('coach_id', user.id)
        .gte('date', sixMonthsAgo.toISOString());

      if (sessionChildrenData) {
        const childrenWithSessions = new Map<string, { name: string; program_type: string }>();
        
        sessionChildrenData.forEach(session => {
          (session as any).attendance?.forEach((att: any) => {
            if (!childrenWithSessions.has(att.child_id)) {
              childrenWithSessions.set(att.child_id, {
                name: att.children?.name || 'Unknown',
                program_type: session.program_type,
              });
            }
          });
        });

        // Check which children need assessments
        const childrenNeedingAssessments: PendingAssessment[] = [];
        const assessedChildren = new Set(assessmentsData?.map(a => a.child_id) || []);

        childrenWithSessions.forEach((child, childId) => {
          if (!assessedChildren.has(childId)) {
            // Calculate days since last session (approximate)
            const sessionDates = sessionsData?.filter((s: any) => {
              return sessionChildrenData.some(sc => 
                (sc as any).attendance?.some((att: any) => att.child_id === childId && att.session_id === s.id)
              );
            })?.map((s: any) => new Date(s.date)) || [];
            
            const lastSessionDate = sessionDates.length > 0 
              ? new Date(Math.max(...sessionDates.map(d => d.getTime())))
              : sixMonthsAgo;
            
            const daysOverdue = Math.floor((today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));

            childrenNeedingAssessments.push({
              child_id: childId,
              child_name: child.name,
              last_assessment_date: lastSessionDate.toISOString(),
              days_overdue: daysOverdue,
              program_type: child.program_type,
            });
          }
        });

        // Sort by days overdue
        childrenNeedingAssessments.sort((a, b) => b.days_overdue - a.days_overdue);
        setPendingAssessments(childrenNeedingAssessments.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <div className="animate-spin h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Coach Dashboard</h3>

        {/* Today's Sessions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today&apos;s Sessions
            </CardTitle>
            <CardDescription>Sessions scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todaysSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sessions scheduled for today
              </p>
            ) : (
              <div className="space-y-3">
                {todaysSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/sessions`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{session.program_type}</p>
                        <Badge variant="outline" className="text-xs">
                          {session.location}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(session.time), 'h:mm a')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Users className="h-3 w-3 inline mr-1" />
                        {session.children_count || 0} children
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        {todaysAttendanceSummary.total_children > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Today&apos;s Attendance Summary
              </CardTitle>
              <CardDescription>Summary of today&apos;s attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold">{todaysAttendanceSummary.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-destructive">
                    {todaysAttendanceSummary.absent}
                  </p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary">
                    {todaysAttendanceSummary.attendance_rate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Assessments
            </CardTitle>
            <CardDescription>Children needing assessments (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All assessments up to date ✓
              </p>
            ) : (
              <div className="space-y-3">
                {pendingAssessments.map((assessment) => (
                  <div
                    key={assessment.child_id}
                    className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{assessment.child_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {assessment.program_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Overdue by {assessment.days_overdue} days
                      </p>
                    </div>
                    <Badge 
                      variant="destructive" 
                      className="cursor-pointer"
                      onClick={() => navigate(`/children`)}
                    >
                      Assess
                    </Badge>
                  </div>
                ))}
                {pendingAssessments.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{pendingAssessments.length - 5} more pending
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


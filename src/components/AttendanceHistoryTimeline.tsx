import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  session_id: string;
  session_date: string;
  session_time: string;
  location: string;
  program_type: string;
  present: boolean;
  marked_at: string | null;
  session_notes: string | null;
}

interface AttendanceHistoryTimelineProps {
  childId: string;
  childName: string;
}

export const AttendanceHistoryTimeline = ({
  childId,
  childName,
}: AttendanceHistoryTimelineProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    fetchAttendanceHistory();
  }, [childId]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);

      // Use the database function if available, otherwise query directly
      const { data, error } = await supabase.rpc('get_child_attendance_timeline', {
        _child_id: childId,
        _limit: 50,
      });

      let finalRecords: AttendanceRecord[] = [];

      if (error) {
        // Fallback to direct query if function doesn't exist
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, date, time, location, program_type, notes')
          .lte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: false })
          .order('time', { ascending: false })
          .limit(50);

        if (sessionsError) throw sessionsError;

        const sessionIds = sessionsData?.map((s) => s.id) || [];

        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('session_id, present, marked_at')
          .eq('child_id', childId)
          .in('session_id', sessionIds);

        if (attendanceError) throw attendanceError;

        const attendanceMap = new Map(
          attendanceData?.map((a) => [a.session_id, a]) || []
        );

        finalRecords = sessionsData?.map((session) => ({
          session_id: session.id,
          session_date: session.date,
          session_time: session.time,
          location: session.location,
          program_type: session.program_type,
          present: attendanceMap.get(session.id)?.present || false,
          marked_at: attendanceMap.get(session.id)?.marked_at || null,
          session_notes: session.notes || null,
        })) || [];
      } else {
        finalRecords = data || [];
      }

      setRecords(finalRecords);

      const total = finalRecords.length;
      const present = finalRecords.filter((r) => r.present).length;
      const absent = total - present;
      const attendanceRate = total > 0 ? (present / total) * 100 : 0;

      setStats({
        total,
        present,
        absent,
        attendanceRate: Math.round(attendanceRate),
      });
    } catch (error: any) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (records: AttendanceRecord[]) => {
    const grouped = new Map<string, AttendanceRecord[]>();
    records.forEach((record) => {
      const dateKey = record.session_date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(record);
    });
    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading attendance history...</p>
        </CardContent>
      </Card>
    );
  }

  const groupedRecords = groupByDate(records);

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Attendance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.attendanceRate}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Attendance Timeline</h3>
        {records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No attendance records found for {childName}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedRecords.entries()).map(([date, dayRecords]) => (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-card z-10 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {dayRecords.filter((r) => r.present).length} / {dayRecords.length}
                  </Badge>
                </div>

                {/* Sessions for this date */}
                <div className="space-y-2 ml-6 border-l-2 border-muted pl-4">
                  {dayRecords.map((record) => (
                    <Card
                      key={record.session_id}
                      className={cn(
                        'hover:shadow-md transition-all',
                        record.present && 'bg-green-50 border-green-200',
                        !record.present && 'bg-red-50 border-red-200'
                      )}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {record.present ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {record.session_time}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {record.program_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{record.location}</span>
                              </div>
                              {record.marked_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Marked: {format(new Date(record.marked_at), 'MMM d, h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


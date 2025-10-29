import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Users } from 'lucide-react';

interface Session {
  id: string;
  date: string;
  time: string;
  location: string;
  program_type: string;
}

interface Child {
  id: string;
  name: string;
  age: number;
  school: string | null;
  community: string | null;
}

interface AttendanceRecord {
  session_id: string;
  child_id: string;
  present: boolean;
  marked_at: string;
  synced: boolean;
}

const SessionAttendance = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch children
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .eq('active', true)
        .order('name');

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);

      // Fetch existing attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', id);

      const attendanceMap = new Map<string, boolean>();
      attendanceData?.forEach((record) => {
        attendanceMap.set(record.child_id, record.present);
      });
      setAttendance(attendanceMap);
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (childId: string) => {
    setAttendance((prev) => {
      const newMap = new Map(prev);
      newMap.set(childId, !prev.get(childId));
      return newMap;
    });
  };

  const markAllPresent = () => {
    const newMap = new Map<string, boolean>();
    children.forEach((child) => {
      newMap.set(child.id, true);
    });
    setAttendance(newMap);
  };

  const saveAttendance = async () => {
    if (!session) return;

    setSaving(true);
    try {
      // Delete existing attendance
      await supabase.from('attendance').delete().eq('session_id', session.id);

      // Insert new attendance records
      const records: AttendanceRecord[] = [];
      attendance.forEach((present, childId) => {
        records.push({
          session_id: session.id,
          child_id: childId,
          present,
          marked_at: new Date().toISOString(),
          synced: true,
        });
      });

      const { error } = await supabase.from('attendance').insert(records);

      if (error) throw error;

      toast({
        title: 'Attendance saved',
        description: 'All attendance records have been saved successfully.',
      });

      navigate('/sessions');
    } catch (error: any) {
      toast({
        title: 'Error saving attendance',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const presentCount = Array.from(attendance.values()).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sessions')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Mark Attendance</h1>
                <p className="text-sm text-muted-foreground">
                  {session.location} - {new Date(session.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={markAllPresent}>
                Mark All Present
              </Button>
              <Button onClick={saveAttendance} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {presentCount} / {children.length}
            </p>
            <p className="text-sm text-muted-foreground">children present</p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {children.map((child) => (
            <Card
              key={child.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => toggleAttendance(child.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={attendance.get(child.id) || false}
                    onCheckedChange={() => toggleAttendance(child.id)}
                    className="h-8 w-8"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{child.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Age {child.age} • {child.school || child.community || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SessionAttendance;

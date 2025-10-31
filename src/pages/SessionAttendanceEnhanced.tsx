import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { offlineStorage } from '@/lib/offlineStorage';
import { attendanceSync } from '@/lib/attendanceSync';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Save,
  Users,
  Copy,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  date: string;
  time: string;
  location: string;
  program_type: string;
  notes: string | null;
}

interface Child {
  id: string;
  name: string;
  age: number;
  gender: string;
  school: string | null;
  community: string | null;
  photo_url: string | null;
  active: boolean;
}

const SessionAttendanceEnhanced = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [sessionNotes, setSessionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init().then(() => {
      fetchData();
    });

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [id]);

  useEffect(() => {
    // Auto-save attendance changes to offline storage
    if (session && attendance.size > 0) {
      const saveToOffline = async () => {
        for (const [childId, present] of attendance) {
          await offlineStorage.saveAttendance(session.id, childId, present);
        }
      };
      saveToOffline();
    }
  }, [attendance, session]);

  const fetchData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch children filtered by program type
      // If session is school program, show children with school affiliation
      // If session is community program, show children with community affiliation
      let query = supabase
        .from('children')
        .select('*')
        .eq('active', true);

      if (sessionData.program_type === 'school') {
        query = query.not('school', 'is', null);
      } else if (sessionData.program_type === 'community') {
        query = query.not('community', 'is', null);
      }

      const { data: childrenData, error: childrenError } = await query.order('name');

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);

      // Try to fetch from server first
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', id);

      const attendanceMap = new Map<string, boolean>();

      if (attendanceData && attendanceData.length > 0) {
        attendanceData.forEach((record) => {
          attendanceMap.set(record.child_id, record.present);
        });
      } else {
        // Check offline storage
        const offlineAttendance = await offlineStorage.getAttendance(id);
        offlineAttendance.forEach((present, childId) => {
          attendanceMap.set(childId, present);
        });
      }

      setAttendance(attendanceMap);

      // Fetch session notes
      if (sessionData.notes) {
        setSessionNotes(sessionData.notes);
      } else {
        // Check offline storage
        const offlineNotes = await offlineStorage.getSessionNotes(id);
        if (offlineNotes) {
          setSessionNotes(offlineNotes);
        }
      }

      // Try to sync any pending data
      if (isOnline) {
        attendanceSync.syncPendingData();
      }
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

  const toggleAttendance = async (childId: string) => {
    const newMap = new Map(attendance);
    const currentStatus = newMap.get(childId) || false;
    newMap.set(childId, !currentStatus);
    setAttendance(newMap);

    // Save to offline storage immediately
    if (session) {
      await offlineStorage.saveAttendance(session.id, childId, !currentStatus);
    }
  };

  const markAllPresent = async () => {
    const newMap = new Map<string, boolean>();
    children.forEach((child) => {
      newMap.set(child.id, true);
    });
    setAttendance(newMap);

    // Save all to offline storage
    if (session) {
      for (const child of children) {
        await offlineStorage.saveAttendance(session.id, child.id, true);
      }
    }
  };

  const copyLastSession = async () => {
    if (!session) return;

    try {
      // Find the most recent session for the same location/program
      const { data: lastSessions, error } = await supabase
        .from('sessions')
        .select('id, date')
        .eq('location', session.location)
        .eq('program_type', session.program_type)
        .lt('date', session.date)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!lastSessions || lastSessions.length === 0) {
        toast({
          title: 'No previous session found',
          description: 'There is no previous session for this location and program type.',
        });
        return;
      }

      const lastSessionId = lastSessions[0].id;

      // Fetch last session's attendance
      const { data: lastAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', lastSessionId);

      if (lastAttendance && lastAttendance.length > 0) {
        const newMap = new Map<string, boolean>();
        lastAttendance.forEach((record) => {
          newMap.set(record.child_id, record.present);
        });
        setAttendance(newMap);

        // Save to offline storage
        if (session) {
          for (const [childId, present] of newMap) {
            await offlineStorage.saveAttendance(session.id, childId, present);
          }
        }

        toast({
          title: 'Attendance copied',
          description: `Copied attendance from ${new Date(lastSessions[0].date).toLocaleDateString()}`,
        });
      } else {
        toast({
          title: 'No attendance data',
          description: 'The previous session has no attendance records.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error copying attendance',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const saveSession = async () => {
    if (!session) return;

    setSaving(true);
    try {
      // Save session notes
      await offlineStorage.saveSessionNotes(session.id, sessionNotes);

      // If online, sync immediately
      if (isOnline) {
        // Update session notes
        const { error: notesError } = await supabase
          .from('sessions')
          .update({ notes: sessionNotes || null })
          .eq('id', session.id);

        if (notesError) throw notesError;

        // Save attendance
        await supabase.from('attendance').delete().eq('session_id', session.id);

        const records = Array.from(attendance.entries()).map(([childId, present]) => ({
          session_id: session.id,
          child_id: childId,
          present,
          marked_at: new Date().toISOString(),
          synced: true,
        }));

        if (records.length > 0) {
          const { error: attendanceError } = await supabase
            .from('attendance')
            .insert(records);

          if (attendanceError) throw attendanceError;
        }

        // Mark offline records as synced
        const pendingAttendance = await offlineStorage.getPendingAttendance();
        for (const record of pendingAttendance) {
          if (record.session_id === session.id) {
            await offlineStorage.markAttendanceSynced(record.session_id, record.child_id);
          }
        }
        await offlineStorage.markNotesSynced(session.id);

        toast({
          title: 'Session saved',
          description: 'Attendance and notes have been saved successfully.',
        });

        navigate('/sessions');
      } else {
        // Offline - data already saved to offline storage
        toast({
          title: 'Saved offline',
          description: 'Data will sync automatically when you come back online.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error saving session',
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
  const absentCount = children.length - presentCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pb-8">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sessions')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Mark Attendance</h1>
                <p className="text-sm text-muted-foreground">
                  {session.location} • {new Date(session.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="outline" className="gap-1">
                  <Wifi className="h-3 w-3" />
                  Online
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              Mark All Present
            </Button>
            <Button variant="outline" size="sm" onClick={copyLastSession}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Last Session
            </Button>
            <Button
              variant={showNotes ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </Button>
            <Button onClick={saveSession} disabled={saving} className="ml-auto">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-bold text-primary">{presentCount}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Present
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-destructive">{absentCount}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Absent
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold">{children.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Notes */}
        {showNotes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Session Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes about this session (activities, focus areas, observations)..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        )}

        {/* Attendance List */}
        <div className="space-y-3">
          {children.map((child) => {
            const isPresent = attendance.get(child.id) || false;
            return (
              <Card
                key={child.id}
                className={cn(
                  'cursor-pointer hover:shadow-lg transition-all',
                  isPresent && 'border-primary/50 bg-primary/5'
                )}
                onClick={() => toggleAttendance(child.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isPresent}
                      onCheckedChange={() => toggleAttendance(child.id)}
                      className="h-6 w-6 rounded-md border-2"
                    />
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={child.photo_url || ''} alt={child.name} />
                      <AvatarFallback>
                        {child.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{child.name}</p>
                        <Badge variant="outline" className="text-xs">
                          Age {child.age}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {child.school || child.community || 'No affiliation'}
                      </p>
                    </div>
                    {isPresent ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {children.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No children registered</h3>
              <p className="text-muted-foreground">
                No active children are registered for this program.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SessionAttendanceEnhanced;


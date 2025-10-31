import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';
import { CreateSessionDialog } from '@/components/CreateSessionDialog';

interface Session {
  id: string;
  date: string;
  time: string;
  location: string;
  program_type: string;
  notes: string | null;
  coach_id: string;
  profiles: { name: string };
}

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles:coach_id(name)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching sessions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isToday = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const canManage = userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Training Sessions</h1>
                <p className="text-xs text-muted-foreground">Schedule management</p>
              </div>
            </div>
          </div>
          {canManage && <CreateSessionDialog onSuccess={fetchSessions} />}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No sessions scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Create your first training session
              </p>
              {canManage && <CreateSessionDialog onSuccess={fetchSessions} />}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  isToday(session.date) ? 'border-2 border-primary' : ''
                }`}
                onClick={() => navigate(`/session/${session.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {session.location}
                      {isToday(session.date) && (
                        <Badge className="ml-2" variant="default">
                          Today
                        </Badge>
                      )}
                    </CardTitle>
                    <Badge variant="secondary">{session.program_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{session.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Coach: {session.profiles?.name}</span>
                  </div>
                  {session.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Sessions;

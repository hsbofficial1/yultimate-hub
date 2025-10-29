import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CreateTournamentDialog } from '@/components/CreateTournamentDialog';

interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  max_teams: number;
  status: string;
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching tournaments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'registration_open': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
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
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Tournaments</h1>
            </div>
          </div>
          {(userRole === 'admin' || userRole === 'tournament_director') && (
            <CreateTournamentDialog />
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No tournaments yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a tournament!
              </p>
              {(userRole === 'admin' || userRole === 'tournament_director') && (
                <Button onClick={() => toast({ title: 'Feature coming soon!' })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tournament
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card 
                key={tournament.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/tournament/${tournament.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{tournament.name}</CardTitle>
                    <Badge variant={getStatusColor(tournament.status)}>
                      {tournament.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(tournament.start_date).toLocaleDateString()} - {' '}
                      {new Date(tournament.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{tournament.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Max {tournament.max_teams} teams</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Tournaments;

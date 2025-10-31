import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Plus, Activity, Globe, Loader2 } from 'lucide-react';
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
  const [publishingId, setPublishingId] = useState<string | null>(null);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'registration_open': return 'Open';
      case 'in_progress': return 'Live';
      case 'completed': return 'Done';
      default: return status;
    }
  };

  const canManage = userRole === 'admin' || userRole === 'tournament_director';

  const publishTournament = async (tournamentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setPublishingId(tournamentId);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'registration_open' })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Tournament published!',
        description: 'The tournament is now open for registration.',
      });
      fetchTournaments();
    } catch (error: any) {
      toast({
        title: 'Error publishing tournament',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPublishingId(null);
    }
  };

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
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  Tournaments
                </h1>
                <p className="text-xs text-muted-foreground">
                  Competition Hub
                </p>
              </div>
            </div>
          </div>
          {(userRole === 'admin' || userRole === 'tournament_director') && (
            <CreateTournamentDialog />
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-base font-medium text-muted-foreground">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="pt-16">
              <div className="h-20 w-20 mx-auto mb-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No tournaments yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Be the first to create a tournament and get the competition started!
              </p>
              {(userRole === 'admin' || userRole === 'tournament_director') && (
                <CreateTournamentDialog />
              )}
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-6">All Tournaments</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Card 
                  key={tournament.id}
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer border border-border bg-card group"
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg font-semibold flex-1 pr-2">
                        {tournament.name}
                      </CardTitle>
                      <Badge 
                        variant={getStatusColor(tournament.status)} 
                        className="text-xs flex-shrink-0"
                      >
                        {getStatusLabel(tournament.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tournament.start_date).toLocaleDateString('en-US', { year: 'numeric' })}
                        </p>
                      </div>
                      {tournament.start_date !== tournament.end_date && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <div>
                            <p className="font-medium text-foreground">
                              {new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tournament.end_date).toLocaleDateString('en-US', { year: 'numeric' })}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-7 w-7 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <p className="font-medium text-foreground">{tournament.location}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-7 w-7 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-3.5 w-3.5 text-secondary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Max {tournament.max_teams} teams
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Team limit
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t mt-3 space-y-2">
                      {canManage && tournament.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={(e) => publishTournament(tournament.id, e)}
                          disabled={publishingId === tournament.id}
                          className="w-full"
                          variant="outline"
                        >
                          {publishingId === tournament.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Globe className="h-3 w-3 mr-2" />
                              Publish
                            </>
                          )}
                        </Button>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>View Details</span>
                        <span>→</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tournaments;

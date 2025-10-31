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
    <div className="min-h-screen bg-gradient-to-br from-primary/8 via-secondary/6 to-accent/6 grass-texture">
      <header className="border-b-2 border-primary/30 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-primary/10 border border-border/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Tournaments
                </h1>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

      <main className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-16">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="text-center py-16 border-2 border-primary/30 bg-card/95 backdrop-blur-sm shadow-xl">
            <CardContent className="pt-16">
              <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                <Trophy className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wide mb-3">No tournaments yet</h3>
              <p className="text-muted-foreground font-semibold mb-6 max-w-md mx-auto">
                Be the first to create a tournament and get the competition started!
              </p>
              {(userRole === 'admin' || userRole === 'tournament_director') && (
                <CreateTournamentDialog />
              )}
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-black mb-6 uppercase tracking-wider text-foreground/90">All Tournaments</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <Card 
                  key={tournament.id}
                  className="hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] border-2 border-primary/20 hover:border-primary/50 bg-card/95 backdrop-blur-sm shadow-lg group"
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-xl font-black uppercase tracking-wide flex-1 pr-2 group-hover:text-primary transition-colors">
                        {tournament.name}
                      </CardTitle>
                      <Badge 
                        variant={getStatusColor(tournament.status)} 
                        className="font-bold uppercase tracking-wide text-xs px-2 py-1 flex-shrink-0"
                      >
                        {getStatusLabel(tournament.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          {new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                          {new Date(tournament.start_date).toLocaleDateString('en-US', { year: 'numeric' })}
                        </p>
                      </div>
                      {tournament.start_date !== tournament.end_date && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <div>
                            <p className="font-bold text-foreground">
                              {new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                              {new Date(tournament.end_date).toLocaleDateString('en-US', { year: 'numeric' })}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-secondary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground uppercase tracking-wide">{tournament.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          Max {tournament.max_teams} teams
                        </p>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                          Team limit
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/50 mt-4 space-y-3">
                      {canManage && tournament.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={(e) => publishTournament(tournament.id, e)}
                          disabled={publishingId === tournament.id}
                          className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                        >
                          {publishingId === tournament.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Globe className="h-3 w-3 mr-2" />
                              Publish Now
                            </>
                          )}
                        </Button>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">View Details</span>
                        <div className="h-6 w-6 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                          <span className="text-xs font-black text-primary">→</span>
                        </div>
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

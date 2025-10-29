import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const playerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(10, 'Age must be at least 10').max(100, 'Invalid age'),
  gender: z.enum(['male', 'female', 'other']),
});

const teamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

type PlayerFormData = z.infer<typeof playerSchema>;
type TeamFormData = z.infer<typeof teamSchema>;

const TeamRegistration = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<PlayerFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const teamForm = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      email: user?.email || '',
      phone: '',
    },
  });

  const playerForm = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 18,
      gender: 'male',
    },
  });

  const addPlayer = (data: PlayerFormData) => {
    setPlayers([...players, data]);
    playerForm.reset();
    toast({ title: 'Player added to roster' });
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const submitTeam = async (data: TeamFormData) => {
    if (players.length < 7) {
      toast({
        title: 'Minimum 7 players required',
        description: 'Add at least 7 players to register your team',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          tournament_id: tournamentId,
          captain_id: user?.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: 'pending',
        })
        .select()
        .single();

      if (teamError || !team) throw teamError || new Error('Failed to create team');

      const playersWithTeam: { name: string; email: string; age: number; gender: string; team_id: string }[] = players.map((player) => ({
        name: player.name,
        email: player.email,
        age: player.age,
        gender: player.gender,
        team_id: team.id as string,
      }));

      const { error: playersError } = await supabase
        .from('team_players')
        .insert(playersWithTeam as any);

      if (playersError) throw playersError;

      toast({
        title: 'Team registered successfully!',
        description: 'Your team is pending approval',
      });

      navigate(`/tournament/${tournamentId}`);
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/tournament/${tournamentId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Team Registration</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Team Details */}
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
              <CardDescription>Basic information about your team</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...teamForm}>
                <form className="space-y-4">
                  <FormField
                    control={teamForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai Thunder" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={teamForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={teamForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Add Players */}
          <Card>
            <CardHeader>
              <CardTitle>Add Players</CardTitle>
              <CardDescription>Add at least 7 players to your roster</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...playerForm}>
                <form onSubmit={playerForm.handleSubmit(addPlayer)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={playerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Player Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={playerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={playerForm.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={playerForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              {...field}
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Player to Roster
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Players List */}
          {players.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team Roster ({players.length} players)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.email} • Age {player.age} • {player.gender}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlayer(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <Button
            size="lg"
            className="w-full"
            onClick={teamForm.handleSubmit(submitTeam)}
            disabled={submitting || players.length < 7}
          >
            {submitting ? 'Submitting...' : 'Register Team'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TeamRegistration;

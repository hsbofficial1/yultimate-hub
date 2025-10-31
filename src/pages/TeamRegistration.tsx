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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react';

const playerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(10, 'Age must be at least 10').max(100, 'Invalid age'),
  gender: z.enum(['male', 'female', 'other']),
});

const teamSchema = z.object({
  captain_name: z.string().min(2, 'Captain name must be at least 2 characters'),
  name: z.string().min(3, 'Team name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  previous_experience: z.string().optional(),
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const teamForm = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      captain_name: '',
      name: '',
      email: user?.email || '',
      phone: '',
      previous_experience: '',
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
    if (players.length >= 15) {
      toast({
        title: 'Maximum 15 players allowed',
        description: 'Remove a player to add another',
        variant: 'destructive',
      });
      return;
    }
    setPlayers([...players, data]);
    playerForm.reset();
    toast({ title: 'Player added to roster' });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Logo must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
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
      // Check for duplicate team name in tournament
      const { data: existingTeams } = await supabase
        .from('teams')
        .select('name')
        .eq('tournament_id', tournamentId)
        .ilike('name', data.name);

      if (existingTeams && existingTeams.length > 0) {
        throw new Error('A team with this name already exists in this tournament');
      }

      let logoUrl: string | null = null;

      // Upload logo if provided
      if (logoFile) {
        setUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
        const filePath = `team-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('team-assets')
          .upload(filePath, logoFile);

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          toast({
            title: 'Logo upload failed',
            description: 'Continuing without logo',
            variant: 'default',
          });
        } else {
          const { data: urlData } = supabase.storage
            .from('team-assets')
            .getPublicUrl(filePath);
          logoUrl = urlData.publicUrl;
        }
        setUploadingLogo(false);
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          tournament_id: tournamentId,
          captain_id: user?.id,
          captain_name: data.captain_name,
          name: data.name,
          email: data.email,
          phone: data.phone,
          previous_experience: data.previous_experience || null,
          logo_url: logoUrl,
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
        description: 'Your team is pending approval. A confirmation email has been sent.',
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
                    name="captain_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Captain Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <FormField
                    control={teamForm.control}
                    name="previous_experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previous Tournament Experience (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="List any tournaments your team has participated in, achievements, etc."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>Team Logo (Optional)</FormLabel>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative">
                          <img src={logoPreview} alt="Logo preview" className="h-20 w-20 object-cover rounded-lg border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={removeLogo}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Upload</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoChange}
                          />
                        </label>
                      )}
                      {!logoPreview && (
                        <p className="text-sm text-muted-foreground">
                          JPG, PNG, or GIF. Max 5MB
                        </p>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Add Players */}
          <Card>
            <CardHeader>
              <CardTitle>Add Players</CardTitle>
              <CardDescription>Add 7-15 players to your roster</CardDescription>
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
                  <Button type="submit" className="w-full" disabled={players.length >= 15}>
                    <Plus className="h-4 w-4 mr-2" />
                    {players.length >= 15 ? 'Maximum Players Reached' : 'Add Player to Roster'}
                  </Button>
                  {players.length >= 15 && (
                    <p className="text-sm text-muted-foreground text-center">
                      You've reached the maximum of 15 players
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Players List */}
          {players.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team Roster ({players.length} players)</CardTitle>
                <CardDescription>
                  {players.length < 7 ? `${7 - players.length} more required` : players.length >= 15 ? 'Maximum reached' : `${15 - players.length} more allowed`}
                </CardDescription>
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
            disabled={submitting || players.length < 7 || uploadingLogo}
          >
            {submitting ? 'Submitting...' : uploadingLogo ? 'Uploading Logo...' : 'Register Team'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TeamRegistration;

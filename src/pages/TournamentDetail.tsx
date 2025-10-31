import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { ArrowLeft, Calendar, MapPin, Users, Play, UserPlus, Globe, Loader2, Download, CheckCircle2, XCircle, FileText, Filter } from 'lucide-react';
=======
import { ArrowLeft, Calendar, MapPin, Users, Play, UserPlus, Globe, Loader2, Download, CheckCircle2, XCircle, FileText, Filter, Trophy, BarChart3 } from 'lucide-react';
>>>>>>> Stashed changes
=======
import { ArrowLeft, Calendar, MapPin, Users, Play, UserPlus, Globe, Loader2, Download, CheckCircle2, XCircle, FileText, Filter, Trophy, BarChart3 } from 'lucide-react';
>>>>>>> Stashed changes

interface Tournament {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  max_teams: number;
  status: string;
}

interface Team {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  logo_url: string | null;
  captain_name?: string;
  previous_experience?: string;
  created_at: string;
}

interface Match {
  id: string;
  field: string;
  scheduled_time: string;
  team_a_score: number;
  team_b_score: number;
  status: string;
  team_a: { name: string };
  team_b: { name: string };
}

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  
  // Team management state
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [teamPlayers, setTeamPlayers] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: false });

      setTeams(teamsData || []);

      // Fetch players for each team
      if (teamsData && teamsData.length > 0) {
        const teamIds = teamsData.map(t => t.id);
        const { data: playersData } = await supabase
          .from('team_players')
          .select('*')
          .in('team_id', teamIds);

        const playersByTeam: Record<string, any[]> = {};
        if (playersData) {
          playersData.forEach(player => {
            if (!playersByTeam[player.team_id]) {
              playersByTeam[player.team_id] = [];
            }
            playersByTeam[player.team_id].push(player);
          });
        }
        setTeamPlayers(playersByTeam);
      }

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(name),
          team_b:teams!team_b_id(name)
        `)
        .eq('tournament_id', id)
        .order('scheduled_time');

      setMatches(matchesData || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching tournament',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveTeam = async (teamId: string, note?: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ status: 'approved' })
        .eq('id', teamId);

      if (error) throw error;

      toast({ 
        title: 'Team approved',
        description: note || 'Team has been approved for the tournament'
      });
      setApprovalDialogOpen(false);
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error approving team',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const rejectTeam = async (teamId: string, note?: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ status: 'rejected' })
        .eq('id', teamId);

      if (error) throw error;

      toast({ 
        title: 'Team rejected',
        description: note || 'Team has been rejected'
      });
      setRejectionDialogOpen(false);
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error rejecting team',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const bulkApprove = async () => {
    if (selectedTeams.size === 0) return;
    
    try {
      const teamIds = Array.from(selectedTeams);
      const { error } = await supabase
        .from('teams')
        .update({ status: 'approved' })
        .in('id', teamIds);

      if (error) throw error;

      toast({ 
        title: `${teamIds.length} teams approved`,
        description: 'Selected teams have been approved'
      });
      setSelectedTeams(new Set());
      setBulkActionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error approving teams',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const bulkReject = async () => {
    if (selectedTeams.size === 0) return;
    
    try {
      const teamIds = Array.from(selectedTeams);
      const { error } = await supabase
        .from('teams')
        .update({ status: 'rejected' })
        .in('id', teamIds);

      if (error) throw error;

      toast({ 
        title: `${teamIds.length} teams rejected`,
        description: 'Selected teams have been rejected'
      });
      setSelectedTeams(new Set());
      setBulkActionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error rejecting teams',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    if (filteredTeams.length === 0) {
      toast({
        title: 'No teams to export',
        variant: 'destructive',
      });
      return;
    }

    const csvData = filteredTeams.map(team => ({
      'Team Name': team.name,
      'Captain': team.captain_name || 'N/A',
      'Email': team.email,
      'Phone': team.phone,
      'Status': team.status,
      'Player Count': teamPlayers[team.id]?.length || 0,
      'Previous Experience': team.previous_experience || 'N/A',
      'Registration Date': new Date(team.created_at).toLocaleDateString(),
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament?.name || 'tournament'}_teams_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: 'Team roster has been downloaded',
    });
  };

  const toggleTeamSelection = (teamId: string) => {
    const newSelected = new Set(selectedTeams);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeams(newSelected);
  };

  const toggleAllTeams = () => {
    if (selectedTeams.size === filteredTeams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(filteredTeams.map(t => t.id)));
    }
  };

  // Filter teams based on status and search
  const filteredTeams = teams.filter(team => {
    const matchesStatus = filterStatus === 'all' || team.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.captain_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate team counts
  const approvedTeams = teams.filter(t => t.status === 'approved' || t.status === 'registered').length;
  const pendingTeams = teams.filter(t => t.status === 'pending').length;
  const waitlistTeams = teams.length > tournament.max_teams 
    ? teams.slice(tournament.max_teams).filter(t => t.status === 'pending').length 
    : 0;

  const publishTournament = async () => {
    if (!tournament) return;
    
    setPublishing(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'registration_open' })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: 'Tournament published!',
        description: 'The tournament is now open for registration.',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error publishing tournament',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Tournament not found</p>
      </div>
    );
  }

  const canManage = userRole === 'admin' || userRole === 'tournament_director';
  const canRegister = tournament.status === 'registration_open' && teams.length < tournament.max_teams;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/8 via-secondary/6 to-accent/6 grass-texture">
      <header className="border-b-2 border-primary/30 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/tournaments')} className="hover:bg-primary/10 border border-border/50">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {tournament.name}
                </h1>
                <div className="flex items-center gap-4 text-sm mt-2">
                  <span className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {tournament.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
<<<<<<< Updated upstream
=======
              <Button 
                variant="outline"
                onClick={() => navigate(`/tournament/${id}/leaderboards`)}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboards
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate(`/tournament/${id}/reports`)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Reports
              </Button>
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
              <Badge className="font-bold uppercase tracking-wide">{tournament.status.replace('_', ' ')}</Badge>
              {canManage && tournament.status === 'draft' && (
                <Button 
                  onClick={publishTournament}
                  disabled={publishing}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Publish Tournament
                    </>
                  )}
                </Button>
              )}
              {canRegister && (
                <Button onClick={() => navigate(`/tournament/${id}/register`)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register Team
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="teams">
          <TabsList>
            <TabsTrigger value="teams">
              Teams ({approvedTeams}/{tournament.max_teams})
              {waitlistTeams > 0 && <span className="ml-1 text-destructive">({waitlistTeams} waitlist)</span>}
            </TabsTrigger>
            <TabsTrigger value="matches">Matches ({matches.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4 mt-6">
            {/* Team Management Controls */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Management</CardTitle>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {canManage && selectedTeams.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <span className="text-sm font-semibold">
                      {selectedTeams.size} team(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setBulkActionDialogOpen(true)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Bulk Actions
                      </Button>
                    </div>
                  </div>
                )}

                {/* Teams Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {canManage && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={filteredTeams.length > 0 && selectedTeams.size === filteredTeams.length}
                              onCheckedChange={toggleAllTeams}
                            />
                          </TableHead>
                        )}
                        <TableHead>Team Name</TableHead>
                        <TableHead>Captain</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">
                            No teams found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTeams.map((team) => (
                          <TableRow key={team.id}>
                            {canManage && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedTeams.has(team.id)}
                                  onCheckedChange={() => toggleTeamSelection(team.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-semibold">{team.name}</TableCell>
                            <TableCell>{team.captain_name || 'N/A'}</TableCell>
                            <TableCell>{team.email}</TableCell>
                            <TableCell>{team.phone}</TableCell>
                            <TableCell>{teamPlayers[team.id]?.length || 0}</TableCell>
                            <TableCell>
                              <Badge variant={
                                team.status === 'approved' || team.status === 'registered' ? 'default' :
                                team.status === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                {team.status}
                              </Badge>
                            </TableCell>
                            {canManage && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {team.status === 'pending' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setApprovalDialogOpen(true);
                                          setSelectedTeams(new Set([team.id]));
                                        }}
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setRejectionDialogOpen(true);
                                          setSelectedTeams(new Set([team.id]));
                                        }}
                                      >
                                        <XCircle className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4 mt-6">
            {matches.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No matches scheduled</h3>
                  <p className="text-muted-foreground">Matches will appear here once scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{match.team_a?.name || 'TBD'}</p>
                          <p className="text-2xl font-bold">{match.team_a_score}</p>
                        </div>
                        <div className="text-center px-4">
                          <Badge>{match.status}</Badge>
                          <p className="text-sm text-muted-foreground mt-2">
                            {new Date(match.scheduled_time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">Field {match.field}</p>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-semibold">{match.team_b?.name || 'TBD'}</p>
                          <p className="text-2xl font-bold">{match.team_b_score}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Leaderboard feature coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Team{selectedTeams.size > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Add optional notes for this approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setApprovalDialogOpen(false);
              setNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              const teamIds = Array.from(selectedTeams);
              teamIds.forEach(id => approveTeam(id, notes));
            }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Team{selectedTeams.size > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Add notes explaining the rejection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectionDialogOpen(false);
              setNotes('');
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              const teamIds = Array.from(selectedTeams);
              teamIds.forEach(id => rejectTeam(id, notes));
            }}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Select an action for {selectedTeams.size} selected team(s)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={bulkApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve All
            </Button>
            <Button variant="destructive" onClick={bulkReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentDetail;

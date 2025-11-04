import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit2,
  Save,
  Loader2,
  Trophy,
  Users,
  ArrowUpDown,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  community?: string;
  seed_number?: number;
  pool_code?: string;
  coach_name?: string;
  status: string;
}

interface Pool {
  id: string;
  pool_name: string;
  pool_type: string;
  teams: Team[];
}

interface TournamentSeedingProps {
  tournamentId: string;
  canManage: boolean;
}

const POOL_COLORS: Record<string, { bg: string; border: string; header: string }> = {
  pool_a: { bg: 'bg-red-50', border: 'border-red-300', header: 'bg-red-500' },
  pool_b: { bg: 'bg-orange-50', border: 'border-orange-300', header: 'bg-orange-500' },
  pool_c: { bg: 'bg-green-50', border: 'border-green-300', header: 'bg-green-500' },
  pool_d: { bg: 'bg-blue-50', border: 'border-blue-300', header: 'bg-blue-500' },
};

export const TournamentSeeding = ({ tournamentId, canManage }: TournamentSeedingProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [editing, setEditing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [showFormat, setShowFormat] = useState(true);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('status', ['approved', 'registered'])
        .order('seed_number', { ascending: true, nullsLast: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch pools
      const { data: poolsData, error: poolsError } = await supabase
        .from('tournament_pools')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('pool_type');

      if (poolsError) throw poolsError;

              // Fetch pool assignments
        if (poolsData && poolsData.length > 0) {
          const poolIds = poolsData.map(p => p.id);
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('team_pool_assignments')
            .select('*, teams(*)')
            .in('pool_id', poolIds)
            .order('seed_number', { ascending: true });

          if (assignmentsError) throw assignmentsError;

          // Fetch team details separately if needed
          const teamIds = (assignmentsData || []).map((a: any) => a.team_id);
          const { data: teamsData } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds);

          const teamsMap = new Map((teamsData || []).map((t: any) => [t.id, t]));

          // Map teams to pools
          const poolsWithTeams: Pool[] = poolsData.map(pool => {
            const poolTeams = (assignmentsData || [])
              .filter((a: any) => a.pool_id === pool.id)
              .map((a: any) => {
                const team = teamsMap.get(a.team_id);
                return team ? {
                  ...team,
                  seed_number: a.seed_number,
                  pool_code: getPoolCode(pool.pool_type),
                } : null;
              })
              .filter(Boolean) as Team[];
            return {
              ...pool,
              teams: poolTeams,
            };
          });

        setPools(poolsWithTeams);
      } else {
        setPools([]);
      }
    } catch (error: any) {
      console.error('Error fetching seeding data:', error);
      toast({
        title: 'Error loading seeding',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPoolCode = (poolType: string): string => {
    const codes: Record<string, string> = {
      pool_a: 'A',
      pool_b: 'B',
      pool_c: 'C',
      pool_d: 'D',
    };
    return codes[poolType] || '';
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam({ ...team });
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          seed_number: selectedTeam.seed_number || null,
          community: selectedTeam.community || null,
        })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team seeding updated',
      });

      setTeamDialogOpen(false);
      setSelectedTeam(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAssignToPool = async (teamId: string, poolType: string, seedNumber: number) => {
    try {
      // Find or create pool
      let pool = pools.find(p => p.pool_type === poolType);
      let poolId = pool?.id;

      if (!poolId) {
        const { data: newPool, error: poolError } = await supabase
          .from('tournament_pools')
          .insert({
            tournament_id: tournamentId,
            pool_name: `Pool ${getPoolCode(poolType)}`,
            pool_type: poolType,
            status: 'draft',
          })
          .select()
          .single();

        if (poolError) throw poolError;
        poolId = newPool.id;
      }

      // Remove team from any existing pool assignments
      const { error: deleteError } = await supabase
        .from('team_pool_assignments')
        .delete()
        .eq('team_id', teamId);

      if (deleteError) throw deleteError;

      // Add team to new pool
      const { error: assignError } = await supabase
        .from('team_pool_assignments')
        .insert({
          pool_id: poolId,
          team_id: teamId,
          seed_number: seedNumber,
        });

      if (assignError) throw assignError;

      toast({
        title: 'Success',
        description: 'Team assigned to pool',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFromPool = async (teamId: string, poolId: string) => {
    try {
      const { error } = await supabase
        .from('team_pool_assignments')
        .delete()
        .eq('team_id', teamId)
        .eq('pool_id', poolId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team removed from pool',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePublishPools = async () => {
    try {
      const poolIds = pools.map(p => p.id);
      const { error } = await supabase
        .from('tournament_pools')
        .update({ status: 'published' })
        .in('id', poolIds);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Pools published successfully',
      });

      setPublishDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sortedTeams = [...teams].sort((a, b) => {
    const aSeed = a.seed_number ?? 999;
    const bSeed = b.seed_number ?? 999;
    return aSeed - bSeed;
  });

  const unassignedTeams = sortedTeams.filter(
    team => !pools.some(pool => pool.teams.some(t => t.id === team.id))
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading seeding data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Seeding & Pools</h3>
          <p className="text-muted-foreground">Manage team seedings and pool assignments</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFormat(!showFormat)}>
              {showFormat ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showFormat ? 'Hide' : 'Show'} Format
            </Button>
            {pools.length > 0 && (
              <Button onClick={() => setPublishDialogOpen(true)}>
                <Trophy className="h-4 w-4 mr-2" />
                Publish Pools
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tournament Format Info */}
      {showFormat && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="bg-red-500 text-white rounded-t-lg">
            <CardTitle>Tournament Format</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p><strong>Pool Division:</strong> Seeds 1-12 are divided into 3 pools (A, B, C) with 4 teams each.</p>
              <p><strong>Pool Play:</strong> A round-robin format will be played within each pool, followed by reseeding within the pool.</p>
              <p><strong>Ranking:</strong> Teams will be ranked based on a points system.</p>
              <p><strong>Playoffs:</strong> The top 8 teams will advance to play quarter-finals and semi-finals. The winner of these matches takes a higher seed.</p>
              <p><strong>Finals:</strong> The tournament culminates in finals between the top two teams.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seedings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seedings based on Y-Ultimate League
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Seed</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Community</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-muted-foreground">
                      No teams found. Please approve teams first.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTeams.map((team, index) => {
                    const poolAssignment = pools.find(p => 
                      p.teams.some(t => t.id === team.id)
                    );
                    const poolCode = poolAssignment 
                      ? `${getPoolCode(poolAssignment.pool_type)}${poolAssignment.teams.find(t => t.id === team.id)?.seed_number || ''}`
                      : '';

                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-bold">
                          {team.seed_number || index + 1}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {poolCode || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">{team.name}</TableCell>
                        <TableCell>{team.community || '-'}</TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTeam(team)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pool Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['pool_a', 'pool_b', 'pool_c'] as const).map((poolType) => {
          const pool = pools.find(p => p.pool_type === poolType);
          const poolCode = getPoolCode(poolType);
          const colors = POOL_COLORS[poolType] || POOL_COLORS.pool_a;
          const poolTeams = pool?.teams || [];

          return (
            <Card key={poolType} className={`${colors.border} border-2`}>
              <CardHeader className={`${colors.header} text-white rounded-t-lg`}>
                <CardTitle className="flex items-center justify-between">
                  <span>Pool {poolCode}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {poolTeams.length}/4
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className={`${colors.bg} pt-4`}>
                {poolTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No teams assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {poolTeams
                      .sort((a, b) => (a.seed_number || 0) - (b.seed_number || 0))
                      .map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 bg-white rounded border shadow-sm"
                        >
                          <div>
                            <div className="font-semibold">
                              Seed {team.seed_number}: {team.name}
                            </div>
                            {team.community && (
                              <div className="text-xs text-muted-foreground">
                                {team.community}
                              </div>
                            )}
                          </div>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => pool && handleRemoveFromPool(team.id, pool.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {canManage && poolTeams.length < 4 && unassignedTeams.length > 0 && (
                  <Select
                    onValueChange={(teamId) => {
                      const nextSeed = poolTeams.length + 1;
                      handleAssignToPool(teamId, poolType, nextSeed);
                    }}
                  >
                    <SelectTrigger className="mt-4">
                      <SelectValue placeholder={`Add team to Pool ${poolCode}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.seed_number ? `Seed ${team.seed_number}: ` : ''}
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unassigned Teams */}
      {unassignedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {unassignedTeams.map((team) => (
                <div
                  key={team.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">
                      {team.seed_number ? `Seed ${team.seed_number}: ` : ''}
                      {team.name}
                    </div>
                    {team.community && (
                      <div className="text-xs text-muted-foreground">
                        {team.community}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <Select
                      onValueChange={(poolType) => {
                        const pool = pools.find(p => p.pool_type === poolType);
                        const nextSeed = (pool?.teams.length || 0) + 1;
                        handleAssignToPool(team.id, poolType, nextSeed);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {(['pool_a', 'pool_b', 'pool_c'] as const).map((pt) => {
                          const p = pools.find(p => p.pool_type === pt);
                          if ((p?.teams.length || 0) >= 4) return null;
                          return (
                            <SelectItem key={pt} value={pt}>
                              Pool {getPoolCode(pt)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Seeding</DialogTitle>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Team Name</label>
                <Input value={selectedTeam.name} disabled />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Seed Number</label>
                <Input
                  type="number"
                  value={selectedTeam.seed_number || ''}
                  onChange={(e) =>
                    setSelectedTeam({
                      ...selectedTeam,
                      seed_number: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="Enter seed number"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Community</label>
                <Input
                  value={selectedTeam.community || ''}
                  onChange={(e) =>
                    setSelectedTeam({
                      ...selectedTeam,
                      community: e.target.value || undefined,
                    })
                  }
                  placeholder="Enter community"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Pools Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Pools</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish these pools? Published pools will be visible to all users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublishPools}>
              <Trophy className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

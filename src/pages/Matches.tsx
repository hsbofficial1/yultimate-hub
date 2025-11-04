import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MatchRow {
  id: string;
  created_at: string;
  tournament_id?: string | null;
  team_a?: string | null;
  team_b?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
}

const Matches = () => {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select('id, created_at, tournament_id, team_a, team_b, status, scheduled_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setMatches((data || []) as MatchRow[]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Matches</h1>
        <Button variant="outline" onClick={fetchMatches}>Refresh</Button>
      </div>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">All Matches</CardTitle>
          <CardDescription>Latest 100 by creation time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground py-10 text-center">Loading matches...</div>
          ) : matches.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center">No matches found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Match</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : new Date(m.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{m.team_a || 'Team A'} vs {m.team_b || 'Team B'}</td>
                      <td className="py-2 pr-4 capitalize text-muted-foreground">{m.status || 'unknown'}</td>
                      <td className="py-2 pr-4">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/match/${m.id}`)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Matches;



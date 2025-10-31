import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, AlertTriangle } from 'lucide-react';

interface SpiritScore {
  id: string;
  from_team_id: string;
  to_team_id: string;
  rules: number;
  fouls: number;
  fairness: number;
  attitude: number;
  communication: number;
  total: number;
  comments: string | null;
  disputed: boolean;
  submitted_at: string;
  from_team: { name: string };
  to_team: { name: string };
}

interface SpiritScoreViewerProps {
  matchId: string;
}

export const SpiritScoreViewer = ({ matchId }: SpiritScoreViewerProps) => {
  const [scores, setScores] = useState<SpiritScore[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchSpiritScores();
  }, [matchId]);

  const fetchSpiritScores = async () => {
    try {
      const { data, error } = await supabase
        .from('spirit_scores')
        .select(`
          *,
          from_team:teams!from_team_id(name),
          to_team:teams!to_team_id(name)
        `)
        .eq('match_id', matchId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setScores(data || []);
    } catch (error: any) {
      console.error('Error fetching spirit scores:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading spirit scores...</div>;
  }

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Heart className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No spirit scores submitted yet</p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (total: number) => {
    if (total >= 18) return 'text-green-600';
    if (total >= 15) return 'text-primary';
    if (total >= 12) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDisputedBadge = (disputed: boolean) => {
    if (!disputed) return null;
    return (
      <Badge variant="destructive" className="ml-2">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Disputed
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {scores.map((score) => (
        <Card key={score.id} className={score.disputed ? 'border-2 border-destructive/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {score.from_team.name} → {score.to_team.name}
              </CardTitle>
              <div className="flex items-center">
                <span className={`text-3xl font-black ${getScoreColor(score.total)}`}>
                  {score.total}
                </span>
                <span className="text-sm text-muted-foreground ml-1">/20</span>
                {getDisputedBadge(score.disputed)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 mb-4">
              {(['rules', 'fouls', 'fairness', 'attitude', 'communication'] as const).map((cat) => (
                <div key={cat} className="text-center">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    {cat.substring(0, 4)}
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {score[cat]}
                  </div>
                </div>
              ))}
            </div>
            {score.comments && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">{score.comments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Sparkles, TrendingUp, Crown } from 'lucide-react';
import { format } from 'date-fns';

interface LeaderboardEntry {
  child_id: string;
  child_name: string;
  age: number;
  photo_url: string | null;
  current_streak: number;
  longest_streak: number;
  streak_started_date: string | null;
  rank: number;
}

interface StreakLeaderboardProps {
  limit?: number;
}

export const StreakLeaderboard = ({ limit = 10 }: StreakLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('streak_leaderboard')
        .select('*')
        .limit(limit);

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeForStreak = (streak: number) => {
    if (streak >= 50) return { icon: Crown, label: 'Platinum', color: 'text-purple-600' };
    if (streak >= 20) return { icon: Trophy, label: 'Gold', color: 'text-yellow-600' };
    if (streak >= 10) return { icon: Medal, label: 'Silver', color: 'text-gray-400' };
    if (streak >= 5) return { icon: Award, label: 'Bronze', color: 'text-orange-600' };
    return null;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-orange-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Attendance Streak Leaderboard
        </h3>
        <Badge variant="outline">
          <TrendingUp className="h-3 w-3 mr-1" />
          Current Streaks
        </Badge>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active streaks yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start attending sessions to build your streak!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const badge = getBadgeForStreak(entry.current_streak);
            return (
              <Card
                key={entry.child_id}
                className={`transition-all hover:shadow-lg ${
                  entry.rank <= 3 ? 'border-2 border-primary/50 bg-primary/5' : ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 flex items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={entry.photo_url || ''} alt={entry.child_name} />
                      <AvatarFallback>
                        {entry.child_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg truncate">{entry.child_name}</p>
                        {badge && (
                          <Badge variant="outline" className="gap-1">
                            <badge.icon className={`h-3 w-3 ${badge.color}`} />
                            {badge.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Age {entry.age}</span>
                        {entry.streak_started_date && (
                          <span>
                            Started: {format(new Date(entry.streak_started_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streak Info */}
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {entry.current_streak}
                        </p>
                        <p className="text-xs text-muted-foreground">Current</p>
                      </div>
                      <div className="border-l pl-4">
                        <p className="text-lg font-semibold text-muted-foreground">
                          {entry.longest_streak}
                        </p>
                        <p className="text-xs text-muted-foreground">Longest</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};


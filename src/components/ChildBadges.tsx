import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface ChildBadge {
  id: string;
  child_id: string;
  badge_type: 'bronze' | 'silver' | 'gold' | 'platinum';
  milestone_sessions: number;
  earned_at: string;
  notified: boolean;
}

interface AttendanceStreak {
  current_streak: number;
  longest_streak: number;
  streak_started_date: string | null;
}

interface ChildBadgesProps {
  childId: string;
  showStreakInfo?: boolean;
}

export const ChildBadges = ({ childId, showStreakInfo = true }: ChildBadgesProps) => {
  const [badges, setBadges] = useState<ChildBadge[]>([]);
  const [streak, setStreak] = useState<AttendanceStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
    if (showStreakInfo) {
      fetchStreak();
    }
  }, [childId, showStreakInfo]);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_badges')
        .select('*')
        .eq('child_id', childId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_streaks')
        .select('current_streak, longest_streak, streak_started_date')
        .eq('child_id', childId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      setStreak(data);
    } catch (error: any) {
      console.error('Error fetching streak:', error);
    }
  };

  const badgeConfig = {
    bronze: {
      icon: Award,
      label: 'Bronze',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      milestone: 5,
    },
    silver: {
      icon: Medal,
      label: 'Silver',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      milestone: 10,
    },
    gold: {
      icon: Trophy,
      label: 'Gold',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      milestone: 20,
    },
    platinum: {
      icon: Crown,
      label: 'Platinum',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-300',
      milestone: 50,
    },
  };

  const getNextMilestone = () => {
    if (!streak) return null;
    
    const milestones = [5, 10, 20, 50];
    const current = streak.current_streak;
    const next = milestones.find((m) => m > current);
    
    if (!next) return null;
    
    return {
      milestone: next,
      sessionsNeeded: next - current,
      badge: Object.entries(badgeConfig).find(
        ([_, config]) => config.milestone === next
      )?.[1],
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading badges...</p>
        </CardContent>
      </Card>
    );
  }

  const earnedBadgeTypes = new Set(badges.map((b) => b.badge_type));
  const nextMilestone = getNextMilestone();

  return (
    <div className="space-y-4">
      {/* Current Streak Info */}
      {showStreakInfo && streak && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Current Attendance Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold text-primary">{streak.current_streak}</p>
                <p className="text-sm text-muted-foreground">Current Streak</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-muted-foreground">
                  {streak.longest_streak}
                </p>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
              </div>
            </div>
            {nextMilestone && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Next Milestone:</p>
                <div className="flex items-center gap-2">
                  <nextMilestone.badge.icon
                    className={`h-5 w-5 ${nextMilestone.badge.color}`}
                  />
                  <span className="font-semibold">
                    {nextMilestone.badge.label} Badge ({nextMilestone.milestone} sessions)
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {nextMilestone.sessionsNeeded} more session
                    {nextMilestone.sessionsNeeded > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Earned Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Earned Badges</CardTitle>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No badges earned yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Attend {nextMilestone?.sessionsNeeded || 5} more sessions to earn your first badge!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(badgeConfig).map(([type, config]) => {
                const earned = earnedBadgeTypes.has(type as any);
                const badgeData = badges.find((b) => b.badge_type === type);

                return (
                  <div
                    key={type}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      earned
                        ? `${config.bgColor} ${config.borderColor}`
                        : 'bg-muted/30 border-muted opacity-50'
                    }`}
                  >
                    <config.icon
                      className={`h-12 w-12 mx-auto mb-2 ${
                        earned ? config.color : 'text-muted-foreground'
                      }`}
                    />
                    <p className="font-semibold mb-1">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.milestone} sessions
                    </p>
                    {badgeData && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Earned: {format(new Date(badgeData.earned_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


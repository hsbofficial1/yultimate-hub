import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreakLeaderboard } from '@/components/StreakLeaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StreakLeaderboardPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  useEffect(() => {
    // Allow coaches, managers, and admins to view
    if (
      userRole !== 'coach' &&
      userRole !== 'program_manager' &&
      userRole !== 'admin'
    ) {
      navigate('/');
    }
  }, [userRole, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Streak Leaderboard</h1>
                <p className="text-xs text-muted-foreground">Attendance streaks</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <StreakLeaderboard limit={20} />
      </main>
    </div>
  );
};

export default StreakLeaderboardPage;


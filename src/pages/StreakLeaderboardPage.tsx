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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Streak Leaderboard</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <StreakLeaderboard limit={20} />
      </main>
    </div>
  );
};

export default StreakLeaderboardPage;


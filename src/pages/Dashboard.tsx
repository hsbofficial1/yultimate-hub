import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, TrendingUp, LogOut, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    tournaments: 0,
    teams: 0,
    matches: 0,
    children: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [tournaments, teams, matches, children] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact' }),
        supabase.from('teams').select('id', { count: 'exact' }),
        supabase.from('matches').select('id', { count: 'exact' }),
        supabase.from('children').select('id', { count: 'exact' }),
      ]);

      setStats({
        tournaments: tournaments.count || 0,
        teams: teams.count || 0,
        matches: matches.count || 0,
        children: children.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const roleFeatures = {
    admin: [
      { icon: Trophy, title: 'Manage Tournaments', desc: 'Create and oversee tournaments', path: '/tournaments' },
      { icon: Users, title: 'Manage Children', desc: 'View all children', path: '/children' },
      { icon: Calendar, title: 'Training Sessions', desc: 'View all sessions', path: '/sessions' },
      { icon: BarChart3, title: 'Reports & Analytics', desc: 'View detailed reports', path: '/reports' },
    ],
    tournament_director: [
      { icon: Trophy, title: 'Manage Tournaments', desc: 'Create and oversee tournaments', path: '/tournaments' },
      { icon: BarChart3, title: 'Reports & Analytics', desc: 'View tournament reports', path: '/reports' },
    ],
    team_captain: [
      { icon: Trophy, title: 'Tournaments', desc: 'View tournaments', path: '/tournaments' },
    ],
    coach: [
      { icon: Users, title: 'Children Profiles', desc: 'Manage child profiles', path: '/children' },
      { icon: Calendar, title: 'Training Sessions', desc: 'Track session attendance', path: '/sessions' },
      { icon: BarChart3, title: 'Reports & Analytics', desc: 'View training reports', path: '/reports' },
    ],
    program_manager: [
      { icon: Users, title: 'All Children', desc: 'View all children', path: '/children' },
      { icon: Calendar, title: 'All Sessions', desc: 'View all sessions', path: '/sessions' },
      { icon: BarChart3, title: 'Reports & Analytics', desc: 'View program analytics', path: '/reports' },
    ],
    player: [
      { icon: Trophy, title: 'Tournaments', desc: 'Browse tournaments', path: '/tournaments' },
    ],
    volunteer: [
      { icon: Trophy, title: 'Tournaments', desc: 'View tournaments', path: '/tournaments' },
    ],
  };

  const features = roleFeatures[userRole as keyof typeof roleFeatures] || roleFeatures.player;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Y-Ultimate
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole?.replace('_', ' ')}</p>
            </div>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">
            {userRole === 'admin' && 'Manage the entire platform from here.'}
            {userRole === 'tournament_director' && 'Oversee tournaments and manage matches.'}
            {userRole === 'team_captain' && 'Lead your team to victory!'}
            {userRole === 'coach' && 'Track and support your young athletes.'}
            {userRole === 'program_manager' && 'Monitor coaching programs and coach performance.'}
            {userRole === 'player' && 'Ready to compete? Check out upcoming tournaments.'}
            {userRole === 'volunteer' && 'Help make tournaments run smoothly!'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(feature.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.tournaments}</p>
                <p className="text-sm text-muted-foreground">Active Tournaments</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-secondary">{stats.teams}</p>
                <p className="text-sm text-muted-foreground">Teams Registered</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">{stats.matches}</p>
                <p className="text-sm text-muted-foreground">Matches Played</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.children}</p>
                <p className="text-sm text-muted-foreground">Children Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;

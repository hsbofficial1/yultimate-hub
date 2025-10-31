import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Activity } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/');
      } else {
        navigate('/auth');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/10 grass-texture">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
          <div className="relative h-20 w-20 mx-auto bg-primary rounded-full flex items-center justify-center shadow-2xl border-4 border-background transform rotate-12">
            <Trophy className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-black tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Y-ULTIMATE
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-spin" />
          <p className="text-lg font-semibold uppercase tracking-wide">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

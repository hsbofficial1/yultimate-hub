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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-6">
          <div className="h-16 w-16 mx-auto bg-primary rounded-lg flex items-center justify-center shadow-lg">
            <Trophy className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="mb-4 text-3xl font-semibold">
          Y-Ultimate
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-spin" />
          <p className="text-base">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

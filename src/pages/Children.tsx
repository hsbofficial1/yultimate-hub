import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowLeft, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CreateChildDialog } from '@/components/CreateChildDialog';

interface Child {
  id: string;
  name: string;
  age: number;
  gender: string;
  school: string;
  community: string;
  active: boolean;
  join_date: string;
}

const Children = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (userRole !== 'coach' && userRole !== 'program_manager' && userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchChildren();
  }, [userRole, navigate]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setChildren(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching children',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Children Profiles</h1>
            </div>
          </div>
          <CreateChildDialog onSuccess={fetchChildren} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading profiles...</p>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No children enrolled yet</h3>
              <p className="text-muted-foreground mb-4">
                Start adding children to your coaching program!
              </p>
              <CreateChildDialog onSuccess={fetchChildren} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Card 
                key={child.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => toast({ title: 'Child profile details coming soon!' })}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-10 w-10 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        <CardDescription>Age {child.age}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={child.active ? 'default' : 'secondary'}>
                      {child.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {child.school && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">School:</span> {child.school}
                    </p>
                  )}
                  {child.community && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Community:</span> {child.community}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Joined:</span>{' '}
                    {new Date(child.join_date).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Children;

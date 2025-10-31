import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, FileText, CheckSquare, Image as ImageIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { HomeVisitDialog } from './HomeVisitDialog';
import { useToast } from '@/hooks/use-toast';

interface HomeVisit {
  id: string;
  visit_date: string;
  duration_minutes: number | null;
  purpose: string;
  observations: string | null;
  notes: string | null;
  action_items: string | null;
  visitor_name: string | null;
  created_at: string;
  photo_count: number;
}

interface HomeVisitTimelineProps {
  childId: string;
  childName: string;
}

export const HomeVisitTimeline = ({ childId, childName }: HomeVisitTimelineProps) => {
  const [visits, setVisits] = useState<HomeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { userRole } = useAuth();
  const { toast } = useToast();

  const canManage = userRole === 'admin' || userRole === 'coach' || userRole === 'program_manager';

  useEffect(() => {
    fetchVisits();
  }, [childId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);

      // Try to use the database function, fallback to direct query
      const { data, error } = await supabase.rpc('get_child_home_visit_timeline', {
        _child_id: childId,
        _limit: 50,
      });

      if (error) {
        // Fallback to direct query
        const { data: visitsData, error: visitsError } = await supabase
          .from('home_visits')
          .select(
            `
            *,
            profiles:visited_by(name)
          `
          )
          .eq('child_id', childId)
          .order('visit_date', { ascending: false })
          .limit(50);

        if (visitsError) throw visitsError;

        const visitIds = visitsData?.map((v) => v.id) || [];
        const { data: photosData } = await supabase
          .from('home_visit_photos')
          .select('visit_id')
          .in('visit_id', visitIds);

        const photoCounts = new Map<string, number>();
        photosData?.forEach((p) => {
          photoCounts.set(p.visit_id, (photoCounts.get(p.visit_id) || 0) + 1);
        });

        const combined = visitsData?.map((visit) => ({
          id: visit.id,
          visit_date: visit.visit_date,
          duration_minutes: visit.duration_minutes,
          purpose: visit.purpose,
          observations: visit.observations,
          notes: visit.notes,
          action_items: visit.action_items,
          visitor_name: visit.profiles?.name || null,
          created_at: visit.created_at,
          photo_count: photoCounts.get(visit.id) || 0,
        })) || [];

        setVisits(combined);
      } else {
        setVisits(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching home visits:', error);
      toast({
        title: 'Error loading visits',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (visitId: string) => {
    if (!confirm('Are you sure you want to delete this visit?')) return;

    try {
      const { error } = await supabase.from('home_visits').delete().eq('id', visitId);

      if (error) throw error;

      toast({
        title: 'Visit deleted',
      });

      fetchVisits();
    } catch (error: any) {
      toast({
        title: 'Error deleting visit',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getPurposeLabel = (purpose: string) => {
    const labels: Record<string, string> = {
      initial_visit: 'Initial Visit',
      follow_up: 'Follow-up',
      parent_meeting: 'Parent Meeting',
      welfare_check: 'Welfare Check',
      other: 'Other',
    };
    return labels[purpose] || purpose;
  };

  const getPurposeVariant = (purpose: string): 'default' | 'secondary' | 'outline' => {
    if (purpose === 'initial_visit') return 'default';
    if (purpose === 'welfare_check') return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading home visits...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Home Visit Timeline</h3>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setSelectedVisitId(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Visit
          </Button>
        )}
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No home visits logged yet</p>
            {canManage && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedVisitId(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Log First Visit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(visit.visit_date), 'MMMM d, yyyy')}
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={getPurposeVariant(visit.purpose)}>
                        {getPurposeLabel(visit.purpose)}
                      </Badge>
                      {visit.duration_minutes && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {visit.duration_minutes} min
                        </div>
                      )}
                      {visit.visitor_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {visit.visitor_name}
                        </div>
                      )}
                      {visit.photo_count > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          {visit.photo_count} photo{visit.photo_count > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedVisitId(visit.id);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(visit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {visit.observations && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Observations</span>
                    </div>
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: visit.observations }}
                    />
                  </div>
                )}
                {visit.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{visit.notes}</p>
                  </div>
                )}
                {visit.action_items && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Action Items</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{visit.action_items}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HomeVisitDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedVisitId(undefined);
          }
        }}
        childId={childId}
        visitId={selectedVisitId}
        onSuccess={fetchVisits}
      />
    </div>
  );
};


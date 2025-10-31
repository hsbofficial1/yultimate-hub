import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface OverdueVisitAlert {
  id: string;
  child_id: string;
  days_since_last_visit: number;
  alert_type: string;
  message: string | null;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  children: {
    id: string;
    name: string;
    parent_name: string;
    parent_phone: string;
  };
}

interface OverdueVisitAlertsProps {
  limit?: number;
  showResolved?: boolean;
}

export const OverdueVisitAlerts = ({
  limit = 10,
  showResolved = false,
}: OverdueVisitAlertsProps) => {
  const [alerts, setAlerts] = useState<OverdueVisitAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('overdue_visit_alerts')
        .select(
          `
          *,
          children (
            id,
            name,
            parent_name,
            parent_phone
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!showResolved) {
        query = query.eq('resolved', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching alerts',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('overdue_visit_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert acknowledged',
      });

      fetchAlerts();
    } catch (error: any) {
      toast({
        title: 'Error acknowledging alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('overdue_visit_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert resolved',
      });

      fetchAlerts();
    } catch (error: any) {
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged && !a.resolved);

  return (
    <div className="space-y-4">
      {unacknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Overdue Visit Alerts ({unacknowledgedAlerts.length})
          </h3>
          {unacknowledgedAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                <span>
                  {alert.children.name} - {alert.days_since_last_visit} days since last visit
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">{alert.message}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{Math.floor(alert.days_since_last_visit / 30)} months overdue</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Parent: {alert.children.parent_name}</span>
                  </div>
                  <a
                    href={`tel:${alert.children.parent_phone}`}
                    className="text-primary hover:underline"
                  >
                    {alert.children.parent_phone}
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Acknowledged Alerts</h3>
          {acknowledgedAlerts.map((alert) => (
            <Card key={alert.id} className="border-yellow-200 bg-yellow-50">
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">
                        {alert.children.name} - {alert.days_since_last_visit} days since last visit
                      </span>
                      <Badge variant="outline">Acknowledged</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                    {alert.acknowledged_at && (
                      <p className="text-xs text-muted-foreground">
                        Acknowledged: {format(new Date(alert.acknowledged_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-muted-foreground">No overdue visit alerts</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


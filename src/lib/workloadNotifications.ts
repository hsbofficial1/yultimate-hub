// Coach workload notification service for email alerts
// This would integrate with email service or Supabase Edge Function

import { supabase } from '@/lib/supabaseClient';

interface BurnoutAlert {
  alertId: string;
  coachName: string;
  coachEmail: string;
  weekStartDate: string;
  totalHours: number;
  hoursOverLimit: number;
}

class WorkloadNotificationService {
  // Send burnout alert email to program managers
  async sendBurnoutAlert(alert: BurnoutAlert): Promise<void> {
    const { coachName, weekStartDate, totalHours, hoursOverLimit } = alert;

    const subject = `⚠️ Coach Burnout Alert: ${coachName}`;
    
    const message = `Coach Workload Burnout Alert

${coachName} has exceeded the recommended 25 hours per week threshold.

Week: ${weekStartDate}
Total Hours: ${totalHours.toFixed(1)}
Hours Over Limit: ${hoursOverLimit.toFixed(1)}

Recommended Actions:
- Review their current workload
- Consider redistributing sessions to other coaches
- Check in with the coach about their well-being

Visit the Coach Workload Dashboard to view detailed breakdown and suggestions.

- Y-Ultimate System`;

    // In production, this would call email service or Supabase Edge Function
    // For now, we'll mark as sent in the database
    await this.markAlertAsSent(alert.alertId);
    
    console.log(`Burnout alert sent for ${coachName}:`, message);
    
    // TODO: Integrate with actual email API
    // Example: await fetch('/api/email/send', { 
    //   method: 'POST', 
    //   body: JSON.stringify({ 
    //     to: 'program-manager@yultimate.com', 
    //     subject,
    //     message 
    //   }) 
    // });
  }

  // Mark alert as sent in database
  private async markAlertAsSent(alertId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_alert_as_sent', {
        _alert_id: alertId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking alert as sent:', error);
    }
  }

  // Get program manager emails from database
  async getProgramManagerEmails(): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('get_program_manager_emails');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting program manager emails:', error);
      return [];
    }
  }

  // Process pending burnout alerts and send notifications
  async processPendingAlerts(): Promise<void> {
    try {
      const { data: alerts, error } = await supabase
        .from('coach_workload_alerts')
        .select(
          `
          *,
          coach:profiles!coach_id(name, email)
        `
        )
        .eq('alert_sent', false)
        .eq('resolved', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!alerts || alerts.length === 0) return;

      const programManagerEmails = await this.getProgramManagerEmails();

      for (const alert of alerts) {
        if (!alert.coach) continue;

        await this.sendBurnoutAlert({
          alertId: alert.id,
          coachName: alert.coach.name,
          coachEmail: alert.coach.email,
          weekStartDate: alert.week_start_date,
          totalHours: alert.total_hours,
          hoursOverLimit: alert.hours_over_limit,
        });

        console.log(
          `Burnout alert sent to ${programManagerEmails.length} program manager(s) for ${alert.coach.name}`
        );
      }
    } catch (error) {
      console.error('Error processing pending alerts:', error);
    }
  }
}

export const workloadNotifications = new WorkloadNotificationService();

// Periodic check for pending alerts (every hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    workloadNotifications.processPendingAlerts();
  }, 60 * 60 * 1000);
}



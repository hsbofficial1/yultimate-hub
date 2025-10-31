// Milestone notification service for WhatsApp and other notifications
// This would integrate with WhatsApp Business API or similar service

import { supabase } from '@/lib/supabaseClient';

interface MilestoneNotification {
  childId: string;
  childName: string;
  parentWhatsApp: string | null;
  parentName: string;
  milestone: number;
  badgeType: 'bronze' | 'silver' | 'gold' | 'platinum';
  currentStreak: number;
}

interface StreakBrokenNotification {
  childId: string;
  childName: string;
  parentWhatsApp: string | null;
  parentName: string;
  brokenStreak: number;
  sessionDate: string;
}

class MilestoneNotificationService {
  // Send congratulatory message for milestone achievement
  async sendMilestoneNotification(notification: MilestoneNotification): Promise<void> {
    const { parentWhatsApp, badgeType, milestone, childName } = notification;

    if (!parentWhatsApp) {
      console.warn(`No WhatsApp number for ${childName}`);
      return;
    }

    const badgeNames = {
      bronze: '🥉 Bronze',
      silver: '🥈 Silver',
      gold: '🥇 Gold',
      platinum: '💎 Platinum',
    };

    const message = `🎉 Congratulations! 🎉

${childName} has achieved an amazing milestone!

🏆 ${badgeNames[badgeType]} Badge Earned
📊 ${milestone} Consecutive Sessions Attended!

Keep up the excellent attendance! Your commitment is inspiring! ✨

- Y-Ultimate Team`;

    // In production, this would call WhatsApp Business API or Supabase Edge Function
    // For now, we'll mark as notified in the database
    await this.markBadgeAsNotified(notification.childId, badgeType);
    
    console.log(`Milestone notification sent to ${parentWhatsApp}:`, message);
    
    // TODO: Integrate with actual WhatsApp API
    // Example: await fetch('/api/whatsapp/send', { method: 'POST', body: JSON.stringify({ to: parentWhatsApp, message }) });
  }

  // Send notification when streak is broken (to coach)
  async sendStreakBrokenNotification(
    notification: StreakBrokenNotification,
    coachIds: string[]
  ): Promise<void> {
    const { childName, brokenStreak } = notification;

    const message = `⚠️ Streak Alert

${childName}'s attendance streak has been broken.

📊 Broken Streak: ${brokenStreak} consecutive sessions
📅 Last Session: ${new Date(notification.sessionDate).toLocaleDateString()}

This may be an opportunity to check in with the child/parent.

- Y-Ultimate System`;

    // In production, this would notify coaches via their preferred method
    // For now, we'll just log it
    console.log(`Streak broken notification for ${childName}:`, message);
    console.log(`Notify coaches:`, coachIds);

    // TODO: Implement coach notification system
    // This could be via email, in-app notifications, or WhatsApp
  }

  // Mark badge as notified in database
  private async markBadgeAsNotified(
    childId: string,
    badgeType: string
  ): Promise<void> {
    try {
      await supabase
        .from('attendance_badges')
        .update({
          notified: true,
          notified_at: new Date().toISOString(),
        })
        .eq('child_id', childId)
        .eq('badge_type', badgeType);
    } catch (error) {
      console.error('Error marking badge as notified:', error);
    }
  }

  // Check for unnotified badges and send notifications
  async processPendingNotifications(): Promise<void> {
    try {
      const { data: badges, error } = await supabase
        .from('attendance_badges')
        .select(
          `
          *,
          children (
            id,
            name,
            parent_name,
            parent_whatsapp
          )
        `
        )
        .eq('notified', false)
        .order('earned_at', { ascending: true });

      if (error) throw error;

      if (!badges || badges.length === 0) return;

      for (const badge of badges) {
        if (!badge.children) continue;

        await this.sendMilestoneNotification({
          childId: badge.child_id,
          childName: badge.children.name,
          parentWhatsApp: badge.children.parent_whatsapp,
          parentName: badge.children.parent_name,
          milestone: badge.milestone_sessions,
          badgeType: badge.badge_type,
          currentStreak: badge.milestone_sessions, // This would ideally come from streak table
        });
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }
}

export const milestoneNotifications = new MilestoneNotificationService();

// Periodic check for pending notifications (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    milestoneNotifications.processPendingNotifications();
  }, 5 * 60 * 1000);
}


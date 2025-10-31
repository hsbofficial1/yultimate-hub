// Service to check for overdue visits periodically
// This should be called regularly to check for children who haven't been visited in 3+ months

import { supabase } from '@/lib/supabaseClient';

class OverdueVisitChecker {
  async checkOverdueVisits(): Promise<void> {
    try {
      // Call the database function to check for overdue visits
      const { error } = await supabase.rpc('check_overdue_visits');

      if (error) {
        console.error('Error checking overdue visits:', error);
      } else {
        console.log('Overdue visit check completed');
      }
    } catch (error) {
      console.error('Error in overdue visit checker:', error);
    }
  }
}

export const overdueVisitChecker = new OverdueVisitChecker();

// Check for overdue visits on load and then daily
if (typeof window !== 'undefined') {
  // Check immediately
  overdueVisitChecker.checkOverdueVisits();

  // Check daily (every 24 hours)
  setInterval(() => {
    overdueVisitChecker.checkOverdueVisits();
  }, 24 * 60 * 60 * 1000);
}


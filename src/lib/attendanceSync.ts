// Attendance sync service for offline/online synchronization

import { supabase } from '@/lib/supabaseClient';
import { offlineStorage } from './offlineStorage';

class AttendanceSyncService {
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Initialize sync on load
    if (this.isOnline) {
      this.syncPendingData();
    }
  }

  async syncPendingData(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Sync attendance
      await this.syncAttendance();

      // Sync session notes
      await this.syncSessionNotes();
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncAttendance(): Promise<void> {
    const pending = await offlineStorage.getPendingAttendance();

    for (const record of pending) {
      try {
        // Check if record already exists
        const { data: existing } = await supabase
          .from('attendance')
          .select('id')
          .eq('session_id', record.session_id)
          .eq('child_id', record.child_id)
          .single();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('attendance')
            .update({
              present: record.present,
              marked_at: record.marked_at,
              synced: true,
            })
            .eq('session_id', record.session_id)
            .eq('child_id', record.child_id);

          if (!error) {
            await offlineStorage.markAttendanceSynced(record.session_id, record.child_id);
          } else {
            throw error;
          }
        } else {
          // Insert new record
          const { error } = await supabase.from('attendance').insert({
            session_id: record.session_id,
            child_id: record.child_id,
            present: record.present,
            marked_at: record.marked_at,
            synced: true,
          });

          if (!error) {
            await offlineStorage.markAttendanceSynced(record.session_id, record.child_id);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error(`Failed to sync attendance record ${record.id}:`, error);
        // Continue with other records
      }
    }
  }

  private async syncSessionNotes(): Promise<void> {
    const pending = await offlineStorage.getPendingSessionNotes();

    for (const record of pending) {
      try {
        const { error } = await supabase
          .from('sessions')
          .update({ notes: record.notes })
          .eq('id', record.session_id);

        if (!error) {
          await offlineStorage.markNotesSynced(record.session_id);
        } else {
          throw error;
        }
      } catch (error) {
        console.error(`Failed to sync session notes for ${record.session_id}:`, error);
        // Continue with other records
      }
    }
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const attendanceSync = new AttendanceSyncService();


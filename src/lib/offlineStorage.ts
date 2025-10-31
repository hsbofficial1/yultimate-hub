// Offline storage service using IndexedDB for attendance data

interface PendingAttendance {
  id: string;
  session_id: string;
  child_id: string;
  present: boolean;
  marked_at: string;
  synced: boolean;
}

interface PendingSessionNotes {
  session_id: string;
  notes: string;
  synced: boolean;
}

class OfflineStorage {
  private dbName = 'yultimate-attendance';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Attendance store - use composite key
        if (!db.objectStoreNames.contains('attendance')) {
          const attendanceStore = db.createObjectStore('attendance', {
            keyPath: ['session_id', 'child_id'],
          });
          attendanceStore.createIndex('session_id', 'session_id', { unique: false });
          attendanceStore.createIndex('synced', 'synced', { unique: false });
          attendanceStore.createIndex('id', 'id', { unique: true });
        }

        // Session notes store
        if (!db.objectStoreNames.contains('sessionNotes')) {
          const notesStore = db.createObjectStore('sessionNotes', {
            keyPath: 'session_id',
          });
          notesStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Attendance methods
  async saveAttendance(
    sessionId: string,
    childId: string,
    present: boolean
  ): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');

    // Check if record exists
    const index = store.index('session_id');
    const request = index.getAll(sessionId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const existing = request.result.find((r: PendingAttendance) => r.child_id === childId);
        
        // If record exists, update it; otherwise create new
        if (existing) {
          existing.present = present;
          existing.marked_at = new Date().toISOString();
          existing.synced = false;
          const putRequest = store.put(existing);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          const record: PendingAttendance = {
            id: `${sessionId}-${childId}`,
            session_id: sessionId,
            child_id: childId,
            present,
            marked_at: new Date().toISOString(),
            synced: false,
          };

          // Use composite key [session_id, child_id]
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAttendance(sessionId: string): Promise<Map<string, boolean>> {
    const db = this.ensureDB();
    const transaction = db.transaction(['attendance'], 'readonly');
    const store = transaction.objectStore('attendance');
    const index = store.index('session_id');
    const request = index.getAll(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const attendanceMap = new Map<string, boolean>();
        request.result.forEach((record: PendingAttendance) => {
          attendanceMap.set(record.child_id, record.present);
        });
        resolve(attendanceMap);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingAttendance(): Promise<PendingAttendance[]> {
    const db = this.ensureDB();
    const transaction = db.transaction(['attendance'], 'readonly');
    const store = transaction.objectStore('attendance');
    const index = store.index('synced');
    const request = index.getAll(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAttendanceSynced(sessionId: string, childId: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');
    const request = store.get([sessionId, childId]);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const record = request.result;
        if (record) {
          record.synced = true;
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAttendance(sessionId: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');
    const index = store.index('session_id');
    const request = index.getAll(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        request.result.forEach((record: PendingAttendance) => {
          store.delete(record.id);
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Session notes methods
  async saveSessionNotes(sessionId: string, notes: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction(['sessionNotes'], 'readwrite');
    const store = transaction.objectStore('sessionNotes');

    const record: PendingSessionNotes = {
      session_id: sessionId,
      notes,
      synced: false,
    };

    const request = store.put(record);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSessionNotes(sessionId: string): Promise<string | null> {
    const db = this.ensureDB();
    const transaction = db.transaction(['sessionNotes'], 'readonly');
    const store = transaction.objectStore('sessionNotes');
    const request = store.get(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const record = request.result as PendingSessionNotes | undefined;
        resolve(record?.notes || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSessionNotes(): Promise<PendingSessionNotes[]> {
    const db = this.ensureDB();
    const transaction = db.transaction(['sessionNotes'], 'readonly');
    const store = transaction.objectStore('sessionNotes');
    const index = store.index('synced');
    const request = index.getAll(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markNotesSynced(sessionId: string): Promise<void> {
    const db = this.ensureDB();
    const transaction = db.transaction(['sessionNotes'], 'readwrite');
    const store = transaction.objectStore('sessionNotes');
    const request = store.get(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const record = request.result;
        if (record) {
          record.synced = true;
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();


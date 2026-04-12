import { db } from '../db';

interface SyncConfig {
  apiUrl: string;
  idToken: string; 
}

export class SyncService {
  private config: SyncConfig | null = null;
  private isSyncing = false;

  configure(config: SyncConfig) {
    this.config = config;
  }

  /**
   * Pushes notes changed in the last 5 mins (or full sync if requested)
   */
  async syncAll(fullSync = false) {
    if (!this.config || this.isSyncing) return;
    this.isSyncing = true;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const notesToSync = fullSync 
        ? await db.notes.toArray()
        : await db.notes.filter(n => new Date(n.updatedAt) > fiveMinutesAgo).toArray();
      
      if (notesToSync.length === 0) {
        console.log('[Sync] No recent changes to sync.');
        return;
      }

      console.log(`[Sync] Pushing ${notesToSync.length} notes to AWS...`);

      for (const note of notesToSync) {
        await this.pushNote(note);
      }
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushNote(note: any) {
    if (!this.config) return;

    const response = await fetch(`${this.config.apiUrl}file/${note.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.config.idToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: note.content,
        title: note.title,
        preview: note.preview,
        parentId: 'ROOT' 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sync note ${note.id}`);
    }
  }

  startAutoSync() {
    setInterval(() => this.syncAll(), 60000); // Pulse every 60 seconds
  }
}

export const syncService = new SyncService();

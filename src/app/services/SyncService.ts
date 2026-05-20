import { db, type Folder, type Note } from '../db';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface SyncConfig {
  apiUrl: string;
  wsUrl: string;
  getToken: () => Promise<string>;
  userId: string;
}

export class SyncService {
  private config: SyncConfig | null = null;
  private ws: WebSocket | null = null;
  private hooksInstalled = false;
  private isApplyingRemoteChange = false;
  private statusCallback: ((status: SyncStatus) => void) | null = null;

  constructor() {
    this.installDexieHooks();
  }

  configure(config: SyncConfig) {
    this.config = config;
    this.setStatus('syncing');
    this.connectWebSocket();
    this.pullAll();
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.config = null;
    this.setStatus('offline');
  }

  onStatusChange(callback: (status: SyncStatus) => void) {
    this.statusCallback = callback;
  }

  private setStatus(status: SyncStatus) {
    this.statusCallback?.(status);
  }

  private installDexieHooks() {
    if (this.hooksInstalled) return;
    this.hooksInstalled = true;

    db.notes.hook('creating', (_primaryKey, note) => {
      this.queueLocalPush(note);
    });

    db.notes.hook('updating', (changes, primaryKey, currentNote) => {
      this.queueLocalPush({
        ...currentNote,
        ...changes,
        id: String(primaryKey),
      });
    });

    db.notes.hook('deleting', (primaryKey, note) => {
      this.queueLocalDelete(String(primaryKey), note);
    });

    db.folders.hook('creating', (_primaryKey, folder) => {
      this.queueLocalFolderPush(folder);
    });

    db.folders.hook('updating', (changes, primaryKey, currentFolder) => {
      this.queueLocalFolderPush({
        ...currentFolder,
        ...changes,
        id: String(primaryKey),
      });
    });

    db.folders.hook('deleting', (primaryKey, folder) => {
      this.queueLocalFolderDelete(String(primaryKey), folder);
    });
  }

  private queueLocalPush(note: Note) {
    if (this.isApplyingRemoteChange) return;

    window.setTimeout(() => {
      this.pushNote(note).catch((err) => {
        console.error('[Sync] Failed to push local note:', err);
        this.setStatus('error');
      });
    }, 0);
  }

  private queueLocalDelete(noteId: string, note?: Note) {
    if (this.isApplyingRemoteChange) return;

    window.setTimeout(() => {
      this.deleteNote(noteId, (note as any)?.parentId).catch((err) => {
        console.error('[Sync] Failed to delete remote note:', err);
        this.setStatus('error');
      });
    }, 0);
  }

  private queueLocalFolderPush(folder: Folder) {
    if (this.isApplyingRemoteChange) return;

    window.setTimeout(() => {
      this.pushFolder(folder).catch((err) => {
        console.error('[Sync] Failed to push local folder:', err);
        this.setStatus('error');
      });
    }, 0);
  }

  private queueLocalFolderDelete(folderId: string, folder?: Folder) {
    if (this.isApplyingRemoteChange) return;

    window.setTimeout(() => {
      this.deleteFolder(folderId, folder?.parentId).catch((err) => {
        console.error('[Sync] Failed to delete remote folder:', err);
        this.setStatus('error');
      });
    }, 0);
  }

  private async connectWebSocket() {
    if (!this.config || this.ws || !this.config.wsUrl) return;

    try {
      const token = await this.config.getToken();
      const url = `${this.config.wsUrl}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error('[Sync] Failed to open WebSocket:', err);
      return;
    }

    this.ws.onopen = () => {
      console.log('[Sync] WebSocket Connected');
      this.pullAll();
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NOTE_UPDATED') {
          console.log(`[Sync] Real-time update received for note: ${data.payload.id}`);

          await this.applyRemoteNote(data.payload);
        }

        if (data.type === 'NOTE_DELETED') {
          await this.applyRemoteDelete(data.payload.id);
        }

        if (data.type === 'FOLDER_UPDATED') {
          await this.applyRemoteFolder(data.payload);
        }

        if (data.type === 'FOLDER_DELETED') {
          await this.applyRemoteFolderDelete(data.payload.id);
        }
      } catch (err) {
        console.error('[Sync] Failed to process WebSocket message:', err);
        this.setStatus('error');
      }
    };

    this.ws.onclose = () => {
      console.log('[Sync] WebSocket Closed. Reconnecting in 5s...');
      this.ws = null;
      this.setStatus('offline');
      if (this.config) {
        setTimeout(() => this.connectWebSocket(), 5000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[Sync] WebSocket Error:', err);
      this.setStatus('error');
    };
  }

  async pullAll(since?: string) {
    if (!this.config || !this.config.apiUrl) return;

    this.setStatus('syncing');

    try {
      const token = await this.config.getToken();
      const lastPull = since ?? localStorage.getItem('notecognition:lastPull');
      const pullUrl = new URL('sync/pull', this.config.apiUrl);
      if (lastPull) pullUrl.searchParams.set('since', lastPull);

      const response = await fetch(pullUrl.toString(), {
        headers: {
          'Authorization': token,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to pull notes (${response.status})`);
      }

      const items = await response.json();
      for (const item of items) {
        if (item.type === 'file') {
          const localNote = await db.notes.get(item.id);
          const remoteUpdatedAt = new Date(item.updatedAt);
          const localUpdatedAt = localNote?.updatedAt ? new Date(localNote.updatedAt) : null;

          if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
            await this.applyRemoteNote(item);
          }
        } else if (item.type === 'folder') {
          const localFolder = await db.folders.get(item.id);
          const remoteUpdatedAt = new Date(item.updatedAt);
          const localUpdatedAt = localFolder?.updatedAt ? new Date(localFolder.updatedAt) : null;

          if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
            await this.applyRemoteFolder(item);
          }
        }
      }

      localStorage.setItem('notecognition:lastPull', new Date().toISOString());
      this.setStatus('synced');
    } catch (err) {
      console.error('[Sync] Pull failed:', err);
      this.setStatus('error');
    }
  }

  async pushNote(note: Note) {
    if (!this.config || !this.config.apiUrl) return;

    this.setStatus('syncing');

    const token = await this.config.getToken();
    const response = await fetch(new URL(`file/${note.id}`, this.config.apiUrl).toString(), {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: note.content,
        title: note.title,
        preview: note.preview,
        parentId: note.parentId || 'ROOT',
        version: note.version || 1
      })
    });

    if (response.status === 409) {
      const conflictData = await response.json();
      await this.resolveConflict(note, conflictData.serverItem);
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed to sync note ${note.id}`);
    }

    this.setStatus('synced');
  }

  private async resolveConflict(localNote: Note, serverItem: any) {
    console.log(`[Sync] Resolving conflict for note ${localNote.id}`);
    const localTime = new Date(localNote.updatedAt).getTime();
    const serverTime = new Date(serverItem.updatedAt).getTime();

    if (localTime > serverTime) {
      console.log(`[Sync] Local is newer. Overwriting server version.`);
      await db.notes.update(localNote.id, {
        version: (serverItem.version || 1) + 1,
        updatedAt: new Date()
      });
    } else {
      console.log(`[Sync] Server is newer. Applying server changes locally.`);
      await this.applyRemoteNote(serverItem);
    }
  }

  async pushFolder(folder: Folder) {
    if (!this.config || !this.config.apiUrl) return;

    this.setStatus('syncing');

    const token = await this.config.getToken();
    const response = await fetch(new URL('resource', this.config.apiUrl).toString(), {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: folder.id,
        type: 'folder',
        title: folder.name,
        parentId: folder.parentId || 'ROOT',
        preview: '',
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sync folder ${folder.id}`);
    }

    this.setStatus('synced');
  }

  async deleteNote(noteId: string, parentId = 'ROOT') {
    if (!this.config || !this.config.apiUrl) return;

    this.setStatus('syncing');

    const token = await this.config.getToken();
    const deleteUrl = new URL(`file/${noteId}`, this.config.apiUrl);
    deleteUrl.searchParams.set('parentId', parentId);

    const response = await fetch(deleteUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete note ${noteId}`);
    }

    this.setStatus('synced');
  }

  async deleteFolder(folderId: string, parentId = 'ROOT') {
    if (!this.config || !this.config.apiUrl) return;

    this.setStatus('syncing');

    const token = await this.config.getToken();
    const deleteUrl = new URL(`folder/${folderId}`, this.config.apiUrl);
    deleteUrl.searchParams.set('parentId', parentId);

    const response = await fetch(deleteUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete folder ${folderId}`);
    }

    this.setStatus('synced');
  }

  private async applyRemoteNote(remoteNote: any) {
    this.isApplyingRemoteChange = true;
    try {
      await db.notes.put({
        id: remoteNote.id,
        title: remoteNote.title,
        content: remoteNote.content,
        preview: remoteNote.preview,
        parentId: remoteNote.parentId || 'ROOT',
        updatedAt: new Date(remoteNote.updatedAt),
        version: remoteNote.version || 1
      });
      this.setStatus('synced');
    } finally {
      this.isApplyingRemoteChange = false;
    }
  }

  private async applyRemoteDelete(noteId: string) {
    this.isApplyingRemoteChange = true;
    try {
      await db.notes.delete(noteId);
      this.setStatus('synced');
    } finally {
      this.isApplyingRemoteChange = false;
    }
  }

  private async applyRemoteFolder(remoteFolder: any) {
    this.isApplyingRemoteChange = true;
    try {
      await db.folders.put({
        id: remoteFolder.id,
        name: remoteFolder.title || remoteFolder.name || 'Untitled Folder',
        parentId: remoteFolder.parentId || 'ROOT',
        updatedAt: new Date(remoteFolder.updatedAt)
      });
      this.setStatus('synced');
    } finally {
      this.isApplyingRemoteChange = false;
    }
  }

  private async applyRemoteFolderDelete(folderId: string) {
    this.isApplyingRemoteChange = true;
    try {
      await db.folders.delete(folderId);
      this.setStatus('synced');
    } finally {
      this.isApplyingRemoteChange = false;
    }
  }
}

export const syncService = new SyncService();
export type { SyncStatus };

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { EditorArea, type EditorAreaRef } from './components/EditorArea';
import { EmptyState } from './components/EmptyState';
import { StatusBar } from './components/StatusBar';
import { AuthModal } from './components/AuthModal';
import { db, type Folder, type Note } from './db';
import { authService } from './services/AuthService';
import { syncService, type SyncStatus } from './services/SyncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './components/ui/alert-dialog';






export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [searchQuery, setSearchQuery] = useState('');
  
  const notes = useLiveQuery(() => db.notes.toArray()) || [];
  const [sortBy, setSortBy] = useState<'modified' | 'alphabetical' | 'created'>('modified');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'note' | 'folder'; name: string } | null>(null);

  const sortedNotes = useMemo(() => {
    const notesCopy = [...notes];
    if (sortBy === 'modified') {
      return notesCopy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === 'alphabetical') {
      return notesCopy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'created') {
      return notesCopy.sort((a, b) => b.id.localeCompare(a.id));
    }
    return notesCopy;
  }, [notes, sortBy]);

  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('editor');
  const editorRef = useRef<EditorAreaRef>(null);

  const currentNote = notes.find((n) => n.id === currentNoteId);

  const configureSync = useCallback((session: any) => {
    const idToken = session.getIdToken();
    const payload = idToken.payload || {};
    const email = payload.email || '';
    const userId = payload.sub;

    if (!userId) return;

    syncService.configure({
      apiUrl: import.meta.env.VITE_API_URL || '',
      wsUrl: import.meta.env.VITE_WS_URL || '',
      userId,
      getToken: async () => {
        const freshSession = await authService.getSession();
        return freshSession.getIdToken().getJwtToken();
      },
    });

    setIsAuthenticated(true);
    setUserEmail(email);
  }, []);

  useEffect(() => {
    syncService.onStatusChange(setSyncStatus);
  }, []);

  // Toast on sync status change
  const prevSyncStatusRef = useRef<SyncStatus | null>(null);
  useEffect(() => {
    if (prevSyncStatusRef.current === null) {
      prevSyncStatusRef.current = syncStatus;
      return;
    }
    if (syncStatus === 'synced') {
      toast.success('Sync complete. All changes saved.');
    } else if (syncStatus === 'error') {
      toast.error('Sync failed. Please check your connection.');
    } else if (syncStatus === 'offline') {
      toast.info('Running offline. Changes will be synced when reconnected.');
    }
    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    let isMounted = true;

    authService.getSession()
      .then((session) => {
        if (isMounted) configureSync(session);
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
          setUserEmail('');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [configureSync]);

  const shortcutsRef = useRef({
    newNote: handleNewNote,
    toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    toggleViewMode: () => setViewMode((prev) => (prev === 'editor' ? 'preview' : 'editor')),
    forceSync: () => {
      syncService.pullAll()
        .then(() => toast.success('Forced sync complete.'))
        .catch((err: any) => toast.error(`Sync failed: ${err.message}`));
    }
  });

  useEffect(() => {
    shortcutsRef.current = {
      newNote: handleNewNote,
      toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
      toggleViewMode: () => setViewMode((prev) => (prev === 'editor' ? 'preview' : 'editor')),
      forceSync: () => {
        syncService.pullAll()
          .then(() => toast.success('Forced sync complete.'))
          .catch((err: any) => toast.error(`Sync failed: ${err.message}`));
      }
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          shortcutsRef.current.newNote();
          break;
        case 's':
          e.preventDefault();
          shortcutsRef.current.forceSync();
          break;
        case 'e':
          e.preventDefault();
          shortcutsRef.current.toggleViewMode();
          break;
        case 'b':
          e.preventDefault();
          shortcutsRef.current.toggleSidebar();
          break;
        case 'k':
          const searchInput = document.getElementById('sidebar-search-input');
          if (searchInput) {
            e.preventDefault();
            searchInput.focus();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);
  
  // Local state for the editor content to avoid frequent DB-driven re-renders during typing
  const [localContent, setLocalContent] = useState<string>('');
  
  // Update local content when note changes
  useEffect(() => {
    if (currentNote) {
      setLocalContent(currentNote.content);
    } else {
      setLocalContent('');
    }
  }, [currentNoteId]); // Only reset when currentNoteId changes, to allow typing without being overwritten

  // Ref to hold the current content for immediate saving on switch
  const currentContentRef = useRef<string>(localContent);
  useEffect(() => { currentContentRef.current = localContent; }, [localContent]);

  const savePendingChanges = async (id: string, content: string) => {
    if (!id || !content) return;
    const firstNewline = content.indexOf('\n');
    const firstLine = (firstNewline === -1 ? content : content.substring(0, firstNewline)).replace(/^#+ /, '').trim();
    const secondNewline = content.indexOf('\n', firstNewline + 1);
    const thirdNewline = content.indexOf('\n', secondNewline + 1);
    const previewEnd = thirdNewline === -1 ? (secondNewline === -1 ? content.length : secondNewline) : thirdNewline;
    const previewText = content.substring(firstNewline + 1, previewEnd).replace(/\n/g, ' ').trim();
    
    const existingNote = await db.notes.get(id);
    const nextVersion = (existingNote?.version || 1) + 1;

    await db.notes.update(id, {
        content: content,
        title: firstLine || 'Untitled',
        preview: previewText.slice(0, 50) || 'No content',
        updatedAt: new Date(),
        version: nextVersion,
    });
  };

  // Debounced database update
  const saveTimeoutRef = useRef<any>(null);

  const handleContentChange = useCallback((newContent: string) => {
    if (!currentNoteId) return;

    setLocalContent(newContent);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
        savePendingChanges(currentNoteId, newContent);
    }, 200); // Very fast saving: 200ms
  }, [currentNoteId]);

  // Flush on switch
  const handleSelectNote = async (id: string) => {
    if (currentNoteId && currentNoteId !== id) {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            await savePendingChanges(currentNoteId, currentContentRef.current);
        }
    }
    setCurrentNoteId(id);
  };

  // Flush on window close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
        if (currentNoteId && saveTimeoutRef.current) {
            savePendingChanges(currentNoteId, currentContentRef.current);
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentNoteId]);

  // Optimized counts: limit word count for massive documents to prevent hangs
  const charCount = localContent.length;
  const wordCount = charCount < 100000 && localContent.trim() ? localContent.trim().split(/\s+/).length : (charCount >= 100000 ? -1 : 0);

  const handleTitleChange = async (newTitle: string) => {
    if (!currentNoteId) return;

    const existingNote = await db.notes.get(currentNoteId);
    const nextVersion = (existingNote?.version || 1) + 1;

    await db.notes.update(currentNoteId, {
      title: newTitle,
      updatedAt: new Date(),
      version: nextVersion,
    });
  };

  async function handleNewNote() {
    const id = Date.now().toString();
    const newNote: Note = {
      id,
      title: 'Untitled',
      preview: 'New document',
      content: '# Untitled\n\nStart writing...',
      parentId: 'ROOT',
      updatedAt: new Date(),
      version: 1,
    };

    await db.notes.add(newNote);
    setCurrentNoteId(id);
  };

  const handleDeleteNoteClick = async (id: string) => {
    const note = await db.notes.get(id);
    if (note) {
      setDeleteTarget({ id, type: 'note', name: note.title });
    }
  };

  const handleDeleteFolderClick = async (id: string) => {
    const folder = await db.folders.get(id);
    if (folder) {
      setDeleteTarget({ id, type: 'folder', name: folder.name });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'note') {
      await db.notes.delete(deleteTarget.id);
      if (currentNoteId === deleteTarget.id) {
        const remainingNotes = notes.filter((note) => note.id !== deleteTarget.id);
        setCurrentNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
      }
      toast.success(`Note "${deleteTarget.name}" deleted successfully.`);
    } else if (deleteTarget.type === 'folder') {
      await deleteFolderRecursive(deleteTarget.id);
      toast.success(`Folder "${deleteTarget.name}" deleted successfully.`);
    }

    setDeleteTarget(null);
  };

  const handleNewFolder = async () => {
    const id = `folder-${Date.now()}`;
    const newFolder: Folder = {
      id,
      name: 'Untitled Folder',
      parentId: 'ROOT',
      updatedAt: new Date(),
    };

    await db.folders.add(newFolder);
  };

  const deleteFolderRecursive = async (folderId: string) => {
    const childNotes = await db.notes.where('parentId').equals(folderId).toArray();
    const childFolders = await db.folders.where('parentId').equals(folderId).toArray();

    for (const childFolder of childFolders) {
      await deleteFolderRecursive(childFolder.id);
    }

    await Promise.all(childNotes.map((note) => db.notes.delete(note.id)));
    await db.folders.delete(folderId);
  };

  const handleRenameFolder = async (id: string, name: string) => {
    await db.folders.update(id, {
      name,
      updatedAt: new Date(),
    });
  };


  const handleExportNote = () => {
    if (!currentNote) return;
    
    // Use the latest local content for the export
    const content = localContent || currentNote.content;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Clean filename: remove restricted characters
    const safeTitle = (currentNote.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-');
    
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAuthSuccess = async () => {
    const session = await authService.getSession();
    configureSync(session);
    setShowAuthModal(false);
  };

  const handleSignOut = () => {
    authService.signOut();
    syncService.disconnect();
    setIsAuthenticated(false);
    setUserEmail('');
    setShowAuthModal(false);
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--md-primary-bg)' }}
    >
      <Toolbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentNoteTitle={currentNote?.title || ''}
        onTitleChange={handleTitleChange}
        onExport={handleExportNote}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          notes={sortedNotes}
          currentNoteId={currentNoteId}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSelectNote={handleSelectNote}
          onNewNote={handleNewNote}
          onNewFolder={handleNewFolder}
          onDeleteNote={handleDeleteNoteClick}
          onDeleteFolder={handleDeleteFolderClick}
          onRenameFolder={handleRenameFolder}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
        <div className="flex-1 flex overflow-hidden">
          {!currentNoteId ? (
            <EmptyState onNewNote={handleNewNote} />
          ) : (
            <div className="flex-1 h-full overflow-hidden">
              <EditorArea
                ref={editorRef}
                content={currentNote?.content || ''}
                onChange={handleContentChange}
                viewMode={viewMode}
              />
            </div>
          )}
        </div>
      </div>


      <StatusBar 
        wordCount={wordCount === -1 ? 'Many' : wordCount} 
        charCount={charCount} 
        lastSaved={currentNote?.updatedAt} 
        syncStatus={syncStatus}
      />
      <AuthModal
        isOpen={showAuthModal}
        onSuccess={handleAuthSuccess}
        onClose={() => setShowAuthModal(false)}
      />

      <Toaster closeButton richColors position="top-right" />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-none bg-[#2D3250] text-[#F9DEC9]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#F9DEC9]">
              Delete {deleteTarget?.type === 'note' ? 'Note' : 'Folder'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#7077A1]">
              Are you sure you want to delete {deleteTarget?.type === 'note' ? 'note' : 'folder'} "{deleteTarget?.name}"? 
              {deleteTarget?.type === 'folder' && ' This will recursively delete all notes and folders inside it.'} This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="bg-[#43486F] hover:bg-[#575C83] text-[#F9DEC9] border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-[#D16B70] hover:bg-[#E27D82] text-white border-none font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

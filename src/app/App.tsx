import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { EditorArea, type EditorAreaRef } from './components/EditorArea';
import { EmptyState } from './components/EmptyState';
import { StatusBar } from './components/StatusBar';
import { db, type Note } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AuthModal } from './components/AuthModal';
import { authService } from './services/AuthService';
import { syncService } from './services/SyncService';




export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Sort by updatedAt so newest notes are at the top
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) || [];
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('editor');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const editorRef = useRef<EditorAreaRef>(null);

  // Check authentication on mount
  useEffect(() => {
    authService.getSession()
      .then((session) => {
        setIsAuthenticated(true);
        // Initialize Sync Service with the real API and Token
        syncService.configure({
          apiUrl: import.meta.env.VITE_API_URL || '',
          idToken: session.getIdToken().getJwtToken()
        });
        syncService.startAutoSync();
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsAuthModalOpen(true);
      });
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    window.location.reload(); 
  };

  const currentNote = notes.find((n) => n.id === currentNoteId);
  
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
    
    await db.notes.update(id, {
        content: content,
        title: firstLine || 'Untitled',
        preview: previewText.slice(0, 50) || 'No content',
        updatedAt: new Date(),
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

    await db.notes.update(currentNoteId, {
      title: newTitle,
      updatedAt: new Date(),
    });
  };

  const handleNewNote = async () => {
    const id = Date.now().toString();
    const newNote: Note = {
      id,
      title: 'Untitled',
      preview: 'New document',
      content: '# Untitled\n\nStart writing...',
      updatedAt: new Date(),
    };

    await db.notes.add(newNote);
    setCurrentNoteId(id);
  };

  const handleDeleteNote = async (id: string) => {
    await db.notes.delete(id);

    if (currentNoteId === id) {
      const remainingNotes = notes.filter((note) => note.id !== id);
      setCurrentNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
    }
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
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          notes={notes}
          currentNoteId={currentNoteId}
          onSelectNote={handleSelectNote}
          onNewNote={handleNewNote}
          onDeleteNote={handleDeleteNote}
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
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onSuccess={handleAuthSuccess} 
      />
    </div>
  );
}
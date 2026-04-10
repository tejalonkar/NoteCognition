import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { EditorArea, type EditorAreaRef } from './components/EditorArea';
import { EmptyState } from './components/EmptyState';
import { StatusBar } from './components/StatusBar';
import { db, type Note } from './db';
import { useLiveQuery } from 'dexie-react-hooks';




export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const notes = useLiveQuery(() => db.notes.reverse().toArray()) || [];
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('editor');
  const editorRef = useRef<EditorAreaRef>(null);

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

  // Debounced database update
  const saveTimeoutRef = useRef<any>(null);

  const handleContentChange = useCallback((newContent: string) => {
    if (!currentNoteId) return;

    // Update local state immediately for fast feedback (StatusBar etc)
    setLocalContent(newContent);

    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
        // High-performance line extraction (no split)
        const firstNewline = newContent.indexOf('\n');
        const firstLine = (firstNewline === -1 ? newContent : newContent.substring(0, firstNewline)).replace(/^#+ /, '').trim();
        
        const secondNewline = newContent.indexOf('\n', firstNewline + 1);
        const thirdNewline = newContent.indexOf('\n', secondNewline + 1);
        const previewEnd = thirdNewline === -1 ? (secondNewline === -1 ? newContent.length : secondNewline) : thirdNewline;
        const previewText = newContent.substring(firstNewline + 1, previewEnd).replace(/\n/g, ' ').trim();
        const preview = previewText.slice(0, 50);

        await db.notes.update(currentNoteId, {
            content: newContent,
            title: firstLine || 'Untitled',
            preview: preview || 'No content',
            updatedAt: new Date(),
        });
    }, 1000); // 1-second debounce for DB saving
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
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          notes={notes}
          currentNoteId={currentNoteId}
          onSelectNote={setCurrentNoteId}
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
    </div>
  );
}
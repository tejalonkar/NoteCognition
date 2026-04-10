import { useState, useRef } from 'react';
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
  const currentContent = currentNote?.content || '';
  
  // Calculate word and character counts
  const wordCount = currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0;
  const charCount = currentContent.length;

  const handleContentChange = async (newContent: string) => {
    if (!currentNoteId) return;

    // Update note preview and title from content
    const firstLine = newContent.split('\n')[0].replace(/^#+ /, '').trim();
    const preview = newContent.split('\n').slice(1, 3).join(' ').slice(0, 100);

    await db.notes.update(currentNoteId, {
      content: newContent,
      title: firstLine || 'Untitled',
      preview: preview || 'No content',
      updatedAt: new Date(),
    });
  };

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
                content={currentContent}
                onChange={handleContentChange}
                viewMode={viewMode}

              />
            </div>

          )}
        </div>
      </div>


      <StatusBar wordCount={wordCount} charCount={charCount} lastSaved={currentNote?.updatedAt} />
    </div>
  );
}
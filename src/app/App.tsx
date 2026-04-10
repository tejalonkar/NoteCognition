import { useState, useRef } from 'react';
import { Sidebar, Note } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { EditorArea, type EditorAreaRef } from './components/EditorArea';
import { EmptyState } from './components/EmptyState';
import { StatusBar } from './components/StatusBar';




// Sample initial notes
const sampleNotes: Note[] = [];

const sampleContent: Record<string, string> = {};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notes, setNotes] = useState<Note[]>(sampleNotes);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [noteContents, setNoteContents] = useState<Record<string, string>>(sampleContent);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('editor');
  const editorRef = useRef<EditorAreaRef>(null);


  const currentNote = notes.find((n) => n.id === currentNoteId);
  const currentContent = currentNoteId ? noteContents[currentNoteId] || '' : '';
  
  // Calculate word and character counts
  const wordCount = currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0;
  const charCount = currentContent.length;

  const handleContentChange = (newContent: string) => {
    if (!currentNoteId) return;

    setNoteContents((prev) => ({
      ...prev,
      [currentNoteId]: newContent,
    }));

    // Update note preview
    const firstLine = newContent.split('\n')[0].replace(/^#+ /, '').trim();
    const preview = newContent.split('\n').slice(1, 3).join(' ').slice(0, 100);

    setNotes((prev) =>
      prev.map((note) =>
        note.id === currentNoteId
          ? { ...note, title: firstLine || 'Untitled', preview: preview || 'No content', updatedAt: new Date() }
          : note
      )
    );
  };

  const handleTitleChange = (newTitle: string) => {
    if (!currentNoteId) return;

    setNotes((prev) =>
      prev.map((note) => (note.id === currentNoteId ? { ...note, title: newTitle } : note))
    );
  };

  const handleNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled',
      preview: 'New document',
      updatedAt: new Date(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteContents((prev) => ({
      ...prev,
      [newNote.id]: '# Untitled\n\nStart writing...',
    }));
    setCurrentNoteId(newNote.id);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setNoteContents((prev) => {
      const newContents = { ...prev };
      delete newContents[id];
      return newContents;
    });

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
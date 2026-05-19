import { FileText, ChevronLeft, FolderPlus, Plus, Search, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileTree } from './FileTree';
import { type Note } from '../db';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  notes: Note[];
  currentNoteId: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onNewFolder: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  notes,
  currentNoteId,
  searchQuery,
  onSearchQueryChange,
  onSelectNote,
  onNewNote,
  onNewFolder,
  onDeleteNote,
  onDeleteFolder,
  onRenameFolder,
}: SidebarProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredNotes = normalizedQuery
    ? notes.filter((note) =>
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.preview.toLowerCase().includes(normalizedQuery) ||
        note.content.toLowerCase().includes(normalizedQuery)
      )
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="h-full flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: 'var(--md-secondary-surface)' }}
        >
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--md-text-primary)' }}
              >
                Notes
              </h2>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-[#2D3250] transition-colors"
                style={{ color: 'var(--md-text-secondary)' }}
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--md-primary-bg)',
                  border: '1px solid var(--md-border)',
                }}
              >
                <Search className="w-4 h-4" style={{ color: 'var(--md-accent-muted)' }} />
                <input
                  type="text"
                  placeholder="Search notes..."
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm"
                  style={{ color: 'var(--md-text-primary)' }}
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchQueryChange('')}
                    className="p-0.5 rounded hover:bg-[#7077A1]/20"
                    style={{ color: 'var(--md-text-secondary)' }}
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={onNewNote}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--md-highlight)',
                  color: '#2D3250',
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">Note</span>
              </button>
              <button
                onClick={onNewFolder}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  color: 'var(--md-text-secondary)',
                  border: '1px solid var(--md-border)',
                }}
              >
                <FolderPlus className="w-4 h-4" />
                <span className="font-medium text-sm">Folder</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {normalizedQuery ? (
                filteredNotes.length > 0 ? (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                        currentNoteId === note.id ? 'ring-1' : ''
                      }`}
                      style={{
                        backgroundColor:
                          currentNoteId === note.id
                            ? 'var(--md-primary-bg)'
                            : 'transparent',
                        ringColor: currentNoteId === note.id ? 'var(--md-highlight)' : 'transparent',
                      }}
                      onClick={() => onSelectNote(note.id)}
                    >
                      <div className="flex items-start gap-2">
                        <FileText
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          style={{ color: 'var(--md-accent-muted)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-sm font-medium truncate mb-1"
                            style={{ color: 'var(--md-text-primary)' }}
                          >
                            {note.title || 'Untitled'}
                          </h3>
                          <p
                            className="text-xs line-clamp-2"
                            style={{ color: 'var(--md-text-secondary)' }}
                          >
                            {note.preview || 'No content'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#7077A1]/20"
                        style={{ color: 'var(--md-text-secondary)' }}
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm" style={{ color: 'var(--md-text-secondary)' }}>
                    No notes found
                  </div>
                )
              ) : (
                <FileTree
                  currentNoteId={currentNoteId}
                  onSelectNote={onSelectNote}
                  onDeleteNote={onDeleteNote}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFolder={onRenameFolder}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

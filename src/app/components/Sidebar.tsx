import { FileText, ChevronLeft, Plus, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Note } from '../db';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  notes: Note[];
  currentNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  notes,
  currentNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
}: SidebarProps) {
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
            {/* Header */}
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
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
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
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{ color: 'var(--md-text-primary)' }}
                />
              </div>
            </div>

            {/* New Note Button */}
            <button
              onClick={onNewNote}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--md-highlight)',
                color: '#2D3250',
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium text-sm">New Note</span>
            </button>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {notes.map((note) => (
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#7077A1]/20"
                    style={{ color: 'var(--md-text-secondary)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

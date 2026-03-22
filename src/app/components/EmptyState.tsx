import { FileText, Plus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  onNewNote: () => void;
}

export function EmptyState({ onNewNote }: EmptyStateProps) {
  return (
    <div
      className="h-full flex items-center justify-center"
      style={{
        backgroundColor: 'var(--md-primary-bg)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
          style={{
            backgroundColor: 'var(--md-secondary-surface)',
          }}
        >
          <FileText className="w-10 h-10" style={{ color: 'var(--md-highlight)' }} />
        </motion.div>

        <h2
          className="text-2xl font-semibold mb-3"
          style={{ color: 'var(--md-text-primary)' }}
        >
          Welcome to your Markdown Editor
        </h2>

        <p
          className="text-base mb-8 leading-relaxed"
          style={{ color: 'var(--md-text-secondary)' }}
        >
          A minimalist, distraction-free writing space designed for clarity and focus.
          Start creating beautiful documents with markdown.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onNewNote}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 shadow-lg"
            style={{
              backgroundColor: 'var(--md-highlight)',
              color: '#2D3250',
            }}
          >
            <Plus className="w-5 h-5" />
            Create New Note
          </button>

          <button
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:bg-[#424769]"
            style={{
              backgroundColor: 'var(--md-secondary-surface)',
              color: 'var(--md-text-primary)',
              border: '1px solid var(--md-border)',
            }}
          >
            <Sparkles className="w-5 h-5" />
            View Tutorial
          </button>
        </div>

        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--md-border)' }}>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--md-text-secondary)' }}
          >
            Quick Tips
          </p>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(66, 71, 105, 0.3)' }}
            >
              <span
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--md-highlight)',
                  color: '#2D3250',
                }}
              >
                /
              </span>
              <p className="text-sm" style={{ color: 'var(--md-text-primary)' }}>
                Type <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--md-secondary-surface)' }}>/</code> to open the command palette
              </p>
            </div>
            <div
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(66, 71, 105, 0.3)' }}
            >
              <span
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--md-highlight)',
                  color: '#2D3250',
                }}
              >
                #
              </span>
              <p className="text-sm" style={{ color: 'var(--md-text-primary)' }}>
                Use <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--md-secondary-surface)' }}>#</code> for headings, <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--md-secondary-surface)' }}>**bold**</code> for emphasis
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

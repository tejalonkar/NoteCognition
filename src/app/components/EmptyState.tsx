import { FileText, Plus } from 'lucide-react';
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
          Welcome to NoteCognition
        </h2>

        <p
          className="text-base mb-8 leading-relaxed"
          style={{ color: 'var(--md-text-secondary)' }}
        >
          Your minimalist, distraction-free markdown writing space.
        </p>

        <div className="flex justify-center">
          <button
            onClick={onNewNote}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 shadow-lg"
            style={{
              backgroundColor: 'var(--md-highlight)',
              color: '#2D3250',
            }}
          >
            <Plus className="w-5 h-5" />
            Create Note
          </button>
        </div>
      </motion.div>
    </div>
  );
}

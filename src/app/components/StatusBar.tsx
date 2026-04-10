import { Clock, FileText, Type } from 'lucide-react';

interface StatusBarProps {
  wordCount: number | string;
  charCount: number;
  lastSaved?: Date;
}

export function StatusBar({ wordCount, charCount, lastSaved }: StatusBarProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div
      className="h-8 border-t flex items-center justify-between px-6 text-xs"
      style={{
        backgroundColor: 'var(--md-secondary-surface)',
        borderColor: 'var(--md-border)',
        color: 'var(--md-text-secondary)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" />
          <span>{wordCount} words</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>{charCount} characters</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {lastSaved && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Saved at {formatTime(lastSaved)}</span>
          </div>
        )}
      </div>
    </div>

  );
}

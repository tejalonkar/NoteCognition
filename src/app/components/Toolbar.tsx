import {
  Download,
  Menu,
  Eye,
  EyeOff,
  Columns2,
} from 'lucide-react';

interface ToolbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  viewMode: 'editor' | 'preview' | 'split';
  onViewModeChange: (mode: 'editor' | 'preview' | 'split') => void;
  currentNoteTitle: string;
  onTitleChange: (title: string) => void;
  onExport: () => void;
}

export function Toolbar({
  onToggleSidebar,
  isSidebarOpen,
  viewMode,
  onViewModeChange,
  currentNoteTitle,
  onTitleChange,
  onExport,
}: ToolbarProps) {
  return (
    <div
      className="h-16 border-b flex items-center justify-between px-6"
      style={{
        backgroundColor: 'var(--md-secondary-surface)',
        borderColor: 'var(--md-border)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-[#2D3250] transition-all"
          style={{ 
            color: 'var(--md-text-secondary)',
            transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="h-6 w-px" style={{ backgroundColor: 'var(--md-border)' }} />

        <input
          type="text"
          value={currentNoteTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="bg-transparent border-none outline-none text-lg font-medium"
          style={{ color: 'var(--md-text-primary)' }}
        />
      </div>

      {/* Center Section - View Mode Toggle */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{
          backgroundColor: 'var(--md-primary-bg)',
          border: '1px solid var(--md-border)',
        }}
      >
        <button
          onClick={() => onViewModeChange('editor')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${
            viewMode === 'editor' ? 'font-medium' : ''
          }`}
          style={{
            backgroundColor:
              viewMode === 'editor' ? 'var(--md-highlight)' : 'transparent',
            color: viewMode === 'editor' ? '#2D3250' : 'var(--md-text-secondary)',
          }}
        >
          <EyeOff className="w-4 h-4" />
          <span>Editor</span>
        </button>
        <button
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${
            viewMode === 'split' ? 'font-medium' : ''
          }`}
          style={{
            backgroundColor:
              viewMode === 'split' ? 'var(--md-highlight)' : 'transparent',
            color: viewMode === 'split' ? '#2D3250' : 'var(--md-text-secondary)',
          }}
        >
          <Columns2 className="w-4 h-4" />
          <span>Split</span>
        </button>
        <button
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${
            viewMode === 'preview' ? 'font-medium' : ''
          }`}
          style={{
            backgroundColor:
              viewMode === 'preview' ? 'var(--md-highlight)' : 'transparent',
            color: viewMode === 'preview' ? '#2D3250' : 'var(--md-text-secondary)',
          }}
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium hover:bg-[#2D3250]"
          style={{ 
            color: 'var(--md-text-secondary)',
            border: '1px solid var(--md-border)' 
          }}
          title="Export as Markdown (.md)"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
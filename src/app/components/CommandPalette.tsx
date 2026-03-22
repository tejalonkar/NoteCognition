import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  Hash,
  Bold,
  Italic,
  Table,
  CheckSquare,
  Image as ImageIcon,
  Link,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  keywords: string[];
  action: string;
  description: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: CommandItem) => void;
}

const commands: CommandItem[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    icon: <Heading1 className="w-4 h-4" />,
    keywords: ['heading', 'h1', 'title', 'large'],
    action: '# ',
    description: 'Large section heading',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: <Heading2 className="w-4 h-4" />,
    keywords: ['heading', 'h2', 'subtitle', 'medium'],
    action: '## ',
    description: 'Medium section heading',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: <Heading3 className="w-4 h-4" />,
    keywords: ['heading', 'h3', 'small'],
    action: '### ',
    description: 'Small section heading',
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    icon: <List className="w-4 h-4" />,
    keywords: ['list', 'bullet', 'ul', 'unordered'],
    action: '- ',
    description: 'Create a bulleted list',
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    icon: <ListOrdered className="w-4 h-4" />,
    keywords: ['list', 'numbered', 'ol', 'ordered'],
    action: '1. ',
    description: 'Create a numbered list',
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: <Code className="w-4 h-4" />,
    keywords: ['code', 'block', 'snippet', 'programming'],
    action: '```\n',
    description: 'Insert a code block',
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: <Quote className="w-4 h-4" />,
    keywords: ['quote', 'blockquote', 'citation'],
    action: '> ',
    description: 'Insert a blockquote',
  },
  {
    id: 'divider',
    label: 'Divider',
    icon: <Minus className="w-4 h-4" />,
    keywords: ['divider', 'hr', 'separator', 'line'],
    action: '\n---\n',
    description: 'Insert a horizontal divider',
  },
  {
    id: 'bold',
    label: 'Bold Text',
    icon: <Bold className="w-4 h-4" />,
    keywords: ['bold', 'strong', 'text'],
    action: '**bold**',
    description: 'Make text bold',
  },
  {
    id: 'italic',
    label: 'Italic Text',
    icon: <Italic className="w-4 h-4" />,
    keywords: ['italic', 'emphasis', 'text'],
    action: '*italic*',
    description: 'Make text italic',
  },
  {
    id: 'table',
    label: 'Table',
    icon: <Table className="w-4 h-4" />,
    keywords: ['table', 'grid', 'columns'],
    action: '\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n',
    description: 'Insert a table',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    icon: <CheckSquare className="w-4 h-4" />,
    keywords: ['checklist', 'task', 'todo', 'box'],
    action: '- [ ] ',
    description: 'Create a task list',
  },
  {
    id: 'image',
    label: 'Image',
    icon: <ImageIcon className="w-4 h-4" />,
    keywords: ['image', 'picture', 'photo', 'media'],
    action: '![alt text](image_url)',
    description: 'Insert an image',
  },
  {
    id: 'link',
    label: 'Link',
    icon: <Link className="w-4 h-4" />,
    keywords: ['link', 'url', 'hyperlink', 'website'],
    action: '[link text](url)',
    description: 'Insert a link',
  },
];

export function CommandPalette({ isOpen, onClose, onSelect }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter((cmd) =>
    cmd.keywords.some((keyword) => keyword.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 backdrop-blur-sm"
            onClick={onClose}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          />

          {/* Command Palette */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.2 
              }}
              className="pointer-events-auto rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden"
              style={{
                backgroundColor: 'rgba(66, 71, 105, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '480px',
              }}
            >
            {/* Search Input */}
            <div
              className="p-3 border-b"
              style={{ borderColor: 'var(--md-border)' }}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: 'var(--md-accent-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{ color: 'var(--md-text-primary)' }}
                  autoFocus
                />
              </div>
            </div>

            {/* Commands List */}
            <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
              {filteredCommands.length === 0 ? (
                <div
                  className="p-8 text-center text-sm"
                  style={{ color: 'var(--md-text-secondary)' }}
                >
                  No commands found
                </div>
              ) : (
                <div className="p-2">
                  {filteredCommands.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={() => onSelect(command)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
                      style={{
                        backgroundColor:
                          selectedIndex === index
                            ? 'var(--md-highlight)'
                            : 'transparent',
                        color:
                          selectedIndex === index
                            ? '#2D3250'
                            : 'var(--md-text-primary)',
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg"
                        style={{
                          backgroundColor:
                            selectedIndex === index
                              ? 'rgba(45, 50, 80, 0.2)'
                              : 'var(--md-primary-bg)',
                        }}
                      >
                        {command.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{command.label}</div>
                        <div
                          className="text-xs mt-0.5"
                          style={{
                            color:
                              selectedIndex === index
                                ? 'rgba(45, 50, 80, 0.7)'
                                : 'var(--md-text-secondary)',
                          }}
                        >
                          {command.description}
                        </div>
                      </div>
                      {selectedIndex === index && (
                        <kbd
                          className="px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: 'rgba(45, 50, 80, 0.2)',
                            color: '#2D3250',
                          }}
                        >
                          ↵
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

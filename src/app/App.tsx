import { useState, useRef } from 'react';
import { Sidebar, Note } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { EditorArea, type EditorAreaRef } from './components/EditorArea';
import { MarkdownPreview } from './components/MarkdownPreview';
import { CommandPalette, CommandItem } from './components/CommandPalette';
import { EmptyState } from './components/EmptyState';
import { StatusBar } from './components/StatusBar';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Sample initial notes
const sampleNotes: Note[] = [
  {
    id: '1',
    title: 'Welcome to Markdown Editor',
    preview: 'A minimalist, modern markdown editor inspired by Notion...',
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Getting Started Guide',
    preview: 'Learn the basics of markdown syntax and editor features...',
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: '3',
    title: 'Project Ideas',
    preview: 'Brainstorming session for upcoming projects and goals...',
    updatedAt: new Date(Date.now() - 7200000),
  },
];

const sampleContent: Record<string, string> = {
  '1': `# Welcome to Markdown Editor

A minimalist, modern markdown editor inspired by Notion with a soft dark theme.

## Features

- **Clean Interface**: Distraction-free writing experience
- **Live Preview**: See your formatted content in real-time
- **Command Palette**: Quick access to formatting options with \`/\`
- **Syntax Highlighting**: Beautiful code and text highlighting

## How to Use

Type \`/\` anywhere to open the command palette and quickly insert:
- Headings (H1-H3)
- Lists (bullet and numbered)
- Code blocks
- Quotes
- Dividers

### Markdown Basics

Use **bold** and *italic* text for emphasis. Create [links](https://example.com) easily.

> This is a blockquote. Perfect for highlighting important information or quotes.

\`\`\`javascript
// Code blocks support syntax highlighting
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

---

Happy writing! ✨`,
  '2': `# Getting Started Guide

Welcome to your new markdown editor! This guide will help you get started.

## Basic Syntax

### Headings
Use \`#\` for headings. More \`#\` symbols create smaller headings.

### Text Formatting
- **Bold**: Wrap text with \`**\` or \`__\`
- *Italic*: Wrap text with \`*\` or \`_\`
- \`Code\`: Wrap text with backticks

### Lists

Bullet lists:
- Item one
- Item two
- Item three

Numbered lists:
1. First item
2. Second item
3. Third item

### Quotes

> "The best way to predict the future is to invent it."
> — Alan Kay

### Code Blocks

\`\`\`python
def hello_world():
    print("Hello, World!")
\`\`\`

## Editor Features

### Command Palette
Press \`/\` to open the command palette for quick formatting.

### View Modes
- **Editor**: Focus on writing
- **Split**: Write and preview simultaneously
- **Preview**: See the final result

---

Start creating amazing content! 🚀`,
  '3': `# Project Ideas

## Personal Projects

### Blog Platform
- Minimal design
- Markdown support
- Fast performance
- SEO optimized

### Task Manager
- Simple interface
- Drag and drop
- Categories and tags
- Due dates and reminders

### Portfolio Website
- Showcase projects
- Interactive demos
- Contact form
- Blog integration

## Learning Goals

1. **React Advanced Patterns**
   - Custom hooks
   - Context optimization
   - Performance tuning

2. **TypeScript Mastery**
   - Advanced types
   - Generics
   - Type guards

3. **Design Systems**
   - Component libraries
   - Theming
   - Accessibility

## Notes

> Remember: Start small, iterate often, and focus on delivering value.

---

*Last updated: March 18, 2026*`,
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notes, setNotes] = useState<Note[]>(sampleNotes);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>('1');
  const [noteContents, setNoteContents] = useState<Record<string, string>>(sampleContent);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('editor');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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

  const handleCommandSelect = (command: CommandItem) => {
    if (!currentNoteId) return;

    if (editorRef.current) {
        editorRef.current.insertCommand(command.action);
    }

    setIsCommandPaletteOpen(false);
  };

  const handleSlashCommand = () => {
    setIsCommandPaletteOpen(true);
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
              {viewMode === 'split' ? (
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={50} minSize={20}>
                    <div className="h-full w-full overflow-hidden">
                      <div className="h-full max-w-4xl mx-auto px-8">
                        <EditorArea
                          ref={editorRef}
                          content={currentContent}
                          onChange={handleContentChange}
                          onSlashCommand={handleSlashCommand}
                        />
                      </div>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-transparent hover:bg-[#424769] transition-colors cursor-col-resize active:bg-[var(--md-highlight)] flex flex-col justify-center items-center">
                    <div className="h-8 w-1 rounded-full bg-[var(--md-border)]" />
                  </PanelResizeHandle>
                  <Panel defaultSize={50} minSize={20}>
                    <div className="h-full w-full border-l" style={{ borderColor: 'var(--md-border)' }}>
                      <MarkdownPreview content={currentContent} />
                    </div>
                  </Panel>
                </PanelGroup>
              ) : viewMode === 'editor' ? (
                <div className="h-full max-w-4xl mx-auto px-8">
                  <EditorArea
                    ref={editorRef}
                    content={currentContent}
                    onChange={handleContentChange}
                    onSlashCommand={handleSlashCommand}
                  />
                </div>
              ) : (
                <div className="h-full w-full">
                  <MarkdownPreview content={currentContent} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelect={handleCommandSelect}
      />
      <StatusBar wordCount={wordCount} charCount={charCount} lastSaved={currentNote?.updatedAt} />
    </div>
  );
}
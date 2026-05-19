import { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, FileText, Folder as FolderIcon, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { db, type Folder, type Note } from '../db';

type TreeItem =
  | { id: string; type: 'note'; parentId: string }
  | { id: string; type: 'folder'; parentId: string };

interface FileTreeProps {
  parentId?: string;
  currentNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
}

interface FolderRowProps extends FileTreeProps {
  folder: Folder;
}

interface NoteRowProps {
  note: Note;
  currentNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

const itemTypes = {
  treeItem: 'TREE_ITEM',
};

export function FileTree({
  parentId = 'ROOT',
  currentNoteId,
  onSelectNote,
  onDeleteNote,
  onDeleteFolder,
  onRenameFolder,
}: FileTreeProps) {
  const folders = useLiveQuery(
    () => db.folders.where('parentId').equals(parentId).sortBy('name'),
    [parentId],
    []
  );
  const notes = useLiveQuery(
    () => db.notes.where('parentId').equals(parentId).reverse().sortBy('updatedAt'),
    [parentId],
    []
  );

  const [{ isOver }, drop] = useDrop(() => ({
    accept: itemTypes.treeItem,
    drop: async (item: TreeItem, monitor) => {
      if (monitor.didDrop() || item.parentId === parentId) return;
      if (item.type === 'folder' && item.id === parentId) return;

      if (item.type === 'note') {
        await db.notes.update(item.id, { parentId, updatedAt: new Date() });
      } else {
        await db.folders.update(item.id, { parentId, updatedAt: new Date() });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }), [parentId]);

  return (
    <div
      ref={drop}
      className={`space-y-1 rounded-md ${isOver ? 'bg-[#7077A1]/10' : ''}`}
    >
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          currentNoteId={currentNoteId}
          onSelectNote={onSelectNote}
          onDeleteNote={onDeleteNote}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />
      ))}
      {notes.map((note) => (
        <NoteRow
          key={note.id}
          note={note}
          currentNoteId={currentNoteId}
          onSelectNote={onSelectNote}
          onDeleteNote={onDeleteNote}
        />
      ))}
    </div>
  );
}

function FolderRow({
  folder,
  currentNoteId,
  onSelectNote,
  onDeleteNote,
  onDeleteFolder,
  onRenameFolder,
}: FolderRowProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: itemTypes.treeItem,
    item: { id: folder.id, type: 'folder', parentId: folder.parentId } satisfies TreeItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [folder.id, folder.parentId]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: itemTypes.treeItem,
    drop: async (item: TreeItem, monitor) => {
      if (monitor.didDrop() || item.parentId === folder.id) return;
      if (item.type === 'folder' && item.id === folder.id) return;

      if (item.type === 'note') {
        await db.notes.update(item.id, { parentId: folder.id, updatedAt: new Date() });
      } else {
        await db.folders.update(item.id, { parentId: folder.id, updatedAt: new Date() });
      }
      setIsOpen(true);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }), [folder.id]);

  const commitRename = () => {
    const nextName = draftName.trim() || 'Untitled Folder';
    setDraftName(nextName);
    setIsEditing(false);
    if (nextName !== folder.name) {
      onRenameFolder(folder.id, nextName);
    }
  };

  return (
    <div ref={(node) => drag(drop(node))} className={isDragging ? 'opacity-50' : ''}>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
          isOver ? 'bg-[#7077A1]/20' : 'hover:bg-[#2D3250]'
        }`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 rounded hover:bg-[#7077A1]/20"
          style={{ color: 'var(--md-text-secondary)' }}
          title={isOpen ? 'Collapse folder' : 'Expand folder'}
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {isOpen ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-accent-muted)' }} />
        ) : (
          <FolderIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--md-accent-muted)' }} />
        )}
        {isEditing ? (
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename();
              if (event.key === 'Escape') {
                setDraftName(folder.name);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="min-w-0 flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--md-text-primary)' }}
          />
        ) : (
          <button
            onDoubleClick={() => setIsEditing(true)}
            onClick={() => setIsOpen(!isOpen)}
            className="min-w-0 flex-1 text-left text-sm font-medium truncate"
            style={{ color: 'var(--md-text-primary)' }}
          >
            {folder.name}
          </button>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#7077A1]/20"
          style={{ color: 'var(--md-text-secondary)' }}
          title="Rename folder"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDeleteFolder(folder.id)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#7077A1]/20"
          style={{ color: 'var(--md-text-secondary)' }}
          title="Delete folder"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {isOpen && (
        <div className="ml-4 pl-2 border-l" style={{ borderColor: 'var(--md-border)' }}>
          <FileTree
            parentId={folder.id}
            currentNoteId={currentNoteId}
            onSelectNote={onSelectNote}
            onDeleteNote={onDeleteNote}
            onDeleteFolder={onDeleteFolder}
            onRenameFolder={onRenameFolder}
          />
        </div>
      )}
    </div>
  );
}

function NoteRow({ note, currentNoteId, onSelectNote, onDeleteNote }: NoteRowProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: itemTypes.treeItem,
    item: { id: note.id, type: 'note', parentId: note.parentId || 'ROOT' } satisfies TreeItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [note.id, note.parentId]);

  return (
    <div
      ref={drag}
      className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
        currentNoteId === note.id ? 'ring-1' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
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
  );
}

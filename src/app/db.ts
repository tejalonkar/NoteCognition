import Dexie, { type EntityTable } from 'dexie';

interface Note {
  id: string;
  title: string;
  preview: string;
  content: string;
  parentId?: string;
  updatedAt: Date;
}

interface Folder {
  id: string;
  name: string;
  parentId: string;
  updatedAt: Date;
}

const db = new Dexie('NoteCognitionDB') as Dexie & {
  notes: EntityTable<Note, 'id'>;
  folders: EntityTable<Folder, 'id'>;
};

// Schema definition: id is primary key
db.version(1).stores({
  notes: 'id, title, updatedAt'
});

db.version(2).stores({
  notes: 'id, title, updatedAt, parentId',
  folders: 'id, name, parentId, updatedAt'
}).upgrade(async (transaction) => {
  await transaction.table('notes').toCollection().modify((note) => {
    if (!note.parentId) note.parentId = 'ROOT';
  });
});

export { db };
export type { Folder, Note };

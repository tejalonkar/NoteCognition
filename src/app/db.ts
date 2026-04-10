import Dexie, { type EntityTable } from 'dexie';

interface Note {
  id: string;
  title: string;
  preview: string;
  content: string;
  updatedAt: Date;
}

const db = new Dexie('NoteCognitionDB') as Dexie & {
  notes: EntityTable<Note, 'id'>
};

// Schema definition: id is primary key
db.version(1).stores({
  notes: 'id, title, updatedAt'
});

export { db };
export type { Note };

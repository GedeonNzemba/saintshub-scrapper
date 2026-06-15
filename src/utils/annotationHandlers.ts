// src/utils/annotationHandlers.ts
import { v4 as uuidv4 } from 'uuid';
import { Collection } from 'mongodb';
import { Highlight, Note } from './annotationTypes';
import { getDatabase } from './database/connection';

const HIGHLIGHTS_COLLECTION = 'annotations_highlights';
const NOTES_COLLECTION = 'annotations_notes';

function highlightsCollection(): Collection<Highlight> {
  return getDatabase().collection<Highlight>(HIGHLIGHTS_COLLECTION);
}

function notesCollection(): Collection<Note> {
  return getDatabase().collection<Note>(NOTES_COLLECTION);
}

/**
 * Create indexes for fast lookup. Called once on server start.
 * Safe to call multiple times — MongoDB skips existing indexes.
 */
export async function initializeAnnotationIndexes(): Promise<void> {
  const highlights = highlightsCollection();
  const notes = notesCollection();

  await Promise.all([
    highlights.createIndex({ id: 1 }, { unique: true }),
    highlights.createIndex({ userId: 1, versionId: 1, bookUsfm: 1, chapter: 1 }),
    highlights.createIndex({ userId: 1, updatedAt: -1 }),
    notes.createIndex({ id: 1 }, { unique: true }),
    notes.createIndex({ userId: 1, versionId: 1, bookUsfm: 1, chapter: 1 }),
    notes.createIndex({ userId: 1, updatedAt: -1 }),
  ]);
}

function buildCriteriaFilter(criteria: {
  userId?: string;
  versionId?: string;
  bookUsfm?: string;
  chapter?: number;
  verses?: string;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (criteria.userId) filter.userId = criteria.userId;
  if (criteria.versionId) filter.versionId = criteria.versionId;
  if (criteria.bookUsfm) filter.bookUsfm = criteria.bookUsfm;
  if (criteria.chapter !== undefined) filter.chapter = criteria.chapter;
  if (criteria.verses) filter.verses = criteria.verses;
  return filter;
}

// --- Highlight Handlers ---

export const createHighlight = async (
  data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Highlight> => {
  const now = new Date().toISOString();
  const newHighlight: Highlight = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await highlightsCollection().insertOne(newHighlight);
  return newHighlight;
};

export const getHighlights = async (criteria: {
  userId?: string;
  versionId?: string;
  bookUsfm?: string;
  chapter?: number;
  verses?: string;
}): Promise<Highlight[]> => {
  const filter = buildCriteriaFilter(criteria);
  return highlightsCollection()
    .find(filter, { projection: { _id: 0 } })
    .sort({ updatedAt: -1 })
    .limit(1000)
    .toArray();
};

export const getHighlightById = async (highlightId: string): Promise<Highlight | null> => {
  return highlightsCollection().findOne({ id: highlightId }, { projection: { _id: 0 } });
};

export const updateHighlight = async (
  highlightId: string,
  updates: Partial<Omit<Highlight, 'id' | 'userId' | 'createdAt'>>
): Promise<Highlight | null> => {
  const sanitized: Record<string, unknown> = { ...updates };
  // Don't allow caller to override identity / timestamps directly
  delete sanitized.id;
  delete sanitized.userId;
  delete sanitized.createdAt;
  sanitized.updatedAt = new Date().toISOString();

  const result = await highlightsCollection().findOneAndUpdate(
    { id: highlightId },
    { $set: sanitized },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result || null;
};

export const deleteHighlight = async (highlightId: string): Promise<boolean> => {
  const result = await highlightsCollection().deleteOne({ id: highlightId });
  return result.deletedCount > 0;
};

// --- Note Handlers ---

export const createNote = async (
  data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Note> => {
  const now = new Date().toISOString();
  const newNote: Note = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await notesCollection().insertOne(newNote);
  return newNote;
};

export const getNotes = async (criteria: {
  userId?: string;
  versionId?: string;
  bookUsfm?: string;
  chapter?: number;
  verses?: string;
}): Promise<Note[]> => {
  const filter = buildCriteriaFilter(criteria);
  return notesCollection()
    .find(filter, { projection: { _id: 0 } })
    .sort({ updatedAt: -1 })
    .limit(1000)
    .toArray();
};

export const getNoteById = async (noteId: string): Promise<Note | null> => {
  return notesCollection().findOne({ id: noteId }, { projection: { _id: 0 } });
};

export const updateNote = async (
  noteId: string,
  updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>
): Promise<Note | null> => {
  const sanitized: Record<string, unknown> = { ...updates };
  delete sanitized.id;
  delete sanitized.userId;
  delete sanitized.createdAt;
  sanitized.updatedAt = new Date().toISOString();

  const result = await notesCollection().findOneAndUpdate(
    { id: noteId },
    { $set: sanitized },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result || null;
};

export const deleteNote = async (noteId: string): Promise<boolean> => {
  const result = await notesCollection().deleteOne({ id: noteId });
  return result.deletedCount > 0;
};

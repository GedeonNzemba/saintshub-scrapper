// src/utils/annotationHandlers.ts
import { v4 as uuidv4 } from 'uuid';
import { Highlight, Note } from './annotationTypes';

// In-memory storage
let highlightsDB: Highlight[] = [];
let notesDB: Note[] = [];

// --- Highlight Handlers ---

export const createHighlight = (data: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>): Highlight => {
  const now = new Date().toISOString();
  const newHighlight: Highlight = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  highlightsDB.push(newHighlight);
  return newHighlight;
};

export const getHighlights = (criteria: {
  userId?: string;
  versionId?: string;
  bookUsfm?: string;
  chapter?: number;
  verses?: string;
}): Highlight[] => {
  return highlightsDB.filter(highlight => {
    let match = true;
    if (criteria.userId && highlight.userId !== criteria.userId) match = false;
    if (criteria.versionId && highlight.versionId !== criteria.versionId) match = false;
    if (criteria.bookUsfm && highlight.bookUsfm !== criteria.bookUsfm) match = false;
    if (criteria.chapter !== undefined && highlight.chapter !== criteria.chapter) match = false;
    // For verses, we might want a more complex matching (e.g., overlap) in the future.
    // For now, it's an exact match if provided.
    if (criteria.verses && highlight.verses !== criteria.verses) match = false;
    return match;
  });
};

export const getHighlightById = (highlightId: string): Highlight | undefined => {
  return highlightsDB.find(h => h.id === highlightId);
};

export const updateHighlight = (
  highlightId: string,
  updates: Partial<Omit<Highlight, 'id' | 'userId' | 'createdAt'>>
): Highlight | null => {
  const highlightIndex = highlightsDB.findIndex(h => h.id === highlightId);
  if (highlightIndex === -1) {
    return null;
  }
  const originalHighlight = highlightsDB[highlightIndex];
  const updatedHighlight: Highlight = {
    ...originalHighlight,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  highlightsDB[highlightIndex] = updatedHighlight;
  return updatedHighlight;
};

export const deleteHighlight = (highlightId: string): boolean => {
  const initialLength = highlightsDB.length;
  highlightsDB = highlightsDB.filter(h => h.id !== highlightId);
  return highlightsDB.length < initialLength;
};

// --- Note Handlers ---

export const createNote = (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
  const now = new Date().toISOString();
  const newNote: Note = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  notesDB.push(newNote);
  return newNote;
};

export const getNotes = (criteria: {
  userId?: string;
  versionId?: string;
  bookUsfm?: string;
  chapter?: number;
  verses?: string;
}): Note[] => {
  return notesDB.filter(note => {
    let match = true;
    if (criteria.userId && note.userId !== criteria.userId) match = false;
    if (criteria.versionId && note.versionId !== criteria.versionId) match = false;
    if (criteria.bookUsfm && note.bookUsfm !== criteria.bookUsfm) match = false;
    if (criteria.chapter !== undefined && note.chapter !== criteria.chapter) match = false;
    if (criteria.verses && note.verses !== criteria.verses) match = false;
    return match;
  });
};

export const getNoteById = (noteId: string): Note | undefined => {
  return notesDB.find(n => n.id === noteId);
};

export const updateNote = (
  noteId: string,
  updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>
): Note | null => {
  const noteIndex = notesDB.findIndex(n => n.id === noteId);
  if (noteIndex === -1) {
    return null;
  }
  const originalNote = notesDB[noteIndex];
  const updatedNote: Note = {
    ...originalNote,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  notesDB[noteIndex] = updatedNote;
  return updatedNote;
};

export const deleteNote = (noteId: string): boolean => {
  const initialLength = notesDB.length;
  notesDB = notesDB.filter(n => n.id !== noteId);
  return notesDB.length < initialLength;
};

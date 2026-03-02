// src/utils/annotationTypes.ts

export interface Highlight {
  id: string;          // Unique identifier for the highlight
  userId: string;      // Identifier for the user (from your new-backend)
  versionId: string;   // Bible version ID (e.g., "1" for KJV)
  bookUsfm: string;    // USFM code for the book (e.g., "GEN")
  chapter: number;     // Chapter number
  verses: string;      // Verse or range of verses (e.g., "1", "1-3", "5,7-9")
  color: string;       // Color of the highlight (e.g., "yellow", "#FFFF00")
  createdAt: string;   // ISO 8601 date string for creation time
  updatedAt: string;   // ISO 8601 date string for last update time
}

export interface Note {
  id: string;          // Unique identifier for the note
  userId: string;      // Identifier for the user
  versionId: string;   // Bible version ID
  bookUsfm: string;    // USFM code for the book
  chapter: number;     // Chapter number
  verses: string;      // Verse or range of verses the note is associated with
  text: string;        // The content of the note
  createdAt: string;   // ISO 8601 date string
  updatedAt: string;   // ISO 8601 date string
}

# API Documentation

This document provides details for all the API endpoints available in this server.

## Table of Contents
*   [Server Status](#server-status)
*   [Sermon API](#sermon-api)
    *   [GET Languages](#get-languages)
    *   [GET Change Language](#get-change-language)
    *   [GET Sermons by Language](#get-sermons-by-language)
    *   [GET Sermons by Year](#get-sermons-by-year)
    *   [GET Sermons by Length](#get-sermons-by-length)
    *   [GET Sermons by Series](#get-sermons-by-series)
    *   [GET Read Sermon Book (PDF Stream)](#get-read-sermon-book-pdf-stream)
    *   [GET Download Sermon Book (PDF)](#get-download-sermon-book-pdf)
    *   [GET Download Sermon (Audio)](#get-download-sermon-audio)
    *   [GET Stream Sermon (Audio)](#get-stream-sermon-audio)
    *   [GET Search Sermons](#get-search-sermons)
*   [Daily Content API](#daily-content-api)
    *   [GET Daily Quote and Verse](#get-daily-quote-and-verse)
*   [Annotation API](#annotation-api)
    *   [Highlights](#highlights)
    *   [Notes](#notes)
*   [Bible API](#bible-api)
    *   [GET Bible Languages](#get-bible-languages)
    *   [GET Bible Versions](#get-bible-versions)
    *   [GET Bible Books & Chapters](#get-bible-books--chapters)
    *   [GET Bible Chapter Content](#get-bible-chapter-content)

---

## Server Status

### `GET /`
*   **Description**: Checks if the server is up and running. Serves as a basic health check.
*   **Query Parameters**: None
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: `Server is up and running!` (text/html)

---

## Sermon API

### `GET /api/v3/languages`
*   **Description**: Fetches a list of available languages for sermons from the source.
*   **Query Parameters**: None
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of language objects.
        ```json
        // Example structure based on typical language list
        [
          { "name": "English", "code": "eng" },
          { "name": "Français", "code": "fra" }
        ]
        ```
    *   `500 Internal Server Error`: If an error occurs during fetching.
        ```json
        { "error": "Error message string" }
        ```

### `GET /api/v3/changeLanguage`
*   **Description**: Sets the active language context for subsequent sermon-related requests that depend on a language session (e.g., fetching sermons by language without specifying it again).
*   **Query Parameters**:
    *   `languageCode` (string, required): The language code to set (e.g., "eng", "fra").
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`:
        ```json
        { "message": "Language changed successfully" }
        ```
    *   `400 Bad Request`: If `languageCode` is missing.
        ```json
        { "error": "Missing language code" }
        ```
    *   `500 Internal Server Error`: If an error occurs.
        ```json
        { "error": "Error message string" }
        ```

### `GET /api/v3/sermons`
*   **Description**: Fetches a list of sermons for a specified language. The language context should ideally be set via `/api/v3/changeLanguage` first, or provided here.
*   **Query Parameters**:
    *   `languageCode` (string, required): The language code for the sermons (e.g., "eng", "fra").
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON object containing a list of sermon data.
        ```json
        // Example (structure from processMessageHtml)
        {
          "d": [
            {
              "title": "Sermon Title",
              "speaker": "Speaker Name",
              "date": "YYYY-MM-DD",
              "audioUrl": "url_to_audio.mp3",
              "pdfUrl": "url_to_pdf.pdf", 
              "detailsLink": "url_to_details_page"
            }
            // ... more sermons
          ]
        }
        ```
    *   `400 Bad Request`: If `languageCode` is missing.
        ```json
        { "error": "Missing language code" }
        ```
    *   `500 Internal Server Error`: If an error occurs.
        ```json
        { "error": "Error message string" }
        ```

### `GET /api/v3/sermonsByYear`
*   **Description**: Fetches sermons filtered by language and year.
*   **Query Parameters**:
    *   `languageCode` (string, required): Language code.
    *   `yearCode` (string, required): Year code (e.g., "1965").
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of sermon objects (structure depends on `getSermonsByYear` implementation).
    *   `400 Bad Request`: If `languageCode` or `yearCode` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/sermonsByLength`
*   **Description**: Fetches sermons filtered by language and length category.
*   **Query Parameters**:
    *   `languageCode` (string, required): Language code.
    *   `lengthCode` (string, required): Length category code (e.g., "SHORT", "MEDIUM", "LONG" - check `Lenght` enum in `getSermonsByLength.ts`).
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of sermon objects (structure depends on `getSermonsByLength` implementation).
    *   `400 Bad Request`: If `languageCode` or `lengthCode` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/sermonsBySeries`
*   **Description**: Fetches sermons filtered by language and series.
*   **Query Parameters**:
    *   `languageCode` (string, required): Language code.
    *   `seriesCode` (string, required): Series code (check `Series` enum in `getSermonsBySeries.ts`).
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of sermon objects (structure depends on `getSermonsBySeries` implementation).
    *   `400 Bad Request`: If `languageCode` or `seriesCode` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/readSermonBook`
*   **Description**: Streams a sermon book PDF file directly to the client.
*   **Query Parameters**:
    *   `url` (string, required): The direct URL to the PDF file.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: PDF file stream (`Content-Type: application/pdf`).
    *   `400 Bad Request`: If `url` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/downloadSermonBook`
*   **Description**: Downloads a sermon book PDF file.
*   **Query Parameters**:
    *   `url` (string, required): The direct URL to the PDF file.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: PDF file download (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`).
    *   `400 Bad Request`: If `url` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/downloadSermon`
*   **Description**: Downloads a sermon audio file (e.g., M4A).
*   **Query Parameters**:
    *   `url` (string, required): The direct URL to the audio file.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: Audio file download (`Content-Type: audio/m4a` or similar, `Content-Disposition: attachment; filename="..."`).
    *   `400 Bad Request`: If `url` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/streamSermon`
*   **Description**: Streams a sermon audio file, supporting range requests for playback.
*   **Query Parameters**:
    *   `audioUrl` (string, required): The direct URL to the audio file.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK` or `206 Partial Content`: Audio stream (`Content-Type: audio/mpeg` or similar).
    *   `400 Bad Request`: If `audioUrl` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v3/searchSermons`
*   **Description**: Searches for sermons based on a query string and language.
*   **Query Parameters**:
    *   `languageCode` (string, required): Language code.
    *   `query` (string, required): The search term.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of sermon objects matching the search (structure depends on `searchSermons` implementation).
    *   `400 Bad Request`: If `languageCode` or `query` is missing.
    *   `500 Internal Server Error`.

---

## Daily Content API

### `GET /api/v4/daily-content`
*   **Description**: Fetches the daily quote and associated Bible verse data.
*   **Query Parameters**: None
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON object containing daily content data.
        ```json
        // Example (structure from fetchDailyQuoteAndVerseData)
        {
          "quoteContainer": {
            "title": "Quote of the Day Title",
            "content": "The quote text...",
            "reference": "Quote reference"
          },
          "verseContainer": {
            "title": "Verse of the Day Title",
            "content": "The verse text...",
            "reference": "Verse reference"
          }
        }
        ```
    *   `500 Internal Server Error`: If an error occurs during fetching.
        ```json
        { "error": "Error message string or 'Internal Server Error fetching daily content'" }
        ```

---

## Annotation API

### Highlights

#### `POST /api/v4/annotations/highlights`
*   **Description**: Creates a new highlight.
*   **Request Body** (JSON):
    ```json
    {
      "userId": "string",
      "versionId": "string",
      "bookUsfm": "string",
      "chapter": "string", // e.g., "1", "2"
      "verses": "string", // e.g., "1", "1-3", "1,3,5"
      "color": "string", // Optional, e.g., "yellow"
      "selectedText": "string" // Optional, the actual selected text snippet
    }
    ```
*   **Responses**:
    *   `201 Created`: JSON object of the created highlight.
    *   `400 Bad Request`: If required fields are missing or invalid.
    *   `500 Internal Server Error`.

#### `GET /api/v4/annotations/highlights`
*   **Description**: Retrieves highlights, optionally filtered by user, version, book, chapter, and verses.
*   **Query Parameters** (all optional strings):
    *   `userId`
    *   `versionId`
    *   `bookUsfm`
    *   `chapter`
    *   `verses` (can be a single verse, range, or comma-separated)
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of highlight objects.
    *   `500 Internal Server Error`.

#### `GET /api/v4/annotations/highlights/:highlightId`
*   **Description**: Retrieves a specific highlight by its ID.
*   **Path Parameters**:
    *   `highlightId` (string, required): The ID of the highlight.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON object of the highlight.
    *   `404 Not Found`: If the highlight ID does not exist.
    *   `500 Internal Server Error`.

#### `PUT /api/v4/annotations/highlights/:highlightId`
*   **Description**: Updates an existing highlight.
*   **Path Parameters**:
    *   `highlightId` (string, required): The ID of the highlight to update.
*   **Request Body** (JSON): Fields to update (subset of POST body, `userId`, `versionId`, `bookUsfm`, `chapter`, `verses` typically should not change, focus on `color`, `selectedText`).
*   **Responses**:
    *   `200 OK`: JSON object of the updated highlight.
    *   `404 Not Found`: If the highlight ID does not exist.
    *   `500 Internal Server Error`.

#### `DELETE /api/v4/annotations/highlights/:highlightId`
*   **Description**: Deletes a specific highlight.
*   **Path Parameters**:
    *   `highlightId` (string, required): The ID of the highlight to delete.
*   **Request Body**: None
*   **Responses**:
    *   `204 No Content`: Successfully deleted.
    *   `404 Not Found`: If the highlight ID does not exist.
    *   `500 Internal Server Error`.

### Notes

#### `POST /api/v4/annotations/notes`
*   **Description**: Creates a new note.
*   **Request Body** (JSON):
    ```json
    {
      "userId": "string",
      "versionId": "string",
      "bookUsfm": "string",
      "chapter": "string", // e.g., "1", "2"
      "verses": "string", // e.g., "1", "1-3", "1,3,5"
      "text": "string" // The content of the note
    }
    ```
*   **Responses**:
    *   `201 Created`: JSON object of the created note.
    *   `400 Bad Request`: If required fields are missing or invalid.
    *   `500 Internal Server Error`.

#### `GET /api/v4/annotations/notes`
*   **Description**: Retrieves notes, optionally filtered by user, version, book, chapter, and verses.
*   **Query Parameters** (all optional strings):
    *   `userId`
    *   `versionId`
    *   `bookUsfm`
    *   `chapter`
    *   `verses`
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of note objects.
    *   `500 Internal Server Error`.

#### `GET /api/v4/annotations/notes/:noteId`
*   **Description**: Retrieves a specific note by its ID.
*   **Path Parameters**:
    *   `noteId` (string, required): The ID of the note.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON object of the note.
    *   `404 Not Found`: If the note ID does not exist.
    *   `500 Internal Server Error`.

#### `PUT /api/v4/annotations/notes/:noteId`
*   **Description**: Updates an existing note.
*   **Path Parameters**:
    *   `noteId` (string, required): The ID of the note to update.
*   **Request Body** (JSON): Fields to update (primarily `text`).
*   **Responses**:
    *   `200 OK`: JSON object of the updated note.
    *   `404 Not Found`: If the note ID does not exist.
    *   `500 Internal Server Error`.

#### `DELETE /api/v4/annotations/notes/:noteId`
*   **Description**: Deletes a specific note.
*   **Path Parameters**:
    *   `noteId` (string, required): The ID of the note to delete.
*   **Request Body**: None
*   **Responses**:
    *   `204 No Content`: Successfully deleted.
    *   `404 Not Found`: If the note ID does not exist.
    *   `500 Internal Server Error`.

---

## Bible API

### `GET /api/v4/bible/languages`
*   **Description**: Fetches available Bible languages, optionally filtered by a search query.
*   **Query Parameters**:
    *   `search` (string, optional): Search term to filter languages.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of language objects.
        ```json
        // Example (structure from bibleUtils.ts)
        [
          { "id": "123", "name": "English", "iso6393": "eng", "defaultVersionId": "456" },
          // ... more languages
        ]
        ```
    *   `500 Internal Server Error`.

### `GET /api/v4/bible/versions`
*   **Description**: Fetches Bible versions for a given language, optionally filtered by a search query.
*   **Query Parameters**:
    *   `lang` (string, required): ISO 639-3 language code (e.g., "eng").
    *   `search` (string, optional): Search term to filter versions.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of version objects.
        ```json
        // Example (structure from bibleUtils.ts)
        [
          { "id": "789", "name": "King James Version", "abbreviation": "KJV" },
          // ... more versions
        ]
        ```
    *   `400 Bad Request`: If `lang` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v4/bible/books`
*   **Description**: Fetches Bible books and their available chapters for a given version, optionally filtered by a search query.
*   **Query Parameters**:
    *   `versionId` (string, required): The ID of the Bible version.
    *   `search` (string, optional): Search term to filter books.
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON array of book objects, each containing chapters.
        ```json
        // Example (structure from bibleUtils.ts)
        [
          {
            "id": "GEN", 
            "name": "Genesis", 
            "chapters": [
              { "id": "GEN.1", "name": "Chapter 1" },
              { "id": "GEN.2", "name": "Chapter 2" }
            ]
          }
          // ... more books
        ]
        ```
    *   `400 Bad Request`: If `versionId` is missing.
    *   `500 Internal Server Error`.

### `GET /api/v4/bible/chapter`
*   **Description**: Fetches the content for a specific Bible chapter in a given version.
*   **Query Parameters**:
    *   `versionId` (string, required): The ID of the Bible version.
    *   `chapterUsfm` (string, required): The USFM identifier for the chapter (e.g., "GEN.1").
*   **Request Body**: None
*   **Responses**:
    *   `200 OK`: JSON object containing the processed chapter content (structure depends on `fetchAndProcessChapter` implementation, likely complex with HTML or structured text).
    *   `400 Bad Request`: If `versionId` or `chapterUsfm` is missing.
    *   `500 Internal Server Error`.

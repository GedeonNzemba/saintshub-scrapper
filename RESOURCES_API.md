# Resources API Documentation

## Overview
This API provides CRUD operations for managing resources in the MongoDB `test` database. Resources are polymorphic documents supporting 6 different types: Jesus, Billy_Graham, Gordon_Lindsay, Oral_Roberts, William_Branham, and Banner.

## Base URL
```
http://localhost:5000/api/v4
```

## Response Format
All endpoints return a standardized `ApiResponse` structure:

### Success Response
```json
{
  "success": true,
  "data": <resource_data>,
  "metadata": {  // Only for list endpoints
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}  // Optional additional context
  }
}
```

## Main Resource Endpoints

### 1. Create Resource
**POST** `/resources`

Creates a new resource document.

**Request Body:**
```json
{
  "resourceType": "Jesus",  // Required: Jesus | Billy_Graham | Gordon_Lindsay | Oral_Roberts | William_Branham | Banner
  "resourceName": "Jesus Film Collection",  // Required
  "category": "Video",  // Optional
  "sections": [],  // Type-specific fields...
  "collections": [],
  "journeyTemplates": []
}
```

**Success Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "resourceType": "Jesus",
    "resourceName": "Jesus Film Collection",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Get All Resources
**GET** `/resources`

Retrieves a paginated list of resources with optional filtering and sorting.

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `resourceType` | string | Filter by resource type | - |
| `category` | string | Filter by category | - |
| `search` | string | Text search across indexed fields | - |
| `page` | number | Page number (1-indexed) | 1 |
| `limit` | number | Results per page | 10 |
| `sort` | string | Field to sort by | createdAt |
| `order` | string | Sort order: `asc` or `desc` | desc |

**Example Request:**
```
GET /resources?resourceType=Jesus&page=1&limit=5&sort=resourceName&order=asc
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "resourceType": "Jesus",
      "resourceName": "Jesus Film Collection",
      "sections": [...],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3. Get Resource by ID
**GET** `/resources/:id`

Retrieves a single resource by its ObjectId.

**Path Parameters:**
- `id` - MongoDB ObjectId

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "resourceType": "Jesus",
    "resourceName": "Jesus Film Collection",
    ...
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource with id 507f1f77bcf86cd799439011 not found"
  }
}
```

---

### 4. Update Resource
**PUT** `/resources/:id`

Updates an existing resource. Automatically sets `updatedAt` timestamp.

**Request Body:**
```json
{
  "resourceName": "Updated Name",
  "category": "New Category",
  // Any other resource fields...
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "resourceType": "Jesus",
    "resourceName": "Updated Name",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 5. Delete Resource
**DELETE** `/resources/:id`

Deletes a single resource by ID.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### 6. Delete All Resources
**DELETE** `/resources`

⚠️ **Dangerous Operation** - Deletes all resources in the collection.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "deletedCount": 6
  }
}
```

---

## Nested Collection Endpoints (Jesus Resource Type)

These endpoints work only with `resourceType: "Jesus"` resources.

### 7. Get All Sections
**GET** `/resources/:id/sections`

Retrieves all sections from a Jesus resource.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "sectionName": "The Life of Jesus",
      "sectionPoster": "https://example.com/poster.jpg",
      "videos": [
        {
          "title": "Birth of Jesus",
          "description": "The nativity story",
          "videoUrl": "https://example.com/video.mp4",
          "posterUrl": "https://example.com/thumb.jpg",
          "duration": "15:30"
        }
      ]
    }
  ]
}
```

---

### 8. Add Section
**POST** `/resources/:id/sections`

Adds a new section to a Jesus resource.

**Request Body:**
```json
{
  "sectionName": "Miracles of Jesus",
  "sectionPoster": "https://example.com/miracles-poster.jpg",
  "videos": [
    {
      "title": "Healing the Blind",
      "videoUrl": "https://example.com/healing.mp4",
      "posterUrl": "https://example.com/healing-thumb.jpg"
    }
  ]
}
```

**Success Response:** `201 Created`
Returns the updated resource with the new section added.

---

### 9. Update Section
**PUT** `/resources/:id/sections/:sectionName`

Updates an existing section by name. URL-encode the section name if it contains special characters.

**Path Parameters:**
- `id` - Resource ObjectId
- `sectionName` - Section name (URL-encoded)

**Request Body:**
```json
{
  "sectionPoster": "https://example.com/new-poster.jpg",
  "videos": [...]  // Can update any section field
}
```

**Success Response:** `200 OK`
Returns the updated resource.

---

### 10. Delete Section
**DELETE** `/resources/:id/sections/:sectionName`

Removes a section from a Jesus resource.

**Success Response:** `200 OK`
Returns the updated resource with the section removed.

---

### 11. Get Journey Templates
**GET** `/resources/:id/journeys`

Retrieves all journey templates from a Jesus resource.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "journeyId": "journey-001",
      "cardInfo": {
        "title": "30 Days with Jesus",
        "image": "https://example.com/journey-card.jpg"
      },
      "items": [
        {
          "info": "Day 1",
          "description": "Begin your journey",
          "image": "https://example.com/day1.jpg",
          "mainContent": {
            "type": "video",
            "url": "https://example.com/day1-video.mp4"
          }
        }
      ]
    }
  ]
}
```

---

### 12. Get All Collections
**GET** `/resources/:id/collections`

Retrieves all collections from a Jesus resource.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "collectionId": "parables",
      "title": "Parables of Jesus",
      "image": "https://example.com/parables.jpg",
      "videos": [
        {
          "title": "The Good Samaritan",
          "poster": "https://example.com/samaritan.jpg",
          "content": {
            "videoUrl": "https://example.com/samaritan.mp4",
            "heading": "Love Your Neighbor",
            "description": "A lesson in compassion"
          }
        }
      ]
    }
  ]
}
```

---

### 13. Get Collection by ID
**GET** `/resources/:id/collections/:collectionId`

Retrieves a specific collection by its ID.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "collectionId": "parables",
    "title": "Parables of Jesus",
    "videos": [...]
  }
}
```

---

## Resource Types Schema

### Jesus Resource
```typescript
{
  resourceType: "Jesus",
  resourceName: string,
  category?: string,
  sections: Section[],
  journeyTemplates: JourneyTemplate[],
  collections: Collection[],
  createdAt: Date,
  updatedAt: Date
}
```

### Billy Graham Resource
```typescript
{
  resourceType: "Billy_Graham",
  resourceName: string,
  category?: string,
  videoLibrary: {
    categories: {
      category: string,
      videos: Video[]
    }[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Gordon Lindsay Resource
```typescript
{
  resourceType: "Gordon_Lindsay",
  resourceName: string,
  category?: string,
  courses: {
    courseName: string,
    coursePoster: string,
    videos: Video[]
  }[],
  createdAt: Date,
  updatedAt: Date
}
```

### Oral Roberts Resource
```typescript
{
  resourceType: "Oral_Roberts",
  resourceName: string,
  category?: string,
  healingSchool: {
    sessions: {
      sessionNumber: number,
      title: string,
      videos: Video[]
    }[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### William Branham Resource
```typescript
{
  resourceType: "William_Branham",
  resourceName: string,
  category?: string,
  media: {
    photos: ImageMedia[],
    booklets: {
      title: string,
      pdfUrl: string
    }[],
    documents: {
      title: string,
      content: string
    }[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Banner Resource
```typescript
{
  resourceType: "Banner",
  resourceName: string,
  category?: string,
  imageUrl: string,
  linkUrl?: string,
  displayOrder?: number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Database Indexes

The following indexes are automatically created on server startup for optimal query performance:

1. **resourceType** (ascending) - Fast filtering by type
2. **category** (ascending) - Category-based queries
3. **createdAt** (descending) - Recent resources first
4. **updatedAt** (descending) - Recently modified resources
5. **Text Search** - Full-text search across:
   - `resourceName`
   - `sections.sectionName`
   - `sections.videos.title`
   - `sections.videos.description`
   - `collections.title`
6. **Compound Index** - `resourceType + category` for filtered lists
7. **Nested Field Indexes** - Fast access to:
   - `sections.sectionName`
   - `collections.collectionId`
   - `journeyTemplates.journeyId`

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Missing required fields | 400 |
| `INVALID_ID` | Invalid MongoDB ObjectId format | 400 |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | 404 |
| `SECTION_NOT_FOUND` | Section doesn't exist in resource | 404 |
| `COLLECTION_NOT_FOUND` | Collection doesn't exist in resource | 404 |
| `RESOURCE_CREATE_ERROR` | Failed to create resource | 500 |
| `RESOURCE_FETCH_ERROR` | Failed to retrieve resource(s) | 500 |
| `RESOURCE_UPDATE_ERROR` | Failed to update resource | 500 |
| `RESOURCE_DELETE_ERROR` | Failed to delete resource | 500 |
| `SERVER_ERROR` | Generic server error | 500 |

---

## Example Usage

### Search for Jesus resources with pagination
```bash
curl "http://localhost:5000/api/v4/resources?resourceType=Jesus&search=miracles&page=1&limit=10"
```

### Create a new Jesus resource
```bash
curl -X POST http://localhost:5000/api/v4/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Jesus",
    "resourceName": "Complete Jesus Film",
    "category": "Film",
    "sections": []
  }'
```

### Add a section to an existing resource
```bash
curl -X POST http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/sections \
  -H "Content-Type: application/json" \
  -d '{
    "sectionName": "Teachings",
    "sectionPoster": "https://example.com/teachings.jpg",
    "videos": []
  }'
```

### Update a section
```bash
curl -X PUT http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/sections/Teachings \
  -H "Content-Type: application/json" \
  -d '{
    "sectionPoster": "https://example.com/new-teachings.jpg"
  }'
```

### Get all collections from a resource
```bash
curl http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/collections
```

---

## Performance Considerations

1. **Pagination**: Always use `limit` parameter for large datasets (default: 10)
2. **Text Search**: Use the `search` parameter instead of regex for better performance
3. **Filtering**: Combine `resourceType` and `category` filters when possible (compound index)
4. **Nested Operations**: Section/collection operations use atomic MongoDB updates
5. **Field Selection**: Future enhancement will allow projecting specific fields only

---

## Future Enhancements

- [ ] Add nested video CRUD operations within sections
- [ ] Implement validation middleware (Zod schemas)
- [ ] Add authentication/authorization
- [ ] Field projection for partial resource retrieval
- [ ] Batch operations for bulk updates
- [ ] Support for Billy Graham, Gordon Lindsay, and other resource types' nested operations
- [ ] Rate limiting and request throttling
- [ ] Audit logging for resource changes

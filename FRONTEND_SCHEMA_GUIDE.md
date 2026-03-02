# Resources Data Schema Documentation for Frontend

## Overview
This document provides complete schema definitions for all 6 resource types in the MongoDB `resources` collection. Each resource type has a unique structure optimized for different content presentation needs.

---

## Common Fields (All Resources)

Every resource, regardless of type, includes these base fields:

```typescript
{
  _id: string;                    // MongoDB ObjectId
  resourceType: string;            // "Jesus" | "Billy_Graham" | "Gordon_Lindsay" | "Oral_Roberts" | "William_Branham" | "Banner"
  resourceName: string;            // Display name of the resource
  category?: string;               // Optional category (e.g., "Video", "Film", "Teaching")
  createdAt: Date;                 // ISO 8601 timestamp
  updatedAt: Date;                 // ISO 8601 timestamp
}
```

---

## 1. Jesus Resource Type

**Use Case**: Video content organized into sections, collections, and journey templates for interactive Bible learning experiences.

### Complete Schema

```typescript
{
  resourceType: "Jesus",
  resourceName: string,
  category?: string,
  
  // Array of video sections (topical organization)
  sections: [
    {
      sectionName: string,           // e.g., "The Life of Jesus", "Miracles"
      sectionPoster: string,         // URL to poster image
      videos: [
        {
          title: string,             // Video title
          description?: string,      // Optional description
          posterUrl?: string,        // Thumbnail/poster image URL
          pageUrl?: string,          // Optional web page URL
          videoUrl: string,          // Direct video file URL (required)
          duration?: string          // e.g., "15:30", "1:05:22"
        }
      ]
    }
  ],
  
  // Curated video collections (thematic grouping)
  collections: [
    {
      collectionId: string,          // Unique identifier (e.g., "parables")
      title: string,                 // Collection title
      image: string,                 // Collection cover image URL
      videos: [
        {
          title: string,
          poster: string,            // Video thumbnail URL
          content?: {
            videoUrl: string,
            info?: string,
            heading?: string,
            description?: string
          }
        }
      ]
    }
  ],
  
  // Guided learning journeys (day-by-day content)
  journeyTemplates: [
    {
      journeyId: string,             // Unique identifier
      cardInfo: {
        title: string,               // Journey title (e.g., "30 Days with Jesus")
        image: string                // Journey card image URL
      },
      items: [
        {
          info: string,              // Day label (e.g., "Day 1")
          description: string,       // Day description
          image: string,             // Day image URL
          href?: string,             // Optional external link
          mainContent: {
            type: string,            // "video" | "reading" | "reflection"
            url?: string,            // Content URL (for video/audio)
            text?: string            // Text content (for reading)
          }
        }
      ]
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

### UI Implementation Guide

**Sections Display**:
- Grid or carousel of section cards
- Each card shows `sectionPoster` and `sectionName`
- Click → Opens video list for that section
- Video player uses `videoUrl`, shows `posterUrl` as thumbnail

**Collections Display**:
- Card grid showing `collection.image` and `title`
- Click → Opens collection detail with video grid
- Videos show `poster` thumbnail, play via `content.videoUrl`

**Journey Templates Display**:
- Card for each journey showing `cardInfo.image` and `cardInfo.title`
- Click → Opens journey flow (step-by-step navigation)
- Each item displays `image`, `info`, `description`
- Show `mainContent` based on type (video player, text reader, etc.)

### Example Data

```json
{
  "_id": "674d8a2f9e8b7c1a2d3e4f5a",
  "resourceType": "Jesus",
  "resourceName": "The Jesus Film Collection",
  "category": "Film",
  "sections": [
    {
      "sectionName": "Miracles of Jesus",
      "sectionPoster": "https://cdn.example.com/miracles-poster.jpg",
      "videos": [
        {
          "title": "Walking on Water",
          "description": "Jesus walks on the Sea of Galilee",
          "posterUrl": "https://cdn.example.com/walking-water-thumb.jpg",
          "videoUrl": "https://cdn.example.com/videos/walking-water.mp4",
          "duration": "5:42"
        }
      ]
    }
  ],
  "collections": [
    {
      "collectionId": "parables",
      "title": "Parables of Jesus",
      "image": "https://cdn.example.com/parables-collection.jpg",
      "videos": [
        {
          "title": "The Good Samaritan",
          "poster": "https://cdn.example.com/samaritan-thumb.jpg",
          "content": {
            "videoUrl": "https://cdn.example.com/videos/good-samaritan.mp4",
            "heading": "Love Your Neighbor",
            "description": "A lesson in compassion and mercy"
          }
        }
      ]
    }
  ],
  "journeyTemplates": [
    {
      "journeyId": "30-days-jesus",
      "cardInfo": {
        "title": "30 Days with Jesus",
        "image": "https://cdn.example.com/30-days-card.jpg"
      },
      "items": [
        {
          "info": "Day 1",
          "description": "Begin your journey with the birth of Jesus",
          "image": "https://cdn.example.com/day1-nativity.jpg",
          "mainContent": {
            "type": "video",
            "url": "https://cdn.example.com/videos/nativity.mp4"
          }
        }
      ]
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 2. Billy Graham Resource Type

**Use Case**: Video sermon library organized by categories (e.g., "Faith", "Hope", "Salvation").

### Complete Schema

```typescript
{
  resourceType: "Billy_Graham",
  resourceName: string,
  category?: string,
  
  videoLibrary: {
    categories: [
      {
        category: string,            // Category name (e.g., "Faith and Belief")
        videos: [
          {
            title: string,
            description?: string,
            posterUrl?: string,
            pageUrl?: string,
            videoUrl: string,
            duration?: string
          }
        ]
      }
    ]
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### UI Implementation Guide

**Video Library Display**:
- Tabbed interface or accordion for categories
- Each category shows video grid
- Video cards display `posterUrl` thumbnail and `title`
- Click → Play video using `videoUrl`
- Show `duration` on thumbnail overlay

### Example Data

```json
{
  "_id": "674d8a2f9e8b7c1a2d3e4f5b",
  "resourceType": "Billy_Graham",
  "resourceName": "Billy Graham Classics",
  "category": "Sermons",
  "videoLibrary": {
    "categories": [
      {
        "category": "Faith and Belief",
        "videos": [
          {
            "title": "The Power of Faith",
            "description": "Billy Graham's powerful message on faith",
            "posterUrl": "https://cdn.example.com/bg-faith-thumb.jpg",
            "videoUrl": "https://cdn.example.com/videos/bg-faith.mp4",
            "duration": "42:15"
          }
        ]
      },
      {
        "category": "Hope and Healing",
        "videos": [
          {
            "title": "Finding Hope in Difficult Times",
            "posterUrl": "https://cdn.example.com/bg-hope-thumb.jpg",
            "videoUrl": "https://cdn.example.com/videos/bg-hope.mp4",
            "duration": "38:50"
          }
        ]
      }
    ]
  },
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

---

## 3. Gordon Lindsay Resource Type

**Use Case**: Educational courses with structured video lessons.

### Complete Schema

```typescript
{
  resourceType: "Gordon_Lindsay",
  resourceName: string,
  category?: string,
  
  courses: [
    {
      courseName: string,            // e.g., "Divine Healing Course"
      coursePoster: string,          // Course cover image URL
      videos: [
        {
          title: string,
          description?: string,
          posterUrl?: string,
          pageUrl?: string,
          videoUrl: string,
          duration?: string
        }
      ]
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

### UI Implementation Guide

**Courses Display**:
- Grid of course cards showing `coursePoster` and `courseName`
- Click course → Opens course detail page
- List lessons sequentially with video thumbnails
- Track progress (optional: store user completion state separately)
- Auto-play next lesson feature

### Example Data

```json
{
  "_id": "674d8a2f9e8b7c1a2d3e4f5c",
  "resourceType": "Gordon_Lindsay",
  "resourceName": "Gordon Lindsay Teaching Library",
  "category": "Courses",
  "courses": [
    {
      "courseName": "Divine Healing and Deliverance",
      "coursePoster": "https://cdn.example.com/gl-healing-course.jpg",
      "videos": [
        {
          "title": "Lesson 1: Introduction to Divine Healing",
          "description": "Biblical foundations of healing ministry",
          "posterUrl": "https://cdn.example.com/gl-lesson1-thumb.jpg",
          "videoUrl": "https://cdn.example.com/videos/gl-healing-lesson1.mp4",
          "duration": "28:15"
        },
        {
          "title": "Lesson 2: Faith for Healing",
          "posterUrl": "https://cdn.example.com/gl-lesson2-thumb.jpg",
          "videoUrl": "https://cdn.example.com/videos/gl-healing-lesson2.mp4",
          "duration": "31:42"
        }
      ]
    }
  ],
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

## 4. Oral Roberts Resource Type

**Use Case**: Healing School sessions organized by session number.

### Complete Schema

```typescript
{
  resourceType: "Oral_Roberts",
  resourceName: string,
  category?: string,
  
  healingSchool: {
    sessions: [
      {
        sessionNumber: number,       // Sequential session number
        title: string,               // Session title
        videos: [
          {
            title: string,
            description?: string,
            posterUrl?: string,
            pageUrl?: string,
            videoUrl: string,
            duration?: string
          }
        ]
      }
    ]
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### UI Implementation Guide

**Healing School Display**:
- Sequential list of sessions (sorted by `sessionNumber`)
- Each session card shows session number and title
- Expandable to reveal video list
- Progress indicator (e.g., "Session 5 of 12")
- Continue watching feature (track last watched session)

### Example Data

```json
{
  "_id": "674d8a2f9e8b7c1a2d3e4f5d",
  "resourceType": "Oral_Roberts",
  "resourceName": "Oral Roberts Healing School",
  "category": "Teaching",
  "healingSchool": {
    "sessions": [
      {
        "sessionNumber": 1,
        "title": "Introduction to God's Healing Power",
        "videos": [
          {
            "title": "Session 1 - Part 1",
            "description": "Understanding divine healing",
            "posterUrl": "https://cdn.example.com/or-s1p1-thumb.jpg",
            "videoUrl": "https://cdn.example.com/videos/or-session1-part1.mp4",
            "duration": "35:20"
          },
          {
            "title": "Session 1 - Part 2",
            "posterUrl": "https://cdn.example.com/or-s1p2-thumb.jpg",
            "videoUrl": "https://cdn.example.com/videos/or-session1-part2.mp4",
            "duration": "28:45"
          }
        ]
      },
      {
        "sessionNumber": 2,
        "title": "Faith and Expectation",
        "videos": [
          {
            "title": "Session 2 - Full Teaching",
            "posterUrl": "https://cdn.example.com/or-s2-thumb.jpg",
            "videoUrl": "https://cdn.example.com/videos/or-session2.mp4",
            "duration": "52:10"
          }
        ]
      }
    ]
  },
  "createdAt": "2024-01-15T13:00:00.000Z",
  "updatedAt": "2024-01-15T13:00:00.000Z"
}
```

---

## 5. William Branham Resource Type

**Use Case**: Mixed media library including photos, PDF booklets, and text documents.

### Complete Schema

```typescript
{
  resourceType: "William_Branham",
  resourceName: string,
  category?: string,
  
  media: {
    photos: [
      {
        imageUrl: string,            // Photo URL
        caption?: string,            // Photo description
        altText?: string             // Accessibility text
      }
    ],
    
    booklets: [
      {
        title: string,               // Booklet title
        pdfUrl: string               // Direct PDF download URL
      }
    ],
    
    documents: [
      {
        title: string,               // Document title
        content: string              // Full text content (HTML or plain text)
      }
    ]
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### UI Implementation Guide

**Media Library Display**:
- Tabbed interface: Photos | Booklets | Documents
- **Photos Tab**: Grid gallery with lightbox viewer
- **Booklets Tab**: List with download buttons (`pdfUrl`)
- **Documents Tab**: Searchable list, click to view full text
- Use `caption` and `altText` for accessibility

### Example Data

```json
{
  "_id": "674d8a2f9e8b7c1a2d3e4f5e",
  "resourceType": "William_Branham",
  "resourceName": "William Branham Archive",
  "category": "Historical",
  "media": {
    "photos": [
      {
        "imageUrl": "https://cdn.example.com/wb-photo1.jpg",
        "caption": "William Branham preaching in 1952",
        "altText": "Black and white photo of evangelist at podium"
      },
      {
        "imageUrl": "https://cdn.example.com/wb-photo2.jpg",
        "caption": "Prayer line at tent revival",
        "altText": "Large crowd gathered for healing service"
      }
    ],
    "booklets": [
      {
        "title": "Seven Church Ages",
        "pdfUrl": "https://cdn.example.com/pdfs/seven-church-ages.pdf"
      },
      {
        "title": "Supernatural: The Life of William Branham",
        "pdfUrl": "https://cdn.example.com/pdfs/supernatural-biography.pdf"
      }
    ],
    "documents": [
      {
        "title": "The Spoken Word: Faith",
        "content": "<h1>Faith</h1><p>Sermon delivered on April 18, 1952...</p>"
      }
    ]
  },
  "createdAt": "2024-01-15T14:00:00.000Z",
  "updatedAt": "2024-01-15T14:00:00.000Z"
}
```

---

## 6. Banner Resource Type

**Use Case**: Simple promotional banners for home screen or feature highlights.

### Complete Schema

```typescript
{
  resourceType: "Banner",
  resourceName: string,
  category?: string,
  
  imageUrl: string,                  // Banner image URL (required)
  linkUrl?: string,                  // Optional click destination
  displayOrder?: number,             // Sort order (0 = highest priority)
  
  createdAt: Date,
  updatedAt: Date
}
```

### UI Implementation Guide

**Banner Display**:
- Carousel/slider component (if multiple banners)
- Sort by `displayOrder` (ascending: 0, 1, 2...)
- Click banner → Navigate to `linkUrl` (if present)
- Full-width or card-based depending on design
- Auto-rotate every 5-7 seconds

### Example Data

```json
{
  "_id": "674d8a2f9e8b7c1a2d3e4f5f",
  "resourceType": "Banner",
  "resourceName": "New Year Special",
  "category": "Promotion",
  "imageUrl": "https://cdn.example.com/banners/new-year-2024.jpg",
  "linkUrl": "https://example.com/new-year-series",
  "displayOrder": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## API Endpoints Reference

### Get All Resources
```
GET /api/v4/resources
Query Parameters:
  - resourceType: Filter by type
  - category: Filter by category
  - search: Text search
  - page: Page number (default: 1)
  - limit: Items per page (default: 10)
  - sort: Field to sort by (default: createdAt)
  - order: asc | desc (default: desc)

Response:
{
  "success": true,
  "data": [...resources],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Get Single Resource
```
GET /api/v4/resources/:id

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "resourceType": "Jesus",
    ...full resource object
  }
}
```

### Get Nested Collections (Jesus Resource Only)
```
GET /api/v4/resources/:id/sections
GET /api/v4/resources/:id/collections
GET /api/v4/resources/:id/journeys

Response:
{
  "success": true,
  "data": [...array of sections/collections/journeys]
}
```

---

## Frontend Implementation Recommendations

### 1. TypeScript Interfaces

Create type definitions for type safety:

```typescript
// Base resource interface
interface BaseResource {
  _id: string;
  resourceType: 'Jesus' | 'Billy_Graham' | 'Gordon_Lindsay' | 'Oral_Roberts' | 'William_Branham' | 'Banner';
  resourceName: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Video interface (reused across types)
interface Video {
  title: string;
  description?: string;
  posterUrl?: string;
  pageUrl?: string;
  videoUrl: string;
  duration?: string;
}

// Jesus resource
interface JesusResource extends BaseResource {
  resourceType: 'Jesus';
  sections: Array<{
    sectionName: string;
    sectionPoster: string;
    videos: Video[];
  }>;
  collections: Array<{
    collectionId: string;
    title: string;
    image: string;
    videos: Array<{
      title: string;
      poster: string;
      content?: {
        videoUrl: string;
        info?: string;
        heading?: string;
        description?: string;
      };
    }>;
  }>;
  journeyTemplates: Array<{
    journeyId: string;
    cardInfo: {
      title: string;
      image: string;
    };
    items: Array<{
      info: string;
      description: string;
      image: string;
      href?: string;
      mainContent: {
        type: string;
        url?: string;
        text?: string;
      };
    }>;
  }>;
}

// Billy Graham resource
interface BillyGrahamResource extends BaseResource {
  resourceType: 'Billy_Graham';
  videoLibrary: {
    categories: Array<{
      category: string;
      videos: Video[];
    }>;
  };
}

// ... (define other resource types similarly)

// Union type for all resources
type Resource = JesusResource | BillyGrahamResource | GordonLindsayResource | OralRobertsResource | WilliamBranhamResource | BannerResource;
```

### 2. Component Structure (React Example)

```tsx
// Resource list component
<ResourceList>
  {resources.map(resource => (
    <ResourceCard 
      key={resource._id} 
      resource={resource}
      onClick={() => navigateToDetail(resource._id)}
    />
  ))}
</ResourceList>

// Detail components per type
switch (resource.resourceType) {
  case 'Jesus':
    return <JesusResourceDetail resource={resource} />;
  case 'Billy_Graham':
    return <BillyGrahamResourceDetail resource={resource} />;
  // ... etc
}
```

### 3. State Management

```typescript
// Fetch resources with filters
const [resources, setResources] = useState<Resource[]>([]);
const [pagination, setPagination] = useState({ page: 1, total: 0 });

async function fetchResources(filters: {
  resourceType?: string;
  search?: string;
  page?: number;
}) {
  const response = await fetch(
    `/api/v4/resources?${new URLSearchParams(filters)}`
  );
  const { data, metadata } = await response.json();
  setResources(data);
  setPagination(metadata);
}
```

### 4. Video Player Integration

```tsx
<VideoPlayer 
  src={video.videoUrl}
  poster={video.posterUrl}
  title={video.title}
  onEnded={() => playNext()}
/>
```

### 5. Image Handling

```tsx
// With fallback
<img 
  src={resource.imageUrl || '/placeholder.jpg'} 
  alt={resource.altText || resource.resourceName}
  loading="lazy"
/>
```

### 6. PDF Viewer

```tsx
// Option 1: Direct download
<a href={booklet.pdfUrl} download>
  Download {booklet.title}
</a>

// Option 2: In-app viewer
<iframe src={booklet.pdfUrl} />

// Option 3: Use library like react-pdf
<Document file={booklet.pdfUrl}>
  <Page pageNumber={1} />
</Document>
```

---

## Testing Data

For testing your UI, you can use the admin dashboard to create sample resources:
1. Go to `http://localhost:5000/admin`
2. Navigate to Resources section
3. Click "Create New Resource"
4. Fill in sample data for each resource type

Or use the API directly:
```bash
# Create a Jesus resource
curl -X POST http://localhost:5000/api/v4/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Jesus",
    "resourceName": "Test Jesus Resource",
    "sections": [],
    "collections": [],
    "journeyTemplates": []
  }'
```

---

## Error Handling

All API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": {...}
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource with id X not found"
  }
}
```

Always check `success` field before accessing `data`.

---

## Performance Considerations

1. **Lazy Loading**: Load videos/images only when visible
2. **Pagination**: Always use page/limit parameters
3. **Caching**: Cache resource lists and details
4. **Image Optimization**: Use CDN with proper image sizing
5. **Video Streaming**: Use HLS/DASH for adaptive streaming (if videoUrl supports it)

---

## Accessibility

1. Always provide `alt` text for images
2. Use semantic HTML for sections
3. Keyboard navigation for video players
4. Screen reader-friendly labels
5. ARIA attributes for complex UI components

---

## Mobile Considerations

1. **Touch-friendly**: Large tap targets (min 44x44px)
2. **Responsive Images**: Different sizes for mobile/desktop
3. **Video Controls**: Large, easy-to-tap controls
4. **Swipe Gestures**: For carousels and galleries
5. **Offline Support**: Cache viewed content (optional)

---

## Questions?

Refer to:
- API Documentation: `RESOURCES_API.md`
- Admin Dashboard: `http://localhost:5000/admin`
- Sample Data: Use admin to explore real data structure

---

**Last Updated**: December 11, 2025  
**API Version**: v4  
**Schema Version**: 1.0

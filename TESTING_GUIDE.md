# Quick Start Testing Guide

## Start the Server

```powershell
cd "c:\Users\nzemb\Documents\gedeon\testing\LifeCheq\2\test 2"
bun run src/index.ts
```

Expected output:
```
✅ Connected to MongoDB successfully
✅ Resource indexes initialized
Server listening on http://localhost:5000
```

---

## Test Endpoints with cURL

### 1. List All Resources (with pagination)
```powershell
curl http://localhost:5000/api/v4/resources?page=1&limit=5
```

### 2. Get Resources of Specific Type
```powershell
curl http://localhost:5000/api/v4/resources?resourceType=Jesus
```

### 3. Search Resources
```powershell
curl "http://localhost:5000/api/v4/resources?search=miracles"
```

### 4. Get Single Resource by ID
```powershell
# Replace with actual ID from your database
curl http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011
```

### 5. Create New Jesus Resource
```powershell
curl -X POST http://localhost:5000/api/v4/resources `
  -H "Content-Type: application/json" `
  -d '{
    \"resourceType\": \"Jesus\",
    \"resourceName\": \"Test Jesus Film\",
    \"category\": \"Film\",
    \"sections\": [],
    \"collections\": [],
    \"journeyTemplates\": []
  }'
```

### 6. Create New Banner Resource
```powershell
curl -X POST http://localhost:5000/api/v4/resources `
  -H "Content-Type: application/json" `
  -d '{
    \"resourceType\": \"Banner\",
    \"resourceName\": \"Homepage Banner\",
    \"imageUrl\": \"https://example.com/banner.jpg\",
    \"linkUrl\": \"https://example.com\",
    \"displayOrder\": 1
  }'
```

### 7. Get Sections from Jesus Resource
```powershell
# Replace :id with actual resource ID
curl http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/sections
```

### 8. Add Section to Jesus Resource
```powershell
curl -X POST http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/sections `
  -H "Content-Type: application/json" `
  -d '{
    \"sectionName\": \"Miracles\",
    \"sectionPoster\": \"https://example.com/miracles.jpg\",
    \"videos\": [
      {
        \"title\": \"Walking on Water\",
        \"description\": \"Jesus walks on water\",
        \"videoUrl\": \"https://example.com/walking-water.mp4\",
        \"posterUrl\": \"https://example.com/walking-thumb.jpg\",
        \"duration\": \"5:30\"
      }
    ]
  }'
```

### 9. Update Section
```powershell
# Note: URL encode section name if it has spaces
curl -X PUT http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/sections/Miracles `
  -H "Content-Type: application/json" `
  -d '{
    \"sectionPoster\": \"https://example.com/new-miracles-poster.jpg\"
  }'
```

### 10. Get Collections
```powershell
curl http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/collections
```

### 11. Get Specific Collection
```powershell
curl http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/collections/parables
```

### 12. Update Resource
```powershell
curl -X PUT http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011 `
  -H "Content-Type: application/json" `
  -d '{
    \"resourceName\": \"Updated Name\",
    \"category\": \"Updated Category\"
  }'
```

### 13. Delete Section
```powershell
curl -X DELETE http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011/sections/Miracles
```

### 14. Delete Resource
```powershell
curl -X DELETE http://localhost:5000/api/v4/resources/507f1f77bcf86cd799439011
```

---

## Test with Postman

### Import as Collection

Create a Postman collection with these requests:

**Base URL:** `http://localhost:5000/api/v4`

1. **List Resources**
   - Method: GET
   - URL: `{{baseUrl}}/resources?page=1&limit=10`

2. **Search Resources**
   - Method: GET
   - URL: `{{baseUrl}}/resources?search=jesus&resourceType=Jesus`

3. **Create Resource**
   - Method: POST
   - URL: `{{baseUrl}}/resources`
   - Body (JSON):
   ```json
   {
     "resourceType": "Jesus",
     "resourceName": "Test Resource",
     "category": "Video",
     "sections": [],
     "collections": [],
     "journeyTemplates": []
   }
   ```

4. **Get Resource**
   - Method: GET
   - URL: `{{baseUrl}}/resources/{{resourceId}}`

5. **Get Sections**
   - Method: GET
   - URL: `{{baseUrl}}/resources/{{resourceId}}/sections`

6. **Add Section**
   - Method: POST
   - URL: `{{baseUrl}}/resources/{{resourceId}}/sections`
   - Body (JSON):
   ```json
   {
     "sectionName": "Test Section",
     "sectionPoster": "https://example.com/poster.jpg",
     "videos": []
   }
   ```

---

## Test Scenarios

### Scenario 1: Create and Query Jesus Resource

1. **Create** a Jesus resource:
```powershell
curl -X POST http://localhost:5000/api/v4/resources `
  -H "Content-Type: application/json" `
  -d '{\"resourceType\": \"Jesus\", \"resourceName\": \"My Jesus Film\", \"sections\": []}'
```

2. **Copy** the `_id` from response

3. **Add** a section:
```powershell
curl -X POST http://localhost:5000/api/v4/resources/<PASTE_ID_HERE>/sections `
  -H "Content-Type: application/json" `
  -d '{\"sectionName\": \"Teachings\", \"sectionPoster\": \"url\", \"videos\": []}'
```

4. **Verify** section was added:
```powershell
curl http://localhost:5000/api/v4/resources/<PASTE_ID_HERE>/sections
```

### Scenario 2: Pagination Testing

```powershell
# Page 1, 5 results
curl http://localhost:5000/api/v4/resources?page=1&limit=5

# Page 2, 5 results
curl http://localhost:5000/api/v4/resources?page=2&limit=5

# Check metadata for total pages
```

### Scenario 3: Filtering and Sorting

```powershell
# Filter by type, sort by name ascending
curl "http://localhost:5000/api/v4/resources?resourceType=Jesus&sort=resourceName&order=asc"

# Filter by category
curl "http://localhost:5000/api/v4/resources?category=Video"

# Combine filters
curl "http://localhost:5000/api/v4/resources?resourceType=Billy_Graham&category=Sermon&page=1&limit=10"
```

### Scenario 4: Text Search

```powershell
# Search across all text fields
curl "http://localhost:5000/api/v4/resources?search=miracles"

# Search + filter
curl "http://localhost:5000/api/v4/resources?search=healing&resourceType=Jesus"
```

---

## Expected Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "_id": "674d8a2f9e8b7c1a2d3e4f5a",
    "resourceType": "Jesus",
    "resourceName": "My Jesus Film",
    "sections": [],
    "collections": [],
    "journeyTemplates": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### List Response with Metadata
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Error Response
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

## MongoDB Shell Testing

### Connect to Database
```bash
mongosh "mongodb+srv://cluster0.wwquqs3.mongodb.net/test" --username <your-username>
```

### Query Resources
```javascript
// List all resources
db.resources.find().pretty()

// Count resources
db.resources.countDocuments()

// Find by type
db.resources.find({ resourceType: "Jesus" })

// Check indexes
db.resources.getIndexes()

// Find sections within Jesus resource
db.resources.find(
  { resourceType: "Jesus" },
  { sections: 1, resourceName: 1 }
)

// Text search
db.resources.find({ $text: { $search: "miracles" } })
```

---

## Troubleshooting

### Server Won't Start
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <PID> /F
```

### MongoDB Connection Failed
- Verify connection string in `src/utils/database/connection.ts`
- Check MongoDB Atlas network access (whitelist your IP)
- Ensure database user has read/write permissions

### Indexes Not Created
- Check server startup logs for "Resource indexes initialized"
- Manually create indexes in MongoDB Compass or shell
- Verify MongoDB version supports text indexes

### Invalid ObjectId Error
- Ensure you're using valid 24-character hex string for IDs
- Example valid ID: `507f1f77bcf86cd799439011`

---

## Performance Testing

### Test Index Usage

```javascript
// In MongoDB shell, explain query to see if indexes are used
db.resources.find({ resourceType: "Jesus" }).explain("executionStats")

// Check if text search uses index
db.resources.find({ $text: { $search: "miracles" } }).explain("executionStats")

// Verify compound index usage
db.resources.find({ resourceType: "Jesus", category: "Video" }).explain("executionStats")
```

Look for `"stage": "IXSCAN"` in explain output (indicates index was used).

---

## Next Steps

1. ✅ Start server and verify MongoDB connection
2. ✅ Test basic CRUD operations
3. ✅ Test pagination and filtering
4. ✅ Test nested section operations
5. ✅ Verify indexes are working (check query performance)
6. ⏳ Add authentication (future)
7. ⏳ Add validation middleware (future)
8. ⏳ Deploy to production (future)

For complete API documentation, see `RESOURCES_API.md`

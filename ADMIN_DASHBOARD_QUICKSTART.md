# 🚀 Quick Start Guide - Admin Dashboard

## Start Your Server

```powershell
# Navigate to project directory
cd "c:\Users\nzemb\Documents\gedeon\testing\LifeCheq\2\test 2"

# Start the server with npm
npm run dev
```

You should see:
```
✅ Connected to MongoDB successfully
✅ Resource indexes initialized
Server listening on http://localhost:5000
```

## Access the Dashboard

Open your browser and navigate to:
```
http://localhost:5000/admin
```

## Dashboard Overview

### Main Sections

1. **📊 Overview** (Dashboard home)
   - Server status indicator
   - Statistics (resources, highlights, notes, languages)
   - Quick reference to all API endpoints

2. **📦 Resources** (MongoDB CRUD)
   - View all resources with pagination
   - Create new resources (6 types supported)
   - Edit and delete existing resources
   - Filter by type, search, and sort

3. **📖 Bible API** (Testing interface)
   - Step-by-step Bible content loading
   - Language → Version → Book → Chapter
   - Visual chapter content display

4. **🎤 Sermons** (Sermon management)
   - Search sermons
   - Browse by year
   - Filter by length
   - Browse by series

5. **✏️ Annotations** (Highlights & Notes)
   - Create and manage Bible highlights
   - Create and manage Bible notes
   - Filter by user or book
   - Delete annotations

6. **☀️ Daily Content** (Content preview)
   - Verse of the day
   - Daily quotes and verses
   - Language selection

7. **🧪 API Tester** (Generic endpoint testing)
   - Test any API endpoint
   - Support for all HTTP methods
   - JSON request/response viewer

## First Steps

### 1. Check Server Status
Look at the top of the sidebar for the status indicator:
- **🟢 Green dot** = Server connected
- **🔴 Red dot** = Server disconnected

### 2. View Existing Resources
1. Click **"📦 Resources"** in the sidebar
2. Existing resources from your MongoDB database will load
3. Use pagination controls to browse multiple pages

### 3. Create Your First Resource
1. In Resources section, click **"➕ Create New Resource"**
2. Select **"Banner"** as the resource type (simplest)
3. Fill in:
   - **Resource Name**: "Test Banner"
   - **Category**: "Homepage"
   - **Image URL**: "https://example.com/banner.jpg"
   - **Link URL**: "https://example.com"
   - **Display Order**: 1
4. Click **"Create Resource"**
5. Your new resource appears in the list!

### 4. Test Bible API
1. Click **"📖 Bible API"** in sidebar
2. Click **"Load Languages"**
3. Select a language from the dropdown
4. Click **"Load Versions"**
5. Select a version
6. Click **"Load Books"**
7. Select a book
8. Enter chapter number (e.g., 1)
9. Click **"Load Chapter"**
10. Chapter content displays below!

### 5. Use API Tester
1. Click **"🧪 API Tester"** in sidebar
2. Leave method as **GET**
3. Enter endpoint: `/api/v4/resources`
4. Click **"🚀 Send Request"**
5. See your resources in JSON format!

## Common Tasks

### Filter Resources
```
1. Go to Resources section
2. Select resource type from "All Types" dropdown
3. Enter search term in search box
4. Click "🔍 Apply Filters"
```

### Create a Highlight
```
1. Go to Annotations section
2. Click "➕ Create Highlight"
3. Fill in:
   - User ID: "user123"
   - Version ID: "eng-KJV"
   - Book: "GEN"
   - Chapter: 1
   - Verses: "1-3"
   - Color: Yellow
4. Click "Create"
```

### Search Sermons
```
1. Go to Sermons section
2. Enter search term: "faith"
3. Click "Search"
4. Results appear in results area
```

## Keyboard Shortcuts

Currently, the dashboard uses mouse/touch navigation. Future updates may include:
- `Ctrl+K` - Quick search
- `Ctrl+N` - New resource
- `Esc` - Close modals

## Tips & Tricks

### Pagination
- Click page numbers to jump directly
- Use Previous/Next for sequential browsing
- Current page is highlighted in blue

### Modals
- Click outside the modal to close
- Use X button in top-right corner
- Press ESC key to close (browser default)

### Filtering
- Combine multiple filters for precise results
- Clear search field to show all results
- Filters persist until changed or page refresh

### JSON Editing
When creating resources with JSON fields (Jesus type):
```json
// Sections example
[
  {
    "sectionName": "Miracles",
    "sectionPoster": "https://example.com/poster.jpg",
    "videos": []
  }
]
```

### Error Messages
- Alerts show at top of page
- Green checkmark = Success
- Red X = Error
- Check browser console for technical details

## Troubleshooting

### "Server Disconnected" Status
```
✅ Check server is running (npm run dev)
✅ Verify server is on port 5000
✅ Check MongoDB connection is active
✅ Refresh the dashboard page
```

### Resources Not Loading
```
✅ Check MongoDB has data: db.resources.find()
✅ Verify connection string in src/utils/database/connection.ts
✅ Check browser console for errors
✅ Try API Tester with GET /api/v4/resources
```

### Create Resource Fails
```
✅ Ensure required fields are filled (resourceType, resourceName)
✅ For Jesus type, check JSON syntax is valid
✅ Verify MongoDB is running and accessible
✅ Check server logs for detailed error
```

### Bible API Not Working
```
✅ Follow steps in order (Language → Version → Book → Chapter)
✅ Each step enables the next "Load" button
✅ Check external Bible API availability
✅ Verify internet connection
```

## Browser Console

To see detailed logs:
1. Press **F12** (Windows) or **Cmd+Option+I** (Mac)
2. Click **Console** tab
3. Look for errors in red
4. Network tab shows API calls

## Next Steps

After getting familiar with the dashboard:

1. **Explore All Sections** - Each has unique features
2. **Create Different Resource Types** - Try Jesus, Billy Graham types
3. **Test All Endpoints** - Use API Tester for custom requests
4. **Read Full Docs** - Check `README.md` in `/public/admin/`
5. **Review API Docs** - See `RESOURCES_API.md` for endpoint details

## Development Mode

The dashboard is in development mode:
- No authentication required
- All operations are immediate
- No undo functionality
- Be careful with delete operations!

## Getting Help

1. Check `public/admin/README.md` for detailed documentation
2. Review `RESOURCES_API.md` for API reference
3. Look at browser console for errors
4. Check server logs for backend issues

## Quick Reference - URLs

| Service | URL |
|---------|-----|
| Admin Dashboard | http://localhost:5000/admin |
| Bible Reader | http://localhost:5000/ |
| API Base | http://localhost:5000/api/v4 |
| Resources API | http://localhost:5000/api/v4/resources |
| Bible API | http://localhost:5000/api/v4/bible |

---

**Enjoy your new admin dashboard! 🎉**

For detailed feature documentation, see `/public/admin/README.md`

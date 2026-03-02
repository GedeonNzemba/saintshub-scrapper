# Admin Dashboard UI Documentation

## Overview
A comprehensive web-based admin dashboard for managing all API endpoints of the LifeCheq server. Built with vanilla HTML, CSS, and JavaScript for maximum simplicity and performance.

## Access the Dashboard

Once your server is running, access the admin dashboard at:
```
http://localhost:5000/admin
```

## Features

### 📊 Dashboard Overview
- **Real-time Server Status** - Live connection indicator
- **Statistics Cards** - Total resources, highlights, notes, and Bible languages
- **API Endpoints Overview** - Complete list of available endpoints organized by category

### 📦 Resource Management
Complete CRUD interface for MongoDB resources:
- **List Resources** - Paginated view with 12 resources per page
- **Filter & Search**
  - Filter by resource type (Jesus, Billy Graham, Gordon Lindsay, etc.)
  - Text search across resource names
  - Sort by created date, updated date, or name
  - Ascending/descending order
- **Create Resources** - Modal forms for all 6 resource types
- **View/Edit/Delete** - Quick actions for each resource
- **Pagination** - Navigate through large datasets efficiently

### 📖 Bible API Explorer
Interactive testing interface for Bible API:
1. **Select Language** - Search and choose from available languages
2. **Select Version** - Load Bible versions for chosen language
3. **Select Book** - Browse books in the selected version
4. **Load Chapter** - Enter chapter number and view content
- Sequential workflow ensures proper API usage
- Full chapter display with formatting

### 🎤 Sermon Management
Tools for managing sermon content:
- **Search Sermons** - Full-text search across sermon database
- **Browse by Year** - Get sermons from specific year
- **Filter by Length** - Short, medium, or long sermons
- **Browse by Series** - View sermons organized by series
- Results displayed in readable JSON format

### ✏️ Annotations Management
Manage Bible highlights and notes:

**Highlights Tab:**
- View all highlights with color-coded badges
- Filter by user ID or book
- Create new highlights with color selection
- Delete highlights with confirmation

**Notes Tab:**
- View all notes with full text
- Filter by user ID or book
- Create new notes with rich text
- Delete notes with confirmation

### ☀️ Daily Content
Fetch and preview daily content:
- **Verse of the Day** - With language selection
- **Daily Quote & Verse** - Combined content display
- Formatted preview of API responses

### 🧪 API Endpoint Tester
Generic API testing tool:
- **Select HTTP Method** - GET, POST, PUT, DELETE
- **Enter Endpoint** - Any API path
- **Request Body** - JSON payload editor for POST/PUT
- **Response Viewer**
  - Status code with color coding (success/error)
  - Formatted JSON response
  - Error handling and display

## UI Components

### Navigation
- **Sidebar Navigation** - Fixed sidebar with icon-labeled sections
- **Active State** - Visual indicator for current section
- **Server Status** - Real-time connection status at top of sidebar

### Cards & Forms
- **Stat Cards** - Animated hover effects, icon + number display
- **Resource Cards** - Compact display with type badge and action buttons
- **Modal Forms** - Clean, centered modals for create operations
- **Responsive Grids** - Auto-adjusting layouts for different screen sizes

### Filters & Search
- **Filter Bar** - Compact horizontal layout with multiple inputs
- **Dynamic Forms** - Type-specific fields based on resource type selection
- **Auto-complete** - Browser-native suggestions where applicable

### Data Display
- **Pagination Controls** - Previous/Next + numbered pages
- **Loading States** - Placeholder text during API calls
- **Empty States** - User-friendly messages when no data found
- **Error Handling** - Alert-based notifications for errors

## Technical Details

### File Structure
```
public/admin/
├── index.html      # Main dashboard HTML
├── styles.css      # Complete styling
└── app.js          # All JavaScript functionality
```

### API Integration
All API calls use `fetch()` with:
- Base URL: `http://localhost:5000`
- JSON content-type headers
- Error handling for network failures
- Response status checking

### State Management
- `currentPage` - Tracks pagination state for resources
- `resourcesData` - Cached resource list (optional)
- No external state management libraries needed

### Styling Architecture
CSS Custom Properties (CSS Variables):
```css
--primary-color: #4f46e5     /* Primary actions */
--secondary-color: #64748b   /* Secondary actions */
--success-color: #10b981     /* Success states */
--danger-color: #ef4444      /* Danger/delete actions */
--bg-color: #f8fafc          /* Page background */
--sidebar-bg: #1e293b        /* Sidebar dark theme */
--card-bg: #ffffff           /* Card backgrounds */
```

### Responsive Breakpoints
- **Desktop**: > 768px (full sidebar, multi-column grids)
- **Tablet**: 640px - 768px (compact sidebar, 2-column grids)
- **Mobile**: < 640px (hidden sidebar, single-column layout)

## Usage Guide

### Creating a Resource

1. Click **"➕ Create New Resource"** in Resources section
2. Select resource type from dropdown
3. Enter resource name (required)
4. Add optional category
5. Fill type-specific fields:
   - **Jesus**: JSON arrays for sections, collections, journeys
   - **Banner**: Image URL, link URL, display order
   - *Other types*: Basic fields only
6. Click **"Create Resource"**
7. Resource appears in list immediately

### Testing Bible API

1. Navigate to **Bible API** section
2. Search for language or click **"Load Languages"**
3. Select language from dropdown
4. Click **"Load Versions"**
5. Select Bible version
6. Click **"Load Books"**
7. Select book
8. Enter chapter number
9. Click **"Load Chapter"**
10. Chapter content displays below

### Managing Annotations

**Create Highlight:**
1. Switch to Annotations section
2. Click **"➕ Create Highlight"** on Highlights tab
3. Fill form:
   - User ID
   - Version ID
   - Book (USFM code, e.g., "GEN")
   - Chapter number
   - Verses (e.g., "1-5")
   - Color selection
4. Click **"Create"**

**Create Note:**
1. Switch to Notes tab
2. Click **"➕ Create Note"**
3. Fill similar form with note text field
4. Click **"Create"**

### Using API Tester

1. Navigate to **API Tester** section
2. Select HTTP method (GET/POST/PUT/DELETE)
3. Enter endpoint path (e.g., `/api/v4/resources`)
4. For POST/PUT: Add JSON body
5. Click **"🚀 Send Request"**
6. View response status and body

## Customization

### Changing Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #your-color;
    --sidebar-bg: #your-dark-color;
}
```

### Adding New Sections
1. Add navigation button in sidebar:
```html
<button class="nav-item" data-section="new-section">
    <span class="icon">🆕</span> New Section
</button>
```

2. Add content section:
```html
<section id="new-section" class="content-section">
    <h2>New Section</h2>
    <!-- Your content -->
</section>
```

3. Navigation automatically works via `data-section` attribute

### Adding API Endpoints
Create new function in `app.js`:
```javascript
async function loadNewData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/new-endpoint`);
        const data = await response.json();
        // Display data
    } catch (error) {
        console.error('Error:', error);
    }
}
```

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Required Features:**
- ES6+ JavaScript (async/await, arrow functions)
- CSS Grid & Flexbox
- Fetch API
- CSS Custom Properties

## Performance

- **No Build Step** - Pure HTML/CSS/JS, no compilation needed
- **Minimal Dependencies** - Zero external libraries
- **Fast Loading** - < 100KB total size (HTML + CSS + JS)
- **Efficient Rendering** - Virtual scrolling not needed (pagination used)

## Security Considerations

⚠️ **Development Only** - This dashboard has NO authentication:
- Not suitable for production without auth
- Assume anyone with URL access has full control
- Recommend adding login system before deploying

**Recommendations for Production:**
1. Add JWT authentication
2. Role-based access control (RBAC)
3. HTTPS only
4. Rate limiting on admin routes
5. CSRF protection
6. Input sanitization

## Troubleshooting

### Dashboard not loading
- Check server is running: `npm run dev`
- Verify route is added to `index.ts`
- Check browser console for errors
- Ensure `/admin` path serves static files

### API calls failing
- Check server status indicator (top of sidebar)
- Verify CORS is enabled in server
- Check Network tab in browser DevTools
- Confirm API_BASE_URL matches server port

### Data not displaying
- Open browser console for JavaScript errors
- Check API endpoint returns expected format
- Verify response has `success` field (for resources)
- Ensure data is array/object as expected

### Modals not closing
- Click outside modal to close
- Use X button in modal header
- Check for JavaScript errors preventing event handlers

## Future Enhancements

Planned features:
- [ ] Dark mode toggle
- [ ] Export data to JSON/CSV
- [ ] Bulk operations (multi-select delete)
- [ ] Advanced search with multiple filters
- [ ] Real-time updates (WebSocket integration)
- [ ] User authentication system
- [ ] Activity logs/audit trail
- [ ] Drag-and-drop file uploads
- [ ] Rich text editor for notes
- [ ] Chart visualizations for stats

## Development

To modify the dashboard:

1. **Edit HTML**: `public/admin/index.html`
2. **Edit Styles**: `public/admin/styles.css`
3. **Edit JavaScript**: `public/admin/app.js`
4. **Refresh Browser** - No build step required!

### Debugging Tips
- Use browser DevTools console
- Add `console.log()` in `app.js` functions
- Check Network tab for API calls
- Use React DevTools **NOT** needed (vanilla JS)

## License
Part of the LifeCheq API Server project.

## Support
For issues or questions, check:
1. Browser console for errors
2. Server logs for API errors
3. This documentation for usage examples
4. API documentation in `RESOURCES_API.md`

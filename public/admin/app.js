// Admin Dashboard JavaScript

const API_BASE_URL = 'http://localhost:5000';
let currentPage = 1;
let resourcesData = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    checkServerStatus();
    loadOverviewStats();
    setupFormHandlers();
    
    // Load initial data
    loadResources();
    loadHighlights();
    loadNotes();
});

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Server Status Check
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
            document.getElementById('serverStatus').style.background = '#10b981';
            document.getElementById('serverStatusText').textContent = 'Connected';
        }
    } catch (error) {
        document.getElementById('serverStatus').style.background = '#ef4444';
        document.getElementById('serverStatusText').textContent = 'Disconnected';
    }
}

// Load Overview Stats
async function loadOverviewStats() {
    try {
        // Resources count
        const resourcesRes = await fetch(`${API_BASE_URL}/api/v4/resources?limit=1`);
        const resourcesData = await resourcesRes.json();
        document.getElementById('resourceCount').textContent = resourcesData.metadata?.total || 0;
        
        // Highlights count
        const highlightsRes = await fetch(`${API_BASE_URL}/api/v4/annotations/highlights`);
        const highlightsData = await highlightsRes.json();
        document.getElementById('highlightCount').textContent = Array.isArray(highlightsData) ? highlightsData.length : 0;
        
        // Notes count
        const notesRes = await fetch(`${API_BASE_URL}/api/v4/annotations/notes`);
        const notesData = await notesRes.json();
        document.getElementById('noteCount').textContent = Array.isArray(notesData) ? notesData.length : 0;
        
        // Languages count
        const languagesRes = await fetch(`${API_BASE_URL}/api/v4/bible/languages`);
        const languagesData = await languagesRes.json();
        document.getElementById('languageCount').textContent = Array.isArray(languagesData) ? languagesData.length : 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========== RESOURCES MANAGEMENT ==========

async function loadResources() {
    const typeFilter = document.getElementById('resourceTypeFilter').value;
    const searchQuery = document.getElementById('resourceSearchInput').value;
    const sortBy = document.getElementById('resourceSortBy').value;
    const sortOrder = document.getElementById('resourceSortOrder').value;
    
    const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        ...(typeFilter && { resourceType: typeFilter }),
        ...(searchQuery && { search: searchQuery }),
        sort: sortBy,
        order: sortOrder
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/resources?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayResources(result.data);
            displayPagination(result.metadata);
        } else {
            showError('Failed to load resources');
        }
    } catch (error) {
        console.error('Error loading resources:', error);
        showError('Error loading resources');
    }
}

function displayResources(resources) {
    const container = document.getElementById('resourcesList');
    
    if (resources.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No resources found</p>';
        return;
    }
    
    container.innerHTML = resources.map(resource => `
        <div class="resource-card">
            <div class="resource-header">
                <span class="resource-type-badge">${resource.resourceType}</span>
                <div class="resource-actions">
                    <button class="icon-btn" onclick="viewResource('${resource._id}')" title="View">👁️</button>
                    <button class="icon-btn" onclick="editResource('${resource._id}')" title="Edit">✏️</button>
                    <button class="icon-btn" onclick="deleteResourceConfirm('${resource._id}')" title="Delete">🗑️</button>
                </div>
            </div>
            <h3 class="resource-name">${resource.resourceName}</h3>
            <div class="resource-meta">
                ${resource.category ? `<p>Category: ${resource.category}</p>` : ''}
                <p>Created: ${new Date(resource.createdAt).toLocaleDateString()}</p>
                <p>Updated: ${new Date(resource.updatedAt).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayPagination(metadata) {
    if (!metadata) return;
    
    const container = document.getElementById('resourcesPagination');
    const { page, totalPages } = metadata;
    
    let html = '';
    
    // Previous button
    html += `<button ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button ${page === totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">Next</button>`;
    
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadResources();
}

async function viewResource(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/resources/${id}`);
        const result = await response.json();
        
        if (result.success) {
            alert(JSON.stringify(result.data, null, 2));
        }
    } catch (error) {
        console.error('Error viewing resource:', error);
    }
}

async function deleteResourceConfirm(id) {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/resources/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Resource deleted successfully');
            loadResources();
            loadOverviewStats();
        } else {
            showError('Failed to delete resource');
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        showError('Error deleting resource');
    }
}

function showCreateResourceModal() {
    document.getElementById('createResourceModal').classList.add('active');
}

function updateResourceForm() {
    const resourceType = document.getElementById('newResourceType').value;
    const fieldsContainer = document.getElementById('typeSpecificFields');
    
    let html = '';
    
    if (resourceType === 'Jesus') {
        html = `
            <div class="form-group">
                <label>Sections (JSON Array)</label>
                <textarea id="jesusResourceSections" rows="4" placeholder='[{"sectionName": "Example", "sectionPoster": "url", "videos": []}]'>[]</textarea>
            </div>
            <div class="form-group">
                <label>Collections (JSON Array)</label>
                <textarea id="jesusResourceCollections" rows="4" placeholder='[]'>[]</textarea>
            </div>
            <div class="form-group">
                <label>Journey Templates (JSON Array)</label>
                <textarea id="jesusResourceJourneys" rows="4" placeholder='[]'>[]</textarea>
            </div>
        `;
    } else if (resourceType === 'Banner') {
        html = `
            <div class="form-group">
                <label>Image URL *</label>
                <input type="url" id="bannerImageUrl" required>
            </div>
            <div class="form-group">
                <label>Link URL</label>
                <input type="url" id="bannerLinkUrl">
            </div>
            <div class="form-group">
                <label>Display Order</label>
                <input type="number" id="bannerDisplayOrder" min="0">
            </div>
        `;
    }
    
    fieldsContainer.innerHTML = html;
}

// ========== BIBLE API ==========

async function loadBibleLanguages() {
    const searchQuery = document.getElementById('bibleLanguageSearch').value;
    const params = searchQuery ? `?search=${searchQuery}` : '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/bible/languages${params}`);
        const languages = await response.json();
        
        const select = document.getElementById('bibleLanguageSelect');
        select.innerHTML = languages.map(lang => 
            `<option value="${lang.id}">${lang.name} (${lang.nameLocal})</option>`
        ).join('');
        
        document.getElementById('loadVersionsBtn').disabled = false;
    } catch (error) {
        console.error('Error loading languages:', error);
    }
}

async function loadBibleVersions() {
    const languageId = document.getElementById('bibleLanguageSelect').value;
    if (!languageId) {
        alert('Please select a language first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/bible/versions?languageId=${languageId}`);
        const versions = await response.json();
        
        const select = document.getElementById('bibleVersionSelect');
        select.innerHTML = versions.map(version => 
            `<option value="${version.id}">${version.name} (${version.abbreviation})</option>`
        ).join('');
        
        document.getElementById('loadBooksBtn').disabled = false;
    } catch (error) {
        console.error('Error loading versions:', error);
    }
}

async function loadBibleBooks() {
    const versionId = document.getElementById('bibleVersionSelect').value;
    if (!versionId) {
        alert('Please select a version first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/bible/books?versionId=${versionId}`);
        const books = await response.json();
        
        const select = document.getElementById('bibleBookSelect');
        select.innerHTML = books.map(book => 
            `<option value="${book.id}">${book.name}</option>`
        ).join('');
        
        document.getElementById('loadChapterBtn').disabled = false;
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

async function loadBibleChapter() {
    const versionId = document.getElementById('bibleVersionSelect').value;
    const bookId = document.getElementById('bibleBookSelect').value;
    const chapter = document.getElementById('bibleChapterNumber').value;
    
    if (!versionId || !bookId || !chapter) {
        alert('Please select version, book, and chapter');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/bible/chapter?versionId=${versionId}&bookId=${bookId}&chapterNumber=${chapter}`);
        const data = await response.json();
        
        const display = document.getElementById('bibleContentDisplay');
        display.innerHTML = `
            <h3>${data.book} ${data.chapter}</h3>
            <div>${data.content}</div>
        `;
    } catch (error) {
        console.error('Error loading chapter:', error);
    }
}

// ========== SERMONS ==========

async function searchSermons() {
    const query = document.getElementById('sermonSearchQuery').value;
    if (!query) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v3/search?searchQuery=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        document.getElementById('sermonSearchResults').innerHTML = `
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
    } catch (error) {
        console.error('Error searching sermons:', error);
    }
}

async function getSermonsByYear() {
    const year = document.getElementById('sermonYearInput').value;
    if (!year) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v3/sermons/year/${year}`);
        const data = await response.json();
        
        document.getElementById('sermonYearResults').innerHTML = `
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
    } catch (error) {
        console.error('Error getting sermons by year:', error);
    }
}

// ========== ANNOTATIONS ==========

function switchAnnotationTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.annotation-tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

async function loadHighlights() {
    const userId = document.getElementById('highlightUserFilter')?.value;
    const book = document.getElementById('highlightBookFilter')?.value;
    
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (book) params.append('bookUsfm', book);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/annotations/highlights?${params}`);
        const highlights = await response.json();
        
        const container = document.getElementById('highlightsList');
        
        if (highlights.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No highlights found</p>';
            return;
        }
        
        container.innerHTML = highlights.map(h => `
            <div class="annotation-item">
                <strong>${h.bookUsfm} ${h.chapter}:${h.verses}</strong>
                <p>Color: <span style="background: ${h.color}; padding: 2px 8px; border-radius: 4px;">${h.color}</span></p>
                <p>User: ${h.userId}</p>
                <div class="resource-actions">
                    <button class="btn btn-danger" onclick="deleteHighlight('${h.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading highlights:', error);
    }
}

async function loadNotes() {
    const userId = document.getElementById('noteUserFilter')?.value;
    const book = document.getElementById('noteBookFilter')?.value;
    
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (book) params.append('bookUsfm', book);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/annotations/notes?${params}`);
        const notes = await response.json();
        
        const container = document.getElementById('notesList');
        
        if (notes.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No notes found</p>';
            return;
        }
        
        container.innerHTML = notes.map(n => `
            <div class="annotation-item">
                <strong>${n.bookUsfm} ${n.chapter}:${n.verses}</strong>
                <p>${n.text}</p>
                <p>User: ${n.userId}</p>
                <div class="resource-actions">
                    <button class="btn btn-danger" onclick="deleteNote('${n.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

function showCreateHighlightModal() {
    document.getElementById('createHighlightModal').classList.add('active');
}

function showCreateNoteModal() {
    document.getElementById('createNoteModal').classList.add('active');
}

async function deleteHighlight(id) {
    if (!confirm('Delete this highlight?')) return;
    
    try {
        await fetch(`${API_BASE_URL}/api/v4/annotations/highlights/${id}`, { method: 'DELETE' });
        loadHighlights();
        loadOverviewStats();
    } catch (error) {
        console.error('Error deleting highlight:', error);
    }
}

async function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    
    try {
        await fetch(`${API_BASE_URL}/api/v4/annotations/notes/${id}`, { method: 'DELETE' });
        loadNotes();
        loadOverviewStats();
    } catch (error) {
        console.error('Error deleting note:', error);
    }
}

// ========== DAILY CONTENT ==========

async function loadVerseOfTheDay() {
    const language = document.getElementById('verseLanguageSelect').value;
    const params = language ? `?language=${language}` : '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/verse-of-the-day${params}`);
        const data = await response.json();
        
        document.getElementById('verseOfTheDayDisplay').innerHTML = `
            <h4>${data.reference || 'Verse of the Day'}</h4>
            <p>${data.text || JSON.stringify(data, null, 2)}</p>
        `;
    } catch (error) {
        console.error('Error loading verse:', error);
    }
}

async function loadDailyContent() {
    const language = document.getElementById('dailyContentLanguageSelect').value;
    const params = language ? `?language=${language}` : '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v4/daily-content${params}`);
        const data = await response.json();
        
        document.getElementById('dailyContentDisplay').innerHTML = `
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
    } catch (error) {
        console.error('Error loading daily content:', error);
    }
}

// ========== API TESTER ==========

async function testApiEndpoint() {
    const method = document.getElementById('testMethod').value;
    const endpoint = document.getElementById('testEndpoint').value;
    const body = document.getElementById('testRequestBody').value;
    
    const statusDiv = document.getElementById('responseStatus');
    const bodyDiv = document.getElementById('responseBody');
    
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (method !== 'GET' && body) {
            options.body = body;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        statusDiv.className = 'response-status ' + (response.ok ? 'success' : 'error');
        statusDiv.textContent = `Status: ${response.status} ${response.statusText}`;
        bodyDiv.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        statusDiv.className = 'response-status error';
        statusDiv.textContent = 'Error: Request failed';
        bodyDiv.textContent = error.message;
    }
}

// ========== FORM HANDLERS ==========

function setupFormHandlers() {
    // Create Resource Form
    document.getElementById('createResourceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const resourceType = document.getElementById('newResourceType').value;
        const resourceName = document.getElementById('newResourceName').value;
        const category = document.getElementById('newResourceCategory').value;
        
        let payload = {
            resourceType,
            resourceName,
            ...(category && { category })
        };
        
        // Add type-specific fields
        if (resourceType === 'Jesus') {
            try {
                payload.sections = JSON.parse(document.getElementById('jesusResourceSections').value || '[]');
                payload.collections = JSON.parse(document.getElementById('jesusResourceCollections').value || '[]');
                payload.journeyTemplates = JSON.parse(document.getElementById('jesusResourceJourneys').value || '[]');
            } catch (error) {
                alert('Invalid JSON in sections/collections/journeys');
                return;
            }
        } else if (resourceType === 'Banner') {
            payload.imageUrl = document.getElementById('bannerImageUrl').value;
            payload.linkUrl = document.getElementById('bannerLinkUrl').value;
            payload.displayOrder = parseInt(document.getElementById('bannerDisplayOrder').value) || 0;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/v4/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('Resource created successfully');
                closeModal('createResourceModal');
                loadResources();
                loadOverviewStats();
                document.getElementById('createResourceForm').reset();
            } else {
                showError(result.error?.message || 'Failed to create resource');
            }
        } catch (error) {
            console.error('Error creating resource:', error);
            showError('Error creating resource');
        }
    });
    
    // Create Highlight Form
    document.getElementById('createHighlightForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            userId: document.getElementById('newHighlightUserId').value,
            versionId: document.getElementById('newHighlightVersionId').value,
            bookUsfm: document.getElementById('newHighlightBook').value,
            chapter: parseInt(document.getElementById('newHighlightChapter').value),
            verses: document.getElementById('newHighlightVerses').value,
            color: document.getElementById('newHighlightColor').value
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/v4/annotations/highlights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                showSuccess('Highlight created successfully');
                closeModal('createHighlightModal');
                loadHighlights();
                loadOverviewStats();
                document.getElementById('createHighlightForm').reset();
            } else {
                showError('Failed to create highlight');
            }
        } catch (error) {
            console.error('Error creating highlight:', error);
            showError('Error creating highlight');
        }
    });
    
    // Create Note Form
    document.getElementById('createNoteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            userId: document.getElementById('newNoteUserId').value,
            versionId: document.getElementById('newNoteVersionId').value,
            bookUsfm: document.getElementById('newNoteBook').value,
            chapter: parseInt(document.getElementById('newNoteChapter').value),
            verses: document.getElementById('newNoteVerses').value,
            text: document.getElementById('newNoteText').value
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/v4/annotations/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                showSuccess('Note created successfully');
                closeModal('createNoteModal');
                loadNotes();
                loadOverviewStats();
                document.getElementById('createNoteForm').reset();
            } else {
                showError('Failed to create note');
            }
        } catch (error) {
            console.error('Error creating note:', error);
            showError('Error creating note');
        }
    });
}

// ========== UTILITY FUNCTIONS ==========

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

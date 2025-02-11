const addSectionForm = document.getElementById('addSectionForm');
const addLinkForm = document.getElementById('addLinkForm');
const linkList = document.getElementById('linkList');
const favoritesList = document.getElementById('favoritesList');
const searchInput = document.getElementById('searchInput');
const existingSections = document.getElementById('existingSections');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const undoBtn = document.getElementById('undoBtn');
const importInput = document.getElementById('importInput');
const todoListBtn = document.getElementById('todoListBtn');
const settingsBtn = document.getElementById('settingsBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const themeColorBtn = document.getElementById('themeColorBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');

// State management
let links;
let history = [];
let username;
let debounceTimer;

// Utility functions for input sanitization
const sanitizeInput = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const validateUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Initialize application state from localStorage with error handling
const initializeState = () => {
    try {
        links = JSON.parse(localStorage.getItem('links')) || {};
        // Validate and sanitize existing data
        for (const section in links) {
            links[section] = links[section].map(link => ({
                name: sanitizeInput(link.name),
                url: validateUrl(link.url) ? link.url : '#',
                favorite: !!link.favorite
            }));
        }
    } catch (e) {
        console.error('Error parsing links from localStorage:', e);
        links = {};
    }
    
    try {
        username = sanitizeInput(localStorage.getItem('username')) || 'User';
    } catch (e) {
        console.error('Error getting username from localStorage:', e);
        username = 'User';
    }
};

// Initialize application state
const initializeApp = () => {
    initializeState();
};

function updateTitle() {
    document.title = `${username}'s Dashboard`;
    document.querySelector('h1').textContent = `${username}'s Dashboard`;
}

function changeUsername() {
    const newUsername = prompt('Enter your name:', username);
    if (newUsername && newUsername.trim()) {
        username = newUsername.trim();
        localStorage.setItem('username', username);
        updateTitle();
    }
}

// Debounced save state function for better performance
function saveState() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        try {
            history.push(JSON.stringify(links));
            localStorage.setItem('links', JSON.stringify(links));
            undoBtn.classList.add('active');
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            alert('Failed to save changes. Please ensure you have enough storage space.');
        }
    }, 300);
}

function updateSectionDropdown() {
    existingSections.innerHTML = '<option value="">Select section</option>';
    for (const section in links) {
        existingSections.innerHTML += `<option value="${section}">${section}</option>`;
    }
}

function renderLinks(filter = '') {
    linkList.innerHTML = '';
    favoritesList.innerHTML = '';

    for (const section in links) {
        const filteredLinks = links[section].filter(link => 
            link.name.toLowerCase().includes(filter.toLowerCase()) ||
            link.url.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredLinks.length === 0) continue;

        const sectionElement = document.createElement('div');
        sectionElement.className = 'section';
        sectionElement.dataset.section = section;
        sectionElement.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">${section}</h2>
                <div class="section-actions">
                    <button class="section-btn edit-section-btn" title="Edit Section">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="section-btn delete-section-btn" title="Delete Section">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        const linkListElement = document.createElement('div');
        linkListElement.className = 'link-list';
        sectionElement.appendChild(linkListElement);

        filteredLinks.forEach((link, index) => {
            const linkElement = createLinkElement(link, section, index);
            linkListElement.appendChild(linkElement);

            if (link.favorite) {
                const favoriteLinkElement = createLinkElement(link, section, index, true);
                favoritesList.appendChild(favoriteLinkElement);
            }
        });

        linkList.appendChild(sectionElement);

        new Sortable(linkListElement, {
            animation: 150,
            ghostClass: 'dragging',
            group: 'shared',
            onEnd: (evt) => {
                const fromSection = evt.from.closest('.section').dataset.section;
                const toSection = evt.to.closest('.section').dataset.section;
                const { oldIndex, newIndex } = evt;

                if (fromSection === toSection) {
                    // Reorder within the same section
                    const movedLink = links[fromSection].splice(oldIndex, 1)[0];
                    links[fromSection].splice(newIndex, 0, movedLink);
                } else {
                    // Move between sections
                    const movedLink = links[fromSection].splice(oldIndex, 1)[0];
                    if (!links[toSection]) {
                        links[toSection] = [];
                    }
                    links[toSection].splice(newIndex, 0, movedLink);
                }
                saveState();
                renderLinks(); // Re-render to update favorites
            }
        });
    }

    new Sortable(linkList, {
        animation: 150,
        ghostClass: 'dragging',
        onEnd: (evt) => {
            const { oldIndex, newIndex } = evt;
            const sections = Object.keys(links);
            const movedSection = sections.splice(oldIndex, 1)[0];
            sections.splice(newIndex, 0, movedSection);
            const newLinks = {};
            sections.forEach(section => {
                newLinks[section] = links[section];
            });
            links = newLinks;
            saveState();
        }
    });

    new Sortable(favoritesList, {
        animation: 150,
        ghostClass: 'dragging',
    });
}

function createLinkElement(link, section, index, isFavorite = false) {
    const linkElement = document.createElement('div');
    linkElement.className = 'link-item';
    linkElement.dataset.section = section;
    linkElement.dataset.index = index;
    linkElement.innerHTML = `
        <a href="${link.url}" target="_blank">
            <i class="fas fa-link"></i> ${link.name}
        </a>
        <div class="btn-container">
            <button class="btn favorite-btn ${link.favorite ? 'favorited' : ''}" title="${link.favorite ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="fas fa-star"></i>
            </button>
            <button class="btn edit-btn" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn delete-btn" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return linkElement;
}

function addSection(event) {
    event.preventDefault();
    try {
        const newSectionName = document.getElementById('newSectionName').value.trim();
        
        // Input validation
        if (!newSectionName.match(/^[A-Za-z0-9\s\-_]+$/)) {
            alert('Section name can only contain letters, numbers, spaces, hyphens and underscores');
            return;
        }
        
        if (newSectionName && !links[newSectionName]) {
            links[newSectionName] = [];
            saveState();
            updateSectionDropdown();
            renderLinks();
            addSectionForm.reset();
        } else {
            alert('Section already exists or invalid name');
        }
    } catch (e) {
        console.error('Error adding section:', e);
        alert('Failed to add section. Please try again.');
    }
}

function addLink(event) {
    event.preventDefault();
    try {
        const name = sanitizeInput(document.getElementById('linkName').value.trim());
        let url = document.getElementById('linkUrl').value.trim();
        const section = existingSections.value;

        // Input validation
        if (!name.match(/^[A-Za-z0-9\s\-_]+$/)) {
            alert('Link name can only contain letters, numbers, spaces, hyphens and underscores');
            return;
        }

        if (!section) {
            alert('Please select a section');
            return;
        }

        // URL validation and normalization
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        if (!validateUrl(url)) {
            alert('Please enter a valid URL');
            return;
        }

        if (!links[section]) {
            links[section] = [];
        }

        // Check for duplicate links in the section
        if (links[section].some(link => link.url === url)) {
            alert('This URL already exists in the selected section');
            return;
        }

        links[section].push({ name, url, favorite: false });
        saveState();
        renderLinks();
        addLinkForm.reset();
    } catch (e) {
        console.error('Error adding link:', e);
        alert('Failed to add link. Please try again.');
    }
}

function editLink(section, index) {
    const link = links[section][index];
    const newName = prompt('Enter new name:', link.name);
    let newUrl = prompt('Enter new URL:', link.url);
    
    if (newName && newUrl) {
        if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
            newUrl = 'https://' + newUrl;
        }
        links[section][index] = { ...link, name: newName, url: newUrl };
        saveState();
        renderLinks();
    }
}

function deleteLink(section, index) {
    if (confirm('Are you sure you want to delete this link?')) {
        links[section].splice(index, 1);
        if (links[section].length === 0) {
            delete links[section];
        }
        saveState();
        renderLinks();
        updateSectionDropdown();
    }
}

function toggleFavorite(section, index) {
    links[section][index].favorite = !links[section][index].favorite;
    saveState();
    renderLinks();
}

function deleteSection(section) {
    if (links[section] && links[section].length > 0) {
        alert('Cannot delete a section that contains links. Please remove all links from this section first.');
    } else if (confirm(`Are you sure you want to delete the section "${section}"?`)) {
        delete links[section];
        saveState();
        renderLinks();
        updateSectionDropdown();
    }
}

function editSection(section) {
    const newName = prompt('Enter new section name:', section);
    if (newName && newName !== section) {
        links[newName] = links[section];
        delete links[section];
        saveState();
        renderLinks();
        updateSectionDropdown();
    }
}

function importBookmarks() {
    importInput.click();
}

async function exportBookmarks() {
    try {
        // Collect application data
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                bookmarks: links,
                settings: {
                    username: username,
                    theme: localStorage.getItem('theme') || 'light',
                    primaryColor: localStorage.getItem('primaryColor') || '#4f46e5'
                }
            }
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "dashboard_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (e) {
        console.error('[Export Debug] Error exporting data:', e);
        alert('Failed to export data. Please try again.');
    }
}

// Add error boundary
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    alert('An error occurred. Please refresh the page and try again.');
});

// Add periodic state backup
setInterval(() => {
    try {
        const backup = JSON.stringify(links);
        localStorage.setItem('links_backup', backup);
    } catch (e) {
        console.error('Error creating backup:', e);
    }
}, 5 * 60 * 1000); // Every 5 minutes

function handleImport(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate imported data structure
                if (!importedData.data) {
                    // Handle legacy format (just bookmarks)
                    links = importedData;
                    saveState();
                    updateSectionDropdown();
                    renderLinks();
                    return;
                }

                // Import bookmarks and settings
                if (importedData.data.bookmarks) {
                    links = importedData.data.bookmarks;
                    saveState();
                    updateSectionDropdown();
                    renderLinks();
                }

                // Import settings
                if (importedData.data.settings) {
                    const settings = importedData.data.settings;
                    
                    // Update username
                    if (settings.username) {
                        username = settings.username;
                        localStorage.setItem('username', username);
                        updateTitle();
                    }

                    // Update theme settings
                    if (settings.theme) {
                        localStorage.setItem('theme', settings.theme);
                    }
                    if (settings.primaryColor) {
                        localStorage.setItem('primaryColor', settings.primaryColor);
                    }

                    // Sync theme changes
                    if (typeof themeManager !== 'undefined') {
                        themeManager.syncThemeSettings();
                    }
                }

                alert('Import completed successfully!');
            } catch (error) {
                console.error('Error parsing imported file:', error);
                alert('Invalid file format. Please upload a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }
}

function undo() {
    if (history.length > 1) {
        history.pop(); // Remove current state
        links = JSON.parse(history[history.length - 1]);
        localStorage.setItem('links', JSON.stringify(links));
        updateSectionDropdown();
        renderLinks();
    }
    if (history.length <= 1) {
        undoBtn.classList.remove('active');
    }
}

function initializePage() {
    updateSectionDropdown();
    renderLinks();
    updateTitle();
}

// Event Delegation for link and section actions
document.addEventListener('click', (e) => {
    const linkItem = e.target.closest('.link-item');
    const sectionHeader = e.target.closest('.section-header');
    
    if (linkItem) {
        const section = linkItem.dataset.section;
        const index = parseInt(linkItem.dataset.index);
        
        if (e.target.closest('.favorite-btn')) {
            toggleFavorite(section, index);
        } else if (e.target.closest('.edit-btn')) {
            editLink(section, index);
        } else if (e.target.closest('.delete-btn')) {
            deleteLink(section, index);
        }
    } else if (sectionHeader) {
        const section = sectionHeader.closest('.section').dataset.section;
        
        if (e.target.closest('.edit-section-btn')) {
            editSection(section);
        } else if (e.target.closest('.delete-section-btn')) {
            deleteSection(section);
        }
    }
});

addSectionForm.addEventListener('submit', addSection);
addLinkForm.addEventListener('submit', addLink);
searchInput.addEventListener('input', (e) => renderLinks(e.target.value));
importBtn.addEventListener('click', importBookmarks);
exportBtn.addEventListener('click', () => {
    exportBookmarks();
});
undoBtn.addEventListener('click', undo);
importInput.addEventListener('change', handleImport);
todoListBtn.addEventListener('click', () => {
    window.location.href = 'todo.html';
});
darkModeBtn.addEventListener('click', () => themeManager.toggleDarkMode());
themeColorBtn.addEventListener('click', () => themeManager.changeThemeColor());
settingsBtn.addEventListener('click', changeUsername);
clearStorageBtn.addEventListener('click', () => {
    const userInput = prompt('Type "delete" to confirm clearing all data:');
    if (userInput === 'delete') {
        localStorage.clear();
        alert('Local storage has been cleared.');
        location.reload();
    } else {
        alert('Confirmation failed. Local storage was not cleared.');
    }
});

const helpBtn = document.getElementById('helpBtn');
helpBtn.addEventListener('click', () => {
    window.location.href = 'help.html';
});

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializePage();
});

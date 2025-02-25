const addSectionForm = document.getElementById('addSectionForm');
const addLinkForm = document.getElementById('addLinkForm');
const linkList = document.getElementById('linkList');
const favoritesList = document.getElementById('favoritesList');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
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

// Custom modal dialog functions
function showModal(title, message, yesCallback, noCallback) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalYes = document.getElementById('modalYes');
    const modalNo = document.getElementById('modalNo');
    
    modalTitle.textContent = title;
    
    // Sanitize the message first, then replace newlines with <br> tags
    const sanitized = sanitizeInput(message);
    modalMessage.innerHTML = sanitized.replace(/\n/g, '<br>');
    
    // Remove any existing event listeners
    const newYesBtn = modalYes.cloneNode(true);
    const newNoBtn = modalNo.cloneNode(true);
    modalYes.parentNode.replaceChild(newYesBtn, modalYes);
    modalNo.parentNode.replaceChild(newNoBtn, modalNo);
    
    // Add new event listeners
    newYesBtn.addEventListener('click', () => {
        hideModal();
        if (yesCallback) yesCallback();
    });
    
    newNoBtn.addEventListener('click', () => {
        hideModal();
        if (noCallback) noCallback();
    });
    
    // Handle Escape key to close the modal
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            hideModal();
            if (noCallback) noCallback();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Handle Enter key to trigger Yes button only if we're not in an input field
    const handleEnter = (e) => {
        // Don't trigger on input fields, textareas, etc.
        if (e.key === 'Enter' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            hideModal();
            if (yesCallback) yesCallback();
            document.removeEventListener('keydown', handleEnter);
        }
    };
    document.addEventListener('keydown', handleEnter);
    
        // Store references to event handlers for proper cleanup
    window.modalKeyHandlers = {
        escape: handleEscape,
        enter: handleEnter
    };
    
    // Show the modal with a slight delay to prevent flash during page transitions
    setTimeout(() => {
        modal.style.display = 'block';
        
        // Set focus to the No button for better keyboard navigation
        // (so users don't accidentally confirm destructive actions)
        setTimeout(() => newNoBtn.focus(), 50);
    }, 10);
}

function hideModal() {
    const modal = document.getElementById('customModal');
    modal.style.display = 'none';
    
    // Remove keyboard event listeners when closing
    if (window.modalKeyHandlers) {
        document.removeEventListener('keydown', window.modalKeyHandlers.escape);
        document.removeEventListener('keydown', window.modalKeyHandlers.enter);
        window.modalKeyHandlers = null;
    }
}

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
            // Auto-export on every save
            exportBookmarks(true).catch(e => {
                console.error('Auto-export failed:', e);
            });
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
    showModal(
        'Delete Link',
        'Are you sure you want to delete this link?',
        // Yes callback
        () => {
            links[section].splice(index, 1);
            if (links[section].length === 0) {
                delete links[section];
            }
            saveState();
            renderLinks();
            updateSectionDropdown();
        },
        // No callback
        () => {
            // Do nothing
        }
    );
}

function toggleFavorite(section, index) {
    links[section][index].favorite = !links[section][index].favorite;
    saveState();
    renderLinks();
}

function deleteSection(section) {
    if (links[section] && links[section].length > 0) {
        alert('Cannot delete a section that contains links. Please remove all links from this section first.');
    } else {
        showModal(
            'Delete Section',
            `Are you sure you want to delete the section "${section}"?`,
            // Yes callback
            () => {
                delete links[section];
                saveState();
                renderLinks();
                updateSectionDropdown();
            },
            // No callback
            () => {
                // Do nothing
            }
        );
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

async function exportBookmarks(silent = true) {
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
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadAnchorNode.setAttribute("download", `dashboard_backup_${timestamp}.json`);
        
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        // Update last export timestamp
        localStorage.setItem('lastExportTimestamp', new Date().getTime().toString());
        
        if (!silent) {
            alert('Export completed successfully!');
        }
    } catch (e) {
        console.error('[Export Debug] Error exporting data:', e);
        if (!silent) {
            alert('Failed to export data. Please try again.');
        }
        throw e;
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
    
    // Initialize clear search button visibility
    if (searchInput.value) {
        clearSearchBtn.classList.add('visible');
    }
}

// Function to show import reminder
function showImportReminder() {
    // Check if we've already shown the reminder in this browser session
    const hasShownReminder = sessionStorage.getItem('importReminderShown');
    
    // Only show the reminder if we haven't shown it yet and either there's no export timestamp
    // or the links object is empty
    const lastExport = localStorage.getItem('lastExportTimestamp');
    if (!hasShownReminder && (!lastExport || !links || Object.keys(links).length === 0)) {
        // Mark that we've shown the reminder (using sessionStorage instead of localStorage)
        // This will persist across page navigations but reset when the browser is closed
        sessionStorage.setItem('importReminderShown', 'true');
        
        showModal(
            'Import Data',
            'Would you like to import your previously exported dashboard data?\n\n' +
            'Note: Due to browser cache clearing policies, it is recommended to:\n' +
            '1. Export your data regularly\n' +
            '2. Create a dedicated folder on your computer (e.g., "Dashboard Backups") to store exports\n' +
            '3. Exports are saved to your browser\'s default downloads folder\n' +
            '4. Move exported files from downloads to your backup folder\n' +
            '5. Import your data when you start your browser\n\n' +
            'Click "Yes" to open the file browser or "No" to continue.',
            // Yes callback
            () => {
                importBookmarks();
            },
            // No callback
            () => {
                // Do nothing
            }
        );
    }
}

// Function to show export reminder
function showExportReminder() {
    const lastExport = localStorage.getItem('lastExportTimestamp');
    const now = new Date().getTime();
    const hoursSinceLastExport = lastExport ? (now - parseInt(lastExport)) / (1000 * 60 * 60) : 24;
    
    if (hoursSinceLastExport >= 1) { // Show reminder if last export was more than 1 hour ago
        showModal(
            'Export Data',
            'Remember to export your dashboard data regularly to prevent data loss.\n\n' +
            'Note: Export files will be saved to your browser\'s downloads folder.\n' +
            'Please move them to a dedicated backup folder for safekeeping.\n\n' +
            'Click "Yes" to download your data or "No" to skip.',
            // Yes callback
            () => {
                exportBookmarks(false); // false for non-silent export
            },
            // No callback
            () => {
                // Do nothing
            }
        );
    }
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
// Handle search input changes
searchInput.addEventListener('input', (e) => {
    const searchValue = e.target.value;
    renderLinks(searchValue);
    
    // Toggle visibility of clear button based on input content
    if (searchValue) {
        clearSearchBtn.classList.add('visible');
    } else {
        clearSearchBtn.classList.remove('visible');
    }
});

// Add keyboard support for escape key to clear search
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchInput.value) {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        renderLinks('');
        e.preventDefault(); // Prevent the event from bubbling
    }
});

// Handle clear button click
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.remove('visible');
    renderLinks(''); // Reset search results
    searchInput.focus(); // Return focus to search input
});
importBtn.addEventListener('click', importBookmarks);
exportBtn.addEventListener('click', () => {
    exportBookmarks(false); // false for non-silent export
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
    showModal(
        'Clear All Data',
        'Are you sure you want to clear all dashboard data? This action cannot be undone.',
        // Yes callback
        () => {
            localStorage.clear();
            alert('Local storage has been cleared.');
            location.reload();
        },
        // No callback
        () => {
            // Do nothing
        }
    );
});

const helpBtn = document.getElementById('helpBtn');
helpBtn.addEventListener('click', () => {
    window.location.href = 'help.html';
});

// Initialize modal state when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Make sure modal is hidden initially by forcing display: none
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    initializeApp();
    initializePage();
    
    // Only show import reminder after a short delay to prevent flashing during navigation
    setTimeout(() => {
        showImportReminder();
    }, 100);
    
    // Show export reminder when user is about to leave
    window.addEventListener('beforeunload', () => {
        showExportReminder();
    });
    
    // Set up periodic export reminders
    setInterval(showExportReminder, 60 * 60 * 1000); // Check every hour
});

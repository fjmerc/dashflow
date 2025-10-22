const addSectionForm = document.getElementById('addSectionForm');
const addLinkForm = document.getElementById('addLinkForm');
const linkList = document.getElementById('linkList');
const favoritesList = document.getElementById('favoritesList');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const existingSections = document.getElementById('existingSections');
const importBtn = document.getElementById('importBtn');
const exportAllBtn = document.getElementById('exportAllBtn');
const undoBtn = document.getElementById('undoBtn');
const importInput = document.getElementById('importInput');
const todoListBtn = document.getElementById('todoListBtn');
const retirementTimerBtn = document.getElementById('retirementTimerBtn');
const settingsBtn = document.getElementById('settingsBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const themeColorBtn = document.getElementById('themeColorBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');
const backupSettingsBtn = document.getElementById('backupSettingsBtn');

// State management
let links;
let history = [];
let username;
let debounceTimer;
let searchDebounceTimer;

// Enhanced utility functions for input sanitization
const sanitizeInput = (str) => {
    // Use the enhanced validator if available, fallback to basic sanitization
    if (window.validateAndSanitize && window.validateAndSanitize.html) {
        return window.validateAndSanitize.html(str);
    }

    // Fallback sanitization
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const validateUrl = (url) => {
    // Use enhanced validator if available
    if (window.validateAndSanitize && window.validateAndSanitize.url) {
        return window.validateAndSanitize.url(url);
    }

    // Fallback validation
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
        Logger.error('Error parsing links from localStorage:', e);
        links = {};
    }

    try {
        username = sanitizeInput(localStorage.getItem('username')) || 'User';
    } catch (e) {
        Logger.error('Error getting username from localStorage:', e);
        username = 'User';
    }
};

// Initialize application state
const initializeApp = () => {
    initializeState();
};

// Custom modal dialog functions
// Modal showModal function now provided by modal-manager.js

// Modal hideModal function now provided by modal-manager.js

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
            // Auto-export disabled - uncomment to enable
            // exportBookmarks(true).catch(e => {
            //     console.error('Auto-export failed:', e);
            // });
        } catch (e) {
            Logger.error('Error saving to localStorage:', e);
            if (window.errorHandler) {
                window.errorHandler.handleError(e, 'storage', {
                    operation: 'save_links',
                    dataSize: JSON.stringify(links).length
                });
            } else {
                alert('Failed to save changes. Please ensure you have enough storage space.');
            }
        }
    }, 300);
}

function updateSectionDropdown() {
    existingSections.innerHTML = '<option value="">Select section</option>';

    // Get section names and sort them alphabetically
    const sortedSections = Object.keys(links).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Add sorted sections to dropdown
    sortedSections.forEach(section => {
        existingSections.innerHTML += `<option value="${section}">${section}</option>`;
    });
}

function renderLinks(filter = '') {
    linkList.innerHTML = '';
    favoritesList.innerHTML = '';

    // Sort sections alphabetically
    const sortedSections = Object.keys(links).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    );

    for (const section of sortedSections) {
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
        draggable: '.section',  // Only allow dragging sections
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

    // Make retirement timer container draggable
    const retirementContainer = document.getElementById('retirementTimerContainer');
    if (retirementContainer) {
        retirementContainer.addEventListener('mousedown', function(e) {
            // Only trigger dragging from the header, not the content
            if (e.target.closest('.section-header')) {
                e.stopPropagation();
            }
        });
    }

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
        Logger.error('Error adding section:', e);
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
        Logger.error('Error adding link:', e);
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
        Logger.error('Error exporting data:', e);
        if (!silent) {
            alert('Failed to export data. Please try again.');
        }
        throw e;
    }
}

// Add error boundary
window.addEventListener('error', function(event) {
    Logger.error('Global error caught:', event.error);
    alert('An error occurred. Please refresh the page and try again.');
});

// Add periodic state backup
setInterval(() => {
    try {
        const backup = JSON.stringify(links);
        localStorage.setItem('links_backup', backup);
    } catch (e) {
        Logger.error('Error creating backup:', e);
    }
}, 5 * 60 * 1000); // Every 5 minutes

function handleImport(event) {
    const file = event.target.files[0];
    if (file) {
        const fileName = file.name.toLowerCase();

        // Determine import type based on file extension
        if (fileName.endsWith('.json')) {
            // Handle JSON dashboard data import
            importAllData(file)
                .then(() => {
                    Logger.debug('Dashboard data import completed successfully');
                })
                .catch(error => {
                    Logger.error('Error importing dashboard data:', error);
                    alert('Failed to import dashboard data: ' + error.message);
                });
        } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
            // Handle HTML bookmark import
            importBrowserBookmarks(file)
                .then(() => {
                    Logger.debug('Browser bookmark import completed successfully');
                })
                .catch(error => {
                    Logger.error('Error importing browser bookmarks:', error);
                    alert('Failed to import bookmarks: ' + error.message);
                });
        } else {
            // Unknown file type
            alert('Unsupported file type. Please select a JSON file (dashboard data) or HTML file (browser bookmarks).');
            Logger.warn('Unsupported file type selected:', fileName);
        }
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
                exportAllData(false); // Use exportAllData instead of exportBookmarks
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

    // Debounce search to improve performance
    clearTimeout(searchDebounceTimer);

    // Toggle visibility of clear button immediately for better UX
    if (searchValue) {
        clearSearchBtn.classList.add('visible');
    } else {
        clearSearchBtn.classList.remove('visible');
    }

    // Debounce the actual rendering
    searchDebounceTimer = setTimeout(() => {
        renderLinks(searchValue);
    }, 300); // Wait 300ms after user stops typing
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
exportAllBtn.addEventListener('click', () => {
    exportAllData(false); // false for non-silent export
});
undoBtn.addEventListener('click', undo);
importInput.addEventListener('change', handleImport);
todoListBtn.addEventListener('click', () => {
    window.location.href = 'todo.html';
});

retirementTimerBtn.addEventListener('click', () => {
    const timerContainer = document.getElementById('retirementTimerContainer');
    const linkList = document.getElementById('linkList');

    if (timerContainer.style.display === 'none') {
        // Show the timer section
        timerContainer.style.display = 'block';
        retirementTimerBtn.title = 'Hide Retirement Timer';
        retirementTimerBtn.innerHTML = '<i class="fas fa-hourglass-half" style="color: var(--primary-color);"></i>';

        // Move timer container to be part of the section layout
        // If sections exist, insert before the first one
        const firstSection = linkList.querySelector('.section');
        if (firstSection) {
            linkList.insertBefore(timerContainer, firstSection);
        } else {
            // If no sections exist, append to link list
            linkList.appendChild(timerContainer);
        }

        // Add sortable functionality
        if (!timerContainer.querySelector('.retirement-content.sortable-initialized')) {
            // Mark as initialized to avoid duplicating
            timerContainer.querySelector('.retirement-content').classList.add('sortable-initialized');
        }

        // Scroll to the timer container
        window.scrollTo({
            top: timerContainer.offsetTop - 20,
            behavior: 'smooth'
        });
    } else {
        // Hide the timer section
        timerContainer.style.display = 'none';
        retirementTimerBtn.title = 'Show Retirement Timer';
        retirementTimerBtn.innerHTML = '<i class="fas fa-hourglass-half"></i>';

        // Remove from DOM flow to prevent empty space
        if (timerContainer.parentNode === linkList) {
            linkList.removeChild(timerContainer);
            document.querySelector('main').appendChild(timerContainer); // Store in main but hidden
        }
    }
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

if (backupSettingsBtn) {
    backupSettingsBtn.addEventListener('click', () => {
        if (typeof showBackupSettings === 'function') {
            showBackupSettings();
        }
    });
}

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

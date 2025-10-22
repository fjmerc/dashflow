// Utility functions for exporting dashboard data

/**
 * Export all application data (dashboard and todos) in a single file
 * @param {boolean} silent - Whether to show a success message
 * @returns {Promise<void>}
 */
async function exportAllData(silent = false) {
    try {
        // Get dashboard data
        const dashboardData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                bookmarks: JSON.parse(localStorage.getItem('links') || '{}'),
                settings: {
                    username: localStorage.getItem('username') || 'User',
                    theme: localStorage.getItem('theme') || 'light',
                    primaryColor: localStorage.getItem('primaryColor') || '#4f46e5'
                }
            }
        };

        // Get todo data
        const todoData = JSON.parse(localStorage.getItem('todos') || '[]');

        // Get retirement timer data
        const retirementTimerData = JSON.parse(localStorage.getItem('retirementTimer') || 'null');

        // Combine data
        const exportData = {
            version: '1.2', // Increment version to indicate retirement timer support
            timestamp: new Date().toISOString(),
            data: {
                bookmarks: dashboardData.data.bookmarks,
                todos: todoData,
                settings: dashboardData.data.settings,
                retirementTimer: retirementTimerData
            }
        };

        // Create and trigger download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadAnchorNode.setAttribute("download", `dashboard_complete_backup_${timestamp}.json`);

        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Update last export timestamp
        localStorage.setItem('lastExportTimestamp', new Date().getTime().toString());

        if (!silent) {
            alert('Complete export (dashboard and todos) completed successfully!');
        }

        return true;
    } catch (e) {
        Logger.error('Error exporting combined data:', e);
        if (!silent) {
            alert('Failed to export data. Please try again.');
        }
        throw e;
    }
}

/**
 * Import all application data (dashboard and todos) from a single file
 * @param {File} file - The file to import
 * @returns {Promise<boolean>} - Whether the import was successful
 */
async function importAllData(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                let success = false;

                // Check for combined format (version 1.1+)
                if (importedData.version && parseFloat(importedData.version) >= 1.1 && importedData.data) {
                    // Import bookmarks
                    if (importedData.data.bookmarks) {
                        localStorage.setItem('links', JSON.stringify(importedData.data.bookmarks));
                        success = true;
                    }

                    // Import todos
                    if (importedData.data.todos && Array.isArray(importedData.data.todos)) {
                        localStorage.setItem('todos', JSON.stringify(importedData.data.todos));
                        success = true;

                        // Dispatch event to notify todo.js that todos have been updated
                        window.dispatchEvent(new CustomEvent('todosUpdated', {
                            detail: { source: 'importAllData', count: importedData.data.todos.length }
                        }));
                    }

                    // Import settings
                    if (importedData.data.settings) {
                        const settings = importedData.data.settings;

                        // Update username
                        if (settings.username) {
                            localStorage.setItem('username', settings.username);
                        }

                        // Update theme settings
                        if (settings.theme) {
                            localStorage.setItem('theme', settings.theme);
                        }
                        if (settings.primaryColor) {
                            localStorage.setItem('primaryColor', settings.primaryColor);
                        }
                    }

                    // Import retirement timer data (version 1.2+)
                    if (parseFloat(importedData.version) >= 1.2 && importedData.data.retirementTimer) {
                        localStorage.setItem('retirementTimer', JSON.stringify(importedData.data.retirementTimer));
                    }
                }
                // Handle legacy format (version 1.0)
                else if (importedData.data && importedData.data.bookmarks) {
                    // This is a dashboard-only backup
                    localStorage.setItem('links', JSON.stringify(importedData.data.bookmarks));

                    // Import settings if available
                    if (importedData.data.settings) {
                        const settings = importedData.data.settings;

                        if (settings.username) {
                            localStorage.setItem('username', settings.username);
                        }
                        if (settings.theme) {
                            localStorage.setItem('theme', settings.theme);
                        }
                        if (settings.primaryColor) {
                            localStorage.setItem('primaryColor', settings.primaryColor);
                        }
                    }

                    success = true;
                }
                // Handle todo-only format (array)
                else if (Array.isArray(importedData)) {
                    // This is a todo-only backup
                    localStorage.setItem('todos', JSON.stringify(importedData));

                    // Dispatch event to notify todo.js that todos have been updated
                    window.dispatchEvent(new CustomEvent('todosUpdated', {
                        detail: { source: 'importAllData', count: importedData.length }
                    }));

                    success = true;
                }

                if (success) {
                    // Sync theme changes if themeManager is available
                    if (typeof themeManager !== 'undefined') {
                        themeManager.syncThemeSettings();
                    }

                    // Reload the current page to reflect changes
                    window.location.reload();
                    resolve(true);
                } else {
                    reject(new Error('Invalid file format or no valid data found'));
                }
            } catch (error) {
                Logger.error('Error parsing imported file:', error);
                if (window.errorHandler) {
                    const errorId = window.errorHandler.handleError(error, 'file', {
                        operation: 'import_file',
                        fileName: fileName
                    });
                }
                reject(new Error('Invalid file format. Please upload a valid JSON file.'));
            }
        };

        reader.onerror = function(error) {
            Logger.error('Error reading imported file:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(new Error('Failed to read file'), 'file', {
                    operation: 'read_file',
                    fileName: fileName
                });
            }
            reject(error);
        };

        reader.readAsText(file);
    });
}

/**
 * Import browser bookmarks from HTML file (Netscape Bookmark File Format)
 * @param {File} file - The HTML bookmark file
 * @param {string} fileName - Optional filename for error reporting
 * @returns {Promise<boolean>} Success status
 */
async function importBrowserBookmarks(file, fileName = null) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        fileName = fileName || file.name;

        reader.onload = function(event) {
            try {
                const htmlContent = event.target.result;
                Logger.debug('Parsing browser bookmarks from file:', fileName);

                // Parse the HTML bookmark file
                const bookmarkData = parseBrowserBookmarks(htmlContent);

                if (!bookmarkData || Object.keys(bookmarkData).length === 0) {
                    reject(new Error('No valid bookmarks found in file'));
                    return;
                }

                // Get current links data
                const currentLinks = JSON.parse(localStorage.getItem('links') || '{}');

                // Merge bookmark data with existing links
                const mergedLinks = mergeBrowserBookmarks(currentLinks, bookmarkData);

                // Save to localStorage
                localStorage.setItem('links', JSON.stringify(mergedLinks));

                Logger.info('Browser bookmarks imported successfully:', {
                    sectionsAdded: Object.keys(bookmarkData).length,
                    totalSections: Object.keys(mergedLinks).length
                });

                // Show success message
                if (typeof showModal === 'function') {
                    const sectionCount = Object.keys(bookmarkData).length;
                    const linkCount = Object.values(bookmarkData).reduce((total, section) => total + section.length, 0);

                    showModal(
                        'Bookmarks Imported Successfully!',
                        `Imported ${linkCount} bookmarks across ${sectionCount} sections.\n\nThe page will now refresh to show your imported bookmarks.`,
                        () => {
                            window.location.reload();
                        }
                    );
                } else {
                    alert('Bookmarks imported successfully! The page will now refresh.');
                    window.location.reload();
                }

                resolve(true);
            } catch (error) {
                Logger.error('Error parsing browser bookmarks:', error);
                if (window.errorHandler) {
                    const errorId = window.errorHandler.handleError(error, 'file', {
                        operation: 'import_browser_bookmarks',
                        fileName: fileName
                    });
                }
                reject(new Error('Invalid bookmark file format. Please ensure this is an HTML bookmark export from your browser.'));
            }
        };

        reader.onerror = function(error) {
            Logger.error('Error reading bookmark file:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(new Error('Failed to read bookmark file'), 'file', {
                    operation: 'read_bookmark_file',
                    fileName: fileName
                });
            }
            reject(error);
        };

        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * Parse HTML bookmark file content into dashboard format
 * @param {string} htmlContent - Raw HTML content from bookmark file
 * @returns {Object} Parsed bookmark data in dashboard format
 */
function parseBrowserBookmarks(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const bookmarkData = {};
    let currentSection = 'Imported Bookmarks'; // Default section for loose bookmarks

    // Find the main bookmark container (usually starts after the title)
    const allElements = doc.querySelectorAll('*');

    for (const element of allElements) {
        // Check for folder headings (H3 elements)
        if (element.tagName === 'H3') {
            const sectionName = element.textContent.trim();
            if (sectionName && sectionName !== 'Bookmarks' && sectionName !== 'Bookmarks bar') {
                currentSection = sanitizeSectionName(sectionName);
                if (!bookmarkData[currentSection]) {
                    bookmarkData[currentSection] = [];
                }
            }
        }

        // Check for bookmark links (A elements with HREF)
        else if (element.tagName === 'A' && element.href) {
            const linkName = element.textContent.trim();
            const linkUrl = element.href;

            // Validate the link
            if (linkName && linkUrl && isValidBookmarkUrl(linkUrl)) {
                // Ensure current section exists
                if (!bookmarkData[currentSection]) {
                    bookmarkData[currentSection] = [];
                }

                // Add bookmark to current section
                bookmarkData[currentSection].push({
                    name: sanitizeLinkName(linkName),
                    url: linkUrl,
                    favorite: false
                });
            }
        }
    }

    // Remove empty sections
    Object.keys(bookmarkData).forEach(section => {
        if (bookmarkData[section].length === 0) {
            delete bookmarkData[section];
        }
    });

    Logger.debug('Parsed bookmark structure:', {
        sections: Object.keys(bookmarkData),
        totalLinks: Object.values(bookmarkData).reduce((total, section) => total + section.length, 0)
    });

    return bookmarkData;
}

/**
 * Merge browser bookmarks with existing dashboard links
 * @param {Object} currentLinks - Existing dashboard links
 * @param {Object} bookmarkData - Parsed bookmark data
 * @returns {Object} Merged links data
 */
function mergeBrowserBookmarks(currentLinks, bookmarkData) {
    const mergedLinks = { ...currentLinks };

    Object.keys(bookmarkData).forEach(sectionName => {
        if (mergedLinks[sectionName]) {
            // Section exists - merge links, avoiding duplicates
            const existingUrls = new Set(mergedLinks[sectionName].map(link => link.url));
            const newLinks = bookmarkData[sectionName].filter(link => !existingUrls.has(link.url));
            mergedLinks[sectionName].push(...newLinks);

            if (newLinks.length > 0) {
                Logger.debug(`Merged ${newLinks.length} new links into existing section: ${sectionName}`);
            }
        } else {
            // New section - add all links
            mergedLinks[sectionName] = [...bookmarkData[sectionName]];
            Logger.debug(`Created new section: ${sectionName} with ${bookmarkData[sectionName].length} links`);
        }
    });

    return mergedLinks;
}

/**
 * Sanitize section name for dashboard use
 * @param {string} name - Raw section name
 * @returns {string} Sanitized section name
 */
function sanitizeSectionName(name) {
    if (window.inputValidator && typeof window.inputValidator.sanitizeHtml === 'function') {
        return window.inputValidator.sanitizeHtml(name).substring(0, 50);
    }

    // Fallback sanitization
    return name.replace(/[<>"/\\]/g, '').trim().substring(0, 50) || 'Imported Bookmarks';
}

/**
 * Sanitize link name for dashboard use
 * @param {string} name - Raw link name
 * @returns {string} Sanitized link name
 */
function sanitizeLinkName(name) {
    if (window.inputValidator && typeof window.inputValidator.sanitizeHtml === 'function') {
        return window.inputValidator.sanitizeHtml(name).substring(0, 100);
    }

    // Fallback sanitization
    return name.replace(/[<>"/\\]/g, '').trim().substring(0, 100) || 'Untitled';
}

/**
 * Validate if URL is suitable for bookmark import
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid for import
 */
function isValidBookmarkUrl(url) {
    try {
        const urlObj = new URL(url);

        // Block dangerous or invalid protocols
        const blockedProtocols = ['javascript:', 'data:', 'file:', 'vbscript:', 'about:'];
        if (blockedProtocols.some(protocol => url.toLowerCase().startsWith(protocol))) {
            return false;
        }

        // Only allow HTTP and HTTPS
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

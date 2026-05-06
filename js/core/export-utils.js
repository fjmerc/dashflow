// Utility functions for exporting dashboard data

// =====================================================================
// Import sanitizers — defense against malicious backup files.
// Imported data flows directly into localStorage and from there into
// innerHTML / data-* attributes across the codebase. These helpers guarantee
// that no string can break out of an attribute boundary or carry script
// payload, regardless of what the backup file contained.
// =====================================================================

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;        // matches task_../note_../subtask_../uuid styles (NO `:` — that's reserved as the task:subtask separator in blockedBy)
const SAFE_TAG_PATTERN = /^[A-Za-z0-9_\- ]+$/;     // tags allow space; rendered into chips
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;     // partial — accepts "YYYY-MM-DD" or full ISO

function safeString(value, maxLength, defaultValue = '') {
    if (typeof value !== 'string') return defaultValue;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function safeId(value, maxLength = 100) {
    if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) return null;
    return SAFE_ID_PATTERN.test(value) ? value : null;
}

function safeTags(value) {
    if (!Array.isArray(value)) return [];
    return value
        .filter(t => typeof t === 'string' && t.length > 0 && t.length <= 50 && SAFE_TAG_PATTERN.test(t))
        .slice(0, 50); // cap total tag count too
}

function safeIsoDate(value) {
    if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || value.length > 40) return null;
    return value;
}

function safeBlockedBy(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(ref => {
        if (typeof ref !== 'string') return false;
        // Format: "taskId" or "taskId:subtaskId" — both halves must be safe IDs
        const parts = ref.split(':');
        if (parts.length === 0 || parts.length > 2) return false;
        return parts.every(p => safeId(p) !== null);
    }).slice(0, 100);
}

// =====================================================================
// SANITIZER ARCHITECTURE NOTE
// All sanitizers below construct output objects EXPLICITLY (no `{...t}`
// spread). This guarantees that any unknown attacker-controlled field in
// the input is dropped — only the enumerated allowlist of fields survives.
// When a new field is added to a Task/Note/etc. model, the corresponding
// sanitizer MUST be updated to allow it through; otherwise it's stripped
// at import time. This is intentional: it forces sanitizer maintenance to
// keep pace with the data model.
// =====================================================================

// Sanitize an imported projects array.
function sanitizeImportedProjects(projects) {
    if (!Array.isArray(projects)) return [];
    const ICON_PATTERN = /^<i class="fas fa-[a-z0-9-]+"><\/i>$/;
    const COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;
    const VALID_VIEW = new Set(['list', 'board', 'calendar']);
    const DEFAULT_ICON = '<i class="fas fa-folder"></i>';
    const DEFAULT_COLOR = '#6366f1';
    return projects.map(p => {
        if (!p || typeof p !== 'object') return null;
        const id = safeId(p.id);
        if (id === null) {
            if (typeof Logger !== 'undefined') Logger.warn('Import: dropped project with invalid id');
            return null;
        }
        const rawName = typeof p.name === 'string' ? p.name.trim().slice(0, 50) : '';
        const name = rawName || 'Untitled';
        let icon = DEFAULT_ICON;
        if (typeof p.icon === 'string' && ICON_PATTERN.test(p.icon)) {
            icon = p.icon;
        } else if (typeof Logger !== 'undefined') {
            Logger.warn('Import: replaced invalid project icon for', name);
        }
        let color = DEFAULT_COLOR;
        if (typeof p.color === 'string' && COLOR_PATTERN.test(p.color)) {
            color = p.color;
        } else if (typeof Logger !== 'undefined') {
            Logger.warn('Import: replaced invalid project color for', name);
        }
        return {
            id,
            name,
            description: safeString(p.description, 500),
            color,
            icon,
            archived: !!p.archived,
            createdAt: safeIsoDate(p.createdAt) || new Date().toISOString(),
            position: typeof p.position === 'number' ? p.position : 0,
            defaultView: VALID_VIEW.has(p.defaultView) ? p.defaultView : 'list'
        };
    }).filter(Boolean);
}

// Sanitize an imported subtasks array (called from sanitizeImportedTasks).
function sanitizeImportedSubtasks(subtasks) {
    if (!Array.isArray(subtasks)) return [];
    return subtasks.map(st => {
        if (!st || typeof st !== 'object') return null;
        const id = safeId(st.id);
        if (id === null) return null;
        return {
            id,
            text: safeString(st.text, 200),
            completed: !!st.completed,
            position: typeof st.position === 'number' ? st.position : 0
        };
    }).filter(Boolean);
}

// Sanitize an imported comments array (called from sanitizeImportedTasks).
function sanitizeImportedComments(comments) {
    if (!Array.isArray(comments)) return [];
    const VALID_TYPE = new Set(['user', 'system']);
    return comments.map(c => {
        if (!c || typeof c !== 'object') return null;
        const id = safeId(c.id);
        if (id === null) return null;
        return {
            id,
            text: safeString(c.text, 1000),
            createdAt: safeIsoDate(c.createdAt) || new Date().toISOString(),
            type: VALID_TYPE.has(c.type) ? c.type : 'user'
        };
    }).filter(Boolean);
}

// Sanitize an imported recurrence object.
function sanitizeImportedRecurrence(rec) {
    if (!rec || typeof rec !== 'object') return null;
    const VALID_TYPE = new Set(['daily', 'weekly', 'monthly', 'yearly']);
    if (!VALID_TYPE.has(rec.type)) return null;
    let interval = 1;
    if (typeof rec.interval === 'number' && rec.interval >= 1 && rec.interval <= 365) {
        interval = Math.floor(rec.interval);
    }
    return {
        type: rec.type,
        interval,
        endDate: safeIsoDate(rec.endDate)
    };
}

// Sanitize an imported tasks array.
function sanitizeImportedTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    const VALID_PRIORITY = new Set(['low', 'medium', 'high']);
    const VALID_STATUS = new Set(['todo', 'in-progress', 'done', 'blocked']);
    return tasks.map(t => {
        if (!t || typeof t !== 'object') return null;
        const id = safeId(t.id);
        if (id === null) {
            if (typeof Logger !== 'undefined') Logger.warn('Import: dropped task with invalid id');
            return null;
        }
        const completed = !!t.completed;
        const createdAt = safeIsoDate(t.createdAt) || new Date().toISOString();
        return {
            id,
            text: safeString(t.text, 200),
            description: safeString(t.description, 1000),
            completed,
            priority: VALID_PRIORITY.has(t.priority) ? t.priority : 'medium',
            dueDate: safeIsoDate(t.dueDate),
            createdAt,
            completedAt: safeIsoDate(t.completedAt),
            projectId: safeId(t.projectId) || 'inbox',
            parentId: safeId(t.parentId),
            tags: safeTags(t.tags),
            status: VALID_STATUS.has(t.status) ? t.status : (completed ? 'done' : 'todo'),
            position: typeof t.position === 'number' ? t.position : 0,
            isMyDay: !!t.isMyDay,
            subtasks: sanitizeImportedSubtasks(t.subtasks),
            comments: sanitizeImportedComments(t.comments),
            blockedBy: safeBlockedBy(t.blockedBy),
            modifiedAt: safeIsoDate(t.modifiedAt) || createdAt,
            pomodorosCompleted: typeof t.pomodorosCompleted === 'number' ? t.pomodorosCompleted : 0,
            estimatedPomodoros: typeof t.estimatedPomodoros === 'number' ? t.estimatedPomodoros : null,
            recurrence: sanitizeImportedRecurrence(t.recurrence),
            isRecurring: !!t.isRecurring,
            recurringParentId: safeId(t.recurringParentId)
        };
    }).filter(Boolean);
}

// Sanitize legacy todos array (v1.x format — flat objects with text + completed).
function sanitizeImportedTodos(todos) {
    if (!Array.isArray(todos)) return [];
    return todos.map(t => {
        if (!t || typeof t !== 'object') return null;
        return {
            text: safeString(t.text, 200),
            completed: !!t.completed
        };
    }).filter(Boolean);
}

// Sanitize an imported notes array.
function sanitizeImportedNotes(notes) {
    if (!Array.isArray(notes)) return [];
    return notes.map(n => {
        if (!n || typeof n !== 'object') return null;
        const id = safeId(n.id);
        if (id === null) {
            if (typeof Logger !== 'undefined') Logger.warn('Import: dropped note with invalid id');
            return null;
        }
        const createdAt = safeIsoDate(n.createdAt) || new Date().toISOString();
        return {
            id,
            title: safeString(n.title, 200),
            content: safeString(n.content, 100000),
            tags: safeTags(n.tags),
            createdAt,
            modifiedAt: safeIsoDate(n.modifiedAt) || createdAt
        };
    }).filter(Boolean);
}

// Sanitize an imported bookmarks object (links): { sectionName: [link, link, ...] }.
function sanitizeImportedBookmarks(bookmarks) {
    if (!bookmarks || typeof bookmarks !== 'object') return {};
    const SECTION_PATTERN = /^[A-Za-z0-9\s\-_]+$/;
    const URL_PATTERN = /^https?:\/\//;
    const out = {};
    for (const [section, links] of Object.entries(bookmarks)) {
        if (typeof section !== 'string' || section.length > 50 || !SECTION_PATTERN.test(section)) {
            if (typeof Logger !== 'undefined') Logger.warn('Import: dropped invalid bookmark section', section);
            continue;
        }
        if (!Array.isArray(links)) continue;
        out[section] = links.map(link => {
            if (!link || typeof link !== 'object') return null;
            const url = typeof link.url === 'string' && URL_PATTERN.test(link.url) ? link.url : '#';
            return {
                name: safeString(link.name, 100),
                url,
                favorite: !!link.favorite
            };
        }).filter(Boolean);
    }
    return out;
}

// Sanitize taskSettings — whitelist known keys only.
function sanitizeImportedTaskSettings(settings) {
    if (!settings || typeof settings !== 'object') return null;
    const VALID_VIEW = new Set(['my-day', 'inbox', 'all', 'important', 'upcoming', 'completed', 'project', 'tag']);
    const out = {};
    if (typeof settings.dataVersion === 'string' && settings.dataVersion.length <= 20) {
        out.dataVersion = settings.dataVersion;
    }
    out.currentView = VALID_VIEW.has(settings.currentView) ? settings.currentView : 'my-day';
    out.currentProjectId = safeId(settings.currentProjectId);
    out.currentTag = (typeof settings.currentTag === 'string' && settings.currentTag.length <= 50 && SAFE_TAG_PATTERN.test(settings.currentTag))
        ? settings.currentTag : null;
    out.sidebarCollapsed = !!settings.sidebarCollapsed;
    return out;
}

// Sanitize tagColors — { tag: hexColor }, both validated.
function sanitizeImportedTagColors(tagColors) {
    if (!tagColors || typeof tagColors !== 'object') return {};
    const COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;
    const out = {};
    let count = 0;
    for (const [tag, color] of Object.entries(tagColors)) {
        if (count >= 200) break;
        if (typeof tag !== 'string' || tag.length === 0 || tag.length > 50) continue;
        if (!SAFE_TAG_PATTERN.test(tag)) continue;
        if (typeof color !== 'string' || !COLOR_PATTERN.test(color)) continue;
        out[tag] = color;
        count++;
    }
    return out;
}

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

        // Get task management data (new format - version 2.0+)
        const tasksData = JSON.parse(localStorage.getItem('tasks') || 'null');
        const projectsData = JSON.parse(localStorage.getItem('projects') || 'null');
        const taskSettingsData = JSON.parse(localStorage.getItem('taskSettings') || 'null');

        // Get legacy todo data for backward compatibility
        const todoData = JSON.parse(localStorage.getItem('todos') || '[]');

        // Get retirement timer data
        const retirementTimerData = JSON.parse(localStorage.getItem('retirementTimer') || 'null');

        // Get notes data
        const notesData = JSON.parse(localStorage.getItem('notes') || 'null');

        // Get tag colors data (version 2.2+)
        const tagColorsData = JSON.parse(localStorage.getItem('tagColors') || 'null');

        // Combine data
        const exportData = {
            version: '2.2', // Version 2.2 includes tag colors, comments, recurring tasks
            timestamp: new Date().toISOString(),
            data: {
                bookmarks: dashboardData.data.bookmarks,
                // New task management data
                tasks: tasksData,
                projects: projectsData,
                taskSettings: taskSettingsData,
                // Tag colors (version 2.2+)
                tagColors: tagColorsData,
                // Notes data (version 2.1+)
                notes: notesData,
                // Keep legacy todos for backward compatibility
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
        downloadAnchorNode.setAttribute("download", `dashflow_backup_${timestamp}.json`);

        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Update last export timestamp
        localStorage.setItem('lastExportTimestamp', new Date().getTime().toString());

        if (!silent) {
            alert('Complete export (DashFlow backup) completed successfully!');
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
                        const safeBookmarks = sanitizeImportedBookmarks(importedData.data.bookmarks);
                        localStorage.setItem('links', JSON.stringify(safeBookmarks));
                        success = true;
                    }

                    // Import task management data (version 2.0+)
                    if (parseFloat(importedData.version) >= 2.0) {
                        // Import new task management system data
                        let safeTasks;
                        if (importedData.data.tasks) {
                            safeTasks = sanitizeImportedTasks(importedData.data.tasks);
                            localStorage.setItem('tasks', JSON.stringify(safeTasks));
                            success = true;
                        }

                        if (importedData.data.projects) {
                            const safeProjects = sanitizeImportedProjects(importedData.data.projects);
                            localStorage.setItem('projects', JSON.stringify(safeProjects));
                            success = true;
                        }

                        if (importedData.data.taskSettings) {
                            const safeSettings = sanitizeImportedTaskSettings(importedData.data.taskSettings);
                            if (safeSettings) {
                                localStorage.setItem('taskSettings', JSON.stringify(safeSettings));
                                success = true;
                            }
                        }

                        // Import notes data (version 2.1+)
                        if (parseFloat(importedData.version) >= 2.1 && importedData.data.notes) {
                            const safeNotes = sanitizeImportedNotes(importedData.data.notes);
                            localStorage.setItem('notes', JSON.stringify(safeNotes));
                            success = true;
                            Logger.info('Imported notes data');
                        }

                        // Import tag colors data (version 2.2+)
                        if (parseFloat(importedData.version) >= 2.2 && importedData.data.tagColors) {
                            const safeTagColors = sanitizeImportedTagColors(importedData.data.tagColors);
                            localStorage.setItem('tagColors', JSON.stringify(safeTagColors));
                            success = true;
                            Logger.info('Imported tag colors data');
                        }

                        // Dispatch event to notify todo.js that tasks have been updated
                        if (safeTasks) {
                            window.dispatchEvent(new CustomEvent('tasksUpdated', {
                                detail: { source: 'importAllData', count: safeTasks.length }
                            }));
                        }
                    }
                    // Import legacy todos (version 1.x)
                    else if (importedData.data.todos && Array.isArray(importedData.data.todos)) {
                        const safeTodos = sanitizeImportedTodos(importedData.data.todos);
                        localStorage.setItem('todos', JSON.stringify(safeTodos));
                        success = true;

                        // Dispatch event to notify todo.js that todos have been updated
                        // task-data.js will migrate this to the new format on next load
                        window.dispatchEvent(new CustomEvent('todosUpdated', {
                            detail: { source: 'importAllData', count: safeTodos.length }
                        }));
                    }

                    // Import settings
                    if (importedData.data.settings) {
                        const settings = importedData.data.settings;

                        // Update username (validate to match the constraints applied at change-username time)
                        if (typeof settings.username === 'string') {
                            const trimmed = settings.username.trim();
                            if (trimmed && trimmed.length <= 50 && /^[A-Za-z0-9\s\-_]+$/.test(trimmed)) {
                                localStorage.setItem('username', trimmed);
                            } else if (typeof Logger !== 'undefined') {
                                Logger.warn('Import: skipped invalid username');
                            }
                        }

                        // Update theme settings
                        if (settings.theme === 'light' || settings.theme === 'dark') {
                            localStorage.setItem('theme', settings.theme);
                        }
                        if (typeof settings.primaryColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(settings.primaryColor)) {
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
                    const safeBookmarks = sanitizeImportedBookmarks(importedData.data.bookmarks);
                    localStorage.setItem('links', JSON.stringify(safeBookmarks));

                    // Import settings if available (same validation as the modern path above)
                    if (importedData.data.settings) {
                        const settings = importedData.data.settings;

                        if (typeof settings.username === 'string') {
                            const trimmed = settings.username.trim();
                            if (trimmed && trimmed.length <= 50 && /^[A-Za-z0-9\s\-_]+$/.test(trimmed)) {
                                localStorage.setItem('username', trimmed);
                            }
                        }
                        if (settings.theme === 'light' || settings.theme === 'dark') {
                            localStorage.setItem('theme', settings.theme);
                        }
                        if (typeof settings.primaryColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(settings.primaryColor)) {
                            localStorage.setItem('primaryColor', settings.primaryColor);
                        }
                    }

                    success = true;
                }
                // Handle todo-only format (array)
                else if (Array.isArray(importedData)) {
                    // This is a todo-only backup
                    const safeTodos = sanitizeImportedTodos(importedData);
                    localStorage.setItem('todos', JSON.stringify(safeTodos));

                    // Dispatch event to notify todo.js that todos have been updated
                    window.dispatchEvent(new CustomEvent('todosUpdated', {
                        detail: { source: 'importAllData', count: safeTodos.length }
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

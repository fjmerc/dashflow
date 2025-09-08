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

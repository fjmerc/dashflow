/**
 * Project Enhancements
 * Adds archive functionality, individual project export, and enhanced sorting
 */

/**
 * Add archive button to project context menus
 */
function enhanceProjectContextMenus() {
    // We'll add this via MutationObserver since projects are dynamically rendered
    observeProjectItems();
}

/**
 * Observe project items and enhance them
 */
function observeProjectItems() {
    const projectList = document.querySelector('.sidebar-projects') || document.querySelector('.projects-list');
    if (!projectList) {
        // Retry after a short delay
        setTimeout(observeProjectItems, 500);
        return;
    }

    const observer = new MutationObserver(() => {
        enhanceProjectItems();
    });

    observer.observe(projectList, { childList: true, subtree: true });
    enhanceProjectItems(); // Initial enhancement
}

/**
 * Enhance individual project items
 */
function enhanceProjectItems() {
    const projectItems = document.querySelectorAll('.project-item');

    projectItems.forEach(item => {
        if (item.dataset.enhanced) return; // Already enhanced
        item.dataset.enhanced = 'true';

        // Add right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const projectId = item.dataset.projectId;
            if (projectId) {
                showProjectContextMenu(e.clientX, e.clientY, projectId);
            }
        });
    });
}

/**
 * Show project context menu
 */
function showProjectContextMenu(x, y, projectId) {
    const project = window.taskDataManager.getProjectById(projectId);
    if (!project) return;

    // Remove any existing context menu
    const existing = document.querySelector('.project-context-menu');
    if (existing) existing.remove();

    const menuHTML = `
        <div class="project-context-menu" style="left: ${x}px; top: ${y}px;">
            <button class="context-menu-item" data-action="export" data-project-id="${projectId}">
                <i class="fas fa-download"></i> Export Project
            </button>
            ${projectId !== 'inbox' ? `
                <button class="context-menu-item" data-action="archive" data-project-id="${projectId}">
                    <i class="fas fa-archive"></i> ${project.archived ? 'Unarchive' : 'Archive'} Project
                </button>
            ` : ''}
            <button class="context-menu-item" data-action="edit" data-project-id="${projectId}">
                <i class="fas fa-edit"></i> Edit Project
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', menuHTML);

    const menu = document.querySelector('.project-context-menu');

    // Close on click outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);

    // Handle menu actions
    menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            const projectId = item.dataset.projectId;

            switch (action) {
                case 'export':
                    exportIndividualProject(projectId);
                    break;
                case 'archive':
                    toggleArchiveProject(projectId);
                    break;
                case 'edit':
                    if (window.showEditProjectModal) {
                        window.showEditProjectModal(projectId);
                    }
                    break;
            }

            menu.remove();
        });
    });

    addProjectEnhancementsStyles();
}

/**
 * Export individual project
 */
function exportIndividualProject(projectId) {
    const project = window.taskDataManager.getProjectById(projectId);
    if (!project) return;

    const tasks = window.taskDataManager.getTasksByProject(projectId);

    const exportData = {
        version: '2.1',
        timestamp: new Date().toISOString(),
        exportType: 'single-project',
        project: project,
        tasks: tasks.map(t => t.toJSON())
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `dashflow-project-${project.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    if (window.showNotification) {
        window.showNotification(`Project "${project.name}" exported successfully`, 'success');
    }

    Logger.info('Exported project:', project.name);
}

/**
 * Toggle archive status of a project
 */
function toggleArchiveProject(projectId) {
    const project = window.taskDataManager.getProjectById(projectId);
    if (!project) return;

    if (projectId === 'inbox') {
        alert('Cannot archive the Inbox project');
        return;
    }

    const action = project.archived ? 'unarchive' : 'archive';
    const confirmMsg = project.archived
        ? `Unarchive project "${project.name}"?`
        : `Archive project "${project.name}"? Tasks will remain but the project will be hidden.`;

    if (confirm(confirmMsg)) {
        if (project.archived) {
            window.taskDataManager.unarchiveProject(projectId);
        } else {
            window.taskDataManager.archiveProject(projectId);
        }

        // Refresh UI
        if (window.renderProjects) {
            window.renderProjects();
        }
        if (window.renderTasks) {
            window.renderTasks();
        }

        if (window.showNotification) {
            window.showNotification(`Project ${action}d successfully`, 'success');
        }
    }
}

/**
 * Add "Show Archived" link to sidebar projects section
 */
function addArchivedProjectsButton() {
    const projectsSection = document.querySelector('#projectsList')?.parentElement;
    if (!projectsSection) {
        setTimeout(addArchivedProjectsButton, 500);
        return;
    }

    // Check if button already exists
    if (document.getElementById('showArchivedLink')) return;

    // Add as a sidebar item (matching existing design)
    const addProjectBtn = projectsSection.querySelector('.sidebar-add-btn');
    if (!addProjectBtn) return;

    const link = document.createElement('div');
    link.id = 'showArchivedLink';
    link.className = 'sidebar-item archived-link';
    link.innerHTML = `
        <div class="sidebar-item-icon">📦</div>
        <div class="sidebar-item-text">Archived Projects</div>
    `;
    link.onclick = showArchivedProjects;

    // Insert before the "New Project" button
    addProjectBtn.parentNode.insertBefore(link, addProjectBtn);
}

/**
 * Show archived projects modal
 */
function showArchivedProjects() {
    const archivedProjects = window.taskDataManager.getArchivedProjects();

    const modalHTML = `
        <div class="archived-projects-modal">
            <div class="archived-projects-content">
                <div class="archived-projects-header">
                    <h2><i class="fas fa-archive"></i> Archived Projects</h2>
                    <button class="close-btn" onclick="closeArchivedProjects()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="archived-projects-list">
                    ${archivedProjects.length === 0 ? '<p class="no-archived">No archived projects</p>' : archivedProjects.map(project => {
                        const taskCount = window.taskDataManager.getTasksByProject(project.id).length;
                        return `
                            <div class="archived-project-item" data-project-id="${project.id}">
                                <span class="project-icon" style="color: ${project.color}">${project.icon}</span>
                                <div class="project-info">
                                    <span class="project-name">${project.name}</span>
                                    <span class="project-meta">${taskCount} tasks</span>
                                </div>
                                <div class="project-actions">
                                    <button class="btn-small btn-primary" onclick="unarchiveProject('${project.id}')">
                                        <i class="fas fa-box-open"></i> Unarchive
                                    </button>
                                    <button class="btn-small" onclick="exportIndividualProject('${project.id}')">
                                        <i class="fas fa-download"></i> Export
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    const existing = document.querySelector('.archived-projects-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    addProjectEnhancementsStyles();

    // Add backdrop click to close
    setTimeout(() => {
        const modal = document.querySelector('.archived-projects-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeArchivedProjects();
                }
            });
        }
    }, 0);
}

/**
 * Close archived projects modal
 */
window.closeArchivedProjects = function() {
    const modal = document.querySelector('.archived-projects-modal');
    if (modal) modal.remove();
};

/**
 * Unarchive a project from the modal
 */
window.unarchiveProject = function(projectId) {
    toggleArchiveProject(projectId);
    // Refresh the modal
    setTimeout(() => {
        closeArchivedProjects();
        showArchivedProjects();
    }, 100);
};

/**
 * Add sorting options to task list header
 */
function addSortingOptions() {
    const taskListHeader = document.querySelector('.task-list-header') || document.querySelector('.view-header');
    if (!taskListHeader) {
        setTimeout(addSortingOptions, 500);
        return;
    }

    // Check if already added
    if (document.getElementById('taskSortSelect')) return;

    const sortHTML = `
        <div class="task-sort-container">
            <label for="taskSortSelect" class="sort-label">
                <i class="fas fa-sort"></i> Sort:
            </label>
            <select class="task-sort-select" id="taskSortSelect">
                <option value="default">Default (Position)</option>
                <option value="priority-high">Priority (High to Low)</option>
                <option value="priority-low">Priority (Low to High)</option>
                <option value="due-date-asc">Due Date (Earliest First)</option>
                <option value="due-date-desc">Due Date (Latest First)</option>
                <option value="created-new">Created (Newest First)</option>
                <option value="created-old">Created (Oldest First)</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
                <option value="status">Status</option>
            </select>
        </div>
    `;

    taskListHeader.insertAdjacentHTML('beforeend', sortHTML);

    // Add change handler
    const select = document.getElementById('taskSortSelect');
    if (select) {
        select.addEventListener('change', () => {
            const sortType = select.value;
            applySorting(sortType);
        });
    }
}

/**
 * Apply sorting to task list
 */
function applySorting(sortType) {
    // Store the sort preference
    if (window.taskDataManager) {
        window.taskDataManager.settings.currentSort = sortType;
        window.taskDataManager.saveToStorage();
    }

    // Re-render tasks with sorting
    if (window.renderTasks) {
        window.renderTasks();
    }
}

/**
 * Get sorted tasks based on current sort setting
 * This should be called by the main task rendering function
 */
window.getSortedTasks = function(tasks) {
    const sortType = window.taskDataManager?.settings?.currentSort || 'default';

    const sorted = [...tasks];

    switch (sortType) {
        case 'priority-high':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            break;
        case 'priority-low':
            const priorityOrderLow = { low: 0, medium: 1, high: 2 };
            sorted.sort((a, b) => priorityOrderLow[a.priority] - priorityOrderLow[b.priority]);
            break;
        case 'due-date-asc':
            sorted.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'due-date-desc':
            sorted.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            });
            break;
        case 'created-new':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'created-old':
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'alphabetical':
            sorted.sort((a, b) => a.text.localeCompare(b.text));
            break;
        case 'status':
            const statusOrder = { 'in-progress': 0, 'todo': 1, 'blocked': 2, 'done': 3 };
            sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
            break;
        default:
            // Default sorting by position
            sorted.sort((a, b) => a.position - b.position);
    }

    return sorted;
};

/**
 * Add styles for project enhancements
 */
function addProjectEnhancementsStyles() {
    if (document.getElementById('project-enhancements-styles')) return;

    const style = document.createElement('style');
    style.id = 'project-enhancements-styles';
    style.textContent = `
        .project-context-menu {
            position: fixed;
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            min-width: 200px;
            padding: 4px;
        }
        .context-menu-item {
            width: 100%;
            padding: 10px 14px;
            background: none;
            border: none;
            text-align: left;
            cursor: pointer;
            color: var(--text-color);
            font-size: 14px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .context-menu-item:hover {
            background: var(--background-hover);
        }
        .context-menu-item i {
            width: 16px;
            text-align: center;
        }
        .sidebar-item.archived-link {
            opacity: 0.7;
            font-size: 13px;
        }
        .sidebar-item.archived-link:hover {
            opacity: 1;
        }
        .archived-projects-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        .archived-projects-content {
            background: var(--background-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease-out;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        .archived-projects-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border-color);
        }
        .archived-projects-header h2 {
            margin: 0;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .archived-projects-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .no-archived {
            text-align: center;
            color: var(--text-muted);
            padding: 40px 20px;
            font-style: italic;
        }
        .archived-project-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--background-hover);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .project-icon {
            font-size: 24px;
        }
        .project-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .project-name {
            font-size: 16px;
            font-weight: 600;
        }
        .project-meta {
            font-size: 13px;
            color: var(--text-muted);
        }
        .project-actions {
            display: flex;
            gap: 8px;
        }
        .btn-small {
            padding: 6px 12px;
            font-size: 13px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: var(--background-color);
            color: var(--text-color);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .btn-small:hover {
            background: var(--background-hover);
        }
        .btn-small.btn-primary {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        .btn-small.btn-primary:hover {
            opacity: 0.9;
        }
        .task-sort-container {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }
        .sort-label {
            font-size: 13px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .task-sort-select {
            padding: 6px 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--background-color);
            color: var(--text-color);
            font-size: 13px;
            cursor: pointer;
        }
        .task-sort-select:focus {
            outline: none;
            border-color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize project enhancements
 */
function initProjectEnhancements() {
    enhanceProjectContextMenus();
    addArchivedProjectsButton();
    addSortingOptions();
}

// Export to global scope
window.exportIndividualProject = exportIndividualProject;
window.initProjectEnhancements = initProjectEnhancements;
window.showArchivedProjects = showArchivedProjects;

// Initialize when task app is ready
window.addEventListener('taskAppReady', () => {
    Logger.debug('Project Enhancements: Task app ready event received');
    initProjectEnhancements();
});

// Fallback: if already loaded
if (document.readyState === 'complete' && window.taskDataManager) {
    setTimeout(initProjectEnhancements, 100);
}

Logger.debug('project-enhancements.js loaded');

/**
 * Enterprise Task List - Main Application Logic
 * Integrates with TaskDataManager for data persistence
 */

// DOM Elements
const taskSidebar = document.getElementById('taskSidebar');
const projectsList = document.getElementById('projectsList');
const smartViewsList = document.getElementById('smartViewsList');
const addProjectBtn = document.getElementById('addProjectBtn');
const taskList = document.getElementById('taskList');
const quickAddForm = document.getElementById('quickAddForm');
const quickAddInput = document.getElementById('quickAddInput');
const emptyState = document.getElementById('emptyState');
const viewTitle = document.getElementById('viewTitle');
const viewSubtitle = document.getElementById('viewSubtitle');
const taskDetailPanel = document.getElementById('taskDetailPanel');
const closeDetailPanel = document.getElementById('closeDetailPanel');
const detailPanelContent = document.getElementById('detailPanelContent');

// Header buttons
const backToDashboard = document.getElementById('backToDashboard');
const settingsBtn = document.getElementById('settingsBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const themeColorBtn = document.getElementById('themeColorBtn');
const importTodosBtn = document.getElementById('importTodosBtn');
const exportAllBtn = document.getElementById('exportAllBtn');
const importInput = document.getElementById('importInput');

// State
let taskDataManager;
let currentView = 'my-day';
let currentProjectId = null;
let selectedTaskId = null;
let username = localStorage.getItem('username') || 'User';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    Logger.debug('Task List App: Initializing');

    // Initialize TaskDataManager
    taskDataManager = new TaskDataManager();

    // Render UI
    renderSidebar();
    renderTasks();

    // Setup event listeners
    setupEventListeners();

    // Update title
    updateTitle();

    Logger.debug('Task List App: Initialized');
});

/**
 * Update page title
 */
function updateTitle() {
    document.title = `${username}'s Task List`;
}

/**
 * Change username
 */
function changeUsername() {
    const newUsername = prompt('Enter your name:', username);
    if (newUsername && newUsername.trim()) {
        username = newUsername.trim();
        localStorage.setItem('username', username);
        updateTitle();
    }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Quick add form
    quickAddForm.addEventListener('submit', handleQuickAdd);

    // Sidebar view items
    smartViewsList.addEventListener('click', handleViewClick);

    // Projects list
    projectsList.addEventListener('click', handleProjectClick);

    // Add project button
    addProjectBtn.addEventListener('click', showAddProjectModal);

    // Task list (event delegation)
    taskList.addEventListener('click', handleTaskClick);

    // Detail panel close
    closeDetailPanel.addEventListener('click', hideDetailPanel);

    // Header buttons
    backToDashboard.addEventListener('click', () => window.location.href = 'index.html');
    darkModeBtn.addEventListener('click', () => themeManager.toggleDarkMode());
    themeColorBtn.addEventListener('click', () => themeManager.changeThemeColor());
    settingsBtn.addEventListener('click', changeUsername);

    // Import/Export
    importTodosBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImport);
    exportAllBtn.addEventListener('click', () => exportAllData(false));

    // View switcher - Board view coming in Checkpoint 3
    document.querySelectorAll('.view-switcher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layout = btn.dataset.layout;

            if (layout === 'board') {
                // Show coming soon message
                alert('📊 Board view is coming in the next update!\n\nFor now, enjoy the List view. The Kanban board will be available soon with drag-and-drop between columns.');
                return;
            }

            document.querySelectorAll('.view-switcher-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    Logger.debug('Event listeners setup complete');
}

/**
 * Render Sidebar
 */
function renderSidebar() {
    Logger.debug('Rendering sidebar');

    // Update counts for smart views
    const myDayTasks = taskDataManager.getMyDayTasks();
    const inboxTasks = taskDataManager.getTasksByProject(DEFAULT_PROJECTS.INBOX);
    const allTasks = taskDataManager.getAllTasks().filter(t => !t.completed);

    document.getElementById('myDayCount').textContent = myDayTasks.length;
    document.getElementById('inboxCount').textContent = inboxTasks.filter(t => !t.completed).length;
    document.getElementById('allCount').textContent = allTasks.length;

    // Render projects
    const projects = taskDataManager.getAllProjects();
    projectsList.innerHTML = '';

    projects.forEach(project => {
        const projectTasks = taskDataManager.getTasksByProject(project.id).filter(t => !t.completed);
        const projectItem = document.createElement('div');
        projectItem.className = 'sidebar-item project-item';
        projectItem.dataset.projectId = project.id;
        projectItem.style.setProperty('--project-color', project.color);

        // Check if this project is currently selected
        if (currentView === 'project' && currentProjectId === project.id) {
            projectItem.classList.add('active');
        }

        // Can't delete Inbox
        const canDelete = project.id !== DEFAULT_PROJECTS.INBOX;

        projectItem.innerHTML = `
            <div class="sidebar-item-icon">${project.icon}</div>
            <div class="sidebar-item-text">${project.name}</div>
            <span class="sidebar-item-count">${projectTasks.length}</span>
            <div class="project-actions">
                <button class="project-action-btn edit" data-action="edit-project" data-project-id="${project.id}" title="Edit Project">
                    <i class="fas fa-pencil"></i>
                </button>
                ${canDelete ? `
                    <button class="project-action-btn delete" data-action="delete-project" data-project-id="${project.id}" title="Delete Project">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;

        projectsList.appendChild(projectItem);
    });

    Logger.debug('Sidebar rendered with', projects.length, 'projects');
}

/**
 * Handle view click
 */
function handleViewClick(e) {
    const viewItem = e.target.closest('.sidebar-item');
    if (!viewItem) return;

    const view = viewItem.dataset.view;
    if (!view) return;

    // Update active state
    smartViewsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    viewItem.classList.add('active');

    // Clear project selection
    projectsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    // Update current view
    currentView = view;
    currentProjectId = null;

    // Update header
    updateViewHeader();

    // Render tasks
    renderTasks();
}

/**
 * Handle project click
 */
function handleProjectClick(e) {
    // Check if clicking on action button
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        const projectId = actionBtn.dataset.projectId;

        if (action === 'edit-project') {
            showEditProjectModal(projectId);
        } else if (action === 'delete-project') {
            deleteProject(projectId);
        }
        return;
    }

    const projectItem = e.target.closest('.sidebar-item');
    if (!projectItem) return;

    const projectId = projectItem.dataset.projectId;
    if (!projectId) return;

    // Update active state
    projectsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    projectItem.classList.add('active');

    // Clear view selection
    smartViewsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    // Update current view
    currentView = 'project';
    currentProjectId = projectId;

    // Update header
    updateViewHeader();

    // Render tasks
    renderTasks();
}

/**
 * Update view header
 */
function updateViewHeader() {
    let title = '';
    let subtitle = '';

    switch (currentView) {
        case 'my-day':
            title = 'My Day';
            subtitle = 'Focus on what matters today';
            break;
        case 'inbox':
            title = 'Inbox';
            subtitle = 'Organize your tasks';
            break;
        case 'all':
            title = 'All Tasks';
            subtitle = 'View all your tasks';
            break;
        case 'project':
            const project = taskDataManager.getProjectById(currentProjectId);
            if (project) {
                title = project.icon + ' ' + project.name;
                subtitle = project.description || 'Project tasks';
            }
            break;
    }

    viewTitle.textContent = title;
    viewSubtitle.textContent = subtitle;
}

/**
 * Render Tasks
 */
function renderTasks() {
    Logger.debug('Rendering tasks for view:', currentView);

    let tasks = [];

    switch (currentView) {
        case 'my-day':
            tasks = taskDataManager.getMyDayTasks();
            break;
        case 'inbox':
            tasks = taskDataManager.getTasksByProject(DEFAULT_PROJECTS.INBOX);
            break;
        case 'all':
            tasks = taskDataManager.getAllTasks();
            break;
        case 'project':
            if (currentProjectId) {
                tasks = taskDataManager.getTasksByProject(currentProjectId);
            }
            break;
    }

    // Sort: incomplete first, then by position
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return b.position - a.position; // Newer tasks first
    });

    // Render
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';

        tasks.forEach(task => {
            const taskItem = createTaskElement(task);
            taskList.appendChild(taskItem);
        });
    }

    // Update sidebar counts
    renderSidebar();

    Logger.debug('Rendered', tasks.length, 'tasks');
}

/**
 * Create task element
 */
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-list-item';
    li.dataset.taskId = task.id;

    if (task.completed) {
        li.classList.add('completed');
    }

    // Format due date
    let dueDateHTML = '';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue = dueDate < today && !task.completed;
        const dueDateStr = dueDate.toLocaleDateString();

        dueDateHTML = `
            <span class="task-list-item-meta-item ${isOverdue ? 'overdue' : ''}">
                <i class="fas fa-calendar"></i>
                ${dueDateStr}
            </span>
        `;
    }

    // Priority badge
    const priorityHTML = `
        <span class="task-priority-badge priority-${task.priority}">
            ${task.priority}
        </span>
    `;

    // Subtasks count
    let subtasksHTML = '';
    if (task.subtasks && task.subtasks.length > 0) {
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        subtasksHTML = `
            <span class="task-list-item-meta-item">
                <i class="fas fa-list-check"></i>
                ${completedSubtasks}/${task.subtasks.length}
            </span>
        `;
    }

    li.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle-complete"></div>
        <div class="task-list-item-content">
            <div class="task-list-item-title">${escapeHtml(task.text)}</div>
            ${task.description ? `<div class="task-list-item-description">${escapeHtml(task.description).substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            <div class="task-list-item-meta">
                ${priorityHTML}
                ${dueDateHTML}
                ${subtasksHTML}
            </div>
        </div>
    `;

    return li;
}

/**
 * Handle task click
 */
function handleTaskClick(e) {
    const taskItem = e.target.closest('.task-list-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;
    const action = e.target.closest('[data-action]')?.dataset.action;

    if (action === 'toggle-complete') {
        toggleTaskComplete(taskId);
    } else {
        // Show task details
        showTaskDetails(taskId);
    }
}

/**
 * Toggle task complete
 */
function toggleTaskComplete(taskId) {
    const task = taskDataManager.tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates = {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : null,
        status: !task.completed ? TaskStatus.DONE : TaskStatus.TODO
    };

    taskDataManager.updateTask(taskId, updates);
    renderTasks();

    Logger.debug('Task toggled:', taskId, updates.completed);
}

/**
 * Show task details
 */
function showTaskDetails(taskId) {
    selectedTaskId = taskId;
    const task = taskDataManager.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Get project
    const project = taskDataManager.getProjectById(task.projectId);

    // Format dates
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set';

    // Render detail panel
    detailPanelContent.innerHTML = `
        <div class="task-detail-section">
            <label class="task-detail-label">Task</label>
            <input type="text" class="task-detail-input" id="detailTaskText" value="${escapeHtml(task.text)}">
        </div>

        <div class="task-detail-section">
            <label class="task-detail-label">Description</label>
            <textarea class="task-detail-textarea" id="detailTaskDescription" rows="4" placeholder="Add a description...">${escapeHtml(task.description)}</textarea>
        </div>

        <div class="task-detail-section">
            <label class="task-detail-label">Project</label>
            <select class="task-detail-select" id="detailTaskProject">
                ${taskDataManager.getAllProjects().map(p => `
                    <option value="${p.id}" ${p.id === task.projectId ? 'selected' : ''}>
                        ${p.icon} ${p.name}
                    </option>
                `).join('')}
            </select>
        </div>

        <div class="task-detail-row">
            <div class="task-detail-section">
                <label class="task-detail-label">Priority</label>
                <select class="task-detail-select" id="detailTaskPriority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>

            <div class="task-detail-section">
                <label class="task-detail-label">Due Date</label>
                <input type="date" class="task-detail-input" id="detailTaskDueDate"
                    value="${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}">
            </div>
        </div>

        <div class="task-detail-section">
            <label class="task-detail-label">
                <input type="checkbox" id="detailTaskMyDay" ${task.isMyDay ? 'checked' : ''}>
                Add to My Day
            </label>
        </div>

        <div class="task-detail-section">
            <button class="task-detail-btn danger" id="deleteTaskBtn">
                <i class="fas fa-trash"></i>
                Delete Task
            </button>
        </div>

        <div class="task-detail-meta">
            <small>Created: ${createdDate}</small>
            ${task.completedAt ? `<small>Completed: ${new Date(task.completedAt).toLocaleDateString()}</small>` : ''}
        </div>
    `;

    // Add styles for detail panel elements (inline for now)
    const style = document.createElement('style');
    style.textContent = `
        .task-detail-section { margin-bottom: 20px; }
        .task-detail-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }
        .task-detail-input, .task-detail-textarea, .task-detail-select {
            width: 100%; padding: 10px; border: 1px solid var(--border-color);
            border-radius: 6px; background: var(--background-color); color: var(--text-color);
            font-size: 14px; font-family: inherit;
        }
        .task-detail-input:focus, .task-detail-textarea:focus, .task-detail-select:focus {
            outline: none; border-color: var(--primary-color);
        }
        .task-detail-row { display: flex; gap: 12px; }
        .task-detail-row .task-detail-section { flex: 1; }
        .task-detail-btn {
            width: 100%; padding: 10px; border: none; border-radius: 6px;
            font-weight: 500; cursor: pointer; transition: all 0.15s ease;
        }
        .task-detail-btn.danger {
            background: rgba(239, 68, 68, 0.1); color: #ef4444;
        }
        .task-detail-btn.danger:hover { background: #ef4444; color: white; }
        .task-detail-meta { margin-top: 20px; padding-top: 20px;
            border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;
        }
        .task-detail-meta small { color: var(--text-muted); font-size: 12px; }
    `;
    if (!document.getElementById('detailPanelStyles')) {
        style.id = 'detailPanelStyles';
        document.head.appendChild(style);
    }

    // Show panel
    taskDetailPanel.classList.remove('hidden');

    // Auto-save on changes
    const inputs = ['detailTaskText', 'detailTaskDescription', 'detailTaskProject', 'detailTaskPriority', 'detailTaskDueDate', 'detailTaskMyDay'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => saveTaskDetails(taskId));
        }
    });

    // Delete button
    document.getElementById('deleteTaskBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this task?')) {
            taskDataManager.deleteTask(taskId);
            hideDetailPanel();
            renderTasks();
        }
    });

    Logger.debug('Showing task details:', taskId);
}

/**
 * Save task details
 */
function saveTaskDetails(taskId) {
    const text = document.getElementById('detailTaskText').value.trim();
    const description = document.getElementById('detailTaskDescription').value.trim();
    const projectId = document.getElementById('detailTaskProject').value;
    const priority = document.getElementById('detailTaskPriority').value;
    const dueDate = document.getElementById('detailTaskDueDate').value;
    const isMyDay = document.getElementById('detailTaskMyDay').checked;

    if (!text) {
        alert('Task text cannot be empty');
        return;
    }

    const updates = {
        text,
        description,
        projectId,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        isMyDay
    };

    taskDataManager.updateTask(taskId, updates);
    renderTasks();

    Logger.debug('Task details saved:', taskId);
}

/**
 * Hide detail panel
 */
function hideDetailPanel() {
    taskDetailPanel.classList.add('hidden');
    selectedTaskId = null;
}

/**
 * Handle quick add
 */
function handleQuickAdd(e) {
    e.preventDefault();

    const text = quickAddInput.value.trim();
    if (!text) return;

    // Determine project ID
    let projectId = currentProjectId || DEFAULT_PROJECTS.INBOX;
    if (currentView === 'inbox') {
        projectId = DEFAULT_PROJECTS.INBOX;
    }

    // Create task
    const taskData = {
        text,
        projectId,
        isMyDay: currentView === 'my-day'
    };

    taskDataManager.addTask(taskData);

    // Clear input
    quickAddInput.value = '';

    // Re-render
    renderTasks();

    Logger.debug('Task added via quick add:', text);
}

/**
 * Show add project modal
 */
function showAddProjectModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Create New Project</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Project Name</label>
                    <input type="text" id="newProjectName"
                        style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--background-color); color: var(--text-color);"
                        placeholder="Enter project name..." autofocus>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Project Icon</label>
                    <div id="iconSelector" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; max-height: 300px; overflow-y: auto; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background-color);">
                        <!-- Icons will be added here -->
                    </div>
                    <input type="hidden" id="selectedIcon" value="folder">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Project Color</label>
                    <div id="colorSelector" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px;">
                        <!-- Colors will be added here -->
                    </div>
                    <input type="hidden" id="selectedColor" value="#3b82f6">
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancelProjectBtn" class="modal-btn">Cancel</button>
                <button id="createProjectBtn" class="modal-btn primary">Create Project</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Popular FontAwesome icons
    const icons = [
        'folder', 'briefcase', 'home', 'graduation-cap', 'heart', 'star', 'code',
        'laptop', 'mobile', 'book', 'lightbulb', 'rocket', 'shopping-cart',
        'utensils', 'dumbbell', 'plane', 'car', 'bicycle', 'camera', 'music',
        'gamepad', 'palette', 'flask', 'seedling', 'paw', 'coffee', 'pizza-slice',
        'wallet', 'gift', 'bell', 'flag', 'chart-line', 'users', 'cog', 'wrench',
        'hammer', 'screwdriver', 'paint-brush', 'pen', 'pencil', 'clipboard',
        'tasks', 'list-check', 'calendar', 'clock', 'envelope', 'phone', 'globe'
    ];

    // Project colors
    const colors = [
        '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
        '#ec4899', '#f43f5e', '#64748b', '#6b7280'
    ];

    // Render icons
    const iconSelector = document.getElementById('iconSelector');
    icons.forEach(icon => {
        const iconBtn = document.createElement('button');
        iconBtn.type = 'button';
        iconBtn.className = 'icon-option';
        iconBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        iconBtn.style.cssText = 'padding: 12px; border: 2px solid transparent; border-radius: 6px; background: var(--card-background); cursor: pointer; transition: all 0.15s ease; font-size: 20px;';

        if (icon === 'folder') {
            iconBtn.style.borderColor = 'var(--primary-color)';
        }

        iconBtn.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(btn => {
                btn.style.borderColor = 'transparent';
            });
            iconBtn.style.borderColor = 'var(--primary-color)';
            document.getElementById('selectedIcon').value = icon;
        });

        iconSelector.appendChild(iconBtn);
    });

    // Render colors
    const colorSelector = document.getElementById('colorSelector');
    colors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.type = 'button';
        colorBtn.className = 'color-option';
        colorBtn.style.cssText = `width: 40px; height: 40px; border: 3px solid transparent; border-radius: 8px; background: ${color}; cursor: pointer; transition: all 0.15s ease;`;

        if (color === '#3b82f6') {
            colorBtn.style.borderColor = 'var(--text-color)';
        }

        colorBtn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.style.borderColor = 'transparent';
            });
            colorBtn.style.borderColor = 'var(--text-color)';
            document.getElementById('selectedColor').value = color;
        });

        colorSelector.appendChild(colorBtn);
    });

    // Event listeners
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.getElementById('cancelProjectBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    document.getElementById('createProjectBtn').addEventListener('click', () => {
        const name = document.getElementById('newProjectName').value.trim();
        const icon = document.getElementById('selectedIcon').value;
        const color = document.getElementById('selectedColor').value;

        if (!name) {
            alert('Please enter a project name');
            return;
        }

        const projectData = {
            name,
            icon: `<i class="fas fa-${icon}"></i>`,
            color
        };

        taskDataManager.addProject(projectData);
        renderSidebar();
        document.body.removeChild(modal);

        Logger.debug('Project added:', name);
    });

    // Focus name input
    setTimeout(() => {
        document.getElementById('newProjectName').focus();
    }, 100);
}

/**
 * Handle import
 */
function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    importAllData(file)
        .then(() => {
            Logger.info('Import completed successfully');
            // Reinitialize with new data
            taskDataManager = new TaskDataManager();
            renderSidebar();
            renderTasks();
        })
        .catch(error => {
            Logger.error('Error importing data:', error);
            alert('Failed to import data: ' + error.message);
        });
}

/**
 * Delete project
 */
function deleteProject(projectId) {
    const project = taskDataManager.getProjectById(projectId);
    if (!project) return;

    const taskCount = taskDataManager.getTasksByProject(projectId).length;
    const message = taskCount > 0
        ? `Are you sure you want to delete "${project.name}"?\n\n${taskCount} task(s) will be moved to Inbox.`
        : `Are you sure you want to delete "${project.name}"?`;

    if (!confirm(message)) return;

    taskDataManager.deleteProject(projectId);

    // If currently viewing this project, switch to Inbox
    if (currentProjectId === projectId) {
        currentView = 'inbox';
        currentProjectId = null;
        updateViewHeader();
    }

    renderSidebar();
    renderTasks();

    Logger.debug('Project deleted:', projectId);
}

/**
 * Show edit project modal
 */
function showEditProjectModal(projectId) {
    const project = taskDataManager.getProjectById(projectId);
    if (!project) return;

    // Extract icon name from HTML (e.g., "<i class='fas fa-folder'></i>" -> "folder")
    const iconMatch = project.icon.match(/fa-([a-z-]+)/);
    const currentIconName = iconMatch ? iconMatch[1] : 'folder';

    // Create modal (similar to add project modal)
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Edit Project</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Project Name</label>
                    <input type="text" id="editProjectName"
                        style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--background-color); color: var(--text-color);"
                        placeholder="Enter project name..." value="${escapeHtml(project.name)}" autofocus>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Project Icon</label>
                    <div id="editIconSelector" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; max-height: 300px; overflow-y: auto; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background-color);">
                        <!-- Icons will be added here -->
                    </div>
                    <input type="hidden" id="editSelectedIcon" value="${currentIconName}">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Project Color</label>
                    <div id="editColorSelector" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px;">
                        <!-- Colors will be added here -->
                    </div>
                    <input type="hidden" id="editSelectedColor" value="${project.color}">
                </div>
            </div>
            <div class="modal-footer">
                <button id="cancelEditProjectBtn" class="modal-btn">Cancel</button>
                <button id="saveEditProjectBtn" class="modal-btn primary">Save Changes</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Popular FontAwesome icons
    const icons = [
        'folder', 'briefcase', 'home', 'graduation-cap', 'heart', 'star', 'code',
        'laptop', 'mobile', 'book', 'lightbulb', 'rocket', 'shopping-cart',
        'utensils', 'dumbbell', 'plane', 'car', 'bicycle', 'camera', 'music',
        'gamepad', 'palette', 'flask', 'seedling', 'paw', 'coffee', 'pizza-slice',
        'wallet', 'gift', 'bell', 'flag', 'chart-line', 'users', 'cog', 'wrench',
        'hammer', 'screwdriver', 'paint-brush', 'pen', 'pencil', 'clipboard',
        'tasks', 'list-check', 'calendar', 'clock', 'envelope', 'phone', 'globe'
    ];

    // Project colors
    const colors = [
        '#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6',
        '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
        '#ec4899', '#f43f5e', '#64748b', '#6b7280'
    ];

    // Render icons
    const iconSelector = document.getElementById('editIconSelector');
    icons.forEach(icon => {
        const iconBtn = document.createElement('button');
        iconBtn.type = 'button';
        iconBtn.className = 'icon-option';
        iconBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        iconBtn.style.cssText = 'padding: 12px; border: 2px solid transparent; border-radius: 6px; background: var(--card-background); cursor: pointer; transition: all 0.15s ease; font-size: 20px;';

        if (icon === currentIconName) {
            iconBtn.style.borderColor = 'var(--primary-color)';
        }

        iconBtn.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(btn => {
                btn.style.borderColor = 'transparent';
            });
            iconBtn.style.borderColor = 'var(--primary-color)';
            document.getElementById('editSelectedIcon').value = icon;
        });

        iconSelector.appendChild(iconBtn);
    });

    // Render colors
    const colorSelector = document.getElementById('editColorSelector');
    colors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.type = 'button';
        colorBtn.className = 'color-option';
        colorBtn.style.cssText = `width: 40px; height: 40px; border: 3px solid transparent; border-radius: 8px; background: ${color}; cursor: pointer; transition: all 0.15s ease;`;

        if (color === project.color) {
            colorBtn.style.borderColor = 'var(--text-color)';
        }

        colorBtn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.style.borderColor = 'transparent';
            });
            colorBtn.style.borderColor = 'var(--text-color)';
            document.getElementById('editSelectedColor').value = color;
        });

        colorSelector.appendChild(colorBtn);
    });

    // Event listeners
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.getElementById('cancelEditProjectBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    document.getElementById('saveEditProjectBtn').addEventListener('click', () => {
        const name = document.getElementById('editProjectName').value.trim();
        const icon = document.getElementById('editSelectedIcon').value;
        const color = document.getElementById('editSelectedColor').value;

        if (!name) {
            alert('Please enter a project name');
            return;
        }

        const updates = {
            name,
            icon: `<i class="fas fa-${icon}"></i>`,
            color
        };

        taskDataManager.updateProject(projectId, updates);
        renderSidebar();
        updateViewHeader(); // Update header if currently viewing this project
        document.body.removeChild(modal);

        Logger.debug('Project updated:', projectId);
    });

    // Focus name input
    setTimeout(() => {
        document.getElementById('editProjectName').focus();
        document.getElementById('editProjectName').select();
    }, 100);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on load
Logger.debug('todo.js loaded');

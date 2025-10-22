/**
 * Enterprise Task List - Main Application Logic
 * Integrates with TaskDataManager for data persistence
 */

// DOM Elements
const taskSidebar = document.getElementById('taskSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const projectsList = document.getElementById('projectsList');
const smartViewsList = document.getElementById('smartViewsList');
const addProjectBtn = document.getElementById('addProjectBtn');
const taskList = document.getElementById('taskList');
const kanbanBoard = document.getElementById('kanbanBoard');
const todoColumn = document.getElementById('todoColumn');
const inProgressColumn = document.getElementById('inProgressColumn');
const doneColumn = document.getElementById('doneColumn');
const blockedColumn = document.getElementById('blockedColumn');
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

// Command Palette elements
const commandPalette = document.getElementById('commandPalette');
const commandPaletteInput = document.getElementById('commandPaletteInput');
const commandPaletteResults = document.getElementById('commandPaletteResults');

// State
let taskDataManager;
let currentView = 'my-day';
let currentProjectId = null;
let selectedTaskId = null;
let currentLayout = localStorage.getItem('taskLayout') || 'list'; // 'list' or 'board'
let username = localStorage.getItem('username') || 'User';

// Command Palette state
let commandPaletteOpen = false;
let selectedCommandIndex = 0;
let filteredCommands = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    Logger.debug('Task List App: Initializing');

    // Initialize TaskDataManager
    taskDataManager = new TaskDataManager();

    // Create and insert backdrop for detail panel
    const backdrop = document.createElement('div');
    backdrop.className = 'detail-panel-backdrop';
    backdrop.id = 'detailPanelBackdrop';
    document.body.appendChild(backdrop);

    // Setup event listeners first
    setupEventListeners();

    // Render UI
    renderSidebar();

    // Restore saved layout (after event listeners are set up)
    restoreSavedLayout();

    // Update title
    updateTitle();

    // Initialize sidebar state for mobile
    if (window.innerWidth <= 768) {
        taskSidebar.classList.add('collapsed');
    }

    Logger.debug('Task List App: Initialized');
});

/**
 * Update page title
 */
function updateTitle() {
    document.title = `${username}'s Task List`;
}

/**
 * Restore saved layout preference
 */
function restoreSavedLayout() {
    Logger.debug('Restoring layout:', currentLayout);

    // Update active button
    document.querySelectorAll('.view-switcher-btn').forEach(btn => {
        if (btn.dataset.layout === currentLayout) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Switch to saved layout
    switchViewLayout(currentLayout);
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

    // Kanban board (event delegation for My Day toggles)
    kanbanBoard.addEventListener('click', (e) => {
        const myDayBtn = e.target.closest('.my-day-toggle-btn');
        if (myDayBtn) {
            const card = e.target.closest('.kanban-card');
            if (card) {
                const taskId = card.dataset.taskId;
                toggleTaskMyDay(taskId);
                e.stopPropagation();
            }
        }
    });

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

    // Command Palette keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to open command palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (!commandPaletteOpen) {
                openCommandPalette();
            }
        }

        // Command palette is open
        if (commandPaletteOpen) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeCommandPalette();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateCommands('down');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateCommands('up');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSelectedCommand();
            }
        }
    });

    // Command palette input - filter on typing
    commandPaletteInput.addEventListener('input', (e) => {
        filterCommands(e.target.value);
    });

    // Command palette backdrop click - close
    commandPalette.querySelector('.command-palette-backdrop').addEventListener('click', () => {
        closeCommandPalette();
    });

    // View switcher - Toggle between list and board
    document.querySelectorAll('.view-switcher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const layout = btn.dataset.layout;

            // Update active button
            document.querySelectorAll('.view-switcher-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch layout
            currentLayout = layout;
            switchViewLayout(layout);
        });
    });

    // Delete project button in header (using event delegation)
    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-project');
        if (deleteBtn) {
            const projectId = deleteBtn.dataset.projectId;
            deleteProject(projectId);
        }
    });

    // Sidebar toggle for mobile
    sidebarToggle.addEventListener('click', () => {
        taskSidebar.classList.toggle('collapsed');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!taskSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                taskSidebar.classList.add('collapsed');
            }
        }
    });

    // Backdrop click to close detail panel
    const backdrop = document.getElementById('detailPanelBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', hideDetailPanel);
    }

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
    const importantTasks = taskDataManager.getImportantTasks();
    const upcomingTasks = taskDataManager.getUpcomingTasks();
    const completedTasks = taskDataManager.getCompletedTasks();

    document.getElementById('myDayCount').textContent = myDayTasks.length;
    document.getElementById('inboxCount').textContent = inboxTasks.filter(t => !t.completed).length;
    document.getElementById('allCount').textContent = allTasks.length;
    document.getElementById('importantCount').textContent = importantTasks.length;
    document.getElementById('upcomingCount').textContent = upcomingTasks.length;
    document.getElementById('completedCount').textContent = completedTasks.length;

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

        projectItem.innerHTML = `
            <div class="sidebar-item-icon">${project.icon}</div>
            <div class="sidebar-item-text">${project.name}</div>
            <span class="sidebar-item-count">${projectTasks.length}</span>
            <div class="project-actions">
                <button class="project-action-btn edit" data-action="edit-project" data-project-id="${project.id}" title="Edit Project">
                    <i class="fas fa-pencil"></i>
                </button>
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

    // Re-render
    reRenderCurrentView();
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

    // Re-render
    reRenderCurrentView();
}

/**
 * Update view header
 */
function updateViewHeader() {
    let title = '';
    let subtitle = '';

    // Clear any existing header actions
    const existingActions = document.querySelector('.view-header-actions');
    if (existingActions) {
        existingActions.remove();
    }

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
        case 'important':
            title = 'Important';
            subtitle = 'High priority tasks';
            break;
        case 'upcoming':
            title = 'Upcoming';
            subtitle = 'Tasks due in the next 7 days';
            break;
        case 'completed':
            title = 'Completed';
            subtitle = 'View your accomplishments';
            break;
        case 'project':
            const project = taskDataManager.getProjectById(currentProjectId);
            if (project) {
                title = project.icon + ' ' + project.name;
                subtitle = project.description || 'Project tasks';

                // Add delete button for non-Inbox projects
                if (project.id !== DEFAULT_PROJECTS.INBOX) {
                    const headerActions = document.createElement('div');
                    headerActions.className = 'view-header-actions';
                    headerActions.innerHTML = `
                        <button class="header-action-btn delete-project" data-project-id="${project.id}" title="Delete Project">
                            <i class="fas fa-trash"></i>
                            Delete Project
                        </button>
                    `;
                    viewTitle.parentElement.appendChild(headerActions);
                }
            }
            break;
    }

    viewTitle.textContent = title;
    viewSubtitle.textContent = subtitle;
}

/**
 * Re-render current view with current layout
 */
function reRenderCurrentView() {
    if (currentLayout === 'board') {
        renderBoardView();
    } else {
        renderTasks();
    }
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
        case 'important':
            tasks = taskDataManager.getImportantTasks();
            break;
        case 'upcoming':
            tasks = taskDataManager.getUpcomingTasks();
            break;
        case 'completed':
            tasks = taskDataManager.getCompletedTasks();
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
 * Switch between list and board layouts
 */
function switchViewLayout(layout) {
    if (layout === 'board') {
        // Show board, hide list
        taskList.classList.add('hidden');
        kanbanBoard.classList.remove('hidden');
        renderBoardView();
    } else {
        // Show list, hide board
        taskList.classList.remove('hidden');
        kanbanBoard.classList.add('hidden');
        renderTasks();
    }

    // Save layout preference
    localStorage.setItem('taskLayout', layout);

    Logger.debug('Switched to layout:', layout);
}

/**
 * Render Kanban Board View
 */
function renderBoardView() {
    Logger.debug('Rendering board view for:', currentView);

    // Get tasks using same logic as list view
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
        case 'important':
            tasks = taskDataManager.getImportantTasks();
            break;
        case 'upcoming':
            tasks = taskDataManager.getUpcomingTasks();
            break;
        case 'completed':
            tasks = taskDataManager.getCompletedTasks();
            break;
        case 'project':
            if (currentProjectId) {
                tasks = taskDataManager.getTasksByProject(currentProjectId);
            }
            break;
    }

    // Filter out completed tasks for board view
    tasks = tasks.filter(t => !t.completed);

    // Group tasks by status
    const tasksByStatus = {
        'todo': tasks.filter(t => t.status === 'todo'),
        'in-progress': tasks.filter(t => t.status === 'in-progress'),
        'done': tasks.filter(t => t.status === 'done'),
        'blocked': tasks.filter(t => t.status === 'blocked')
    };

    // Clear columns
    todoColumn.innerHTML = '';
    inProgressColumn.innerHTML = '';
    doneColumn.innerHTML = '';
    blockedColumn.innerHTML = '';

    // Render cards in each column
    Object.keys(tasksByStatus).forEach(status => {
        const columnTasks = tasksByStatus[status];
        const column = getColumnElement(status);

        columnTasks.forEach(task => {
            const card = createKanbanCard(task);
            column.appendChild(card);
        });

        // Update count
        updateColumnCount(status, columnTasks.length);
    });

    // Show/hide empty state
    if (tasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }

    // Update sidebar counts
    renderSidebar();

    // Initialize SortableJS on columns
    initializeSortable();

    Logger.debug('Rendered board with', tasks.length, 'tasks');
}

/**
 * Initialize SortableJS on Kanban columns
 */
function initializeSortable() {
    const columns = [
        { element: todoColumn, status: 'todo' },
        { element: inProgressColumn, status: 'in-progress' },
        { element: doneColumn, status: 'done' },
        { element: blockedColumn, status: 'blocked' }
    ];

    columns.forEach(({ element, status }) => {
        if (element._sortable) {
            element._sortable.destroy();
        }

        const sortable = new Sortable(element, {
            group: 'shared',
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onStart: function(evt) {
                element.parentElement.classList.add('sortable-dragging');
            },
            onEnd: function(evt) {
                // Remove dragging class from all columns
                document.querySelectorAll('.kanban-column').forEach(col => {
                    col.classList.remove('sortable-dragging');
                });

                // Get task ID and new status
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.parentElement.dataset.status;
                const oldStatus = evt.from.parentElement.dataset.status;

                // Only update if status changed
                if (newStatus !== oldStatus && taskId) {
                    Logger.debug('Task moved:', taskId, 'from', oldStatus, 'to', newStatus);

                    // Update task status
                    taskDataManager.updateTask(taskId, {
                        status: newStatus,
                        completed: newStatus === 'done'
                    });

                    // Re-render board to update counts
                    renderBoardView();
                }
            }
        });

        element._sortable = sortable;
    });

    Logger.debug('Sortable initialized on all columns');
}

/**
 * Get column element by status
 */
function getColumnElement(status) {
    switch (status) {
        case 'todo': return todoColumn;
        case 'in-progress': return inProgressColumn;
        case 'done': return doneColumn;
        case 'blocked': return blockedColumn;
        default: return todoColumn;
    }
}

/**
 * Update column count badge
 */
function updateColumnCount(status, count) {
    const countId = {
        'todo': 'todoCount',
        'in-progress': 'inProgressCount',
        'done': 'doneCount',
        'blocked': 'blockedCount'
    }[status];

    const countEl = document.getElementById(countId);
    if (countEl) {
        countEl.textContent = count;
    }
}

/**
 * Create Kanban card element
 */
function createKanbanCard(task) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.dataset.taskId = task.id;

    // Due date
    let dueDateHTML = '';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today;

        dueDateHTML = `
            <div class="kanban-card-due ${isOverdue ? 'overdue' : ''}">
                <i class="fas fa-calendar"></i>
                ${dueDate.toLocaleDateString()}
            </div>
        `;
    }

    // Project
    const project = taskDataManager.getProjectById(task.projectId);
    const projectHTML = project ? `
        <div class="kanban-card-project">
            ${project.icon} ${project.name}
        </div>
    ` : '';

    // My Day badge
    const myDayBadgeHTML = task.isMyDay ? `<span class="my-day-badge" title="In My Day">✨</span>` : '';

    card.innerHTML = `
        <div class="kanban-card-header">
            <div class="kanban-card-title">
                ${myDayBadgeHTML}
                ${escapeHtml(task.text)}
            </div>
            <button class="my-day-toggle-btn ${task.isMyDay ? 'active' : ''}"
                    data-action="toggle-my-day"
                    title="${task.isMyDay ? 'Remove from My Day' : 'Add to My Day'}">
                <i class="fas fa-bookmark"></i>
            </button>
        </div>
        <div class="kanban-card-meta">
            <span class="kanban-card-priority ${task.priority}">${task.priority}</span>
            ${dueDateHTML}
            ${projectHTML}
        </div>
    `;

    // Click to open detail panel (except for My Day button)
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.my-day-toggle-btn')) {
            showTaskDetails(task.id);
        }
    });

    return card;
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

    // My Day badge
    const myDayBadgeHTML = task.isMyDay ? `<span class="my-day-badge" title="In My Day">✨</span>` : '';

    // My Day toggle button
    const myDayToggleHTML = `
        <button class="my-day-toggle-btn ${task.isMyDay ? 'active' : ''}"
                data-action="toggle-my-day"
                title="${task.isMyDay ? 'Remove from My Day' : 'Add to My Day'}">
            <i class="fas fa-bookmark"></i>
        </button>
    `;

    li.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle-complete"></div>
        <div class="task-list-item-content">
            <div class="task-list-item-title">
                ${myDayBadgeHTML}
                ${escapeHtml(task.text)}
            </div>
            ${task.description ? `<div class="task-list-item-description">${escapeHtml(task.description).substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
            <div class="task-list-item-meta">
                ${priorityHTML}
                ${dueDateHTML}
                ${subtasksHTML}
            </div>
        </div>
        ${myDayToggleHTML}
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
    } else if (action === 'toggle-my-day') {
        toggleTaskMyDay(taskId);
        e.stopPropagation(); // Prevent opening detail panel
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
    reRenderCurrentView();

    Logger.debug('Task toggled:', taskId, updates.completed);
}

/**
 * Toggle task My Day status
 */
function toggleTaskMyDay(taskId) {
    const task = taskDataManager.tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates = {
        isMyDay: !task.isMyDay
    };

    taskDataManager.updateTask(taskId, updates);
    reRenderCurrentView();

    Logger.debug('Task My Day toggled:', taskId, updates.isMyDay);
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
        .task-detail-label input[type="checkbox"] {
            width: auto; margin-right: 8px; vertical-align: middle; cursor: pointer;
        }
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

    // Show panel and backdrop
    taskDetailPanel.classList.remove('hidden');

    // Show backdrop on small screens
    if (window.innerWidth <= 900) {
        const backdrop = document.getElementById('detailPanelBackdrop');
        if (backdrop) {
            setTimeout(() => backdrop.classList.add('active'), 10);
        }
    }

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
            reRenderCurrentView();
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
    reRenderCurrentView();

    Logger.debug('Task details saved:', taskId);
}

/**
 * Hide detail panel
 */
function hideDetailPanel() {
    taskDetailPanel.classList.add('hidden');
    selectedTaskId = null;

    // Hide backdrop
    const backdrop = document.getElementById('detailPanelBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
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
    reRenderCurrentView();

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
            reRenderCurrentView();
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
    reRenderCurrentView();

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

/**
 * ========================================
 * NAVIGATION HELPERS
 * ========================================
 */

/**
 * Activate a smart view programmatically
 */
function activateSmartView(view) {
    // Update active state on smart views
    smartViewsList.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Clear project selection
    projectsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    // Update current view
    currentView = view;
    currentProjectId = null;

    // Update header
    updateViewHeader();

    // Re-render
    reRenderCurrentView();

    Logger.debug('Activated smart view:', view);
}

/**
 * Activate a project programmatically
 */
function activateProject(projectId) {
    // Update active state on projects
    projectsList.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.dataset.projectId === projectId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Clear view selection
    smartViewsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    // Update current view
    currentView = 'project';
    currentProjectId = projectId;

    // Update header
    updateViewHeader();

    // Re-render
    reRenderCurrentView();

    Logger.debug('Activated project:', projectId);
}

/**
 * ========================================
 * COMMAND PALETTE
 * ========================================
 */

/**
 * Get all available commands
 */
function getCommands() {
    const commands = [
        // Navigation - Smart Views
        {
            id: 'goto-my-day',
            name: 'Go to My Day',
            description: 'View tasks for today',
            icon: '✨',
            category: 'navigation',
            keywords: ['my', 'day', 'today', 'navigate', 'view'],
            action: () => activateSmartView('my-day')
        },
        {
            id: 'goto-inbox',
            name: 'Go to Inbox',
            description: 'View inbox tasks',
            icon: '📥',
            category: 'navigation',
            keywords: ['inbox', 'uncategorized', 'navigate', 'view'],
            action: () => activateSmartView('inbox')
        },
        {
            id: 'goto-all',
            name: 'Go to All Tasks',
            description: 'View all tasks',
            icon: '📋',
            category: 'navigation',
            keywords: ['all', 'tasks', 'everything', 'navigate', 'view'],
            action: () => activateSmartView('all')
        },
        {
            id: 'goto-important',
            name: 'Go to Important',
            description: 'View high priority tasks',
            icon: '⭐',
            category: 'navigation',
            keywords: ['important', 'priority', 'high', 'navigate', 'view'],
            action: () => activateSmartView('important')
        },
        {
            id: 'goto-upcoming',
            name: 'Go to Upcoming',
            description: 'View tasks due in next 7 days',
            icon: '📅',
            category: 'navigation',
            keywords: ['upcoming', 'soon', 'week', 'navigate', 'view'],
            action: () => activateSmartView('upcoming')
        },
        {
            id: 'goto-completed',
            name: 'Go to Completed',
            description: 'View completed tasks',
            icon: '✅',
            category: 'navigation',
            keywords: ['completed', 'done', 'finished', 'navigate', 'view'],
            action: () => activateSmartView('completed')
        },

        // Actions
        {
            id: 'new-task',
            name: 'New Task',
            description: 'Create a new task',
            icon: '➕',
            category: 'action',
            keywords: ['new', 'create', 'add', 'task', 'todo'],
            action: () => {
                closeCommandPalette();
                quickAddInput.focus();
            }
        },
        {
            id: 'new-project',
            name: 'New Project',
            description: 'Create a new project',
            icon: '📁',
            category: 'action',
            keywords: ['new', 'create', 'add', 'project', 'folder'],
            action: () => {
                closeCommandPalette();
                showAddProjectModal();
            }
        },

        // View Switching
        {
            id: 'switch-to-list',
            name: 'Switch to List View',
            description: 'View tasks as a list',
            icon: '📝',
            category: 'view',
            keywords: ['list', 'view', 'switch', 'layout'],
            action: () => {
                closeCommandPalette();
                currentLayout = 'list';
                switchViewLayout('list');
                document.querySelectorAll('.view-switcher-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.layout === 'list');
                });
            }
        },
        {
            id: 'switch-to-board',
            name: 'Switch to Board View',
            description: 'View tasks as a Kanban board',
            icon: '📊',
            category: 'view',
            keywords: ['board', 'kanban', 'view', 'switch', 'layout'],
            action: () => {
                closeCommandPalette();
                currentLayout = 'board';
                switchViewLayout('board');
                document.querySelectorAll('.view-switcher-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.layout === 'board');
                });
            }
        },

        // Settings
        {
            id: 'toggle-dark-mode',
            name: 'Toggle Dark Mode',
            description: 'Switch between light and dark theme',
            icon: '🌙',
            category: 'settings',
            keywords: ['dark', 'light', 'theme', 'mode', 'toggle'],
            action: () => {
                closeCommandPalette();
                themeManager.toggleDarkMode();
            }
        },
        {
            id: 'change-theme-color',
            name: 'Change Theme Color',
            description: 'Pick a new theme color',
            icon: '🎨',
            category: 'settings',
            keywords: ['color', 'theme', 'palette', 'change'],
            action: () => {
                closeCommandPalette();
                themeManager.openColorPicker();
            }
        },
        {
            id: 'change-username',
            name: 'Change Username',
            description: 'Update your display name',
            icon: '👤',
            category: 'settings',
            keywords: ['username', 'name', 'change', 'profile'],
            action: () => {
                closeCommandPalette();
                changeUsername();
            }
        },
        {
            id: 'export-data',
            name: 'Export All Data',
            description: 'Download backup of all data',
            icon: '💾',
            category: 'settings',
            keywords: ['export', 'backup', 'download', 'save'],
            action: () => {
                closeCommandPalette();
                exportAllData();
            }
        },
        {
            id: 'import-data',
            name: 'Import Data',
            description: 'Import backup file',
            icon: '📂',
            category: 'settings',
            keywords: ['import', 'restore', 'upload', 'load'],
            action: () => {
                closeCommandPalette();
                importInput.click();
            }
        }
    ];

    // Add dynamic project navigation commands
    const projects = taskDataManager.getAllProjects();
    projects.forEach(project => {
        if (project.id !== DEFAULT_PROJECTS.INBOX) {
            commands.push({
                id: `goto-project-${project.id}`,
                name: `Go to ${project.name}`,
                description: `Navigate to ${project.name} project`,
                icon: project.icon || '📁',
                category: 'navigation',
                keywords: ['project', 'navigate', 'goto', project.name.toLowerCase()],
                action: () => activateProject(project.id)
            });
        }
    });

    return commands;
}

/**
 * Open command palette
 */
function openCommandPalette() {
    commandPaletteOpen = true;
    commandPalette.classList.remove('hidden');
    commandPaletteInput.value = '';
    commandPaletteInput.focus();
    selectedCommandIndex = 0;

    // Show all commands initially
    filterCommands('');

    Logger.debug('Command palette opened');
}

/**
 * Close command palette
 */
function closeCommandPalette() {
    commandPaletteOpen = false;
    commandPalette.classList.add('hidden');
    commandPaletteInput.value = '';
    filteredCommands = [];

    Logger.debug('Command palette closed');
}

/**
 * Filter commands based on search query
 */
function filterCommands(query) {
    const allCommands = getCommands();

    if (!query.trim()) {
        filteredCommands = allCommands;
    } else {
        const searchTerms = query.toLowerCase().split(' ').filter(t => t);

        filteredCommands = allCommands.filter(cmd => {
            const searchText = [
                cmd.name,
                cmd.description,
                ...cmd.keywords
            ].join(' ').toLowerCase();

            return searchTerms.every(term => searchText.includes(term));
        });
    }

    selectedCommandIndex = 0;
    renderCommandResults();
}

/**
 * Render command results
 */
function renderCommandResults() {
    commandPaletteResults.innerHTML = '';

    if (filteredCommands.length === 0) {
        commandPaletteResults.innerHTML = `
            <div class="command-palette-empty">
                <div class="command-palette-empty-icon">🔍</div>
                <div class="command-palette-empty-text">No commands found</div>
            </div>
        `;
        return;
    }

    filteredCommands.forEach((cmd, index) => {
        const resultEl = document.createElement('div');
        resultEl.className = `command-result ${index === selectedCommandIndex ? 'selected' : ''}`;
        resultEl.dataset.commandId = cmd.id;
        resultEl.dataset.index = index;

        resultEl.innerHTML = `
            <div class="command-result-icon">${cmd.icon}</div>
            <div class="command-result-content">
                <div class="command-result-name">${escapeHtml(cmd.name)}</div>
                <div class="command-result-description">${escapeHtml(cmd.description)}</div>
            </div>
            <div class="command-result-category">${cmd.category}</div>
        `;

        // Click handler
        resultEl.addEventListener('click', () => {
            executeCommand(cmd);
        });

        commandPaletteResults.appendChild(resultEl);
    });
}

/**
 * Execute a command
 */
function executeCommand(command) {
    Logger.debug('Executing command:', command.id);

    try {
        command.action();
        closeCommandPalette();
    } catch (error) {
        Logger.error('Command execution failed:', error);
        if (window.errorHandler) {
            window.errorHandler.handleError(error, 'command_palette', {
                commandId: command.id
            });
        }
    }
}

/**
 * Navigate command selection
 */
function navigateCommands(direction) {
    if (filteredCommands.length === 0) return;

    if (direction === 'down') {
        selectedCommandIndex = (selectedCommandIndex + 1) % filteredCommands.length;
    } else if (direction === 'up') {
        selectedCommandIndex = selectedCommandIndex === 0
            ? filteredCommands.length - 1
            : selectedCommandIndex - 1;
    }

    renderCommandResults();

    // Scroll selected item into view
    const selectedEl = commandPaletteResults.querySelector('.command-result.selected');
    if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

/**
 * Execute selected command
 */
function executeSelectedCommand() {
    if (filteredCommands.length > 0 && selectedCommandIndex < filteredCommands.length) {
        executeCommand(filteredCommands[selectedCommandIndex]);
    }
}

// Initialize on load
Logger.debug('todo.js loaded');

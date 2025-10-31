/**
 * Task Data Manager
 * Handles data models, migration, and localStorage persistence for the enterprise task system
 */

// Data version for migration tracking
const DATA_VERSION = '2.0';

// Task Status Constants
const TaskStatus = {
    TODO: 'todo',
    IN_PROGRESS: 'in-progress',
    DONE: 'done',
    BLOCKED: 'blocked'
};

// Priority Constants (reuse existing)
const TaskPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

// Default Project IDs
const DEFAULT_PROJECTS = {
    INBOX: 'inbox',
    PERSONAL: 'personal'
};

/**
 * Task Data Model
 */
class Task {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.text = data.text || '';
        this.description = data.description || data.notes || data.summary || '';
        this.completed = data.completed || false;
        this.priority = data.priority || TaskPriority.MEDIUM;
        this.dueDate = data.dueDate || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.completedAt = data.completedAt || null;

        // New enterprise fields
        this.projectId = data.projectId || DEFAULT_PROJECTS.INBOX;
        this.parentId = data.parentId || null; // For subtasks
        this.tags = data.tags || [];
        this.status = data.status || (data.completed ? TaskStatus.DONE : TaskStatus.TODO);
        this.position = data.position || 0;

        // My Day feature
        this.isMyDay = data.isMyDay || false;

        // Subtasks
        this.subtasks = (data.subtasks || []).map(st => new Subtask(st));

        // Pomodoro tracking
        this.pomodorosCompleted = data.pomodorosCompleted || 0;
        this.estimatedPomodoros = data.estimatedPomodoros || null;

        // Activity tracking
        this.modifiedAt = data.modifiedAt || this.createdAt;
    }

    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Convert to plain object for storage
    toJSON() {
        return {
            id: this.id,
            text: this.text,
            description: this.description,
            completed: this.completed,
            priority: this.priority,
            dueDate: this.dueDate,
            createdAt: this.createdAt,
            completedAt: this.completedAt,
            projectId: this.projectId,
            parentId: this.parentId,
            tags: this.tags,
            status: this.status,
            position: this.position,
            isMyDay: this.isMyDay,
            subtasks: this.subtasks.map(st => st.toJSON()),
            pomodorosCompleted: this.pomodorosCompleted,
            estimatedPomodoros: this.estimatedPomodoros,
            modifiedAt: this.modifiedAt
        };
    }
}

/**
 * Subtask Data Model
 */
class Subtask {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.text = data.text || '';
        this.completed = data.completed || false;
        this.position = data.position || 0;
    }

    generateId() {
        return 'subtask_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            completed: this.completed,
            position: this.position
        };
    }
}

/**
 * Project Data Model
 */
class Project {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.color = data.color || '#3b82f6'; // Default blue
        this.icon = data.icon || '<i class="fas fa-folder"></i>';
        this.archived = data.archived || false;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.position = data.position || 0;

        // View preferences
        this.defaultView = data.defaultView || 'list'; // list, board, calendar
    }

    generateId() {
        return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            color: this.color,
            icon: this.icon,
            archived: this.archived,
            createdAt: this.createdAt,
            position: this.position,
            defaultView: this.defaultView
        };
    }
}

/**
 * Task Data Manager
 * Handles all data operations and localStorage persistence
 */
class TaskDataManager {
    constructor() {
        this.tasks = [];
        this.projects = [];
        this.settings = {
            dataVersion: DATA_VERSION,
            currentView: 'my-day',
            currentProjectId: null,
            sidebarCollapsed: false
        };

        this.init();
    }

    init() {
        Logger.debug('TaskDataManager: Initializing');

        // Check if migration is needed
        const needsMigration = !localStorage.getItem('tasks') && localStorage.getItem('todos');

        if (needsMigration) {
            Logger.info('TaskDataManager: Migration needed from old format');
            this.migrateFromOldFormat();
        } else {
            this.loadFromStorage();
        }

        // Ensure default projects exist
        this.ensureDefaultProjects();

        // Save initial state
        this.saveToStorage();

        Logger.debug('TaskDataManager: Initialized with', this.tasks.length, 'tasks and', this.projects.length, 'projects');
    }

    /**
     * Migrate from old todos format to new tasks format
     */
    migrateFromOldFormat() {
        Logger.info('TaskDataManager: Starting migration from old format');

        try {
            // Load old todos
            const oldTodos = JSON.parse(localStorage.getItem('todos') || '[]');
            Logger.debug('TaskDataManager: Found', oldTodos.length, 'old todos to migrate');

            // Create default projects
            this.projects = this.createDefaultProjects();

            // Convert old todos to new tasks
            this.tasks = oldTodos.map((todo, index) => {
                const task = new Task({
                    text: todo.text,
                    description: todo.summary || todo.notes || '',
                    completed: todo.completed || false,
                    priority: todo.priority || TaskPriority.MEDIUM,
                    dueDate: todo.dueDate || null,
                    createdAt: todo.createdAt || new Date().toISOString(),
                    projectId: DEFAULT_PROJECTS.INBOX,
                    status: todo.completed ? TaskStatus.DONE : TaskStatus.TODO,
                    position: index
                });

                return task;
            });

            Logger.info('TaskDataManager: Migration complete. Migrated', this.tasks.length, 'tasks');

            // Keep old todos in localStorage for safety (don't delete)
            // This allows rollback if needed

        } catch (error) {
            Logger.error('TaskDataManager: Migration failed', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'migration', {
                    operation: 'migrate_from_old_format'
                });
            }

            // Fallback: start fresh
            this.tasks = [];
            this.projects = this.createDefaultProjects();
        }
    }

    /**
     * Load data from localStorage
     */
    loadFromStorage() {
        try {
            // Load tasks
            const tasksData = localStorage.getItem('tasks');
            if (tasksData) {
                const parsed = JSON.parse(tasksData);
                this.tasks = parsed.map(t => new Task(t));
                Logger.debug('TaskDataManager: Loaded', this.tasks.length, 'tasks');
            }

            // Load projects
            const projectsData = localStorage.getItem('projects');
            if (projectsData) {
                const parsed = JSON.parse(projectsData);
                this.projects = parsed.map(p => new Project(p));
                Logger.debug('TaskDataManager: Loaded', this.projects.length, 'projects');
            }

            // Load settings
            const settingsData = localStorage.getItem('taskSettings');
            if (settingsData) {
                this.settings = { ...this.settings, ...JSON.parse(settingsData) };
            }

        } catch (error) {
            Logger.error('TaskDataManager: Error loading from storage', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'storage', {
                    operation: 'load_from_storage'
                });
            }
        }
    }

    /**
     * Save data to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks.map(t => t.toJSON())));
            localStorage.setItem('projects', JSON.stringify(this.projects.map(p => p.toJSON())));
            localStorage.setItem('taskSettings', JSON.stringify(this.settings));

            Logger.debug('TaskDataManager: Saved to storage');

        } catch (error) {
            Logger.error('TaskDataManager: Error saving to storage', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'storage', {
                    operation: 'save_to_storage'
                });
            }
        }
    }

    /**
     * Create default projects
     */
    createDefaultProjects() {
        return [
            new Project({
                id: DEFAULT_PROJECTS.INBOX,
                name: 'Inbox',
                description: 'Uncategorized tasks',
                color: '#6b7280',
                icon: '<i class="fas fa-inbox"></i>',
                position: 0
            }),
            new Project({
                id: DEFAULT_PROJECTS.PERSONAL,
                name: 'Personal',
                description: 'Personal tasks',
                color: '#10b981',
                icon: '<i class="fas fa-home"></i>',
                position: 1
            })
        ];
    }

    /**
     * Ensure default projects exist
     */
    ensureDefaultProjects() {
        if (this.projects.length === 0) {
            this.projects = this.createDefaultProjects();
        }

        // Ensure Inbox exists
        const hasInbox = this.projects.some(p => p.id === DEFAULT_PROJECTS.INBOX);
        if (!hasInbox) {
            this.projects.unshift(new Project({
                id: DEFAULT_PROJECTS.INBOX,
                name: 'Inbox',
                description: 'Uncategorized tasks',
                color: '#6b7280',
                icon: '<i class="fas fa-inbox"></i>',
                position: 0
            }));
        }
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return this.tasks;
    }

    /**
     * Get tasks by project
     */
    getTasksByProject(projectId) {
        return this.tasks.filter(t => t.projectId === projectId);
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(status) {
        return this.tasks.filter(t => t.status === status);
    }

    /**
     * Get My Day tasks
     */
    getMyDayTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        return this.tasks.filter(t => {
            if (t.completed) return false;

            // Manually added to My Day
            if (t.isMyDay) return true;

            // Overdue tasks
            if (t.dueDate) {
                const dueDate = new Date(t.dueDate);
                if (dueDate < today) return true;

                // Due today
                const dueDateStr = dueDate.toISOString().split('T')[0];
                if (dueDateStr === todayStr) return true;
            }

            return false;
        });
    }

    /**
     * Get important tasks (high priority, not completed)
     */
    getImportantTasks() {
        return this.tasks.filter(t => !t.completed && t.priority === TaskPriority.HIGH);
    }

    /**
     * Get upcoming tasks (due in next 7 days, not completed)
     */
    getUpcomingTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        return this.tasks.filter(t => {
            if (t.completed) return false;
            if (!t.dueDate) return false;

            const dueDate = new Date(t.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            return dueDate >= today && dueDate <= sevenDaysFromNow;
        });
    }

    /**
     * Get completed tasks (sorted by completion date, most recent first)
     */
    getCompletedTasks() {
        return this.tasks
            .filter(t => t.completed)
            .sort((a, b) => {
                const dateA = new Date(a.completedAt || a.modifiedAt);
                const dateB = new Date(b.completedAt || b.modifiedAt);
                return dateB - dateA; // Most recent first
            });
    }

    /**
     * Get all projects
     */
    getAllProjects() {
        return this.projects.filter(p => !p.archived).sort((a, b) => a.position - b.position);
    }

    /**
     * Get project by ID
     */
    getProjectById(projectId) {
        return this.projects.find(p => p.id === projectId);
    }

    /**
     * Add task
     */
    addTask(taskData) {
        const task = new Task(taskData);
        this.tasks.unshift(task); // Add to beginning
        this.saveToStorage();
        Logger.debug('TaskDataManager: Added task', task.id);
        return task;
    }

    /**
     * Update task
     */
    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = new Task({
                ...this.tasks[taskIndex],
                ...updates,
                modifiedAt: new Date().toISOString()
            });
            this.saveToStorage();
            Logger.debug('TaskDataManager: Updated task', taskId);
            return this.tasks[taskIndex];
        }
        return null;
    }

    /**
     * Delete task
     */
    deleteTask(taskId) {
        const initialLength = this.tasks.length;
        this.tasks = this.tasks.filter(t => t.id !== taskId);

        if (this.tasks.length < initialLength) {
            this.saveToStorage();
            Logger.debug('TaskDataManager: Deleted task', taskId);
            return true;
        }
        return false;
    }

    /**
     * Add project
     */
    addProject(projectData) {
        const project = new Project(projectData);
        this.projects.push(project);
        this.saveToStorage();
        Logger.debug('TaskDataManager: Added project', project.id);
        return project;
    }

    /**
     * Update project
     */
    updateProject(projectId, updates) {
        const projectIndex = this.projects.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
            this.projects[projectIndex] = new Project({
                ...this.projects[projectIndex],
                ...updates
            });
            this.saveToStorage();
            Logger.debug('TaskDataManager: Updated project', projectId);
            return this.projects[projectIndex];
        }
        return null;
    }

    /**
     * Delete project (and move tasks to Inbox)
     */
    deleteProject(projectId) {
        // Can't delete Inbox
        if (projectId === DEFAULT_PROJECTS.INBOX) {
            Logger.warn('TaskDataManager: Cannot delete Inbox project');
            return false;
        }

        // Move tasks to Inbox
        this.tasks.forEach(task => {
            if (task.projectId === projectId) {
                task.projectId = DEFAULT_PROJECTS.INBOX;
            }
        });

        // Delete project
        const initialLength = this.projects.length;
        this.projects = this.projects.filter(p => p.id !== projectId);

        if (this.projects.length < initialLength) {
            this.saveToStorage();
            Logger.debug('TaskDataManager: Deleted project', projectId);
            return true;
        }
        return false;
    }

    /**
     * Get tasks by tag
     */
    getTasksByTag(tag) {
        return this.tasks.filter(t => t.tags.includes(tag));
    }

    /**
     * Get all unique tags with counts
     */
    getAllTags() {
        const tagMap = new Map();

        // Count occurrences of each tag
        this.tasks.forEach(task => {
            task.tags.forEach(tag => {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
        });

        // Convert to array and sort by count (descending)
        return Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
}

// Export to global scope
window.TaskDataManager = TaskDataManager;
window.Task = Task;
window.Subtask = Subtask;
window.Project = Project;
window.TaskStatus = TaskStatus;
window.TaskPriority = TaskPriority;
window.DEFAULT_PROJECTS = DEFAULT_PROJECTS;

Logger.debug('task-data.js loaded');

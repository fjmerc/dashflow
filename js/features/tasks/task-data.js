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
 * @typedef {Object} TaskData
 * @property {string} [id] - Unique task identifier
 * @property {string} [text] - Task title/text
 * @property {string} [description] - Detailed description
 * @property {boolean} [completed] - Completion status
 * @property {string} [priority] - Priority level (low|medium|high)
 * @property {string|null} [dueDate] - Due date (ISO string)
 * @property {string} [createdAt] - Creation timestamp
 * @property {string|null} [completedAt] - Completion timestamp
 * @property {string} [projectId] - Parent project ID
 * @property {string|null} [parentId] - Parent task ID (for subtasks)
 * @property {string[]} [tags] - Array of tag names
 * @property {string} [status] - Task status (todo|in-progress|done|blocked)
 * @property {number} [position] - Sort position
 * @property {boolean} [isMyDay] - Whether task is in "My Day"
 * @property {Object[]} [subtasks] - Array of subtask objects
 * @property {number} [pomodorosCompleted] - Completed pomodoro count
 * @property {number|null} [estimatedPomodoros] - Estimated pomodoros needed
 * @property {string[]} [blockedBy] - Array of blocker IDs
 * @property {string} [modifiedAt] - Last modification timestamp
 */

/**
 * Task Data Model
 * Represents a single task with all its properties
 */
class Task {
    /**
     * Create a new Task
     * @param {TaskData} data - Task initialization data
     */
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

        // Comments and activity log
        this.comments = (data.comments || []).map(c => new Comment(c));

        // Pomodoro tracking
        this.pomodorosCompleted = data.pomodorosCompleted || 0;
        this.estimatedPomodoros = data.estimatedPomodoros || null;

        // Task dependencies
        this.blockedBy = data.blockedBy || []; // Array of task IDs that must complete first

        // Activity tracking
        this.modifiedAt = data.modifiedAt || this.createdAt;

        // Recurrence settings
        this.recurrence = data.recurrence || null; // { type: 'daily'|'weekly'|'monthly'|'custom', interval: 1, endDate: null }
        this.isRecurring = data.isRecurring || false;
        this.recurringParentId = data.recurringParentId || null;
    }

    /**
     * Generate a unique task ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Convert task to plain object for storage
     * @returns {TaskData} Plain object representation
     */
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
            comments: this.comments.map(c => c.toJSON()),
            pomodorosCompleted: this.pomodorosCompleted,
            estimatedPomodoros: this.estimatedPomodoros,
            blockedBy: this.blockedBy,
            modifiedAt: this.modifiedAt,
            recurrence: this.recurrence,
            isRecurring: this.isRecurring,
            recurringParentId: this.recurringParentId
        };
    }
}

/**
 * Comment Data Model
 */
class Comment {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.text = data.text || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.type = data.type || 'user'; // 'user' or 'system' (for activity log)
    }

    generateId() {
        return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            createdAt: this.createdAt,
            type: this.type
        };
    }
}

/**
 * @typedef {Object} SubtaskData
 * @property {string} [id] - Unique subtask identifier
 * @property {string} [text] - Subtask text
 * @property {boolean} [completed] - Completion status
 * @property {number} [position] - Sort position
 */

/**
 * Subtask Data Model
 * Represents a subtask within a parent task
 */
class Subtask {
    /**
     * Create a new Subtask
     * @param {SubtaskData} data - Subtask initialization data
     */
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
 * @typedef {Object} ProjectData
 * @property {string} [id] - Unique project identifier
 * @property {string} [name] - Project name
 * @property {string} [description] - Project description
 * @property {string} [color] - Project color (hex)
 * @property {string} [icon] - Project icon (HTML)
 * @property {boolean} [archived] - Archive status
 * @property {string} [createdAt] - Creation timestamp
 * @property {number} [position] - Sort position
 * @property {string} [defaultView] - Default view (list|board|calendar)
 */

/**
 * Project Data Model
 * Represents a project that groups tasks
 */
class Project {
    /**
     * Create a new Project
     * @param {ProjectData} data - Project initialization data
     */
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
     * @returns {Task[]} Array of all tasks
     */
    getAllTasks() {
        return this.tasks;
    }

    /**
     * Get tasks by project
     * @param {string} projectId - Project ID to filter by
     * @returns {Task[]} Tasks in the specified project
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
     * Get task by ID
     * @param {string} taskId - Task identifier
     * @returns {Task|undefined} The task or undefined if not found
     */
    getTaskById(taskId) {
        return this.tasks.find(t => t.id === taskId);
    }

    /**
     * Add a new task
     * @param {TaskData} taskData - Task data
     * @returns {Task} The newly created task
     */
    addTask(taskData) {
        const task = new Task(taskData);
        this.tasks.unshift(task); // Add to beginning
        this.saveToStorage();
        Logger.debug('TaskDataManager: Added task', task.id);
        return task;
    }

    /**
     * Update an existing task
     * @param {string} taskId - Task identifier
     * @param {Partial<TaskData>} updates - Fields to update
     * @returns {Task|null} Updated task or null if not found
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
     * Delete a task
     * @param {string} taskId - Task identifier
     * @returns {boolean} True if task was deleted
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

    /**
     * DEPENDENCY MANAGEMENT METHODS
     */

    /**
     * Check if a blocker reference is a subtask reference
     * @param {string} blockerId - The blocker ID (can be "taskId" or "taskId:subtaskId")
     * @returns {boolean} - True if it's a subtask reference
     */
    isSubtaskReference(blockerId) {
        return blockerId && blockerId.includes(':');
    }

    /**
     * Parse a blocker reference into task and subtask IDs
     * @param {string} blockerId - The blocker ID (can be "taskId" or "taskId:subtaskId")
     * @returns {Object} - { taskId, subtaskId } (subtaskId is null for task-only references)
     */
    parseBlockerReference(blockerId) {
        if (this.isSubtaskReference(blockerId)) {
            const [taskId, subtaskId] = blockerId.split(':');
            return { taskId, subtaskId };
        }
        return { taskId: blockerId, subtaskId: null };
    }

    /**
     * Get a subtask by task ID and subtask ID
     * @param {string} taskId - The parent task ID
     * @param {string} subtaskId - The subtask ID
     * @returns {Subtask|null} - The subtask object or null if not found
     */
    getSubtaskById(taskId, subtaskId) {
        const task = this.getTaskById(taskId);
        if (!task || !task.subtasks) return null;
        return task.subtasks.find(st => st.id === subtaskId) || null;
    }

    /**
     * Check if a blocker (task or subtask) is completed
     * @param {string} blockerId - The blocker ID (can be "taskId" or "taskId:subtaskId")
     * @returns {boolean} - True if the blocker is completed
     */
    isBlockerCompleted(blockerId) {
        const { taskId, subtaskId } = this.parseBlockerReference(blockerId);

        if (subtaskId) {
            // Check subtask completion
            const subtask = this.getSubtaskById(taskId, subtaskId);
            return subtask ? subtask.completed : false;
        } else {
            // Check task completion
            const task = this.getTaskById(taskId);
            return task ? task.completed : false;
        }
    }

    /**
     * Get blocker information (task and optionally subtask names)
     * @param {string} blockerId - The blocker ID (can be "taskId" or "taskId:subtaskId")
     * @returns {Object|null} - { task, subtask, displayName } or null if not found
     */
    getBlockerInfo(blockerId) {
        const { taskId, subtaskId } = this.parseBlockerReference(blockerId);
        const task = this.getTaskById(taskId);

        if (!task) return null;

        if (subtaskId) {
            const subtask = this.getSubtaskById(taskId, subtaskId);
            if (!subtask) return null;

            return {
                task,
                subtask,
                displayName: `${task.text} → ${subtask.text}`
            };
        } else {
            return {
                task,
                subtask: null,
                displayName: task.text
            };
        }
    }

    /**
     * Validate that adding a dependency won't create a circular dependency
     * Uses depth-first search (DFS) to detect cycles in the dependency graph
     * @param {string} taskId - The task that will be blocked
     * @param {string} blockerId - The blocker (can be "taskId" or "taskId:subtaskId")
     * @returns {boolean} True if no cycle would be created, false if circular
     * @example
     * // Returns true (no cycle)
     * manager.validateNoCycles('task2', 'task1');
     *
     * // Returns false (would create A -> B -> A cycle)
     * manager.addDependency('taskA', 'taskB');
     * manager.validateNoCycles('taskB', 'taskA');
     */
    validateNoCycles(taskId, blockerId) {
        // Extract the actual task ID from the blocker reference
        const { taskId: blockerTaskId } = this.parseBlockerReference(blockerId);

        // Can't block a task by itself (or by its own subtasks)
        if (taskId === blockerTaskId) {
            return false;
        }

        // Check if blockerTask depends on taskId (directly or indirectly)
        // We traverse the dependency chain at the task level
        const visited = new Set();
        const stack = [blockerTaskId];

        while (stack.length > 0) {
            const currentId = stack.pop();

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // If we found taskId in the dependency chain, we have a cycle
            if (currentId === taskId) {
                return false;
            }

            // Add all tasks that currentTask is blocked by to the stack
            const currentTask = this.getTaskById(currentId);
            if (currentTask && currentTask.blockedBy) {
                // Extract task IDs from blocker references (handles both tasks and subtasks)
                const blockerTaskIds = currentTask.blockedBy.map(bid => {
                    const { taskId: tId } = this.parseBlockerReference(bid);
                    return tId;
                });
                stack.push(...blockerTaskIds);
            }
        }

        return true; // No cycle detected
    }

    /**
     * Get all blockers for a specific task (can be tasks or subtasks)
     * @param {string} taskId - The task to check
     * @returns {Array} - Array of blocker info objects: { blockerId, task, subtask, displayName, completed, status }
     */
    getBlockingTasks(taskId) {
        const task = this.getTaskById(taskId);
        if (!task || !task.blockedBy || task.blockedBy.length === 0) {
            return [];
        }

        return task.blockedBy
            .map(blockerId => {
                const blockerInfo = this.getBlockerInfo(blockerId);
                if (!blockerInfo) return null;

                const { task: blockerTask, subtask, displayName } = blockerInfo;

                // Determine completion status and task status
                const completed = subtask ? subtask.completed : blockerTask.completed;
                const status = subtask ? (subtask.completed ? 'done' : 'todo') : blockerTask.status;

                return {
                    blockerId,
                    task: blockerTask,
                    subtask,
                    displayName,
                    completed,
                    status
                };
            })
            .filter(b => b !== null); // Filter out any invalid references
    }

    /**
     * Get all tasks that are blocked by a specific task or its subtasks
     * @param {string} taskId - The task to check
     * @returns {Task[]} - Array of tasks that depend on this task or its subtasks
     */
    getBlockedTasks(taskId) {
        return this.tasks.filter(task =>
            task.blockedBy && task.blockedBy.some(blockerId =>
                blockerId === taskId || blockerId.startsWith(`${taskId}:`)
            )
        );
    }

    /**
     * Add a dependency relationship (taskId will be blocked by blockerId)
     * @param {string} taskId - The task to block
     * @param {string} blockerId - The blocker (can be "taskId" or "taskId:subtaskId")
     * @returns {{success: boolean, message: string, autoBlocked?: boolean}} Result object
     * @example
     * // Add simple task dependency
     * manager.addDependency('task2', 'task1');
     * // { success: true, message: 'Dependency added', autoBlocked: true }
     *
     * // Add subtask dependency
     * manager.addDependency('task2', 'task1:subtask1');
     *
     * // Fails if circular
     * // { success: false, message: 'Cannot add dependency: would create circular dependency' }
     */
    addDependency(taskId, blockerId) {
        const task = this.getTaskById(taskId);

        if (!task) {
            return { success: false, message: 'Task not found' };
        }

        // Validate that the blocker exists
        const blockerInfo = this.getBlockerInfo(blockerId);
        if (!blockerInfo) {
            const isSubtask = this.isSubtaskReference(blockerId);
            return {
                success: false,
                message: isSubtask ? 'Subtask not found' : 'Blocking task not found'
            };
        }

        // Check if dependency already exists
        if (task.blockedBy && task.blockedBy.includes(blockerId)) {
            return { success: false, message: 'Dependency already exists' };
        }

        // Validate no circular dependencies
        if (!this.validateNoCycles(taskId, blockerId)) {
            return {
                success: false,
                message: 'Cannot add dependency: would create circular dependency'
            };
        }

        // Add the dependency
        if (!task.blockedBy) {
            task.blockedBy = [];
        }
        task.blockedBy.push(blockerId);

        // Auto-set status to blocked if the blocker is not completed
        const blockerCompleted = this.isBlockerCompleted(blockerId);
        if (!blockerCompleted && task.status !== TaskStatus.BLOCKED) {
            task.status = TaskStatus.BLOCKED;
        }

        this.saveToStorage();
        Logger.debug('TaskDataManager: Added dependency', taskId, 'blocked by', blockerId);

        return {
            success: true,
            message: 'Dependency added',
            autoBlocked: !blockerCompleted
        };
    }

    /**
     * Remove a dependency relationship
     * @param {string} taskId - The blocked task
     * @param {string} blockingTaskId - The blocker to remove (task ID or task:subtask ID)
     * @returns {boolean} True if dependency was removed
     */
    removeDependency(taskId, blockingTaskId) {
        const task = this.getTaskById(taskId);
        if (!task || !task.blockedBy) {
            return false;
        }

        const initialLength = task.blockedBy.length;
        task.blockedBy = task.blockedBy.filter(id => id !== blockingTaskId);

        if (task.blockedBy.length < initialLength) {
            // If no more blockers and status is blocked, auto-change to todo
            if (task.blockedBy.length === 0 && task.status === TaskStatus.BLOCKED) {
                task.status = TaskStatus.TODO;
                Logger.debug('TaskDataManager: Auto-unblocked task', taskId);
            }

            this.saveToStorage();
            Logger.debug('TaskDataManager: Removed dependency', taskId, 'from', blockingTaskId);
            return true;
        }

        return false;
    }

    /**
     * Update statuses of tasks that were blocked by a completed blocker
     * Called when a task or subtask is marked as complete
     * Automatically unblocks tasks if all their blockers are complete
     * @param {string} completedBlockerId - The blocker that was just completed (can be "taskId" or "taskId:subtaskId")
     * @returns {Task[]} Array of tasks that were unblocked
     */
    updateDependentStatuses(completedBlockerId) {
        const unblockedTasks = [];
        const blockedTasks = this.getBlockedTasks(completedBlockerId);

        blockedTasks.forEach(task => {
            // Check if ALL blockers in the dependency array are complete
            const hasIncompleteBlockers = task.blockedBy.some(blockerId => {
                return !this.isBlockerCompleted(blockerId);
            });

            // If no incomplete blockers remain and status is blocked, change to todo
            if (!hasIncompleteBlockers && task.status === TaskStatus.BLOCKED) {
                task.status = TaskStatus.TODO;
                unblockedTasks.push(task);
                Logger.debug('TaskDataManager: Auto-unblocked task', task.id, task.text);
            }
        });

        if (unblockedTasks.length > 0) {
            this.saveToStorage();
        }

        return unblockedTasks;
    }

    /**
     * Re-block tasks when a blocker becomes incomplete again
     * Called when a task or subtask is marked as incomplete after being complete
     * Automatically re-blocks dependent tasks
     * @param {string} incompletedBlockerId - The blocker that was just marked incomplete (can be "taskId" or "taskId:subtaskId")
     * @returns {Task[]} Array of tasks that were re-blocked
     */
    reBlockDependentTasks(incompletedBlockerId) {
        const reBlockedTasks = [];
        const dependentTasks = this.getBlockedTasks(incompletedBlockerId);

        dependentTasks.forEach(task => {
            // Re-block if task is not completed and not already blocked
            if (!task.completed && task.status !== TaskStatus.BLOCKED) {
                task.status = TaskStatus.BLOCKED;
                reBlockedTasks.push(task);
                Logger.debug('TaskDataManager: Auto-re-blocked task', task.id, task.text);
            }
        });

        if (reBlockedTasks.length > 0) {
            this.saveToStorage();
        }

        return reBlockedTasks;
    }

    /**
     * Add a comment to a task
     * @param {string} taskId - The task ID
     * @param {string} text - Comment text
     * @param {string} type - Comment type ('user' or 'system')
     * @returns {Comment|null} - The created comment or null
     */
    addComment(taskId, text, type = 'user') {
        const task = this.getTaskById(taskId);
        if (!task) return null;

        const comment = new Comment({ text, type });
        task.comments.push(comment);
        task.modifiedAt = new Date().toISOString();
        this.saveToStorage();
        Logger.debug('TaskDataManager: Added comment to task', taskId);
        return comment;
    }

    /**
     * Delete a comment from a task
     * @param {string} taskId - The task ID
     * @param {string} commentId - The comment ID
     * @returns {boolean} - True if comment was deleted
     */
    deleteComment(taskId, commentId) {
        const task = this.getTaskById(taskId);
        if (!task) return false;

        const initialLength = task.comments.length;
        task.comments = task.comments.filter(c => c.id !== commentId);

        if (task.comments.length < initialLength) {
            task.modifiedAt = new Date().toISOString();
            this.saveToStorage();
            Logger.debug('TaskDataManager: Deleted comment from task', taskId);
            return true;
        }
        return false;
    }

    /**
     * Duplicate a task
     * @param {string} taskId - The task ID to duplicate
     * @returns {Task|null} - The duplicated task or null
     */
    duplicateTask(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) return null;

        // Create a copy of the task data
        const taskData = {
            ...task.toJSON(),
            id: null, // Will generate new ID
            text: task.text + ' (Copy)',
            completed: false,
            completedAt: null,
            createdAt: null, // Will use current time
            modifiedAt: null,
            isMyDay: false,
            comments: [], // Don't copy comments
            subtasks: task.subtasks.map(st => ({
                ...st.toJSON(),
                id: null, // Will generate new IDs
                completed: false
            }))
        };

        const duplicatedTask = this.addTask(taskData);
        Logger.debug('TaskDataManager: Duplicated task', taskId);
        return duplicatedTask;
    }

    /**
     * Archive a project (instead of deleting)
     * @param {string} projectId - The project ID
     * @returns {boolean} - True if archived
     */
    archiveProject(projectId) {
        if (projectId === DEFAULT_PROJECTS.INBOX) {
            Logger.warn('TaskDataManager: Cannot archive Inbox project');
            return false;
        }

        return this.updateProject(projectId, { archived: true }) !== null;
    }

    /**
     * Unarchive a project
     * @param {string} projectId - The project ID
     * @returns {boolean} - True if unarchived
     */
    unarchiveProject(projectId) {
        return this.updateProject(projectId, { archived: false }) !== null;
    }

    /**
     * Get archived projects
     * @returns {Project[]} - Array of archived projects
     */
    getArchivedProjects() {
        return this.projects.filter(p => p.archived).sort((a, b) => a.position - b.position);
    }

    /**
     * Create next instance of a recurring task
     * @param {string} taskId - The recurring task ID
     * @returns {Task|null} - The new task instance or null
     */
    createNextRecurrence(taskId) {
        const task = this.getTaskById(taskId);
        if (!task || !task.isRecurring || !task.recurrence) return null;

        const { type, interval, endDate } = task.recurrence;

        // Calculate next due date
        let nextDueDate = null;
        if (task.dueDate) {
            const currentDue = new Date(task.dueDate);
            const nextDue = new Date(currentDue);

            switch (type) {
                case 'daily':
                    nextDue.setDate(currentDue.getDate() + interval);
                    break;
                case 'weekly':
                    nextDue.setDate(currentDue.getDate() + (7 * interval));
                    break;
                case 'monthly':
                    nextDue.setMonth(currentDue.getMonth() + interval);
                    break;
                case 'yearly':
                    nextDue.setFullYear(currentDue.getFullYear() + interval);
                    break;
            }

            // Check if we've passed the end date
            if (endDate && nextDue > new Date(endDate)) {
                Logger.debug('TaskDataManager: Recurring task has reached end date', taskId);
                return null;
            }

            nextDueDate = nextDue.toISOString().split('T')[0];
        }

        // Create new task instance
        const newTaskData = {
            ...task.toJSON(),
            id: null, // Generate new ID
            dueDate: nextDueDate,
            completed: false,
            completedAt: null,
            createdAt: null, // Use current time
            modifiedAt: null,
            isMyDay: false,
            comments: [],
            subtasks: task.subtasks.map(st => ({
                ...st.toJSON(),
                id: null,
                completed: false
            })),
            recurringParentId: task.recurringParentId || task.id
        };

        const newTask = this.addTask(newTaskData);
        Logger.debug('TaskDataManager: Created next recurrence for task', taskId);
        return newTask;
    }
}

// Export to global scope
window.TaskDataManager = TaskDataManager;
window.Task = Task;
window.Comment = Comment;
window.Subtask = Subtask;
window.Project = Project;
window.TaskStatus = TaskStatus;
window.TaskPriority = TaskPriority;
window.DEFAULT_PROJECTS = DEFAULT_PROJECTS;

Logger.debug('task-data.js loaded');

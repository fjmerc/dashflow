# Implementation Plan: High & Medium Priority Improvements

## Executive Summary

This plan addresses the critical technical debt items identified in the codebase analysis:

**Impact**: Reduce largest file from 3,552 → ~800 lines, improve maintainability by 60%, add type safety to 4 core modules

**Timeline**: 1-2 hours for core refactoring, 30 min for JSDoc additions

---

## Phase 1: Refactor todo.js (HIGH PRIORITY)

### Current State
- **File**: `js/features/tasks/todo.js`
- **Size**: 3,552 lines
- **Problems**:
  - Monolithic, hard to navigate
  - Mixed concerns (UI, events, data, business logic)
  - Difficult to test in isolation
  - High cognitive load for developers

### Target Architecture

```
js/features/tasks/
├── todo.js (main coordinator - ~800 lines)
│   - Initialize app
│   - Wire up modules
│   - Global state
│
├── ui/
│   ├── task-renderer.js (~600 lines)
│   │   - createTaskElement()
│   │   - renderTasks()
│   │   - renderSidebar()
│   │   - updateViewHeader()
│   │
│   ├── kanban-board.js (~400 lines)
│   │   - renderBoardView()
│   │   - createKanbanCard()
│   │   - initializeSortable()
│   │   - updateColumnCount()
│   │
│   ├── task-detail-panel.js (~700 lines)
│   │   - showTaskDetails()
│   │   - saveTaskDetails()
│   │   - Subtask management
│   │   - Tag management
│   │   - Blocker management
│   │
│   └── modals.js (~450 lines)
│       - showAddProjectModal()
│       - showEditProjectModal()
│       - Import/Export UI
│
├── interactions/
│   ├── event-handlers.js (~400 lines)
│   │   - setupEventListeners()
│   │   - handleTaskClick()
│   │   - handleViewClick()
│   │   - handleProjectClick()
│   │   - handleDragStart()
│   │
│   └── search.js (~200 lines)
│       - filterTasksBySearch()
│       - Command palette
│       - Global search
│
└── task-data.js (existing - already refactored)
```

### Refactoring Strategy

**Approach**: Incremental extraction, not big-bang rewrite

1. **Extract pure functions first** (no dependencies)
   - `escapeHtml()` → `ui/task-renderer.js`
   - `filterTasksBySearch()` → `interactions/search.js`

2. **Extract UI renderers** (depend on data manager)
   - `createTaskElement()` → `ui/task-renderer.js`
   - `createKanbanCard()` → `ui/kanban-board.js`
   - Task detail panel → `ui/task-detail-panel.js`

3. **Extract event handlers** (depend on UI + data)
   - Event setup → `interactions/event-handlers.js`
   - Search handlers → `interactions/search.js`

4. **Keep coordination in todo.js**
   - App initialization
   - Module wiring
   - Page-level state

### Implementation Steps

#### Step 1.1: Create search.js
**Time**: 15 min

```javascript
// js/features/tasks/interactions/search.js

/**
 * Task Search and Filtering
 * Handles search queries, command palette, and global search
 */

/**
 * Filter tasks by search query
 * @param {Task[]} tasks - Tasks to filter
 * @param {string} query - Search query
 * @returns {Task[]} Filtered tasks
 */
function filterTasksBySearch(tasks, query) {
    // Extract from todo.js lines 724-761
}

/**
 * Command palette system
 */
class CommandPalette {
    constructor(taskDataManager) { ... }
    open() { ... }
    close() { ... }
    filter(query) { ... }
    execute(command) { ... }
}

export { filterTasksBySearch, CommandPalette };
```

#### Step 1.2: Create kanban-board.js
**Time**: 20 min

```javascript
// js/features/tasks/ui/kanban-board.js

/**
 * Kanban Board View
 * Renders and manages the kanban board interface
 */

class KanbanBoard {
    constructor(taskDataManager, container) { ... }
    render() { ... }
    createCard(task) { ... }
    initializeSortable() { ... }
    updateColumnCount(status, count) { ... }
}

export { KanbanBoard };
```

#### Step 1.3: Create task-detail-panel.js
**Time**: 25 min

```javascript
// js/features/tasks/ui/task-detail-panel.js

/**
 * Task Detail Panel
 * Manages the task editing sidebar
 */

class TaskDetailPanel {
    constructor(taskDataManager, container) { ... }
    show(taskId) { ... }
    hide() { ... }
    save(taskId) { ... }
    // Subtask methods
    addSubtask(taskId, text) { ... }
    toggleSubtask(taskId, index) { ... }
    // Tag methods
    addTag(taskId, tag) { ... }
    removeTag(taskId, tag) { ... }
}

export { TaskDetailPanel };
```

#### Step 1.4: Create task-renderer.js
**Time**: 20 min

```javascript
// js/features/tasks/ui/task-renderer.js

/**
 * Task Rendering
 * Creates DOM elements for tasks and lists
 */

/**
 * Create task list item element
 * @param {Task} task - Task to render
 * @returns {HTMLElement} Task element
 */
function createTaskElement(task) { ... }

function renderTasks(tasks, container) { ... }
function renderSidebar(projects, tags) { ... }
function updateViewHeader(viewName, count) { ... }

export { createTaskElement, renderTasks, renderSidebar, updateViewHeader };
```

#### Step 1.5: Create event-handlers.js
**Time**: 15 min

```javascript
// js/features/tasks/interactions/event-handlers.js

/**
 * Event Handler Registration
 * Centralized event listener setup
 */

class TaskEventHandlers {
    constructor(taskDataManager, ui) { ... }

    setupEventListeners() { ... }
    handleTaskClick(e) { ... }
    handleViewClick(e) { ... }
    handleProjectClick(e) { ... }
    handleDragStart(e) { ... }
    handleQuickAdd(e) { ... }
}

export { TaskEventHandlers };
```

#### Step 1.6: Refactor todo.js as coordinator
**Time**: 20 min

```javascript
// js/features/tasks/todo.js (NEW - ~800 lines)

import { filterTasksBySearch, CommandPalette } from './interactions/search.js';
import { KanbanBoard } from './ui/kanban-board.js';
import { TaskDetailPanel } from './ui/task-detail-panel.js';
import { createTaskElement, renderTasks, renderSidebar } from './ui/task-renderer.js';
import { TaskEventHandlers } from './interactions/event-handlers.js';

// Global state
let currentView = 'my-day';
let currentProjectId = null;
let currentLayout = 'list';

// Initialize modules
const taskDataManager = new TaskDataManager();
const kanbanBoard = new KanbanBoard(taskDataManager, document.getElementById('kanban-board'));
const detailPanel = new TaskDetailPanel(taskDataManager, document.getElementById('detail-panel'));
const eventHandlers = new TaskEventHandlers(taskDataManager, { kanbanBoard, detailPanel });
const commandPalette = new CommandPalette(taskDataManager);

// App initialization
document.addEventListener('DOMContentLoaded', init);

function init() {
    eventHandlers.setupEventListeners();
    restoreSavedLayout();
    checkUrlForTask();
    renderSidebar();
    reRenderCurrentView();
}

// ... coordinator functions only
```

### Migration Path

**Phase A**: Extract without breaking (1 week)
1. Create new module files
2. Copy code to new locations
3. Export functions
4. Keep original code in todo.js

**Phase B**: Wire up imports (1 day)
1. Add `<script type="module">` to todo.html
2. Import new modules in todo.js
3. Test thoroughly

**Phase C**: Remove duplicates (1 day)
1. Delete extracted code from todo.js
2. Final testing
3. Commit

---

## Phase 2: Add JSDoc Type Annotations (HIGH PRIORITY)

### Target Modules

#### 2.1: NotesDataManager
**File**: `js/features/notes/notes.js`
**Time**: 15 min

```javascript
/**
 * @typedef {Object} NoteData
 * @property {string} [id] - Unique note identifier
 * @property {string} [title] - Note title
 * @property {string} [content] - Note content
 * @property {string[]} [tags] - Array of tag names
 * @property {string} [createdAt] - Creation timestamp
 * @property {string} [modifiedAt] - Last modification timestamp
 */

class NotesDataManager {
    /**
     * Get note by ID
     * @param {string} noteId - Note identifier
     * @returns {Note|undefined} The note or undefined if not found
     */
    getNoteById(noteId) { ... }

    /**
     * Add a new note
     * @param {NoteData} noteData - Note data
     * @returns {Note} The newly created note
     */
    addNote(noteData) { ... }
}
```

#### 2.2: ErrorHandler
**File**: `js/core/error-handler.js`
**Time**: 10 min

```javascript
/**
 * @typedef {Object} ErrorContext
 * @property {string} operation - Operation that failed
 * @property {Object} [data] - Additional context data
 */

class ErrorHandler {
    /**
     * Handle an error with user-friendly messaging
     * @param {Error} error - The error object
     * @param {string} type - Error type (storage|network|validation|unknown)
     * @param {ErrorContext} [context] - Additional context
     */
    handleError(error, type, context) { ... }
}
```

#### 2.3: ModalManager
**File**: `js/core/modal-manager.js`
**Time**: 10 min

```javascript
/**
 * @typedef {Object} ModalOptions
 * @property {string} title - Modal title
 * @property {string} content - Modal content (HTML string)
 * @property {Function} [onConfirm] - Confirm callback
 * @property {Function} [onCancel] - Cancel callback
 * @property {boolean} [dangerous] - Show as dangerous action
 */

class ModalManager {
    /**
     * Show a modal dialog
     * @param {ModalOptions} options - Modal configuration
     * @returns {Promise<boolean>} Resolves to true if confirmed
     */
    show(options) { ... }
}
```

---

## Phase 3: Event Bus Pattern (MEDIUM PRIORITY)

### Current Problem
Components are tightly coupled through direct function calls:

```javascript
// In todo.js
function toggleTaskComplete(taskId) {
    taskDataManager.updateTask(taskId, { completed: true });
    renderTasks();           // Direct coupling
    updateSidebar();         // Direct coupling
    refreshKanban();         // Direct coupling
}
```

### Target Architecture

```javascript
// With event bus
function toggleTaskComplete(taskId) {
    taskDataManager.updateTask(taskId, { completed: true });
    eventBus.emit('task:updated', { taskId, field: 'completed' });
}

// Listeners (decoupled)
eventBus.on('task:updated', renderTasks);
eventBus.on('task:updated', updateSidebar);
eventBus.on('task:updated', refreshKanban);
```

### Implementation

**Time**: 20 min

```javascript
// js/core/event-bus.js

/**
 * Lightweight Event Bus
 * Enables pub-sub communication between components
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event payload
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} handler:`, error);
            }
        });
    }

    /**
     * Subscribe to event (one-time only)
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback(data);
        });
    }
}

// Global singleton
window.eventBus = new EventBus();
```

### Event Naming Convention

```
domain:action[:detail]

Examples:
- task:created
- task:updated
- task:deleted
- task:completed
- task:dependency:added
- project:created
- note:saved
- search:query:changed
- view:changed
```

### Integration Points

```javascript
// TaskDataManager emits events
class TaskDataManager {
    addTask(data) {
        const task = new Task(data);
        this.tasks.unshift(task);
        this.saveToStorage();

        eventBus.emit('task:created', { task });
        return task;
    }

    updateTask(taskId, updates) {
        // ... update logic
        eventBus.emit('task:updated', { taskId, updates, task });
        return task;
    }
}

// UI components listen
eventBus.on('task:created', () => reRenderCurrentView());
eventBus.on('task:updated', () => reRenderCurrentView());
eventBus.on('task:deleted', () => reRenderCurrentView());

// Detail panel listens
eventBus.on('task:updated', ({ taskId }) => {
    if (detailPanel.isShowing(taskId)) {
        detailPanel.refresh();
    }
});
```

---

## Phase 4: Integration Tests (HIGH PRIORITY)

### Test Scenarios

#### 4.1: Task Dependency Cascade
**File**: `tests/integration/task-dependencies.test.js`

```javascript
describe('Task Dependency Cascade', () => {
    it('should auto-unblock dependent tasks when blocker completes', () => {
        // Create task A
        const taskA = manager.addTask({ text: 'Task A' });

        // Create task B blocked by A
        const taskB = manager.addTask({ text: 'Task B' });
        manager.addDependency(taskB.id, taskA.id);

        expect(taskB.status).toBe('blocked');

        // Complete task A
        manager.updateTask(taskA.id, { completed: true });
        manager.updateDependentStatuses(taskA.id);

        // Task B should auto-unblock
        expect(manager.getTaskById(taskB.id).status).toBe('todo');
    });
});
```

#### 4.2: Import/Export Round-Trip
**File**: `tests/integration/import-export.test.js`

```javascript
describe('Import/Export Round-Trip', () => {
    it('should preserve all data through export/import cycle', () => {
        // Create complex data
        const project = manager.addProject({ name: 'Test Project' });
        const task = manager.addTask({
            text: 'Test Task',
            projectId: project.id,
            tags: ['urgent'],
            subtasks: [{ text: 'Subtask 1' }]
        });

        // Export
        const exported = exportData();

        // Clear
        localStorage.clear();

        // Import
        importData(exported);

        // Verify
        const newManager = new TaskDataManager();
        expect(newManager.tasks).toHaveLength(1);
        expect(newManager.tasks[0].tags).toContain('urgent');
    });
});
```

---

## Implementation Timeline

### Session 1: Core Refactoring (90 min)
- [x] ~~Create implementation plan~~ (15 min)
- [ ] Extract search.js (15 min)
- [ ] Extract kanban-board.js (20 min)
- [ ] Extract task-detail-panel.js (25 min)
- [ ] Extract task-renderer.js (20 min)
- [ ] Refactor todo.js (15 min)

### Session 2: JSDoc & Event Bus (45 min)
- [ ] Add JSDoc to NotesDataManager (15 min)
- [ ] Add JSDoc to ErrorHandler (10 min)
- [ ] Add JSDoc to ModalManager (10 min)
- [ ] Implement EventBus (20 min)

### Session 3: Integration & Testing (30 min)
- [ ] Write integration tests (20 min)
- [ ] Update todo.html imports (5 min)
- [ ] End-to-end testing (5 min)

### Session 4: Commit & Document (15 min)
- [ ] Update ARCHITECTURE.md (10 min)
- [ ] Commit with detailed message (5 min)

**Total**: ~3 hours

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Largest File** | 3,552 lines | ~800 lines | -77% |
| **Module Count** | 3 files | 8 files | +167% |
| **Type Coverage** | 1 module | 5 modules | +400% |
| **Integration Tests** | 0 | 2 suites | ∞ |
| **Coupling** | High (direct calls) | Low (event bus) | Decoupled |
| **Code Quality** | 8.5/10 | **9.2/10** | +0.7 |

---

## Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Incremental extraction, keep both old and new code until fully tested

### Risk 2: Module Loading Issues
**Mitigation**: Test in browser with DevTools, verify all imports resolve

### Risk 3: Performance Regression
**Mitigation**: Event bus is lightweight (<50 lines), minimal overhead

---

## Rollback Plan

If issues arise:
1. Revert commits (git revert)
2. Remove new module files
3. Restore original todo.js from git history
4. Keep JSDoc changes (safe)

---

## Next Steps After This Plan

1. **Bundle Optimization** - Minify CSS/JS for production
2. **Pagination** - Add virtual scrolling for large lists
3. **Accessibility Audit** - WCAG 2.1 Level AA compliance
4. **Performance Profiling** - Lighthouse audit and optimization

---

**Plan Created**: 2024
**Estimated Completion**: 3 hours
**Priority**: High (Technical Debt Reduction)

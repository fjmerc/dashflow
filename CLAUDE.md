# CLAUDE.md

This file serves as the operational constitution for Claude Code when working in this repository. It defines project architecture, coding standards, workflow procedures, and operational boundaries.

## Project Overview

**Type**: Vanilla JavaScript Progressive Web App (PWA)
**Purpose**: Personal dashboard with link management and enterprise task management system
**No Build System**: Direct HTML/CSS/JS served via HTTP server
**Target Browsers**: Modern browsers with Service Worker support
**Architecture**: Multi-page application with shared utilities and localStorage-based state

## Development Commands

This is a vanilla JavaScript PWA with no build system. Development is done by:
- Serving files through a local HTTP server (required for PWA features)
- Opening browser dev tools for debugging
- Testing PWA functionality requires HTTPS in production

**IMPORTANT**: Never suggest build tools, bundlers, or transpilers. This is intentionally a vanilla JS project.

### Common Development Commands

```bash
# Serve the application locally (Python 3)
python3 -m http.server 8000

# Serve the application locally (Node.js)
npx http-server -p 8000

# View git status
git status

# Create feature branch
git checkout -b feature/feature-name

# Commit changes (always use conventional commits)
git add .
git commit -m "feat: description"

# Check service worker cache version
grep CACHE_NAME sw.js
```

## File Boundaries and Edit Permissions

### Files You CAN Edit Freely
**Application Logic:**
- `script.js` - Dashboard functionality
- `todo.js` - Task management UI
- `task-data.js` - Task data models

**Shared Utilities:**
- `theme.js`, `export-utils.js`, `logger.js`
- `keyboard-nav.js`, `auto-backup.js`
- `input-validator.js`, `error-handler.js`, `modal-manager.js`
- `retirement-timer.js`

**Styles and Pages:**
- `styles.css` - All application styles
- `index.html`, `todo.html`, `help.html` - Application pages

**Configuration:**
- `sw.js` - Service worker (increment CACHE_NAME when editing)
- `manifest.json` - PWA configuration
- `README.md`, `help.html` - Documentation

### Files You Should NOT Edit
- `.gitignore` - Git configuration (ask user first)
- Any user data in localStorage (NEVER clear or manipulate directly)
- Browser cache or IndexedDB (use proper APIs only)

### Critical Edit Rules
1. **NEVER delete localStorage data**: User data is sacred
2. **ALWAYS increment service worker version**: When editing cached files
3. **ALWAYS update export-utils.js**: When adding new localStorage keys
4. **READ before EDIT**: Always read file contents before making changes
5. **Maintain backward compatibility**: Don't break existing user data

## Architecture Overview

### State Management
The application uses a decentralized state management pattern:
- **localStorage as single source of truth**: All data persists in browser localStorage with specific keys:
  - `links` - Dashboard bookmarks/links
  - `tasks` - Task management system tasks (enterprise format)
  - `projects` - Task management projects
  - `taskSettings` - Task management view state and preferences
  - `todos` - Legacy todo format (auto-migrated to `tasks` on load)
  - `username`, `theme`, `primaryColor` - User settings
  - `retirementTimer` - Retirement countdown data
- **Cross-page synchronization**: ThemeManager listens to storage events to sync themes between dashboard and todo pages
- **History system**: Links state changes are tracked in memory for undo functionality with debounced saves
- **Migration system**: task-data.js automatically migrates legacy `todos` format to new `tasks/projects/taskSettings` format

### Multi-Page Application Structure
- `index.html` - Main dashboard with link management
- `todo.html` - Enterprise task management system with projects, tags, subtasks, kanban board
- Both pages share common utilities (`theme.js`, `export-utils.js`) but maintain separate state

### Key Architectural Patterns

#### 1. Unified Data Export/Import System
`export-utils.js` provides versioned backup system:
- **Version 2.0** (current): Includes bookmarks, tasks, projects, taskSettings, settings, and retirement timer
- **Version 1.2** (legacy): Includes bookmarks, todos (old format), settings, and retirement timer
- **Version 1.0** (legacy): Dashboard-only backups
- Full backward compatibility: Old backups auto-migrate to new format on import
- Cross-page data integration: Same backup file works across dashboard and task pages
- `exportAllData()` creates comprehensive backups with all application data
- `importAllData()` handles version detection and appropriate data restoration

#### 2. Theme System (`theme.js`)
ThemeManager class provides:
- Centralized theme state management
- Cross-page synchronization via storage events
- Dynamic CSS custom property updates
- Shared theme controls across pages

#### 3. Enterprise Task Management System
The task system uses a layered architecture:
- **Data Layer** (`task-data.js`): TaskDataManager class handles all data operations
  - Task, Subtask, and Project model classes with validation
  - localStorage persistence with automatic migration from legacy format
  - Smart query methods (getMyDayTasks, getImportantTasks, etc.)
  - Default project creation (Inbox, Personal)
- **UI Layer** (`todo.js`): Handles rendering and user interactions
  - Smart Views: My Day, Inbox, All Tasks, Important, Upcoming, Completed
  - Project management with custom colors/icons
  - Tag filtering and sidebar navigation
  - Kanban board view with drag & drop
  - Task detail panel with subtasks, priority, due dates
  - Command palette for quick navigation
- **Storage Keys**:
  - `tasks` - Array of task objects with all metadata
  - `projects` - Array of project definitions
  - `taskSettings` - Current view state and preferences

#### 4. Modular Feature Integration
Features are implemented as separate modules that integrate with core state:
- `retirement-timer.js` - Self-contained countdown feature with settings modal
- `auto-backup.js` - Automatic backup scheduling with version 2.0 format
- Individual features can be toggled on/off with persistent settings

### Data Flow

#### Dashboard (Link Management)
1. User actions trigger state changes in JavaScript
2. State is immediately reflected in DOM
3. Changes are debounced and saved to localStorage (`links` key)
4. History is maintained for undo functionality
5. Export system creates unified backups of all application data

#### Task Management System
1. User creates/edits tasks through UI (todo.js)
2. TaskDataManager validates and processes changes
3. State updated in memory (tasks, projects, taskSettings)
4. Changes immediately saved to localStorage (synchronous)
5. UI re-rendered to reflect new state
6. Export system includes all task data in version 2.0 backups

#### Data Migration Flow
1. On task page load, TaskDataManager.init() runs
2. Checks if `tasks` key exists in localStorage
3. If missing but `todos` exists: Runs migration to convert legacy format
4. If `tasks` exists: Loads directly from new format
5. Ensures default projects exist (Inbox, Personal)
6. Saves to localStorage in new format

### Security Considerations
- Content Security Policy implemented in HTML
- Input sanitization for all user data
- URL validation for link entries
- XSS prevention through proper DOM manipulation

### PWA Implementation
- Service Worker (`sw.js`) caches static assets for offline functionality
- Manifest file enables installation
- Local storage provides offline data persistence

## Key Integration Points

When adding new features:
- **Integrate with `export-utils.js` for data backup/restore**:
  - Add new localStorage keys to `exportAllData()` function
  - Add import logic to `importAllData()` with version checking
  - Bump version number if adding new data structures
  - Test backward compatibility with old backups
- **Use ThemeManager for consistent theming**:
  - Access via global `themeManager` instance
  - Theme changes sync automatically across pages
- **Follow localStorage key naming conventions**:
  - Use descriptive, lowercase keys (e.g., `tasks`, `projects`, `taskSettings`)
  - Document all keys in this file's State Management section
  - Use JSON.parse/stringify for complex data structures
- **Add to service worker cache if creating new static files**:
  - Update `ASSETS_TO_CACHE` array in `sw.js`
  - Increment `CACHE_NAME` version (e.g., `dashboard-v17` → `dashboard-v18`)
- **Consider cross-page synchronization needs**:
  - Use storage events for real-time sync if needed
  - Test data flow between index.html and todo.html

## Task Management System Data Models

### Task Object
```javascript
{
  id: string,              // Unique identifier
  text: string,            // Task title
  description: string,     // Task notes/description
  completed: boolean,      // Completion status
  priority: string,        // 'low' | 'medium' | 'high'
  dueDate: string|null,    // ISO date string
  createdAt: string,       // ISO timestamp
  completedAt: string|null,// ISO timestamp
  projectId: string,       // Project assignment
  parentId: string|null,   // For subtasks (unused currently)
  tags: string[],          // Array of tag strings
  status: string,          // 'todo' | 'in-progress' | 'done' | 'blocked'
  position: number,        // Display order
  isMyDay: boolean,        // Manually added to My Day
  subtasks: Subtask[],     // Array of subtask objects
  modifiedAt: string       // ISO timestamp
}
```

### Project Object
```javascript
{
  id: string,              // Unique identifier
  name: string,            // Project name
  description: string,     // Project description
  color: string,           // Hex color code
  icon: string,            // Font Awesome HTML string
  archived: boolean,       // Archive status
  createdAt: string,       // ISO timestamp
  position: number,        // Display order
  defaultView: string      // 'list' | 'board' | 'calendar'
}
```

### Subtask Object
```javascript
{
  id: string,              // Unique identifier
  text: string,            // Subtask title
  completed: boolean,      // Completion status
  position: number         // Display order
}
```

## Coding Standards and Conventions

### JavaScript Style
- **ES6+ syntax**: Use modern JavaScript (const/let, arrow functions, template literals)
- **No frameworks**: Vanilla JavaScript only - no React, Vue, Angular, etc.
- **No jQuery**: Use native DOM APIs (querySelector, addEventListener, etc.)
- **Functional patterns**: Prefer pure functions and immutability where practical
- **Clear naming**: Use descriptive variable/function names (e.g., `handleProjectClick`, not `hpc`)
- **Comments**: Add JSDoc comments for public functions, inline comments for complex logic

### File Organization
- **Separation of concerns**: Each JS file has a specific purpose
  - `script.js` - Main dashboard logic
  - `todo.js` - Task management UI
  - `task-data.js` - Task data models and storage
  - Shared utilities: `theme.js`, `export-utils.js`, `logger.js`, etc.
- **No inline JavaScript**: Keep JS in separate files, reference via `<script>` tags
- **Load order matters**: Utilities must load before dependent files

### CSS/HTML Standards
- **CSS Variables**: Use CSS custom properties for theming (e.g., `--primary-color`)
- **BEM-like naming**: Use descriptive class names (e.g., `.task-detail-panel`, `.sidebar-item`)
- **Semantic HTML**: Use appropriate HTML5 elements (`<header>`, `<nav>`, `<main>`, etc.)
- **Accessibility**: Include ARIA labels, keyboard navigation, screen reader support

### localStorage Management
- **NEVER use localStorage.clear()**: This would delete user data across all keys
- **Always validate before parsing**: Use try-catch when parsing JSON from localStorage
- **Synchronous saves**: Task data saves immediately (no debouncing)
- **Debounced saves**: Link data uses debouncing to reduce writes
- **Key consistency**: Use documented keys (see State Management section)

## Operational Guidelines

### When Making Changes

**ALWAYS:**
1. **Read before writing**: Use Read tool to examine files before editing
2. **Update service worker**: Increment `CACHE_NAME` version in `sw.js` when modifying cached files
3. **Update export/import**: Add new localStorage keys to `exportAllData()` and `importAllData()`
4. **Test backward compatibility**: Ensure old backups still work after schema changes
5. **Maintain migration paths**: Don't break existing data - provide migration code
6. **Use sequential thinking**: For complex features, plan before implementing
7. **Track with TodoWrite**: Use todo list for multi-step tasks

**NEVER:**
1. **Don't use frameworks**: No React, Vue, Angular, or any framework
2. **Don't add build steps**: No webpack, babel, rollup, or bundlers
3. **Don't break localStorage**: Never clear storage, always validate keys
4. **Don't skip version bumps**: Always update service worker cache version
5. **Don't ignore backups**: Always ensure new features integrate with export/import
6. **Don't use inline styles heavily**: Prefer CSS classes over style attributes

### Git Commit Standards
- Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Include detailed descriptions for complex changes
- Always add footer with Claude Code attribution
- Group related changes in single commits

### User Experience Principles
- **Progressive enhancement**: Core functionality works without JavaScript where possible
- **Responsive design**: Support desktop, tablet, and mobile viewports
- **Keyboard navigation**: All features accessible via keyboard
- **Visual feedback**: Loading states, success/error messages, hover effects
- **Data safety**: Confirm destructive actions, provide undo where possible

## Common Pitfalls to Avoid

### Data Loss Scenarios
❌ Using `localStorage.clear()` - Deletes all user data
❌ Not updating export/import when adding localStorage keys - Backups incomplete
❌ Breaking migration from legacy format - Users lose old data
❌ Not validating JSON.parse() - App crashes on corrupted data

### Performance Issues
❌ Not debouncing frequent updates - Excessive localStorage writes
❌ Not using event delegation - Too many event listeners
❌ Inline styles in loops - Poor rendering performance
❌ Not cleaning up event listeners - Memory leaks

### State Management Issues
❌ Directly mutating state - Use TaskDataManager methods
❌ Not calling saveToStorage() after changes - Data not persisted
❌ Forgetting to re-render UI after state changes - Stale display
❌ Cross-page state conflicts - Use proper localStorage keys

## Testing Checklist

When implementing new features, verify:
- [ ] Works in both light and dark modes
- [ ] Responsive on mobile, tablet, desktop
- [ ] Keyboard navigation functional
- [ ] Data persists after page reload
- [ ] Export includes new data
- [ ] Import restores new data correctly
- [ ] Old backups still import successfully
- [ ] Service worker cache updated
- [ ] No console errors or warnings
- [ ] Proper error handling with user-friendly messages

## Quick Reference: File Purposes

**Core Pages:**
- `index.html` - Main dashboard (link management)
- `todo.html` - Task management system
- `help.html` - User documentation

**JavaScript - Dashboard:**
- `script.js` - Link management, sections, favorites, undo

**JavaScript - Task System:**
- `todo.js` - UI rendering, interactions, views, kanban board
- `task-data.js` - Data models, storage, migration, queries

**JavaScript - Shared Utilities:**
- `theme.js` - Theme management, dark mode, color schemes
- `export-utils.js` - **CRITICAL** - Backup/restore, version 2.0 format
- `logger.js` - Logging with severity levels
- `keyboard-nav.js` - Global keyboard shortcuts
- `auto-backup.js` - Automatic backup scheduling
- `input-validator.js` - Input sanitization, XSS prevention
- `error-handler.js` - Error logging and user feedback
- `modal-manager.js` - Modal dialog system
- `retirement-timer.js` - Retirement countdown feature

**PWA Files:**
- `sw.js` - Service worker (offline functionality)
- `manifest.json` - PWA configuration

**Styles:**
- `styles.css` - All application styles (shared across pages)

## Code Examples and Patterns

### Adding a New localStorage Key

When adding new data that needs persistence:

```javascript
// 1. Save data
const myNewData = { setting: 'value' };
localStorage.setItem('myNewKey', JSON.stringify(myNewData));

// 2. Load data with validation
function loadMyNewData() {
    try {
        const data = localStorage.getItem('myNewKey');
        return data ? JSON.parse(data) : { /* default values */ };
    } catch (error) {
        Logger.error('Failed to load myNewKey:', error);
        return { /* default values */ };
    }
}

// 3. Update export-utils.js exportAllData()
const myNewData = JSON.parse(localStorage.getItem('myNewKey') || 'null');
const exportData = {
    version: '2.1', // Increment version
    data: {
        // ... existing keys
        myNewKey: myNewData // Add new key
    }
};

// 4. Update export-utils.js importAllData()
if (parseFloat(importedData.version) >= 2.1) {
    if (importedData.data.myNewKey) {
        localStorage.setItem('myNewKey', JSON.stringify(importedData.data.myNewKey));
    }
}

// 5. Update service worker
// In sw.js: const CACHE_NAME = 'dashboard-v20'; // Increment
```

### Adding a Task Management Feature

When extending the task system:

```javascript
// 1. Add to Task model (task-data.js)
class Task {
    constructor(data = {}) {
        // ... existing fields
        this.myNewField = data.myNewField || 'default';
    }

    toJSON() {
        return {
            // ... existing fields
            myNewField: this.myNewField
        };
    }
}

// 2. Add UI in todo.js
function renderTaskDetail(task) {
    return `
        <!-- ... existing fields -->
        <div class="detail-field">
            <label>My New Field</label>
            <input type="text" value="${escapeHtml(task.myNewField)}">
        </div>
    `;
}

// 3. Add update handler
taskDataManager.updateTask(taskId, {
    myNewField: newValue
});

// 4. No export-utils.js change needed (tasks already exported)
```

### Adding Event Listeners

Always use event delegation for dynamic content:

```javascript
// ❌ BAD - Creates listener for each item
items.forEach(item => {
    item.addEventListener('click', handleClick);
});

// ✅ GOOD - Single listener on parent
parentElement.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (item) {
        handleClick(item);
    }
});
```

### Working with TaskDataManager

Never manipulate tasks directly - always use TaskDataManager:

```javascript
// ❌ BAD - Direct manipulation
tasks.push(newTask);
localStorage.setItem('tasks', JSON.stringify(tasks));

// ✅ GOOD - Use TaskDataManager
const task = taskDataManager.addTask({
    text: 'New task',
    projectId: 'inbox'
});
// TaskDataManager handles validation, ID generation, and saving

// ✅ Updating tasks
taskDataManager.updateTask(taskId, {
    completed: true,
    completedAt: new Date().toISOString()
});

// ✅ Deleting tasks
taskDataManager.deleteTask(taskId);

// ✅ Querying tasks
const myDayTasks = taskDataManager.getMyDayTasks();
const importantTasks = taskDataManager.getImportantTasks();
```

### Theme Integration

Use CSS variables for themeable colors:

```css
/* ✅ GOOD - Uses theme variables */
.my-component {
    background: var(--bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
}

/* ❌ BAD - Hard-coded colors */
.my-component {
    background: #ffffff;
    color: #000000;
}
```

### Error Handling Pattern

Always handle errors gracefully:

```javascript
function myFeature() {
    try {
        // Attempt operation
        const data = JSON.parse(localStorage.getItem('myKey'));
        processData(data);
    } catch (error) {
        // Log error
        Logger.error('myFeature failed:', error);

        // Use error handler if available
        if (window.errorHandler) {
            window.errorHandler.handleError(error, 'feature', {
                operation: 'my_feature'
            });
        }

        // Provide user feedback
        alert('Something went wrong. Please try again.');

        // Return safe default
        return defaultValue;
    }
}
```

### Modal Dialog Pattern

Use modal-manager for consistent dialogs:

```javascript
// Simple confirmation
if (window.showModal) {
    showModal(
        'Confirm Action',
        'Are you sure you want to do this?',
        () => {
            // User clicked Yes
            performAction();
        },
        () => {
            // User clicked No (optional)
            cancelAction();
        }
    );
} else {
    // Fallback to native confirm
    if (confirm('Are you sure?')) {
        performAction();
    }
}
```

## Session Persistence and Context

This file is loaded at the **start of every Claude Code session** in this directory. This means:

- ✅ **No re-explanation needed**: Project architecture is always in context
- ✅ **Consistent coding style**: Standards apply across all sessions
- ✅ **Reliable task execution**: Critical rules (like backup integration) are never forgotten
- ✅ **Project-aware decisions**: Claude knows this is vanilla JS, not React
- ✅ **Persistent knowledge**: Common pitfalls documented once, remembered always

### What This Enables

**Without CLAUDE.md:**
- "Don't use React" → Suggests React components
- "Update backups" → Forgets to update export-utils.js
- "Increment cache" → Skips service worker version bump

**With CLAUDE.md:**
- Automatically uses vanilla JS patterns
- Always updates export/import for new localStorage keys
- Never forgets to bump service worker cache version
- Follows established conventions without prompting

## Emergency Contacts

If you encounter:
- **Data loss bug**: Immediately stop and verify export/import logic
- **Breaking changes**: Ensure migration path exists for existing users
- **localStorage conflicts**: Check key naming and cross-page compatibility
- **Service worker issues**: Verify cache version bumped and ASSETS_TO_CACHE updated
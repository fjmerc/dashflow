# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a vanilla JavaScript PWA with no build system. Development is done by:
- Serving files through a local HTTP server (required for PWA features)
- Opening browser dev tools for debugging
- Testing PWA functionality requires HTTPS in production

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
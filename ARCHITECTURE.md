# DashFlow Architecture

## Overview

DashFlow is a **privacy-first Progressive Web App (PWA)** built with vanilla JavaScript, designed for personal productivity management. The architecture prioritizes **zero external dependencies**, **offline-first capabilities**, and **security**.

## Design Principles

1. **Privacy First**: All data stored locally in browser's localStorage, no backend required
2. **Offline Capable**: Full PWA support with service worker caching
3. **Zero Framework Overhead**: Vanilla JS for maximum performance and simplicity
4. **Security by Design**: Multi-layer XSS protection and input validation
5. **Progressive Enhancement**: Works on modern browsers without build tools

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vanilla JavaScript (ES6+) | Application logic |
| **Styling** | Pure CSS3 + CSS Variables | Theming and responsive design |
| **Storage** | localStorage API | Client-side data persistence |
| **PWA** | Service Worker (sw.js) | Offline caching and installability |
| **Icons** | Font Awesome (self-hosted) | UI icons (offline support) |
| **Drag & Drop** | Sortable.js (CDN) | List reordering |
| **Testing** | Vitest + happy-dom | Unit and integration tests |

## Project Structure

```
dashflow/
├── index.html              # Dashboard page (link management)
├── todo.html               # Task management page
├── help.html               # Documentation page
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
│
├── js/
│   ├── core/               # Shared utilities (2,400+ lines)
│   │   ├── logger.js       # Configurable logging system
│   │   ├── theme.js        # Theme and color management
│   │   ├── error-handler.js    # Global error handling
│   │   ├── input-validator.js  # XSS protection & validation
│   │   ├── modal-manager.js    # Reusable modal system
│   │   ├── keyboard-nav.js     # Keyboard shortcuts
│   │   └── export-utils.js     # Data import/export
│   │
│   └── features/           # Feature modules (12,300+ lines)
│       ├── dashboard/
│       │   └── script.js       # Link management (858 lines)
│       ├── tasks/
│       │   ├── todo.js         # Task UI & interactions (3,552 lines)
│       │   ├── task-data.js    # Data models & persistence (927 lines)
│       │   └── pomodoro.js     # Timer system (389 lines)
│       ├── notes/
│       │   ├── notes.js        # Notes data layer (224 lines)
│       │   └── notes-ui.js     # Notes UI (668 lines)
│       └── retirement/
│           ├── retirement-timer.js # Timer logic (461 lines)
│           └── auto-backup.js      # Backup automation (480 lines)
│
├── styles.css              # Global styles (4,754 lines)
├── assets/                 # Static assets
└── tests/                  # Test suite
    ├── setup.js            # Test configuration
    └── unit/               # Unit tests
        ├── task-data-manager.test.js (68 tests)
        └── input-validator.test.js   (66 tests)
```

## Core Architecture Patterns

### 1. Manager Pattern

Each major feature uses a **Manager class** as a single source of truth:

```javascript
// Example: TaskDataManager
class TaskDataManager {
    constructor() {
        this.tasks = [];
        this.projects = [];
        this.init();
    }

    // All operations go through the manager
    addTask(data) { ... }
    updateTask(id, updates) { ... }
    deleteTask(id) { ... }
    getTaskById(id) { ... }
    // ... etc
}

// Global singleton instance
window.taskDataManager = new TaskDataManager();
```

**Benefits:**
- Centralized business logic
- Single source of truth for each domain
- Easier to test and refactor
- Clear API surface

**Managers:**
- `TaskDataManager` - Task CRUD, dependencies, filtering
- `NotesDataManager` - Notes management
- `PomodoroTimer` - Timer state and control
- `ThemeManager` - Theme persistence
- `ErrorHandler` - Error capture and display
- `ModalManager` - Modal dialog management

### 2. Class-Based Data Models

Smart model classes with built-in serialization:

```javascript
class Task {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.text = data.text || '';
        this.completed = data.completed || false;
        // ... more fields
    }

    toJSON() {
        return { id: this.id, text: this.text, ... };
    }
}
```

**Benefits:**
- Type-safety-like structure without TypeScript
- Clean serialization for localStorage
- Default values built-in
- Easy migration from old formats

**Models:**
- `Task` - Main task entity
- `Subtask` - Nested subtask
- `Project` - Task grouping
- `Note` - Quick note entity

### 3. Event-Driven UI Updates

UI components listen for user interactions and update via managers:

```javascript
// User action
addTaskButton.addEventListener('click', () => {
    const task = taskDataManager.addTask({ text: 'New task' });
    renderTaskList(); // Re-render UI
});
```

**Trade-offs:**
- ✅ Simple to understand
- ✅ Direct data flow
- ⚠️ No reactive updates (manual re-renders needed)

### 4. localStorage Persistence

**Strategy:**
- Debounced writes (300-500ms) to prevent excessive I/O
- JSON serialization via `toJSON()` methods
- Graceful fallback on errors
- Automatic data migration

```javascript
saveToStorage() {
    try {
        localStorage.setItem('tasks', JSON.stringify(
            this.tasks.map(t => t.toJSON())
        ));
    } catch (error) {
        errorHandler.handleError(error, 'storage');
    }
}
```

**Data Keys:**
- `tasks` - Task array
- `projects` - Project array
- `taskSettings` - User preferences
- `notes` - Notes array
- `links` - Dashboard links
- `retirementTimer` - Retirement data

### 5. Dependency Graph Management

**Advanced feature:** Tasks can depend on other tasks or subtasks.

**Key Algorithm:** Circular dependency detection using **Depth-First Search (DFS)**

```javascript
validateNoCycles(taskId, blockerId) {
    const visited = new Set();
    const stack = [blockerTaskId];

    while (stack.length > 0) {
        const currentId = stack.pop();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        if (currentId === taskId) {
            return false; // Cycle detected!
        }

        // Add dependencies to stack
        const task = this.getTaskById(currentId);
        if (task && task.blockedBy) {
            stack.push(...task.blockedBy);
        }
    }

    return true; // No cycle
}
```

**Features:**
- Task-to-task dependencies
- Task-to-subtask dependencies
- Auto-block/unblock on status changes
- Visual dependency indicators

## Security Architecture

### Multi-Layer XSS Protection

**Layer 1: HTML Escaping**
```javascript
sanitizeHtml(str) {
    const temp = document.createElement('div');
    temp.textContent = str; // Automatic escaping
    return temp.innerHTML;  // Get escaped HTML
}
```

**Layer 2: Protocol Validation**
```javascript
validateUrl(url) {
    const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerous.some(p => url.startsWith(p))) {
        return false;
    }
    return true;
}
```

**Layer 3: Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net">
```

**Layer 4: Input Validation**
- Length limits
- Character whitelisting
- Regex-based validation
- Real-time feedback

### Private IP Blocking

Prevents SSRF attacks by blocking internal IPs:
```javascript
const privateIPs = [
    /^127\./,           // 127.x.x.x
    /^10\./,            // 10.x.x.x
    /^192\.168\./,      // 192.168.x.x
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x
];
```

## Data Flow

### Task Creation Flow

```
User Input
    ↓
Input Validation (InputValidator)
    ↓
Task Model Creation (new Task())
    ↓
Manager Persistence (taskDataManager.addTask())
    ↓
localStorage Write (debounced)
    ↓
UI Re-render (renderTaskList())
```

### Dependency Management Flow

```
addDependency(taskId, blockerId)
    ↓
Validate blocker exists
    ↓
Check for circular dependencies (DFS)
    ↓
Add to blockedBy array
    ↓
Auto-set status to BLOCKED if blocker incomplete
    ↓
Save to storage
    ↓
Emit events / update UI
```

## State Management

### Global State

```javascript
window.taskDataManager = new TaskDataManager();
window.errorHandler = new ErrorHandler();
window.modalManager = new ModalManager();
window.pomodoroTimer = new PomodoroTimer();
```

**Trade-offs:**
- ✅ Simple access from anywhere
- ✅ No framework overhead
- ⚠️ Global namespace pollution
- ⚠️ Less explicit dependencies

### Local State

Each page maintains its own UI state:
```javascript
let currentView = 'my-day';
let selectedTaskId = null;
let searchQuery = '';
```

## PWA Architecture

### Service Worker Strategy

**Cache-first with network fallback:**

```javascript
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
```

**Cached Assets:**
- HTML pages
- JavaScript files
- CSS files
- Font files
- Icons

**Cache Versioning:**
```javascript
const CACHE_VERSION = 'v61';
```

## Performance Considerations

### Optimizations

1. **Debounced Saves** - 300-500ms delay on localStorage writes
2. **Event Delegation** - Single listener per list instead of per item
3. **CSS Variables** - Theme switching without DOM rewrites
4. **Lazy Rendering** - Task detail panels rendered on-demand
5. **Service Worker Caching** - Instant page loads when offline

### Bottlenecks

1. **Large Task Lists** - No pagination (all tasks in memory)
2. **Monolithic Files** - `todo.js` is 3,552 lines
3. **Large CSS** - 4,754 lines loaded on every page
4. **No Code Splitting** - All JS loaded upfront

## Testing Architecture

### Test Stack

- **Framework**: Vitest (fast, modern)
- **Environment**: happy-dom (lightweight DOM simulation)
- **Coverage**: v8 provider

### Test Organization

```
tests/
├── setup.js              # Global mocks (localStorage, Logger)
└── unit/
    ├── task-data-manager.test.js  # 68 tests
    │   ├── CRUD operations
    │   ├── Dependency management
    │   ├── Circular dependency detection
    │   ├── Data migration
    │   └── Status updates
    │
    └── input-validator.test.js    # 66 tests
        ├── HTML sanitization
        ├── XSS prevention
        ├── URL validation
        ├── Protocol blocking
        └── JSON sanitization
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Data Migration Strategy

### Version Tracking

```javascript
const DATA_VERSION = '2.0';
```

### Migration Flow

```javascript
init() {
    const needsMigration = !localStorage.getItem('tasks')
                        && localStorage.getItem('todos');

    if (needsMigration) {
        this.migrateFromOldFormat();
    } else {
        this.loadFromStorage();
    }
}

migrateFromOldFormat() {
    const oldTodos = JSON.parse(localStorage.getItem('todos'));
    this.tasks = oldTodos.map(todo => new Task({
        text: todo.text,
        description: todo.notes,
        // ... field mapping
    }));
    // Keep old data for rollback safety
}
```

## Error Handling Strategy

### Global Error Capturing

```javascript
class ErrorHandler {
    constructor() {
        window.addEventListener('error', (e) => {
            this.handleError(e.error, 'uncaught');
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.handleError(e.reason, 'promise');
        });
    }
}
```

### User-Friendly Messages

```javascript
handleError(error, type, context) {
    const userMessage = this.generateUserFriendlyMessage(error, type);
    const technicalMessage = error.message;

    this.showErrorModal(userMessage);
    Logger.error(technicalMessage, context);
}
```

## Accessibility Features

- **Keyboard Navigation**: 20+ shortcuts (/, Ctrl+Shift+N, etc.)
- **ARIA Labels**: Buttons, modals, and interactive elements
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Focus Management**: Modal focus trapping
- **Color Contrast**: WCAG 2.1 Level A compliance
- **Screen Reader Support**: Descriptive labels and roles

## Browser Support

**Minimum Requirements:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required APIs:**
- localStorage
- Service Workers
- CSS Variables
- ES6 Classes
- Fetch API
- Promise API

## Future Improvements

### High Priority

1. **Add Automated Tests** ✅ DONE (134 tests)
2. **Type Safety** - Migrate to TypeScript or add JSDoc ✅ PARTIAL (JSDoc added to TaskDataManager)
3. **Code Splitting** - Break up `todo.js` (3,552 lines)
4. **Performance** - Paginate large task lists

### Medium Priority

1. **Event Bus** - Decouple components with pub-sub pattern
2. **Component Architecture** - Extract reusable UI components
3. **State Management** - Consider lightweight state library
4. **Bundle Optimization** - Minify and split CSS/JS

### Low Priority

1. **Backend Sync** (optional) - Firebase/Supabase for cross-device sync
2. **Mobile App** - Capacitor wrapper for native features
3. **Advanced Features** - Recurring tasks, reminders, collaboration

## Key Design Decisions

### Why Vanilla JS?

**Pros:**
- Zero build complexity
- No framework lock-in
- Maximum performance
- Full PWA offline support
- Educational value

**Cons:**
- More boilerplate
- Manual DOM updates
- Less tooling support

### Why No Backend?

**Pros:**
- Privacy by design
- Zero hosting costs
- Instant setup
- Offline-first
- No server maintenance

**Cons:**
- No cross-device sync
- Limited to single browser
- localStorage size limits (5-10MB)

### Why Manager Pattern?

**Pros:**
- Clear separation of concerns
- Testable business logic
- Single source of truth
- Easy to refactor

**Cons:**
- Global state management
- Can become large (task-data.js is 927 lines)

## Metrics

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~14,700 |
| Test Coverage | 134 tests (Task & Validation) |
| Main Modules | 14 files |
| Largest File | todo.js (3,552 lines) |
| CSS Lines | 4,754 |
| External Dependencies | 2 (Sortable.js, Font Awesome) |
| Browser Support | Modern (ES6+) |

## Contributing

### Code Style

- Use ES6+ features
- Prefer `const` over `let`
- Document complex functions with JSDoc
- Keep functions small and focused
- Use meaningful variable names

### Testing

- Write tests for new features
- Maintain >80% coverage for critical paths
- Test edge cases and error conditions
- Use descriptive test names

### Security

- Always sanitize user input
- Validate URLs before use
- Never use `eval()` or `innerHTML` with user data
- Test for XSS vulnerabilities

---

**Last Updated:** 2024
**Architecture Version:** 2.0

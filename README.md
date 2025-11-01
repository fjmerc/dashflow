# Personal Dashboard

A modern, feature-rich Progressive Web App (PWA) for organizing and managing your favorite links with a clean, customizable interface.

## Features

- **Link Organization**
  - Create custom sections to organize links
  - Add and manage links with names and URLs
  - Dedicated favorites section for quick access
  - Drag-and-drop functionality for reordering links

- **Search & Navigation**
  - Quick search functionality for finding links
  - Intuitive interface with clear section organization
  - Responsive design for all device sizes

- **Customization**
  - Dark mode support
  - Customizable theme colors
  - User settings management
  - Personalized username option

- **Retirement Countdown**
  - Track time until retirement
  - Customizable retirement date
  - Real-time countdown display
  - Enable/disable functionality
  - Settings persistence

- **Quick Notes**
  - Floating scratchpad accessible from any page
  - Multiple notes with titles and content
  - Auto-save with debouncing (500ms)
  - Search and filter functionality
  - Tags for categorization
  - Timestamps (created and modified)
  - Keyboard shortcuts (Ctrl+Shift+N, Ctrl+`)
  - Two-column interface (notes list + editor)
  - Integrated with backup system

- **Data Management**
  - Unified Import/Export system for all application data
  - Combined backup of bookmarks, todos, and settings in a single file
  - Backward compatibility with legacy backup formats
  - Local storage for persistent data
  - Undo functionality for actions
  - Clear storage option

- **Enterprise Task Management System**
  - **Smart Views**: My Day, Inbox, All Tasks, Important, Upcoming, and Completed task views
  - **Projects**: Create custom projects with icons and colors to organize tasks
  - **Tags**: Tag tasks for flexible categorization and filtering
  - **Subtasks**: Break down complex tasks into manageable subtasks
  - **Task Details**: Rich task information including priority, due dates, descriptions, notes, and task dependencies
  - **Task Dependencies**: Block tasks until prerequisites are complete, with support for both task-level and subtask-level blocking relationships
  - **Search**: Real-time task search across titles, descriptions, tags, and subtasks with keyboard shortcut (/)
  - **Kanban Board**: Visual board view with Todo, In Progress, Done, and Blocked columns
  - **Command Palette**: Quick access to tasks and actions with keyboard shortcuts (Ctrl+K)
  - **Task Filtering**: Filter by project, tag, status, priority, and date
  - **Drag & Drop**: Reorder tasks, move between kanban columns, and drag tasks onto sidebar projects to recategorize
  - **Detail Panel**: Comprehensive task editing with inline subtask management
  - **Pomodoro Timer**: Integrated focus timer with work/break sessions, customizable durations, sound notifications, and automatic task tracking

- **Additional Features**
  - Offline functionality (PWA)
  - Help documentation
  - Secure Content Security Policy implementation

## Installation

1. Clone the repository
2. Host the files on a web server (or use a local development server)
3. Access through a modern web browser
4. (Optional) Install as a PWA through your browser for offline access

## Technical Details

### Stack
- HTML5
- CSS3
- JavaScript (Vanilla)
- Service Worker for offline functionality
- Sortable.js for drag-and-drop features

### External Dependencies
- Font Awesome 6.1.1 for icons (self-hosted for offline support)
- Roboto font from Google Fonts
- Sortable.js for drag-and-drop functionality

### Browser Support
- Modern browsers with Service Worker support
- Progressive enhancement for older browsers

### Security
- Content Security Policy (CSP) implemented
- HTTPS required for PWA features
- Secure input validation

## Project Structure

```
dashboard/
├── index.html                               # Main dashboard page
├── todo.html                                # Enterprise task management page
├── help.html                                # Help documentation
├── manifest.json                            # PWA configuration
├── styles.css                               # Application styles (shared)
├── favicon.ico                              # Multi-size favicon for legacy browsers
├── js/
│   ├── core/                                # Core utilities (shared across pages)
│   │   ├── theme.js                         # Theme management
│   │   ├── logger.js                        # Logging utility
│   │   ├── keyboard-nav.js                  # Keyboard navigation handler
│   │   ├── error-handler.js                 # Error handling
│   │   ├── modal-manager.js                 # Modal dialog manager
│   │   ├── input-validator.js               # Input validation
│   │   └── export-utils.js                  # Unified data export/import utilities
│   ├── features/                            # Feature-specific modules
│   │   ├── dashboard/
│   │   │   └── script.js                    # Main dashboard logic
│   │   ├── tasks/
│   │   │   ├── todo.js                      # Task management UI and interactions
│   │   │   ├── task-data.js                 # Task data models and storage
│   │   │   └── pomodoro.js                  # Pomodoro timer logic
│   │   ├── notes/
│   │   │   ├── notes.js                     # Quick Notes data layer
│   │   │   └── notes-ui.js                  # Quick Notes UI and interactions
│   │   └── retirement/
│   │       ├── retirement-timer.js          # Retirement countdown logic
│   │       └── auto-backup.js               # Automatic backup system
│   └── sw.js                                # Service Worker
└── assets/
    ├── css/
    │   └── fontawesome-all.min.css          # Font Awesome CSS (self-hosted)
    ├── webfonts/                            # Font Awesome font files (self-hosted)
    │   ├── fa-brands-400.woff2              # Brand icons font
    │   ├── fa-regular-400.woff2             # Regular icons font
    │   ├── fa-solid-900.woff2               # Solid icons font
    │   └── fa-v4compatibility.woff2         # Legacy compatibility font
    └── icons/
        ├── icon.svg                         # SVG icon (modern browsers)
        ├── icon-16.png                      # 16x16 favicon
        ├── icon-32.png                      # 32x32 favicon
        ├── icon-192.png                     # PWA icon 192x192
        └── icon-512.png                     # PWA icon 512x512
```

## Usage

1. **Adding Sections**
   - Use the "Add New Section" form to create custom sections
   - Enter a section name and submit

2. **Adding Links**
   - Select a target section
   - Enter the link name and URL
   - Click "Add Link" to save

3. **Managing Links**
   - Drag and drop to reorder links
   - Star links to add them to favorites
   - Use the search bar to find specific links

4. **Customization**
   - Toggle dark mode with the moon icon
   - Change theme colors using the palette icon
   - Update username through settings

5. **Retirement Countdown**
   - Click the hourglass icon to show/hide the countdown
   - Use settings to set your retirement date
   - View real-time countdown display
   - Settings are included in data backups

6. **Data Management**
   - Export all data (bookmarks, todos, notes, settings) for comprehensive backup
   - Import data from unified or legacy backup formats
   - Cross-page integration between dashboard and todo list
   - Use undo for reversing actions
   - Clear storage if needed

7. **Quick Notes**
   - **Access**: Click the sticky note icon in the header or use keyboard shortcuts:
     - Ctrl+Shift+N (Cmd+Shift+N on Mac)
     - Ctrl+` (Cmd+` on Mac)
   - **Creating Notes**: Click the "+ New" button to create a new note
   - **Editing**: Select a note from the sidebar to view and edit
   - **Auto-save**: Changes are automatically saved after 500ms of inactivity
   - **Search**: Use the search bar to find notes by title or content
   - **Tags**: Add tags to notes for better organization (comma-separated)
   - **Navigation**: Keyboard-friendly with Tab/Shift+Tab navigation
   - **Data Safety**: Notes are included in all data backups (version 2.1+)

8. **Task Management System**
   - **Access**: Click the tasks icon from the main dashboard or visit todo.html
   - **Creating Tasks**: Use the quick add bar at the top to create tasks instantly
   - **Smart Views**:
     - **My Day**: Focus on today's priorities (overdue + due today + manually added)
     - **Inbox**: Uncategorized tasks
     - **All Tasks**: View all incomplete tasks
     - **Important**: High-priority tasks
     - **Upcoming**: Tasks due in the next 7 days
     - **Completed**: Recently completed tasks
   - **Projects**:
     - Create custom projects with the "New Project" button
     - Assign custom colors and icons to projects
     - Edit or delete projects from the header when viewing a project
   - **Task Details**:
     - Click any task to open the detail panel
     - Set priority (low, medium, high)
     - Add due dates
     - Write descriptions and notes
     - Create subtasks for complex tasks
     - Add tags for flexible categorization
   - **Tags**:
     - Add multiple tags to any task
     - Click tags to filter tasks by that tag
     - View all tags in the sidebar with task counts
   - **Task Dependencies**:
     - Block tasks until prerequisite tasks or subtasks are completed
     - Add dependencies from the "Blocked by" section in the task detail panel
     - Select any task or subtask as a blocker from the dropdown
     - Automatic status updates: Tasks auto-unblock when all blockers complete, auto-re-block if blockers are unchecked
     - Circular dependency prevention: System prevents creating dependency loops
     - Dependency badges: Task cards show ⛓️ badge with count of incomplete blockers
     - "Blocks" section: View which tasks depend on the current task completing
     - Subtask blocking: Block tasks on specific subtasks for granular control
   - **Kanban Board**:
     - Switch to board view for visual task management
     - Drag tasks between Todo, In Progress, Done, and Blocked columns
   - **Drag & Drop Task Recategorization**:
     - Drag any task from the task list
     - Drop it onto a project in the sidebar to move it to that project
     - Visual feedback shows valid drop zones with highlight
     - Notification confirms successful move
   - **Search**:
     - Use the search box at the top to find tasks instantly
     - Press **/** (slash key) to quickly focus the task search box
     - Press **Ctrl+F** (Cmd+F on Mac) to open global search across all dashboard and tasks
     - Searches across task titles, descriptions, tags, and subtasks
     - Real-time filtering as you type
     - Works in both list and board views
     - Access via Command Palette: Ctrl+K → "Search Tasks"
   - **Command Palette**:
     - Press Ctrl+K (Cmd+K on Mac) to open
     - Quick access to navigation and actions
   - **Keyboard Navigation**:
     - Tab/Shift+Tab to navigate
     - Enter to open task details
     - Escape to close panels
   - **Pomodoro Timer**:
     - Click the play button (▶) on any task to start a Pomodoro session
     - Timer panel appears in the bottom-right corner with session type, countdown, and controls
     - Default sessions: 25-min work, 5-min short break, 15-min long break (4 work sessions until long break)
     - Pause/Resume, Skip, and Stop controls for flexible time management
     - Settings (gear icon): Customize durations, enable sound notifications, toggle auto-start for next session
     - Automatic tracking: Completed pomodoros are tracked per task (🍅 count badge in task metadata)
     - Timer stops automatically when task is marked complete or deleted
     - State persistence: Timer state saved to localStorage (survives page refresh for 30 minutes)
     - Minimize button to reduce panel size while timer continues running

## License

This project is open source and available under the MIT License.

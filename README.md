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
  - **Task Details**: Rich task information including priority, due dates, descriptions, and notes
  - **Kanban Board**: Visual board view with Todo, In Progress, Done, and Blocked columns
  - **Command Palette**: Quick access to tasks and actions with keyboard shortcuts (Ctrl+K)
  - **Task Filtering**: Filter by project, tag, status, priority, and date
  - **Drag & Drop**: Reorder tasks and move between kanban columns
  - **Detail Panel**: Comprehensive task editing with inline subtask management

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
- Font Awesome 6.1.1 for icons
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
├── index.html          # Main dashboard page
├── help.html           # Help documentation
├── todo.html           # Enterprise task management page
├── manifest.json       # PWA configuration
├── sw.js               # Service Worker
├── script.js           # Main dashboard logic
├── todo.js             # Task management UI and interactions
├── task-data.js        # Task data models and storage management
├── notes.js            # Quick Notes data layer
├── notes-ui.js         # Quick Notes UI and interactions
├── theme.js            # Theme management (shared)
├── export-utils.js     # Unified data export/import utilities (shared)
├── retirement-timer.js # Retirement countdown logic
├── logger.js           # Logging utility (shared)
├── keyboard-nav.js     # Keyboard navigation handler (shared)
├── auto-backup.js      # Automatic backup system (shared)
├── input-validator.js  # Input validation (shared)
├── error-handler.js    # Error handling (shared)
├── modal-manager.js    # Modal dialog manager (shared)
└── styles.css          # Application styles (shared)
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
   - **Kanban Board**:
     - Switch to board view for visual task management
     - Drag tasks between Todo, In Progress, Done, and Blocked columns
   - **Command Palette**:
     - Press Ctrl+K (Cmd+K on Mac) to open
     - Quick access to navigation and actions
   - **Keyboard Navigation**:
     - Tab/Shift+Tab to navigate
     - Enter to open task details
     - Escape to close panels

## License

This project is open source and available under the MIT License.

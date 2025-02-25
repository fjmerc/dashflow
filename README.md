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

- **Data Management**
  - Unified Import/Export system for all application data
  - Combined backup of bookmarks, todos, and settings in a single file
  - Backward compatibility with legacy backup formats
  - Local storage for persistent data
  - Undo functionality for actions
  - Clear storage option

- **Additional Features**
  - Integrated Todo list
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
├── index.html      # Main application page
├── help.html       # Help documentation
├── todo.html       # Todo list feature
├── manifest.json   # PWA configuration
├── sw.js          # Service Worker
├── script.js      # Main application logic
├── todo.js        # Todo list functionality
├── theme.js       # Theme management
├── export-utils.js # Unified data export/import utilities
└── styles.css     # Application styles
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

5. **Data Management**
   - Export all data (bookmarks, todos, settings) for comprehensive backup
   - Import data from unified or legacy backup formats
   - Cross-page integration between dashboard and todo list
   - Use undo for reversing actions
   - Clear storage if needed

## License

This project is open source and available under the MIT License.

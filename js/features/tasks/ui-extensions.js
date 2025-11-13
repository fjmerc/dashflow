/**
 * UI Extensions for DashFlow Tasks
 * Adds new UI features: comments, duplication, quick-add, keyboard shortcuts, etc.
 */

// Global instances
let analyticsManager = null;
let tagColorsManager = null;

/**
 * Initialize UI extensions
 */
function initUIExtensions() {
    if (!window.taskDataManager) {
        Logger.warn('UI Extensions: TaskDataManager not found, retrying...');
        // Retry after a short delay
        setTimeout(initUIExtensions, 200);
        return;
    }

    Logger.debug('UI Extensions: Initializing with TaskDataManager');

    // Initialize managers
    analyticsManager = new AnalyticsManager(window.taskDataManager);
    tagColorsManager = new TagColorsManager();

    // Add quick-add input to the top of the task list
    addQuickAddInput();

    // Add keyboard shortcuts button
    addKeyboardShortcutsButton();

    // Add analytics button to sidebar
    addAnalyticsButton();

    // Add calendar view button
    addCalendarViewButton();

    // Setup global keyboard shortcuts
    setupGlobalKeyboardShortcuts();

    // Enhance task rendering with tag colors
    enhanceTaskRendering();

    Logger.debug('UI Extensions initialized');
}

/**
 * Add quick-add input at the top
 */
function addQuickAddInput() {
    const taskListContainer = document.querySelector('.task-list-container');
    if (!taskListContainer) return;

    const quickAddHTML = `
        <div class="quick-add-container" id="quickAddContainer">
            <input
                type="text"
                class="quick-add-input"
                id="quickAddInput"
                placeholder="Quick add task (Ctrl+Shift+A)..."
                aria-label="Quick add task"
            />
            <button class="quick-add-btn" id="quickAddBtn" title="Add task">
                <i class="fas fa-plus"></i>
            </button>
        </div>
    `;

    taskListContainer.insertAdjacentHTML('afterbegin', quickAddHTML);

    // Add event listeners
    const input = document.getElementById('quickAddInput');
    const btn = document.getElementById('quickAddBtn');

    const addQuickTask = () => {
        const text = input.value.trim();
        if (!text) return;

        // Get current project or default to Inbox
        const currentProject = window.taskDataManager.settings.currentProjectId || 'inbox';

        window.taskDataManager.addTask({
            text: text,
            projectId: currentProject
        });

        input.value = '';

        // Refresh view if renderTasks exists
        if (window.renderTasks) window.renderTasks();
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addQuickTask();
    });

    btn.addEventListener('click', addQuickTask);

    // Add styles
    addQuickAddStyles();
}

/**
 * Add styles for quick-add input
 */
function addQuickAddStyles() {
    if (document.getElementById('quick-add-styles')) return;

    const style = document.createElement('style');
    style.id = 'quick-add-styles';
    style.textContent = `
        .quick-add-container {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            padding: 12px;
            background: var(--background-color);
            border-radius: 8px;
            border: 2px solid var(--primary-color);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .quick-add-input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--background-hover);
            color: var(--text-color);
            font-size: 14px;
            font-family: inherit;
        }
        .quick-add-input:focus {
            outline: none;
            border-color: var(--primary-color);
            background: var(--background-color);
        }
        .quick-add-btn {
            padding: 10px 16px;
            background: var(--primary-color);
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            transition: opacity 0.2s;
        }
        .quick-add-btn:hover {
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Add keyboard shortcuts help button
 */
function addKeyboardShortcutsButton() {
    const header = document.querySelector('.app-header') || document.querySelector('header');
    if (!header) return;

    const btn = document.createElement('button');
    btn.className = 'header-action-btn';
    btn.id = 'keyboardShortcutsBtn';
    btn.innerHTML = '<i class="fas fa-keyboard"></i>';
    btn.title = 'Keyboard Shortcuts (?)';
    btn.onclick = showKeyboardShortcutsHelp;

    header.appendChild(btn);
}

/**
 * Show keyboard shortcuts help overlay
 */
function showKeyboardShortcutsHelp() {
    const shortcuts = [
        { keys: 'Ctrl+K', description: 'Open command palette' },
        { keys: '/', description: 'Focus search' },
        { keys: 'Ctrl+Shift+A', description: 'Quick add task' },
        { keys: 'Ctrl+Shift+N', description: 'Open notes' },
        { keys: 'Ctrl+`', description: 'Toggle notes' },
        { keys: 'Escape', description: 'Close panels/modals' },
        { keys: '?', description: 'Show this help' }
    ];

    const modalHTML = `
        <div class="keyboard-shortcuts-modal">
            <div class="keyboard-shortcuts-content">
                <div class="keyboard-shortcuts-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="close-btn" onclick="closeKeyboardShortcuts()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="keyboard-shortcuts-list">
                    ${shortcuts.map(s => `
                        <div class="shortcut-item">
                            <kbd class="shortcut-key">${s.keys}</kbd>
                            <span class="shortcut-desc">${s.description}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const existing = document.querySelector('.keyboard-shortcuts-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    addKeyboardShortcutsStyles();
}

/**
 * Close keyboard shortcuts help
 */
window.closeKeyboardShortcuts = function() {
    const modal = document.querySelector('.keyboard-shortcuts-modal');
    if (modal) modal.remove();
};

/**
 * Add styles for keyboard shortcuts modal
 */
function addKeyboardShortcutsStyles() {
    if (document.getElementById('keyboard-shortcuts-styles')) return;

    const style = document.createElement('style');
    style.id = 'keyboard-shortcuts-styles';
    style.textContent = `
        .keyboard-shortcuts-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        .keyboard-shortcuts-content {
            background: var(--background-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .keyboard-shortcuts-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border-color);
        }
        .keyboard-shortcuts-header h2 {
            margin: 0;
            font-size: 24px;
        }
        .keyboard-shortcuts-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .shortcut-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px;
            background: var(--background-hover);
            border-radius: 6px;
        }
        .shortcut-key {
            background: var(--text-color);
            color: var(--background-color);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            font-weight: 600;
            min-width: 120px;
            text-align: center;
        }
        .shortcut-desc {
            flex: 1;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Add analytics button
 */
function addAnalyticsButton() {
    const sidebar = document.querySelector('.sidebar-views') || document.querySelector('.sidebar');
    if (!sidebar) return;

    const btn = document.createElement('button');
    btn.className = 'sidebar-view-item';
    btn.innerHTML = '<i class="fas fa-chart-line"></i> Analytics';
    btn.onclick = showAnalyticsDashboard;

    sidebar.appendChild(btn);
}

/**
 * Show analytics dashboard
 */
function showAnalyticsDashboard() {
    if (!analyticsManager) return;

    const summary = analyticsManager.generateSummary();

    const modalHTML = `
        <div class="analytics-modal">
            <div class="analytics-content">
                <div class="analytics-header">
                    <h2><i class="fas fa-chart-line"></i> Analytics Dashboard</h2>
                    <button class="close-btn" onclick="closeAnalytics()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-card-title">Overall Completion</div>
                        <div class="analytics-card-value">${summary.overall.rate}%</div>
                        <div class="analytics-card-detail">${summary.overall.completed} / ${summary.overall.total} tasks</div>
                    </div>

                    <div class="analytics-card">
                        <div class="analytics-card-title">Last 30 Days</div>
                        <div class="analytics-card-value">${summary.last30Days.rate}%</div>
                        <div class="analytics-card-detail">${summary.last30Days.completed} / ${summary.last30Days.total} tasks</div>
                    </div>

                    <div class="analytics-card">
                        <div class="analytics-card-title">Current Streak</div>
                        <div class="analytics-card-value">${summary.streak}</div>
                        <div class="analytics-card-detail">days</div>
                    </div>

                    <div class="analytics-card">
                        <div class="analytics-card-title">Overdue Tasks</div>
                        <div class="analytics-card-value">${summary.overdue}</div>
                        <div class="analytics-card-detail">need attention</div>
                    </div>
                </div>

                <div class="analytics-section">
                    <h3>Priority Distribution</h3>
                    <div class="analytics-bars">
                        <div class="analytics-bar">
                            <span class="bar-label">High</span>
                            <div class="bar-fill" style="width: ${summary.priority.high * 10}%; background: #ef4444;"></div>
                            <span class="bar-value">${summary.priority.high}</span>
                        </div>
                        <div class="analytics-bar">
                            <span class="bar-label">Medium</span>
                            <div class="bar-fill" style="width: ${summary.priority.medium * 5}%; background: #f59e0b;"></div>
                            <span class="bar-value">${summary.priority.medium}</span>
                        </div>
                        <div class="analytics-bar">
                            <span class="bar-label">Low</span>
                            <div class="bar-fill" style="width: ${summary.priority.low * 5}%; background: #10b981;"></div>
                            <span class="bar-value">${summary.priority.low}</span>
                        </div>
                    </div>
                </div>

                <div class="analytics-section">
                    <h3>Project Performance</h3>
                    <div class="analytics-list">
                        ${summary.projects.slice(0, 5).map(p => `
                            <div class="analytics-list-item">
                                <span class="list-item-icon" style="color: ${p.project.color}">${p.project.icon}</span>
                                <span class="list-item-name">${p.project.name}</span>
                                <span class="list-item-progress">${p.rate}%</span>
                                <span class="list-item-count">(${p.completed}/${p.total})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="analytics-section">
                    <h3>Insights</h3>
                    <div class="analytics-insights">
                        <div class="insight-item">
                            <i class="fas fa-calendar-check"></i>
                            <span>Most productive on <strong>${summary.mostProductiveDay}</strong></span>
                        </div>
                        <div class="insight-item">
                            <i class="fas fa-clock"></i>
                            <span>Avg completion time: <strong>${summary.avgCompletionTime} hours</strong></span>
                        </div>
                        <div class="insight-item">
                            <i class="fas fa-tomato"></i>
                            <span>Total pomodoros: <strong>${summary.pomodoro.totalPomodoros}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existing = document.querySelector('.analytics-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    addAnalyticsStyles();
}

/**
 * Close analytics dashboard
 */
window.closeAnalytics = function() {
    const modal = document.querySelector('.analytics-modal');
    if (modal) modal.remove();
};

/**
 * Add styles for analytics dashboard
 */
function addAnalyticsStyles() {
    if (document.getElementById('analytics-styles')) return;

    const style = document.createElement('style');
    style.id = 'analytics-styles';
    style.textContent = `
        .analytics-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            overflow-y: auto;
            padding: 20px;
        }
        .analytics-content {
            background: var(--background-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
        }
        .analytics-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--border-color);
        }
        .analytics-header h2 {
            margin: 0;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .analytics-card {
            background: var(--background-hover);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .analytics-card-title {
            font-size: 12px;
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .analytics-card-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 4px;
        }
        .analytics-card-detail {
            font-size: 14px;
            color: var(--text-muted);
        }
        .analytics-section {
            margin-bottom: 24px;
        }
        .analytics-section h3 {
            font-size: 18px;
            margin-bottom: 16px;
            color: var(--text-color);
        }
        .analytics-bars {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .analytics-bar {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .bar-label {
            min-width: 80px;
            font-size: 14px;
        }
        .bar-fill {
            height: 24px;
            border-radius: 4px;
            min-width: 2px;
            transition: width 0.3s;
        }
        .bar-value {
            font-weight: 600;
            font-size: 14px;
            min-width: 40px;
            text-align: right;
        }
        .analytics-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .analytics-list-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--background-hover);
            border-radius: 6px;
        }
        .list-item-icon {
            font-size: 18px;
        }
        .list-item-name {
            flex: 1;
            font-size: 14px;
        }
        .list-item-progress {
            font-weight: 600;
            font-size: 14px;
            color: var(--primary-color);
        }
        .list-item-count {
            font-size: 13px;
            color: var(--text-muted);
        }
        .analytics-insights {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .insight-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--background-hover);
            border-radius: 6px;
            font-size: 14px;
        }
        .insight-item i {
            color: var(--primary-color);
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Add calendar view button
 */
function addCalendarViewButton() {
    const sidebar = document.querySelector('.sidebar-views') || document.querySelector('.sidebar');
    if (!sidebar) return;

    const btn = document.createElement('button');
    btn.className = 'sidebar-view-item';
    btn.innerHTML = '<i class="fas fa-calendar"></i> Calendar';
    btn.onclick = showCalendarView;

    sidebar.appendChild(btn);
}

/**
 * Show calendar view
 */
function showCalendarView() {
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (!mainContent) return;

    // Save the previous content
    if (!window.previousMainContent) {
        window.previousMainContent = mainContent.innerHTML;
    }

    // Create calendar container
    mainContent.innerHTML = `
        <div class="calendar-view-header">
            <h1><i class="fas fa-calendar"></i> Calendar View</h1>
            <button class="btn-secondary" onclick="exitCalendarView()">
                <i class="fas fa-arrow-left"></i> Back to Tasks
            </button>
        </div>
        <div id="calendarViewContainer"></div>
    `;

    const container = document.getElementById('calendarViewContainer');
    const calendarView = new CalendarView(window.taskDataManager, container);
    calendarView.render();
}

/**
 * Exit calendar view
 */
window.exitCalendarView = function() {
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (mainContent && window.previousMainContent) {
        mainContent.innerHTML = window.previousMainContent;
        window.previousMainContent = null;

        // Re-render tasks if function exists
        if (window.renderTasks) window.renderTasks();
    }
};

/**
 * Setup global keyboard shortcuts
 */
function setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+A - Quick add
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            document.getElementById('quickAddInput')?.focus();
        }

        // ? - Show keyboard shortcuts
        if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                showKeyboardShortcutsHelp();
            }
        }
    });
}

/**
 * Enhance task rendering with tag colors
 */
function enhanceTaskRendering() {
    // This will be called to apply tag colors dynamically
    // We'll set up a MutationObserver to apply colors when tasks are rendered
    const observer = new MutationObserver(() => {
        applyTagColors();
    });

    const taskList = document.querySelector('.task-list') || document.querySelector('#taskList');
    if (taskList) {
        observer.observe(taskList, { childList: true, subtree: true });
    }

    // Apply initially
    applyTagColors();
}

/**
 * Apply tag colors to all tag chips
 */
function applyTagColors() {
    if (!tagColorsManager) return;

    const tagChips = document.querySelectorAll('.tag-chip');
    tagChips.forEach(chip => {
        const tag = chip.dataset.tag || chip.textContent.trim();
        const color = tagColorsManager.ensureColor(tag);
        chip.style.backgroundColor = color;
        chip.style.color = 'white';
        chip.style.borderColor = color;
    });
}

// Export functions to global scope
window.initUIExtensions = initUIExtensions;
window.showKeyboardShortcutsHelp = showKeyboardShortcutsHelp;
window.showAnalyticsDashboard = showAnalyticsDashboard;
window.showCalendarView = showCalendarView;
window.applyTagColors = applyTagColors;

// Initialize when task app is ready
window.addEventListener('taskAppReady', () => {
    Logger.debug('UI Extensions: Task app ready event received');
    initUIExtensions();
});

// Fallback: if taskDataManager already exists (for hot reload scenarios)
if (document.readyState === 'complete' && window.taskDataManager) {
    Logger.debug('UI Extensions: Fallback initialization');
    setTimeout(initUIExtensions, 100);
}

Logger.debug('ui-extensions.js loaded');

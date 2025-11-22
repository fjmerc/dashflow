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

    // Add analytics and calendar to sidebar
    addAnalyticsButton();

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
            margin-bottom: 12px;
            padding: 8px;
            background: var(--background-hover);
            border-radius: 6px;
            border: 1px solid var(--border-color);
            transition: border-color 0.2s, background 0.2s;
        }
        .quick-add-container:focus-within {
            background: var(--background-color);
            border-color: var(--primary-color);
        }
        .quick-add-input {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: transparent;
            color: var(--text-color);
            font-size: 14px;
            font-family: inherit;
        }
        .quick-add-input:focus {
            outline: none;
        }
        .quick-add-input::placeholder {
            color: var(--text-muted);
            opacity: 0.6;
        }
        .quick-add-btn {
            padding: 8px 12px;
            background: transparent;
            border: none;
            border-radius: 4px;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .quick-add-btn:hover {
            background: var(--primary-color);
            color: white;
        }
        .quick-add-container:focus-within .quick-add-btn {
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Add keyboard shortcuts help button
 */
function addKeyboardShortcutsButton() {
    const headerButtons = document.querySelector('.header-buttons') || document.querySelector('.app-header');
    if (!headerButtons) {
        setTimeout(addKeyboardShortcutsButton, 500);
        return;
    }

    // Check if already added
    if (document.getElementById('keyboardShortcutsBtn')) return;

    const btn = document.createElement('button');
    btn.className = 'header-btn';
    btn.id = 'keyboardShortcutsBtn';
    btn.innerHTML = '<i class="fas fa-keyboard"></i>';
    btn.title = 'Keyboard Shortcuts (?)';
    btn.setAttribute('aria-label', 'Keyboard Shortcuts');
    btn.onclick = showKeyboardShortcutsHelp;

    // Insert before help button if it exists
    const helpBtn = document.getElementById('todoHelpBtn');
    if (helpBtn) {
        headerButtons.insertBefore(btn, helpBtn);
    } else {
        headerButtons.appendChild(btn);
    }
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

    // Add backdrop click to close
    setTimeout(() => {
        const modal = document.querySelector('.keyboard-shortcuts-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeKeyboardShortcuts();
                }
            });
        }
    }, 0);
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
            animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        .keyboard-shortcuts-content {
            background: var(--background-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease-out;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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
 * Add analytics and calendar buttons to sidebar as a new section
 */
function addAnalyticsButton() {
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        setTimeout(addAnalyticsButton, 500);
        return;
    }

    // Check if already added
    if (document.getElementById('insightsSection')) return;

    // Find the tags section to insert before it
    const tagsSection = Array.from(document.querySelectorAll('.sidebar-section'))
        .find(s => s.textContent.includes('Tags'));

    const insightsHTML = `
        <div class="sidebar-section" id="insightsSection">
            <div class="sidebar-section-header">
                <div class="sidebar-section-title">
                    <i class="fas fa-chart-bar"></i>
                    <span>Insights</span>
                </div>
            </div>
            <div>
                <div class="sidebar-item" id="calendarViewBtn">
                    <div class="sidebar-item-icon">📅</div>
                    <div class="sidebar-item-text">Calendar</div>
                </div>
                <div class="sidebar-item" id="analyticsViewBtn">
                    <div class="sidebar-item-icon">📊</div>
                    <div class="sidebar-item-text">Analytics</div>
                </div>
            </div>
        </div>
    `;

    if (tagsSection) {
        tagsSection.insertAdjacentHTML('beforebegin', insightsHTML);
    } else {
        sidebarContent.insertAdjacentHTML('beforeend', insightsHTML);
    }

    // Attach event listeners
    document.getElementById('calendarViewBtn')?.addEventListener('click', showCalendarView);
    document.getElementById('analyticsViewBtn')?.addEventListener('click', showAnalyticsDashboard);
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

    // Add backdrop click to close
    setTimeout(() => {
        const modal = document.querySelector('.analytics-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAnalytics();
                }
            });
        }
    }, 0);
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
            animation: fadeIn 0.2s ease-out;
        }
        .analytics-content {
            background: var(--background-color);
            border-radius: 12px;
            padding: 24px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease-out;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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
        .analytics-header .close-btn,
        .keyboard-shortcuts-header .close-btn,
        .archived-projects-header .close-btn {
            background: var(--background-hover);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--text-color);
            transition: all 0.2s;
        }
        .analytics-header .close-btn:hover,
        .keyboard-shortcuts-header .close-btn:hover,
        .archived-projects-header .close-btn:hover {
            background: var(--border-color);
            color: var(--text-color);
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
            transition: all 0.2s;
        }
        .analytics-card:hover {
            border-color: var(--primary-color);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .analytics-card-title {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 700;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
        }
        .analytics-card-value {
            font-size: 36px;
            font-weight: 800;
            color: var(--text-color);
            margin-bottom: 6px;
            line-height: 1;
        }
        .analytics-card-detail {
            font-size: 13px;
            color: var(--text-color);
            opacity: 0.7;
            font-weight: 500;
        }
        .analytics-section {
            margin-bottom: 28px;
            background: var(--background-hover);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .analytics-section h3 {
            font-size: 16px;
            margin-bottom: 16px;
            color: var(--text-color);
            font-weight: 700;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border-color);
        }
        .analytics-bars {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .analytics-bar {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .bar-label {
            min-width: 80px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-color);
        }
        .bar-fill {
            height: 28px;
            border-radius: 6px;
            min-width: 4px;
            transition: width 0.4s ease-out;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .bar-value {
            font-weight: 700;
            font-size: 14px;
            min-width: 40px;
            text-align: right;
            color: var(--text-color);
        }
        .analytics-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .analytics-list-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px;
            background: var(--background-color);
            border-radius: 6px;
            border: 1px solid var(--border-color);
            transition: all 0.2s;
        }
        .analytics-list-item:hover {
            border-color: var(--primary-color);
            transform: translateX(4px);
        }
        .list-item-icon {
            font-size: 20px;
        }
        .list-item-name {
            flex: 1;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
        }
        .list-item-progress {
            font-weight: 700;
            font-size: 15px;
            color: var(--primary-color);
        }
        .list-item-count {
            font-size: 13px;
            color: var(--text-color);
            opacity: 0.7;
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
            padding: 14px;
            background: var(--background-color);
            border-radius: 6px;
            border: 1px solid var(--border-color);
            font-size: 14px;
            color: var(--text-color);
            transition: all 0.2s;
        }
        .insight-item:hover {
            border-color: var(--primary-color);
            transform: translateX(4px);
        }
        .insight-item i {
            color: var(--primary-color);
            font-size: 20px;
            min-width: 20px;
            text-align: center;
        }
        .insight-item strong {
            color: var(--text-color);
            font-weight: 700;
        }
    `;
    document.head.appendChild(style);
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
            <div class="calendar-view-title">
                <i class="fas fa-calendar"></i>
                <h1>Calendar View</h1>
            </div>
            <div class="calendar-view-controls">
                <button id="exitCalendarBtn" class="calendar-back-btn">
                    <i class="fas fa-arrow-left"></i>
                    Back to Tasks
                </button>
            </div>
        </div>
        <div id="calendarViewContainer"></div>
    `;

    // Add styles for calendar view
    if (!document.getElementById('calendar-view-button-styles')) {
        const style = document.createElement('style');
        style.id = 'calendar-view-button-styles';
        style.textContent = `
            .calendar-view-header {
                margin-bottom: 24px;
            }
            .calendar-view-title {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .calendar-view-title i {
                font-size: 28px;
                color: var(--primary-color);
            }
            .calendar-view-title h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                color: var(--text-color);
            }
            .calendar-view-controls {
                display: flex;
                gap: 12px;
                align-items: center;
                padding-bottom: 16px;
                border-bottom: 2px solid var(--border-color);
                justify-content: flex-start;
            }
            .calendar-back-btn {
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 10px 18px;
                border-radius: 6px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                width: auto;
            }
            .calendar-back-btn:hover {
                opacity: 0.9;
                transform: translateX(-4px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .calendar-back-btn:active {
                transform: translateX(-2px);
            }
        `;
        document.head.appendChild(style);
    }

    // Add event listener to back button
    const backBtn = document.getElementById('exitCalendarBtn');
    if (backBtn) {
        backBtn.addEventListener('click', window.exitCalendarView);
    }

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
        const tag = chip.dataset.tag || chip.textContent.trim().replace(/×$/, '').trim();
        const color = tagColorsManager.ensureColor(tag);

        // Apply color with subtle opacity for better integration
        chip.style.backgroundColor = hexToRgba(color, 0.15);
        chip.style.color = color;
        chip.style.borderColor = hexToRgba(color, 0.3);
    });
}

/**
 * Convert hex color to rgba with opacity
 */
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

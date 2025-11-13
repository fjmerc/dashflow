/**
 * Calendar View Module
 * Provides a calendar-based view of tasks
 */

class CalendarView {
    constructor(taskDataManager, containerElement) {
        this.taskDataManager = taskDataManager;
        this.container = containerElement;
        this.currentDate = new Date();
        this.selectedDate = null;
    }

    /**
     * Render the calendar
     */
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        let calendarHTML = `
            <div class="calendar-view">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" id="calendarPrevMonth">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h2 class="calendar-title">${monthNames[month]} ${year}</h2>
                    <button class="calendar-nav-btn" id="calendarNextMonth">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button class="calendar-today-btn" id="calendarToday">Today</button>
                </div>
                <div class="calendar-weekdays">
                    <div class="calendar-weekday">Sun</div>
                    <div class="calendar-weekday">Mon</div>
                    <div class="calendar-weekday">Tue</div>
                    <div class="calendar-weekday">Wed</div>
                    <div class="calendar-weekday">Thu</div>
                    <div class="calendar-weekday">Fri</div>
                    <div class="calendar-weekday">Sat</div>
                </div>
                <div class="calendar-days">
        `;

        // Previous month days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = prevLastDate - i;
            calendarHTML += `
                <div class="calendar-day other-month" data-date="${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}">
                    <div class="calendar-day-number">${date}</div>
                </div>
            `;
        }

        // Current month days
        const today = new Date();
        for (let date = 1; date <= lastDate; date++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const isToday = today.getDate() === date &&
                           today.getMonth() === month &&
                           today.getFullYear() === year;
            const isSelected = this.selectedDate && this.selectedDate === dateStr;

            // Get tasks for this date
            const tasksOnDate = this.getTasksForDate(dateStr);
            const completedCount = tasksOnDate.filter(t => t.completed).length;
            const totalCount = tasksOnDate.length;

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (isSelected) dayClass += ' selected';
            if (totalCount > 0) dayClass += ' has-tasks';

            calendarHTML += `
                <div class="${dayClass}" data-date="${dateStr}">
                    <div class="calendar-day-number">${date}</div>
                    ${totalCount > 0 ? `
                        <div class="calendar-day-indicator">
                            <span class="task-count">${completedCount}/${totalCount}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Next month days
        const totalCells = firstDayOfWeek + lastDate;
        const remainingCells = 7 - (totalCells % 7);
        if (remainingCells < 7) {
            for (let date = 1; date <= remainingCells; date++) {
                calendarHTML += `
                    <div class="calendar-day other-month" data-date="${year}-${String(month + 2).padStart(2, '0')}-${String(date).padStart(2, '0')}">
                        <div class="calendar-day-number">${date}</div>
                    </div>
                `;
            }
        }

        calendarHTML += `
                </div>
            </div>
            <div class="calendar-tasks-panel" id="calendarTasksPanel">
                <p class="calendar-no-selection">Select a date to view tasks</p>
            </div>
        `;

        this.container.innerHTML = calendarHTML;
        this.attachEventListeners();
        this.addStyles();
    }

    /**
     * Get tasks for a specific date
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @returns {Array} - Array of tasks
     */
    getTasksForDate(dateStr) {
        return this.taskDataManager.getAllTasks().filter(task => {
            if (!task.dueDate) return false;
            return task.dueDate.split('T')[0] === dateStr;
        });
    }

    /**
     * Show tasks for a selected date
     * @param {string} dateStr - Date in YYYY-MM-DD format
     */
    showTasksForDate(dateStr) {
        this.selectedDate = dateStr;
        const tasks = this.getTasksForDate(dateStr);
        const panel = document.getElementById('calendarTasksPanel');

        if (!panel) return;

        if (tasks.length === 0) {
            panel.innerHTML = `
                <div class="calendar-no-selection">
                    <p>No tasks due on ${new Date(dateStr).toLocaleDateString()}</p>
                </div>
            `;
            return;
        }

        const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let tasksHTML = `
            <div class="calendar-tasks-header">
                <h3>${formattedDate}</h3>
                <span class="calendar-tasks-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="calendar-tasks-list">
        `;

        tasks.forEach(task => {
            const project = this.taskDataManager.getProjectById(task.projectId);
            const statusIcon = task.completed ? '✅' :
                             task.status === 'in-progress' ? '🔄' :
                             task.status === 'blocked' ? '🚫' : '📝';

            tasksHTML += `
                <div class="calendar-task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                    <div class="calendar-task-status">${statusIcon}</div>
                    <div class="calendar-task-content">
                        <div class="calendar-task-title">${this.escapeHtml(task.text)}</div>
                        <div class="calendar-task-meta">
                            ${project ? `<span class="calendar-task-project" style="color: ${project.color}">${project.icon} ${project.name}</span>` : ''}
                            ${task.priority === 'high' ? '<span class="calendar-task-priority high">High Priority</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        tasksHTML += '</div>';
        panel.innerHTML = tasksHTML;

        // Add click handlers to task items
        const taskItems = panel.querySelectorAll('.calendar-task-item');
        taskItems.forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                // Trigger task details view
                if (window.showTaskDetails) {
                    window.showTaskDetails(taskId);
                }
            });
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Previous month
        const prevBtn = document.getElementById('calendarPrevMonth');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render();
            });
        }

        // Next month
        const nextBtn = document.getElementById('calendarNextMonth');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.render();
            });
        }

        // Today button
        const todayBtn = document.getElementById('calendarToday');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.render();
            });
        }

        // Day clicks
        const dayElements = this.container.querySelectorAll('.calendar-day:not(.other-month)');
        dayElements.forEach(day => {
            day.addEventListener('click', () => {
                // Remove previous selection
                this.container.querySelectorAll('.calendar-day').forEach(d => {
                    d.classList.remove('selected');
                });
                // Add selection
                day.classList.add('selected');
                // Show tasks
                const dateStr = day.dataset.date;
                this.showTasksForDate(dateStr);
            });
        });
    }

    /**
     * Add inline styles for calendar
     */
    addStyles() {
        if (document.getElementById('calendar-view-styles')) return;

        const style = document.createElement('style');
        style.id = 'calendar-view-styles';
        style.textContent = `
            .calendar-view {
                background: var(--background-color);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .calendar-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                gap: 12px;
            }
            .calendar-title {
                font-size: 20px;
                font-weight: 600;
                margin: 0;
                flex: 1;
                text-align: center;
            }
            .calendar-nav-btn {
                background: var(--background-hover);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                color: var(--text-color);
                font-size: 14px;
            }
            .calendar-nav-btn:hover {
                background: var(--border-color);
            }
            .calendar-today-btn {
                background: var(--primary-color);
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                color: white;
                font-size: 14px;
                font-weight: 500;
            }
            .calendar-today-btn:hover {
                opacity: 0.9;
            }
            .calendar-weekdays {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
                margin-bottom: 8px;
            }
            .calendar-weekday {
                text-align: center;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-muted);
                padding: 8px;
            }
            .calendar-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
            }
            .calendar-day {
                aspect-ratio: 1;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }
            .calendar-day:hover {
                background: var(--background-hover);
                border-color: var(--primary-color);
            }
            .calendar-day.other-month {
                opacity: 0.3;
                cursor: default;
            }
            .calendar-day.today {
                background: rgba(59, 130, 246, 0.1);
                border-color: var(--primary-color);
                font-weight: 600;
            }
            .calendar-day.selected {
                background: var(--primary-color);
                color: white;
            }
            .calendar-day.has-tasks .calendar-day-number {
                font-weight: 600;
            }
            .calendar-day-number {
                font-size: 14px;
                margin-bottom: 4px;
            }
            .calendar-day-indicator {
                font-size: 10px;
                color: var(--text-muted);
            }
            .calendar-day.selected .calendar-day-indicator {
                color: rgba(255, 255, 255, 0.9);
            }
            .calendar-tasks-panel {
                background: var(--background-color);
                border-radius: 8px;
                padding: 20px;
                min-height: 200px;
            }
            .calendar-no-selection {
                text-align: center;
                color: var(--text-muted);
                padding: 40px 20px;
            }
            .calendar-tasks-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border-color);
            }
            .calendar-tasks-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            .calendar-tasks-count {
                font-size: 14px;
                color: var(--text-muted);
            }
            .calendar-tasks-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .calendar-task-item {
                display: flex;
                gap: 12px;
                padding: 12px;
                background: var(--background-hover);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }
            .calendar-task-item:hover {
                border-color: var(--primary-color);
                background: var(--background-color);
            }
            .calendar-task-item.completed {
                opacity: 0.6;
            }
            .calendar-task-status {
                font-size: 18px;
            }
            .calendar-task-content {
                flex: 1;
            }
            .calendar-task-title {
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
            }
            .calendar-task-meta {
                display: flex;
                gap: 12px;
                font-size: 12px;
                color: var(--text-muted);
            }
            .calendar-task-priority.high {
                color: #ef4444;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export to global scope
window.CalendarView = CalendarView;

Logger.debug('calendar-view.js loaded');

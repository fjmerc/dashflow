/**
 * Task Details Panel Extensions
 * Adds comments, recurrence, duplication, and other features to task details
 */

/**
 * Enhance task details panel
 * This function should be called after the task details panel is rendered
 */
function enhanceTaskDetailsPanel(taskId) {
    const task = window.taskDataManager.getTaskById(taskId);
    if (!task) return;

    // Add comments section
    addCommentsSection(taskId);

    // Add recurring task UI
    addRecurringTaskSection(taskId);

    // Add action buttons (duplicate, etc.)
    addTaskActionButtons(taskId);
}

/**
 * Add comments section to task details
 */
function addCommentsSection(taskId) {
    const task = window.taskDataManager.getTaskById(taskId);
    if (!task) return;

    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (!deleteBtn || !deleteBtn.parentElement) return;

    const commentsHTML = `
        <div class="task-detail-section">
            <label class="task-detail-label">
                <i class="fas fa-comments"></i> Comments & Activity
            </label>
            <div class="comments-list" id="commentsList">
                ${task.comments.length === 0 ? '<p class="comments-empty">No comments yet</p>' : task.comments.map(comment => `
                    <div class="comment-item ${comment.type === 'system' ? 'system-comment' : ''}" data-comment-id="${comment.id}">
                        <div class="comment-header">
                            <span class="comment-icon">${comment.type === 'system' ? '🤖' : '💬'}</span>
                            <span class="comment-time">${new Date(comment.createdAt).toLocaleString()}</span>
                            ${comment.type === 'user' ? `
                                <button class="comment-delete-btn" data-comment-id="${comment.id}" title="Delete comment">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="comment-text">${escapeHtml(comment.text)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="comment-add-form">
                <textarea
                    class="comment-input"
                    id="commentInput"
                    placeholder="Add a comment..."
                    rows="2"
                ></textarea>
                <button class="comment-add-btn" id="addCommentBtn" title="Add comment">
                    <i class="fas fa-paper-plane"></i> Add Comment
                </button>
            </div>
        </div>
    `;

    deleteBtn.parentElement.insertAdjacentHTML('beforebegin', commentsHTML);

    // Attach event listeners
    const commentInput = document.getElementById('commentInput');
    const addCommentBtn = document.getElementById('addCommentBtn');

    const addComment = () => {
        const text = commentInput.value.trim();
        if (!text) return;

        window.taskDataManager.addComment(taskId, text, 'user');
        commentInput.value = '';

        // Refresh task details
        if (window.showTaskDetails) {
            window.showTaskDetails(taskId);
        }
    };

    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            addComment();
        }
    });

    addCommentBtn.addEventListener('click', addComment);

    // Delete comment handlers
    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.commentId;
            if (confirm('Delete this comment?')) {
                window.taskDataManager.deleteComment(taskId, commentId);
                if (window.showTaskDetails) {
                    window.showTaskDetails(taskId);
                }
            }
        });
    });

    addCommentsStyles();
}

/**
 * Add recurring task section
 */
function addRecurringTaskSection(taskId) {
    const task = window.taskDataManager.getTaskById(taskId);
    if (!task) return;

    const dueDateSection = document.querySelector('.task-detail-section');
    if (!dueDateSection) return;

    const recurringHTML = `
        <div class="task-detail-section recurring-section">
            <label class="task-detail-label">
                <input type="checkbox" id="detailTaskRecurring" ${task.isRecurring ? 'checked' : ''}>
                <i class="fas fa-repeat"></i> Recurring Task
            </label>
            <div class="recurring-options" id="recurringOptions" style="display: ${task.isRecurring ? 'block' : 'none'};">
                <div class="task-detail-row">
                    <div class="task-detail-section">
                        <label class="task-detail-label">Repeat</label>
                        <select class="task-detail-select" id="recurrenceType">
                            <option value="daily" ${task.recurrence?.type === 'daily' ? 'selected' : ''}>Daily</option>
                            <option value="weekly" ${task.recurrence?.type === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="monthly" ${task.recurrence?.type === 'monthly' ? 'selected' : ''}>Monthly</option>
                            <option value="yearly" ${task.recurrence?.type === 'yearly' ? 'selected' : ''}>Yearly</option>
                        </select>
                    </div>
                    <div class="task-detail-section">
                        <label class="task-detail-label">Every</label>
                        <input type="number" class="task-detail-input" id="recurrenceInterval" min="1" value="${task.recurrence?.interval || 1}">
                    </div>
                </div>
                <div class="task-detail-section">
                    <label class="task-detail-label">End Date (optional)</label>
                    <input type="date" class="task-detail-input" id="recurrenceEndDate"
                        value="${task.recurrence?.endDate || ''}">
                </div>
            </div>
        </div>
    `;

    // Insert after due date section
    const myDaySection = Array.from(document.querySelectorAll('.task-detail-section'))
        .find(s => s.textContent.includes('Add to My Day'));
    if (myDaySection) {
        myDaySection.insertAdjacentHTML('afterend', recurringHTML);
    }

    // Attach event listeners
    const recurringCheckbox = document.getElementById('detailTaskRecurring');
    const recurringOptions = document.getElementById('recurringOptions');

    recurringCheckbox.addEventListener('change', () => {
        recurringOptions.style.display = recurringCheckbox.checked ? 'block' : 'none';

        if (recurringCheckbox.checked) {
            // Enable recurrence with default values
            const type = document.getElementById('recurrenceType').value;
            const interval = parseInt(document.getElementById('recurrenceInterval').value);
            const endDate = document.getElementById('recurrenceEndDate').value || null;

            window.taskDataManager.updateTask(taskId, {
                isRecurring: true,
                recurrence: { type, interval, endDate }
            });
        } else {
            // Disable recurrence
            window.taskDataManager.updateTask(taskId, {
                isRecurring: false,
                recurrence: null
            });
        }
    });

    // Save recurrence settings on change
    ['recurrenceType', 'recurrenceInterval', 'recurrenceEndDate'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                if (recurringCheckbox.checked) {
                    const type = document.getElementById('recurrenceType').value;
                    const interval = parseInt(document.getElementById('recurrenceInterval').value);
                    const endDate = document.getElementById('recurrenceEndDate').value || null;

                    window.taskDataManager.updateTask(taskId, {
                        recurrence: { type, interval, endDate }
                    });
                }
            });
        }
    });
}

/**
 * Add task action buttons (duplicate, etc.)
 */
function addTaskActionButtons(taskId) {
    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (!deleteBtn) return;

    const actionsHTML = `
        <div class="task-detail-section">
            <div class="task-actions-row">
                <button class="task-detail-btn" id="duplicateTaskBtn">
                    <i class="fas fa-copy"></i>
                    Duplicate Task
                </button>
            </div>
        </div>
    `;

    deleteBtn.parentElement.insertAdjacentHTML('beforebegin', actionsHTML);

    // Duplicate button handler
    const duplicateBtn = document.getElementById('duplicateTaskBtn');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            const duplicatedTask = window.taskDataManager.duplicateTask(taskId);
            if (duplicatedTask) {
                // Close detail panel and show the new task
                if (window.closeDetailPanel) {
                    window.closeDetailPanel();
                }
                if (window.renderTasks) {
                    window.renderTasks();
                }
                // Show notification
                if (window.showNotification) {
                    window.showNotification('Task duplicated successfully', 'success');
                }
            }
        });
    }
}

/**
 * Add styles for comments and recurring tasks
 */
function addCommentsStyles() {
    if (document.getElementById('task-details-extensions-styles')) return;

    const style = document.createElement('style');
    style.id = 'task-details-extensions-styles';
    style.textContent = `
        .comments-list {
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .comments-empty {
            text-align: center;
            color: var(--text-muted);
            padding: 20px;
            font-style: italic;
        }
        .comment-item {
            background: var(--background-hover);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
        }
        .comment-item.system-comment {
            background: rgba(59, 130, 246, 0.1);
            border-color: var(--primary-color);
        }
        .comment-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 12px;
            color: var(--text-muted);
        }
        .comment-icon {
            font-size: 14px;
        }
        .comment-time {
            flex: 1;
        }
        .comment-delete-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            font-size: 12px;
        }
        .comment-delete-btn:hover {
            color: #ef4444;
        }
        .comment-text {
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
        }
        .comment-add-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .comment-input {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--background-color);
            color: var(--text-color);
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
        }
        .comment-input:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        .comment-add-btn {
            padding: 10px 16px;
            background: var(--primary-color);
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .comment-add-btn:hover {
            opacity: 0.9;
        }
        .recurring-section {
            background: rgba(168, 85, 247, 0.1);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .recurring-options {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color);
        }
        .task-actions-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .task-actions-row .task-detail-btn {
            flex: 1;
            min-width: 200px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Intercept showTaskDetails to enhance it
 */
function interceptShowTaskDetails() {
    if (!window.showTaskDetails) return;

    const originalShowTaskDetails = window.showTaskDetails;
    window.showTaskDetails = function(taskId) {
        // Call original function
        originalShowTaskDetails(taskId);

        // Enhance with new features
        setTimeout(() => {
            enhanceTaskDetailsPanel(taskId);
        }, 50);
    };
}

// Initialize when task app is ready
window.addEventListener('taskAppReady', () => {
    Logger.debug('Task Details Extensions: Task app ready event received');
    interceptShowTaskDetails();
});

// Fallback: if already loaded
if (document.readyState === 'complete' && window.showTaskDetails) {
    setTimeout(interceptShowTaskDetails, 100);
}

// Export to global scope
window.enhanceTaskDetailsPanel = enhanceTaskDetailsPanel;

Logger.debug('task-details-extensions.js loaded');

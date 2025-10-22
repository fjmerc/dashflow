// Custom modal dialog functions
// Modal showModal function now provided by modal-manager.js

// Modal hideModal function now provided by modal-manager.js

const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoNotes = document.getElementById('todoNotes');
const todoList = document.getElementById('todoList');
const backToDashboard = document.getElementById('backToDashboard');
const settingsBtn = document.getElementById('settingsBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const themeColorBtn = document.getElementById('themeColorBtn');
const importTodosBtn = document.getElementById('importTodosBtn');
const importInput = document.getElementById('importInput');

let todos = [];
let username = localStorage.getItem('username') || 'User';
let searchDebounceTimer;

// Function to reload todos from localStorage with enhanced debugging
function reloadTodos() {
    try {
        const storedTodos = localStorage.getItem('todos');
        Logger.debug('Current localStorage todos:', storedTodos);

        if (!storedTodos) {
            Logger.debug('No todos found in localStorage');
            todos = [];
        } else {
            todos = JSON.parse(storedTodos);
            Logger.debug('Successfully parsed todos:', todos);
        }

        renderTodos();
        Logger.debug('Todos rendered, current count:', todos.length);
    } catch (error) {
        Logger.error('Error loading todos:', error);
        if (window.errorHandler) {
            window.errorHandler.handleError(error, 'storage', {
                operation: 'load_todos'
            });
        }
        todos = [];
        renderTodos();
    }
}

// Enhanced initialization
function initializeTodos() {
    Logger.debug('Initializing todos page');
    reloadTodos();
    updateTitle();
}

// Listen for changes to localStorage (e.g., from import)
window.addEventListener('storage', function(e) {
    Logger.debug('Storage event received:', e.key, e.newValue);
    if (e.key === 'todos') {
        reloadTodos();
    } else if (e.key === 'username') {
        username = e.newValue || 'User';
        updateTitle();
    }
});

// Create a proxy for localStorage to detect changes in the same window
// Use a flag to prevent infinite loops from our own updates
let isUpdatingTodos = false;
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'todos' && !isUpdatingTodos) {
        // Set flag to prevent loop and reload todos after a brief delay
        setTimeout(() => reloadTodos(), 50);
    }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    Logger.debug('DOMContentLoaded event fired');

    // Make sure modal is hidden initially
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
    }

    initializeTodos();
});

// Reload when page becomes visible
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        Logger.debug('Page became visible, reloading todos');
        reloadTodos();
    }
});

// Enhanced todosUpdated event listener
window.addEventListener('todosUpdated', function(e) {
    Logger.debug('todosUpdated event received:', e.detail);
    // Force a direct localStorage check
    const currentTodos = localStorage.getItem('todos');
    Logger.debug('Current localStorage state:', currentTodos);
    reloadTodos();
});

function updateTitle() {
    document.title = `${username}'s Task List`;
    document.querySelector('h1').textContent = `${username}'s Task List`;
}

function changeUsername() {
    const newUsername = prompt('Enter your name:', username);
    if (newUsername && newUsername.trim()) {
        username = newUsername.trim();
        localStorage.setItem('username', username);
        updateTitle();
    }
}

// Priority levels
const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

function saveTodos() {
    isUpdatingTodos = true;
    localStorage.setItem('todos', JSON.stringify(todos));
    // Clear flag after storage is complete
    setTimeout(() => {
        isUpdatingTodos = false;
    }, 100);
}

function filterTodos(searchText = '', priorityFilter = 'all') {
    return todos.filter(todo => {
        const matchesSearch = todo.text.toLowerCase().includes(searchText.toLowerCase()) ||
                            (todo.summary && todo.summary.toLowerCase().includes(searchText.toLowerCase())) ||
                            (todo.notes && todo.notes.toLowerCase().includes(searchText.toLowerCase()));
        const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });
}

function renderTodos(searchText = '', priorityFilter = 'all') {
    Logger.debug('Rendering todos with filter:', searchText, priorityFilter);
    todoList.innerHTML = '';
    const filteredTodos = filterTodos(searchText, priorityFilter);
    filteredTodos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item priority-${todo.priority || 'none'} ${todo.completed ? 'completed-task' : ''}`;
        li.setAttribute('data-index', index); // Add original index as a data attribute
        const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';
        const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

        li.innerHTML = `
            <div class="todo-content">
                <div class="todo-header">
                    <span class="todo-text ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">${todo.text}</span>
                    <span class="todo-due-date ${isOverdue ? 'overdue' : ''}">${dueDate}</span>
                </div>
                ${todo.summary || todo.notes ?
                    `<div class="todo-notes-container">
                        <p class="todo-summary${todo.summary && todo.summary.length > 100 ? ' truncated' : ''}">${(todo.summary || todo.notes).slice(0, 100)}${(todo.summary || todo.notes).length > 100 ? '...' : ''}</p>
                        ${(todo.summary || todo.notes).length > 100 ? '<span class="todo-summary-expand" data-index="' + index + '">Show more</span>' : ''}
                    </div>`
                : ''}
                <span class="todo-priority">Priority: <span class="priority-indicator priority-${todo.priority || 'none'}">${todo.priority || 'None'}</span></span>
            </div>
            <div class="todo-actions">
                <button class="todo-btn complete-btn" data-action="complete" data-index="${index}" title="Toggle Complete">
                    <i class="fas fa-check"></i>
                </button>
                <button class="todo-btn edit-btn" data-action="edit" data-index="${index}" title="Edit Task" style="background-color: #eab308;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="todo-btn delete-btn" data-action="delete" data-index="${index}" title="Delete Task">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="todo-btn summary-btn" data-action="summary" data-index="${index}" title="Edit Summary" style="background-color: #3498db;">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="todo-btn date-btn" data-action="date" data-index="${index}" title="Set Due Date">
                    <i class="fas fa-calendar"></i>
                </button>
                <button class="todo-btn priority-btn priority-${todo.priority || 'none'}-btn" data-action="priority" data-index="${index}" title="Toggle Priority">
                    <i class="fas fa-flag"></i>
                </button>
            </div>
        `;
        todoList.appendChild(li);
    });
}

function addTodo(event) {
    event.preventDefault();
    const todoText = todoInput.value.trim();
    const notes = todoNotes.value.trim();
    if (todoText) {
        todos.unshift({
            text: todoText,
            completed: false,
            summary: notes, // Use the notes field for summary
            notes: notes,  // Add a dedicated notes field for future compatibility
            priority: PRIORITIES.MEDIUM,
            dueDate: null
        });
        saveTodos();
        todoInput.value = '';
        todoNotes.value = '';
        renderTodos();
    }
}

function editDueDate(index) {
    const currentDate = todos[index].dueDate ? new Date(todos[index].dueDate).toISOString().split('T')[0] : '';
    const newDate = prompt('Enter due date (YYYY-MM-DD):', currentDate);
    if (newDate !== null) {
        todos[index].dueDate = newDate ? new Date(newDate).toISOString() : null;
        saveTodos();
        renderTodos();
    }
}

function togglePriority(index) {
    const priorities = Object.values(PRIORITIES);
    const currentPriorityIndex = priorities.indexOf(todos[index].priority || PRIORITIES.MEDIUM);
    const nextPriorityIndex = (currentPriorityIndex + 1) % priorities.length;
    todos[index].priority = priorities[nextPriorityIndex];
    saveTodos();
    renderTodos();
}

function toggleComplete(index) {
    todos[index].completed = !todos[index].completed;
    saveTodos();
    renderTodos();
}

function editTodo(index) {
    Logger.debug('editTodo called for index:', index);
    // Create a modal for editing the entire task
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Task</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="editTaskText">Task</label>
                    <input type="text" id="editTaskText" value="${todos[index].text}" required>
                </div>
                <div class="form-group">
                    <label for="editTaskNotes">Notes</label>
                    <textarea id="editTaskNotes" rows="4" placeholder="Add notes or details about this task">${todos[index].summary || todos[index].notes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editTaskPriority">Priority</label>
                    <select id="editTaskPriority">
                        <option value="low" ${todos[index].priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${todos[index].priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${todos[index].priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editTaskDueDate">Due Date</label>
                    <input type="date" id="editTaskDueDate" value="${todos[index].dueDate ? new Date(todos[index].dueDate).toISOString().split('T')[0] : ''}">
                </div>
            </div>
            <div class="modal-footer">
                <button id="saveTaskBtn" class="modal-btn primary">Save</button>
                <button id="cancelTaskBtn" class="modal-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#cancelTaskBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#saveTaskBtn').addEventListener('click', () => {
        const taskText = document.getElementById('editTaskText').value.trim();

        if (!taskText) {
            alert('Task text cannot be empty');
            return;
        }

        const taskNotes = document.getElementById('editTaskNotes').value.trim();
        const taskPriority = document.getElementById('editTaskPriority').value;
        const taskDueDate = document.getElementById('editTaskDueDate').value;

        todos[index].text = taskText;
        todos[index].summary = taskNotes;
        todos[index].notes = taskNotes;
        todos[index].priority = taskPriority;
        todos[index].dueDate = taskDueDate ? new Date(taskDueDate).toISOString() : null;

        saveTodos();
        renderTodos();
        document.body.removeChild(modal);
    });

    // Allow clicking outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // Focus the task text input
    setTimeout(() => {
        document.getElementById('editTaskText').focus();
    }, 0);
}

function deleteTodo(index) {
    showModal(
        'Delete Task',
        'Are you sure you want to delete this task?',
        // Yes callback
        () => {
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
        },
        // No callback
        () => {
            // Do nothing
        }
    );
}

function viewFullNotes(index) {
    Logger.debug('viewFullNotes called for index:', index);
    // Create a modal to display the full notes
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    const notesContent = todos[index].summary || todos[index].notes || 'No notes available.';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${todos[index].text}</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body notes-view">
                <p>${notesContent.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="modal-footer">
                <button id="editNotesBtn" class="modal-btn primary">Edit Notes</button>
                <button id="closeNotesBtn" class="modal-btn">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#closeNotesBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#editNotesBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
        editSummary(index);
    });

    // Allow clicking outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function editSummary(index) {
    Logger.debug('editSummary called for index:', index);
    // Create a modal for editing notes
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Notes</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <textarea id="editNotesTextarea" rows="6" placeholder="Add detailed notes about this task">${todos[index].summary || ''}</textarea>
            </div>
            <div class="modal-footer">
                <button id="saveNotesBtn" class="modal-btn primary">Save</button>
                <button id="cancelNotesBtn" class="modal-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#cancelNotesBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#saveNotesBtn').addEventListener('click', () => {
        const newNotes = document.getElementById('editNotesTextarea').value.trim();
        todos[index].summary = newNotes;
        todos[index].notes = newNotes; // Update both fields for compatibility
        saveTodos();
        renderTodos();
        document.body.removeChild(modal);
    });

    // Allow clicking outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // Focus the textarea
    setTimeout(() => {
        document.getElementById('editNotesTextarea').focus();
    }, 0);
}

// Get new filter elements
const searchTodo = document.getElementById('searchTodo');
const priorityFilter = document.getElementById('priorityFilter');

// Add event listeners for filters with debouncing
searchTodo.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        renderTodos(e.target.value, priorityFilter.value);
    }, 300); // Wait 300ms after user stops typing
});

priorityFilter.addEventListener('change', (e) => {
    renderTodos(searchTodo.value, e.target.value);
});

// Initialize Sortable and setup drag functionality
new Sortable(todoList, {
    animation: 150,
    ghostClass: 'todo-item-ghost',
    onEnd: () => {
        // Extract data attributes to maintain original indices
        const newOrder = Array.from(todoList.children).map((li, newIndex) => {
            // Try to get the original index from the data attribute
            const originalIndex = parseInt(li.getAttribute('data-index'), 10);
            return { originalIndex, newIndex };
        });

        // Reorder the todos array based on the new order
        const reorderedTodos = [];
        newOrder.forEach(item => {
            if (!isNaN(item.originalIndex) && todos[item.originalIndex]) {
                reorderedTodos[item.newIndex] = todos[item.originalIndex];
            }
        });

        // Update todos with valid entries only
        todos = reorderedTodos.filter(Boolean);

        // Save and re-render
        saveTodos();
        renderTodos();
    }
});

// Initialize everything
updateTitle();

// Initialize todos in localStorage if not present
if (!localStorage.getItem('todos')) {
    localStorage.setItem('todos', JSON.stringify([]));
}

// Ensure todos are loaded, with retry mechanism
function ensureTodosLoaded() {
    Logger.debug('Ensuring todos are loaded...');
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        try {
            const parsed = JSON.parse(storedTodos);
            if (Array.isArray(parsed) && parsed.length > 0) {
                Logger.debug('Found valid todos in localStorage:', parsed.length);
                todos = parsed;
                renderTodos();
                return;
            }
        } catch (e) {
            Logger.error('Error parsing stored todos:', e);
            if (window.errorHandler) {
                window.errorHandler.handleError(e, 'storage', {
                    operation: 'parse_todos'
                });
            }
        }
    }

    // If we get here, either no todos or invalid format
    Logger.debug('No valid todos found, will retry in 1 second...');
    setTimeout(ensureTodosLoaded, 1000); // Retry after 1 second
}

// Start the initialization process
reloadTodos();
ensureTodosLoaded();

// Add event delegation for todo actions
todoList.addEventListener('click', (e) => {
    // Find the button or element clicked
    const actionButton = e.target.closest('[data-action]');
    const showMoreLink = e.target.closest('.todo-summary-expand');

    if (actionButton) {
        const index = parseInt(actionButton.getAttribute('data-index'), 10);
        const action = actionButton.getAttribute('data-action');

        // Execute the appropriate action based on button clicked
        switch(action) {
            case 'complete':
                Logger.debug('Toggle complete for index:', index);
                toggleComplete(index);
                break;
            case 'edit':
                Logger.debug('Edit todo for index:', index);
                editTodo(index);
                break;
            case 'delete':
                Logger.debug('Delete todo for index:', index);
                deleteTodo(index);
                break;
            case 'summary':
                Logger.debug('Edit summary for index:', index);
                editSummary(index);
                break;
            case 'date':
                Logger.debug('Edit due date for index:', index);
                editDueDate(index);
                break;
            case 'priority':
                Logger.debug('Toggle priority for index:', index);
                togglePriority(index);
                break;
        }
    } else if (showMoreLink) {
        const index = parseInt(showMoreLink.getAttribute('data-index'), 10);
        Logger.debug('View full notes for index:', index);
        viewFullNotes(index);
    }
});

// Add all event listeners
todoForm.addEventListener('submit', addTodo);
backToDashboard.addEventListener('click', () => window.location.href = 'index.html');
darkModeBtn.addEventListener('click', () => themeManager.toggleDarkMode());
themeColorBtn.addEventListener('click', () => themeManager.changeThemeColor());
settingsBtn.addEventListener('click', changeUsername);

// Import functionality
importTodosBtn.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        importAllData(file)
            .then(() => {
                Logger.debug('Import completed successfully');
                // No need for alert as importAllData already shows one
                // Reload todos from localStorage since importAllData updates it
                reloadTodos();
            })
            .catch(error => {
                Logger.error('Error importing data:', error);
                alert('Failed to import data: ' + error.message);
            });
    }
});


// Export All functionality (both dashboard and todos)
exportAllBtn.addEventListener('click', () => {
    exportAllData(false); // false for non-silent export
});

// Log the initial state
Logger.debug('Initial todos state:', todos);
Logger.debug('Initial localStorage state:', localStorage.getItem('todos'));

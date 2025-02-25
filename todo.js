// Custom modal dialog functions
function showModal(title, message, yesCallback, noCallback) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalYes = document.getElementById('modalYes');
    const modalNo = document.getElementById('modalNo');
    
    modalTitle.textContent = title;
    
    // Sanitize the message first, then replace newlines with <br> tags
    const div = document.createElement('div');
    div.textContent = message;
    const sanitized = div.innerHTML;
    modalMessage.innerHTML = sanitized.replace(/\n/g, '<br>');
    
    // Remove any existing event listeners
    const newYesBtn = modalYes.cloneNode(true);
    const newNoBtn = modalNo.cloneNode(true);
    modalYes.parentNode.replaceChild(newYesBtn, modalYes);
    modalNo.parentNode.replaceChild(newNoBtn, modalNo);
    
    // Add new event listeners
    newYesBtn.addEventListener('click', () => {
        hideModal();
        if (yesCallback) yesCallback();
    });
    
    newNoBtn.addEventListener('click', () => {
        hideModal();
        if (noCallback) noCallback();
    });
    
    // Handle Escape key to close the modal
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            hideModal();
            if (noCallback) noCallback();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Handle Enter key to trigger Yes button only if we're not in an input field
    const handleEnter = (e) => {
        // Don't trigger on input fields, textareas, etc.
        if (e.key === 'Enter' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            hideModal();
            if (yesCallback) yesCallback();
            document.removeEventListener('keydown', handleEnter);
        }
    };
    document.addEventListener('keydown', handleEnter);
    
    // Store references to event handlers for proper cleanup
    window.modalKeyHandlers = {
        escape: handleEscape,
        enter: handleEnter
    };
    
    // Show the modal with a slight delay to prevent flash during page transitions
    setTimeout(() => {
        modal.style.display = 'block';
        
        // Set focus to the No button for better keyboard navigation
        // (so users don't accidentally confirm destructive actions)
        setTimeout(() => newNoBtn.focus(), 50);
    }, 10);
}

function hideModal() {
    const modal = document.getElementById('customModal');
    modal.style.display = 'none';
    
    // Remove keyboard event listeners when closing
    if (window.modalKeyHandlers) {
        document.removeEventListener('keydown', window.modalKeyHandlers.escape);
        document.removeEventListener('keydown', window.modalKeyHandlers.enter);
        window.modalKeyHandlers = null;
    }
}

const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoNotes = document.getElementById('todoNotes');
const todoList = document.getElementById('todoList');
const backToDashboard = document.getElementById('backToDashboard');
const settingsBtn = document.getElementById('settingsBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const themeColorBtn = document.getElementById('themeColorBtn');
const importTodosBtn = document.getElementById('importTodosBtn');
const exportTodosBtn = document.getElementById('exportTodosBtn');

// Create hidden file input for importing
const importTodosInput = document.createElement('input');
importTodosInput.type = 'file';
importTodosInput.accept = '.json';
importTodosInput.style.display = 'none';
document.body.appendChild(importTodosInput);

let todos = [];
let username = localStorage.getItem('username') || 'User';

// Function to reload todos from localStorage with enhanced debugging
function reloadTodos() {
    try {
        const storedTodos = localStorage.getItem('todos');
        console.log('[Todo Debug] Current localStorage todos:', storedTodos);
        
        if (!storedTodos) {
            console.log('[Todo Debug] No todos found in localStorage');
            todos = [];
        } else {
            todos = JSON.parse(storedTodos);
            console.log('[Todo Debug] Successfully parsed todos:', todos);
        }
        
        renderTodos();
        console.log('[Todo Debug] Todos rendered, current count:', todos.length);
    } catch (error) {
        console.error('[Todo Debug] Error loading todos:', error);
        todos = [];
        renderTodos();
    }
}

// Enhanced initialization
function initializeTodos() {
    console.log('[Todo Debug] Initializing todos page');
    reloadTodos();
    updateTitle();
}

// Listen for changes to localStorage (e.g., from import)
window.addEventListener('storage', function(e) {
    console.log('[Todo Debug] Storage event received:', e.key, e.newValue);
    if (e.key === 'todos') {
        reloadTodos();
    } else if (e.key === 'username') {
        username = e.newValue || 'User';
        updateTitle();
    }
});

// Create a proxy for localStorage to detect changes in the same window
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    console.log('[Todo Debug] localStorage.setItem called:', key, value);
    originalSetItem.apply(this, arguments);
    if (key === 'todos') {
        console.log('[Todo Debug] Todos updated in localStorage, reloading...');
        reloadTodos();
    }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Todo Debug] DOMContentLoaded event fired');
    
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
        console.log('[Todo Debug] Page became visible, reloading todos');
        reloadTodos();
    }
});

// Enhanced todosUpdated event listener
window.addEventListener('todosUpdated', function(e) {
    console.log('[Todo Debug] todosUpdated event received:', e.detail);
    // Force a direct localStorage check
    const currentTodos = localStorage.getItem('todos');
    console.log('[Todo Debug] Current localStorage state:', currentTodos);
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
    localStorage.setItem('todos', JSON.stringify(todos));
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
    todoList.innerHTML = '';
    const filteredTodos = filterTodos(searchText, priorityFilter);
    filteredTodos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item priority-${todo.priority || 'none'}`;
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
                <span class="todo-priority">Priority: ${todo.priority || 'None'}</span>
            </div>
            <div class="todo-actions">
                <button class="todo-btn complete-btn" data-action="complete" data-index="${index}" title="Toggle Complete">
                    <i class="fas fa-check"></i>
                </button>
                <button class="todo-btn edit-btn" data-action="edit" data-index="${index}" title="Edit Task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="todo-btn delete-btn" data-action="delete" data-index="${index}" title="Delete Task">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="todo-btn summary-btn" data-action="summary" data-index="${index}" title="Edit Summary">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="todo-btn date-btn" data-action="date" data-index="${index}" title="Set Due Date">
                    <i class="fas fa-calendar"></i>
                </button>
                <button class="todo-btn priority-btn" data-action="priority" data-index="${index}" title="Toggle Priority">
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
        todos.push({
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
    // Create a modal for editing the entire task
    const modal = document.createElement('div');
    modal.className = 'modal';
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
                <button id="saveTaskBtn" class="btn primary">Save</button>
                <button id="cancelTaskBtn" class="btn">Cancel</button>
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
    // Create a modal to display the full notes
    const modal = document.createElement('div');
    modal.className = 'modal';
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
                <button id="editNotesBtn" class="btn primary">Edit Notes</button>
                <button id="closeNotesBtn" class="btn">Close</button>
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
    // Create a modal for editing notes
    const modal = document.createElement('div');
    modal.className = 'modal';
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
                <button id="saveNotesBtn" class="btn primary">Save</button>
                <button id="cancelNotesBtn" class="btn">Cancel</button>
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

// Add event listeners for filters
searchTodo.addEventListener('input', (e) => {
    renderTodos(e.target.value, priorityFilter.value);
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
    console.log('[Todo Debug] Ensuring todos are loaded...');
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        try {
            const parsed = JSON.parse(storedTodos);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('[Todo Debug] Found valid todos in localStorage:', parsed.length);
                todos = parsed;
                renderTodos();
                return;
            }
        } catch (e) {
            console.error('[Todo Debug] Error parsing stored todos:', e);
        }
    }
    
    // If we get here, either no todos or invalid format
    console.log('[Todo Debug] No valid todos found, will retry in 1 second...');
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
                toggleComplete(index);
                break;
            case 'edit':
                editTodo(index);
                break;
            case 'delete':
                deleteTodo(index);
                break;
            case 'summary':
                editSummary(index);
                break;
            case 'date':
                editDueDate(index);
                break;
            case 'priority':
                togglePriority(index);
                break;
        }
    } else if (showMoreLink) {
        const index = parseInt(showMoreLink.getAttribute('data-index'), 10);
        viewFullNotes(index);
    }
});

// Add all event listeners
todoForm.addEventListener('submit', addTodo);
searchTodo.addEventListener('input', (e) => renderTodos(e.target.value, priorityFilter.value));
priorityFilter.addEventListener('change', (e) => renderTodos(searchTodo.value, e.target.value));
backToDashboard.addEventListener('click', () => window.location.href = 'index.html');
darkModeBtn.addEventListener('click', () => themeManager.toggleDarkMode());
themeColorBtn.addEventListener('click', () => themeManager.changeThemeColor());
settingsBtn.addEventListener('click', changeUsername);

// Import functionality
importTodosBtn.addEventListener('click', () => {
    importTodosInput.click();
});

importTodosInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTodos = JSON.parse(e.target.result);
                if (Array.isArray(importedTodos)) {
                    todos = importedTodos;
                    saveTodos();
                    renderTodos();
                    alert('Todos imported successfully!');
                } else {
                    throw new Error('Invalid todo format.');
                }
            } catch (error) {
                console.error('Import Error:', error);
                alert('Failed to import todos. Please ensure the file is a valid JSON.');
            }
        };
        reader.readAsText(file);
    }
});

// Export functionality
exportTodosBtn.addEventListener('click', () => {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "todos_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (error) {
        console.error('Export Error:', error);
        alert('Failed to export todos.');
    }
});

// Log the initial state
console.log('[Todo Debug] Initial todos state:', todos);
console.log('[Todo Debug] Initial localStorage state:', localStorage.getItem('todos'));

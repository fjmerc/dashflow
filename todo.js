const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
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
                            (todo.summary && todo.summary.toLowerCase().includes(searchText.toLowerCase()));
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
        const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';
        const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
        
        li.innerHTML = `
            <div class="todo-content">
                <div class="todo-header">
                    <span class="todo-text ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">${todo.text}</span>
                    <span class="todo-due-date ${isOverdue ? 'overdue' : ''}">${dueDate}</span>
                </div>
                ${todo.summary ? `<p class="todo-summary">${todo.summary}</p>` : ''}
                <span class="todo-priority">Priority: ${todo.priority || 'None'}</span>
            </div>
            <div class="todo-actions">
                <button class="todo-btn complete-btn" onclick="toggleComplete(${index})" title="Toggle Complete">
                    <i class="fas fa-check"></i>
                </button>
                <button class="todo-btn edit-btn" onclick="editTodo(${index})" title="Edit Task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="todo-btn delete-btn" onclick="deleteTodo(${index})" title="Delete Task">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="todo-btn summary-btn" onclick="editSummary(${index})" title="Edit Summary">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="todo-btn date-btn" onclick="editDueDate(${index})" title="Set Due Date">
                    <i class="fas fa-calendar"></i>
                </button>
                <button class="todo-btn priority-btn" onclick="togglePriority(${index})" title="Toggle Priority">
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
    if (todoText) {
        todos.push({
            text: todoText,
            completed: false,
            summary: '',
            priority: PRIORITIES.MEDIUM,
            dueDate: null
        });
        saveTodos();
        todoInput.value = '';
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
    const newText = prompt('Edit task:', todos[index].text);
    if (newText !== null) {
        todos[index].text = newText.trim();
        saveTodos();
        renderTodos();
    }
}

function deleteTodo(index) {
    if (confirm('Are you sure you want to delete this task?')) {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }
}

function editSummary(index) {
    const newSummary = prompt('Edit summary/notes:', todos[index].summary);
    if (newSummary !== null) {
        todos[index].summary = newSummary.trim();
        saveTodos();
        renderTodos();
    }
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
        todos = Array.from(todoList.children).map(li => {
            const text = li.querySelector('.todo-text').textContent;
            const completed = li.querySelector('.todo-text').classList.contains('completed');
            const summary = li.querySelector('.todo-summary')?.textContent || '';
            const priority = li.className.includes('priority-high') ? 'high' :
                           li.className.includes('priority-medium') ? 'medium' :
                           li.className.includes('priority-low') ? 'low' : null;
            const dueDate = li.querySelector('.todo-due-date').textContent;
            return {
                text,
                completed,
                summary,
                priority,
                dueDate: dueDate !== 'No due date' ? new Date(dueDate).toISOString() : null
            };
        });
        saveTodos();
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

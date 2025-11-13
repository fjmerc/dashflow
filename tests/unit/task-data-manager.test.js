/**
 * Unit Tests for TaskDataManager
 * Tests critical business logic including dependency management, CRUD operations, and data migration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Logger before importing task-data.js
global.Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Import the actual classes (we'll need to adjust the import path)
// Since this is vanilla JS loaded via script tags, we need to simulate the loading
const loadTaskDataModule = () => {
  // Read the file content and evaluate it in a way that exports the classes
  const fs = require('fs');
  const path = require('path');
  const moduleContent = fs.readFileSync(
    path.join(__dirname, '../../js/features/tasks/task-data.js'),
    'utf8'
  );

  // Remove the window exports and Logger.debug at the end
  const cleanContent = moduleContent
    .replace(/window\.\w+ = \w+;/g, '')
    .replace(/Logger\.debug\('task-data\.js loaded'\);/, '');

  // Execute in context and return the classes
  const moduleExports = {};
  const moduleFunc = new Function('module', 'exports', cleanContent + '\nreturn { TaskDataManager, Task, Subtask, Project, TaskStatus, TaskPriority, DEFAULT_PROJECTS };');
  return moduleFunc({}, moduleExports);
};

const { TaskDataManager, Task, Subtask, Project, TaskStatus, TaskPriority, DEFAULT_PROJECTS } = loadTaskDataModule();

describe('Task Class', () => {
  it('should create a task with default values', () => {
    const task = new Task();

    expect(task.id).toMatch(/^task_/);
    expect(task.text).toBe('');
    expect(task.completed).toBe(false);
    expect(task.priority).toBe(TaskPriority.MEDIUM);
    expect(task.projectId).toBe(DEFAULT_PROJECTS.INBOX);
    expect(task.tags).toEqual([]);
    expect(task.subtasks).toEqual([]);
    expect(task.blockedBy).toEqual([]);
  });

  it('should create a task with provided data', () => {
    const taskData = {
      text: 'Test Task',
      description: 'Test Description',
      priority: TaskPriority.HIGH,
      tags: ['work', 'urgent'],
      projectId: 'project_123'
    };

    const task = new Task(taskData);

    expect(task.text).toBe('Test Task');
    expect(task.description).toBe('Test Description');
    expect(task.priority).toBe(TaskPriority.HIGH);
    expect(task.tags).toEqual(['work', 'urgent']);
    expect(task.projectId).toBe('project_123');
  });

  it('should migrate old todo format (description from notes field)', () => {
    const oldTodo = {
      text: 'Old Task',
      notes: 'This is from the notes field',
      completed: true
    };

    const task = new Task(oldTodo);

    expect(task.text).toBe('Old Task');
    expect(task.description).toBe('This is from the notes field');
    expect(task.completed).toBe(true);
    expect(task.status).toBe(TaskStatus.DONE); // Auto-set from completed
  });

  it('should serialize to JSON correctly', () => {
    const task = new Task({
      text: 'Test Task',
      tags: ['test'],
      subtasks: [{ text: 'Subtask 1' }]
    });

    const json = task.toJSON();

    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('text', 'Test Task');
    expect(json).toHaveProperty('tags');
    expect(json).toHaveProperty('subtasks');
    expect(json.subtasks).toHaveLength(1);
  });
});

describe('Subtask Class', () => {
  it('should create a subtask with default values', () => {
    const subtask = new Subtask();

    expect(subtask.id).toMatch(/^subtask_/);
    expect(subtask.text).toBe('');
    expect(subtask.completed).toBe(false);
  });

  it('should create a subtask with provided data', () => {
    const subtask = new Subtask({
      text: 'Test Subtask',
      completed: true
    });

    expect(subtask.text).toBe('Test Subtask');
    expect(subtask.completed).toBe(true);
  });
});

describe('Project Class', () => {
  it('should create a project with default values', () => {
    const project = new Project({ name: 'Test Project' });

    expect(project.id).toMatch(/^project_/);
    expect(project.name).toBe('Test Project');
    expect(project.color).toBe('#3b82f6');
    expect(project.archived).toBe(false);
  });
});

describe('TaskDataManager - Initialization', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  it('should initialize with default projects', () => {
    expect(manager.projects).toHaveLength(2);
    expect(manager.projects[0].id).toBe(DEFAULT_PROJECTS.INBOX);
    expect(manager.projects[1].id).toBe(DEFAULT_PROJECTS.PERSONAL);
  });

  it('should initialize with empty tasks', () => {
    expect(manager.tasks).toEqual([]);
  });

  it('should save initial state to localStorage', () => {
    expect(localStorage.getItem('tasks')).toBeTruthy();
    expect(localStorage.getItem('projects')).toBeTruthy();
  });
});

describe('TaskDataManager - CRUD Operations', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  describe('Task Operations', () => {
    it('should add a task', () => {
      const task = manager.addTask({
        text: 'New Task',
        description: 'Task description'
      });

      expect(task).toBeDefined();
      expect(task.text).toBe('New Task');
      expect(manager.tasks).toHaveLength(1);
      expect(manager.tasks[0].id).toBe(task.id);
    });

    it('should add tasks to the beginning of the array', () => {
      const task1 = manager.addTask({ text: 'Task 1' });
      const task2 = manager.addTask({ text: 'Task 2' });

      expect(manager.tasks[0].id).toBe(task2.id);
      expect(manager.tasks[1].id).toBe(task1.id);
    });

    it('should update a task', () => {
      const task = manager.addTask({ text: 'Original' });
      const updated = manager.updateTask(task.id, {
        text: 'Updated',
        priority: TaskPriority.HIGH
      });

      expect(updated.text).toBe('Updated');
      expect(updated.priority).toBe(TaskPriority.HIGH);
      expect(updated.modifiedAt).toBeDefined();
    });

    it('should return null when updating non-existent task', () => {
      const result = manager.updateTask('non-existent', { text: 'Updated' });
      expect(result).toBeNull();
    });

    it('should delete a task', () => {
      const task = manager.addTask({ text: 'To Delete' });
      const deleted = manager.deleteTask(task.id);

      expect(deleted).toBe(true);
      expect(manager.tasks).toHaveLength(0);
    });

    it('should return false when deleting non-existent task', () => {
      const result = manager.deleteTask('non-existent');
      expect(result).toBe(false);
    });

    it('should get task by ID', () => {
      const task = manager.addTask({ text: 'Find Me' });
      const found = manager.getTaskById(task.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(task.id);
    });
  });

  describe('Project Operations', () => {
    it('should add a project', () => {
      const project = manager.addProject({
        name: 'Work',
        color: '#ff0000'
      });

      expect(project).toBeDefined();
      expect(project.name).toBe('Work');
      expect(manager.projects).toHaveLength(3); // 2 default + 1 new
    });

    it('should update a project', () => {
      const project = manager.addProject({ name: 'Original' });
      const updated = manager.updateProject(project.id, {
        name: 'Updated',
        color: '#00ff00'
      });

      expect(updated.name).toBe('Updated');
      expect(updated.color).toBe('#00ff00');
    });

    it('should delete a project and move tasks to Inbox', () => {
      const project = manager.addProject({ name: 'To Delete' });
      const task = manager.addTask({
        text: 'Task in project',
        projectId: project.id
      });

      const deleted = manager.deleteProject(project.id);

      expect(deleted).toBe(true);
      expect(manager.getTaskById(task.id).projectId).toBe(DEFAULT_PROJECTS.INBOX);
    });

    it('should not delete the Inbox project', () => {
      const deleted = manager.deleteProject(DEFAULT_PROJECTS.INBOX);
      expect(deleted).toBe(false);
      expect(manager.getProjectById(DEFAULT_PROJECTS.INBOX)).toBeDefined();
    });
  });
});

describe('TaskDataManager - Task Filtering', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  it('should get tasks by project', () => {
    const project = manager.addProject({ name: 'Work' });
    manager.addTask({ text: 'Task 1', projectId: project.id });
    manager.addTask({ text: 'Task 2', projectId: project.id });
    manager.addTask({ text: 'Task 3', projectId: DEFAULT_PROJECTS.INBOX });

    const tasks = manager.getTasksByProject(project.id);
    expect(tasks).toHaveLength(2);
  });

  it('should get tasks by status', () => {
    manager.addTask({ text: 'Task 1', status: TaskStatus.TODO });
    manager.addTask({ text: 'Task 2', status: TaskStatus.IN_PROGRESS });
    manager.addTask({ text: 'Task 3', status: TaskStatus.TODO });

    const todoTasks = manager.getTasksByStatus(TaskStatus.TODO);
    expect(todoTasks).toHaveLength(2);
  });

  it('should get important tasks (high priority, not completed)', () => {
    manager.addTask({ text: 'Important 1', priority: TaskPriority.HIGH });
    manager.addTask({ text: 'Important 2', priority: TaskPriority.HIGH });
    manager.addTask({ text: 'Normal', priority: TaskPriority.MEDIUM });
    manager.addTask({
      text: 'Completed Important',
      priority: TaskPriority.HIGH,
      completed: true
    });

    const important = manager.getImportantTasks();
    expect(important).toHaveLength(2);
  });

  it('should get My Day tasks (manually added)', () => {
    manager.addTask({ text: 'Task 1', isMyDay: true });
    manager.addTask({ text: 'Task 2', isMyDay: false });
    manager.addTask({ text: 'Task 3', isMyDay: true });

    const myDayTasks = manager.getMyDayTasks();
    expect(myDayTasks.length).toBeGreaterThanOrEqual(2);
  });

  it('should get My Day tasks (overdue)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    manager.addTask({
      text: 'Overdue Task',
      dueDate: yesterday.toISOString()
    });

    const myDayTasks = manager.getMyDayTasks();
    expect(myDayTasks.length).toBeGreaterThanOrEqual(1);
  });

  it('should get My Day tasks (due today)', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    manager.addTask({
      text: 'Due Today',
      dueDate: today.toISOString()
    });

    const myDayTasks = manager.getMyDayTasks();
    expect(myDayTasks.length).toBeGreaterThanOrEqual(1);
  });

  it('should not include completed tasks in My Day', () => {
    manager.addTask({
      text: 'Completed My Day Task',
      isMyDay: true,
      completed: true
    });

    const myDayTasks = manager.getMyDayTasks();
    expect(myDayTasks.every(t => !t.completed)).toBe(true);
  });

  it('should get upcoming tasks (due in next 7 days)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6);

    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    manager.addTask({ text: 'Tomorrow', dueDate: tomorrow.toISOString() });
    manager.addTask({ text: 'Next Week', dueDate: nextWeek.toISOString() });
    manager.addTask({ text: 'Two Weeks', dueDate: twoWeeks.toISOString() });

    const upcoming = manager.getUpcomingTasks();
    expect(upcoming).toHaveLength(2); // Only tomorrow and next week
  });

  it('should get completed tasks sorted by completion date', () => {
    const task1 = manager.addTask({ text: 'First', completed: true, completedAt: '2024-01-01T00:00:00Z' });
    const task2 = manager.addTask({ text: 'Second', completed: true, completedAt: '2024-01-03T00:00:00Z' });
    const task3 = manager.addTask({ text: 'Third', completed: true, completedAt: '2024-01-02T00:00:00Z' });

    const completed = manager.getCompletedTasks();

    expect(completed).toHaveLength(3);
    expect(completed[0].text).toBe('Second'); // Most recent first
    expect(completed[1].text).toBe('Third');
    expect(completed[2].text).toBe('First');
  });

  it('should get tasks by tag', () => {
    manager.addTask({ text: 'Task 1', tags: ['work', 'urgent'] });
    manager.addTask({ text: 'Task 2', tags: ['work'] });
    manager.addTask({ text: 'Task 3', tags: ['personal'] });

    const workTasks = manager.getTasksByTag('work');
    expect(workTasks).toHaveLength(2);
  });

  it('should get all unique tags with counts', () => {
    manager.addTask({ tags: ['work', 'urgent'] });
    manager.addTask({ tags: ['work', 'meeting'] });
    manager.addTask({ tags: ['work'] });
    manager.addTask({ tags: ['personal'] });

    const tags = manager.getAllTags();

    expect(tags).toHaveLength(4);
    expect(tags[0].tag).toBe('work');
    expect(tags[0].count).toBe(3);
  });
});

describe('TaskDataManager - Dependency Management', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  describe('Blocker Reference Parsing', () => {
    it('should identify task-only references', () => {
      expect(manager.isSubtaskReference('task_123')).toBe(false);
    });

    it('should identify subtask references', () => {
      expect(manager.isSubtaskReference('task_123:subtask_456')).toBe(true);
    });

    it('should parse task-only references', () => {
      const parsed = manager.parseBlockerReference('task_123');
      expect(parsed.taskId).toBe('task_123');
      expect(parsed.subtaskId).toBeNull();
    });

    it('should parse subtask references', () => {
      const parsed = manager.parseBlockerReference('task_123:subtask_456');
      expect(parsed.taskId).toBe('task_123');
      expect(parsed.subtaskId).toBe('subtask_456');
    });
  });

  describe('Blocker Completion Checking', () => {
    it('should check task completion', () => {
      const task = manager.addTask({ text: 'Blocker', completed: true });
      expect(manager.isBlockerCompleted(task.id)).toBe(true);
    });

    it('should check subtask completion', () => {
      const task = manager.addTask({
        text: 'Task',
        subtasks: [
          { text: 'Subtask 1', completed: true },
          { text: 'Subtask 2', completed: false }
        ]
      });

      const subtask1Id = task.subtasks[0].id;
      const subtask2Id = task.subtasks[1].id;

      expect(manager.isBlockerCompleted(`${task.id}:${subtask1Id}`)).toBe(true);
      expect(manager.isBlockerCompleted(`${task.id}:${subtask2Id}`)).toBe(false);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should prevent self-blocking', () => {
      const task = manager.addTask({ text: 'Task' });
      expect(manager.validateNoCycles(task.id, task.id)).toBe(false);
    });

    it('should prevent blocking by own subtask', () => {
      const task = manager.addTask({
        text: 'Task',
        subtasks: [{ text: 'Subtask' }]
      });

      const subtaskId = task.subtasks[0].id;
      expect(manager.validateNoCycles(task.id, `${task.id}:${subtaskId}`)).toBe(false);
    });

    it('should allow non-circular dependencies', () => {
      const task1 = manager.addTask({ text: 'Task 1' });
      const task2 = manager.addTask({ text: 'Task 2' });

      expect(manager.validateNoCycles(task2.id, task1.id)).toBe(true);
    });

    it('should detect circular dependencies (A -> B -> A)', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });

      // A is blocked by B
      manager.addDependency(taskA.id, taskB.id);

      // Try to make B blocked by A (should be invalid)
      expect(manager.validateNoCycles(taskB.id, taskA.id)).toBe(false);
    });

    it('should detect circular dependencies (A -> B -> C -> A)', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });
      const taskC = manager.addTask({ text: 'Task C' });

      // A -> B -> C
      manager.addDependency(taskA.id, taskB.id);
      manager.addDependency(taskB.id, taskC.id);

      // Try to make C -> A (should be invalid)
      expect(manager.validateNoCycles(taskC.id, taskA.id)).toBe(false);
    });

    it('should allow complex non-circular dependencies', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });
      const taskC = manager.addTask({ text: 'Task C' });
      const taskD = manager.addTask({ text: 'Task D' });

      // A -> B, A -> C, D -> C
      manager.addDependency(taskA.id, taskB.id);
      manager.addDependency(taskA.id, taskC.id);

      expect(manager.validateNoCycles(taskD.id, taskC.id)).toBe(true);
    });
  });

  describe('Adding Dependencies', () => {
    it('should add a simple task dependency', () => {
      const task1 = manager.addTask({ text: 'Task 1' });
      const task2 = manager.addTask({ text: 'Task 2' });

      const result = manager.addDependency(task2.id, task1.id);

      expect(result.success).toBe(true);
      expect(manager.getTaskById(task2.id).blockedBy).toContain(task1.id);
    });

    it('should add a subtask dependency', () => {
      const task1 = manager.addTask({
        text: 'Task 1',
        subtasks: [{ text: 'Subtask' }]
      });
      const task2 = manager.addTask({ text: 'Task 2' });

      const subtaskId = task1.subtasks[0].id;
      const blockerId = `${task1.id}:${subtaskId}`;

      const result = manager.addDependency(task2.id, blockerId);

      expect(result.success).toBe(true);
      expect(manager.getTaskById(task2.id).blockedBy).toContain(blockerId);
    });

    it('should auto-set status to blocked when adding dependency', () => {
      const task1 = manager.addTask({ text: 'Blocker', completed: false });
      const task2 = manager.addTask({ text: 'Blocked', status: TaskStatus.TODO });

      manager.addDependency(task2.id, task1.id);

      expect(manager.getTaskById(task2.id).status).toBe(TaskStatus.BLOCKED);
    });

    it('should not change status if blocker is already completed', () => {
      const task1 = manager.addTask({ text: 'Blocker', completed: true });
      const task2 = manager.addTask({ text: 'Task', status: TaskStatus.TODO });

      const result = manager.addDependency(task2.id, task1.id);

      expect(result.autoBlocked).toBe(false);
      expect(manager.getTaskById(task2.id).status).toBe(TaskStatus.TODO);
    });

    it('should prevent duplicate dependencies', () => {
      const task1 = manager.addTask({ text: 'Task 1' });
      const task2 = manager.addTask({ text: 'Task 2' });

      manager.addDependency(task2.id, task1.id);
      const result = manager.addDependency(task2.id, task1.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should prevent circular dependencies when adding', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });

      manager.addDependency(taskA.id, taskB.id);
      const result = manager.addDependency(taskB.id, taskA.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('circular');
    });

    it('should fail when blocker task does not exist', () => {
      const task = manager.addTask({ text: 'Task' });
      const result = manager.addDependency(task.id, 'non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('Removing Dependencies', () => {
    it('should remove a dependency', () => {
      const task1 = manager.addTask({ text: 'Task 1' });
      const task2 = manager.addTask({ text: 'Task 2' });

      manager.addDependency(task2.id, task1.id);
      const removed = manager.removeDependency(task2.id, task1.id);

      expect(removed).toBe(true);
      expect(manager.getTaskById(task2.id).blockedBy).not.toContain(task1.id);
    });

    it('should auto-unblock when removing last dependency', () => {
      const task1 = manager.addTask({ text: 'Blocker' });
      const task2 = manager.addTask({ text: 'Blocked' });

      manager.addDependency(task2.id, task1.id);
      expect(manager.getTaskById(task2.id).status).toBe(TaskStatus.BLOCKED);

      manager.removeDependency(task2.id, task1.id);
      expect(manager.getTaskById(task2.id).status).toBe(TaskStatus.TODO);
    });

    it('should not change status if other dependencies remain', () => {
      const task1 = manager.addTask({ text: 'Blocker 1' });
      const task2 = manager.addTask({ text: 'Blocker 2' });
      const task3 = manager.addTask({ text: 'Blocked' });

      manager.addDependency(task3.id, task1.id);
      manager.addDependency(task3.id, task2.id);

      manager.removeDependency(task3.id, task1.id);
      expect(manager.getTaskById(task3.id).status).toBe(TaskStatus.BLOCKED);
    });
  });

  describe('Dependency Status Updates', () => {
    it('should auto-unblock tasks when blocker is completed', () => {
      const blocker = manager.addTask({ text: 'Blocker', completed: false });
      const blocked = manager.addTask({ text: 'Blocked' });

      manager.addDependency(blocked.id, blocker.id);
      expect(manager.getTaskById(blocked.id).status).toBe(TaskStatus.BLOCKED);

      // Mark blocker as completed
      manager.updateTask(blocker.id, { completed: true });

      const unblockedTasks = manager.updateDependentStatuses(blocker.id);

      expect(unblockedTasks).toHaveLength(1);
      expect(unblockedTasks[0].id).toBe(blocked.id);
      expect(manager.getTaskById(blocked.id).status).toBe(TaskStatus.TODO);
    });

    it('should not unblock if other incomplete blockers remain', () => {
      const blocker1 = manager.addTask({ text: 'Blocker 1', completed: false });
      const blocker2 = manager.addTask({ text: 'Blocker 2', completed: false });
      const blocked = manager.addTask({ text: 'Blocked' });

      manager.addDependency(blocked.id, blocker1.id);
      manager.addDependency(blocked.id, blocker2.id);

      manager.updateDependentStatuses(blocker1.id);

      expect(manager.getTaskById(blocked.id).status).toBe(TaskStatus.BLOCKED);
    });

    it('should re-block tasks when blocker becomes incomplete', () => {
      const blocker = manager.addTask({ text: 'Blocker', completed: true });
      const blocked = manager.addTask({ text: 'Blocked', status: TaskStatus.TODO });

      manager.addDependency(blocked.id, blocker.id);
      expect(manager.getTaskById(blocked.id).status).toBe(TaskStatus.TODO);

      const reBlockedTasks = manager.reBlockDependentTasks(blocker.id);

      expect(reBlockedTasks).toHaveLength(1);
      expect(manager.getTaskById(blocked.id).status).toBe(TaskStatus.BLOCKED);
    });

    it('should not re-block completed tasks', () => {
      const blocker = manager.addTask({ text: 'Blocker', completed: true });
      const blocked = manager.addTask({ text: 'Blocked', completed: true });

      manager.addDependency(blocked.id, blocker.id);

      const reBlockedTasks = manager.reBlockDependentTasks(blocker.id);

      expect(reBlockedTasks).toHaveLength(0);
      expect(manager.getTaskById(blocked.id).completed).toBe(true);
    });
  });

  describe('Getting Dependent Tasks', () => {
    it('should get all tasks blocked by a specific task', () => {
      const blocker = manager.addTask({ text: 'Blocker' });
      const blocked1 = manager.addTask({ text: 'Blocked 1' });
      const blocked2 = manager.addTask({ text: 'Blocked 2' });
      const independent = manager.addTask({ text: 'Independent' });

      manager.addDependency(blocked1.id, blocker.id);
      manager.addDependency(blocked2.id, blocker.id);

      const blockedTasks = manager.getBlockedTasks(blocker.id);

      expect(blockedTasks).toHaveLength(2);
      expect(blockedTasks.map(t => t.id)).toContain(blocked1.id);
      expect(blockedTasks.map(t => t.id)).toContain(blocked2.id);
    });

    it('should get blocking tasks for a specific task', () => {
      const blocker1 = manager.addTask({ text: 'Blocker 1', completed: true });
      const blocker2 = manager.addTask({ text: 'Blocker 2', completed: false });
      const blocked = manager.addTask({ text: 'Blocked' });

      manager.addDependency(blocked.id, blocker1.id);
      manager.addDependency(blocked.id, blocker2.id);

      const blockingTasks = manager.getBlockingTasks(blocked.id);

      expect(blockingTasks).toHaveLength(2);
      expect(blockingTasks[0].completed).toBe(true);
      expect(blockingTasks[1].completed).toBe(false);
    });

    it('should handle subtask blockers in getBlockingTasks', () => {
      const blocker = manager.addTask({
        text: 'Blocker',
        subtasks: [{ text: 'Subtask', completed: false }]
      });
      const blocked = manager.addTask({ text: 'Blocked' });

      const subtaskId = blocker.subtasks[0].id;
      manager.addDependency(blocked.id, `${blocker.id}:${subtaskId}`);

      const blockingTasks = manager.getBlockingTasks(blocked.id);

      expect(blockingTasks).toHaveLength(1);
      expect(blockingTasks[0].subtask).toBeDefined();
      expect(blockingTasks[0].displayName).toContain('→');
    });
  });
});

describe('TaskDataManager - Data Migration', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
  });

  it('should migrate from old todos format', () => {
    const oldTodos = [
      {
        text: 'Old Task 1',
        notes: 'Some notes',
        completed: false,
        priority: 'high'
      },
      {
        text: 'Old Task 2',
        completed: true
      }
    ];

    localStorage.setItem('todos', JSON.stringify(oldTodos));
    manager = new TaskDataManager();

    expect(manager.tasks).toHaveLength(2);
    expect(manager.tasks[0].text).toBe('Old Task 1');
    expect(manager.tasks[0].description).toBe('Some notes');
    expect(manager.tasks[1].completed).toBe(true);
    expect(manager.tasks[1].status).toBe(TaskStatus.DONE);
  });

  it('should not migrate if new format already exists', () => {
    const oldTodos = [{ text: 'Old Task' }];
    const newTasks = [new Task({ text: 'New Task' })];

    localStorage.setItem('todos', JSON.stringify(oldTodos));
    localStorage.setItem('tasks', JSON.stringify(newTasks.map(t => t.toJSON())));

    manager = new TaskDataManager();

    expect(manager.tasks).toHaveLength(1);
    expect(manager.tasks[0].text).toBe('New Task');
  });

  it('should handle migration errors gracefully', () => {
    localStorage.setItem('todos', 'invalid json{{{');

    manager = new TaskDataManager();

    expect(manager.tasks).toEqual([]);
    expect(manager.projects).toHaveLength(2); // Default projects
  });
});

describe('TaskDataManager - localStorage Persistence', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  it('should persist tasks to localStorage', () => {
    manager.addTask({ text: 'Persistent Task' });

    const stored = JSON.parse(localStorage.getItem('tasks'));
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe('Persistent Task');
  });

  it('should persist projects to localStorage', () => {
    manager.addProject({ name: 'Persistent Project' });

    const stored = JSON.parse(localStorage.getItem('projects'));
    expect(stored.length).toBeGreaterThan(2); // 2 default + 1 new
  });

  it('should load data from localStorage on initialization', () => {
    const task = manager.addTask({ text: 'Task to persist' });
    const taskId = task.id;

    // Create a new manager instance (simulates page reload)
    const newManager = new TaskDataManager();

    expect(newManager.tasks).toHaveLength(1);
    expect(newManager.tasks[0].id).toBe(taskId);
    expect(newManager.tasks[0].text).toBe('Task to persist');
  });

  it('should handle corrupt localStorage data gracefully', () => {
    localStorage.setItem('tasks', 'corrupt{{{data');

    const newManager = new TaskDataManager();

    expect(newManager.tasks).toEqual([]);
  });
});

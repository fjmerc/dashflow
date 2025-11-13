/**
 * Integration Tests for Task Dependency System
 * Tests complex workflows involving task dependencies and status cascades
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Logger
global.Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Load TaskDataManager
const loadTaskDataModule = () => {
  const fs = require('fs');
  const path = require('path');
  const moduleContent = fs.readFileSync(
    path.join(__dirname, '../../js/features/tasks/task-data.js'),
    'utf8'
  );

  const cleanContent = moduleContent
    .replace(/window\.\w+ = \w+;/g, '')
    .replace(/Logger\.debug\('task-data\.js loaded'\);/, '');

  const moduleFunc = new Function('module', 'exports', cleanContent + '\nreturn { TaskDataManager, Task, Subtask, Project, TaskStatus, TaskPriority, DEFAULT_PROJECTS };');
  return moduleFunc({}, {});
};

const { TaskDataManager, Task, TaskStatus } = loadTaskDataModule();

describe('Task Dependency Integration', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  describe('Dependency Cascade Workflows', () => {
    it('should auto-unblock task when blocker completes', () => {
      // Setup: Task B depends on Task A
      const taskA = manager.addTask({ text: 'Task A - Foundation' });
      const taskB = manager.addTask({ text: 'Task B - Depends on A' });

      manager.addDependency(taskB.id, taskA.id);

      // Verify B is blocked
      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.BLOCKED);

      // Complete Task A
      manager.updateTask(taskA.id, { completed: true });
      const unblockedTasks = manager.updateDependentStatuses(taskA.id);

      // Verify B is auto-unblocked
      expect(unblockedTasks).toHaveLength(1);
      expect(unblockedTasks[0].id).toBe(taskB.id);
      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.TODO);
    });

    it('should handle multi-level dependency chain (A -> B -> C)', () => {
      // Setup: C depends on B, B depends on A
      const taskA = manager.addTask({ text: 'Task A - Foundation' });
      const taskB = manager.addTask({ text: 'Task B - Mid-level' });
      const taskC = manager.addTask({ text: 'Task C - Top-level' });

      manager.addDependency(taskB.id, taskA.id);
      manager.addDependency(taskC.id, taskB.id);

      // Both B and C should be blocked
      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.BLOCKED);
      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.BLOCKED);

      // Complete A -> B should unblock
      manager.updateTask(taskA.id, { completed: true });
      manager.updateDependentStatuses(taskA.id);

      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.TODO);
      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.BLOCKED); // Still blocked by B

      // Complete B -> C should unblock
      manager.updateTask(taskB.id, { completed: true });
      manager.updateDependentStatuses(taskB.id);

      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.TODO);
    });

    it('should handle multiple blockers (C depends on both A and B)', () => {
      // Setup: C depends on both A and B
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });
      const taskC = manager.addTask({ text: 'Task C - Needs A and B' });

      manager.addDependency(taskC.id, taskA.id);
      manager.addDependency(taskC.id, taskB.id);

      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.BLOCKED);
      expect(manager.getTaskById(taskC.id).blockedBy).toHaveLength(2);

      // Complete A -> C still blocked
      manager.updateTask(taskA.id, { completed: true });
      manager.updateDependentStatuses(taskA.id);

      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.BLOCKED);

      // Complete B -> C unblocks
      manager.updateTask(taskB.id, { completed: true });
      manager.updateDependentStatuses(taskB.id);

      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.TODO);
    });

    it('should re-block task when blocker becomes incomplete', () => {
      const taskA = manager.addTask({ text: 'Task A', completed: true });
      const taskB = manager.addTask({ text: 'Task B', status: TaskStatus.TODO });

      manager.addDependency(taskB.id, taskA.id);

      // B should not be blocked (A is complete)
      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.TODO);

      // Mark A as incomplete
      manager.updateTask(taskA.id, { completed: false });
      const reBlockedTasks = manager.reBlockDependentTasks(taskA.id);

      // B should be re-blocked
      expect(reBlockedTasks).toHaveLength(1);
      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.BLOCKED);
    });

    it('should not re-block completed dependent tasks', () => {
      const taskA = manager.addTask({ text: 'Task A', completed: true });
      const taskB = manager.addTask({ text: 'Task B', completed: true });

      manager.addDependency(taskB.id, taskA.id);

      // Mark A as incomplete
      manager.updateTask(taskA.id, { completed: false });
      const reBlockedTasks = manager.reBlockDependentTasks(taskA.id);

      // B should NOT be re-blocked (it's completed)
      expect(reBlockedTasks).toHaveLength(0);
      expect(manager.getTaskById(taskB.id).completed).toBe(true);
    });
  });

  describe('Subtask Dependencies', () => {
    it('should support dependencies on subtasks', () => {
      const taskA = manager.addTask({
        text: 'Task A',
        subtasks: [
          { text: 'Subtask 1', completed: false },
          { text: 'Subtask 2', completed: false }
        ]
      });

      const taskB = manager.addTask({ text: 'Task B' });

      const subtask1Id = taskA.subtasks[0].id;
      const blockerId = `${taskA.id}:${subtask1Id}`;

      manager.addDependency(taskB.id, blockerId);

      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.BLOCKED);

      // Complete the subtask
      taskA.subtasks[0].completed = true;
      manager.updateTask(taskA.id, { subtasks: taskA.subtasks });

      // Update dependent statuses
      manager.updateDependentStatuses(blockerId);

      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.TODO);
    });
  });

  describe('Circular Dependency Prevention', () => {
    it('should prevent simple circular dependencies (A <-> B)', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });

      // A depends on B
      const result1 = manager.addDependency(taskA.id, taskB.id);
      expect(result1.success).toBe(true);

      // Try to make B depend on A (would create cycle)
      const result2 = manager.addDependency(taskB.id, taskA.id);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('circular');
    });

    it('should prevent complex circular dependencies (A -> B -> C -> A)', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });
      const taskC = manager.addTask({ text: 'Task C' });

      // Create chain: A -> B -> C
      manager.addDependency(taskA.id, taskB.id);
      manager.addDependency(taskB.id, taskC.id);

      // Try to make C -> A (would create cycle)
      const result = manager.addDependency(taskC.id, taskA.id);
      expect(result.success).toBe(false);
      expect(result.message).toContain('circular');
    });

    it('should prevent self-blocking', () => {
      const task = manager.addTask({ text: 'Task' });

      const result = manager.addDependency(task.id, task.id);
      expect(result.success).toBe(false);
    });
  });

  describe('Dependency Removal', () => {
    it('should auto-unblock when last dependency is removed', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });

      manager.addDependency(taskB.id, taskA.id);
      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.BLOCKED);

      // Remove dependency
      manager.removeDependency(taskB.id, taskA.id);

      expect(manager.getTaskById(taskB.id).status).toBe(TaskStatus.TODO);
      expect(manager.getTaskById(taskB.id).blockedBy).toHaveLength(0);
    });

    it('should not unblock when other dependencies remain', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });
      const taskC = manager.addTask({ text: 'Task C' });

      manager.addDependency(taskC.id, taskA.id);
      manager.addDependency(taskC.id, taskB.id);

      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.BLOCKED);

      // Remove one dependency
      manager.removeDependency(taskC.id, taskA.id);

      // Still blocked by B
      expect(manager.getTaskById(taskC.id).status).toBe(TaskStatus.BLOCKED);
      expect(manager.getTaskById(taskC.id).blockedBy).toHaveLength(1);
    });
  });

  describe('Persistence', () => {
    it('should persist dependencies across reload', () => {
      const taskA = manager.addTask({ text: 'Task A' });
      const taskB = manager.addTask({ text: 'Task B' });

      manager.addDependency(taskB.id, taskA.id);

      // Simulate app reload
      const newManager = new TaskDataManager();

      const reloadedB = newManager.getTaskById(taskB.id);
      expect(reloadedB.blockedBy).toContain(taskA.id);
      expect(reloadedB.status).toBe(TaskStatus.BLOCKED);
    });
  });

  describe('Project Deletion with Dependencies', () => {
    it('should maintain dependencies when project is deleted', () => {
      const project = manager.addProject({ name: 'Work' });
      const taskA = manager.addTask({ text: 'Task A', projectId: project.id });
      const taskB = manager.addTask({ text: 'Task B', projectId: project.id });

      manager.addDependency(taskB.id, taskA.id);

      // Delete project (tasks move to Inbox)
      manager.deleteProject(project.id);

      // Dependencies should remain
      const movedB = manager.getTaskById(taskB.id);
      expect(movedB.projectId).toBe('inbox');
      expect(movedB.blockedBy).toContain(taskA.id);
      expect(movedB.status).toBe(TaskStatus.BLOCKED);
    });
  });
});

describe('Task Workflow Integration', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new TaskDataManager();
  });

  it('should handle complete project workflow', () => {
    // Create project
    const project = manager.addProject({ name: 'Website Redesign' });

    // Create tasks with dependencies
    const design = manager.addTask({
      text: 'Create mockups',
      projectId: project.id,
      priority: 'high'
    });

    const frontend = manager.addTask({
      text: 'Implement frontend',
      projectId: project.id
    });

    const backend = manager.addTask({
      text: 'Setup backend',
      projectId: project.id
    });

    const deploy = manager.addTask({
      text: 'Deploy to production',
      projectId: project.id
    });

    // Setup dependencies: deploy depends on frontend and backend
    // frontend depends on design
    manager.addDependency(frontend.id, design.id);
    manager.addDependency(deploy.id, frontend.id);
    manager.addDependency(deploy.id, backend.id);

    // Verify initial state
    expect(manager.getTaskById(frontend.id).status).toBe(TaskStatus.BLOCKED);
    expect(manager.getTaskById(deploy.id).status).toBe(TaskStatus.BLOCKED);

    // Complete design -> frontend unblocks
    manager.updateTask(design.id, { completed: true });
    manager.updateDependentStatuses(design.id);

    expect(manager.getTaskById(frontend.id).status).toBe(TaskStatus.TODO);
    expect(manager.getTaskById(deploy.id).status).toBe(TaskStatus.BLOCKED); // Still needs backend

    // Complete backend and frontend -> deploy unblocks
    manager.updateTask(backend.id, { completed: true });
    manager.updateTask(frontend.id, { completed: true });
    manager.updateDependentStatuses(backend.id);
    manager.updateDependentStatuses(frontend.id);

    expect(manager.getTaskById(deploy.id).status).toBe(TaskStatus.TODO);

    // Get project stats
    const projectTasks = manager.getTasksByProject(project.id);
    const completedTasks = projectTasks.filter(t => t.completed);
    const incompleteTasks = projectTasks.filter(t => !t.completed);

    expect(completedTasks).toHaveLength(3); // design, frontend, backend
    expect(incompleteTasks).toHaveLength(1); // deploy
  });
});

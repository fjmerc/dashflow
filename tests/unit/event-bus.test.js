/**
 * Unit Tests for EventBus
 * Tests pub-sub pattern, error handling, and lifecycle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Logger
global.Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Load EventBus
const loadEventBusModule = () => {
  const fs = require('fs');
  const path = require('path');
  const moduleContent = fs.readFileSync(
    path.join(__dirname, '../../js/core/event-bus.js'),
    'utf8'
  );

  // Remove window/module exports
  const cleanContent = moduleContent
    .replace(/window\.eventBus = new EventBus\(\);/, '')
    .replace(/if \(typeof module.*?\n.*?module\.exports = EventBus;\n}/s, '')
    .replace(/Logger\.debug\('event-bus\.js loaded'\);/, '');

  const moduleFunc = new Function(cleanContent + '\nreturn EventBus;');
  return moduleFunc();
};

const EventBus = loadEventBusModule();

describe('EventBus - Basic Functionality', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Subscription', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      expect(eventBus.getListenerCount('test:event')).toBe(1);
    });

    it('should allow multiple subscribers to same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);
      eventBus.on('test:event', handler3);

      expect(eventBus.getListenerCount('test:event')).toBe(3);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test:event', handler);

      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getListenerCount('test:event')).toBe(1);

      unsubscribe();
      expect(eventBus.getListenerCount('test:event')).toBe(0);
    });

    it('should handle invalid event names gracefully', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on(null, handler);

      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getListenerCount(null)).toBe(0);
    });

    it('should handle invalid callbacks gracefully', () => {
      const unsubscribe = eventBus.on('test:event', 'not a function');

      expect(typeof unsubscribe).toBe('function');
      expect(eventBus.getListenerCount('test:event')).toBe(0);
    });
  });

  describe('Emission', () => {
    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.emit('test:event', { foo: 'bar' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should emit to all subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);
      eventBus.on('test:event', handler3);

      eventBus.emit('test:event', { data: 'test' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should handle emit without data', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.emit('test:event');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it('should not error when emitting to event with no listeners', () => {
      expect(() => {
        eventBus.emit('non-existent:event', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle errors in event handlers gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      eventBus.on('test:event', errorHandler);
      eventBus.on('test:event', goodHandler);

      expect(() => {
        eventBus.emit('test:event', { data: 'test' });
      }).not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled(); // Should still execute
    });
  });

  describe('Unsubscription', () => {
    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);

      eventBus.off('test:event', handler);

      expect(eventBus.getListenerCount('test:event')).toBe(0);

      eventBus.emit('test:event', { data: 'test' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);

      eventBus.off('test:event', handler1);

      expect(eventBus.getListenerCount('test:event')).toBe(1);

      eventBus.emit('test:event', { data: 'test' });
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle unsubscribing non-existent handler', () => {
      const handler = vi.fn();

      expect(() => {
        eventBus.off('test:event', handler);
      }).not.toThrow();
    });

    it('should clean up empty listener arrays', () => {
      const handler = vi.fn();
      eventBus.on('test:event', handler);
      eventBus.off('test:event', handler);

      expect(eventBus.getEvents()).not.toContain('test:event');
    });
  });

  describe('Once', () => {
    it('should subscribe one-time only', () => {
      const handler = vi.fn();
      eventBus.once('test:event', handler);

      eventBus.emit('test:event', { data: 'test1' });
      eventBus.emit('test:event', { data: 'test2' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test1' });
    });

    it('should auto-unsubscribe after first emission', () => {
      const handler = vi.fn();
      eventBus.once('test:event', handler);

      expect(eventBus.getListenerCount('test:event')).toBe(1);

      eventBus.emit('test:event');

      expect(eventBus.getListenerCount('test:event')).toBe(0);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.once('test:event', handler);

      unsubscribe();

      eventBus.emit('test:event');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Clear', () => {
    it('should clear all listeners for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test:event', handler1);
      eventBus.on('test:event', handler2);

      eventBus.clear('test:event');

      expect(eventBus.getListenerCount('test:event')).toBe(0);
    });

    it('should not affect other events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);

      eventBus.clear('event1');

      expect(eventBus.getListenerCount('event1')).toBe(0);
      expect(eventBus.getListenerCount('event2')).toBe(1);
    });
  });

  describe('ClearAll', () => {
    it('should remove all event listeners', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      eventBus.on('event3', vi.fn());

      eventBus.clearAll();

      expect(eventBus.getEvents()).toHaveLength(0);
    });
  });

  describe('Introspection', () => {
    it('should return list of registered events', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());
      eventBus.on('event3', vi.fn());

      const events = eventBus.getEvents();

      expect(events).toHaveLength(3);
      expect(events).toContain('event1');
      expect(events).toContain('event2');
      expect(events).toContain('event3');
    });

    it('should return listener count for event', () => {
      eventBus.on('test:event', vi.fn());
      eventBus.on('test:event', vi.fn());
      eventBus.on('test:event', vi.fn());

      expect(eventBus.getListenerCount('test:event')).toBe(3);
      expect(eventBus.getListenerCount('non-existent')).toBe(0);
    });
  });

  describe('Debug Mode', () => {
    it('should enable debug logging', () => {
      eventBus.enableDebug();
      expect(eventBus.debug).toBe(true);
    });

    it('should disable debug logging', () => {
      eventBus.enableDebug();
      eventBus.disableDebug();
      expect(eventBus.debug).toBe(false);
    });
  });
});

describe('EventBus - Real-World Scenarios', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should handle task creation workflow', () => {
    const renderUI = vi.fn();
    const updateSidebar = vi.fn();
    const saveToStorage = vi.fn();

    eventBus.on('task:created', renderUI);
    eventBus.on('task:created', updateSidebar);
    eventBus.on('task:created', saveToStorage);

    const newTask = { id: '123', text: 'New task' };
    eventBus.emit('task:created', { task: newTask });

    expect(renderUI).toHaveBeenCalledWith({ task: newTask });
    expect(updateSidebar).toHaveBeenCalledWith({ task: newTask });
    expect(saveToStorage).toHaveBeenCalledWith({ task: newTask });
  });

  it('should handle multiple event types in app lifecycle', () => {
    const initHandler = vi.fn();
    const taskHandler = vi.fn();
    const projectHandler = vi.fn();

    eventBus.once('app:ready', initHandler);
    eventBus.on('task:updated', taskHandler);
    eventBus.on('project:created', projectHandler);

    // App lifecycle
    eventBus.emit('app:ready');
    eventBus.emit('task:updated', { taskId: '1' });
    eventBus.emit('task:updated', { taskId: '2' });
    eventBus.emit('project:created', { projectId: 'p1' });

    expect(initHandler).toHaveBeenCalledTimes(1);
    expect(taskHandler).toHaveBeenCalledTimes(2);
    expect(projectHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle cleanup on component unmount', () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.on('task:updated', handler);

    // Component mount - handler active
    eventBus.emit('task:updated', { taskId: '1' });
    expect(handler).toHaveBeenCalledTimes(1);

    // Component unmount - cleanup
    unsubscribe();

    // Events after unmount should not trigger handler
    eventBus.emit('task:updated', { taskId: '2' });
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
  });
});

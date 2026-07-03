/**
 * Unit Tests for QuickAddParser
 * Covers the capped natural-language grammar: dates, !priority, #tags, @project,
 * free-standing token enforcement, and the empty-title fallback.
 */

import { describe, it, expect } from 'vitest';

// Vanilla JS loaded via script tags - simulate loading (same pattern as task-data-manager.test.js)
const loadQuickAddParserModule = () => {
  const fs = require('fs');
  const path = require('path');
  const moduleContent = fs.readFileSync(
    path.join(__dirname, '../../js/features/tasks/quick-add-parser.js'),
    'utf8'
  );

  const cleanContent = moduleContent.replace(/window\.\w+ = \w+;/g, '');

  const moduleFunc = new Function(cleanContent + '\nreturn { QuickAddParser };');
  return moduleFunc();
};

const { QuickAddParser } = loadQuickAddParserModule();

const PROJECTS = [
  { id: 'p1', name: 'Personal' },
  { id: 'p2', name: 'Work Stuff' }
];

// Friday, July 3, 2026 (local time)
const NOW = new Date(2026, 6, 3);

const parse = (input, overrides = {}) =>
  QuickAddParser.parse(input, { projects: PROJECTS, now: NOW, ...overrides });

describe('QuickAddParser - dates', () => {
  it('parses "today"', () => {
    const r = parse('pay rent today');
    expect(r.dueDate).toBe('2026-07-03');
    expect(r.text).toBe('pay rent');
    expect(r.tokens).toEqual([
      expect.objectContaining({ type: 'date', source: 'today', value: '2026-07-03' })
    ]);
  });

  it('parses "tomorrow"', () => {
    const r = parse('call mom tomorrow');
    expect(r.dueDate).toBe('2026-07-04');
    expect(r.text).toBe('call mom');
  });

  it('parses full weekday names as next occurrence', () => {
    expect(parse('gym monday').dueDate).toBe('2026-07-06');
    expect(parse('gym thursday').dueDate).toBe('2026-07-09');
    expect(parse('gym sunday').dueDate).toBe('2026-07-05');
  });

  it('parses 3-letter weekday names', () => {
    expect(parse('gym mon').dueDate).toBe('2026-07-06');
    expect(parse('gym thu').dueDate).toBe('2026-07-09');
    expect(parse('gym sat').dueDate).toBe('2026-07-04');
  });

  it('same-day weekday wraps to next week (friday on a Friday = +7)', () => {
    const r = parse('review friday');
    expect(r.dueDate).toBe('2026-07-10');
  });

  it('is case-insensitive for date words', () => {
    expect(parse('gym MONDAY').dueDate).toBe('2026-07-06');
    expect(parse('pay rent Tomorrow').dueDate).toBe('2026-07-04');
  });

  it('parses "next week" as +7 days', () => {
    const r = parse('dentist next week');
    expect(r.dueDate).toBe('2026-07-10');
    expect(r.text).toBe('dentist');
    expect(r.tokens[0].source).toBe('next week');
  });

  it('parses "in N days" and "in N weeks"', () => {
    expect(parse('trip in 3 days').dueDate).toBe('2026-07-06');
    expect(parse('trip in 1 day').dueDate).toBe('2026-07-04');
    expect(parse('trip in 2 weeks').dueDate).toBe('2026-07-17');
    expect(parse('trip in 1 week').dueDate).toBe('2026-07-10');
  });

  it('handles month boundaries with local date math', () => {
    expect(parse('renewal in 30 days').dueDate).toBe('2026-08-02');
  });

  it('rejects out-of-range "in N days" (N > 365) and keeps the words', () => {
    const r = parse('trip in 400 days');
    expect(r.dueDate).toBeNull();
    expect(r.text).toBe('trip in 400 days');
    expect(r.tokens).toEqual([]);
  });

  it('first date wins; later date words stay in text', () => {
    const r = parse('meet today about tomorrow');
    expect(r.dueDate).toBe('2026-07-03');
    expect(r.text).toBe('meet about tomorrow');
  });

  it('produces a readable chip label', () => {
    const r = parse('review friday');
    expect(r.tokens[0].label).toBe('Due: Fri, Jul 10');
  });
});

describe('QuickAddParser - priority', () => {
  it('parses !high, !medium, !low', () => {
    expect(parse('task !high').priority).toBe('high');
    expect(parse('task !medium').priority).toBe('medium');
    expect(parse('task !low').priority).toBe('low');
  });

  it('is case-insensitive and normalizes to lowercase', () => {
    const r = parse('task !HIGH');
    expect(r.priority).toBe('high');
    expect(r.tokens[0].label).toBe('Priority: high');
  });

  it('ignores unknown priority words', () => {
    const r = parse('task !urgent');
    expect(r.priority).toBeNull();
    expect(r.text).toBe('task !urgent');
  });

  it('first priority wins; later ones stay in text', () => {
    const r = parse('task !high then !low');
    expect(r.priority).toBe('high');
    expect(r.text).toBe('task then !low');
  });
});

describe('QuickAddParser - tags', () => {
  it('parses multiple tags, stripping #', () => {
    const r = parse('plan trip #travel #summer');
    expect(r.tags).toEqual(['travel', 'summer']);
    expect(r.text).toBe('plan trip');
  });

  it('preserves tag case as typed', () => {
    expect(parse('task #Errands').tags).toEqual(['Errands']);
  });

  it('dedupes exact duplicate tags', () => {
    const r = parse('task #a #a');
    expect(r.tags).toEqual(['a']);
    expect(r.tokens.filter(t => t.type === 'tag')).toHaveLength(1);
  });

  it('rejects tags not starting with a letter (#1 stays in text)', () => {
    const r = parse('fix #1 bug');
    expect(r.tags).toEqual([]);
    expect(r.text).toBe('fix #1 bug');
  });
});

describe('QuickAddParser - project', () => {
  it('matches a project case-insensitively', () => {
    const r = parse('renew passport @personal');
    expect(r.projectId).toBe('p1');
    expect(r.projectName).toBe('Personal');
    expect(r.text).toBe('renew passport');
    expect(r.tokens[0].label).toBe('Project: Personal');
  });

  it('leaves unmatched @name in the text verbatim with no token', () => {
    const r = parse('email @john about launch');
    expect(r.projectId).toBeNull();
    expect(r.text).toBe('email @john about launch');
    expect(r.tokens).toEqual([]);
  });

  it('does not match multi-word project names via single word (known v1 limit)', () => {
    const r = parse('report @work');
    expect(r.projectId).toBeNull();
    expect(r.text).toBe('report @work');
  });
});

describe('QuickAddParser - free-standing enforcement', () => {
  it('does not match tokens embedded in words', () => {
    expect(parse('mail me@personal.com').text).toBe('mail me@personal.com');
    expect(parse('wow!high stuff').priority).toBeNull();
    expect(parse('learn c#tag basics').tags).toEqual([]);
  });

  it('leaves ambiguous natural text untouched', () => {
    const r = parse("email @john's #1 priority");
    expect(r.text).toBe("email @john's #1 priority");
    expect(r.dueDate).toBeNull();
    expect(r.priority).toBeNull();
    expect(r.tags).toEqual([]);
    expect(r.projectId).toBeNull();
    expect(r.tokens).toEqual([]);
  });
});

describe('QuickAddParser - text assembly', () => {
  it('collapses whitespace around removed tokens', () => {
    const r = parse('buy   milk   !high   today');
    expect(r.text).toBe('buy milk');
  });

  it('keeps tokens[] in input order', () => {
    const r = parse('renew passport friday !high #errands @personal');
    expect(r.tokens.map(t => t.type)).toEqual(['date', 'priority', 'tag', 'project']);
    expect(r.text).toBe('renew passport');
    expect(r.dueDate).toBe('2026-07-10');
    expect(r.priority).toBe('high');
    expect(r.tags).toEqual(['errands']);
    expect(r.projectId).toBe('p1');
  });

  it('falls back to the raw input when all words are tokens', () => {
    const r = parse('!high #errands');
    expect(r.titleIsFallback).toBe(true);
    expect(r.text).toBe('!high #errands');
    expect(r.priority).toBe('high');
    expect(r.tags).toEqual(['errands']);
  });

  it('passes plain input through unchanged', () => {
    const r = parse('Buy milk');
    expect(r.text).toBe('Buy milk');
    expect(r.dueDate).toBeNull();
    expect(r.priority).toBeNull();
    expect(r.tags).toEqual([]);
    expect(r.projectId).toBeNull();
    expect(r.tokens).toEqual([]);
    expect(r.titleIsFallback).toBe(false);
  });

  it('handles empty and whitespace-only input', () => {
    expect(parse('').text).toBe('');
    expect(parse('   ').text).toBe('');
    expect(parse('').tokens).toEqual([]);
  });
});

describe('QuickAddParser - date helpers', () => {
  it('formatLocalDate uses local components', () => {
    expect(QuickAddParser.formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('addDays normalizes month overflow', () => {
    const d = QuickAddParser.addDays(new Date(2026, 6, 31), 1);
    expect(QuickAddParser.formatLocalDate(d)).toBe('2026-08-01');
  });
});

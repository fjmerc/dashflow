/**
 * QuickAddParser - natural-language token parser for task quick add.
 *
 * Parses inline tokens from a single line of input:
 *   "Renew passport friday !high #errands @personal"
 *   → text "Renew passport", due next Friday, priority high, tag "errands", project "Personal"
 *
 * Grammar (v1, documented in help.html):
 *   !high | !medium | !low          → priority (first match wins)
 *   #tag                            → tag (must start with a letter; # stripped, case preserved)
 *   @name                           → project (case-insensitive exact match; unmatched stays in text)
 *   today | tomorrow                → due date
 *   monday..sunday | mon..sun       → next occurrence (strictly future: "friday" on a Friday = +7)
 *   next week                       → +7 days
 *   in N days | in N weeks          → +N / +7N days (N = 1..365)
 *
 * Tokens must be free-standing whitespace-delimited words. Matched tokens are
 * removed from the text; everything else becomes the task title. Pure and
 * dependency-free: projects and clock are injected via options for testability.
 */
const QuickAddParser = (() => {
    const PRIORITY_RE = /^!(high|medium|low)$/i;
    const TAG_RE = /^#([A-Za-z][A-Za-z0-9_-]*)$/;
    const PROJECT_RE = /^@(.+)$/;
    const NUMBER_RE = /^\d{1,3}$/;

    const WEEKDAYS = {
        sunday: 0, sun: 0,
        monday: 1, mon: 1,
        tuesday: 2, tue: 2,
        wednesday: 3, wed: 3,
        thursday: 4, thu: 4,
        friday: 5, fri: 5,
        saturday: 6, sat: 6
    };

    /**
     * Format a Date as local 'YYYY-MM-DD' (never toISOString - UTC shifts days).
     */
    function formatLocalDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Add days using component arithmetic; the Date constructor normalizes
     * month/year overflow and DST boundaries.
     */
    function addDays(base, n) {
        return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
    }

    function dateLabel(date) {
        return 'Due: ' + date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Try to match a date phrase starting at words[i].
     * Returns { date: Date, consumed: number } or null.
     */
    function matchDate(words, i, now) {
        const w = words[i].toLowerCase();

        // "in N days" / "in N weeks" (3 words)
        if (w === 'in' && i + 2 < words.length) {
            const numWord = words[i + 1];
            const unit = words[i + 2].toLowerCase();
            if (NUMBER_RE.test(numWord)) {
                const n = parseInt(numWord, 10);
                if (n >= 1 && n <= 365) {
                    if (unit === 'day' || unit === 'days') {
                        return { date: addDays(now, n), consumed: 3 };
                    }
                    if (unit === 'week' || unit === 'weeks') {
                        return { date: addDays(now, n * 7), consumed: 3 };
                    }
                }
            }
        }

        // "next week" (2 words)
        if (w === 'next' && i + 1 < words.length && words[i + 1].toLowerCase() === 'week') {
            return { date: addDays(now, 7), consumed: 2 };
        }

        if (w === 'today') {
            return { date: addDays(now, 0), consumed: 1 };
        }
        if (w === 'tomorrow') {
            return { date: addDays(now, 1), consumed: 1 };
        }

        if (Object.prototype.hasOwnProperty.call(WEEKDAYS, w)) {
            const target = WEEKDAYS[w];
            // Strictly next occurrence: same weekday today means +7
            const offset = ((target - now.getDay() + 7) % 7) || 7;
            return { date: addDays(now, offset), consumed: 1 };
        }

        return null;
    }

    /**
     * Parse a quick-add input line.
     *
     * @param {string} input - Raw user input
     * @param {Object} [options]
     * @param {Array<{id: string, name: string}>} [options.projects] - Candidate projects for @name resolution
     * @param {Date} [options.now] - Injected clock (defaults to new Date())
     * @returns {{
     *   text: string, rawInput: string, dueDate: string|null,
     *   priority: string|null, tags: string[], projectId: string|null,
     *   projectName: string|null, titleIsFallback: boolean,
     *   tokens: Array<{type: string, source: string, label: string, value: string}>
     * }}
     */
    function parse(input, options = {}) {
        const projects = options.projects || [];
        const now = options.now || new Date();

        const rawInput = String(input || '').trim();
        const result = {
            text: '',
            rawInput,
            dueDate: null,
            priority: null,
            tags: [],
            projectId: null,
            projectName: null,
            titleIsFallback: false,
            tokens: []
        };

        if (!rawInput) return result;

        const words = rawInput.split(/\s+/);
        const kept = [];
        let i = 0;

        while (i < words.length) {
            const word = words[i];

            // Date (singleton, first match wins)
            if (result.dueDate === null) {
                const match = matchDate(words, i, now);
                if (match) {
                    result.dueDate = formatLocalDate(match.date);
                    result.tokens.push({
                        type: 'date',
                        source: words.slice(i, i + match.consumed).join(' '),
                        label: dateLabel(match.date),
                        value: result.dueDate
                    });
                    i += match.consumed;
                    continue;
                }
            }

            // Priority (singleton)
            const priorityMatch = word.match(PRIORITY_RE);
            if (priorityMatch && result.priority === null) {
                result.priority = priorityMatch[1].toLowerCase();
                result.tokens.push({
                    type: 'priority',
                    source: word,
                    label: 'Priority: ' + result.priority,
                    value: result.priority
                });
                i++;
                continue;
            }

            // Tag (cumulative, deduped by exact string)
            const tagMatch = word.match(TAG_RE);
            if (tagMatch) {
                const tag = tagMatch[1];
                if (!result.tags.includes(tag)) {
                    result.tags.push(tag);
                    result.tokens.push({
                        type: 'tag',
                        source: word,
                        label: '#' + tag,
                        value: tag
                    });
                }
                i++;
                continue;
            }

            // Project (singleton; unmatched names stay in the text verbatim)
            const projectMatch = word.match(PROJECT_RE);
            if (projectMatch && result.projectId === null) {
                const needle = projectMatch[1].toLowerCase();
                const project = projects.find(
                    p => p && typeof p.name === 'string' && p.name.trim().toLowerCase() === needle
                );
                if (project) {
                    result.projectId = project.id;
                    result.projectName = project.name;
                    result.tokens.push({
                        type: 'project',
                        source: word,
                        label: 'Project: ' + project.name,
                        value: project.id
                    });
                    i++;
                    continue;
                }
            }

            kept.push(word);
            i++;
        }

        result.text = kept.join(' ');

        // Never silently lose input: all-token lines fall back to the raw string
        if (!result.text && result.tokens.length > 0) {
            result.text = rawInput;
            result.titleIsFallback = true;
        }

        return result;
    }

    return { parse, formatLocalDate, addDays };
})();

window.QuickAddParser = QuickAddParser;

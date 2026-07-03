/**
 * OmniSearch - Unified fuzzy search across links, tasks, and notes
 *
 * Reads directly from localStorage on each search (data sets are small),
 * so there is no index to keep in sync across pages.
 * Used by command-palette.js; loaded on both index.html and todo.html.
 */

const OmniSearch = (() => {
    const WORD_BOUNDARY = /[\s\-_/.:,•#@]/;

    /**
     * Fuzzy subsequence scorer.
     * Returns a numeric score (higher = better) or null if `query`
     * is not a subsequence of `text`.
     */
    function fuzzyScoreTerm(term, text) {
        const t = text.toLowerCase();
        let score = 0;
        let ti = 0;
        let prevMatch = -2;

        for (let qi = 0; qi < term.length; qi++) {
            const ch = term[qi];
            let found = -1;
            for (; ti < t.length; ti++) {
                if (t[ti] === ch) {
                    found = ti;
                    break;
                }
            }
            if (found === -1) return null;

            score += 1;
            if (found === 0 || WORD_BOUNDARY.test(t[found - 1])) {
                score += 8; // word-boundary bonus
            }
            if (found === prevMatch + 1) {
                score += 5; // consecutive-match bonus
            }
            prevMatch = found;
            ti = found + 1;
        }

        // Slight penalty for long haystacks so tight matches rank first
        return score - Math.min(t.length * 0.05, 5);
    }

    /**
     * Score a multi-word query: every whitespace-separated term must
     * match, scores are summed. Returns null when any term misses.
     */
    function fuzzyScore(query, text) {
        if (!text) return null;
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (terms.length === 0) return null;

        let total = 0;
        for (const term of terms) {
            const s = fuzzyScoreTerm(term, text);
            if (s === null) return null;
            total += s;
        }
        return total;
    }

    /**
     * Score an item that has a title and a broader haystack.
     * Title matches are weighted double so they outrank content matches.
     */
    function scoreItem(query, title, haystack) {
        const titleScore = fuzzyScore(query, title);
        const haystackScore = fuzzyScore(query, haystack);
        if (titleScore === null && haystackScore === null) return null;
        return Math.max(
            titleScore === null ? -Infinity : titleScore * 2,
            haystackScore === null ? -Infinity : haystackScore
        );
    }

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            Logger.error(`OmniSearch: failed to parse localStorage key "${key}":`, e);
            return fallback;
        }
    }

    function openTask(taskId) {
        if (typeof window.openTaskFromSearch === 'function') {
            window.openTaskFromSearch(taskId);
        } else {
            window.location.href = `todo.html?taskId=${encodeURIComponent(taskId)}`;
        }
    }

    function openNote(noteId) {
        if (window.openNotesModal) {
            window.openNotesModal();
            setTimeout(() => {
                if (window.notesUIManager) {
                    window.notesUIManager.loadNote(noteId);
                }
            }, 150);
        }
    }

    function safeHttpUrl(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : null;
        } catch (e) {
            return null;
        }
    }

    function searchLinks(query, tagQuery) {
        if (tagQuery !== null) return []; // links have no tags
        const links = readJSON('links', {});
        const results = [];

        for (const [section, sectionLinks] of Object.entries(links)) {
            if (!Array.isArray(sectionLinks)) continue;
            sectionLinks.forEach(link => {
                const url = safeHttpUrl(link.url);
                if (!url) return; // never open javascript:/data: etc.
                const name = link.name || '';
                const haystack = `${name} ${link.url} ${section}`;
                const score = scoreItem(query, name, haystack);
                if (score === null) return;
                results.push({
                    type: 'link',
                    icon: link.favorite ? '⭐' : '🔗',
                    title: link.name,
                    subtitle: `${section} • ${link.url}`,
                    score,
                    action: () => window.open(url, '_blank', 'noopener')
                });
            });
        }
        return results;
    }

    function searchTasks(query, tagQuery) {
        const tasks = readJSON('tasks', []);
        const projects = readJSON('projects', []);
        if (!Array.isArray(tasks)) return [];
        const results = [];

        tasks.forEach(task => {
            let score;
            if (tagQuery !== null) {
                score = bestTagScore(tagQuery, task.tags);
            } else {
                const subtaskText = (task.subtasks || []).map(s => s.text).join(' ');
                const tagText = (task.tags || []).join(' ');
                const text = task.text || '';
                const haystack = `${text} ${task.description || ''} ${tagText} ${subtaskText}`;
                score = scoreItem(query, text, haystack);
            }
            if (score === null) return;

            const project = Array.isArray(projects)
                ? projects.find(p => p.id === task.projectId)
                : null;
            const parts = [
                project ? project.name : 'Inbox',
                task.completed ? 'Completed' : (task.status || 'todo')
            ];
            if (task.priority === 'high') parts.push('High priority');

            results.push({
                type: 'task',
                icon: task.completed ? '✅' : '☑️',
                title: task.text,
                subtitle: parts.join(' • '),
                score,
                action: () => openTask(task.id)
            });
        });
        return results;
    }

    function searchNotes(query, tagQuery) {
        const notes = readJSON('notes', []);
        if (!Array.isArray(notes)) return [];
        const results = [];

        notes.forEach(note => {
            const title = note.title || 'Untitled Note';
            let score;
            if (tagQuery !== null) {
                score = bestTagScore(tagQuery, note.tags);
            } else {
                const tagText = (note.tags || []).join(' ');
                score = scoreItem(query, title, `${title} ${note.content || ''} ${tagText}`);
            }
            if (score === null) return;

            let subtitle;
            if (note.tags && note.tags.length > 0) {
                subtitle = note.tags.map(t => `#${t}`).join(' ');
            } else {
                const preview = (note.content || '').substring(0, 60).replace(/\n/g, ' ');
                subtitle = preview + ((note.content || '').length > 60 ? '…' : '');
            }

            results.push({
                type: 'note',
                icon: '📝',
                title,
                subtitle,
                score,
                action: () => openNote(note.id)
            });
        });
        return results;
    }

    function bestTagScore(tagQuery, tags) {
        if (!Array.isArray(tags) || tags.length === 0) return null;
        if (!tagQuery) return 1; // bare "#" lists everything tagged
        let best = null;
        for (const tag of tags) {
            const s = fuzzyScore(tagQuery, tag);
            if (s !== null && (best === null || s > best)) best = s;
        }
        return best;
    }

    /**
     * Search all content sources.
     * @param {string} query - plain query, or tag query when tagQuery is set
     * @param {object} [options]
     * @param {string|null} [options.tagQuery] - when non-null, match tags only
     * @param {number} [options.limitPerType]
     * @returns {{links: [], tasks: [], notes: []}} score-sorted, capped per type
     */
    function search(query, options = {}) {
        const tagQuery = options.tagQuery !== undefined ? options.tagQuery : null;
        const limit = options.limitPerType || 6;
        const byScore = (a, b) => b.score - a.score;

        return {
            links: searchLinks(query, tagQuery).sort(byScore).slice(0, limit),
            tasks: searchTasks(query, tagQuery).sort(byScore).slice(0, limit),
            notes: searchNotes(query, tagQuery).sort(byScore).slice(0, limit)
        };
    }

    return { search, fuzzyScore, scoreItem };
})();

window.OmniSearch = OmniSearch;

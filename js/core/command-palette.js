/**
 * Command Palette - Unified omnisearch UI (Ctrl+K / Ctrl+F)
 *
 * Shared across index.html and todo.html. Generates its own markup on
 * first open (styles live in styles.css under .command-palette).
 *
 * Searches page-registered commands plus links, tasks, and notes via
 * OmniSearch. Query prefixes:
 *   >query  - commands only
 *   #query  - tag search (tasks and notes)
 *
 * Pages contribute commands with:
 *   window.commandPalette.registerCommandProvider(() => [command, ...])
 * where command = { id, name, description, icon, category, keywords, action }
 *
 * Query-aware commands (built from the current query, e.g. "Create task: ...")
 * are contributed with:
 *   window.commandPalette.registerQueryCommandProvider((query) => command | null)
 * They only appear for general searches (not >, # or empty queries).
 */

class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.commandProviders = [];
        this.queryCommandProviders = [];
        this.sections = [];
        this.flatResults = [];
        this.selectedIndex = 0;
        this.root = null;
        this.input = null;
        this.resultsEl = null;

        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    }

    registerCommandProvider(provider) {
        if (typeof provider === 'function') {
            this.commandProviders.push(provider);
        }
    }

    registerQueryCommandProvider(provider) {
        if (typeof provider === 'function') {
            this.queryCommandProviders.push(provider);
        }
    }

    handleGlobalKeydown(e) {
        // Ctrl/Cmd+K and Ctrl/Cmd+F open the palette, even while typing.
        // Ctrl+F deliberately replaces native find-in-page: it has been the
        // app's global-search shortcut since the old search modal.
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
            e.preventDefault();
            if (!this.isOpen) this.open();
            return;
        }

        if (!this.isOpen) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveSelection(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.executeSelected();
        }
    }

    ensureDom() {
        if (this.root) return;

        this.root = document.createElement('div');
        this.root.id = 'commandPalette';
        this.root.className = 'command-palette hidden';
        this.root.setAttribute('role', 'dialog');
        this.root.setAttribute('aria-label', 'Command palette');
        this.root.innerHTML = `
            <div class="command-palette-backdrop"></div>
            <div class="command-palette-container">
                <div class="command-palette-header">
                    <i class="fas fa-search command-palette-icon"></i>
                    <input
                        type="text"
                        id="commandPaletteInput"
                        class="command-palette-input"
                        placeholder="Search everything... (> commands, # tags)"
                        autocomplete="off"
                        spellcheck="false"
                    />
                    <kbd class="command-palette-hint">Esc</kbd>
                </div>
                <div class="command-palette-results" id="commandPaletteResults"></div>
                <div class="command-palette-footer">
                    <div class="command-palette-footer-hint">
                        <kbd>↑</kbd><kbd>↓</kbd> to navigate
                        <kbd>↵</kbd> to select
                        <kbd>esc</kbd> to close
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.root);

        this.input = this.root.querySelector('#commandPaletteInput');
        this.resultsEl = this.root.querySelector('#commandPaletteResults');

        this.input.addEventListener('input', (e) => this.onQuery(e.target.value));
        this.root.querySelector('.command-palette-backdrop')
            .addEventListener('click', () => this.close());

        // Event delegation for result clicks
        this.resultsEl.addEventListener('click', (e) => {
            const resultEl = e.target.closest('.command-result');
            if (resultEl) {
                const index = parseInt(resultEl.dataset.index, 10);
                if (this.flatResults[index]) {
                    this.execute(this.flatResults[index]);
                }
            }
        });
    }

    open() {
        this.ensureDom();
        this.isOpen = true;
        this.root.classList.remove('hidden');
        this.input.value = '';
        this.input.focus();
        this.onQuery('');
        Logger.debug('Command palette opened');
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.root.classList.add('hidden');
        this.input.value = '';
        this.flatResults = [];
        Logger.debug('Command palette closed');
    }

    getCommands() {
        const commands = [];
        for (const provider of this.commandProviders) {
            try {
                commands.push(...provider());
            } catch (error) {
                Logger.error('Command provider failed:', error);
            }
        }
        return commands;
    }

    getQueryCommands(query) {
        const commands = [];
        for (const provider of this.queryCommandProviders) {
            try {
                const command = provider(query);
                if (command) commands.push(command);
            } catch (error) {
                Logger.error('Query command provider failed:', error);
            }
        }
        return commands;
    }

    scoreCommands(query) {
        const commands = this.getCommands();
        if (!query) {
            return commands.map(cmd => ({ ...cmd, score: 0 }));
        }
        return commands
            .map(cmd => {
                const haystack = [cmd.name, cmd.description, ...(cmd.keywords || [])].join(' ');
                const score = OmniSearch.scoreItem(query, cmd.name, haystack);
                return score === null ? null : { ...cmd, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);
    }

    onQuery(rawQuery) {
        const query = rawQuery.trim();
        const sections = [];

        if (query.startsWith('>')) {
            // Commands only
            sections.push({ label: 'Commands', items: this.scoreCommands(query.slice(1).trim()) });
        } else if (query.startsWith('#')) {
            // Tag search across tasks and notes
            const content = OmniSearch.search('', { tagQuery: query.slice(1).trim() });
            sections.push({ label: 'Tasks', items: content.tasks });
            sections.push({ label: 'Notes', items: content.notes });
        } else if (!query) {
            // Empty: show all commands, like the palette always has
            sections.push({ label: 'Commands', items: this.scoreCommands('') });
        } else {
            const content = OmniSearch.search(query);
            sections.push({
                label: 'Commands',
                items: [...this.getQueryCommands(query), ...this.scoreCommands(query).slice(0, 6)]
            });
            sections.push({ label: 'Tasks', items: content.tasks });
            sections.push({ label: 'Links', items: content.links });
            sections.push({ label: 'Notes', items: content.notes });
        }

        this.sections = sections.filter(s => s.items.length > 0);
        this.flatResults = this.sections.flatMap(s => s.items);
        this.selectedIndex = 0;
        this.render();
    }

    render() {
        this.resultsEl.innerHTML = '';

        if (this.flatResults.length === 0) {
            this.resultsEl.innerHTML = `
                <div class="command-palette-empty">
                    <div class="command-palette-empty-icon">🔍</div>
                    <div class="command-palette-empty-text">No results found</div>
                </div>
            `;
            return;
        }

        let index = 0;
        for (const section of this.sections) {
            const header = document.createElement('div');
            header.className = 'command-palette-section-header';
            header.textContent = section.label;
            this.resultsEl.appendChild(header);

            for (const item of section.items) {
                const el = document.createElement('div');
                el.className = `command-result ${index === this.selectedIndex ? 'selected' : ''}`;
                el.dataset.index = index;

                // SECURITY: only command icons (in-code emoji or Font Awesome
                // HTML for project icons) may be trusted HTML. Content items
                // from OmniSearch carry a `type` and get their icon escaped.
                const icon = item.type
                    ? this.escapeHtml(item.icon || '•')
                    : (item.icon || '•');
                const title = item.name || item.title || '';
                const subtitle = item.description || item.subtitle || '';
                const category = item.category || item.type || '';

                el.innerHTML = `
                    <div class="command-result-icon">${icon}</div>
                    <div class="command-result-content">
                        <div class="command-result-name">${this.escapeHtml(title)}</div>
                        <div class="command-result-description">${this.escapeHtml(subtitle)}</div>
                    </div>
                    <div class="command-result-category">${this.escapeHtml(category)}</div>
                `;
                this.resultsEl.appendChild(el);
                index++;
            }
        }
    }

    moveSelection(delta) {
        if (this.flatResults.length === 0) return;
        const len = this.flatResults.length;
        this.selectedIndex = (this.selectedIndex + delta + len) % len;
        this.render();

        const selectedEl = this.resultsEl.querySelector('.command-result.selected');
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest' });
        }
    }

    executeSelected() {
        if (this.flatResults.length > 0 && this.selectedIndex < this.flatResults.length) {
            this.execute(this.flatResults[this.selectedIndex]);
        }
    }

    execute(item) {
        Logger.debug('Command palette executing:', item.id || item.title);
        this.close();
        try {
            item.action();
        } catch (error) {
            Logger.error('Command palette action failed:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'command_palette', {
                    itemId: item.id || item.title
                });
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }
}

window.commandPalette = new CommandPalette();

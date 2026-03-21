// ── Constants ────────────────────────────────────────
const FIELD_ORDER = ['name', 'title', 'organization', 'status', 'seats', 'invitedBy', 'phone', 'email', 'notes'];
const STATUS_ORDER = { pending: 0, invited: 1, confirmed: 2, declined: 3 };
const HEADER_LABELS = {
    name: 'Name', title: 'Title', organization: 'Organization',
    status: 'Status', seats: 'Seats', invitedBy: 'Invited By', phone: 'Phone', email: 'Email', notes: 'Notes'
};

// ── App State ────────────────────────────────────────
const App = {
    events: [],
    invitees: [],
    activeEventId: null,
    inviteeListener: null,
    searchQuery: '',
    sortField: 'status',
    sortDirection: 'asc',
    hiddenColumns: {},
    briefExpanded: false,
    deleteTargetId: null,
    editingRowId: null,
    renderPending: false,
    pendingNewRow: {},

    // ── Icons (inline SVG) ──────────────────────────
    icons: {
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>',
        calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
        mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        columns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/></svg>',
    },

    // ── Init ────────────────────────────────────────
    init() {
        if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
            document.getElementById('app').innerHTML = `
                <div class="config-warning">
                    <h2>Firebase Not Configured</h2>
                    <p>Open <code>js/config.js</code> and add your Firebase project credentials.</p>
                    <p style="margin-top: 12px; font-size: 13px;">
                        1. Go to <strong>Firebase Console</strong> → Create project<br>
                        2. Enable <strong>Firestore Database</strong><br>
                        3. Register a <strong>Web App</strong><br>
                        4. Copy the config into <code>js/config.js</code>
                    </p>
                </div>
            `;
            document.getElementById('tabs-container').innerHTML = '';
            return;
        }

        Data.listenToEvents(events => {
            this.events = events;
            this.renderTabs();

            if (!this.activeEventId && events.length > 0) {
                this.selectEvent(events[0].id);
            } else if (this.activeEventId) {
                const exists = events.find(e => e.id === this.activeEventId);
                if (exists) {
                    const wrapper = document.getElementById('invite-table-wrapper');
                    if (wrapper) {
                        // View already rendered — just update header fields in place
                        this.updateEventHeader(exists);
                    } else {
                        // First render or DOM was cleared — full render needed
                        this.renderEventView(exists);
                    }
                } else if (events.length > 0) {
                    this.selectEvent(events[0].id);
                } else {
                    this.activeEventId = null;
                    this.renderEmptyEvents();
                }
            } else {
                this.renderEmptyEvents();
            }
        });

        Data.seedEvents();

        // Click outside modal to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // Click outside columns menu to close
        document.addEventListener('click', e => {
            const menu = document.getElementById('columns-menu');
            if (menu && menu.classList.contains('active') && !e.target.closest('.columns-toggle-wrapper')) {
                menu.classList.remove('active');
            }
        });

    },

    // ── Tab Rendering ───────────────────────────────
    renderTabs() {
        const container = document.getElementById('tabs-container');
        let html = '';
        this.events.forEach(evt => {
            const activeClass = evt.id === this.activeEventId ? ' active' : '';
            html += `<button class="tab${activeClass}" onclick="App.selectEvent('${evt.id}')">${this.escapeHtml(evt.name || 'Untitled')}</button>`;
        });
        html += `<button class="tab-add" onclick="App.addEvent()">+ Add Event</button>`;
        container.innerHTML = html;
    },

    // ── Event Selection ─────────────────────────────
    selectEvent(eventId) {
        this.activeEventId = eventId;
        this.searchQuery = '';
        this.sortField = 'status';
        this.sortDirection = 'asc';
        this.hiddenColumns = {};
        this.editingRowId = null;
        this.pendingNewRow = {};
        this.renderTabs();

        if (this.inviteeListener) this.inviteeListener();

        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.renderEventView(event);

        this.inviteeListener = Data.listenToInvitees(eventId, invitees => {
            this.invitees = invitees;
            if (this.editingRowId) {
                this.renderPending = true;
            } else {
                this.renderTable();
            }
            this.renderStats();
        });
    },

    // ── Event View ──────────────────────────────────
    renderEventView(event) {
        document.getElementById('app').innerHTML = `
            <div class="event-header">
                <div class="event-header-top">
                    <input class="editable-text event-name-input"
                           value="${this.escapeAttr(event.name || '')}"
                           placeholder="Event Name"
                           onchange="App.updateEventField('name', this.value)">
                    <div class="event-meta-inline">
                        <span class="meta-item">
                            ${this.icons.calendar}
                            <input class="editable-text meta-date" type="date"
                                   value="${this.escapeAttr(event.date || '')}"
                                   onchange="App.updateEventField('date', this.value)">
                        </span>
                        <span class="meta-divider">·</span>
                        <span class="meta-item">
                            ${this.icons.mapPin}
                            <input class="editable-text meta-venue"
                                   value="${this.escapeAttr(event.location || '')}"
                                   placeholder="Venue"
                                   onchange="App.updateEventField('location', this.value)">
                        </span>
                        <span class="meta-divider">·</span>
                        <span class="meta-item">
                            <input class="editable-text meta-address"
                                   value="${this.escapeAttr(event.address || '')}"
                                   placeholder="Address"
                                   onchange="App.updateEventField('address', this.value)">
                        </span>
                    </div>
                    <div class="event-header-actions">
                        <button class="btn-link brief-toggle-btn" onclick="App.toggleBrief()">
                            Event Brief <span class="toggle-arrow-inline">▾</span>
                        </button>
                        <button class="btn-icon" title="Delete Event" onclick="App.showDeleteEventModal()">
                            ${this.icons.trash}
                        </button>
                    </div>
                </div>
            </div>

            <div class="invite-brief${this.briefExpanded ? '' : ' collapsed'}" id="invite-brief">
                <div class="invite-brief-content">
                    <div class="brief-fields">
                        <div class="brief-field brief-field-wide">
                            <label>Hosted By</label>
                            <input class="editable-text brief-hostedby"
                                   value="${this.escapeAttr(event.hostedBy || '')}"
                                   placeholder="Host name"
                                   onchange="App.updateEventField('hostedBy', this.value)">
                        </div>
                        <div class="brief-field brief-field-wide">
                            <label>Dress Code</label>
                            <input class="editable-text brief-dresscode"
                                   value="${this.escapeAttr(event.dressCode || '')}"
                                   placeholder="e.g. Black Tie"
                                   onchange="App.updateEventField('dressCode', this.value)">
                        </div>
                        <div class="brief-field">
                            <label>RSVP By</label>
                            <input class="editable-text brief-rsvp" type="date"
                                   value="${this.escapeAttr(event.rsvpDeadline || '')}"
                                   onchange="App.updateEventField('rsvpDeadline', this.value)">
                        </div>
                        <div class="brief-field">
                            <label>Event Link</label>
                            <input class="editable-text brief-eventurl"
                                   value="${this.escapeAttr(event.eventUrl || '')}"
                                   placeholder="https://..."
                                   onchange="App.updateEventField('eventUrl', this.value)">
                            ${event.eventUrl ? `<a class="event-url-link" href="${this.escapeAttr(event.eventUrl)}" target="_blank" rel="noopener" title="Open link">↗</a>` : ''}
                        </div>
                    </div>
                    <div class="brief-draft-email">
                        <label>Draft Email Invite</label>
                        <textarea class="brief-textarea brief-draftemail"
                                  placeholder="Draft email for lobbyist outreach..."
                                  onchange="App.updateEventField('draftEmail', this.value)">${this.escapeHtml(event.draftEmail || '')}</textarea>
                    </div>
                </div>
            </div>

            <div class="controls-bar">
                <div class="controls-left" id="stats-bar"></div>
                <div class="controls-right">
                    <div class="search-wrapper">
                        ${this.icons.search}
                        <input class="search-input" placeholder="Search..."
                               value="${this.escapeAttr(this.searchQuery)}"
                               oninput="App.handleSearch(this.value)">
                    </div>
                    <div class="columns-toggle-wrapper">
                        <button class="btn btn-sm columns-toggle-btn" onclick="App.toggleColumnsMenu()">
                            ${this.icons.columns} Columns
                        </button>
                        <div class="columns-menu" id="columns-menu">
                            ${FIELD_ORDER.map(field => `
                                <label class="columns-menu-item">
                                    <input type="checkbox" ${this.hiddenColumns[field] ? '' : 'checked'}
                                           onchange="App.toggleColumn('${field}')">
                                    ${HEADER_LABELS[field]}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="table-container">
                <div class="table-scroll">
                    <div id="invite-table-wrapper"></div>
                </div>
                <div class="keyboard-hints">
                    <span><kbd>Click</kbd> cell to edit</span>
                    <span><kbd>Tab</kbd> next cell</span>
                    <span><kbd>Enter</kbd> next row</span>
                    <span><kbd>Esc</kbd> cancel</span>
                </div>
            </div>
        `;
    },

    // ── Event Header Update (in-place, no DOM wipe) ──
    updateEventHeader(event) {
        const nameInput = document.querySelector('.event-name-input');
        if (nameInput && document.activeElement !== nameInput) {
            nameInput.value = event.name || '';
        }
        const dateInput = document.querySelector('.event-meta-field input[type="date"]');
        if (dateInput && document.activeElement !== dateInput) {
            dateInput.value = event.date || '';
        }
        const locationInput = document.querySelector('.event-meta-field input[placeholder="Venue Name"]');
        if (locationInput && document.activeElement !== locationInput) {
            locationInput.value = event.location || '';
        }
        const addressInput = document.querySelector('.event-address-input');
        if (addressInput && document.activeElement !== addressInput) {
            addressInput.value = event.address || '';
        }
        const hostedByInput = document.querySelector('.brief-hostedby');
        if (hostedByInput && document.activeElement !== hostedByInput) {
            hostedByInput.value = event.hostedBy || '';
        }
        const dressCodeInput = document.querySelector('.brief-dresscode');
        if (dressCodeInput && document.activeElement !== dressCodeInput) {
            dressCodeInput.value = event.dressCode || '';
        }
        const rsvpInput = document.querySelector('.brief-rsvp');
        if (rsvpInput && document.activeElement !== rsvpInput) {
            rsvpInput.value = event.rsvpDeadline || '';
        }
        const eventUrlInput = document.querySelector('.brief-eventurl');
        if (eventUrlInput && document.activeElement !== eventUrlInput) {
            eventUrlInput.value = event.eventUrl || '';
        }
        const draftEmailInput = document.querySelector('.brief-draftemail');
        if (draftEmailInput && document.activeElement !== draftEmailInput) {
            draftEmailInput.value = event.draftEmail || '';
        }
    },

    // ── Stats ───────────────────────────────────────
    renderStats() {
        const counts = { pending: 0, invited: 0, confirmed: 0, declined: 0 };
        this.invitees.forEach(inv => {
            if (counts[inv.status] !== undefined) counts[inv.status]++;
        });
        const total = this.invitees.length;
        const pct = (n) => total > 0 ? ((n / total) * 100).toFixed(1) : 0;
        const bar = document.getElementById('stats-bar');
        if (!bar) return;
        bar.innerHTML = `
            <div class="stat-total">${total} Invitee${total !== 1 ? 's' : ''}</div>
            <div class="stat-chip stat-pending"><span class="stat-count">${counts.pending}</span> Pending</div>
            <div class="stat-chip stat-declined"><span class="stat-count">${counts.declined}</span> Declined</div>
            <div class="stat-chip stat-invited"><span class="stat-count">${counts.invited}</span> Invited</div>
            <div class="stat-chip stat-confirmed"><span class="stat-count">${counts.confirmed}</span> Confirmed</div>
            <div class="status-bar-container" title="${pct(counts.pending)}% pending, ${pct(counts.declined)}% declined, ${pct(counts.invited)}% invited, ${pct(counts.confirmed)}% confirmed">
                <div class="status-bar-segment seg-pending" style="width: ${pct(counts.pending)}%"></div>
                <div class="status-bar-segment seg-declined" style="width: ${pct(counts.declined)}%"></div>
                <div class="status-bar-segment seg-invited" style="width: ${pct(counts.invited)}%"></div>
                <div class="status-bar-segment seg-confirmed" style="width: ${pct(counts.confirmed)}%"></div>
            </div>
        `;
    },

    // ── Table Rendering ─────────────────────────────
    renderTable() {
        const wrapper = document.getElementById('invite-table-wrapper');
        if (!wrapper) return;

        let filtered = this.invitees;

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(inv =>
                (inv.name || '').toLowerCase().includes(q) ||
                (inv.title || '').toLowerCase().includes(q) ||
                (inv.organization || '').toLowerCase().includes(q) ||
                (inv.notes || '').toLowerCase().includes(q)
            );
        }

        filtered = [...filtered].sort((a, b) => {
            let cmp = 0;
            if (this.sortField === 'status') {
                cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
            } else {
                cmp = (a[this.sortField] || '').localeCompare(b[this.sortField] || '');
            }
            return this.sortDirection === 'asc' ? cmp : -cmp;
        });

        // Always show the table with phantom row, even when empty
        const rows = filtered.map(inv => this.renderInviteeRow(inv)).join('');
        const phantomRow = this.renderPhantomRow();

        const visible = this.getVisibleFields();
        const colWidths = { name: 14, title: 12, organization: 14, status: 8, seats: 4, invitedBy: 11, phone: 9, email: 12, notes: 16 };
        const actionWidth = 4;
        const totalUsed = visible.reduce((sum, f) => sum + colWidths[f], 0) + actionWidth;
        const scale = 96 / totalUsed;

        wrapper.innerHTML = `
            <table class="invite-table">
                <colgroup>
                    ${visible.map(f => `<col style="width:${(colWidths[f] * scale).toFixed(1)}%">`).join('\n                    ')}
                    <col style="width:${actionWidth}%">
                </colgroup>
                <thead>
                    <tr>
                        ${visible.map(field => {
                            const active = this.sortField === field;
                            const cls = active ? ' class="sort-active"' : '';
                            const arrow = active ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
                            return `<th${cls} onclick="App.handleSort('${field}')">${HEADER_LABELS[field]}${arrow}</th>`;
                        }).join('')}
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rows}${phantomRow}</tbody>
            </table>
        `;

        if (filtered.length === 0 && this.searchQuery) {
            wrapper.innerHTML = `<div class="empty-state"><p>No invitees match your search.</p></div>`;
        }
    },

    renderInviteeRow(inv) {
        const visible = this.getVisibleFields();
        const cells = visible.map(field => {
            const extraClass = field === 'notes' ? ' class="notes-cell"' : '';
            if (field === 'status') {
                return `<td data-field="status" data-original="${this.escapeAttr(inv.status)}" title="${this.escapeAttr(this.formatStatus(inv.status))}" onclick="App.editCell(this)">
                    <span class="status-badge status-${inv.status}">${this.formatStatus(inv.status)}</span>
                </td>`;
            }
            return `<td data-field="${field}" data-original="${this.escapeAttr(inv[field])}" title="${this.escapeAttr(inv[field] || '')}" onclick="App.editCell(this)"${extraClass}>${this.cellDisplay(inv[field], field)}</td>`;
        }).join('');
        return `
            <tr data-id="${inv.id}">
                ${cells}
                <td>
                    <div class="row-actions">
                        <button class="btn-icon" title="Delete" onclick="App.showDeleteModal('${inv.id}', '${this.escapeAttr(inv.name)}')">
                            ${this.icons.trash}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    cellDisplay(value, field) {
        if (value && value.trim()) {
            return this.escapeHtml(value);
        }
        return `<span class="cell-placeholder">&mdash;</span>`;
    },

    renderPhantomRow() {
        const fields = this.getVisibleFields().map(field => {
            const val = this.pendingNewRow[field] || '';
            let display;
            if (val) {
                if (field === 'status') {
                    display = `<span class="status-badge status-${val}">${this.formatStatus(val)}</span>`;
                } else {
                    display = this.escapeHtml(val);
                }
            } else {
                const placeholder = field === 'status' ? '+ status' : `+ ${field}`;
                display = `<span class="phantom-placeholder">${placeholder}</span>`;
            }
            return `<td data-field="${field}" onclick="App.editCell(this)">${display}</td>`;
        }).join('');

        return `<tr class="phantom-row" data-phantom="true">${fields}<td></td></tr>`;
    },

    // ── Inline Cell Editing ─────────────────────────
    editCell(cell) {
        if (cell.querySelector('.inline-edit-input') || cell.querySelector('.status-picker')) return;

        const row = cell.closest('tr');
        const field = cell.dataset.field;
        if (!field) return;

        const isPhantom = row.dataset.phantom === 'true';
        const rowId = isPhantom ? 'phantom' : row.dataset.id;
        this.editingRowId = rowId;
        row.classList.add('editing');

        let original = '';
        if (isPhantom) {
            original = this.pendingNewRow[field] || '';
        } else {
            original = cell.dataset.original || '';
        }

        // Status field: custom badge picker
        if (field === 'status') {
            this.openStatusPicker(cell, row, original, isPhantom);
            return;
        }

        let inputEl;
        if (field === 'phone') {
            inputEl = document.createElement('input');
            inputEl.type = 'tel';
            inputEl.value = original;
            inputEl.className = 'inline-edit-input';
        } else if (field === 'email') {
            inputEl = document.createElement('input');
            inputEl.type = 'email';
            inputEl.value = original;
            inputEl.className = 'inline-edit-input';
        } else {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.value = original;
            inputEl.className = 'inline-edit-input';
        }
        inputEl.dataset.field = field;

        cell.textContent = '';
        cell.appendChild(inputEl);
        inputEl.focus();
        if (inputEl.select) inputEl.select();

        inputEl.addEventListener('keydown', (e) => this.handleCellKeydown(e, cell, row));

        inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                const activeEl = document.activeElement;
                if (row.contains(activeEl) && (activeEl.classList.contains('inline-edit-input') || activeEl.closest('.status-picker'))) return;
                if (cell.querySelector('.inline-edit-input')) {
                    if (isPhantom) {
                        const val = inputEl.value.trim();
                        if (val) this.pendingNewRow[field] = val;
                        this.restorePhantomCellDisplay(cell);
                        if (!row.querySelector('.inline-edit-input')) {
                            row.classList.remove('editing');
                            this.clearEditingFlag();
                        }
                    } else {
                        this.saveCell(cell, row);
                    }
                }
            }, 50);
        });
    },

    // ── Status Picker ───────────────────────────────
    openStatusPicker(cell, row, currentStatus, isPhantom) {
        const statuses = ['pending', 'invited', 'confirmed', 'declined'];
        const select = document.createElement('select');
        select.className = 'inline-edit-input status-select';

        statuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = this.formatStatus(s);
            if (s === currentStatus) opt.selected = true;
            select.appendChild(opt);
        });

        cell.textContent = '';
        cell.appendChild(select);
        select.focus();
        // Open the native dropdown immediately
        select.showPicker?.();

        const commit = () => {
            const val = select.value;
            if (isPhantom) {
                this.pendingNewRow['status'] = val;
                this.restorePhantomCellDisplay(cell);
            } else {
                cell.dataset.original = val;
                this.restoreCellDisplay(cell);
                const id = row.dataset.id;
                const item = this.invitees.find(i => i.id === id);
                if (item && item.status !== val) {
                    Data.updateInvitee(id, { status: val })
                        .then(() => this.showToast('Updated'))
                        .catch(err => this.showToast('Error saving', 'error'));
                }
            }
            if (!row.querySelector('.inline-edit-input') && !row.querySelector('.status-picker')) {
                row.classList.remove('editing');
                this.clearEditingFlag();
            }
        };

        select.addEventListener('change', commit);

        select.addEventListener('blur', () => {
            setTimeout(() => {
                if (cell.contains(select)) commit();
            }, 50);
        });

        select.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                commit();
                this.navigateCell(row, 'status', e.shiftKey ? -1 : 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                commit();
                if (isPhantom) {
                    this.commitNewRow(row);
                } else {
                    this.navigateNextRowSameColumn(row, 'status');
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (isPhantom) {
                    this.restorePhantomCellDisplay(cell);
                } else {
                    this.restoreCellDisplay(cell);
                }
                row.classList.remove('editing');
                this.clearEditingFlag();
            }
        });
    },

    handleCellKeydown(e, cell, row) {
        const field = cell.dataset.field;
        const isPhantom = row.dataset.phantom === 'true';

        if (e.key === 'Tab') {
            e.preventDefault();
            const direction = e.shiftKey ? -1 : 1;
            if (isPhantom) {
                const input = cell.querySelector('.inline-edit-input');
                const val = input ? input.value.trim() : '';
                if (val) this.pendingNewRow[field] = val;
                this.restorePhantomCellDisplay(cell);
            } else {
                this.saveCell(cell, row);
            }
            this.navigateCell(row, field, direction);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isPhantom) {
                const input = cell.querySelector('.inline-edit-input');
                const val = input ? input.value.trim() : '';
                if (val) this.pendingNewRow[field] = val;
                this.restorePhantomCellDisplay(cell);
                this.commitNewRow(row);
            } else {
                this.saveCell(cell, row);
                this.navigateNextRowSameColumn(row, field);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (isPhantom) {
                this.restorePhantomCellDisplay(cell);
            } else {
                this.restoreCellDisplay(cell);
            }
            row.classList.remove('editing');
            this.clearEditingFlag();
        }
    },

    saveCell(cell, row) {
        const input = cell.querySelector('.inline-edit-input');
        if (!input) return;

        const field = cell.dataset.field;
        const id = row.dataset.id;
        const item = this.invitees.find(i => i.id === id);
        if (!item) { this.restoreCellDisplay(cell); return; }

        const newValue = input.value.trim();
        const oldValue = item[field] || '';

        cell.dataset.original = newValue;
        this.restoreCellDisplay(cell);

        if (!row.querySelector('.inline-edit-input') && !row.querySelector('.status-picker')) {
            row.classList.remove('editing');
            this.clearEditingFlag();
        }

        if (newValue === oldValue) return;

        Data.updateInvitee(id, { [field]: newValue })
            .then(() => this.showToast('Updated'))
            .catch(err => {
                console.error('Error saving cell:', err);
                this.showToast('Error saving', 'error');
            });
    },

    restoreCellDisplay(cell) {
        const field = cell.dataset.field;
        const original = cell.dataset.original || '';
        if (field === 'status') {
            cell.innerHTML = `<span class="status-badge status-${original}">${this.formatStatus(original)}</span>`;
        } else if (original) {
            cell.textContent = original;
        } else {
            cell.innerHTML = `<span class="cell-placeholder">&mdash;</span>`;
        }
    },

    restorePhantomCellDisplay(cell) {
        const field = cell.dataset.field;
        const val = this.pendingNewRow[field] || '';
        if (val) {
            if (field === 'status') {
                cell.innerHTML = `<span class="status-badge status-${val}">${this.formatStatus(val)}</span>`;
            } else {
                cell.textContent = val;
            }
        } else {
            const placeholder = field === 'status' ? '+ status' : `+ ${field}`;
            cell.innerHTML = `<span class="phantom-placeholder">${placeholder}</span>`;
        }
    },

    clearEditingFlag() {
        this.editingRowId = null;
        if (this.renderPending) {
            this.renderPending = false;
            this.renderTable();
        }
    },

    navigateCell(row, currentField, direction) {
        const visible = this.getVisibleFields();
        const idx = visible.indexOf(currentField);
        const nextIdx = idx + direction;
        const isPhantom = row.dataset.phantom === 'true';

        if (nextIdx >= 0 && nextIdx < visible.length) {
            const nextCell = row.querySelector(`td[data-field="${visible[nextIdx]}"]`);
            if (nextCell) this.editCell(nextCell);
        } else if (direction > 0) {
            if (isPhantom) {
                this.commitNewRow(row);
                return;
            }
            const nextRow = row.nextElementSibling;
            if (nextRow && (nextRow.dataset.id || nextRow.dataset.phantom)) {
                const nextCell = nextRow.querySelector(`td[data-field="${visible[0]}"]`);
                if (nextCell) this.editCell(nextCell);
            }
        } else if (direction < 0) {
            const prevRow = row.previousElementSibling;
            if (prevRow && (prevRow.dataset.id || prevRow.dataset.phantom)) {
                const prevCell = prevRow.querySelector(`td[data-field="${visible[visible.length - 1]}"]`);
                if (prevCell) this.editCell(prevCell);
            }
        }
    },

    navigateNextRowSameColumn(row, field) {
        const nextRow = row.nextElementSibling;
        if (nextRow && (nextRow.dataset.id || nextRow.dataset.phantom)) {
            const nextCell = nextRow.querySelector(`td[data-field="${field}"]`);
            if (nextCell) this.editCell(nextCell);
        }
    },

    // ── Phantom Row Commit ──────────────────────────
    async commitNewRow(phantomRow) {
        const data = { ...this.pendingNewRow };

        const hasAnyData = FIELD_ORDER.some(f => data[f] && data[f].trim());
        if (!hasAnyData) {
            this.pendingNewRow = {};
            this.clearEditingFlag();
            this.renderTable();
            return;
        }

        // Fill missing fields
        FIELD_ORDER.forEach(f => {
            if (data[f] === undefined) data[f] = '';
        });
        data.status = data.status || 'pending';
        data.eventId = this.activeEventId;

        this.pendingNewRow = {};
        this.clearEditingFlag();

        try {
            await Data.addInvitee(data);
            this.showToast('Invitee added');
        } catch (error) {
            console.error('Error adding invitee:', error);
            this.showToast('Error adding invitee', 'error');
        }
    },

    // ── Event CRUD ──────────────────────────────────
    async addEvent() {
        const order = this.events.length;
        const ref = await Data.addEvent({ name: `Event ${order + 1}`, order });
        this.selectEvent(ref.id);
    },

    updateEventField(field, value) {
        if (!this.activeEventId) return;
        Data.updateEvent(this.activeEventId, { [field]: value });
        if (field === 'name') {
            const tab = document.querySelector('.tab.active');
            if (tab) tab.textContent = value || 'Untitled';
        }
    },

    showDeleteEventModal() {
        const event = this.events.find(e => e.id === this.activeEventId);
        if (!event) return;
        document.getElementById('delete-event-name').textContent = event.name || 'this event';
        document.getElementById('delete-event-modal').classList.add('active');
        document.getElementById('confirm-delete-event-btn').onclick = () => {
            Data.deleteEvent(this.activeEventId);
            this.activeEventId = null;
            this.closeDeleteEventModal();
        };
    },

    closeDeleteEventModal() {
        document.getElementById('delete-event-modal').classList.remove('active');
    },

    // ── Delete Invitee ──────────────────────────────
    showDeleteModal(id, name) {
        this.deleteTargetId = id;
        document.getElementById('delete-name').textContent = name || 'this invitee';
        document.getElementById('delete-modal').classList.add('active');
        document.getElementById('confirm-delete-btn').onclick = () => {
            Data.deleteInvitee(this.deleteTargetId)
                .then(() => this.showToast('Invitee removed'))
                .catch(() => this.showToast('Error deleting', 'error'));
            this.closeDeleteModal();
        };
    },

    closeDeleteModal() {
        document.getElementById('delete-modal').classList.remove('active');
        this.deleteTargetId = null;
    },

    // ── Search & Sort ───────────────────────────────
    handleSearch(query) {
        this.searchQuery = query;
        this.renderTable();
    },

    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        this.renderTable();
    },

    toggleBrief() {
        this.briefExpanded = !this.briefExpanded;
        const panel = document.getElementById('invite-brief');
        if (panel) panel.classList.toggle('collapsed', !this.briefExpanded);
    },

    toggleColumnsMenu() {
        const menu = document.getElementById('columns-menu');
        if (menu) menu.classList.toggle('active');
    },

    toggleColumn(field) {
        if (this.hiddenColumns[field]) {
            delete this.hiddenColumns[field];
        } else {
            this.hiddenColumns[field] = true;
        }
        this.renderTable();
    },

    getVisibleFields() {
        return FIELD_ORDER.filter(f => !this.hiddenColumns[f]);
    },

    // ── Empty Events State ──────────────────────────
    renderEmptyEvents() {
        document.getElementById('app').innerHTML = `
            <div class="empty-state" style="margin-top: 80px;">
                ${this.icons.fileText}
                <p>No events yet. Create your first event to get started.</p>
                <button class="btn btn-primary" onclick="App.addEvent()">
                    ${this.icons.plus} Create Event
                </button>
            </div>
        `;
    },

    // ── Toast Notifications ─────────────────────────
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icon = type === 'error'
            ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
            : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = icon + '<span>' + this.escapeHtml(message) + '</span>';
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 200);
        }, 2000);
    },

    // ── Helpers ─────────────────────────────────────
    formatStatus(status) {
        const labels = { pending: 'Pending', invited: 'Invited', confirmed: 'Confirmed', declined: 'Declined' };
        return labels[status] || status || 'Pending';
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    },

    escapeAttr(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

// ── Bootstrap ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());

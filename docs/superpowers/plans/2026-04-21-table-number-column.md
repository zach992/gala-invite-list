# Table Number Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `Table #` column to the guest list (numeric-feeling text input, mirrors `seats`) and surface `Invited By` + `Table #` on the printed Facebook directory card.

**Architecture:** Vanilla JS + Firestore. Column rendering is data-driven by three parallel structures in `js/app.js` — `FIELD_ORDER`, `HEADER_LABELS`, and the local `colWidths` map inside `renderInviteeList`. Adding a field to all three (plus the CSV export arrays) makes the column render, sort, toggle, and export automatically. The Facebook directory is printed HTML built in `App.printFacebook`.

**Tech Stack:** Vanilla JS, Firebase Firestore, no build step. Verification via `python3 -m http.server` + Playwright MCP (project does not use a unit-test framework).

---

## File Structure

**Modified:**
- `js/app.js` — column constants, colWidths, CSV export, Facebook card footer + CSS
- `js/data.js` — `addInvitee` default for new field
- `CLAUDE.md` — data model docs

No new files.

---

### Task 1: Add `tableNumber` default to `Data.addInvitee`

**Files:**
- Modify: `js/data.js:66-86`

- [ ] **Step 1: Insert `tableNumber` after `seats` in the addInvitee payload**

```js
// js/data.js — inside addInvitee, after the `seats` line
seats: invitee.seats || '',
tableNumber: invitee.tableNumber || '',
invitedBy: invitee.invitedBy || '',
```

`updateInvitee` already spreads arbitrary fields, so no change needed there.

---

### Task 2: Register `tableNumber` in column constants

**Files:**
- Modify: `js/app.js:2` (FIELD_ORDER)
- Modify: `js/app.js:4-7` (HEADER_LABELS)

- [ ] **Step 1: Insert `'tableNumber'` into `FIELD_ORDER` after `'seats'`**

```js
const FIELD_ORDER = ['name', 'title', 'organization', 'status', 'seats', 'tableNumber', 'invitedBy', 'phone', 'email', 'notes'];
```

- [ ] **Step 2: Add `tableNumber` to HEADER_LABELS**

```js
const HEADER_LABELS = {
    name: 'Name', title: 'Title', organization: 'Organization',
    status: 'Status', seats: 'Seats', tableNumber: 'Table #', invitedBy: 'Invited By', phone: 'Phone', email: 'Email', notes: 'Notes'
};
```

---

### Task 3: Add `tableNumber` width to `colWidths`

**Files:**
- Modify: `js/app.js:462`

- [ ] **Step 1: Insert width entry after `seats`**

```js
const colWidths = { name: 14, title: 12, organization: 14, status: 8, seats: 4, tableNumber: 5, invitedBy: 11, phone: 9, email: 12, notes: 16 };
```

Width 5 (one more than `seats: 4`) because the header text "Table #" is slightly longer.

---

### Task 4: Include `tableNumber` in CSV export

**Files:**
- Modify: `js/app.js:1362-1363`

- [ ] **Step 1: Update `headers` and `fields` arrays in `App.exportCSV`**

```js
const headers = ['Name', 'Title', 'Organization', 'Status', 'Seats', 'Table #', 'Invited By', 'Phone', 'Email', 'Notes'];
const fields = ['name', 'title', 'organization', 'status', 'seats', 'tableNumber', 'invitedBy', 'phone', 'email', 'notes'];
```

---

### Task 5: Add footer line + CSS to Facebook directory cards

**Files:**
- Modify: `js/app.js` — `App.printFacebook` method (~lines 1160-1351)

- [ ] **Step 1: Add a `.fb-footer` style block inside the `<style>` section**

Insert after the existing `.fb-bio` rule:

```css
.fb-footer {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid #e7e5e4;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #78716c;
    font-weight: 500;
}
```

- [ ] **Step 2: Build a `footerHtml` string per card using joined populated pieces**

Inside the IIFE at `pairCards.map(inv => ...)` (~line 1335), before the returned `<div class="fb-card">...`, build:

```js
const footerParts = [];
if (inv.invitedBy && inv.invitedBy.trim()) {
    footerParts.push('Invited by ' + this.escapeHtml(inv.invitedBy.trim()));
}
if (inv.tableNumber && String(inv.tableNumber).trim()) {
    footerParts.push('Table ' + this.escapeHtml(String(inv.tableNumber).trim()));
}
const footerHtml = footerParts.length
    ? '<div class="fb-footer">' + footerParts.join(' · ') + '</div>'
    : '';
```

- [ ] **Step 3: Inject `footerHtml` after the bio in the card template**

Replace the card's details block so it ends with `+ (inv.bio ? ... : '') + footerHtml + '</div></div>'`.

---

### Task 6: Update data-model docs in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — "Invitees" line under Data Model

- [ ] **Step 1: Add `tableNumber` to the field list**

```md
**Invitees:** eventId, name, title, organization, status (pending/invited/confirmed/declined), seats, tableNumber, invitedBy, phone, email, notes
```

---

### Task 7: Verify with Playwright

- [ ] **Step 1: Serve locally**

```bash
cd "/Users/zachlarmer/Desktop/Claude Projects/Gala Invite List" && python3 -m http.server 8765
```

- [ ] **Step 2: Screenshot guest list with new column visible**

Navigate to `http://localhost:8765`, log in as YMU Team, open an event, confirm the `Table #` column appears between `Seats` and `Invited By`. Save screenshot.

- [ ] **Step 3: Enter a table number via inline edit, confirm it persists**

- [ ] **Step 4: Trigger the Facebook print view, screenshot a card**

Click the Facebook button. In the opened tab, confirm a card's footer reads like `Invited by <name> · Table <n>`.

---

### Task 8: Commit and push live

- [ ] **Step 1: Stage and commit**

```bash
git add js/app.js js/data.js CLAUDE.md docs/superpowers/plans/2026-04-21-table-number-column.md
git commit -m "Add Table Number column and surface invited-by + table on Facebook"
```

- [ ] **Step 2: Push to main (GitHub Pages auto-deploys)**

```bash
git push origin main
```

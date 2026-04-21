# Gala Invite List
Event invite tracker for managing lobbyist outreach to elected officials across multiple galas and fundraisers.

## Tech Stack
Vanilla JS, HTML, CSS — Firebase Firestore (real-time sync), no build step

## Architecture
- `index.html` — Single-page app shell
- `js/config.js` — Firebase project credentials
- `js/data.js` — Firestore CRUD (events + invitees collections)
- `js/app.js` — All UI logic: tabs, inline editing, stats, column toggle
- `css/styles.css` — Full styling (dark warm theme, CSS custom properties)

## Data Model
**Events:** name, date, location, address, hostedBy, dressCode, rsvpDeadline, eventUrl, draftEmail, notes, order
**Invitees:** eventId, name, title, organization, status (pending/invited/confirmed/declined), seats, tableNumber, invitedBy, interviewPriority (high/low/na), phone, email, notes

## Key Patterns
- Firestore REST API (`https://firestore.googleapis.com/v1/projects/gala-invite-list-2026/...`) can be used to batch-read/write data from CLI
- Event fields update via `App.updateEventField(field, value)` — saves to Firestore on change
- Invitee inline editing: click cell → input → blur/Tab/Enter saves
- Column visibility is session-only (resets on refresh), controlled by `App.hiddenColumns`
- Default sort: status (ascending)

## Deployment
- GitHub Pages auto-deploys from `main` branch
- Live URL: https://zach992.github.io/gala-invite-list/

## Conventions
- Validate elected official names/titles against official government sources before adding
- Include `invitedBy` for every invitee to track which lobbyist owns the relationship
- Notes should only contain non-obvious context — don't duplicate what's in other columns
- After making visual/UI changes, use Playwright MCP to navigate to the live site and take a screenshot to verify the result

# Table Number column + enriched Facebook directory

## Goal
Add a `Table #` column to the guest list (numeric entry, same UX as `Seats`) and surface each guest's **Invited By** and **Table #** on the printed Facebook directory.

## Data model
Add one field to the invitee document:

- `tableNumber` — string, default `''`. Stored as-is (mirrors the `seats` convention in `js/data.js` — empty string when blank; no type coercion at write time).

Persisted via `Data.addInvitee` and `Data.updateInvitee` in `js/data.js`. No migration required — missing field reads as `undefined` and renders as empty.

## Guest list column

- `FIELD_ORDER` in `js/app.js`: insert `'tableNumber'` immediately after `'seats'`.
- `HEADER_LABELS.tableNumber = 'Table #'`.
- `colWidths.tableNumber = 4` (same width as `seats`).
- CSV export in `App.exportCSV`: add `'Table #'` to the `headers` array and `'tableNumber'` to the `fields` array, in the same slot.
- Inline editing: reuse the existing numeric cell pattern used for `seats` — click → input → blur/Tab/Enter saves. Accepts the same freeform input as `seats` (no strict integer validation, matching current behavior).
- Column visibility: automatic via `FIELD_ORDER` — no extra wiring.

## Facebook directory card

In `App.printFacebook`, append a subtle footer line under the bio on each card. Build it by joining only the populated pieces with ` · `:

- both present → `Invited by <name> · Table <n>`
- only `invitedBy` → `Invited by <name>`
- only `tableNumber` → `Table <n>`
- neither → omit the element entirely (no empty `<div>`)

New CSS class `.fb-footer` in the print stylesheet, styled small and muted (similar to `.fb-org`) so it reads as metadata, not body text.

Existing filter is unchanged: only `invited` or `confirmed` guests, respecting `excludeFromFacebook`.

## Out of scope
- No table-based grouping or sorting on the Facebook view (cards stay alphabetical).
- No per-table seat summary or stat.
- No strict integer validation on the `Table #` input (matches `seats`).

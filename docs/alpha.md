# Alpha Milestone

Scope for this milestone. See `architecture.md` for design, `api-contract.md` for wire shapes, `plan-backend.md`/`plan-frontend.md` for build order.

## Goal

A shared `Todo` document that multiple users can edit at the same time, with live sync, presence, and visible (not silent) conflict handling.

## In scope

- Identity: display name only, no auth.
- Documents: create, list, open, delete. Todo template only.
- Items: add, edit text, toggle done, delete, reorder.
- Live sync of item changes across everyone viewing the same document.
- Presence: see who else is viewing a document.
- Conflict handling: a stale edit is rejected and the client resyncs to the real state.

## Out of scope

Real auth, any template besides `Todo`, subtasks, dependencies, due dates, recurring tasks, activity feed, notifications, comments, search, import/export, RBAC. Beta/final concerns — do not build ahead of them.

## Definition of done

- Two browser sessions can open the same document and see each other's edits without refreshing.
- Forcing a stale `baseRevision` produces a visible rejection, not a silent overwrite or a crash.
- Presence list updates when a tab opens or closes the document.
- No code exists yet for anything in "Out of scope."

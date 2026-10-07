# Alpha Milestone

Scope for this milestone. See `architecture.md` for design, `api-contract.md` for wire shapes, `plan-backend.md`/`plan-frontend.md` for build order.

## Goal

A shared `Todo` asset, inside a workspace, that multiple users can edit at the same time, with live sync, presence, and visible (not silent) conflict handling.

## In scope

- Identity: display name only, no auth.
- Workspaces: create, list the current user's own, add a member (no approval step, no roles).
- Assets: create, list within a workspace, open, delete. Todo template only.
- Items: add, edit text, toggle done, delete, reorder.
- Live sync of item changes across everyone viewing the same asset.
- Presence: see who else is viewing an asset.
- Conflict handling: a stale edit is rejected and the client resyncs to the real state.

## Out of scope

Real auth, RBAC (role-based permissions on a workspace/asset — membership is flat, not role-based), unique join codes (members are added directly by id, not by code), any template besides `Todo`, subtasks, dependencies, due dates, recurring tasks, activity feed, notifications, comments, search, import/export. Beta/final concerns — do not build ahead of them.

## Definition of done

- A user can create a workspace, add a second user to it, and that second user sees the workspace appear in their own list.
- Two browser sessions can open the same asset and see each other's edits without refreshing.
- Forcing a stale `baseRevision` produces a visible rejection, not a silent overwrite or a crash.
- Presence list updates when a tab opens or closes the asset.
- No code exists yet for anything in "Out of scope."

# Alpha Milestone

Scope for this milestone. See `architecture.md` for design, `api-contract.md` for wire shapes, `plan-backend.md`/`plan-frontend.md` for build order.

## Goal

A workspace whose `Todo` assets multiple users can create and edit at the same time, with live sync, presence, and concurrent edits that merge instead of overwriting each other.

## In scope

- Identity: display name only, no auth.
- Workspaces: create, list the current user's own, add a member (no approval step, no roles).
- Assets: create (optionally pre-filled from a server-defined preset) and delete, live through the hub; opening a workspace loads all its assets at once. Todo template only. The API already carries an optional `templateType` (defaulting to `Todo`) so later templates don't need a contract change, but `Todo` is the only value accepted.
- Items: add, edit text, toggle done, delete, reorder.
- Live sync of asset and item changes across everyone viewing the same workspace.
- Presence: see who else is viewing a workspace.
- Concurrent edits merge: additions and edits to different items all survive; edits to the same field of the same item are last-write-wins.

## Out of scope

Canvas layout (moving and resizing assets; the columns exist, the operations are beta), real auth, RBAC (role-based permissions on a workspace/asset — membership is flat, not role-based), unique join codes (members are added directly by id, not by code), any template besides `Todo` (the `templateType` field exists, its other values don't), subtasks, dependencies, due dates, recurring tasks, activity feed, notifications, comments, search, import/export. Beta/final concerns — do not build ahead of them.

## Definition of done

- A user can create a workspace, add a second user to it, and that second user sees the workspace appear in their own list.
- Two browser sessions can open the same workspace and see each other's asset and item changes without refreshing.
- Two sessions adding items to the same asset at the same moment both end up with both items, and editing different items at once keeps both edits.
- Presence list updates when a tab opens or closes the workspace.
- No code exists yet for anything in "Out of scope."

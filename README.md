# ManageD

## Team Members

- Daugirdas Pelanis (TL):
- Gabrielė Každailytė: `gabriele-kazdailyte`
- Armantas Stanevičius: `Quuacks`
- Joris Unikas: `jorisunikas`
- Edgaras

## Overview

A real-time, collaborative task management application - a shared sheet where a team can edit tasks together, live, the same way people co-edit a Google Doc. It is a manager's dream: especially suitable for task allocation, planning and observing progress.

## Why ManageD?

A **sheet** (board) contains **tasks**. Multiple users can open and edit the same sheet simultaneously - moving tasks, editing fields, adding subtasks - and observing each other's changes propagate live. Every change is tracked, and the system runs its own background logic for recurring work and due dates rather than relying on someone to check in manually.

## End User Description

Project manager Marius is looking for a simple way to create a task allocation plan that multiple people can edit simultaneously. He wants more interactivity than Google Docs offers—specifically, the ability to add to-do lists, flowcharts, etc. During the project, he wants the team to clearly see what has and has not been completed, as well as which tasks are running behind schedule or progressing faster than expected. These inquiries lead him to discover ManageD. With ManageD, project execution runs smoother than ever thanks to the clear visualization of the plan.

## Features

### Alpha Version
The core skeleton: a working shared sheet with real people editing it concurrently.

- **Analytics dashboard**: completion rates, burndown-style charts, team workload distribution. Templates for common sheet types (To Do list, project tracker, etc.).
- **Live conflict resolution**: concurrent edits to the same task are versioned and reconciled (last-write-wins with conflict tracking).
- **Subtasks & dependencies**: tasks can be broken into subtasks, and one task can depend on another being completed first.
- **Custom views**: filter, sort, and group tasks by assignee, tag, priority, or due date.

### Beta Version
Building on the stable core: presence, automation, and history.

- **Presence indicators**: see who else is currently viewing or editing the sheet, and where.
- **Recurring tasks**: tasks that regenerate on a schedule (weekly, custom), handled by a background service.
- **Automatic status transitions**: tasks flip states (e.g. to overdue) automatically based on due dates, without manual intervention.
- **Activity feed / audit log**: a full, immutable history of every change: who did what, when, and what changed.

### Final Version
Tying the system together and extending it beyond the app itself.

- **Notifications**: a background service that watches for due dates and mentions, and delivers in-app or email alerts.
- **Import / export**: bring data in or take it out via CSV, Excel, or JSON.

## Getting Started

**Requirements:** .NET 10, Node 24

Backend and frontent must be run simultaneously in separate terminals.

### Setup

```bash
cd backend
dotnet restore ManageD.slnx

cd frontend
npm install
```

### Running

**Backend:**

```bash
cd backend
dotnet run --project src/ManageD.Api
```

**Frontend:**

```bash
cd frontend
npm run dev
```

Frontend runs on `localhost:5173`. The proxy in `frontend/vite.config.ts`

forwards `/api/*` requests to the .NET backend on `localhost:5001`.


## Coding Standards

Standards are based on the official Microsoft C# coding conventions (https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style/coding-conventions):

- **Naming**: `PascalCase` for classes, methods, properties, and public members; `camelCase` for local variables and private fields (prefixed with `_`, e.g. `_taskRepository`).
- **Braces**: Allman style (opening brace on its own line).
- **`var`**: use when the type is obvious from the right-hand side; otherwise use an explicit type.
- **Nullable reference types**: enabled project-wide - avoid `!` suppression unless justified with a comment.
- **Async**: all I/O-bound methods are `async` and suffixed with `Async` (e.g. `GetTaskByIdAsync`).
- **One class per file**, file name matches the class name.
- **Avoid hardcoded values**: use named constants or enums instead of hardcoded strings/numbers.
- **Comments**: explain *why*, not *what*, the code should be self-explanatory for the *what.*


## Branch Naming

- `name/purpose`: the author and the purpose of the branch is clearly stated.

## Continuous Integration

Every pull request targeting `main` runs the **Backend Format Check** GitHub Action (`.github/workflows/backend-format-check.yaml`), which verifies the
backend code is formatted according to `backend/.editorconfig`. PRs with unformatted code will fail this check and cannot be merged.

**Before pushing**, format your code locally:

```bash
cd backend
dotnet format ManageD.slnx
```

To check formatting without modifying files (same check CI runs):

```bash
cd backend
dotnet format ManageD.slnx --verify-no-changes
```


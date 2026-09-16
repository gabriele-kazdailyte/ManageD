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
dotnet restore

cd frontend
npm install
```

### Running

**Backend:**

```bash
cd backend
dotnet run
```

**Frontend:**

```bash
cd frontend
npm run dev
```

Frontend runs on `localhost:5173`. The proxy in `frontend/vite.config.ts`
forwards `/api/*` requests to the .NET backend on `localhost:5001`.

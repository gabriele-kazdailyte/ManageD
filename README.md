# ManageD

## Team Members

- Daugirdas Pelanis (TL): `VidilistGames`
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
The working skeleton: real profiles, shared workspaces, and persisted to-do lists on a canvas.

**Identity & workspaces**
- **Profiles (no auth yet)**: create a profile from a display name and the identity is remembered on the device. Share your user ID with the sidebar's *Copy my ID* so teammates can add you. *(Replaced in Beta by accounts with a password, see below.)*
- **Workspaces**: create a workspace, see the ones you belong to, open one as a canvas, and delete it (with a confirmation dialog).
- **Members**: view a workspace's members and add people by their user ID. *(Changed in Beta to adding by username, see below.)*

**Canvas & to-do lists**
- **Drag-to-create**: drag a *Todo* block from the toolbar onto a workspace canvas to create a to-do list.
- **Starter templates**: create a list pre-filled from a server-defined template (loaded from a bundled file).
- **Delete**: remove a list through an accessible confirmation dialog.

**Persistence**
- Users, workspaces, members, and to-do lists (with their items) are stored in SQLite via EF Core, so everything survives a backend restart.

**Not in the alpha yet** (planned for Beta): live multi-user editing and presence via the SignalR hub, editing list items (add / check off / reorder), and conflict resolution. For now, a list's items are seeded at creation and shown read-only.

### Beta Version
Building on the stable core: presence, automation, and history.

- **Accounts** *(done)*: create an account with a username, display name and password, log in from any browser, and log out. Usernames are unique regardless of capitals; passwords are stored only as salted hashes, and login and sign-up are rate limited. The profile button at the bottom of the sidebar shows your display name, `@username` and user ID (with a *Copy ID* button), and has *Log out*.
- **Add members by username** *(done)*: in a workspace's *Members* panel, type a teammate's username to add them; capitals don't matter. No more copying user IDs around.
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
### Database

The backend uses SQLite through EF Core. The database file (`manageD.db`) is created locally and is not committed, so every team member sets up their own.

**First-time setup** (once per machine):

```bash
dotnet tool install --global dotnet-ef
cd backend/src/ManageD.Api
dotnet ef database update
```

This creates `manageD.db` and applies every migration in `Migrations/`. Run `dotnet ef database update` again after pulling any change that adds a migration.

**Changing the data model** (add or edit an entity or property):

```bash
cd backend/src/ManageD.Api
dotnet ef migrations add DescribeTheChange
dotnet ef database update
```

Commit the generated files in `Migrations/` together with the code change. Never edit a migration that is already merged to `main`; add a new one instead.

**Accounts from before login existed** keep a placeholder username and no password after the `AddUserLogin` migration, so they can't log in. Create a new account, or delete the database files (below) to start clean.

**If `database update` fails** with a "table already exists" error, your local database is out of sync with the migration history. Delete `manageD.db`, `manageD.db-shm` and `manageD.db-wal` from `backend/src/ManageD.Api/`, then run `dotnet ef database update` again. Deleting is fine during development because the database holds no real data.

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
forwards `/api/*` requests to the .NET backend on `http://localhost:5093`,
as configured by the backend's HTTP launch profile.

### Tests and Coverage Report

Run from the repository root. Each command works unchanged in PowerShell, cmd and bash.

1. Restore the report tool, once per machine:

   ```bash
   dotnet tool restore
   ```

2. Run the backend tests with coverage:

   ```bash
   dotnet test backend/ManageD.slnx /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:CoverletOutput=../../../coverage/backend/
   ```

3. Run the frontend tests with coverage. Run `npm install` in `frontend/` first if you haven't.

   ```bash
   npm --prefix frontend run test:coverage
   ```

4. Merge both into one report:

   ```bash
   dotnet reportgenerator "-reports:coverage/backend/coverage.cobertura.xml;frontend/coverage/cobertura-coverage.xml" "-targetdir:coverage/report" "-classfilters:-*Migrations*;-Microsoft.AspNetCore.OpenApi.Generated*;-System.Runtime.CompilerServices*" "-reporttypes:Html;TextSummary"
   ```

Open `coverage/report/index.html` in a browser. `coverage/report/Summary.txt` has the same numbers as text.

- **Excluded:** migrations, generated OpenAPI code, compiler-generated classes, and frontend test files.
- **One side only:** if you skip step 2 or 3, the report contains just the other side.
- The `coverage/` folders are ignored by git.


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

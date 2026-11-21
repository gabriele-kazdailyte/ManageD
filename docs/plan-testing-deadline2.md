# Plan — Testing for Deadline 2

Deadline 2 (Lab Assignment #2) is due **2026-11-25 20:00 (Vilnius time)**. Requirements are in the course repo: `teaching-university-psi-2026/Lecture09/checklist/checklist.qmd`. This plan covers requirement 7 (tests and coverage) in detail, and lists what the other requirements still need.

Measured on 2026-11-21 on `feat/board-layout-frontend`, which is the top of the stack #62 → #63 → #64.

## State of affairs

### Requirement 7 — unit and integration tests, coverage of at least 50%

| | Backend (C#) | Frontend (TypeScript) |
|---|---|---|
| Tests | 105 (xUnit) | 39 (Vitest, added in #62–#64) |
| Unit tests | Yes: `DeltaApplier`, `Result`, `PresenceService`, `AssetLocks`, `PresetCatalog`, `AssetService` (with a fake store) | Yes: board model, camera math, viewport, two render tests |
| Integration tests | Yes: `UsersApiTests` and `HubIntegrationTests` go through `WebApplicationFactory` against a real SQLite database (`ManageDFactory`, `SqliteTestDb`) | None |
| Line coverage | **90%** (coverlet). Migrations and generated OpenAPI code are excluded in the `.csproj`. | **16%** (171 of 1057 lines) |
| Coverage report to show | Only a summary table in the CI log. No HTML report. | None. `@vitest/coverage-v8` isn't installed. |
| Runs in CI | `backend-tests.yaml`, on PRs to `main` only | **Not in CI at all** |

**Backend gaps** (files under 100%):

| File | Lines covered | Missing |
|---|---|---|
| `Services/WorkspaceService.cs` | 46% | Adding members, listing, the error paths |
| `Controllers/WorkspacesController.cs` | 59% | The same endpoints over HTTP |
| `Common/InvalidRequestException.cs`, `UnknownPresetException.cs` | 0% | Hub validation: empty or too-long title, a note created from a preset, an unknown preset name |
| `Hubs/WorkspaceHub.cs` | 85% | The validation paths above |

**Frontend gaps:**
- `context/` is at 3%. `workspaceReducer.ts` (every live update from the server) is at **0%**.
- `todoDeltas.ts` is at 4%, and `utils/deadlineStatus.ts` and `api/` are at 0%.
- Pages and the card components have almost nothing.

**Verdict:** the backend passes the 50% minimum comfortably and has both unit and integration tests. To be safe for the review, the team still needs:
- an HTML coverage report to show,
- tests for the obvious backend gaps, which the examiner may ask about ("which important code is still not covered?").

The frontend is tested only where tests protect real behaviour, and there's no coverage target for it. Requirement 7's 50% is about the C# code, which is at 90%. The frontend tests cover two things:
- the sync logic, where a bug silently corrupts what everyone sees;
- the card interactions people use all the time.

Rendering checks added only to raise the number (`CalendarView`, `Toolbar`, pages) are left out on purpose. That brings frontend coverage from 16% to about 32%, and the remaining gaps are explained in task T7.

### The other requirements, briefly

| # | Requirement | State | Action |
|---|---|---|---|
| 1 | Relational DB and EF | ✅ SQLite, `AddDbContext`, connection string from config, migrations committed | ⚠️ To-do presets come from `Data/todo-presets.json`, not the database. Be ready to explain that they're fixed seed data, not user data, or move them into the database with `HasData`. |
| 2 | Generic type and method | ✅ `Result<T>` with `Map<TOut>`, used as `Result<User>`, `Result<UserSummary>`, `Result<WorkspaceSummary>`, `Result<MemberSummary>` | None |
| 3 | Custom exception | ✅ `DomainException` subclasses, `DomainExceptionHubFilter` turns them into hub errors, `ConcurrencyConflictException` triggers a retry | Test the two exceptions at 0% coverage (task T3) |
| 4 | async/await | ✅ No `.Result`, `.Wait()` or `async void`. The `.ToList()` calls run on data already in memory, not on database queries. | None |
| 5 | Shared memory | ✅ `PresenceService` (a `ConcurrentDictionary` plus a per-workspace `SemaphoreSlim`) and `AssetLocks` | None |
| 6 | Dependency injection | ✅ Everything registered in `Program.cs`, no `new` for services | None |
| 8 | PRs and reviews since Deadline 1 (each person: 3 merged PRs authored, 3 PRs reviewed) | See the next table | Merge the stack, and add reviews |
| 9 | Uniform style | ✅ Backend: `.editorconfig` plus `dotnet format` in CI. ⚠️ Frontend: ESLint only, no formatter. | Optional: Prettier (task T8) |

**PRs since Deadline 1 (2026-10-21).** GitHub logins, counted on 2026-11-21. Reviews of teammates' PRs.

| Login | Merged PRs authored | Different PRs reviewed | Status |
|---|---|---|---|
| gabriele-kazdailyte | 11 | 4 | ✅ |
| VidilistGames | 3 | 6 | ✅ |
| Quuacks | **2** | 4 | ❌ Needs 1 more merged PR |
| jorisunikas | 3, plus #62–#64 open | 5 | ✅ |

Before the deadline: #62, #63 and #64 each need a review before they merge.

## Tasks

Rules for every task:
- Each task is one PR to `main`, and each PR has a description.
- No Claude or AI attribution in commits or PR descriptions.
- `dotnet test`, `npm run lint`, `npm run build` and `npm test` all pass before each commit.
- Tests must assert results, not just run code.

| # | Task | Size |
|---|---|---|
| T1 | Coverage report tooling | S |
| T2 | Workspace endpoint tests (integration) | S |
| T3 | Hub validation tests (custom exceptions) | S |
| T4 | Frontend coverage and CI | S |
| T5 | Frontend unit tests for state and sync | M |
| T6 | Frontend card interaction tests | S |
| T7 | Review prep: one unit and one integration test per person | S |
| T8 | Frontend formatter (optional) | S |

### T1. [ ] Coverage report tooling
- **Files:** `.config/dotnet-tools.json`, `.gitignore`, `.github/workflows/backend-tests.yaml`, `README.md`
- **Steps:**
  1. `dotnet new tool-manifest`, then `dotnet tool install dotnet-reportgenerator-globaltool`.
  2. Three single-line commands that work unchanged in PowerShell, cmd and bash (no script, since the team uses Windows): `dotnet tool restore`, then `dotnet test backend/ManageD.slnx /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:CoverletOutput=../../../coverage/backend/`, then `dotnet reportgenerator` to build an HTML report in `coverage/report/`.
     - `-classfilters:-*Migrations*;-Microsoft.AspNetCore.OpenApi.Generated*;-System.Runtime.CompilerServices*`
     - `-reporttypes:Html;MarkdownSummaryGithub`
     - `-reports:"coverage/backend/coverage.cobertura.xml;frontend/coverage/cobertura-coverage.xml"`, quoted. ReportGenerator only warns when the frontend file is missing (from T4).
  3. Ignore `coverage/` and `frontend/coverage/` in `.gitignore`.
  4. In CI, add the markdown summary to `$GITHUB_STEP_SUMMARY` and upload the HTML report as an artifact.
  5. In the README, add a "Tests and coverage" section with the three commands.
- **Acceptance:** the commands produce `coverage/report/index.html`, showing about 90% line coverage with no `Migrations` classes in it, and the CI run shows the coverage summary.

### T2. [ ] Workspace endpoint tests (integration)
- **Files:** new `backend/tests/ManageD.Api.Tests/WorkspacesApiTests.cs`. Reuse `ManageDFactory` and follow the style of `UsersApiTests.cs`.
- **Cover:**
  - Create a workspace, then list the current user's workspaces.
  - Add a member: success, unknown user, unknown workspace, and an already-a-member case if the service has one.
  - The status codes and problem bodies for each error.
- **Acceptance:** `WorkspaceService` and `WorkspacesController` reach at least 85% line coverage, and every test asserts the status code plus the body or the database state.

### T3. [ ] Hub validation tests (custom exceptions)
- **Files:** `backend/tests/ManageD.Api.Tests/HubIntegrationTests.cs`
- **Cover:** `CreateAsset` with an empty title, a title over 200 characters, a note created from a preset, and an unknown preset name. `CreateAssetAt` with a valid position. Each error must reach the client as a `HubException` with the domain message, proving `DomainExceptionHubFilter` handles it.
- **Acceptance:** `InvalidRequestException` and `UnknownPresetException` are covered, and `WorkspaceHub` reaches at least 95%.

### T4. [ ] Frontend coverage and CI
- **Files:** `frontend/package.json`, `frontend/vite.config.ts`, new `.github/workflows/frontend-checks.yaml`
- **Steps:**
  1. `npm i -D @vitest/coverage-v8`, matching the installed Vitest version.
  2. Add the script `"test:coverage": "vitest run --coverage"`.
  3. In `vite.config.ts`, under `test.coverage`: `provider: 'v8'`, `include: ['src/**']`, `exclude: ['src/**/*.test.*', 'src/main.tsx']`, and `reporter: ['text', 'html', 'cobertura', 'json-summary']`.
  4. The CI workflow runs on PRs to `main`: `npm ci`, `npm run lint`, `npm run build`, `npm run test:coverage`. It writes the summary to the step summary.
- **Acceptance:** `npm run test:coverage` prints the table and writes `frontend/coverage/`, and CI runs on a PR.

### T5. [ ] Frontend unit tests for state and sync
- **Files:** new `*.test.ts` files next to their sources
- **Cover:**
  - `context/workspaceReducer.ts`:
    - each event;
    - events are idempotent (applying the same one twice changes nothing);
    - events that arrive during a join are buffered and applied after `STATE_LOADED`;
    - `LOCAL_EDIT` is never buffered;
    - `SYNC_FAILED` clears the buffer.
  - `context/applyDelta.ts`: every field, plus adding, updating and deleting items.
  - `context/todoDeltas.ts`: every exported builder.
  - `utils/deadlineStatus.ts`: each status, with a fixed date, never the real clock.
  - `components/board/useBoardCamera.ts`: Ctrl+wheel zoom and the keyboard shortcuts, with `renderHook` inside a `ReactFlowProvider`.
- **Acceptance:** each test checks a result (the new state or the delta), not just that code ran. Wrong behaviour in any of these files makes a test fail.

### T6. [ ] Frontend card interaction tests
- **Files:** new `*.test.tsx` files. Use Testing Library and `@testing-library/user-event` (add it if it's missing).
- **Cover:**
  - `TodoAsset` and `TodoItemRow`: add, toggle, edit and delete an item. Check the exact `onUpdate` delta, since that's what goes to the server.
  - `StickyNoteAsset`: switching between Edit and Preview, and saving once after a 500 ms pause rather than on every keystroke (use fake timers).
- **Not covered, on purpose:** `Toolbar`, `CalendarView` and the pages. Testing them would mostly check that markup renders.
- **Acceptance:** a wrong delta, or a save on every keystroke, makes a test fail.

### T7. [ ] Review prep: one unit and one integration test per person
- Each member picks one unit test and one integration test they wrote, and can explain:
  - unit vs integration test;
  - stub vs mock vs fake. `FlakyStore` in `AssetServiceTests.cs` is a fake, which is a good example.
  - how the integration tests get their own database (`ManageDFactory` and `SqliteTestDb`);
  - what the coverage report excludes, and why;
  - why frontend coverage is about 32% and not higher. The answer: the sync logic and the card interactions are tested, while pages and pure rendering aren't, because tests there would check markup rather than behaviour. The 50% requirement is met by the C# code at about 90%.
- Everyone runs the coverage commands from the README on their own machine once before the review.

### T8. [ ] Frontend formatter (optional, for requirement 9)
- Add Prettier with a config close to the current style. Run it once in its own PR, add `npm run format:check` to the frontend CI, and add the ESLint–Prettier compatibility config.
- **Merge it after the board PRs (#62–#64) and T4–T6**, so the one-time reformat doesn't cause merge conflicts in everyone's open PRs.

## Order

```
Now:        merge #62 → #63 → #64, each after a teammate's review
In parallel: T1, T2, T3 (backend), T4 → T5, T6 (frontend)
Last:       T8 (optional), then T7 (everyone runs the report)
```

Coverage is already safe for the backend. T2, T3, T5 and T6 test behaviour that matters, and they also give every member their own tests to explain. None of them exist only to raise a number.

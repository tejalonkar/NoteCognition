# NoteCognition — Unified Development Roadmap

> **Last Updated**: 2026-04-26 | **Total Effort**: ~8–10 days across 6 milestones, 26 tasks

---

## Critical Bugs Found (Fix First)

| # | Bug | File | Impact |
|---|-----|------|--------|
| B1 | No WebSocket Stage in CloudFormation | `template.yaml` | WSS connections fail 403 |
| B2 | DynamoDB TTL not enabled | `template.yaml` | Stale connections never expire |
| B3 | No CORS preflight handler | `sync/index.mjs` | All browser fetch calls fail |
| B4 | PUT /file doesn't set ownerId or GSI1 | `sync/index.mjs` | Stream processor can't route updates |
| B5 | Frontend pushes PUT without POST first | `SyncService.ts` | Creates sparse DynamoDB items |
| B6 | $disconnect can't access query params | `websocket/index.mjs` | Connection records orphaned |
| B7 | GoneException not cleaned up | `stream-processor/index.mjs` | Stale records pile up |
| B8 | JWT token never refreshes | `SyncService.ts` | Sync breaks after 1 hour |
| B9 | No WebSocket auth verification | `websocket/index.mjs` | Anyone can connect as any user |

**Key finding**: App.tsx has ZERO references to AuthService, SyncService, or AuthModal. Everything sync-related is coded but completely disconnected.

---

## Milestone 1 — Infrastructure Fixes (~1 hour)

### TASK 1.1 — Add WebSocket Stage + TTL to CloudFormation
**Fixes**: B1, B2 | **File**: `cloudformation/template.yaml`

Add after `NoteCognitionWebSocketApi`:
```yaml
WebSocketStage:
  Type: AWS::ApiGatewayV2::Stage
  Properties:
    ApiId: !Ref NoteCognitionWebSocketApi
    StageName: !Ref Environment
    AutoDeploy: true
```

Add inside `NoteCognitionTable.Properties`:
```yaml
TimeToLiveSpecification:
  AttributeName: ttl
  Enabled: true
```

**Done when**: Deploy succeeds. WSS URL accepts connections. DynamoDB shows TTL enabled.

---

### TASK 1.2 — Auto-Generate .env After Deploy
**Files**: `deploy.ps1`, `.env.example`

After successful deploy in `deploy.ps1`, fetch stack outputs and write `.env`:
```powershell
$outputs = aws cloudformation describe-stacks --stack-name notecognition-stack-dev --query "Stacks[0].Outputs" --output json --region $region | ConvertFrom-Json
$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue
$poolId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$clientId = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue
$wsUrl = ($outputs | Where-Object { $_.OutputKey -eq "WebSocketUrl" }).OutputValue
@"
VITE_API_URL=$apiUrl
VITE_USER_POOL_ID=$poolId
VITE_USER_POOL_CLIENT_ID=$clientId
VITE_WS_URL=$wsUrl
VITE_REGION=$region
"@ | Out-File -FilePath (Join-Path $PSScriptRoot ".env") -Encoding utf8
```

Add `VITE_WS_URL` to `.env.example`.

**Done when**: After deploy, `.env` file auto-created with correct values.

---

## Milestone 2 — Backend Lambda Fixes (~1 day)

### TASK 2.1 — Fix CORS in Sync Lambda
**Fixes**: B3 | **File**: `backend/sync/index.mjs`

Add OPTIONS handler at top of try block. Update `response()` helper to include `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`.

**Done when**: Browser preflight requests return 200.

---

### TASK 2.2 — Fix Sync Lambda: Upsert with ownerId + GSI1
**Fixes**: B4, B5 | **File**: `backend/sync/index.mjs`

Replace `PUT /file/:id` `UpdateCommand` with `PutCommand` (full upsert). Include `ownerId`, `GSI1PK: USER#userId`, `GSI1SK: UPDATED#timestamp` on every write. Also add GSI1 keys to `POST /resource`.

**Done when**: Every DynamoDB item has `ownerId`, `GSI1PK`, `GSI1SK`.

---

### TASK 2.3 — Add Pull Endpoint (GET /sync/pull)
**File**: `backend/sync/index.mjs`

New route querying GSI1 by `USER#userId` with optional `?since=` timestamp filter. Returns all user's notes/folders.

**Done when**: `GET /sync/pull` returns all user notes. `?since=<ISO>` filters to recent changes only.

---

### TASK 2.4 — Add Delete Endpoint (DELETE /file/:id)
**File**: `backend/sync/index.mjs`

New route: `DELETE /file/:id?parentId=ROOT` → `DeleteCommand` on DynamoDB.

**Done when**: DELETE request removes item from DynamoDB.

---

### TASK 2.5 — Fix WebSocket Lambda ($disconnect)
**Fixes**: B6 | **File**: `backend/websocket/index.mjs`

On `$connect`: write TWO records — `USER#userId → CONN#connId` (for fan-out) and `CONN#connId → userId` (for reverse lookup on disconnect). On `$disconnect`: query `CONN#connId` to find userId, delete both records. Add `GetCommand` import.

**Done when**: After disconnect, both records cleaned up. No orphaned connections.

---

### TASK 2.6 — Fix Stream Processor (Stale Cleanup + DELETE events)
**Fixes**: B7 | **File**: `backend/stream-processor/index.mjs`

On `GoneException`: delete stale connection records (both forward and reverse). Handle `REMOVE` stream events: send `NOTE_DELETED` message to connected clients.

**Done when**: Stale connections auto-cleaned. Deletes propagate in real-time.

---

## Milestone 3 — Authentication Integration (~1 day)

### TASK 3.1 — Wire Auth State into App.tsx
**File**: `src/app/App.tsx`

Import `authService`, `syncService`, `AuthModal`. Add state: `isAuthenticated`, `showAuthModal`, `userEmail`. On mount: `authService.getSession()` → configure sync if valid. `handleAuthSuccess`: get token → configure sync → `syncAll(true)` → `startAutoSync()`. Render `<AuthModal>`.

**Done when**: App boots → checks session → auto-resumes sync if logged in.

---

### TASK 3.2 — Add Sign-Up + Confirm Flow to AuthModal
**File**: `src/app/components/AuthModal.tsx`

Add `mode` state (`signin`/`signup`/`confirm`). Signup → `authService.signUp()` → confirm mode. Confirm → 6-digit code → `authService.confirmSignUp()` → signin mode. Add toggle links and close button.

**Done when**: Full Cognito lifecycle: sign up → verify email → sign in.

---

### TASK 3.3 — Add Login/Logout to Toolbar
**File**: `src/app/components/Toolbar.tsx`

New props: `isAuthenticated`, `userEmail`, `onSignIn`, `onSignOut`. Right section: "Sign In" button or email + "Sign Out" button.

**Done when**: Toolbar shows auth state with working buttons.

---

### TASK 3.4 — JWT Token Refresh in SyncService
**Fixes**: B8 | **File**: `src/app/services/SyncService.ts`

Replace static `idToken: string` with `getToken: () => Promise<string>`. Call before every API request. In App.tsx pass: `getToken: async () => (await authService.getSession()).getIdToken().getJwtToken()`.

**Done when**: Sync works continuously for 1+ hours without re-login.

---

## Milestone 4 — Full Sync Pipeline (~1 day)

### TASK 4.1 — Implement Pull Sync (Cloud → Local)
**File**: `src/app/services/SyncService.ts`

Add `pullAll()`: call `GET /sync/pull?since=<lastPull>`, upsert into Dexie only if server is newer. Store `lastPullTimestamp` in localStorage. Call on login, WebSocket reconnect, and every 60s.

**Done when**: New device login → all notes appear. Missed updates recovered on reconnect.

---

### TASK 4.2 — Implement Delete Sync (Frontend)
**Files**: `SyncService.ts`, `App.tsx`

Add `deleteNote(noteId, parentId)` → `DELETE /file/:id`. In `handleDeleteNote()`: call after local delete if authenticated. Handle `NOTE_DELETED` WebSocket message → `db.notes.delete()`.

**Done when**: Delete on device A → disappears on device B in real-time.

---

### TASK 4.3 — Sync Status UI in StatusBar
**Files**: `StatusBar.tsx`, `SyncService.ts`, `App.tsx`

Add status callback to SyncService. Emit: syncing/synced/error/offline. StatusBar shows colored dot + label.

**Done when**: User always sees current sync state.

---

## Milestone 5 — Folder System & Image Upload (~2 days)

### TASK 5.1 — Extend Dexie Schema for Folders
**File**: `src/app/db.ts`

Add `Folder` interface + `parentId` to `Note`. Bump to `db.version(2)` with `folders` table.

---

### TASK 5.2 — Build Recursive FileTree Component
**New file**: `src/app/components/FileTree.tsx`

Recursive component using `useLiveQuery`. Expand/collapse folders. `react-dnd` for drag-drop.

---

### TASK 5.3 — Folder CRUD + Replace Flat List in Sidebar
**Files**: `Sidebar.tsx`, `App.tsx`

"New Folder" button, rename on double-click, recursive delete. Replace `notes.map()` with `<FileTree>`. Flat filtered results when searching.

---

### TASK 5.4 — Sync Folders to Backend
**File**: `SyncService.ts`

Push folders via `POST /resource` with `type: 'folder'`. Handle `FOLDER_UPDATED` WebSocket events.

---

### TASK 5.5 — S3 Image Upload Pipeline
**Files**: `sync/index.mjs`, new `UploadService.ts`, `EditorArea.tsx`, `template.yaml`

Backend: `POST /upload-url` returns presigned PUT URL. Frontend: `UploadService.uploadImage()`. EditorArea: hook Editor.md's `imageUploadFunction`. CloudFormation: add S3 write policy to Sync Lambda.

---

## Milestone 6 — UX Polish (~1 day)

### TASK 6.1 — Sidebar Search Filtering
**Files**: `Sidebar.tsx`, `App.tsx` | Filter notes by title/preview. Clear button.

### TASK 6.2 — Keyboard Shortcuts
**File**: `App.tsx` | `Ctrl+N` new, `Ctrl+S` sync, `Ctrl+E` toggle view, `Ctrl+B` sidebar, `Ctrl+K` search.

### TASK 6.3 — Confirmation Dialogs
**File**: `Sidebar.tsx` | Use existing `ui/alert-dialog.tsx` for delete confirmation.

### TASK 6.4 — Toast Notifications
**Files**: `App.tsx`, `main.tsx` | Add `<Toaster />` from `sonner`. Toast on all major actions.

### TASK 6.5 — Note Sorting Options
**Files**: `Sidebar.tsx`, `App.tsx` | Dropdown: Last Modified / Alphabetical / Created. Persist in localStorage.

---

## Quick Reference — All 26 Tasks

| # | Task | Est. |
|---|------|------|
| 1.1 | CF: WebSocket Stage + TTL | 30min |
| 1.2 | Auto .env after deploy | 30min |
| 2.1 | CORS preflight handler | 30min |
| 2.2 | Upsert with ownerId + GSI1 | 1hr |
| 2.3 | Pull endpoint | 1hr |
| 2.4 | Delete endpoint | 30min |
| 2.5 | Fix WS $disconnect | 1hr |
| 2.6 | Stream processor cleanup | 1hr |
| 3.1 | Wire auth into App.tsx | 2hr |
| 3.2 | Sign-up + confirm modal | 2hr |
| 3.3 | Login/logout in Toolbar | 1hr |
| 3.4 | JWT token refresh | 1hr |
| 4.1 | Pull sync (cloud → local) | 3hr |
| 4.2 | Delete sync (frontend) | 2hr |
| 4.3 | Sync status UI | 2hr |
| 5.1 | Dexie schema for folders | 30min |
| 5.2 | FileTree component | 4hr |
| 5.3 | Folder CRUD + sidebar | 3hr |
| 5.4 | Sync folders to backend | 2hr |
| 5.5 | S3 image upload | 4hr |
| 6.1 | Sidebar search | 1hr |
| 6.2 | Keyboard shortcuts | 1hr |
| 6.3 | Confirmation dialogs | 1hr |
| 6.4 | Toast notifications | 1hr |
| 6.5 | Note sorting | 1hr |

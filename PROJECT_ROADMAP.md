# NoteCognition Project Roadmap

> **Scope**: A comprehensive guide combining backend/infrastructure fixes, real-time sync using Change Data Capture (CDC), folder structures, image uploads, and UX polish. 

---

## Phase 0: Technical Debt & Removals (Fix First)
*Before adding new features, we must clear out flawed placeholder code and unsafe implementations.*

- [ ] **Task 0.1 — Remove `syncAll` Polling**
  - **File**: `src/app/services/SyncService.ts`
  - Remove the `setInterval` and `syncAll()` loop that checks for changes every 60 seconds. This naive polling must be deleted to make way for event-driven CDC hooks.
- [ ] **Task 0.2 — Remove Static Token Initialization**
  - **File**: `src/app/services/SyncService.ts`
  - Remove the `idToken` field from the configuration. Passing a static token on mount causes sync to break silently after 1 hour (when the Cognito JWT expires).
- [ ] **Task 0.3 — Refactor Sparse DynamoDB Updates**
  - **File**: `backend/sync/index.mjs`
  - Remove the use of `UpdateCommand` for `PUT /file/:id`. This currently creates incomplete sparse items in the database if the note doesn't exist. Replace it with `PutCommand` for full upserts.
- [ ] **Task 0.4 — Remove Unsafe WebSocket Connections**
  - **File**: `backend/websocket/index.mjs`
  - The lambda currently reads `userId` straight from the query string (`?userId=123`) without verifying a JWT. This allows anyone to impersonate any user. It must be refactored to verify a token or correctly use API Gateway Authorizers.

---

## Phase 1: Backend & Infrastructure Fixes (P0)
*Getting the cloud ready to securely and correctly handle bidirectional sync.*

- [ ] **Task 1.1 — Auto-Generate `.env` After Deploy**
  - Update `deploy.ps1` to automatically fetch AWS stack outputs (ApiUrl, WebSocketUrl, UserPoolId) and generate the `.env` file for the frontend.

- [ ] **Task 1.2 — Fix CORS & Upsert in Sync Lambda**
  - **File**: `backend/sync/index.mjs`
  - Add an `OPTIONS` handler for CORS preflight. Update the `PUT` (update) and `POST` (create) endpoints to write the `ownerId` and `GSI1PK/SK` attributes so notes can be queried efficiently by user.

- [ ] **Task 1.3 — Add Pull & Delete Endpoints**
  - **File**: `backend/sync/index.mjs`
  - Create `GET /sync/pull` to query `GSI1` and return all notes belonging to the user.
  - Create `DELETE /file/:id` to securely remove notes.

- [ ] **Task 1.4 — Fix WebSocket Reverse Lookup**
  - **File**: `backend/websocket/index.mjs`
  - API Gateway `$disconnect` doesn't pass query parameters. On `$connect`, store a reverse-lookup record (`CONN#<id>`) in DynamoDB so `$disconnect` can find which `userId` dropped off.

- [ ] **Task 1.5 — Handle Stale WebSocket Connections**
  - **File**: `backend/stream-processor/index.mjs`
  - When broadcasting real-time updates, if API Gateway throws a `GoneException`, actively delete that connection record. Handle `REMOVE` stream events to broadcast deletions.

---

## Phase 2: Authentication Integration (P0)
*Wiring AWS Cognito so users can sign up, log in, and establish an identity.*

- [ ] **Task 2.1 — Wire Auth to App State**
  - **File**: `src/app/App.tsx`
  - Import `authService`. On app mount, check for an active session. Manage `isAuthenticated` and `userEmail` states and pass them to the Toolbar.

- [ ] **Task 2.2 — Complete Auth Modal (Sign Up & Confirm)**
  - **File**: `src/app/components/AuthModal.tsx`
  - Add UI modes for Sign Up (email/password) and Confirmation (6-digit AWS Cognito code).

- [ ] **Task 2.3 — Add Toolbar Login/Logout**
  - **File**: `src/app/components/Toolbar.tsx`
  - Add a user menu or login button to the top toolbar that opens the AuthModal or logs the user out.

- [ ] **Task 2.4 — JWT Token Refresh in SyncService**
  - **File**: `src/app/services/SyncService.ts`
  - Cognito JWTs expire after 1 hour. Change `SyncService` to use a `getToken()` function (which calls `getSession()` to auto-refresh) instead of holding a static token.

---

## Phase 3: Real-Time Sync via CDC (P1)
*Connecting the local Dexie database to the cloud for instant, bi-directional, event-driven syncing.*

- [ ] **Task 3.1 — Implement Dexie CDC (Change Data Capture)**
  - **Files**: `src/app/db.ts`, `src/app/services/SyncService.ts`
  - Remove the 60-second polling (`syncAll`). Instead, use Dexie `hook('creating')`, `hook('updating')`, and `hook('deleting')`. 
  - **Crucial**: Use an `isApplyingRemoteChange` flag to block the hooks when applying incoming WebSocket updates to prevent infinite loops.

- [ ] **Task 3.2 — Implement Pull Sync (Cloud → Local)**
  - **File**: `src/app/services/SyncService.ts`
  - Add a `pullAll(since)` method to fetch cloud notes and merge them into Dexie. Call this on initial login and automatically upon WebSocket reconnect.

- [ ] **Task 3.3 — Implement Delete Sync**
  - **File**: `src/app/services/SyncService.ts`
  - Connect the Dexie delete hook to a new `deleteNote()` method that calls the backend `DELETE` endpoint.

- [ ] **Task 3.4 — Sync Status UI**
  - **Files**: `src/app/components/StatusBar.tsx`, `src/app/services/SyncService.ts`
  - Expose a sync status observable. Show a small indicator in the UI (Synced, Syncing, Offline, Error).

---

## Phase 4: Folder System & File Tree (P1)
*Supporting nested folders and drag-and-drop organization.*

- [ ] **Task 4.1 — Extend Dexie Schema for Folders**
  - **File**: `src/app/db.ts`
  - Add a `Folder` interface + `parentId` to `Note`. Bump to `db.version(2)`.

- [ ] **Task 4.2 — Build Recursive FileTree Component**
  - **File**: `src/app/components/FileTree.tsx`
  - Build a recursive component using `useLiveQuery` and `react-dnd` to allow dragging notes and folders into each other.

- [ ] **Task 4.3 — Folder CRUD + Replace Sidebar List**
  - **Files**: `Sidebar.tsx`, `App.tsx`
  - Add "New Folder" button. Replace the flat `notes.map()` with the new `<FileTree>`. Ensure searches still flatten the list.

- [ ] **Task 4.4 — Sync Folders to Backend**
  - **File**: `SyncService.ts`
  - Ensure the CDC hooks also listen to folder creations/updates/deletions and push them to the backend via `POST /resource` with `type: 'folder'`.

---

## Phase 5: Image Upload via S3 (P1)
*Allowing users to paste or drag images directly into the markdown editor.*

- [ ] **Task 5.1 — Create Presigned URL Endpoint**
  - **File**: `backend/sync/index.mjs`
  - Add a `POST /upload-url` handler that returns an S3 presigned PUT URL.

- [ ] **Task 5.2 — Create Frontend Upload Service**
  - **File**: `src/app/services/UploadService.ts`
  - Create a service that requests the presigned URL and uploads the file directly to S3.

- [ ] **Task 5.3 — Hook Editor.md Image Upload**
  - **File**: `src/app/components/EditorArea.tsx`
  - Override Editor.md's `imageUploadFunction` to use the `UploadService` and insert the resulting S3 public URL into the markdown.

---

## Phase 6: Conflict Resolution (P2)
*Preventing data loss when editing the same note from multiple devices simultaneously.*

- [ ] **Task 6.1 — Add Version Tracking**
  - Add a `version` field to the Dexie `Note` interface. Increment it on local save.
  - Backend: Use a `ConditionExpression` to reject updates where the server version is newer.

- [ ] **Task 6.2 — Handle Conflicts in SyncService**
  - If a push fails with a 409 Conflict, fetch the server version and resolve it (e.g., Last-Write-Wins based on timestamp, or flag it for manual review).

---

## Phase 7: UX Polish & Quality of Life (P2)

- [ ] **Task 7.1 — Sidebar Search Filtering**
  - Implement client-side title/preview filtering when typing in the sidebar search box.
- [ ] **Task 7.2 — Keyboard Shortcuts**
  - Bind `Ctrl+N` (New), `Ctrl+S` (Force sync), `Ctrl+E` (Toggle edit/preview), `Ctrl+B` (Sidebar), `Ctrl+K` (Search).
- [ ] **Task 7.3 — Confirmation Dialogs**
  - Add a confirmation dialog before deleting notes or folders.
- [ ] **Task 7.4 — Toast Notifications**
  - Integrate `sonner` to show non-intrusive success/error toasts for syncing, logins, and deletions.
- [ ] **Task 7.5 — Note Sorting**
  - Add a dropdown to sort notes by Last Modified, Alphabetical, or Created Date.

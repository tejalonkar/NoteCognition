# NoteCognition — Full Implementation Plan & Task Breakdown

> **Scope**: Every feature gap between the current codebase and the finished product, broken into phases with granular, developer-actionable tasks.

---

## Phase 1: Authentication Integration (P0)

### Why First?
Auth is the gateway to *every* cloud feature. Nothing else (sync, real-time, image upload) works without a valid JWT token. The `AuthService` and `AuthModal` already exist but are completely disconnected from the app.

---

### TASK 1.1 — Add Auth State Management to App.tsx

**Goal**: Track whether a user is logged in and expose auth state globally.

**Files to modify**: [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. Add state variables at the top of `App()`:
   ```tsx
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [showAuthModal, setShowAuthModal] = useState(false);
   const [currentUser, setCurrentUser] = useState<{email: string; sub: string} | null>(null);
   ```
2. Add a `useEffect` on mount that calls `authService.getSession()`:
   - On success → extract `idToken` and `sub` from the session, set `isAuthenticated = true`, populate `currentUser`
   - On failure → remain unauthenticated (offline mode, no error shown)
3. Create a `handleAuthSuccess` callback:
   - Call `authService.getSession()` to get the fresh token
   - Set `isAuthenticated = true`, `showAuthModal = false`
   - Configure `syncService` (see Task 1.3)
4. Create a `handleSignOut` callback:
   - Call `authService.signOut()`
   - Set `isAuthenticated = false`, `currentUser = null`

**Acceptance criteria**: App boots → silently checks session → sets auth state. No visual change yet.

---

### TASK 1.2 — Wire AuthModal + Add Login/Logout Button to Toolbar

**Goal**: User can click "Sign In" in the toolbar, see the modal, authenticate, and see a "Sign Out" button.

**Files to modify**: [Toolbar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/Toolbar.tsx), [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. **Toolbar.tsx** — Add new props:
   ```tsx
   isAuthenticated: boolean;
   userEmail?: string;
   onSignIn: () => void;
   onSignOut: () => void;
   ```
2. In the **right section** of the Toolbar (after the Export button), render:
   - If NOT authenticated: a `LogIn` icon button labelled "Sign In" → calls `onSignIn`
   - If authenticated: show user's email (truncated) + `LogOut` icon button → calls `onSignOut`
3. **App.tsx** — Render `<AuthModal>` conditionally:
   ```tsx
   <AuthModal isOpen={showAuthModal} onSuccess={handleAuthSuccess} />
   ```
4. Pass the new props to `<Toolbar>`.

**Acceptance criteria**: "Sign In" button visible → opens modal → successful login changes button to email + "Sign Out".

---

### TASK 1.3 — Add Sign-Up + Confirmation Flow to AuthModal

**Goal**: Currently `AuthModal` only has sign-in. Add a toggle to switch to sign-up, plus a verification code step.

**Files to modify**: [AuthModal.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/AuthModal.tsx)

**Steps**:
1. Add state: `mode: 'signin' | 'signup' | 'confirm'`
2. In `signup` mode: call `authService.signUp(email, password)` → on success → switch to `confirm` mode
3. In `confirm` mode: show a 6-digit code input → call `authService.confirmSignUp(email, code)` → on success → switch to `signin` mode with a success toast
4. Add a "Don't have an account? Sign Up" / "Already have an account? Sign In" toggle link at the bottom
5. Use the existing `sonner` toast library (already in dependencies) for success/error feedback

**Acceptance criteria**: Full Cognito auth lifecycle works: sign up → verify email → sign in.

---

### TASK 1.4 — Connect SyncService After Login

**Goal**: Once authenticated, automatically start syncing.

**Files to modify**: [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. In `handleAuthSuccess`, after getting the session:
   ```tsx
   const idToken = session.getIdToken().getJwtToken();
   const userId = session.getIdToken().payload.sub;
   syncService.configure({
     apiUrl: import.meta.env.VITE_API_URL,
     wsUrl: import.meta.env.VITE_WS_URL || '',
     idToken,
     userId,
   });
   syncService.syncAll(true); // initial full sync
   syncService.startAutoSync();
   ```
2. Add `VITE_WS_URL` to [.env.example](file:///d:/MINDMARK/NoteCognition/.env.example)

**Acceptance criteria**: After login → notes push to DynamoDB → WebSocket connects → real-time updates flow in.

---

### TASK 1.5 — Show Sync Status in StatusBar

**Goal**: User sees whether they're syncing, online, or offline.

**Files to modify**: [StatusBar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/StatusBar.tsx), [SyncService.ts](file:///d:/MINDMARK/NoteCognition/src/app/services/SyncService.ts)

**Steps**:
1. **SyncService** — Add an observable sync status:
   - Add a `status: 'idle' | 'syncing' | 'error' | 'offline'` field
   - Add a callback registration method: `onStatusChange(cb: (status) => void)`
   - Update status before/after `syncAll()`, and on WebSocket `onclose`/`onerror`
2. **StatusBar** — Accept a new `syncStatus` prop
   - Render a small colored dot: green = idle/synced, yellow = syncing, red = error, gray = offline
   - Show text: "Synced", "Syncing...", "Sync Error", "Offline"
3. **App.tsx** — Wire the status from SyncService into StatusBar

**Acceptance criteria**: StatusBar shows real-time sync state. Offline users see "Offline" (no error).

---

## Phase 2: Sidebar Search (P1)

### TASK 2.1 — Implement Client-Side Note Filtering

**Goal**: The search input in the sidebar actually filters notes.

**Files to modify**: [Sidebar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/Sidebar.tsx), [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. **App.tsx** — Add `searchQuery` state, pass it down to Sidebar
2. **Sidebar.tsx** — Wire the `<input>` to update `searchQuery` via `onChange`
3. Filter the `notes` array before rendering:
   ```tsx
   const filtered = notes.filter(n =>
     n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     n.preview.toLowerCase().includes(searchQuery.toLowerCase())
   );
   ```
4. Render `filtered` instead of `notes`
5. Show "No notes found" empty state when `filtered.length === 0` and `searchQuery` is non-empty
6. Add a clear (×) button inside the search input when query is non-empty

**Acceptance criteria**: Typing in search bar instantly filters note list by title/preview. Clearing restores full list.

---

## Phase 3: Folder / File Tree (P1)

### Why?
The backend ([sync/index.mjs](file:///d:/MINDMARK/NoteCognition/backend/sync/index.mjs)) already supports `parentId`-based hierarchy with `PK: PARENT#<folderId>`. The frontend just needs to match.

---

### TASK 3.1 — Extend Dexie Schema for Folders

**Files to modify**: [db.ts](file:///d:/MINDMARK/NoteCognition/src/app/db.ts)

**Steps**:
1. Add a `Folder` interface:
   ```tsx
   interface Folder {
     id: string;
     name: string;
     parentId: string; // 'ROOT' for top-level
     updatedAt: Date;
   }
   ```
2. Add `parentId` to the `Note` interface (default: `'ROOT'`)
3. Bump Dexie version to 2:
   ```tsx
   db.version(2).stores({
     notes: 'id, title, updatedAt, parentId',
     folders: 'id, name, parentId, updatedAt'
   });
   ```
4. Keep the version 1 store definition so Dexie auto-migrates existing data

**Acceptance criteria**: Schema upgraded. Existing notes get `parentId = undefined` (treated as ROOT).

---

### TASK 3.2 — Build FileTree Component

**New file**: `src/app/components/FileTree.tsx`

**Steps**:
1. Create a recursive `FileTreeNode` component:
   ```
   FileTreeNode({ folderId })
     → Query folders where parentId === folderId
     → Query notes where parentId === folderId
     → Render folders (with expand/collapse chevron) then notes
     → Each folder recursively renders <FileTreeNode folderId={folder.id}>
   ```
2. Use `useLiveQuery` for both folders and notes queries (reactive)
3. Folder UI: folder icon + name, click to expand/collapse, right-click context menu for rename/delete
4. Note UI: file icon + title + preview (same as current Sidebar note items)
5. Drag-and-drop: Use the existing `react-dnd` + `react-dnd-html5-backend` (already in dependencies) to allow:
   - Dragging notes into folders
   - Dragging folders into other folders
   - Drop handler updates `parentId` in Dexie

**Acceptance criteria**: Recursive tree renders. Items can be dragged between folders.

---

### TASK 3.3 — Add "New Folder" Button + Folder CRUD

**Files to modify**: [Sidebar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/Sidebar.tsx), [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. Add a "New Folder" button next to "New Note" in the sidebar
2. `handleNewFolder` in App.tsx: insert into `db.folders` with `parentId = 'ROOT'` (or current folder)
3. `handleDeleteFolder`: recursively delete all child notes and sub-folders
4. `handleRenameFolder`: inline edit on double-click, save on blur/Enter
5. Update `handleNewNote` to accept an optional `parentId` so notes can be created inside folders

**Acceptance criteria**: Users can create folders, nest notes inside them, rename, and delete (with cascade).

---

### TASK 3.4 — Replace Flat Note List with FileTree in Sidebar

**Files to modify**: [Sidebar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/Sidebar.tsx)

**Steps**:
1. Replace the current `notes.map()` block with `<FileTree currentFolderId="ROOT" />`
2. Keep the search bar — when `searchQuery` is non-empty, show flat filtered results instead of the tree
3. Ensure selected note highlighting still works within the tree

**Acceptance criteria**: Sidebar shows a tree by default, flat filtered list when searching.

---

### TASK 3.5 — Sync Folders to Backend

**Files to modify**: [SyncService.ts](file:///d:/MINDMARK/NoteCognition/src/app/services/SyncService.ts)

**Steps**:
1. Add a `pushFolder(folder)` method that calls `POST /resource` with `type: 'folder'`
2. In `syncAll()`, also query `db.folders` and push any recently changed folders
3. Handle incoming `FOLDER_UPDATED` WebSocket messages (same pattern as `NOTE_UPDATED`)

**Acceptance criteria**: Folders sync to DynamoDB and appear on other devices.

---

## Phase 4: Image Upload via S3 (P1)

### TASK 4.1 — Create Presigned URL Lambda Endpoint

**New file**: Add a new route in [sync/index.mjs](file:///d:/MINDMARK/NoteCognition/backend/sync/index.mjs)

**Steps**:
1. Add handler for `POST /upload-url`:
   ```js
   if (httpMethod === "POST" && path === "/upload-url") {
     const { filename, contentType } = body;
     const key = `uploads/${userId}/${Date.now()}-${filename}`;
     const command = new PutObjectCommand({
       Bucket: process.env.ASSET_BUCKET,
       Key: key,
       ContentType: contentType,
     });
     const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
     return response(200, { uploadUrl: url, publicUrl: `https://${process.env.ASSET_BUCKET}.s3.amazonaws.com/${key}` });
   }
   ```
2. Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to sync Lambda's `package.json`
3. Update CloudFormation: pass `ASSET_BUCKET` env var to SyncServiceLambda, add S3 write policy

**Acceptance criteria**: `POST /upload-url` returns a presigned PUT URL and the eventual public URL.

---

### TASK 4.2 — Create Frontend Upload Service

**New file**: `src/app/services/UploadService.ts`

**Steps**:
1. Create `uploadImage(file: File, idToken: string): Promise<string>`:
   - Call `POST /upload-url` with filename and content type
   - Use the returned presigned URL to `PUT` the file directly to S3
   - Return the public URL
2. Handle errors (file too large, network failure)

**Acceptance criteria**: Given a File object and token, returns the S3 public URL after upload.

---

### TASK 4.3 — Hook Editor.md Image Upload to S3

**Files to modify**: [EditorArea.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/EditorArea.tsx)

**Steps**:
1. Replace the Editor.md `imageUploadURL: "./php/upload.php"` with a custom handler
2. Use Editor.md's `imageUploadFunction` config callback:
   ```tsx
   imageUploadFunction: async function(files, insertImageFn) {
     const file = files[0];
     const url = await uploadService.uploadImage(file, getIdToken());
     insertImageFn(url);
   }
   ```
3. If user is NOT authenticated, show a toast: "Sign in to upload images"
4. Add a loading indicator during upload

**Acceptance criteria**: Drag-drop or paste an image → uploads to S3 → inserts markdown `![](url)`.

---

## Phase 5: Conflict Resolution (P2)

### TASK 5.1 — Add Version Tracking

**Files to modify**: [db.ts](file:///d:/MINDMARK/NoteCognition/src/app/db.ts), [sync/index.mjs](file:///d:/MINDMARK/NoteCognition/backend/sync/index.mjs)

**Steps**:
1. Add `version: number` field to the `Note` interface (default: `0`)
2. Increment `version` on every local save in `savePendingChanges()`
3. Backend: store `version` in DynamoDB, use `ConditionExpression` on update:
   ```
   ConditionExpression: "attribute_not_exists(version) OR version <= :v"
   ```
4. If condition fails (409 conflict), return the server's current version of the note

**Acceptance criteria**: Stale writes are rejected by the backend.

---

### TASK 5.2 — Handle Conflicts in SyncService

**Files to modify**: [SyncService.ts](file:///d:/MINDMARK/NoteCognition/src/app/services/SyncService.ts)

**Steps**:
1. On push failure with 409: fetch the server version
2. Compare `localNote.updatedAt` vs `serverNote.updatedAt`
3. Strategy options (implement "last-write-wins" first, with a UI for manual merge later):
   - **Last-write-wins**: keep the note with the newer `updatedAt`
   - **Manual merge** (future): show a diff dialog
4. Log conflicts to console for debugging

**Acceptance criteria**: Two devices editing the same note → no data loss, newer version wins.

---

## Phase 6: Pull Sync (Cloud → Local)

### TASK 6.1 — Add Pull/Download Endpoint to Backend

**Files to modify**: [sync/index.mjs](file:///d:/MINDMARK/NoteCognition/backend/sync/index.mjs)

**Steps**:
1. Add `GET /sync/pull?since=<ISO timestamp>`:
   - Query DynamoDB GSI1 for all items where `ownerId = userId` and `updatedAt > since`
   - Return the full list of notes/folders
2. If `since` is omitted, return everything (full sync)

**Acceptance criteria**: Client can request all changes since last sync timestamp.

---

### TASK 6.2 — Implement Pull in SyncService

**Files to modify**: [SyncService.ts](file:///d:/MINDMARK/NoteCognition/src/app/services/SyncService.ts)

**Steps**:
1. Add `pullAll(since?: string)` method:
   - Call `GET /sync/pull?since=...`
   - For each returned item, upsert into Dexie (only if server version is newer)
2. Store `lastPullTimestamp` in `localStorage`
3. Call `pullAll()` on initial login (full sync) and periodically (every 60s, offset from push)
4. On WebSocket reconnect, do a pull to catch anything missed while disconnected

**Acceptance criteria**: New device login → all notes appear. Missed WebSocket messages recovered on reconnect.

---

## Phase 7: DynamoDB GSI1 Utilization

### TASK 7.1 — Populate GSI1 Keys on Write

**Files to modify**: [sync/index.mjs](file:///d:/MINDMARK/NoteCognition/backend/sync/index.mjs)

**Steps**:
1. On `POST /resource` and `PUT /file/:id`, also write:
   ```js
   GSI1PK: `USER#${userId}`,
   GSI1SK: `UPDATED#${new Date().toISOString()}`
   ```
2. This enables the pull endpoint (Task 6.1) to query by user + time range efficiently

**Acceptance criteria**: Every note/folder in DynamoDB has GSI1PK and GSI1SK populated.

---

## Phase 8: Deployment & DevOps Polish

### TASK 8.1 — Auto-Generate .env After Deploy

**New file**: Modify [deploy.ps1](file:///d:/MINDMARK/NoteCognition/deploy.ps1)

**Steps**:
1. After successful deploy, call `aws cloudformation describe-stacks` to get outputs
2. Parse `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `WebSocketUrl`
3. Write them to `.env` in the project root:
   ```
   VITE_API_URL=<ApiUrl>
   VITE_USER_POOL_ID=<UserPoolId>
   VITE_USER_POOL_CLIENT_ID=<UserPoolClientId>
   VITE_WS_URL=<WebSocketUrl>
   VITE_REGION=<region>
   ```
4. Print a success message with the values

**Acceptance criteria**: `deploy.ps1` → stack deploys → `.env` auto-populated → `npm run dev` connects to cloud.

---

### TASK 8.2 — Add WebSocket Stage Deployment

**Files to modify**: [cloudformation/template.yaml](file:///d:/MINDMARK/NoteCognition/cloudformation/template.yaml)

**Steps**:
1. The WebSocket API currently has no `AWS::ApiGatewayV2::Stage` resource — add one:
   ```yaml
   WebSocketStage:
     Type: AWS::ApiGatewayV2::Stage
     Properties:
       ApiId: !Ref NoteCognitionWebSocketApi
       StageName: !Ref Environment
       AutoDeploy: true
   ```
2. Without this, the WebSocket URL won't actually work (API exists but has no deployment)

**Acceptance criteria**: WebSocket connections succeed after deploy.

---

### TASK 8.3 — Add CORS to Sync Lambda Responses

**Files to modify**: [sync/index.mjs](file:///d:/MINDMARK/NoteCognition/backend/sync/index.mjs)

**Steps**:
1. The `response()` helper already has `Access-Control-Allow-Origin: *` — good
2. Add an `OPTIONS` handler for preflight requests:
   ```js
   if (httpMethod === "OPTIONS") {
     return {
       statusCode: 200,
       headers: {
         "Access-Control-Allow-Origin": "*",
         "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
         "Access-Control-Allow-Headers": "Content-Type,Authorization",
       },
       body: "",
     };
   }
   ```
3. Add `Access-Control-Allow-Headers` to the main `response()` helper too

**Acceptance criteria**: Frontend `fetch()` calls to the API don't fail on CORS preflight.

---

## Phase 9: UX Polish & Quality of Life

### TASK 9.1 — Keyboard Shortcuts

**Files to modify**: [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. Add a global `useEffect` with `keydown` listener:
   - `Ctrl+N` → new note
   - `Ctrl+S` → force sync (if authenticated)
   - `Ctrl+E` → toggle editor/preview
   - `Ctrl+Shift+E` → export
   - `Ctrl+B` → toggle sidebar
   - `Ctrl+K` → focus search bar
2. Use `e.preventDefault()` to override browser defaults where needed

**Acceptance criteria**: All shortcuts work. No conflicts with Editor.md shortcuts.

---

### TASK 9.2 — Confirmation Dialog for Delete

**Files to modify**: [Sidebar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/Sidebar.tsx) or new `ConfirmDialog.tsx`

**Steps**:
1. Use the existing `alert-dialog` Radix primitive from [ui/alert-dialog.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/ui/alert-dialog.tsx)
2. Wrap the delete action: clicking trash icon opens "Are you sure?" dialog
3. For folders: warn that all child notes will also be deleted

**Acceptance criteria**: No accidental deletes. Folder delete warns about children.

---

### TASK 9.3 — Toast Notifications

**Files to modify**: [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx), `main.tsx`

**Steps**:
1. `sonner` is already in dependencies. Add `<Toaster />` to the app root
2. Use `toast.success()` / `toast.error()` for:
   - "Note deleted"
   - "Synced successfully"
   - "Sync failed — check your connection"
   - "Signed in as [email]"
   - "Image uploaded"
3. Match toast styling to the dark theme

**Acceptance criteria**: User gets feedback for all major actions.

---

### TASK 9.4 — Note Sorting Options

**Files to modify**: [Sidebar.tsx](file:///d:/MINDMARK/NoteCognition/src/app/components/Sidebar.tsx), [App.tsx](file:///d:/MINDMARK/NoteCognition/src/app/App.tsx)

**Steps**:
1. Add a sort dropdown in the sidebar header: "Last Modified" (default), "Alphabetical", "Created"
2. Add `createdAt` to the `Note` interface (requires Dexie version bump)
3. Apply sort before rendering the note list

**Acceptance criteria**: User can switch between sort modes. Persists across sessions (localStorage).

---

## Summary: Execution Order

| Order | Phase | Tasks | Estimated Effort |
|-------|-------|-------|-----------------|
| 1 | **Auth Integration** | 1.1 → 1.5 | 1–2 days |
| 2 | **Sidebar Search** | 2.1 | 2 hours |
| 3 | **Deploy Fix** | 8.1, 8.2, 8.3 | 3 hours |
| 4 | **Folder Tree** | 3.1 → 3.5 | 2–3 days |
| 5 | **Image Upload** | 4.1 → 4.3 | 1 day |
| 6 | **Pull Sync + GSI1** | 6.1, 6.2, 7.1 | 1 day |
| 7 | **Conflict Resolution** | 5.1, 5.2 | 1 day |
| 8 | **UX Polish** | 9.1 → 9.4 | 1 day |

**Total estimated**: ~8–10 days of focused development.

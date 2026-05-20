# Technical Architecture & Build Process

This document provides an in-depth, technical exploration of NoteCognition's architecture, design patterns, security controls, and the process followed to build the entire system from scratch.

---

## 🏗️ Detailed System Architecture

NoteCognition utilizes a **Local-First, Serverless Sync** model. The frontend acts as the primary database (offline-first), while AWS behaves as a synchronized replication log.

```
                  ┌──────────────────────────────┐
                  │      React Client (Vite)     │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼────────────────────────┐
         ▼ (Local DB)            ▼ (REST Client)          ▼ (WebSocket Client)
  ┌──────────────┐       ┌───────────────┐        ┌───────────────┐
  │  IndexedDB   │       │  Cognito Auth │        │ API Gateway   │
  │ (Dexie.js)   │       │   (JWT flow)  │        │  WebSockets   │
  └──────────────┘       └───────────────┘        └───────┬───────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │ Lambdas       │
                                                  │ (Node.js)     │
                                                  └───────┬───────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │ DynamoDB      │
                                                  │ (Single Table)│
                                                  └───────────────┘
```

---

## 💾 Frontend Core (Offline-First Engine)

### 1. IndexedDB Schema (via Dexie.js)
IndexedDB is the primary database. NoteCognition never blocks user action on network requests. Writes are executed instantly to IndexedDB and queued asynchronously for sync.

The local schema comprises:
* **`notes`**: Stores note metadata, title, raw markdown body, folder association, delete status (`isDeleted`), and time tracking fields (`createdAt`, `updatedAt`).
* **`folders`**: Tree structures mapped using parent-child IDs.
* **`sync_queue`**: A persistent log of changes that must be pushed to AWS.

### 2. Synchronization Loop & Conflict Resolution
The client runs a bidirectional sync loop:
1. **Incremental Pushes**: Whenever local database records change, a hook adds the primary key and timestamp to `sync_queue`. The client attempts to push these items to `/sync/push`. On success, the queue is cleared.
2. **Bulk Pulls**: On login or reconnection, the client requests the last sync timestamp. The server returns all changes that occurred since that timestamp (`/sync/pullAll`).
3. **Conflict Resolution (Last-Write-Wins)**: When merging data between remote and local DBs, the engine compares `updatedAt` timestamps down to the millisecond. The latest update always overwrites the older state. If a note was deleted (`isDeleted: true`), the deletion takes precedence.

---

## ☁️ Serverless AWS Backend (Deep Dive)

### 1. Single-Table DynamoDB Schema
To optimize connection overhead and achieve maximum AWS scaling (under the free tier), all entities are stored in a single DynamoDB table named `notecognition-data-dev`.

| Entity Type | Partition Key (PK) | Sort Key (SK) | Attribute Keys / Metadata |
| :--- | :--- | :--- | :--- |
| **User Account** | `USER#<UserId>` | `METADATA` | Email, Signup Timestamp |
| **Folder Node** | `USER#<UserId>` | `FOLDER#<FolderId>` | Name, ParentFolderId, UpdatedAt |
| **Note Document** | `USER#<UserId>` | `NOTE#<NoteId>` | Title, Body, FolderId, UpdatedAt, isDeleted |
| **Active Socket** | `USER#<UserId>` | `CONN#<ConnectionId>` | ConnectionId, ConnectedAt |

* **Query Pattern**: Fetching all notes and folders for a user is a single, highly efficient query: `Query(PK="USER#<UserId>")`. This returns all notes, folders, and connection nodes in one network trip, avoiding expensive multi-table joins.

### 2. WebSocket Real-Time Channel Routing
WebSockets enable character-by-character real-time notes updates across different devices.

1. **Connection Lifecycle**: 
   * When a client connects to the API Gateway WebSocket URL, the `$connect` Lambda function maps the socket connection ID and the Cognito User ID (passed via query tokens) to a database row: `PK="USER#<UserId>"`, `SK="CONN#<ConnectionId>"`.
   * When the connection drops, the `$disconnect` Lambda deletes this row.
2. **Diff Propagation Flow**:
   * When a note changes, the client broadcasts a lightweight payload (Note ID, Updated Title/Body, Timestamp) to the WebSocket endpoint.
   * The backend Lambda queries all active connection rows under the user's partition `USER#<UserId>`.
   * The Lambda loops through the active `ConnectionId` values and pushes the change payload to each connection (excluding the sender's ID) via the API Gateway Management API.

---

## 🛠️ The Build & Engineering Process

The project was developed in **four major phases**:

### Phase 1: Local-First Interface & Vanilla CSS Layout
We began by creating the styling framework and local persistence layer:
* **Vanilla CSS Layout**: Built a dark glassmorphism system using CSS variables, allowing fluid layout updates without the utility weight of Tailwind. 
* **Dexie Database Integration**: Set up IndexedDB schemas. Built state triggers that allow folders to create tree structures recursively without blocking the main browser thread.

### Phase 2: Serverless AWS Cloud Infrastructure
We mapped and automated the AWS backend:
* **CloudFormation Blueprint**: Designed `template.yaml` defining Lambda functions, API Gateways, a Cognito User Pool, and the DynamoDB Table.
* **Lambda Handlers**: Wrote modular handlers in Node.js ES Modules (`.mjs`) to manage data queries without heavy library dependencies.
* **Packaging Script**: Created `deploy.ps1` using the AWS CLI. The script automatically compresses Node Lambda code, uploads it to a temporary bootstrap S3 bucket, provisions the CloudFormation stack, and writes the output environment variables to a local `.env` file.

### Phase 3: Incremental Sync Integration
We connected the client and server:
* **Token Handlers**: Configured the Cognito SDK to validate JWT identity tokens.
* **WebSocket Integration**: Connected the React client to API Gateway WebSocket hooks, establishing bidirectional listener nodes that merge incoming delta edits directly into IndexedDB, triggering local reactive re-renders.

### Phase 4: Pure Web "Host-Your-Own-Data" Release
To empower privacy-conscious users, we made the backend easily replicable:
* **Decoupled AWS Instantiation**: Refactored the core `AuthService` and `SyncService` to read connection strings dynamically from `localStorage` rather than static environment variables.
* **Static Template Server**: Added a step to `deploy.ps1` that copies the compiled CloudFormation template to the `public/` directory during packaging.
* **Connection Wizard (`AwsConfigModal`)**: Built a setup wizard that allows users to download the template file, opens the AWS CloudFormation Console in a new tab, and configures the stack connections dynamically.

---

## 🔐 Security Configuration

1. **Least-Privilege IAM Roles**: The Lambdas operate on strictly defined IAM permissions, restricted only to basic logging and database transactions within their specific DynamoDB table.
2. **Secure Token Verification**: Every API Gateway REST route and WebSocket connection request parses the HTTP Authorization header and cryptographically validates the user's Cognito JWT signature before processing database operations.
3. **No Key-Storage**: The NoteCognition web client **never** requests or stores AWS Access Keys or Secret Keys. Cloud stack creations are routed entirely through official AWS Console tabs, keeping the user's credentials secure.

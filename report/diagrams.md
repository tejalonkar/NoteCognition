# NoteCognition — Print-Ready Diagrams (Single Page Each)
# Paste into https://mermaid.live → Export PNG at 1x scale


## 1. System Architecture

```mermaid
graph LR
    U[React SPA] <--> DB[(IndexedDB)]
    U --> Q[(Queue)]
    U <--> C[Cognito]
    Q --> R[REST API]
    U <--> W[WebSocket]
    U --> S3[(S3)]
    R --> L1[Sync λ]
    W --> L2[WS λ]
    L1 <--> D[(DynamoDB)]
    L2 <--> D
```


## 2. Context Diagram (DFD Level 0)

```mermaid
graph LR
    U(("User")) <-->|"Notes, Auth"| N["NoteCognition"]
    N <-->|"JWT"| C(("Cognito"))
    N <-->|"Sync"| B(("AWS"))
```


## 3. DFD Level 1

```mermaid
graph LR
    U(("User")) --> N[Note Mgmt]
    U --> F[Folder Mgmt]
    U --> A[Auth]
    N & F <--> D1[(IndexedDB)]
    N & F --> D2[(Queue)]
    A <--> C(("Cognito"))
    D2 --> S[Sync Engine]
    S <--> D3[(DynamoDB)]
    S --> D1
    N --> RT[Real-Time]
    RT <--> D3
```


## 4. Flowchart

```mermaid
flowchart TD
    A([Open App]) --> B{Logged In?}
    B -->|No| C[Auth Modal] --> D{Signup?}
    D -->|Yes| E[Register] --> F[Confirm] --> G[Login]
    D -->|No| G
    G --> H{Valid?}
    H -->|No| C
    H -->|Yes| I[Get JWT]
    B -->|Yes| I
    I --> J[Load Local DB + Pull Server]
    J --> K[Connect WebSocket]
    K --> L[Editor Ready]
    L --> M{Action}
    M -->|Edit| N[Write IndexedDB]
    M -->|Create/Delete| N
    M -->|Image| O[Upload S3]
    N & O --> P[Add to Queue]
    P --> Q{Online?}
    Q -->|Yes| R[Push + Broadcast] --> L
    Q -->|No| S[Retry Later] --> L
```


## 5. Use Case Diagram

```mermaid
graph LR
    U(("User"))
    U --- N1[Create Note]
    U --- N2[Edit Note]
    U --- N3[Delete Note]
    U --- N4[Export .md]
    U --- F1[Manage Folders]
    U --- F2[Drag-Drop]
    U --- A1[Sign Up]
    U --- A2[Log In]
    U --- C1[Upload Image]
    U --- C2[Deploy Backend]
    U --- C3[AWS Config]
    U --- N5[Live Preview]
    A1 & A2 -.-> COG(("Cognito"))
    N2 & N3 -.-> DB(("DynamoDB"))
    C1 -.-> S3(("S3"))
    C2 -.-> CF(("CloudFormation"))
```


## 6. Sequence Diagram

```mermaid
sequenceDiagram
    actor A as Device A
    participant UI as Frontend
    participant DB as IndexedDB
    participant API as REST API
    participant DDB as DynamoDB
    participant WS as WebSocket
    actor B as Device B

    A->>UI: Edit note
    UI->>DB: Write local
    UI-->>A: Render
    UI->>API: Push change
    API->>DDB: Save
    UI->>WS: Broadcast
    WS->>DDB: Get connections
    WS-->>B: Send edit
    B->>B: Merge + Render
```


## 7. Activity Diagram — Sync

```mermaid
flowchart TD
    S([Start]) --> C{Online?}
    C -->|No| Q[Queue] --> W[Wait] --> C
    C -->|Yes| P[Pull Changes]
    P --> H{Changes?}
    H -->|No| R[Read Queue]
    H -->|Yes| M[Merge: LWW]
    M --> R
    R --> E{Empty?}
    E -->|Yes| T[Update Timestamp] --> D([Done])
    E -->|No| PU[Push Batch]
    PU --> OK{OK?}
    OK -->|Yes| CL[Clear Queue] --> T
    OK -->|No| RT[Retry] --> T
```


## 8. Class Diagram

```mermaid
classDiagram
    class Note {
        +id: string
        +title: string
        +body: string
        +folderId: string
        +isDeleted: bool
        +updatedAt: number
    }
    class Folder {
        +id: string
        +name: string
        +parentId: string
        +updatedAt: number
    }
    class DexieDB {
        +notes: Table
        +folders: Table
        +sync_queue: Table
    }
    class AuthService {
        +signUp()
        +login()
        +logout()
        +getIdToken()
    }
    class SyncService {
        +pullAll()
        +pushChanges()
        +connectWS()
        +flushQueue()
    }
    class ConfigService {
        +getApiUrl()
        +getWsUrl()
        +saveConfig()
    }
    class UploadService {
        +uploadImage()
    }
    class EditorArea {
        +handleInput()
        +renderPreview()
    }
    class FileTree {
        +renderTree()
        +handleDragDrop()
    }
    class App {
        +render()
    }

    App --> AuthService
    App --> SyncService
    App --> EditorArea
    App --> FileTree
    SyncService --> DexieDB
    SyncService --> ConfigService
    AuthService --> ConfigService
    EditorArea --> UploadService
    DexieDB --> Note
    DexieDB --> Folder
```


## 9. Component Diagram

```mermaid
graph LR
    subgraph UI[React Layer]
        A[App] --> T[Toolbar] & S[Sidebar] & E[Editor] & AM[AuthModal] & AW[AWSModal]
        S --> FT[FileTree]
    end
    subgraph SV[Services]
        AS[Auth] & SS[Sync] & CS[Config] & US[Upload]
    end
    subgraph LO[Local]
        IDB[(IndexedDB)] & LS[(localStorage)]
    end
    subgraph CL[AWS Cloud]
        COG[Cognito] & REST[REST] & WSA[WebSocket] & DDB[(DynamoDB)] & S3[(S3)]
    end
    AM --> AS --> COG & CS
    E --> SS & US
    AW --> CS --> LS
    SS --> REST & WSA & IDB
    US --> S3
    REST & WSA --> DDB
```


## 10. Deployment Diagram

```mermaid
graph LR
    subgraph Client[Browser]
        SPA[React + Vite] --> DX[Dexie.js] --> IDB[(IndexedDB)]
    end
    subgraph Host[Netlify]
        CDN[Static Files]
    end
    subgraph AWS[AWS Account]
        COG[Cognito]
        RA[REST API] --> SL[Sync λ]
        WA[WS API] --> WL[WS λ]
        SL & WL --> DB[(DynamoDB)]
        S3[(S3)]
    end
    CDN --> SPA
    SPA --> COG & RA & WA & S3
```

# Specification: Replace Hardcoded Documents List with Dynamic API Integration

## Overview

The Equipment details drawer currently displays hardcoded mock document data ("Technical Specifications - PDF - 2.4 MB") instead of fetching real files from the backend API. This bug fix will integrate the existing `/projects/{project_id}/files` endpoint to dynamically display actual project files with proper loading, empty, and error states.

## Workflow Type

**Type**: feature (bug fix with API integration)

**Rationale**: While this is technically a bug fix, it requires implementing new API integration logic, state management, and UI states (loading, empty, error). The workflow type "feature" better captures the scope of adding dynamic data fetching capabilities to an existing component.

## Task Scope

### Services Involved
- **frontend** (primary) - Equipment drawer component requires modification to fetch and display files
- **backend** (reference only) - Existing `/projects/{project_id}/files` API endpoint already implemented

### This Task Will:
- [ ] Remove hardcoded mock document list from EquipmentPage.tsx (lines 209-214)
- [ ] Integrate API call to fetch files from `/projects/{project_id}/files`
- [ ] Dynamically render file list with actual file names and sizes
- [ ] Implement loading state while fetching files
- [ ] Implement empty state when no documents exist
- [ ] Implement error handling for failed API requests
- [ ] Format file sizes appropriately (KB, MB, GB)

### Out of Scope:
- File upload functionality (already exists)
- File preview or download functionality
- File deletion or management
- Backend API modifications (endpoint already exists)
- File type icons or thumbnails

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- UI Library: Material-UI (@mui/material, @mui/icons-material)
- Styling: Emotion
- HTTP Client: Axios
- Routing: React Router DOM

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000

**Service URL:** http://localhost:3000

### Backend (Reference Only)

**Tech Stack:**
- Language: Python
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**Service URL:** http://localhost:8000

**Relevant API Endpoint:**
- **GET** `/projects/{project_id}/files` - Fetch all files for a project
- **File:** `app/api/v1/files.py`

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/pages/EquipmentPage.tsx` | frontend | Replace hardcoded document list (lines 209-214) with dynamic API fetch and rendering |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/pages/EquipmentPage.tsx` | Existing equipment data fetching pattern (shows how to fetch data for the drawer) |
| Other frontend pages that fetch lists | API integration pattern with axios, loading/error/empty states |
| Material-UI ListItem components in codebase | Proper ListItem rendering patterns |

## Patterns to Follow

### API Integration Pattern

The codebase likely uses axios for API calls. Follow this pattern:

```typescript
// Import axios or API client
import axios from 'axios';

// State management
const [files, setFiles] = useState<FileType[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Fetch files when drawer opens or equipment changes
useEffect(() => {
  const fetchFiles = async () => {
    if (!projectId || !equipmentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/projects/${projectId}/files`);
      setFiles(response.data);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchFiles();
}, [projectId, equipmentId]);
```

**Key Points:**
- Use TypeScript interfaces for type safety
- Handle loading, success, and error states
- Clean up async operations if component unmounts
- Extract projectId from URL params or context

### File List Rendering Pattern

Replace hardcoded ListItem with mapped components:

```typescript
{loading && <CircularProgress />}

{error && (
  <Alert severity="error">
    {error}
  </Alert>
)}

{!loading && !error && files.length === 0 && (
  <Typography variant="body2" color="textSecondary">
    No documents available
  </Typography>
)}

{!loading && !error && files.length > 0 && files.map((file) => (
  <ListItem key={file.id}>
    <ListItemText
      primary={file.name}
      secondary={`${file.file_type.toUpperCase()} - ${formatFileSize(file.size)}`}
    />
  </ListItem>
))}
```

**Key Points:**
- Conditional rendering based on state (loading, error, empty, success)
- Map over files array with unique keys
- Format file size and type to match current mock format
- Use Material-UI components consistently

### File Size Formatting

Create utility function to format bytes:

```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
```

## Requirements

### Functional Requirements

1. **Dynamic File Fetching**
   - Description: Fetch files from `/projects/{project_id}/files` when equipment drawer opens
   - Acceptance: API call is made with correct project_id, response data is stored in state

2. **File List Display**
   - Description: Display each file with its name and formatted size (matching format: "FILENAME - TYPE - SIZE")
   - Acceptance: File name appears as primary text, file type and size appear as secondary text

3. **Loading State**
   - Description: Show loading indicator while files are being fetched
   - Acceptance: CircularProgress or Skeleton components visible during API call

4. **Empty State**
   - Description: Display user-friendly message when no documents exist
   - Acceptance: "No documents available" or similar message shown when files array is empty

5. **Error Handling**
   - Description: Display error message if API call fails
   - Acceptance: Error message visible when API returns error, console logs error details

### Edge Cases

1. **Missing project_id** - Do not make API call if project_id is unavailable, show empty state
2. **Network timeout** - Show error message after timeout, allow retry mechanism
3. **Malformed API response** - Validate response structure, handle gracefully with error message
4. **Large file lists** - Consider pagination or virtualization if list exceeds 50+ files
5. **File size edge cases** - Handle 0 bytes, negative values, extremely large values

## Implementation Notes

### DO
- Follow the existing data fetching pattern in EquipmentPage.tsx for consistency
- Reuse any existing file list components if they exist elsewhere in the codebase
- Use TypeScript interfaces to define the File type structure
- Extract formatFileSize as a utility function (check if it exists in utils/)
- Get project_id from React Router params or existing component props
- Use Material-UI components that match the existing drawer style
- Test with various file sizes (bytes, KB, MB, GB) to ensure formatting works

### DON'T
- Create new API client if axios is already configured
- Duplicate file fetching logic - create reusable hook if needed elsewhere
- Remove existing drawer structure - only replace the hardcoded ListItem section
- Add file interaction features (download, preview) - out of scope
- Modify backend API endpoint - it already exists and works

## Development Environment

### Start Services

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

Check `.env.example` in frontend and backend directories for required variables. Typically:

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `STORAGE_BACKEND`: File storage configuration

**Frontend:**
- `VITE_API_URL`: Backend API base URL (likely http://localhost:8000)

### Testing the Fix

1. Navigate to Equipment page in the frontend
2. Open the equipment details drawer
3. Verify the "Documents" section shows actual files from the database
4. If no files exist for the equipment, verify empty state is shown
5. Check console for any errors

## Success Criteria

The task is complete when:

1. [ ] Hardcoded "Technical Specifications" mock data is removed
2. [ ] Files are dynamically fetched from `/projects/{project_id}/files` API
3. [ ] File list displays actual file names and formatted sizes
4. [ ] Loading state is shown during API fetch
5. [ ] Empty state is shown when no documents exist
6. [ ] Error state is shown if API call fails
7. [ ] No console errors when opening equipment drawer
8. [ ] Existing equipment drawer functionality still works
9. [ ] File size formatting works for various file sizes (KB, MB, GB)
10. [ ] TypeScript types are properly defined for file objects

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| File size formatting | `frontend/src/utils/formatFileSize.test.ts` (create if needed) | Correctly formats bytes, KB, MB, GB |
| Component renders files | `frontend/src/pages/EquipmentPage.test.tsx` | Files list renders when data is available |
| Component shows empty state | `frontend/src/pages/EquipmentPage.test.tsx` | Empty state message appears when files array is empty |
| Component shows error state | `frontend/src/pages/EquipmentPage.test.tsx` | Error message appears when API call fails |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Files API returns data | frontend ↔ backend | GET /projects/{id}/files returns valid file array |
| Files display in drawer | frontend ↔ backend | Fetched files appear in equipment drawer UI |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View equipment documents | 1. Navigate to equipment page 2. Click equipment item 3. Drawer opens | Documents section shows actual files from database |
| Empty documents state | 1. Open equipment with no files | "No documents available" message displays |
| Documents load async | 1. Open equipment drawer | Loading indicator shows briefly, then files appear |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Equipment Page | `http://localhost:3000/projects/{id}/equipment` | Equipment list loads correctly |
| Equipment Drawer | Open drawer by clicking equipment | Documents section present and functional |
| Documents List | Scroll to "Documents" section | Files display with correct names and sizes |
| Empty State | Equipment with no files | Empty state message visible |
| Error State | Disconnect backend | Error message appears gracefully |

### API Verification
| Check | Endpoint/Command | Expected |
|-------|------------------|----------|
| Files endpoint exists | `curl http://localhost:8000/projects/1/files` | Returns JSON array of files |
| Response structure | Check API response | Contains id, name, size, file_type fields |
| Authentication | Test API without auth | Works (requires_auth: false in project_index) |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Files table exists | Connect to DB and query files table | Table contains file records |
| Project files relationship | Query files for test project | Files are properly associated with projects |

### QA Sign-off Requirements
- [ ] All unit tests pass (create tests if they don't exist)
- [ ] Files API integration works correctly
- [ ] Equipment drawer displays actual files from database
- [ ] Loading state appears during data fetch
- [ ] Empty state appears when no files exist
- [ ] Error handling works when API fails
- [ ] File sizes are formatted correctly (KB, MB, GB)
- [ ] No regressions in existing equipment drawer functionality
- [ ] No console errors in browser
- [ ] TypeScript compilation succeeds with no errors
- [ ] Code follows existing patterns in EquipmentPage.tsx
- [ ] No security vulnerabilities introduced (API calls use proper project scoping)

## API Contract

### GET /projects/{project_id}/files

**Request:**
```
GET /projects/{project_id}/files
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "Technical Specifications.pdf",
    "file_type": "pdf",
    "size": 2515456,
    "project_id": 1,
    "uploaded_at": "2024-01-15T10:30:00Z",
    "uploaded_by": 1
  },
  {
    "id": 2,
    "name": "Equipment Manual.docx",
    "file_type": "docx",
    "size": 1048576,
    "project_id": 1,
    "uploaded_at": "2024-01-16T14:20:00Z",
    "uploaded_by": 2
  }
]
```

**Error Response:**
```json
{
  "detail": "Project not found"
}
```

**TypeScript Interface:**
```typescript
interface ProjectFile {
  id: number;
  name: string;
  file_type: string;
  size: number; // in bytes
  project_id: number;
  uploaded_at: string;
  uploaded_by: number;
}
```

## Notes

- **Priority Discrepancy**: Linear issue shows "High" priority but description mentions "Medium". Proceeding with High priority as specified in the ticket.
- The backend API endpoint already exists and is implemented in `app/api/v1/files.py`
- The changes are isolated to the Equipment drawer component - minimal risk of breaking other features
- Consider creating a reusable `useProjectFiles` hook if file lists are needed elsewhere in the application
- File download/preview functionality is intentionally out of scope for this bug fix

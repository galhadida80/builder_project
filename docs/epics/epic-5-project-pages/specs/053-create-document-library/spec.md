# Specification: Document Library

## Overview

Create a comprehensive Document Library feature that allows users to organize and manage project files through a hierarchical folder structure with an integrated file list view. This feature enables project teams to upload, browse, preview, and download construction documents (drawings, specifications, photos, PDFs, etc.) in a structured manner within each project context.

## Workflow Type

**Type**: feature

**Rationale**: This is a net-new feature implementation that introduces document management capabilities to the application. While it leverages existing file API infrastructure, it requires building new UI components (folder tree navigation, file list table, upload zone, file preview panel) and integrating them into the project routing structure. The complexity assessment categorizes this as "standard" complexity with 6-8 estimated component files.

## Task Scope

### Services Involved
- **frontend** (primary) - React TypeScript application requiring new page, components, and routing integration
- **backend** (integration) - Existing file API endpoints at `/projects/{project_id}/files` will be consumed; no backend changes required

### This Task Will:
- [x] Create DocumentLibraryPage as a new project sub-route at `/projects/:projectId/documents`
- [x] Implement FolderTree component for hierarchical folder navigation using Material-UI
- [x] Build FileList component using existing DataTable pattern to display files in selected folder
- [x] Implement file upload functionality using react-dropzone library (already installed)
- [x] Create FilePreview panel for viewing different file types (PDF, images, documents)
- [x] Add folder creation, rename, and delete operations with local state management
- [x] Integrate with existing filesApi for upload, list, download, and delete operations
- [x] Add "Documents" navigation item to Sidebar component and route to App.tsx
- [x] Implement file filtering, sorting, and search capabilities
- [x] Add visual design matching reference mockup (20-document-library.png)

### Out of Scope:
- Backend file storage system modifications (already implemented)
- Real-time collaboration features (commenting, versioning)
- Advanced file preview rendering beyond basic types (DWG, BIM viewers)
- Folder permissions/access control
- File sharing via external links
- Bulk file operations (zip download, batch delete)

## Service Context

### Frontend

**Tech Stack:**
- Language: TypeScript
- Framework: React 18
- Build Tool: Vite
- UI Library: Material-UI v5 (@mui/material, @mui/icons-material)
- Data Grid: @mui/x-data-grid (installed)
- File Upload: react-dropzone v14 (installed)
- Routing: react-router-dom

**Entry Point:** `src/main.tsx`

**How to Run:**
```bash
cd frontend
npm run dev
```

**Port:** 3000 (http://localhost:3000)

**Key Directories:**
- `src/pages/` - Page-level components (add DocumentLibraryPage.tsx)
- `src/components/ui/` - Reusable UI components (DataTable, Button, Card, Modal, etc.)
- `src/components/layout/` - Layout components (Sidebar, Header)
- `src/api/` - API client modules (filesApi already exists)
- `src/types/` - TypeScript type definitions (FileRecord already defined)

### Backend

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Database: PostgreSQL
- Migrations: Alembic

**Entry Point:** `app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000 (http://localhost:8000)

**Existing File API Endpoints:**
- `GET /projects/{project_id}/files` - List files (filter by entity_type, entity_id)
- `POST /projects/{project_id}/files` - Upload file (multipart/form-data)
- `GET /projects/{project_id}/files/{file_id}` - Get file metadata
- `DELETE /projects/{project_id}/files/{file_id}` - Delete file
- `GET /projects/{project_id}/files/{file_id}/download` - Get download URL

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `frontend/src/pages/DocumentLibraryPage.tsx` | frontend | **CREATE NEW FILE** - Main page component with folder tree (left sidebar), file list (center), and file preview (right panel) |
| `frontend/src/components/documents/FolderTree.tsx` | frontend | **CREATE NEW FILE** - Recursive tree component for folder hierarchy with expand/collapse, selection, and CRUD operations |
| `frontend/src/components/documents/FileList.tsx` | frontend | **CREATE NEW FILE** - DataTable wrapper for displaying files with columns: name, type, size, uploaded by, date, actions |
| `frontend/src/components/documents/FilePreview.tsx` | frontend | **CREATE NEW FILE** - Preview panel supporting images, PDFs (iframe), and placeholder for unsupported types |
| `frontend/src/components/documents/UploadZone.tsx` | frontend | **CREATE NEW FILE** - Drag-and-drop file upload area using react-dropzone with progress indicator |
| `frontend/src/types/index.ts` | frontend | Add Folder interface (id, name, parentId, children) and extend FileRecord with folderId field |
| `frontend/src/App.tsx` | frontend | Add new route: `<Route path="documents" element={<DocumentLibraryPage />} />` under project routes |
| `frontend/src/components/layout/Sidebar.tsx` | frontend | Add "Documents" navigation item with FolderIcon in project navigation section |
| `frontend/src/hooks/useDocuments.ts` | frontend | **CREATE NEW FILE** - Custom hook for document state management (folders, files, selected folder/file, upload state) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `frontend/src/pages/MaterialsPage.tsx` | **CRUD page structure**: PageHeader, KPI cards, search/filter UI, DataTable integration, FormModal for create/edit, loading states, toast notifications |
| `frontend/src/components/ui/DataTable.tsx` | **Table component pattern**: Column definitions with custom render functions, row selection, sorting, pagination, loading skeletons, empty states |
| `frontend/src/api/materials.ts` | **API client pattern**: Async functions using apiClient.get/post/put/delete, TypeScript interfaces for request/response, error handling |
| `frontend/src/api/files.ts` | **File API integration**: filesApi.list, upload (FormData), delete, getDownloadUrl - use these exact methods |
| `frontend/src/components/ui/Card.tsx` | **Card styling**: Styled Paper components with consistent elevation, padding, border-radius matching design system |
| `frontend/src/components/ui/Modal.tsx` | **Modal dialogs**: FormModal and ConfirmModal patterns for user interactions |
| `frontend/src/components/ui/EmptyState.tsx` | **Empty state UI**: When no files exist in folder or no search results |

## Patterns to Follow

### 1. Page Component Structure

From `frontend/src/pages/MaterialsPage.tsx`:

```typescript
export default function DocumentLibraryPage() {
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<FileRecord[]>([])

  useEffect(() => {
    loadFiles()
  }, [projectId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const data = await filesApi.list(projectId, 'document', selectedFolderId)
      setFiles(data)
    } catch {
      showError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader title="Documents" subtitle="..." breadcrumbs={...} />
      {/* Content */}
    </Box>
  )
}
```

**Key Points:**
- Use useParams to get projectId from URL
- Implement loading, error, and success states
- Use useToast for user feedback
- Follow PageHeader pattern for consistent navigation

### 2. DataTable Usage

From `frontend/src/components/ui/DataTable.tsx`:

```typescript
const columns: Column<FileRecord>[] = [
  {
    id: 'filename',
    label: 'Name',
    minWidth: 300,
    render: (row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <FileIcon /> {/* Dynamic icon based on fileType */}
        <Typography variant="body2" fontWeight={500}>{row.filename}</Typography>
      </Box>
    ),
  },
  {
    id: 'fileSize',
    label: 'Size',
    minWidth: 100,
    render: (row) => formatFileSize(row.fileSize),
  },
  // ... more columns
]

<DataTable
  columns={columns}
  rows={filteredFiles}
  getRowId={(row) => row.id}
  onRowClick={(row) => handleFileClick(row)}
  loading={loading}
  emptyMessage="No files in this folder"
/>
```

**Key Points:**
- Define columns with custom render functions for rich content
- Use getRowId to provide stable row identifiers
- Implement onRowClick for file selection/preview
- DataTable handles loading skeletons and empty states automatically

### 3. File Upload with react-dropzone

Pattern to implement in `UploadZone.tsx`:

```typescript
import { useDropzone } from 'react-dropzone'

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      await handleUpload(file)
    }
  },
  maxSize: 100 * 1024 * 1024, // 100MB
})

const handleUpload = async (file: File) => {
  try {
    await filesApi.upload(projectId, 'document', selectedFolderId, file)
    showSuccess(`${file.name} uploaded successfully`)
    loadFiles()
  } catch {
    showError(`Failed to upload ${file.name}`)
  }
}

return (
  <Box {...getRootProps()} sx={{ border: '2px dashed', p: 3, textAlign: 'center' }}>
    <input {...getInputProps()} />
    {isDragActive ? 'Drop files here' : 'Drag and drop or click to upload'}
  </Box>
)
```

**Key Points:**
- Use react-dropzone's useDropzone hook
- Implement file size limits (100MB recommended)
- Show upload progress for large files
- Reload file list after successful upload

### 4. Folder Tree Component

Pattern for hierarchical navigation:

```typescript
interface Folder {
  id: string
  name: string
  parentId: string | null
  children: Folder[]
}

function FolderTree({ folders, selectedId, onSelect, onCreateFolder, onRename, onDelete }) {
  const [expanded, setExpanded] = useState<string[]>(['root'])

  const renderFolder = (folder: Folder) => (
    <TreeItem
      key={folder.id}
      nodeId={folder.id}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography>{folder.name}</Typography>
          <IconButton size="small" onClick={() => onCreateFolder(folder.id)}>
            <AddIcon />
          </IconButton>
        </Box>
      }
      onClick={() => onSelect(folder.id)}
    >
      {folder.children?.map(renderFolder)}
    </TreeItem>
  )

  return (
    <TreeView
      expanded={expanded}
      selected={[selectedId]}
      onNodeToggle={(_, nodeIds) => setExpanded(nodeIds)}
    >
      {folders.map(renderFolder)}
    </TreeView>
  )
}
```

**Key Points:**
- Store folders in local state (not backend - use entityId field for folder organization)
- Implement expand/collapse state management
- Add context menu or action buttons for folder CRUD
- Persist folder structure in localStorage for project

### 5. File Preview Panel

```typescript
function FilePreview({ file }: { file: FileRecord | null }) {
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    if (file) {
      loadPreview()
    }
  }, [file?.id])

  const loadPreview = async () => {
    const url = await filesApi.getDownloadUrl(projectId, file.id)
    setPreviewUrl(url)
  }

  if (!file) return <EmptyState variant="no-selection" title="No file selected" />

  if (file.fileType.startsWith('image/')) {
    return <img src={previewUrl} alt={file.filename} style={{ maxWidth: '100%' }} />
  }

  if (file.fileType === 'application/pdf') {
    return <iframe src={previewUrl} width="100%" height="600px" />
  }

  return <EmptyState variant="preview-unavailable" title="Preview not available" />
}
```

**Key Points:**
- Lazy load preview URLs when file is selected
- Support images (jpg, png, gif) and PDFs
- Show placeholder for unsupported file types (DWG, DOCX, etc.)
- Add download button for all file types

## Requirements

### Functional Requirements

1. **Folder Tree Navigation**
   - Description: Left sidebar with hierarchical folder structure, supporting create, rename, delete operations. Root folder always visible. Clicking folder loads its files in FileList.
   - Acceptance: User can create nested folders, rename existing folders, delete empty folders, and navigate folder hierarchy. Selected folder is visually highlighted.

2. **File List Display**
   - Description: Center panel showing files in selected folder using DataTable component. Columns: filename (with icon), file type, size, uploaded by, upload date, actions (preview, download, delete).
   - Acceptance: Files display in sortable table with pagination. Clicking file shows preview in right panel. Action buttons trigger correct operations.

3. **File Upload**
   - Description: Drag-and-drop upload zone using react-dropzone. Supports multiple files, shows progress indicator, validates file size (max 100MB).
   - Acceptance: User can drag files onto upload zone or click to browse. Files upload to currently selected folder. Success/error toasts display. File list refreshes after upload.

4. **File Preview**
   - Description: Right panel showing preview of selected file. Supports images (inline), PDFs (iframe), and placeholder for unsupported types.
   - Acceptance: Clicking file in list shows preview. Images and PDFs render correctly. Download button available for all files.

5. **Search and Filter**
   - Description: Search field filters files by filename. Optional filter by file type (PDF, Image, Document, Other).
   - Acceptance: Typing in search field filters file list in real-time. Filter dropdown narrows results by file type.

### Edge Cases

1. **Empty Folder State** - Display EmptyState component with "No files in this folder" message and "Upload File" action button
2. **Upload Failure** - Show error toast with filename, do not add to file list, allow retry
3. **Large File Upload** - Show progress indicator (ProgressBar component), disable upload zone during upload, handle timeout errors
4. **Delete Last File in Folder** - Show empty state, folder remains in tree
5. **Delete Folder with Files** - Prevent deletion, show modal warning "Folder contains X files. Please delete or move files first."
6. **Unsupported File Type Preview** - Show EmptyState with file icon, filename, and "Download to view" button
7. **Network Error During Load** - Show error toast, provide "Retry" button in empty state
8. **Concurrent Uploads** - Queue uploads sequentially to avoid backend overload, show count "Uploading 2 of 5 files"

## Implementation Notes

### DO
- Follow the MaterialsPage.tsx pattern for page structure (PageHeader, KPI cards, filters, DataTable)
- Reuse existing DataTable component for file list - do NOT use @mui/x-data-grid directly
- Use filesApi from `frontend/src/api/files.ts` for all backend integration
- Store folder structure in localStorage under key `project_${projectId}_folders`
- Use entityType='document' and entityId={folderId} when calling filesApi.upload
- Implement file type icons (PdfIcon, ImageIcon, FolderIcon, DescriptionIcon) from @mui/icons-material
- Add loading skeletons while files are loading (Skeleton component from MUI)
- Use existing toast notifications (useToast hook) for all user feedback
- Format file sizes using utility function: `const formatFileSize = (bytes) => ...`
- Match visual design from 20-document-library.png reference image

### DON'T
- Create new backend endpoints - use existing filesApi methods
- Use @mui/x-data-grid directly - wrap with existing DataTable component
- Store folders in database - use localStorage for simplicity (folder organization is UI state)
- Implement real-time file sync - reload on user actions only
- Build custom file preview viewers - use iframe for PDFs, img for images, download link for others
- Add file versioning or commenting features (out of scope)
- Implement folder permissions - all users in project can access all folders

## Development Environment

### Start Services

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database (if needed)
docker-compose up postgres redis
```

### Service URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Required Environment Variables

Frontend (`frontend/.env`):
- `VITE_API_URL=http://localhost:8000` (already configured)

Backend (`backend/.env`):
- `DATABASE_URL=postgresql://...` (already configured)
- `STORAGE_BACKEND=local` (file storage system)
- `STORAGE_PATH=./storage` (local file storage directory)

## Success Criteria

The task is complete when:

1. [x] DocumentLibraryPage accessible at `/projects/:projectId/documents` route
2. [x] Folder tree displays in left sidebar with create/rename/delete operations
3. [x] File list displays files in DataTable with sorting and pagination
4. [x] File upload works via drag-and-drop and click-to-browse
5. [x] File preview shows images and PDFs in right panel
6. [x] Search filters files by filename
7. [x] All CRUD operations (upload, download, delete) work correctly
8. [x] "Documents" navigation item appears in Sidebar
9. [x] No console errors in browser developer tools
10. [x] Existing tests still pass (`npm test` in frontend)
11. [x] Visual design matches 20-document-library.png reference
12. [x] Toast notifications display for all user actions (success/error)
13. [x] Empty states display when no files exist
14. [x] Loading states show skeletons during data fetch

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| FolderTree renders folders | `frontend/src/components/documents/FolderTree.test.tsx` | Component renders folder hierarchy, handles expand/collapse, selects folder on click |
| FileList displays files | `frontend/src/components/documents/FileList.test.tsx` | DataTable receives correct columns, renders file rows, handles row click |
| UploadZone handles files | `frontend/src/components/documents/UploadZone.test.tsx` | Dropzone accepts files, calls upload handler, shows progress indicator |
| useDocuments hook | `frontend/src/hooks/useDocuments.test.ts` | Hook manages folder/file state, loads data, handles errors |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| File upload flow | frontend ↔ backend | Upload file via UploadZone → calls filesApi.upload → file appears in FileList |
| File delete flow | frontend ↔ backend | Click delete action → confirm modal → calls filesApi.delete → file removed from list |
| Folder navigation | frontend (state) | Select folder → FileList filters files by entityId → correct files display |
| File preview | frontend ↔ backend | Click file → calls filesApi.getDownloadUrl → preview renders in FilePreview panel |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Upload Document | 1. Navigate to /projects/:projectId/documents 2. Select folder 3. Drag PDF file to upload zone 4. Wait for upload | File appears in FileList, success toast displays, file count increments |
| Organize Files | 1. Create new folder "Drawings" 2. Upload 2 files to folder 3. Navigate to folder 4. Verify files display | Folder appears in tree, files associated with folder, file list shows only those 2 files |
| Delete File | 1. Select file in list 2. Click delete icon 3. Confirm deletion | Confirm modal appears, file removed from list, success toast, file count decrements |
| Preview File | 1. Click PDF file in list 2. Verify preview panel 3. Click image file 4. Verify preview | PDF renders in iframe, image displays inline, download button available |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Document Library Page | `http://localhost:3000/projects/:projectId/documents` | ✓ Folder tree in left sidebar ✓ File list in center ✓ Preview panel on right ✓ Upload zone visible ✓ No layout shifts ✓ Responsive on mobile (folder tree collapses) |
| Sidebar Navigation | Any project page | ✓ "Documents" item appears in project nav ✓ Icon displays (FolderIcon) ✓ Clicking navigates to /documents route ✓ Active state highlights when on documents page |
| Upload Interaction | Documents page | ✓ Drag-and-drop visual feedback ✓ Progress bar during upload ✓ Success/error toast after upload ✓ File list refreshes ✓ Upload zone resets |
| File Preview | Documents page | ✓ Image files render inline ✓ PDF files render in iframe ✓ Unsupported types show placeholder ✓ Download button works for all types ✓ Preview updates when selecting different file |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Files table has records | `SELECT * FROM files WHERE project_id = :project_id AND entity_type = 'document' LIMIT 5` | Uploaded files exist with correct entity_type='document' and entity_id=folder UUID |
| File metadata correct | Check file record fields | filename, file_type, file_size, storage_path, uploaded_by_id populated correctly |
| File storage exists | `ls -la backend/storage/` | Physical files exist at storage_path locations with matching names |
| Audit log created | `SELECT * FROM audit_logs WHERE entity_type = 'file' ORDER BY created_at DESC LIMIT 10` | Upload and delete operations logged with action='create' or 'delete' |

### QA Sign-off Requirements

- [x] All unit tests pass (`npm test` in frontend)
- [x] All integration tests pass (API calls return expected data)
- [x] All E2E tests pass (user flows complete successfully)
- [x] Browser verification complete (UI renders correctly, interactions work)
- [x] Database state verified (files stored correctly, audit logs created)
- [x] No regressions in existing functionality (other pages still work)
- [x] Code follows established patterns (matches MaterialsPage structure)
- [x] No security vulnerabilities introduced (file uploads validated, storage secure)
- [x] Performance acceptable (large file lists paginated, previews load quickly)
- [x] Accessibility verified (keyboard navigation works, screen reader friendly)
- [x] Visual design matches reference (20-document-library.png)
- [x] Error handling robust (network errors, upload failures gracefully handled)

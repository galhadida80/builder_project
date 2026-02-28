# Specification: Implement Local File Storage for Development, S3 for Production

## Overview

File uploads currently save only metadata to the database without actually persisting file content to storage. While the storage abstraction layer has been implemented in `backend/app/services/storage_service.py`, the feature needs verification, configuration, and thorough testing to ensure files are properly saved and can be retrieved from both local filesystem (development) and S3 (production) environments.

## Workflow Type

**Type**: feature

**Rationale**: This implements core file storage functionality with environment-based backend switching. While the abstraction layer exists, the task requires verification of the implementation, proper configuration setup, comprehensive testing, and potential bug fixes to ensure the feature works correctly in both environments.

## Task Scope

### Services Involved
- **backend** (primary) - FastAPI service containing file upload/download API endpoints and storage service

### This Task Will:
- [x] Verify existing storage service implementation (`LocalStorageBackend` and `S3StorageBackend`)
- [ ] Configure environment variables for storage backend switching
- [ ] Test file upload flow to ensure content is actually saved (not just metadata)
- [ ] Test file download flow to ensure files are correctly retrieved from storage
- [ ] Verify path structure follows hierarchical organization: `{user_id}/{project_id}/{entity_type}/{entity_id}/{filename}`
- [ ] Test environment switching between local and S3 storage
- [ ] Document configuration requirements for both environments

### Out of Scope:
- File versioning or revision history
- File compression or optimization
- CDN integration for production file serving
- File upload progress tracking
- Bulk file operations
- File preview generation (thumbnails, etc.)

## Service Context

### Backend

**Tech Stack:**
- Language: Python 3.11+
- Framework: FastAPI
- ORM: SQLAlchemy (async)
- Storage Libraries: boto3 (S3), aiofiles (async file I/O)
- Key directories:
  - `app/api/v1/` - API endpoints
  - `app/services/` - Business logic services
  - `app/models/` - Database models
  - `app/` - Configuration

**Entry Point:** `backend/app/main.py`

**How to Run:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Port:** 8000

**API Documentation:** http://localhost:8000/docs

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `backend/app/config.py` | backend | Verify storage configuration settings are properly defined (already exists) |
| `backend/.env.example` | backend | Add documentation for storage environment variables |
| `backend/app/services/storage_service.py` | backend | Review and fix any bugs in storage backend implementations |
| `backend/app/api/v1/files.py` | backend | Verify upload/download endpoints use storage service correctly |

## Files to Reference

These files show the current implementation:

| File | Pattern to Copy |
|------|----------------|
| `backend/app/services/storage_service.py` | Storage abstraction pattern with `LocalStorageBackend` and `S3StorageBackend` |
| `backend/app/config.py` | Configuration pattern using Pydantic Settings |
| `backend/app/api/v1/files.py` | File upload/download endpoint implementation |
| `backend/app/models/file.py` | File metadata model structure |

## Patterns to Follow

### Storage Backend Abstraction

From `backend/app/services/storage_service.py`:

```python
class StorageBackend(ABC):
    @abstractmethod
    async def save_file(self, file: UploadFile, storage_path: str) -> int:
        pass

    @abstractmethod
    async def delete_file(self, storage_path: str) -> None:
        pass

    @abstractmethod
    def get_file_url(self, storage_path: str) -> str:
        pass

    @abstractmethod
    async def get_file_content(self, storage_path: str) -> bytes:
        pass

def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.storage_type == "s3":
        return S3StorageBackend(...)
    return LocalStorageBackend(settings.local_storage_path)
```

**Key Points:**
- Abstract base class defines common interface
- Factory function switches between backends based on configuration
- Both backends implement the same interface for seamless switching

### Hierarchical Storage Path Generation

From `backend/app/services/storage_service.py`:

```python
def generate_storage_path(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    filename: str
) -> str:
    safe_filename = filename.replace(" ", "_")
    unique_prefix = uuid.uuid4().hex[:8]
    return f"{user_id}/{project_id}/{entity_type}/{entity_id}/{unique_prefix}_{filename}"
```

**Key Points:**
- Path structure ensures logical organization by user → project → entity type → entity → file
- Unique prefix prevents filename collisions
- Filename sanitization (spaces replaced with underscores)
- Consistent structure across both local and S3 storage

### Configuration with Pydantic Settings

From `backend/app/config.py`:

```python
class Settings(BaseSettings):
    storage_type: str = "local"  # or "s3"
    local_storage_path: str = "./uploads"

    s3_bucket_name: str = ""
    s3_region: str = "us-east-1"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""

    class Config:
        env_file = ".env"
```

**Key Points:**
- Defaults to local storage for development
- All S3 settings available for production configuration
- Uses `.env` file for environment-specific overrides

## Requirements

### Functional Requirements

1. **Local File Storage (Development)**
   - Description: Files must be saved to local filesystem when `storage_type = "local"`
   - Path: `./uploads/{user_id}/{project_id}/{entity_type}/{entity_id}/{unique_prefix}_{filename}`
   - Acceptance: Upload a file via POST `/projects/{project_id}/files`, verify file exists on disk at expected path

2. **S3 File Storage (Production)**
   - Description: Files must be uploaded to S3 bucket when `storage_type = "s3"`
   - Path: `s3://{bucket}/{user_id}/{project_id}/{entity_type}/{entity_id}/{unique_prefix}_{filename}`
   - Acceptance: Configure S3 credentials, upload file, verify object exists in S3 bucket

3. **File Upload with Metadata**
   - Description: Store both file content and metadata (filename, size, type, storage path) in database
   - Acceptance: After upload, database record contains correct metadata and storage_path field

4. **File Download**
   - Description: Download endpoint retrieves file from correct storage backend
   - For local: Serve file content directly via `/storage/{path}` endpoint
   - For S3: Return presigned URL valid for 1 hour
   - Acceptance: GET `/projects/{project_id}/files/{file_id}/download` returns file content or valid download URL

5. **Environment-Based Backend Switching**
   - Description: Storage backend automatically selected based on `storage_type` environment variable
   - Acceptance: Change `STORAGE_TYPE` env var, restart service, verify correct backend is used

6. **File Deletion**
   - Description: Delete both file content from storage and metadata from database
   - Acceptance: DELETE endpoint removes file from storage backend and database record

### Edge Cases

1. **Duplicate Filenames** - Unique prefix (UUID) prevents collisions when multiple files have same name
2. **Missing S3 Credentials** - Service should fail gracefully with clear error message if S3 configured but credentials missing
3. **Local Directory Permissions** - Ensure `./uploads` directory is writable; create with proper permissions if doesn't exist
4. **Large File Uploads** - FastAPI's default request size limits may need adjustment for large files
5. **S3 Bucket Doesn't Exist** - Should return clear error if configured S3 bucket is invalid or inaccessible
6. **File Not Found** - Download endpoint returns 404 when file metadata exists but storage file is missing
7. **Special Characters in Filenames** - Filename sanitization handles spaces and special characters safely

## Implementation Notes

### DO
- Use the existing `get_storage_backend()` factory function to get the appropriate storage backend
- Call `await storage.save_file(file, storage_path)` to save file content (not just metadata)
- Use `generate_storage_path()` utility to create consistent path structure
- Test both local and S3 backends thoroughly
- Check that `LocalStorageBackend` creates parent directories if they don't exist
- Verify S3 presigned URLs are accessible and valid
- Use async file operations (`aiofiles`) for local storage to avoid blocking
- Add proper error handling for storage failures

### DON'T
- Don't save only metadata without calling `storage.save_file()`
- Don't hardcode storage paths - use `generate_storage_path()`
- Don't skip environment variable configuration - this controls backend selection
- Don't assume local directories exist - ensure they're created
- Don't commit S3 credentials to repository - use environment variables only
- Don't serve S3 files through backend proxy - use presigned URLs for direct access

## Development Environment

### Start Services

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d db redis

# Start backend (from backend directory)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Run database migrations
alembic upgrade head
```

### Service URLs
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Database: postgresql://postgres:postgres@localhost:5432/builder_db

### Required Environment Variables

Create `backend/.env` file:

```bash
# Storage Configuration
STORAGE_TYPE=local  # Use "local" for development, "s3" for production
LOCAL_STORAGE_PATH=./uploads  # Path for local file storage

# S3 Configuration (required when STORAGE_TYPE=s3)
S3_BUCKET_NAME=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db
```

### Testing Environment Variables

For local testing:
```bash
export STORAGE_TYPE=local
export LOCAL_STORAGE_PATH=./uploads
```

For S3 testing (requires valid AWS credentials):
```bash
export STORAGE_TYPE=s3
export S3_BUCKET_NAME=builder-dev-uploads
export S3_REGION=us-east-1
export S3_ACCESS_KEY_ID=your-key
export S3_SECRET_ACCESS_KEY=your-secret
```

## Success Criteria

The task is complete when:

1. [ ] **Local storage verified**: File uploaded via API is saved to `./uploads/{user_id}/{project_id}/{entity_type}/{entity_id}/{filename}` on disk
2. [ ] **Database metadata verified**: File record in database contains correct `storage_path`, `file_size`, `file_type`, `filename`
3. [ ] **Local download works**: Can download previously uploaded file via GET `/projects/{project_id}/files/{file_id}/download`
4. [ ] **S3 storage verified**: With S3 configuration, file is uploaded to S3 bucket with correct path structure
5. [ ] **S3 download works**: S3 backend returns valid presigned URL that allows file download
6. [ ] **Environment switching works**: Can toggle between local and S3 by changing `STORAGE_TYPE` environment variable
7. [ ] **File deletion works**: DELETE endpoint removes file from storage backend (local filesystem or S3)
8. [ ] **No console errors**: No unhandled exceptions during upload/download operations
9. [ ] **Existing tests still pass**: No regressions introduced
10. [ ] **Configuration documented**: `.env.example` file documents all storage-related environment variables

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| `test_local_storage_save_file` | `backend/tests/test_storage_service.py` | LocalStorageBackend saves file to correct path and returns file size |
| `test_local_storage_get_file_content` | `backend/tests/test_storage_service.py` | LocalStorageBackend retrieves saved file content correctly |
| `test_local_storage_delete_file` | `backend/tests/test_storage_service.py` | LocalStorageBackend deletes file from filesystem |
| `test_generate_storage_path` | `backend/tests/test_storage_service.py` | Path generation follows correct structure with user_id/project_id/entity_type/entity_id/filename |
| `test_s3_storage_save_file` | `backend/tests/test_storage_service.py` | S3StorageBackend uploads file to S3 bucket (mocked) |
| `test_storage_backend_factory` | `backend/tests/test_storage_service.py` | get_storage_backend() returns correct backend based on settings |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| `test_upload_file_endpoint` | backend + database | POST /projects/{pid}/files saves file content and creates database record |
| `test_download_file_endpoint` | backend + database | GET /projects/{pid}/files/{fid}/download returns correct file or download URL |
| `test_serve_local_file_endpoint` | backend | GET /storage/{path} serves local file content with correct content type |
| `test_delete_file_endpoint` | backend + database | DELETE removes file from storage and database |
| `test_list_files_endpoint` | backend + database | GET /projects/{pid}/files returns all files with metadata including storage_path |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| **Upload and Download (Local)** | 1. Set STORAGE_TYPE=local<br>2. Upload file via API<br>3. Check file exists on disk<br>4. Download file via API<br>5. Verify content matches | File saved to ./uploads/{path}, database record created, download returns original content |
| **Upload and Download (S3)** | 1. Set STORAGE_TYPE=s3<br>2. Upload file via API<br>3. Check file exists in S3<br>4. Download file via API<br>5. Verify presigned URL works | File uploaded to S3, database record created, presigned URL allows download of original content |
| **Delete File (Local)** | 1. Upload file<br>2. Delete via API<br>3. Verify file removed from disk<br>4. Verify database record removed | File deleted from filesystem, metadata removed from database, download returns 404 |
| **Environment Switch** | 1. Upload file with local storage<br>2. Stop service<br>3. Change to S3<br>4. Upload different file<br>5. Verify both storage backends work | First file in local storage, second file in S3, both downloadable |

### Manual Browser Verification

| Component | URL | Checks |
|-----------|-----|--------|
| API Documentation | `http://localhost:8000/docs` | File upload/download endpoints documented and testable |
| Upload Endpoint | POST `http://localhost:8000/api/v1/projects/{pid}/files` | Accepts multipart/form-data with file, returns FileResponse with storage_path |
| Download Endpoint | GET `http://localhost:8000/api/v1/projects/{pid}/files/{fid}/download` | Returns download_url and filename |
| Storage Endpoint | GET `http://localhost:8000/api/v1/storage/{path}` | Serves local file content (only works with local storage) |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| File record exists | `SELECT * FROM files WHERE id = '{file_id}';` | Record has storage_path, file_size, file_type, uploaded_at, uploaded_by_id |
| Storage path format | `SELECT storage_path FROM files;` | Path follows pattern: {uuid}/{uuid}/{entity_type}/{uuid}/{prefix}_{filename} |
| File size recorded | `SELECT file_size FROM files WHERE id = '{file_id}';` | file_size > 0 and matches actual file size |

### Configuration Verification

| Check | File | Expected |
|-------|------|----------|
| Storage type setting | `backend/app/config.py` | `storage_type` field exists with default "local" |
| Local path setting | `backend/app/config.py` | `local_storage_path` field exists with default "./uploads" |
| S3 settings | `backend/app/config.py` | S3 bucket, region, access key, secret key fields exist |
| Environment file example | `backend/.env.example` | Documents all storage environment variables with descriptions |

### QA Sign-off Requirements

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass (both local and S3 if credentials available)
- [ ] Manual upload/download verified via API docs interface
- [ ] Database contains correct file metadata after upload
- [ ] Local storage: File exists on disk at correct path
- [ ] S3 storage: Presigned URL allows file download (if tested)
- [ ] Environment switching verified (can toggle between local/S3)
- [ ] File deletion removes both storage file and database record
- [ ] No regressions in existing file listing functionality
- [ ] Code follows established FastAPI patterns
- [ ] No security vulnerabilities (files served with proper auth checks)
- [ ] Configuration documented in .env.example
- [ ] Error handling works correctly (missing files return 404, invalid uploads return 400)

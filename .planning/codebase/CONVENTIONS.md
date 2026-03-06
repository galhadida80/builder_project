# Coding Conventions

**Analysis Date:** 2026-03-06

## Naming Patterns

**Files (Backend):**
- Models: `snake_case.py` singular noun (`app/models/area.py`, `app/models/equipment.py`)
- Schemas: `snake_case.py` matching model name (`app/schemas/area.py`, `app/schemas/equipment.py`)
- Services: `snake_case_service.py` (`app/services/area_structure_service.py`, `app/services/audit_service.py`)
- API routes: `snake_case.py` plural noun (`app/api/v1/areas.py`, `app/api/v1/contacts.py`)
- Migrations: `NNN_description.py` in `backend/alembic/versions/`

**Files (Frontend):**
- Pages: `PascalCase.tsx` with `Page` suffix (`src/pages/AreasPage.tsx`, `src/pages/EquipmentPage.tsx`)
- Components: `PascalCase.tsx` (`src/components/ui/DataTable.tsx`, `src/components/ui/Card.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (`src/hooks/useFormShake.ts`, `src/hooks/useDocuments.ts`)
- API modules: `camelCase.ts` (`src/api/areas.ts`, `src/api/equipment.ts`)
- Utils: `camelCase.ts` (`src/utils/validation.ts`, `src/utils/apiErrors.ts`)
- Types: `camelCase.ts` in `src/types/` directory (`src/types/index.ts`, `src/types/equipment.ts`)
- Tests: co-located `*.test.tsx` or `*.test.ts` next to source file
- Context: `PascalCase.tsx` with `Context` suffix (`src/contexts/AuthContext.tsx`)

**Functions (Backend):**
- `snake_case` for all functions and methods
- API endpoints: `async def list_areas()`, `async def create_area()`
- Services: `async def validate_area_hierarchy()`
- CRUD naming: `list_`, `get_`, `create_`, `update_`, `delete_`

**Functions (Frontend):**
- `camelCase` for functions and handlers
- React components: `PascalCase` function components (`function AreasPage()`)
- Event handlers: `handle` prefix (`handleSaveArea`, `handleOpenCreate`, `handleOpenEdit`)
- API methods: object literal with `list`, `get`, `create`, `update`, `delete` methods

**Variables (Backend):**
- `snake_case` for all variables
- DB columns: `snake_case` (`floor_number`, `area_code`, `created_at`)
- Constants: `UPPER_SNAKE_CASE` (`API_V1`, `FAKE_UUID`, `DEFAULT_HIERARCHY`)

**Variables (Frontend):**
- `camelCase` for all variables
- State: `[value, setValue]` pattern (`[loading, setLoading]`, `[areas, setAreas]`)
- Boolean state: descriptive adjective (`loading`, `saving`, `uploading`, `dialogOpen`)

**Types (Frontend):**
- Interfaces: `PascalCase` (`User`, `Project`, `ConstructionArea`)
- Type aliases: `PascalCase` (`UserRole`, `ApprovalStatus`, `Permission`)
- All interface fields use `camelCase` to match API camelCase responses

**Types (Backend):**
- Pydantic schemas: `PascalCase` with action suffix
  - Create: `AreaCreate`, `EquipmentCreate`
  - Update: `AreaUpdate`, `EquipmentUpdate`
  - Response: `AreaResponse`, `EquipmentResponse`
- SQLAlchemy models: `PascalCase` singular noun (`ConstructionArea`, `AreaProgress`)
- Enums: `PascalCase` with type suffix (`AreaStatus`, `AuditAction`)

## Code Style

**Formatting:**
- No Prettier configured for frontend (none detected)
- Backend: ruff with `line-length = 120`, target Python 3.11
- TypeScript: `strict: true` in tsconfig, but `noImplicitAny: false` and `noUnusedLocals: false`

**Linting:**
- Backend: `ruff` selecting `["E", "W", "F"]` rules
  - Ignores: E501 (line length), E712 (True/False comparison for SQLAlchemy), F841 (unused locals in tests)
  - Per-file: `__init__.py` ignores F401 (re-exports), tests ignore E402/F401
  - Config: `backend/ruff.toml`
- Frontend: ESLint with `@typescript-eslint/recommended` + `react-hooks/recommended`
  - `@typescript-eslint/no-unused-vars`: warn (args with `_` prefix ignored)
  - `@typescript-eslint/no-explicit-any`: warn
  - `react-refresh/only-export-components`: warn
  - Config: `frontend/.eslintrc.cjs`

**File Size Limit:**
- Every file must be under 300 lines (enforced in CI via `find` + `awk` check)
- If exceeding, split into separate files

## Import Organization

**Backend:**
1. Standard library (`import uuid`, `from datetime import datetime`)
2. Third-party (`from fastapi import ...`, `from sqlalchemy import ...`)
3. Internal app modules (`from app.models.area import ...`, `from app.services.audit_service import ...`)
- Use `from __future__ import annotations` at top of schema and model files

**Frontend:**
1. React/framework (`import { useState, useEffect } from 'react'`)
2. Router (`import { useParams, useNavigate } from 'react-router-dom'`)
3. i18n (`import { useTranslation } from 'react-i18next'`)
4. Internal UI components (`import { Card } from '../components/ui/Card'`)
5. API modules (`import { areasApi } from '../api/areas'`)
6. Types (`import type { ConstructionArea } from '../types'`)
7. Utils and hooks
8. MUI/Icons via barrel files (`import { Box, Typography } from '@/mui'`, `import { AddIcon } from '@/icons'`)

**Path Aliases:**
- `@/` maps to `src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- `@/mui` barrel file re-exports all MUI components from `src/mui.ts`
- `@/icons` barrel file re-exports all MUI icons from `src/icons.ts`

## CamelCase Response Convention (CRITICAL)

**Backend response schemas** extend `CamelCaseModel` (defined in `backend/app/core/validators.py`):
```python
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )
```

**Rule:** All response schemas extend `CamelCaseModel`. All create/update schemas extend plain `BaseModel`.
- Response: `equipment_type` -> JSON `equipmentType`
- Request: accepts `snake_case` field names in JSON body
- Frontend interfaces MUST use `camelCase` property names to match API responses

## Error Handling

**Backend:**
- Raise `HTTPException` with appropriate status codes (400, 404, 403)
- 404 errors use localized messages via `translate_message()` from `app/utils/localization.py`
- Validation handled by Pydantic schemas with `field_validator` decorators
- Input sanitization via `sanitize_string()` in `app/core/validators.py` (strips XSS patterns)
- 422 responses auto-generated by FastAPI for Pydantic validation failures

**Frontend:**
- try/catch in async handlers with toast notifications (`showError()`, `showSuccess()`)
- Parse 422 validation errors via `parseValidationErrors()` from `src/utils/apiErrors.ts`
- Client-side validation functions in `src/utils/validation.ts` run before API calls
- Form shake animation on validation failure via `useFormShake` hook
- Global 401 interceptor in `src/api/client.ts` triggers logout

## API Client Pattern

**Backend endpoints follow this signature pattern:**
```python
@router.post("/projects/{project_id}/areas", response_model=AreaResponse)
async def create_area(
    project_id: UUID,
    data: AreaCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
```

**Frontend API modules follow this object pattern:**
```typescript
export const areasApi = {
  list: async (projectId: string): Promise<ConstructionArea[]> => {
    const response = await apiClient.get(`/projects/${projectId}/areas`)
    return response.data
  },
  create: async (projectId: string, data: AreaCreate): Promise<ConstructionArea> => {
    const response = await apiClient.post(`/projects/${projectId}/areas`, data)
    return response.data
  },
}
```

## State Management

**Pattern:** React Context providers, no Redux/Zustand
- `AuthContext` (`src/contexts/AuthContext.tsx`): user state, login/logout
- `ProjectContext` (`src/contexts/ProjectContext.tsx`): selected project
- `ReferenceDataContext` (`src/contexts/ReferenceDataContext.tsx`): shared reference data
- `NetworkContext` (`src/contexts/NetworkContext.tsx`): online/offline status

**Local state:** `useState` for page-level state, no global state library
- Loading states per page: `loading`, `saving`, `deleting`
- Form data as a flat object: `useState({ name: '', areaCode: '', ... })`

## i18n

**Framework:** react-i18next
- Config: `src/i18n/config.ts`
- Locale files: `src/i18n/locales/he.json` (primary), `src/i18n/locales/en.json`
- Use `const { t } = useTranslation()` in every component
- All user-facing strings via `t('key.path')` -- no hardcoded text
- Write Hebrew translations FIRST, then English

## Logging

**Backend:** Python `logging` module
- Setup: `app/core/logging.py` with `RequestLoggingMiddleware`
- Pattern: `logger = logging.getLogger(__name__)` at module top
- Sentry integration for error tracking (configured in `app/main.py`)

**Frontend:** `console` (no structured logging framework)

## Comments

**When to Comment:**
- Docstrings on backend fixtures and complex functions
- JSDoc/TSDoc not used systematically in frontend
- Avoid excessive comments; add only for non-obvious logic (per project convention)

## Module Design

**Backend Exports:**
- Models: one file per domain entity, classes exported directly
- `__init__.py` files exist but are generally empty or used for re-exports

**Frontend Exports:**
- Pages: `export default function PageName()` (default exports)
- Components: named exports (`export function Card()`)
- API modules: named export of object literal (`export const areasApi = {...}`)
- Barrel files: `src/icons.ts` and `src/mui.ts` re-export MUI components with aliased names
- Types: `src/types/index.ts` exports all shared interfaces

## Validation Pattern

**Backend (Pydantic):**
- Use `Field()` with constraints (`min_length`, `max_length`, `ge`, `le`)
- `@field_validator` decorators for custom validation (sanitization, code format)
- Shared constants in `app/core/validators.py` (`MIN_NAME_LENGTH`, `MAX_NAME_LENGTH`, etc.)

**Frontend (manual + Zod):**
- Manual validation functions in `src/utils/validation.ts` matching backend constants
- `VALIDATION` object mirrors backend limits
- `sanitizeString()` mirrors backend `sanitize_string()` patterns
- Some forms use Zod schemas with `react-hook-form` (`@hookform/resolvers`)
- Others use manual `validate*Form()` functions returning error objects

## RBAC Pattern

**Backend:**
- Use `require_permission(Permission.CREATE)` as FastAPI dependency parameter
- Do NOT wrap in extra `Depends()` -- it already returns a dependency
- `check_permission()` for async manual checks where project_id is not in path
- `User.is_super_admin` bypasses all permission checks

**Frontend:**
- `usePermissions()` hook from `AuthContext`
- `PermissionGate` component for conditional rendering

---

*Convention analysis: 2026-03-06*

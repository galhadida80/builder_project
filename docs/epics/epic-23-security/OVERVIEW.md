# Epic 23: Security Enhancements

**Status:** COMPLETED
**Priority:** P0 - Critical
**Estimate:** 5 points (2 stories)
**Sprint:** 13

## Description

Multi-layer security enhancements: TOTP-based two-factor authentication, WebAuthn passkey support, and password reset flow with secure tokens.

## User Stories

See `docs/LINEAR_EPICS_STORIES.md` — US-23.1 through US-23.2.

## Audit Trail

### Models
- `backend/app/models/webauthn_credential.py` — WebAuthn credential storage (credential_id, public_key, sign_count, device_name, transports)
- `backend/app/models/user.py` — PasswordResetToken (inline), User fields: `totp_secret`, `two_factor_enabled`

### Schemas
- `backend/app/schemas/webauthn.py` — Register/Login begin/complete requests and responses

### Services
- `backend/app/core/webauthn_challenges.py` — Challenge management for WebAuthn registration/login

### API Endpoints
- `backend/app/api/v1/auth.py` — 2FA temp token creation/verification, WebAuthn register/login endpoints, password reset request/confirm, TOTP setup/verify

### Migrations
- `018` — `password_reset_tokens` table (user_id FK, token, expires_at, used_at)
- `027` — `webauthn_credentials` table
- `046` — `totp_secret` and `two_factor_enabled` columns on `users`

### Frontend
- `frontend/src/pages/LoginPage.tsx` — Login/Register with WebAuthn, 2FA, password reset
- `frontend/src/pages/ProfilePage.tsx` — WebAuthn credential management (load, register, delete)
- `frontend/src/pages/SettingsPage.tsx` — Security settings
- `frontend/src/api/auth.ts` — Auth API client with 2FA, WebAuthn, password reset methods

## Implementation Notes

- WebAuthn enables passwordless login with biometrics/hardware keys
- TOTP 2FA uses standard authenticator apps (Google Authenticator, etc.)
- Password reset tokens expire after a configurable period
- `User.is_super_admin` bypasses all permission checks

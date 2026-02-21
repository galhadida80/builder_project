import { apiClient } from './client'
import type { User } from '../types'

interface LoginResponse {
  accessToken: string
  tokenType: string
  user: {
    id: string
    email: string
    fullName: string | null
    phone: string | null
    company: string | null
    role: string | null
    isActive: boolean
    isSuperAdmin: boolean
    createdAt: string
    signatureUrl: string | null
  }
}

function transformUser(apiUser: LoginResponse['user']): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    fullName: apiUser.fullName || '',
    phone: apiUser.phone || undefined,
    company: apiUser.company || undefined,
    role: apiUser.role || undefined,
    isActive: apiUser.isActive,
    isSuperAdmin: apiUser.isSuperAdmin,
    createdAt: apiUser.createdAt,
    signatureUrl: apiUser.signatureUrl || undefined,
  }
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ accessToken: string; user: User }> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    return {
      accessToken: response.data.accessToken,
      user: transformUser(response.data.user),
    }
  },

  register: async (email: string, password: string, fullName: string, inviteToken?: string): Promise<{ accessToken: string; user: User }> => {
    const params = inviteToken ? { invite_token: inviteToken } : undefined
    const response = await apiClient.post<LoginResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
    }, { params })
    return {
      accessToken: response.data.accessToken,
      user: transformUser(response.data.user),
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<LoginResponse['user']>('/auth/me')
    return transformUser(response.data)
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email })
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, new_password: newPassword })
  },

  updateProfile: async (data: { full_name?: string; phone?: string; company?: string }): Promise<User> => {
    const response = await apiClient.put<LoginResponse['user']>('/auth/me', data)
    return transformUser(response.data)
  },

  uploadSignature: async (signatureDataUrl: string): Promise<User> => {
    const response = await apiClient.put<LoginResponse['user']>('/auth/me/signature', { signature_data: signatureDataUrl })
    return transformUser(response.data)
  },

  deleteSignature: async (): Promise<User> => {
    const response = await apiClient.delete<LoginResponse['user']>('/auth/me/signature')
    return transformUser(response.data)
  },

  webauthnRegisterBegin: async (deviceName = 'Device'): Promise<{ options: PublicKeyCredentialCreationOptions }> => {
    const response = await apiClient.post<{ options: Record<string, unknown> }>('/auth/webauthn/register/begin', { device_name: deviceName })
    return { options: parseCreationOptions(response.data.options) }
  },

  webauthnRegisterComplete: async (credential: PublicKeyCredential, deviceName = 'Device'): Promise<WebAuthnCredential> => {
    const attestation = credential.response as AuthenticatorAttestationResponse
    const body = {
      credential: {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(attestation.clientDataJSON),
          attestationObject: bufferToBase64url(attestation.attestationObject),
          transports: attestation.getTransports?.() || [],
        },
      },
      device_name: deviceName,
    }
    const response = await apiClient.post<WebAuthnCredential>('/auth/webauthn/register/complete', body)
    return response.data
  },

  webauthnLoginBegin: async (email: string): Promise<{ options: PublicKeyCredentialRequestOptions }> => {
    const response = await apiClient.post<{ options: Record<string, unknown> }>('/auth/webauthn/login/begin', { email })
    return { options: parseRequestOptions(response.data.options) }
  },

  webauthnLoginComplete: async (email: string, credential: PublicKeyCredential): Promise<{ accessToken: string; user: User }> => {
    const assertion = credential.response as AuthenticatorAssertionResponse
    const body = {
      email,
      credential: {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64url(assertion.clientDataJSON),
          authenticatorData: bufferToBase64url(assertion.authenticatorData),
          signature: bufferToBase64url(assertion.signature),
          userHandle: assertion.userHandle ? bufferToBase64url(assertion.userHandle) : null,
        },
      },
    }
    const response = await apiClient.post<LoginResponse>('/auth/webauthn/login/complete', body)
    return {
      accessToken: response.data.accessToken,
      user: transformUser(response.data.user),
    }
  },

  webauthnCheck: async (email: string): Promise<boolean> => {
    const response = await apiClient.get<{ hasCredentials: boolean }>(`/auth/webauthn/check?email=${encodeURIComponent(email)}`)
    return response.data.hasCredentials
  },

  webauthnListCredentials: async (): Promise<WebAuthnCredential[]> => {
    const response = await apiClient.get<WebAuthnCredential[]>('/auth/webauthn/credentials')
    return response.data
  },

  webauthnDeleteCredential: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/webauthn/credentials/${id}`)
  },
}

export interface WebAuthnCredential {
  id: string
  deviceName: string
  createdAt: string
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function parseCreationOptions(opts: Record<string, unknown>): PublicKeyCredentialCreationOptions {
  const o = opts as Record<string, any>
  return {
    ...o,
    challenge: base64urlToBuffer(o.challenge),
    user: { ...o.user, id: base64urlToBuffer(o.user.id) },
    excludeCredentials: (o.excludeCredentials || []).map((c: any) => ({
      ...c, id: base64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialCreationOptions
}

function parseRequestOptions(opts: Record<string, unknown>): PublicKeyCredentialRequestOptions {
  const o = opts as Record<string, any>
  return {
    ...o,
    challenge: base64urlToBuffer(o.challenge),
    allowCredentials: (o.allowCredentials || []).map((c: any) => ({
      ...c, id: base64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialRequestOptions
}

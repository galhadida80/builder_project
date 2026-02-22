import { apiClient } from '../api/client'

export interface OfflineAction {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  data?: unknown
  createdAt: string
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
  error?: string
}

const DB_NAME = 'builderops_offline'
const STORE_NAME = 'actions'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const offlineQueue = {
  enqueue: async (action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> => {
    const db = await openDB()
    const id = crypto.randomUUID()
    const entry: OfflineAction = {
      ...action,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(entry)
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('offline-queue-change'))
        resolve(id)
      }
      tx.onerror = () => reject(tx.error)
    })
  },

  getAll: async (): Promise<OfflineAction[]> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  remove: async (id: string): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(id)
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('offline-queue-change'))
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  },

  update: async (id: string, updates: Partial<OfflineAction>): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const existing = getReq.result
        if (existing) {
          store.put({ ...existing, ...updates })
        }
      }
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('offline-queue-change'))
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  },

  syncAll: async (): Promise<{ synced: number; failed: number }> => {
    const actions = await offlineQueue.getAll()
    const pending = actions.filter(a => a.status === 'pending' || a.status === 'failed')
    let synced = 0
    let failed = 0

    for (const action of pending) {
      try {
        await offlineQueue.update(action.id, { status: 'syncing' })
        const method = action.method.toLowerCase()
        if (method === 'delete') {
          await apiClient.delete(action.url)
        } else {
          await apiClient[method as 'post' | 'put' | 'patch'](action.url, action.data as Record<string, unknown>)
        }
        await offlineQueue.remove(action.id)
        synced++
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        await offlineQueue.update(action.id, {
          status: 'failed',
          retryCount: action.retryCount + 1,
          error: errMsg,
        })
        failed++
      }
    }

    window.dispatchEvent(new CustomEvent('offline-queue-change'))
    return { synced, failed }
  },

  count: async (): Promise<number> => {
    const actions = await offlineQueue.getAll()
    return actions.filter(a => a.status !== 'syncing').length
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineQueue.syncAll()
  })
}

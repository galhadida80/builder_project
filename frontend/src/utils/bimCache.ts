import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'bim-viewer-cache'
const DB_VERSION = 1
const STORE_NAME = 'models'
const TTL_DAYS = 7
const MAX_CACHE_SIZE_MB = 500

interface CachedModel {
  urn: string
  versionHash: string
  modelData: unknown
  viewerState?: unknown
  timestamp: number
  size: number
}

interface CacheStats {
  totalSize: number
  itemCount: number
  oldestTimestamp: number | null
  newestTimestamp: number | null
}

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp')
      }
    },
  })

  return dbInstance
}

function generateCacheKey(urn: string, versionHash: string): string {
  return `${urn}:${versionHash}`
}

function isExpired(timestamp: number): boolean {
  const now = Date.now()
  const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000
  return now - timestamp > ttlMs
}

async function enforceSizeLimit(db: IDBPDatabase): Promise<void> {
  const stats = await getCacheStats()

  if (stats.totalSize <= MAX_CACHE_SIZE_MB * 1024 * 1024) return

  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('timestamp')

  let cursor = await index.openCursor()

  while (cursor && stats.totalSize > MAX_CACHE_SIZE_MB * 1024 * 1024 * 0.8) {
    const entry = cursor.value as { data: CachedModel }
    stats.totalSize -= entry.data.size
    await cursor.delete()
    cursor = await cursor.continue()
  }

  await tx.done
}

export async function getCachedModel(
  urn: string,
  versionHash: string
): Promise<{ modelData: unknown; viewerState?: unknown } | null> {
  try {
    const db = await getDB()
    const key = generateCacheKey(urn, versionHash)
    const entry = await db.get(STORE_NAME, key) as { key: string; data: CachedModel } | undefined

    if (!entry) return null

    if (isExpired(entry.data.timestamp)) {
      await db.delete(STORE_NAME, key)
      return null
    }

    return {
      modelData: entry.data.modelData,
      viewerState: entry.data.viewerState,
    }
  } catch (error) {
    console.error('Failed to get cached model:', error)
    return null
  }
}

export async function cacheModel(
  urn: string,
  versionHash: string,
  modelData: unknown,
  viewerState?: unknown
): Promise<void> {
  try {
    const db = await getDB()
    const key = generateCacheKey(urn, versionHash)

    const dataStr = JSON.stringify({ modelData, viewerState })
    const size = new Blob([dataStr]).size

    const cachedModel: CachedModel = {
      urn,
      versionHash,
      modelData,
      viewerState,
      timestamp: Date.now(),
      size,
    }

    await db.put(STORE_NAME, { key, data: cachedModel })
    await enforceSizeLimit(db)
  } catch (error) {
    console.error('Failed to cache model:', error)
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear(STORE_NAME)
  } catch (error) {
    console.error('Failed to clear cache:', error)
  }
}

export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const entries = await store.getAll() as Array<{ key: string; data: CachedModel }>

    let totalSize = 0
    let oldestTimestamp: number | null = null
    let newestTimestamp: number | null = null

    for (const entry of entries) {
      totalSize += entry.data.size

      if (oldestTimestamp === null || entry.data.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.data.timestamp
      }

      if (newestTimestamp === null || entry.data.timestamp > newestTimestamp) {
        newestTimestamp = entry.data.timestamp
      }
    }

    await tx.done

    return {
      totalSize,
      itemCount: entries.length,
      oldestTimestamp,
      newestTimestamp,
    }
  } catch (error) {
    console.error('Failed to get cache stats:', error)
    return {
      totalSize: 0,
      itemCount: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
    }
  }
}

import { apiClient } from '../api/client';

export interface SyncQueueItem {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  timestamp: number;
}

const STORAGE_KEY = 'builderops-sync-queue';

export function addToSyncQueue(action: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
  const queue = getSyncQueue();
  const item: SyncQueueItem = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  queue.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const queue = getSyncQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      await apiClient.request({
        method: item.method,
        url: item.url,
        data: item.body,
      });
      success++;
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { success, failed };
}

export function clearSyncQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

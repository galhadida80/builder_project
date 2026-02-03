import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface NetworkContextType {
  isOnline: boolean
  syncStatus: SyncStatus
  updateSyncStatus: (status: SyncStatus) => void
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return context
}

interface NetworkProviderProps {
  children: ReactNode
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const isOnline = useNetworkStatus()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  const updateSyncStatus = useCallback((status: SyncStatus) => {
    setSyncStatus(status)
  }, [])

  const value = useMemo(() => ({
    isOnline,
    syncStatus,
    updateSyncStatus,
  }), [isOnline, syncStatus, updateSyncStatus])

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}

import { render, renderHook, act } from '@testing-library/react'
import { NetworkProvider, useNetwork } from './NetworkContext'
import { ReactNode } from 'react'

describe('NetworkContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NetworkProvider>{children}</NetworkProvider>
  )

  it('provides default values', () => {
    const { result } = renderHook(() => useNetwork(), { wrapper })

    expect(result.current.isOnline).toBe(navigator.onLine)
    expect(result.current.syncStatus).toBe('idle')
    expect(typeof result.current.updateSyncStatus).toBe('function')
  })

  it('throws error when useNetwork called outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useNetwork())
    }).toThrow('useNetwork must be used within a NetworkProvider')

    consoleSpy.mockRestore()
  })

  it('updates sync status when updateSyncStatus is called', () => {
    const { result } = renderHook(() => useNetwork(), { wrapper })

    expect(result.current.syncStatus).toBe('idle')

    act(() => {
      result.current.updateSyncStatus('syncing')
    })

    expect(result.current.syncStatus).toBe('syncing')

    act(() => {
      result.current.updateSyncStatus('synced')
    })

    expect(result.current.syncStatus).toBe('synced')

    act(() => {
      result.current.updateSyncStatus('error')
    })

    expect(result.current.syncStatus).toBe('error')
  })

  it('isOnline value updates when network status changes', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper })

    const initialOnlineState = result.current.isOnline

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(result.current.isOnline).toBe(true)
  })

  it('provides stable reference for updateSyncStatus function', () => {
    const { result, rerender } = renderHook(() => useNetwork(), { wrapper })

    const firstUpdateFn = result.current.updateSyncStatus

    rerender()

    const secondUpdateFn = result.current.updateSyncStatus

    expect(firstUpdateFn).toBe(secondUpdateFn)
  })
})

import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from './useNetworkStatus'

describe('useNetworkStatus', () => {
  it('returns initial online status from navigator.onLine', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(navigator.onLine)
  })

  it('updates status when going offline', async () => {
    const { result } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    // Wait for debounce (500ms)
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(result.current).toBe(false)
  })

  it('updates status when going online', async () => {
    const { result } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    // Wait for debounce (500ms)
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(result.current).toBe(true)
  })

  it('debounces rapid network state changes', async () => {
    const { result } = renderHook(() => useNetworkStatus())
    const initialState = result.current

    // Rapidly toggle network state
    act(() => {
      window.dispatchEvent(new Event('offline'))
      window.dispatchEvent(new Event('online'))
      window.dispatchEvent(new Event('offline'))
    })

    // Wait less than debounce time
    await new Promise(resolve => setTimeout(resolve, 300))

    // State should still be changing (debounced)
    // Only the last event should take effect after full debounce

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(result.current).toBe(false)
  })

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useNetworkStatus())

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('clears timeout on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount } = renderHook(() => useNetworkStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })
})

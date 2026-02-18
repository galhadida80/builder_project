import { renderHook, act } from '@testing-library/react'
import { useRouteProgress } from './useRouteProgress'

// Mock useLocation from react-router-dom
const mockLocation = {
  pathname: '/initial',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}))

describe('useRouteProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockLocation.pathname = '/initial'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns initial idle state', () => {
    const { result } = renderHook(() => useRouteProgress())

    expect(result.current.state).toBe('idle')
    expect(result.current.progress).toBe(0)
    expect(result.current.isLoading).toBe(false)
  })

  it('starts loading when route changes', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    act(() => {
      mockLocation.pathname = '/new-route'
      rerender()
    })

    expect(result.current.state).toBe('loading')
    expect(result.current.isLoading).toBe(true)
  })

  it('progresses from 0 to 90% over ~300ms', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    act(() => {
      mockLocation.pathname = '/new-route'
      rerender()
    })

    expect(result.current.progress).toBe(0)

    // Advance time to ~150ms (halfway to 90%)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.progress).toBeGreaterThan(40)
    expect(result.current.progress).toBeLessThan(50)

    // Advance time to ~300ms (should be at 90%)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.progress).toBeGreaterThanOrEqual(85)
  })

  it('completes to 100% after 350ms', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    act(() => {
      mockLocation.pathname = '/new-route'
      rerender()
    })

    // Advance time to completion
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(result.current.progress).toBe(100)
    expect(result.current.state).toBe('complete')
  })

  it('resets to idle after complete state', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    act(() => {
      mockLocation.pathname = '/new-route'
      rerender()
    })

    // Advance to complete state (350ms)
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(result.current.state).toBe('complete')

    // Advance additional 200ms to reset
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.progress).toBe(0)
    expect(result.current.isLoading).toBe(false)
  })

  it('clears timers when route changes during progress', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    act(() => {
      mockLocation.pathname = '/first-route'
      rerender()
    })

    // Advance partway through first navigation
    act(() => {
      vi.advanceTimersByTime(150)
    })

    const progressAfterFirst = result.current.progress

    // Change route again before first completes
    act(() => {
      mockLocation.pathname = '/second-route'
      rerender()
    })

    // Progress should reset to 0 for new navigation
    expect(result.current.progress).toBe(0)
    expect(result.current.state).toBe('loading')
  })

  it('cleans up timers on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount, rerender } = renderHook(() => useRouteProgress())

    act(() => {
      mockLocation.pathname = '/new-route'
      rerender()
    })

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  it('does not start progress when pathname stays the same', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    expect(result.current.state).toBe('idle')

    // Rerender without changing pathname
    act(() => {
      rerender()
    })

    expect(result.current.state).toBe('idle')
    expect(result.current.progress).toBe(0)
  })

  it('handles multiple route changes correctly', () => {
    const { result, rerender } = renderHook(() => useRouteProgress())

    // First route change
    act(() => {
      mockLocation.pathname = '/route-1'
      rerender()
    })

    act(() => {
      vi.advanceTimersByTime(550)
    })

    expect(result.current.state).toBe('idle')

    // Second route change
    act(() => {
      mockLocation.pathname = '/route-2'
      rerender()
    })

    expect(result.current.state).toBe('loading')
    expect(result.current.progress).toBe(0)

    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(result.current.progress).toBe(100)
    expect(result.current.state).toBe('complete')
  })
})

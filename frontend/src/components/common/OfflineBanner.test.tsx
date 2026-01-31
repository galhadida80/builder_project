import { render, screen, waitFor } from '@testing-library/react'
import { OfflineBanner } from './OfflineBanner'
import { NetworkProvider } from '../../contexts/NetworkContext'
import { act } from 'react'

// Mock useNetworkStatus hook
jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}))

import { useNetworkStatus } from '../../hooks/useNetworkStatus'

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

describe('OfflineBanner', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(<NetworkProvider>{component}</NetworkProvider>)
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render banner when online', () => {
    mockUseNetworkStatus.mockReturnValue(true)

    renderWithProvider(<OfflineBanner />)

    const banner = screen.queryByText(/you are currently offline/i)
    expect(banner).not.toBeInTheDocument()
  })

  it('renders banner when offline', () => {
    mockUseNetworkStatus.mockReturnValue(false)

    renderWithProvider(<OfflineBanner />)

    const banner = screen.getByText(/you are currently offline/i)
    expect(banner).toBeInTheDocument()
  })

  it('uses MUI Alert component with warning severity', () => {
    mockUseNetworkStatus.mockReturnValue(false)

    const { container } = renderWithProvider(<OfflineBanner />)

    const alert = container.querySelector('.MuiAlert-standardWarning')
    expect(alert).toBeInTheDocument()
  })

  it('has fixed positioning at top of viewport', () => {
    mockUseNetworkStatus.mockReturnValue(false)

    const { container } = renderWithProvider(<OfflineBanner />)

    const bannerBox = container.querySelector('[style*="position"]')
    expect(bannerBox).toBeInTheDocument()
  })

  it('slide animation triggers on state change from online to offline', async () => {
    mockUseNetworkStatus.mockReturnValue(true)

    const { rerender } = renderWithProvider(<OfflineBanner />)

    expect(screen.queryByText(/you are currently offline/i)).not.toBeInTheDocument()

    mockUseNetworkStatus.mockReturnValue(false)

    rerender(
      <NetworkProvider>
        <OfflineBanner />
      </NetworkProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument()
    })
  })

  it('slide animation triggers on state change from offline to online', async () => {
    mockUseNetworkStatus.mockReturnValue(false)

    const { rerender } = renderWithProvider(<OfflineBanner />)

    expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument()

    mockUseNetworkStatus.mockReturnValue(true)

    rerender(
      <NetworkProvider>
        <OfflineBanner />
      </NetworkProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText(/you are currently offline/i)).not.toBeInTheDocument()
    })
  })

  it('displays user-friendly warning message', () => {
    mockUseNetworkStatus.mockReturnValue(false)

    renderWithProvider(<OfflineBanner />)

    const message = screen.getByText(/you are currently offline/i)
    expect(message).toBeInTheDocument()
    // Verify it contains helpful information
    expect(message.textContent).toMatch(/changes will be saved|reconnect|connectivity/i)
  })
})

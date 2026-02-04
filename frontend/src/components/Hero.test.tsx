import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Hero } from './Hero'
import { ThemeProvider, createTheme } from '@mui/material/styles'

// Helper to render with theme
const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme()
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
}

describe('Hero Component', () => {
  it('renders with default props', () => {
    renderWithTheme(<Hero />)
    expect(screen.getByText(/Build Smarter Inspect Faster Deliver Excellence/)).toBeInTheDocument()
    expect(
      screen.getByText(
        /Streamline your construction management with our comprehensive platform/
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Request Demo')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('renders custom title and subtitle', () => {
    const customTitle = 'Custom Hero Title'
    const customSubtitle = 'Custom hero subtitle text'

    renderWithTheme(<Hero title={customTitle} subtitle={customSubtitle} />)

    expect(screen.getByText(customTitle)).toBeInTheDocument()
    expect(screen.getByText(customSubtitle)).toBeInTheDocument()
  })

  it('renders custom CTA button text', () => {
    renderWithTheme(
      <Hero ctaPrimaryText="Get Started" ctaSecondaryText="Sign Up" />
    )

    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
  })

  it('calls CTA handlers on click', () => {
    const primaryHandler = vi.fn()
    const secondaryHandler = vi.fn()

    renderWithTheme(
      <Hero
        ctaPrimaryAction={primaryHandler}
        ctaSecondaryAction={secondaryHandler}
      />
    )

    fireEvent.click(screen.getByText('Request Demo'))
    fireEvent.click(screen.getByText('Login'))

    expect(primaryHandler).toHaveBeenCalledTimes(1)
    expect(secondaryHandler).toHaveBeenCalledTimes(1)
  })

  it('renders trust logos when provided and showTrustLogos is true', () => {
    const logos = [
      { name: 'Company A', imageUrl: '/test-a.png', alt: 'Company A logo' },
      { name: 'Company B', imageUrl: '/test-b.png', alt: 'Company B logo' },
    ]

    renderWithTheme(<Hero trustLogos={logos} showTrustLogos={true} />)

    expect(screen.getByText('Trusted by Industry Leaders')).toBeInTheDocument()
    expect(screen.getByAltText('Company A logo')).toBeInTheDocument()
    expect(screen.getByAltText('Company B logo')).toBeInTheDocument()
  })

  it('hides trust logos when showTrustLogos is false', () => {
    const logos = [
      { name: 'Company A', imageUrl: '/test-a.png', alt: 'Company A logo' },
      { name: 'Company B', imageUrl: '/test-b.png', alt: 'Company B logo' },
    ]

    renderWithTheme(<Hero trustLogos={logos} showTrustLogos={false} />)

    expect(screen.queryByText('Trusted by Industry Leaders')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Company A logo')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Company B logo')).not.toBeInTheDocument()
  })

  it('hides trust logos section when trustLogos array is empty', () => {
    renderWithTheme(<Hero trustLogos={[]} showTrustLogos={true} />)

    expect(screen.queryByText('Trusted by Industry Leaders')).not.toBeInTheDocument()
  })

  it('renders background image when provided', () => {
    const backgroundUrl = '/test-background.jpg'

    const { container } = renderWithTheme(<Hero backgroundImageUrl={backgroundUrl} />)

    // Check that a div with background image styling exists
    const backgroundDiv = container.querySelector('[style*="background-image"]')
    expect(backgroundDiv).toBeInTheDocument()
  })

  it('renders multiple trust logos correctly', () => {
    const logos = [
      { name: 'Turner', imageUrl: '/turner.png', alt: 'Turner Construction logo' },
      { name: 'Bechtel', imageUrl: '/bechtel.png', alt: 'Bechtel logo' },
      { name: 'Fluor', imageUrl: '/fluor.png', alt: 'Fluor logo' },
      { name: 'Kiewit', imageUrl: '/kiewit.png', alt: 'Kiewit logo' },
      { name: 'Skanska', imageUrl: '/skanska.png', alt: 'Skanska logo' },
    ]

    renderWithTheme(<Hero trustLogos={logos} showTrustLogos={true} />)

    expect(screen.getByAltText('Turner Construction logo')).toBeInTheDocument()
    expect(screen.getByAltText('Bechtel logo')).toBeInTheDocument()
    expect(screen.getByAltText('Fluor logo')).toBeInTheDocument()
    expect(screen.getByAltText('Kiewit logo')).toBeInTheDocument()
    expect(screen.getByAltText('Skanska logo')).toBeInTheDocument()
  })

  it('does not crash when CTA handlers are not provided', () => {
    renderWithTheme(<Hero />)

    // Click buttons without handlers - should not crash
    const primaryButton = screen.getByText('Request Demo')
    const secondaryButton = screen.getByText('Login')

    expect(() => fireEvent.click(primaryButton)).not.toThrow()
    expect(() => fireEvent.click(secondaryButton)).not.toThrow()
  })
})

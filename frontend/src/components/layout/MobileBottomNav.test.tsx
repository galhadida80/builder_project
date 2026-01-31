import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom'
import MobileBottomNav from './MobileBottomNav'

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/inspector-dashboard' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <MobileBottomNav {...props} />
    </BrowserRouter>
  )
}

describe('MobileBottomNav', () => {
  it('renders with 4 tabs', () => {
    renderComponent()

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Inspections')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights the active tab based on current route', () => {
    mockLocation.pathname = '/inspector-dashboard'

    renderComponent()

    // Home tab should be selected when on /inspector-dashboard
    const homeButton = screen.getByRole('button', { name: /home/i })
    expect(homeButton).toHaveClass('Mui-selected')
  })

  it('navigates to correct route when tab is clicked', async () => {
    const user = userEvent.setup()
    renderComponent()

    const projectsTab = screen.getByRole('button', { name: /projects/i })
    await user.click(projectsTab)

    expect(mockNavigate).toHaveBeenCalledWith('/projects')
  })

  it('navigates to project-specific inspections when projectId is provided', async () => {
    const user = userEvent.setup()
    renderComponent({ projectId: '123' })

    const inspectionsTab = screen.getByRole('button', { name: /inspections/i })
    await user.click(inspectionsTab)

    expect(mockNavigate).toHaveBeenCalledWith('/projects/123/inspections')
  })

  it('renders with fixed position at bottom', () => {
    const { container } = renderComponent()

    const paper = container.querySelector('.MuiPaper-root')
    expect(paper).toHaveStyle({ position: 'fixed' })
  })
})

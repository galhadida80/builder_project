import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { Card, KPICard, FeatureCard, ProjectCard } from './Card'
import { renderWithProviders } from '../../test/test-utils'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'common.statuses.active') return 'Active'
      if (key === 'common.statuses.on_hold') return 'On Hold'
      if (key === 'common.statuses.completed') return 'Completed'
      if (key === 'common.statuses.archived') return 'Archived'
      return opts?.defaultValue ? String(opts.defaultValue) : key
    },
    i18n: { language: 'en' }
  }),
}))

describe('Card', () => {
  it('renders children', () => {
    renderWithProviders(<Card>Test Content</Card>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('is not interactive by default', () => {
    const { container } = renderWithProviders(<Card>Test</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).not.toHaveAttribute('role', 'button')
    expect(card).not.toHaveAttribute('tabIndex')
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    renderWithProviders(<Card onClick={onClick}>Clickable</Card>)
    fireEvent.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  describe('Keyboard Accessibility', () => {
    it('is keyboard accessible when onClick is provided', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(<Card onClick={onClick}>Test</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('responds to Enter key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(<Card onClick={onClick}>Test</Card>)
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(<Card onClick={onClick}>Test</Card>)
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: ' ' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not respond to other keys', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(<Card onClick={onClick}>Test</Card>)
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'a' })
      fireEvent.keyDown(card, { key: 'Escape' })
      fireEvent.keyDown(card, { key: 'Tab' })
      expect(onClick).not.toHaveBeenCalled()
    })

    it('prevents default behavior on Enter and Space', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(<Card onClick={onClick}>Test</Card>)
      const card = container.firstChild as HTMLElement

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      const preventDefaultSpy1 = vi.spyOn(enterEvent, 'preventDefault')
      const preventDefaultSpy2 = vi.spyOn(spaceEvent, 'preventDefault')

      card.dispatchEvent(enterEvent)
      card.dispatchEvent(spaceEvent)

      expect(preventDefaultSpy1).toHaveBeenCalled()
      expect(preventDefaultSpy2).toHaveBeenCalled()
    })
  })
})

describe('KPICard', () => {
  it('renders title and value', () => {
    renderWithProviders(<KPICard title="Total Projects" value={42} />)
    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders loading skeleton', () => {
    const { container } = renderWithProviders(
      <KPICard title="Loading" value={0} loading />
    )
    const skeletons = container.querySelectorAll('.MuiSkeleton-root')
    expect(skeletons.length).toBe(3)
  })

  it('renders trend with icon', () => {
    renderWithProviders(
      <KPICard title="Projects" value={10} trend={5} />
    )
    expect(screen.getByText('+5%')).toBeInTheDocument()
    expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    renderWithProviders(
      <KPICard title="Clickable" value={5} onClick={onClick} />
    )
    fireEvent.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  describe('Keyboard Accessibility', () => {
    it('is keyboard accessible when onClick is provided', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has descriptive aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard title="Total Users" value={150} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Total Users: 150')
    })

    it('includes trend in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard
          title="Revenue"
          value="$5000"
          trend={10}
          trendLabel="vs last month"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Revenue: $5000, vs last month (trend up)')
    })

    it('includes negative trend in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard
          title="Errors"
          value={5}
          trend={-15}
          trendLabel="vs last week"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Errors: 5, vs last week (trend down)')
    })

    it('includes flat trend in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard
          title="Users"
          value={100}
          trend={0}
          trendLabel="unchanged"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Users: 100, unchanged (trend flat)')
    })

    it('responds to Enter key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <KPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: ' ' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is not keyboard accessible when onClick is not provided', () => {
      const { container } = renderWithProviders(
        <KPICard title="Test" value={10} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveAttribute('role', 'button')
      expect(card).not.toHaveAttribute('tabIndex')
      expect(card).not.toHaveAttribute('aria-label')
    })
  })
})

describe('FeatureCard', () => {
  const icon = <span data-testid="test-icon">Icon</span>

  it('renders title, description, and icon', () => {
    renderWithProviders(
      <FeatureCard
        icon={icon}
        title="Feature Title"
        description="Feature description"
      />
    )
    expect(screen.getByText('Feature Title')).toBeInTheDocument()
    expect(screen.getByText('Feature description')).toBeInTheDocument()
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    renderWithProviders(
      <FeatureCard
        icon={icon}
        title="Clickable"
        description="Test"
        onClick={onClick}
      />
    )
    fireEvent.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  describe('Keyboard Accessibility', () => {
    it('is keyboard accessible when onClick is provided', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <FeatureCard
          icon={icon}
          title="Test"
          description="Desc"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has descriptive aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <FeatureCard
          icon={icon}
          title="Analytics"
          description="View your analytics dashboard"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Analytics: View your analytics dashboard')
    })

    it('responds to Enter key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <FeatureCard icon={icon} title="Test" description="Desc" onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <FeatureCard icon={icon} title="Test" description="Desc" onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: ' ' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is not keyboard accessible when onClick is not provided', () => {
      const { container } = renderWithProviders(
        <FeatureCard icon={icon} title="Test" description="Desc" />
      )
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveAttribute('role', 'button')
      expect(card).not.toHaveAttribute('tabIndex')
      expect(card).not.toHaveAttribute('aria-label')
    })
  })
})

describe('ProjectCard', () => {
  it('renders project name and progress', () => {
    renderWithProviders(
      <ProjectCard name="Project Alpha" progress={75} status="active" />
    )
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderWithProviders(
      <ProjectCard name="Project" progress={50} status="active" />
    )
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders project code when provided', () => {
    renderWithProviders(
      <ProjectCard name="Project" code="PROJ-001" progress={50} status="active" />
    )
    expect(screen.getByText('PROJ-001')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    renderWithProviders(
      <ProjectCard name="Clickable" progress={50} status="active" onClick={onClick} />
    )
    fireEvent.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  describe('Keyboard Accessibility', () => {
    it('is keyboard accessible when onClick is provided', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <ProjectCard name="Test" progress={50} status="active" onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has descriptive aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <ProjectCard
          name="Building A"
          progress={65}
          status="active"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Building A, Active, 65% complete')
    })

    it('includes status in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <ProjectCard
          name="Project"
          progress={100}
          status="completed"
          onClick={onClick}
        />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Project, Completed, 100% complete')
    })

    it('has progressbar with correct ARIA attributes', () => {
      renderWithProviders(
        <ProjectCard name="Test Project" progress={45} status="active" />
      )
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '45')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
      expect(progressbar).toHaveAttribute('aria-label', 'Test Project progress')
    })

    it('responds to Enter key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <ProjectCard name="Test" progress={50} status="active" onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <ProjectCard name="Test" progress={50} status="active" onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: ' ' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('is not keyboard accessible when onClick is not provided', () => {
      const { container } = renderWithProviders(
        <ProjectCard name="Test" progress={50} status="active" />
      )
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveAttribute('role', 'button')
      expect(card).not.toHaveAttribute('tabIndex')
      expect(card).not.toHaveAttribute('aria-label')
    })
  })
})

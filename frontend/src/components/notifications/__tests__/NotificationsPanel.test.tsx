import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { NotificationsPanel } from '../NotificationsPanel'
import { Notification, NotificationCategory } from '../../../types/notification'

// Helper function to wrap component with theme provider
const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme({
    palette: {
      mode: 'dark',
    },
  })
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

// Mock notification data
const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: 'user-1',
    category: 'approval' as NotificationCategory,
    title: 'Steel Rebar Order Approved',
    message: 'Your order for steel rebar has been approved by the procurement team.',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    userId: 'user-1',
    category: 'inspection' as NotificationCategory,
    title: 'Safety Inspection Failed',
    message: 'Site B safety inspection requires immediate attention and corrective actions.',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    userId: 'user-1',
    category: 'update' as NotificationCategory,
    title: 'New Blueprint Uploaded',
    message: 'Revised blueprints for Building C have been uploaded to the project files.',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    userId: 'user-1',
    category: 'general' as NotificationCategory,
    title: 'Team Meeting Scheduled',
    message: 'Weekly construction update meeting scheduled for Friday at 2 PM.',
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

describe('NotificationsPanel', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    notifications: mockNotifications,
    unreadCount: 2,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the panel when open is true', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)
      expect(screen.getByText('Notifications')).toBeInTheDocument()
    })

    it('does not render panel content when open is false', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} open={false} />)
      const notifications = screen.queryByText('Steel Rebar Order Approved')
      expect(notifications).not.toBeVisible()
    })

    it('displays the correct unread count badge', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} unreadCount={5} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('does not display unread badge when count is 0', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} unreadCount={0} />)
      const badge = screen.queryByText('0')
      expect(badge).not.toBeInTheDocument()
    })

    it('renders all notification items', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)
      expect(screen.getByText('Steel Rebar Order Approved')).toBeInTheDocument()
      expect(screen.getByText('Safety Inspection Failed')).toBeInTheDocument()
      expect(screen.getByText('New Blueprint Uploaded')).toBeInTheDocument()
      expect(screen.getByText('Team Meeting Scheduled')).toBeInTheDocument()
    })

    it('renders close button', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('Drawer Behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn()
      renderWithTheme(<NotificationsPanel {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn()
      const { container } = renderWithTheme(<NotificationsPanel {...defaultProps} onClose={onClose} />)

      // MUI Drawer's backdrop has the class MuiBackdrop-root
      const backdrop = container.querySelector('.MuiBackdrop-root')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onClose).toHaveBeenCalled()
      }
    })
  })

  describe('Category Filtering', () => {
    it('displays all category tabs', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Approvals')).toBeInTheDocument()
      expect(screen.getByText('Inspections')).toBeInTheDocument()
      expect(screen.getByText('Updates')).toBeInTheDocument()
    })

    it('shows all notifications when "All" tab is selected', () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)
      expect(screen.getByText('Steel Rebar Order Approved')).toBeInTheDocument()
      expect(screen.getByText('Safety Inspection Failed')).toBeInTheDocument()
      expect(screen.getByText('New Blueprint Uploaded')).toBeInTheDocument()
      expect(screen.getByText('Team Meeting Scheduled')).toBeInTheDocument()
    })

    it('filters notifications when "Approvals" tab is clicked', async () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)

      const approvalsTab = screen.getByText('Approvals')
      fireEvent.click(approvalsTab)

      await waitFor(() => {
        expect(screen.getByText('Steel Rebar Order Approved')).toBeInTheDocument()
        expect(screen.queryByText('Safety Inspection Failed')).not.toBeInTheDocument()
        expect(screen.queryByText('New Blueprint Uploaded')).not.toBeInTheDocument()
        expect(screen.queryByText('Team Meeting Scheduled')).not.toBeInTheDocument()
      })
    })

    it('filters notifications when "Inspections" tab is clicked', async () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)

      const inspectionsTab = screen.getByText('Inspections')
      fireEvent.click(inspectionsTab)

      await waitFor(() => {
        expect(screen.queryByText('Steel Rebar Order Approved')).not.toBeInTheDocument()
        expect(screen.getByText('Safety Inspection Failed')).toBeInTheDocument()
        expect(screen.queryByText('New Blueprint Uploaded')).not.toBeInTheDocument()
        expect(screen.queryByText('Team Meeting Scheduled')).not.toBeInTheDocument()
      })
    })

    it('filters notifications when "Updates" tab is clicked', async () => {
      renderWithTheme(<NotificationsPanel {...defaultProps} />)

      const updatesTab = screen.getByText('Updates')
      fireEvent.click(updatesTab)

      await waitFor(() => {
        expect(screen.queryByText('Steel Rebar Order Approved')).not.toBeInTheDocument()
        expect(screen.queryByText('Safety Inspection Failed')).not.toBeInTheDocument()
        expect(screen.getByText('New Blueprint Uploaded')).toBeInTheDocument()
        expect(screen.queryByText('Team Meeting Scheduled')).not.toBeInTheDocument()
      })
    })
  })

  describe('Mark as Read Functionality', () => {
    it('calls onMarkAsRead when unread notification is clicked', () => {
      const onMarkAsRead = jest.fn()
      renderWithTheme(
        <NotificationsPanel {...defaultProps} onMarkAsRead={onMarkAsRead} />
      )

      const unreadNotification = screen.getByText('Steel Rebar Order Approved')
      fireEvent.click(unreadNotification)

      expect(onMarkAsRead).toHaveBeenCalledTimes(1)
      expect(onMarkAsRead).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          title: 'Steel Rebar Order Approved',
          isRead: false,
        })
      )
    })

    it('does not call onMarkAsRead when read notification is clicked', () => {
      const onMarkAsRead = jest.fn()
      renderWithTheme(
        <NotificationsPanel {...defaultProps} onMarkAsRead={onMarkAsRead} />
      )

      const readNotification = screen.getByText('New Blueprint Uploaded')
      fireEvent.click(readNotification)

      expect(onMarkAsRead).not.toHaveBeenCalled()
    })

    it('displays "Mark all as read" button when there are unread notifications', () => {
      renderWithTheme(
        <NotificationsPanel {...defaultProps} onMarkAllAsRead={jest.fn()} />
      )

      expect(screen.getByText('Mark all as read')).toBeInTheDocument()
    })

    it('does not display "Mark all as read" button when unread count is 0', () => {
      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          unreadCount={0}
          onMarkAllAsRead={jest.fn()}
        />
      )

      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument()
    })

    it('calls onMarkAllAsRead when "Mark all as read" is clicked', () => {
      const onMarkAllAsRead = jest.fn()
      renderWithTheme(
        <NotificationsPanel {...defaultProps} onMarkAllAsRead={onMarkAllAsRead} />
      )

      const markAllButton = screen.getByText('Mark all as read')
      fireEvent.click(markAllButton)

      expect(onMarkAllAsRead).toHaveBeenCalledTimes(1)
    })
  })

  describe('Load More Functionality', () => {
    it('displays "Load More" button when hasMore is true', () => {
      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          hasMore={true}
          onLoadMore={jest.fn()}
        />
      )

      expect(screen.getByText('Load More')).toBeInTheDocument()
    })

    it('does not display "Load More" button when hasMore is false', () => {
      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          hasMore={false}
          onLoadMore={jest.fn()}
        />
      )

      expect(screen.queryByText('Load More')).not.toBeInTheDocument()
    })

    it('calls onLoadMore when "Load More" button is clicked', () => {
      const onLoadMore = jest.fn()
      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      )

      const loadMoreButton = screen.getByText('Load More')
      fireEvent.click(loadMoreButton)

      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })

    it('disables "Load More" button when loading', () => {
      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          hasMore={true}
          loading={true}
          onLoadMore={jest.fn()}
        />
      )

      const loadMoreButton = screen.getByText('Loading...')
      expect(loadMoreButton).toBeDisabled()
    })

    it('displays "Loading..." text when loading is true', () => {
      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          hasMore={true}
          loading={true}
          onLoadMore={jest.fn()}
        />
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('displays empty state when no notifications', () => {
      renderWithTheme(
        <NotificationsPanel {...defaultProps} notifications={[]} unreadCount={0} />
      )

      expect(screen.getByText('No notifications')).toBeInTheDocument()
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument()
    })

    it('displays category-specific empty state when category filter has no results', async () => {
      const approvalOnlyNotifications = mockNotifications.filter(
        (n) => n.category === 'approval'
      )

      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          notifications={approvalOnlyNotifications}
        />
      )

      // Click on Inspections tab which should have no notifications
      const inspectionsTab = screen.getByText('Inspections')
      fireEvent.click(inspectionsTab)

      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument()
        expect(screen.getByText('No inspection notifications at this time.')).toBeInTheDocument()
      })
    })

    it('displays correct empty message for each category', async () => {
      renderWithTheme(
        <NotificationsPanel {...defaultProps} notifications={[]} unreadCount={0} />
      )

      // Test Approvals tab
      const approvalsTab = screen.getByText('Approvals')
      fireEvent.click(approvalsTab)
      await waitFor(() => {
        expect(screen.getByText('No approval notifications at this time.')).toBeInTheDocument()
      })

      // Test Inspections tab
      const inspectionsTab = screen.getByText('Inspections')
      fireEvent.click(inspectionsTab)
      await waitFor(() => {
        expect(screen.getByText('No inspection notifications at this time.')).toBeInTheDocument()
      })

      // Test Updates tab
      const updatesTab = screen.getByText('Updates')
      fireEvent.click(updatesTab)
      await waitFor(() => {
        expect(screen.getByText('No update notifications at this time.')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined notifications prop gracefully', () => {
      renderWithTheme(
        <NotificationsPanel
          open={true}
          onClose={jest.fn()}
          notifications={undefined}
        />
      )

      expect(screen.getByText('No notifications')).toBeInTheDocument()
    })

    it('handles notifications with missing optional props', () => {
      const onMarkAsRead = jest.fn()
      renderWithTheme(
        <NotificationsPanel
          open={true}
          onClose={jest.fn()}
          notifications={mockNotifications}
          // onMarkAsRead not provided
        />
      )

      // Should not throw error when clicking notification
      const notification = screen.getByText('Steel Rebar Order Approved')
      expect(() => fireEvent.click(notification)).not.toThrow()
      expect(onMarkAsRead).not.toHaveBeenCalled()
    })

    it('renders correctly with large number of notifications', () => {
      const manyNotifications = Array.from({ length: 50 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        title: `Notification ${i}`,
      }))

      renderWithTheme(
        <NotificationsPanel
          {...defaultProps}
          notifications={manyNotifications}
        />
      )

      expect(screen.getByText('Notification 0')).toBeInTheDocument()
      expect(screen.getByText('Notification 49')).toBeInTheDocument()
    })
  })
})

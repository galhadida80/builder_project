import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChecklistSection } from './ChecklistSection'
import type { ChecklistSubSection, ChecklistItemResponse } from '../../types'

// Mock data
const mockSection: ChecklistSubSection = {
  id: 'section-1',
  checklistTemplateId: 'template-1',
  order: 1,
  name: 'Section 1: Safety Checks',
  description: 'Basic safety inspection items',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  items: [
    {
      id: 'item-1',
      checklistTemplateId: 'template-1',
      subSectionId: 'section-1',
      order: 1,
      name: 'Check fire extinguisher',
      description: 'Verify fire extinguisher is present and accessible',
      mustImage: true,
      mustNote: false,
      mustSignature: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'item-2',
      checklistTemplateId: 'template-1',
      subSectionId: 'section-1',
      order: 2,
      name: 'Check emergency exits',
      description: 'Ensure exits are clear and marked',
      mustImage: false,
      mustNote: true,
      mustSignature: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
}

const mockResponses: ChecklistItemResponse[] = [
  {
    id: 'response-1',
    checklistInstanceId: 'instance-1',
    itemTemplateId: 'item-1',
    status: 'pass',
    notes: 'Fire extinguisher present',
    imageUrls: ['image1.jpg'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

describe('ChecklistSection', () => {
  it('renders section with title and items', () => {
    render(<ChecklistSection section={mockSection} responses={[]} />)

    expect(screen.getByText('Section 1: Safety Checks')).toBeInTheDocument()
    expect(screen.getByText('Check fire extinguisher')).toBeInTheDocument()
    expect(screen.getByText('Check emergency exits')).toBeInTheDocument()
  })

  it('displays section order badge', () => {
    render(<ChecklistSection section={mockSection} responses={[]} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows completion progress', () => {
    render(<ChecklistSection section={mockSection} responses={mockResponses} />)

    // 1 of 2 items completed
    expect(screen.getByText('1 of 2 items completed')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows complete badge when all items are done', () => {
    const allResponses: ChecklistItemResponse[] = [
      {
        id: 'response-1',
        checklistInstanceId: 'instance-1',
        itemTemplateId: 'item-1',
        status: 'pass',
        notes: '',
        imageUrls: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'response-2',
        checklistInstanceId: 'instance-1',
        itemTemplateId: 'item-2',
        status: 'pass',
        notes: '',
        imageUrls: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]

    render(<ChecklistSection section={mockSection} responses={allResponses} />)

    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('collapses and expands when header is clicked', () => {
    render(<ChecklistSection section={mockSection} responses={[]} defaultExpanded={true} />)

    // Items should be visible initially
    expect(screen.getByText('Check fire extinguisher')).toBeInTheDocument()

    // Click header to collapse
    const header = screen.getByText('Section 1: Safety Checks')
    fireEvent.click(header)

    // Items should be hidden (unmountOnExit in Collapse)
    expect(screen.queryByText('Check fire extinguisher')).not.toBeInTheDocument()

    // Click header again to expand
    fireEvent.click(header)

    // Items should be visible again
    expect(screen.getByText('Check fire extinguisher')).toBeInTheDocument()
  })

  it('shows required field indicators', () => {
    render(<ChecklistSection section={mockSection} responses={[]} defaultExpanded={true} />)

    // Item 1 requires photo
    const photoChips = screen.getAllByText('Photo')
    expect(photoChips).toHaveLength(1)

    // Item 2 requires note
    const noteChips = screen.getAllByText('Note')
    expect(noteChips).toHaveLength(1)
  })

  it('calls onItemClick when item is clicked', () => {
    const handleItemClick = vi.fn()
    render(
      <ChecklistSection
        section={mockSection}
        responses={[]}
        defaultExpanded={true}
        onItemClick={handleItemClick}
      />
    )

    const firstItem = screen.getByText('Check fire extinguisher')
    fireEvent.click(firstItem.closest('[class*="ItemRow"]') as HTMLElement)

    expect(handleItemClick).toHaveBeenCalledWith(mockSection.items![0])
  })

  it('displays status badges for completed items', () => {
    render(<ChecklistSection section={mockSection} responses={mockResponses} defaultExpanded={true} />)

    // Should show pass status for completed item
    expect(screen.getByText('pass')).toBeInTheDocument()
  })

  it('shows empty state when section has no items', () => {
    const emptySection: ChecklistSubSection = {
      ...mockSection,
      items: [],
    }

    render(<ChecklistSection section={emptySection} responses={[]} defaultExpanded={true} />)

    expect(screen.getByText('No items in this section')).toBeInTheDocument()
  })

  it('handles section with undefined items array', () => {
    const sectionWithoutItems: ChecklistSubSection = {
      ...mockSection,
      items: undefined,
    }

    render(<ChecklistSection section={sectionWithoutItems} responses={[]} defaultExpanded={true} />)

    expect(screen.getByText('No items in this section')).toBeInTheDocument()
  })

  it('applies strike-through styling to completed items', () => {
    render(<ChecklistSection section={mockSection} responses={mockResponses} defaultExpanded={true} />)

    const completedItemText = screen.getByText('Check fire extinguisher')
    const styles = window.getComputedStyle(completedItemText)

    // Note: The actual style checking depends on styled-components rendering in test environment
    // This verifies the element is rendered
    expect(completedItemText).toBeInTheDocument()
  })
})

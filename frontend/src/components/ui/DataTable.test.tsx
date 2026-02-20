import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DataTable, Column } from './DataTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

interface TestRow {
  id: string
  name: string
  score?: string | null
}

const getRowId = (row: TestRow) => row.id

const nameOnlyColumns: Column<TestRow>[] = [
  { id: 'name', label: 'Name', sortable: true },
]

const twoColumns: Column<TestRow>[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'score', label: 'Score', sortable: true },
]

function getCellTexts(colIndex = 0): string[] {
  const tbody = document.querySelector('tbody')
  const rows = Array.from(tbody?.querySelectorAll('tr') ?? [])
  return rows.map((tr) => tr.querySelectorAll('td')[colIndex]?.textContent ?? '')
}

function getSortButton(columnLabel: string): HTMLElement {
  const header = screen.getByRole('columnheader', { name: new RegExp(columnLabel, 'i') })
  return within(header).getByRole('button')
}

function clickSortButton(columnLabel: string): void {
  fireEvent.click(getSortButton(columnLabel))
}

describe('DataTable', () => {
  describe('no-sort initial state', () => {
    it('shows rows in original order before any sort', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie' },
        { id: '2', name: 'Alice' },
        { id: '3', name: 'Bob' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      expect(getCellTexts()).toEqual(['Charlie', 'Alice', 'Bob'])
    })
  })

  describe('sort asc/desc on click', () => {
    it('sorts rows ascending on first column header click', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie' },
        { id: '2', name: 'Alice' },
        { id: '3', name: 'Bob' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Name')
      expect(getCellTexts()).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('sorts rows descending on second column header click', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie' },
        { id: '2', name: 'Alice' },
        { id: '3', name: 'Bob' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Name') // asc
      clickSortButton('Name') // desc
      expect(getCellTexts()).toEqual(['Charlie', 'Bob', 'Alice'])
    })
  })

  describe('rows reorder when column header clicked', () => {
    it('reorders rows when a different column is clicked', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie', score: '1' },
        { id: '2', name: 'Alice', score: '3' },
        { id: '3', name: 'Bob', score: '2' },
      ]
      renderWithProviders(
        <DataTable columns={twoColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      // Sort by Score ascending
      clickSortButton('Score')
      expect(getCellTexts(1)).toEqual(['1', '2', '3'])
      expect(getCellTexts(0)).toEqual(['Charlie', 'Bob', 'Alice'])
    })
  })

  describe('sort indicator', () => {
    it('activates sort indicator on clicked column', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      const btn = getSortButton('Name')
      expect(btn).not.toHaveClass('Mui-active')
      clickSortButton('Name')
      expect(btn).toHaveClass('Mui-active')
    })

    it('shows ascending icon direction after first click', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      const btn = getSortButton('Name')
      clickSortButton('Name') // ascending
      const icon = btn.querySelector('.MuiTableSortLabel-icon')
      expect(icon).toHaveClass('MuiTableSortLabel-iconDirectionAsc')
    })

    it('toggles sort indicator to descending on second click', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      const btn = getSortButton('Name')
      clickSortButton('Name') // asc
      clickSortButton('Name') // desc
      const icon = btn.querySelector('.MuiTableSortLabel-icon')
      expect(icon).toHaveClass('MuiTableSortLabel-iconDirectionDesc')
    })
  })

  describe('null/undefined values sorted to end', () => {
    it('sorts null values to the end on ascending sort', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie', score: '10' },
        { id: '2', name: 'Alice', score: null },
        { id: '3', name: 'Bob', score: '2' },
      ]
      renderWithProviders(
        <DataTable columns={twoColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Score')
      const scores = getCellTexts(1)
      expect(scores[0]).not.toBe('')
      expect(scores[scores.length - 1]).toBe('')
    })

    it('sorts undefined values to the end on ascending sort', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie', score: '10' },
        { id: '2', name: 'Alice' }, // score is undefined
        { id: '3', name: 'Bob', score: '2' },
      ]
      renderWithProviders(
        <DataTable columns={twoColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Score')
      const scores = getCellTexts(1)
      expect(scores[scores.length - 1]).toBe('')
    })

    it('keeps null values at end on descending sort', () => {
      const rows: TestRow[] = [
        { id: '1', name: 'Charlie', score: '10' },
        { id: '2', name: 'Alice', score: null },
        { id: '3', name: 'Bob', score: '2' },
      ]
      renderWithProviders(
        <DataTable columns={twoColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Score') // asc
      clickSortButton('Score') // desc
      const scores = getCellTexts(1)
      expect(scores[scores.length - 1]).toBe('')
    })
  })

  describe('numeric string sort', () => {
    it('sorts numeric strings in numeric order not lexicographic', () => {
      const rows: TestRow[] = [
        { id: '1', name: '10' },
        { id: '2', name: '9' },
        { id: '3', name: '2' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Name')
      expect(getCellTexts()).toEqual(['2', '9', '10'])
    })

    it('sorts mixed numeric strings correctly descending', () => {
      const rows: TestRow[] = [
        { id: '1', name: '10' },
        { id: '2', name: '9' },
        { id: '3', name: '2' },
      ]
      renderWithProviders(
        <DataTable columns={nameOnlyColumns} rows={rows} getRowId={getRowId} pagination={false} />,
      )
      clickSortButton('Name') // asc
      clickSortButton('Name') // desc
      expect(getCellTexts()).toEqual(['10', '9', '2'])
    })
  })

  describe('pagination resets on sort', () => {
    it('resets to first page when sort is applied', () => {
      const rows: TestRow[] = Array.from({ length: 6 }, (_, i) => ({
        id: String(i + 1),
        name: `Item ${String(i + 1).padStart(2, '0')}`,
      }))
      renderWithProviders(
        <DataTable
          columns={nameOnlyColumns}
          rows={rows}
          getRowId={getRowId}
          pagination={true}
          pageSize={5}
        />,
      )
      // Navigate to page 2 (second page has only 1 row: Item 06)
      const nextPageBtn = screen.getByRole('button', { name: /goToNextPage/i })
      fireEvent.click(nextPageBtn)

      // Verify we're on page 2 showing last item
      const page2Texts = getCellTexts()
      expect(page2Texts).toHaveLength(1)
      expect(page2Texts[0]).toBe('Item 06')

      // Click sort to trigger page reset
      clickSortButton('Name')

      // Should be back on page 1 (5 rows visible)
      expect(getCellTexts()).toHaveLength(5)
    })
  })
})

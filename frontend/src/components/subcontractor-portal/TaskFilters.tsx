import { useTranslation } from 'react-i18next'
import { Tabs } from '@/components/ui/Tabs'
import { SearchField } from '@/components/ui/TextField'
import { Box } from '@/mui'
import type { Task } from '@/types'

interface TaskFiltersProps {
  tasks: Task[]
  activeTab: string
  onTabChange: (tab: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  todayCount: number
  overdueCount: number
}

export function TaskFilters({
  tasks,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  todayCount,
  overdueCount,
}: TaskFiltersProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs
        items={[
          { label: t('common.all'), value: 'all', badge: tasks.length },
          { label: t('tasks.today'), value: 'today', badge: todayCount },
          { label: t('tasks.overdue'), value: 'overdue', badge: overdueCount },
          { label: t('tasks.statuses.in_progress'), value: 'in_progress', badge: tasks.filter(tk => tk.status === 'in_progress').length },
          { label: t('tasks.statuses.completed'), value: 'completed', badge: tasks.filter(tk => tk.status === 'completed').length },
        ]}
        value={activeTab}
        onChange={onTabChange}
        size="small"
      />

      <SearchField
        placeholder={t('tasks.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Box>
  )
}

import { ReactNode } from 'react'
import { Box, useTheme, useMediaQuery } from '@mui/material'
import { Tabs, TabPanel } from '../src/components/ui/Tabs'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TimelineIcon from '@mui/icons-material/Timeline'
import GroupIcon from '@mui/icons-material/Group'
import BarChartIcon from '@mui/icons-material/BarChart'

export interface ProjectOverviewTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  summaryContent?: ReactNode
  timelineContent?: ReactNode
  teamContent?: ReactNode
  statsContent?: ReactNode
}

const TAB_ITEMS = [
  {
    label: 'Summary',
    value: 'summary',
    icon: <DashboardIcon />,
  },
  {
    label: 'Timeline',
    value: 'timeline',
    icon: <TimelineIcon />,
  },
  {
    label: 'Team',
    value: 'team',
    icon: <GroupIcon />,
  },
  {
    label: 'Stats',
    value: 'stats',
    icon: <BarChartIcon />,
  },
]

export function ProjectOverviewTabs({
  activeTab,
  onTabChange,
  summaryContent,
  timelineContent,
  teamContent,
  statsContent,
}: ProjectOverviewTabsProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box>
      <Tabs
        items={TAB_ITEMS}
        value={activeTab}
        onChange={onTabChange}
        variant={isMobile ? 'scrollable' : 'standard'}
        size="medium"
      />

      <TabPanel value="summary" activeValue={activeTab}>
        {summaryContent}
      </TabPanel>

      <TabPanel value="timeline" activeValue={activeTab}>
        {timelineContent}
      </TabPanel>

      <TabPanel value="team" activeValue={activeTab}>
        {teamContent}
      </TabPanel>

      <TabPanel value="stats" activeValue={activeTab}>
        {statsContent}
      </TabPanel>
    </Box>
  )
}

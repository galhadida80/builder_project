import {
  DashboardIcon,
  AssignmentIcon,
  HelpOutlineIcon,
  ApprovalIcon,
  TimelineIcon,
  PersonIcon,
} from '@/icons'

export interface TabConfigItem {
  label: string
  value: string
  icon: JSX.Element
}

export const createTabConfig = (t: (key: string) => string): TabConfigItem[] => [
  {
    label: t('subcontractorPortal.dashboard'),
    value: 'dashboard',
    icon: <DashboardIcon sx={{ fontSize: '1rem' }} />,
  },
  {
    label: t('subcontractorPortal.tasks'),
    value: 'tasks',
    icon: <AssignmentIcon sx={{ fontSize: '1rem' }} />,
  },
  {
    label: t('subcontractorPortal.rfis'),
    value: 'rfis',
    icon: <HelpOutlineIcon sx={{ fontSize: '1rem' }} />,
  },
  {
    label: t('subcontractorPortal.approvals'),
    value: 'approvals',
    icon: <ApprovalIcon sx={{ fontSize: '1rem' }} />,
  },
  {
    label: t('subcontractorPortal.activity'),
    value: 'activity',
    icon: <TimelineIcon sx={{ fontSize: '1rem' }} />,
  },
  {
    label: t('subcontractorPortal.profile'),
    value: 'profile',
    icon: <PersonIcon sx={{ fontSize: '1rem' }} />,
  },
]

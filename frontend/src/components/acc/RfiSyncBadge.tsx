import React from 'react';
import { Chip } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useTranslation } from 'react-i18next';

interface RfiSyncBadgeProps {
  syncStatus: string;
}

const STATUS_CONFIG: Record<string, { color: 'default' | 'success' | 'warning' | 'error'; icon: React.ReactElement }> = {
  synced: { color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  syncing: { color: 'warning', icon: <SyncIcon fontSize="small" /> },
  failed: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
  not_synced: { color: 'default', icon: <SyncIcon fontSize="small" /> },
};

const RfiSyncBadge: React.FC<RfiSyncBadgeProps> = ({ syncStatus }) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[syncStatus] || STATUS_CONFIG.not_synced;

  return (
    <Chip
      label={t(`accSync.status.${syncStatus}`, syncStatus)}
      color={config.color}
      icon={config.icon}
      size="small"
      variant="outlined"
    />
  );
};

export default RfiSyncBadge;

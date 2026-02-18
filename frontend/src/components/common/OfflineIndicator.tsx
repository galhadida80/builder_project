import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { processSyncQueue, getSyncQueue } from '../../services/syncQueue';
import { SignalWifiOffIcon, SyncIcon } from '@/icons';
import { Alert, Snackbar, Box, Typography } from '@/mui';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    if (isOnline && wasOffline) {
      const queue = getSyncQueue();
      if (queue.length > 0) {
        setSyncing(true);
        processSyncQueue().then((result) => {
          setSyncing(false);
          setSyncResult(result);
        });
      }
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <Box sx={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
        <Alert
          severity="warning"
          icon={<SignalWifiOffIcon />}
          sx={{ borderRadius: 2, boxShadow: 3 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {t('offline.youAreOffline')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('offline.changesWillSync')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (syncing) {
    return (
      <Box sx={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
        <Alert severity="info" icon={<SyncIcon />} sx={{ borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="body2">{t('offline.syncing')}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Snackbar
      open={syncResult !== null}
      autoHideDuration={4000}
      onClose={() => setSyncResult(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="success" onClose={() => setSyncResult(null)} sx={{ borderRadius: 2 }}>
        {syncResult && syncResult.failed === 0
          ? t('offline.syncComplete', { count: syncResult.success })
          : t('offline.syncPartial', {
              success: syncResult?.success ?? 0,
              failed: syncResult?.failed ?? 0,
            })}
      </Alert>
    </Snackbar>
  );
}

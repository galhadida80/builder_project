import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  SyncHealth,
  SyncLog,
  getSyncHealth,
  getSyncLogs,
  pushAllRfis,
  pullRfisFromAcc,
} from '@/api/accSync';

const AccSyncDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [h, l] = await Promise.all([
        getSyncHealth(projectId),
        getSyncLogs(projectId, 20),
      ]);
      setHealth(h);
      setLogs(l);
    } catch {
      setMessage({ type: 'error', text: t('accSync.loadError') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handlePushAll = async () => {
    if (!projectId) return;
    setPushing(true);
    setMessage(null);
    try {
      const result = await pushAllRfis(projectId);
      setMessage({
        type: result.failed > 0 ? 'error' : 'success',
        text: t('accSync.pushResult', { pushed: result.pushed, failed: result.failed }),
      });
      await loadData();
    } catch {
      setMessage({ type: 'error', text: t('accSync.pushError') });
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    if (!projectId) return;
    setPulling(true);
    setMessage(null);
    try {
      const result = await pullRfisFromAcc(projectId);
      setMessage({
        type: result.errors.length > 0 ? 'error' : 'success',
        text: t('accSync.pullResult', { created: result.created, updated: result.updated }),
      });
      await loadData();
    } catch {
      setMessage({ type: 'error', text: t('accSync.pullError') });
    } finally {
      setPulling(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!health?.linked) {
    return (
      <Alert severity="info">{t('accSync.notLinked')}</Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {message && <Alert severity={message.type}>{message.text}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('accSync.syncOverview')}</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Chip label={`${t('accSync.total')}: ${health.totalRfis}`} />
            <Chip label={`${t('accSync.synced')}: ${health.syncedCount}`} color="success" />
            <Chip label={`${t('accSync.failed')}: ${health.failedCount}`} color="error" />
            <Chip label={`${t('accSync.pending')}: ${health.pendingCount}`} color="warning" />
          </Stack>
          {health.lastSync && (
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              {t('accSync.lastSync')}: {new Date(health.lastSync).toLocaleString()}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={pushing ? <CircularProgress size={18} /> : <CloudUploadIcon />}
          onClick={handlePushAll}
          disabled={pushing || pulling}
        >
          {t('accSync.pushAll')}
        </Button>
        <Button
          variant="outlined"
          startIcon={pulling ? <CircularProgress size={18} /> : <CloudDownloadIcon />}
          onClick={handlePull}
          disabled={pushing || pulling}
        >
          {t('accSync.pullAll')}
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>{t('accSync.recentLogs')}</Typography>
          <Divider />
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" py={2}>
              {t('accSync.noLogs')}
            </Typography>
          ) : (
            <List dense>
              {logs.map((log) => (
                <ListItem key={log.id} divider>
                  <ListItemText
                    primary={`${log.direction === 'outbound' ? '↑' : '↓'} ${log.rfiId.slice(0, 8)}`}
                    secondary={new Date(log.createdAt).toLocaleString()}
                  />
                  <Chip
                    label={log.status}
                    size="small"
                    color={log.status === 'success' ? 'success' : 'error'}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default AccSyncDashboard;

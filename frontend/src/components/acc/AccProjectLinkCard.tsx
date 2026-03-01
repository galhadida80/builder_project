import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  AccProjectLinkStatus,
  getAccLinkStatus,
  linkAccProject,
  unlinkAccProject,
} from '@/api/accSync';

const AccProjectLinkCard: React.FC = () => {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const [status, setStatus] = useState<AccProjectLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accProjectId, setAccProjectId] = useState('');
  const [accHubId, setAccHubId] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getAccLinkStatus(projectId)
      .then(setStatus)
      .catch(() => setError(t('accSync.loadError')))
      .finally(() => setLoading(false));
  }, [projectId, t]);

  const handleLink = async () => {
    if (!projectId || !accProjectId || !accHubId) return;
    setSaving(true);
    setError(null);
    try {
      await linkAccProject(projectId, {
        acc_project_id: accProjectId,
        acc_hub_id: accHubId,
      });
      const updated = await getAccLinkStatus(projectId);
      setStatus(updated);
      setAccProjectId('');
      setAccHubId('');
    } catch {
      setError(t('accSync.linkError'));
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      await unlinkAccProject(projectId);
      setStatus({ linked: false, link: null });
    } catch {
      setError(t('accSync.unlinkError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <LinkIcon color="primary" />
          <Typography variant="h6">{t('accSync.projectLink')}</Typography>
          {status?.linked && (
            <Chip
              label={t('accSync.linked')}
              color="success"
              size="small"
            />
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {status?.linked && status.link ? (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('accSync.accProjectId')}: {status.link.accProjectId}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('accSync.accHubId')}: {status.link.accHubId}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LinkOffIcon />}
              onClick={handleUnlink}
              disabled={saving}
              sx={{ mt: 2 }}
              size="small"
            >
              {t('accSync.unlink')}
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('accSync.notLinked')}
            </Typography>
            <Stack spacing={2} mt={2}>
              <TextField
                label={t('accSync.accProjectId')}
                value={accProjectId}
                onChange={(e) => setAccProjectId(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t('accSync.accHubId')}
                value={accHubId}
                onChange={(e) => setAccHubId(e.target.value)}
                size="small"
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<LinkIcon />}
                onClick={handleLink}
                disabled={saving || !accProjectId || !accHubId}
                size="small"
              >
                {saving ? <CircularProgress size={20} /> : t('accSync.link')}
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AccProjectLinkCard;

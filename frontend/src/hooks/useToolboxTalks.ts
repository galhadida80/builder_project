import { useState, useEffect } from 'react'
import { safetyApi, ToolboxTalkCreateData, ToolboxTalkUpdateData } from '../api/safety'
import type { ToolboxTalk, TalkStatus } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'

interface UseToolboxTalksParams {
  projectId: string | undefined
  status?: TalkStatus | 'all'
  searchQuery?: string
}

export function useToolboxTalks({ projectId, status, searchQuery }: UseToolboxTalksParams) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [talks, setTalks] = useState<ToolboxTalk[]>([])
  const [loading, setLoading] = useState(true)

  const loadTalks = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: TalkStatus } = {}
      if (status && status !== 'all') params.status = status

      const result = await safetyApi.toolboxTalks.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(talk =>
          talk.title.toLowerCase().includes(query) ||
          talk.topic.toLowerCase().includes(query) ||
          talk.presenter?.toLowerCase().includes(query)
        )
      }

      setTalks(filtered)
    } catch (error) {
      console.error('Failed to load toolbox talks:', error)
      showError(t('toolboxTalks.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const createTalk = async (data: ToolboxTalkCreateData) => {
    if (!projectId) return false
    try {
      await safetyApi.toolboxTalks.create(projectId, data)
      showSuccess(t('toolboxTalks.createSuccess'))
      await loadTalks()
      return true
    } catch (error) {
      console.error('Failed to create toolbox talk:', error)
      showError(t('toolboxTalks.createFailed'))
      return false
    }
  }

  const updateTalk = async (talkId: string, data: ToolboxTalkUpdateData) => {
    try {
      await safetyApi.toolboxTalks.update(talkId, data)
      showSuccess(t('toolboxTalks.updateSuccess'))
      await loadTalks()
      return true
    } catch (error) {
      console.error('Failed to update toolbox talk:', error)
      showError(t('toolboxTalks.updateFailed'))
      return false
    }
  }

  const deleteTalk = async (talkId: string) => {
    try {
      await safetyApi.toolboxTalks.delete(talkId)
      showSuccess(t('toolboxTalks.deleteSuccess'))
      await loadTalks()
      return true
    } catch (error) {
      console.error('Failed to delete toolbox talk:', error)
      showError(t('toolboxTalks.deleteFailed'))
      return false
    }
  }

  useEffect(() => {
    loadTalks()
  }, [projectId, status, searchQuery])

  return {
    talks,
    loading,
    loadTalks,
    createTalk,
    updateTalk,
    deleteTalk,
  }
}

import { useState, useEffect } from 'react'
import { contactsApi } from '../api/contacts'
import { projectsApi } from '../api/projects'
import type { Contact } from '../types'

export function useProjectContacts(projectId: string | undefined) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [contactsData, project] = await Promise.all([
          contactsApi.list(projectId),
          projectsApi.get(projectId),
        ])
        if (cancelled) return
        const contactEmails = new Set(
          contactsData.map(c => c.email?.toLowerCase()).filter(Boolean)
        )
        const memberContacts: Contact[] = (project.members || [])
          .filter(m => m.user?.email && !contactEmails.has(m.user.email.toLowerCase()))
          .map(m => ({
            id: `member-${m.userId}`,
            projectId,
            contactType: 'team_member',
            contactName: m.user.fullName || m.user.email,
            email: m.user.email,
            isPrimary: false,
            userId: m.userId,
            createdAt: m.addedAt,
          }))
        setContacts([...memberContacts, ...contactsData])
      } catch {
        if (!cancelled) setContacts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

  return { contacts, loading }
}

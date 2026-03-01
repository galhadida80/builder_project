import { useEffect, useRef, useState } from 'react'
import { Box, Skeleton, Typography } from '@/mui'
import { useTranslation } from 'react-i18next'

declare global {
  interface Window {
    Autodesk: typeof Autodesk
    THREE: typeof THREE
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace THREE {
  class Vector4 {
    constructor(x: number, y: number, z: number, w: number)
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Autodesk {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Viewing {
    function Initializer(options: Record<string, unknown>, callback: () => void): void
    function shutdown(): void
    const AGGREGATE_SELECTION_CHANGED_EVENT: string
    class GuiViewer3D {
      constructor(container: HTMLElement, config?: Record<string, unknown>)
      start(): number
      finish(): void
      loadDocumentNode(doc: Document, viewable: BubbleNode): Promise<unknown>
      select(dbIds: number | number[]): void
      clearSelection(): void
      fitToView(dbIds?: number[], model?: unknown, immediate?: boolean): void
      search(text: string, onSuccess: (dbIds: number[]) => void, onError: (error: string) => void, attributeNames?: string[]): void
      setThemingColor(dbId: number, color: THREE.Vector4, model?: unknown, recursive?: boolean): void
      clearThemingColors(model?: unknown): void
      isolate(dbIds: number | number[], model?: unknown): void
      showAll(): void
      addEventListener(event: string, callback: (event: { selections: Array<{ dbIdArray: number[] }> }) => void): void
      removeEventListener(event: string, callback: (event: { selections: Array<{ dbIdArray: number[] }> }) => void): void
      model?: { getProperties(dbId: number, onSuccess: (props: { externalId?: string }) => void): void }
    }
    class Document {
      static load(urn: string, onSuccess: (doc: Document) => void, onError: (code: number, msg: string) => void): void
      getRoot(): BubbleNode
    }
    class BubbleNode {
      getDefaultGeometry(): BubbleNode
    }
  }
}

const VIEWER_VERSION = '7.*'
const VIEWER_CSS = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VIEWER_VERSION}/style.min.css`
const VIEWER_JS = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VIEWER_VERSION}/viewer3D.min.js`

interface ForgeViewerProps {
  urn: string
  getToken: () => Promise<string>
  selectedBimObjectIds?: string[]
  isolationMode?: boolean
  onElementClick?: (bimObjectId: string | undefined, multiSelect?: boolean) => void
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

function loadCSS(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

export default function ForgeViewer({ urn, getToken, selectedBimObjectIds = [], isolationMode = false, onElementClick }: ForgeViewerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Autodesk.Viewing.GuiViewer3D | null>(null)
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const onElementClickRef = useRef(onElementClick)
  onElementClickRef.current = onElementClick
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clickHandlerRef = useRef<((event: { selections: Array<{ dbIdArray: number[] }> }) => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initViewer() {
      try {
        loadCSS(VIEWER_CSS)
        await loadScript(VIEWER_JS)

        if (cancelled || !containerRef.current) return

        const token = await getTokenRef.current()

        await new Promise<void>((resolve) => {
          window.Autodesk.Viewing.Initializer(
            {
              env: 'AutodeskProduction2',
              api: 'streamingV2',
              accessToken: token,
            },
            () => resolve()
          )
        })

        if (cancelled || !containerRef.current) return

        const viewer = new window.Autodesk.Viewing.GuiViewer3D(containerRef.current)
        viewer.start()
        viewerRef.current = viewer

        const encodedUrn = btoa(urn).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        const documentId = `urn:${encodedUrn}`

        const handleSelectionChange = (event: { selections: Array<{ dbIdArray: number[] }> }) => {
          if (!viewer.model || event.selections.length === 0) return
          const dbIds = event.selections[0]?.dbIdArray
          if (!dbIds || dbIds.length === 0) return
          const dbId = dbIds[0]
          viewer.model.getProperties(dbId, (props) => {
            if (props.externalId) {
              const multiSelect = false
              onElementClickRef.current?.(props.externalId, multiSelect)
            }
          })
        }
        clickHandlerRef.current = handleSelectionChange

        window.Autodesk.Viewing.Document.load(
          documentId,
          (doc) => {
            if (cancelled) return
            const viewable = doc.getRoot().getDefaultGeometry()
            viewer.loadDocumentNode(doc, viewable).then(() => {
              if (!cancelled) {
                viewer.addEventListener(window.Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, handleSelectionChange)
                setLoading(false)
              }
            })
          },
          (_code, msg) => {
            if (!cancelled) {
              setError(msg || t('bim.viewerLoadError'))
              setLoading(false)
            }
          }
        )
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('bim.viewerLoadError'))
          setLoading(false)
        }
      }
    }

    initViewer()

    return () => {
      cancelled = true
      if (viewerRef.current && clickHandlerRef.current) {
        viewerRef.current.removeEventListener(
          window.Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
          clickHandlerRef.current
        )
      }
      if (viewerRef.current) {
        viewerRef.current.finish()
        viewerRef.current = null
      }
    }
  }, [urn, t])

  useEffect(() => {
    if (!viewerRef.current || loading) return

    if (selectedBimObjectIds.length === 0) {
      viewerRef.current.clearSelection()
      viewerRef.current.clearThemingColors()
      return
    }

    const allDbIds: number[] = []
    let completedSearches = 0

    selectedBimObjectIds.forEach((id) => {
      viewerRef.current?.search(
        id,
        (dbIds) => {
          allDbIds.push(...dbIds)
          completedSearches++

          if (completedSearches === selectedBimObjectIds.length && viewerRef.current) {
            if (allDbIds.length > 0) {
              viewerRef.current.clearThemingColors()
              viewerRef.current.select(allDbIds)
              viewerRef.current.fitToView(allDbIds, undefined, false)

              const highlightColor = new window.THREE.Vector4(1, 0.6, 0, 1)
              allDbIds.forEach((dbId) => {
                viewerRef.current?.setThemingColor(dbId, highlightColor)
              })
            }
          }
        },
        () => {
          completedSearches++
        },
        ['externalId']
      )
    })
  }, [selectedBimObjectIds, loading])

  useEffect(() => {
    if (!viewerRef.current || loading) return

    if (isolationMode && selectedBimObjectIds.length > 0) {
      const allDbIds: number[] = []
      let completedSearches = 0

      selectedBimObjectIds.forEach((id) => {
        viewerRef.current?.search(
          id,
          (dbIds) => {
            allDbIds.push(...dbIds)
            completedSearches++

            if (completedSearches === selectedBimObjectIds.length && viewerRef.current) {
              if (allDbIds.length > 0) {
                viewerRef.current.isolate(allDbIds)
              }
            }
          },
          () => {
            completedSearches++
            if (completedSearches === selectedBimObjectIds.length && viewerRef.current && allDbIds.length > 0) {
              viewerRef.current.isolate(allDbIds)
            }
          },
          ['externalId']
        )
      })
    } else if (viewerRef.current) {
      viewerRef.current.showAll()
    }
  }, [isolationMode, selectedBimObjectIds, loading])

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 600, borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.100' }}>
      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </Box>
      )}
      {error && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
    </Box>
  )
}

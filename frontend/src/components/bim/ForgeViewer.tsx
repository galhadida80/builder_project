import { useEffect, useRef, useState } from 'react'
import { Box, Skeleton, Typography } from '@/mui'
import { useTranslation } from 'react-i18next'

declare global {
  interface Window {
    Autodesk: typeof Autodesk
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Autodesk {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Viewing {
    function Initializer(options: Record<string, unknown>, callback: () => void): void
    function shutdown(): void
    class GuiViewer3D {
      constructor(container: HTMLElement, config?: Record<string, unknown>)
      start(): number
      finish(): void
      loadDocumentNode(doc: Document, viewable: BubbleNode): Promise<unknown>
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

export default function ForgeViewer({ urn, getToken }: ForgeViewerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Autodesk.Viewing.GuiViewer3D | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initViewer() {
      try {
        loadCSS(VIEWER_CSS)
        await loadScript(VIEWER_JS)

        if (cancelled || !containerRef.current) return

        const token = await getToken()

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

        const encodedUrn = btoa(urn).replace(/=/g, '')
        const documentId = `urn:${encodedUrn}`

        window.Autodesk.Viewing.Document.load(
          documentId,
          (doc) => {
            if (cancelled) return
            const viewable = doc.getRoot().getDefaultGeometry()
            viewer.loadDocumentNode(doc, viewable).then(() => {
              if (!cancelled) setLoading(false)
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
      if (viewerRef.current) {
        viewerRef.current.finish()
        viewerRef.current = null
      }
    }
  }, [urn, getToken, t])

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

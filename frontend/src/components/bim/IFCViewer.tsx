import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { IFCLoader } from 'web-ifc-three'
import { Box, Skeleton, Typography } from '@/mui'
import { bimApi } from '../../api/bim'

interface IFCViewerProps {
  projectId: string
  modelId: string
  filename: string
}

export default function IFCViewer({ projectId, modelId, filename }: IFCViewerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let renderer: THREE.WebGLRenderer | null = null
    let animationId: number | null = null
    let blobUrl: string | null = null

    async function init() {
      const container = containerRef.current
      if (!container) return

      const width = container.clientWidth
      const height = container.clientHeight

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0f0f0)

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
      camera.position.set(15, 15, 15)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      container.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 20, 10)
      scene.add(directionalLight)

      const gridHelper = new THREE.GridHelper(50, 50)
      scene.add(gridHelper)

      function animate() {
        animationId = requestAnimationFrame(animate)
        controls.update()
        renderer!.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        if (!container || !renderer) return
        const w = container.clientWidth
        const h = container.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', handleResize)

      try {
        const blob = await bimApi.getFileContent(projectId, modelId)
        if (cancelled) return

        blobUrl = URL.createObjectURL(blob)
        const ifcLoader = new IFCLoader()
        await ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.75/')

        ifcLoader.load(
          blobUrl,
          (model) => {
            if (cancelled) return
            scene.add(model)

            const box = new THREE.Box3().setFromObject(model)
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)
            const fov = camera.fov * (Math.PI / 180)
            const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5

            camera.position.set(center.x + distance, center.y + distance * 0.5, center.z + distance)
            controls.target.copy(center)
            controls.update()

            setLoading(false)
          },
          undefined,
          () => {
            if (!cancelled) {
              setError(t('bim.viewerLoadError'))
              setLoading(false)
            }
          },
        )
      } catch {
        if (!cancelled) {
          setError(t('bim.viewerLoadError'))
          setLoading(false)
        }
      }

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    init()

    return () => {
      cancelled = true
      if (animationId !== null) cancelAnimationFrame(animationId)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      if (renderer) {
        renderer.dispose()
        const canvas = renderer.domElement
        canvas.parentElement?.removeChild(canvas)
      }
    }
  }, [projectId, modelId, filename, t])

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 600, borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.100' }}>
      {loading && !error && (
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Skeleton variant="rectangular" width="100%" height="100%" />
          <Typography
            sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            color="text.secondary"
          >
            {t('bim.viewerLoading')}
          </Typography>
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

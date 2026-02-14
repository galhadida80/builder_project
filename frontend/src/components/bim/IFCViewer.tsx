import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { IfcAPI } from 'web-ifc'
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
    let ifcApi: IfcAPI | null = null

    async function init() {
      const container = containerRef.current
      if (!container) return

      const width = container.clientWidth
      const height = container.clientHeight

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf0f0f0)

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
      camera.position.set(15, 15, 15)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      container.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true

      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(10, 20, 10)
      scene.add(dirLight)
      scene.add(new THREE.GridHelper(50, 50))

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
        ifcApi = new IfcAPI()
        ifcApi.SetWasmPath('/wasm/')
        await ifcApi.Init()
        if (cancelled) return

        const blob = await bimApi.getFileContent(projectId, modelId)
        if (cancelled) return

        const buffer = await blob.arrayBuffer()
        const data = new Uint8Array(buffer)
        const modelID = ifcApi.OpenModel(data, {
          COORDINATE_TO_ORIGIN: true,
          MEMORY_LIMIT: 512 * 1024 * 1024,
        })

        const modelGroup = new THREE.Group()
        ifcApi.StreamAllMeshes(modelID, (mesh) => {
          const placedGeometries = mesh.geometries
          for (let i = 0; i < placedGeometries.size(); i++) {
            try {
              const placed = placedGeometries.get(i)
              const geom = ifcApi!.GetGeometry(modelID, placed.geometryExpressID)

              const verts = ifcApi!.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize())
              const indices = ifcApi!.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize())

              if (verts.length === 0 || indices.length === 0) {
                geom.delete?.()
                continue
              }

              const positions = new Float32Array(verts.length / 2)
              const normals = new Float32Array(verts.length / 2)
              for (let j = 0; j < verts.length; j += 6) {
                positions[j / 2] = verts[j]
                positions[j / 2 + 1] = verts[j + 1]
                positions[j / 2 + 2] = verts[j + 2]
                normals[j / 2] = verts[j + 3]
                normals[j / 2 + 1] = verts[j + 4]
                normals[j / 2 + 2] = verts[j + 5]
              }

              const bufferGeometry = new THREE.BufferGeometry()
              bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
              bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
              bufferGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

              const { color } = placed
              const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(color.x, color.y, color.z),
                opacity: color.w,
                transparent: color.w < 1,
                side: THREE.DoubleSide,
              })

              const meshObj = new THREE.Mesh(bufferGeometry, material)
              const matrix = new THREE.Matrix4().fromArray(placed.flatTransformation)
              meshObj.applyMatrix4(matrix)
              modelGroup.add(meshObj)

              geom.delete?.()
            } catch {
              // Skip meshes that fail to process
            }
          }
          mesh.delete?.()
        })

        ifcApi.CloseModel(modelID)

        scene.add(modelGroup)

        const box = new THREE.Box3().setFromObject(modelGroup)
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = camera.fov * (Math.PI / 180)
          const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5

          camera.position.set(center.x + distance, center.y + distance * 0.5, center.z + distance)
          controls.target.copy(center)
          controls.update()
        }

        if (!cancelled) setLoading(false)
      } catch (err) {
        console.error('IFC viewer error:', err)
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
      if (renderer) {
        renderer.dispose()
        const canvas = renderer.domElement
        canvas.parentElement?.removeChild(canvas)
      }
      if (ifcApi) {
        try { ifcApi.Dispose() } catch { /* ignore */ }
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

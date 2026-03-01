import { useEffect } from 'react'
import * as THREE from 'three'

interface UseIFCHighlightingParams {
  selectedBimObjectIds: string[]
  isolationMode: boolean
  meshMapRef: React.MutableRefObject<Map<string, THREE.Mesh>>
  selectedMeshesRef: React.MutableRefObject<Map<string, { mesh: THREE.Mesh; originalMaterial: THREE.Material }>>
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>
  controlsRef: React.MutableRefObject<{ target: THREE.Vector3; update: () => void } | null>
}

export function useIFCHighlighting({
  selectedBimObjectIds,
  isolationMode,
  meshMapRef,
  selectedMeshesRef,
  cameraRef,
  controlsRef,
}: UseIFCHighlightingParams) {
  useEffect(() => {
    selectedMeshesRef.current.forEach(({ mesh, originalMaterial }) => {
      mesh.material = originalMaterial
    })
    selectedMeshesRef.current.clear()

    if (selectedBimObjectIds.length > 0) {
      const meshesToHighlight: THREE.Mesh[] = []

      selectedBimObjectIds.forEach((id) => {
        const mesh = meshMapRef.current.get(id)
        if (mesh) {
          const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          const highlightMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(1, 0.6, 0),
            emissive: new THREE.Color(1, 0.6, 0),
            emissiveIntensity: 0.5,
            side: THREE.DoubleSide,
          })
          mesh.material = highlightMaterial
          selectedMeshesRef.current.set(id, { mesh, originalMaterial: material })
          meshesToHighlight.push(mesh)
        }
      })

      if (meshesToHighlight.length > 0) {
        const camera = cameraRef.current
        const controls = controlsRef.current
        if (camera && controls) {
          const combinedBox = new THREE.Box3()
          meshesToHighlight.forEach((mesh) => {
            combinedBox.union(new THREE.Box3().setFromObject(mesh))
          })

          const center = combinedBox.getCenter(new THREE.Vector3())
          const size = combinedBox.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = camera.fov * (Math.PI / 180)
          const distance = maxDim / (2 * Math.tan(fov / 2)) * 2.5

          const targetPosition = new THREE.Vector3(
            center.x + distance * 0.7,
            center.y + distance * 0.5,
            center.z + distance * 0.7
          )

          const startPosition = camera.position.clone()
          const startTarget = controls.target.clone()
          const duration = 1000
          const startTime = performance.now()

          const cam = camera
          const ctrl = controls

          const animateCamera = () => {
            const elapsed = performance.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)

            cam.position.lerpVectors(startPosition, targetPosition, eased)
            ctrl.target.lerpVectors(startTarget, center, eased)
            ctrl.update()

            if (progress < 1) {
              requestAnimationFrame(animateCamera)
            }
          }

          animateCamera()
        }
      }
    }
  }, [selectedBimObjectIds, meshMapRef, selectedMeshesRef, cameraRef, controlsRef])

  useEffect(() => {
    if (isolationMode && selectedBimObjectIds.length > 0) {
      const selectedSet = new Set(selectedBimObjectIds)
      meshMapRef.current.forEach((mesh, id) => {
        mesh.visible = selectedSet.has(id)
      })
    } else {
      meshMapRef.current.forEach((mesh) => {
        mesh.visible = true
      })
    }
  }, [isolationMode, selectedBimObjectIds, meshMapRef])
}

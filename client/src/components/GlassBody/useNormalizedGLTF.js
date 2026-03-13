import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loads a GLB, clones it, centers the geometry at origin,
 * and scales it so its largest dimension equals `targetSize`.
 */
export function useNormalizedGLTF(path, targetSize = 0.1) {
  const { scene } = useGLTF(path);
  const normalized = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? targetSize / maxDim : 1;

    const wrapper = new THREE.Group();
    clone.position.sub(center);
    wrapper.add(clone);
    wrapper.scale.setScalar(scale);
    return wrapper;
  }, [scene, targetSize]);

  return normalized;
}

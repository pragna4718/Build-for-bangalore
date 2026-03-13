import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useNormalizedGLTF } from "./useNormalizedGLTF";

export default function Skeleton({ visible = true, ...props }) {
  const ref = useRef();
  const model = useNormalizedGLTF("/models/male_human_skeleton_-_zbrush_-_anatomy_study.glb", 1.8);

  useEffect(() => {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: "#ccccdd", emissive: "#8888ff",
          emissiveIntensity: 0.12, roughness: 0.65, metalness: 0.02,
          transparent: true, opacity: 0.2, side: THREE.DoubleSide,
        });
      }
    });
  }, [model]);

  if (!visible) return null;

  return (
    <group ref={ref} {...props}>
      <primitive object={model} />
    </group>
  );
}

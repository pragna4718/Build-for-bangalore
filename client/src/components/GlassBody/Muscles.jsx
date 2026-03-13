import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useNormalizedGLTF } from "./useNormalizedGLTF";

export default function Muscles({ visible = true, ...props }) {
  const ref = useRef();
  const model = useNormalizedGLTF("/models/male_body_muscular_system_-_anatomy_study.glb", 1.8);

  useEffect(() => {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: "#ff6699", emissive: "#cc4466",
          emissiveIntensity: 0.12, roughness: 0.5, metalness: 0.05,
          transparent: true, opacity: 0.35, clearcoat: 0.15,
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

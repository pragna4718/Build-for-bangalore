import { useRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function Muscles({ ...props }) {
  const ref = useRef();
  const { scene } = useGLTF("/models/male_body_muscular_system_-_anatomy_study.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: "#ff6699",
          emissive: "#cc4466",
          emissiveIntensity: 0.12,
          roughness: 0.5,
          metalness: 0.05,
          transparent: true,
          opacity: 0.35,
          clearcoat: 0.15,
        });
        child.castShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <group ref={ref} {...props}>
      <primitive object={clonedScene} />
    </group>
  );
}

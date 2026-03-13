import { useRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function Skeleton({ ...props }) {
  const ref = useRef();
  const { scene } = useGLTF("/models/male_human_skeleton_-_zbrush_-_anatomy_study.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: "#ccccdd",
          emissive: "#ffffff",
          emissiveIntensity: 0.08,
          roughness: 0.65,
          metalness: 0.02,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
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

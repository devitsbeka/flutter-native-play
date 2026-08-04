import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { worldColors, worldMaterials } from "../components/materials";

const WATER_SIZE = 900;
const WATER_SEGMENTS = 48;
const WAVE_HEIGHT = 0.55;

/**
 * Animated turquoise sea. A tessellated plane swells with two crossing sine
 * waves; recomputed normals make the light glint drift gently. Static under
 * reduced motion. The far corners disappear into fog before they can read
 * as square.
 */
export function Water({ animate }: { animate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, WATER_SEGMENTS, WATER_SEGMENTS);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((state) => {
    if (!animate || !meshRef.current) return;
    const t = state.clock.elapsedTime * 0.55;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(
        i,
        Math.sin(x * 0.12 + t) * Math.cos(z * 0.1 + t * 0.8) * WAVE_HEIGHT +
          Math.sin((x + z) * 0.05 + t * 0.6) * WAVE_HEIGHT * 0.5,
      );
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={worldMaterials.water} position={[0, -8, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.4, 6]}>
        <ringGeometry args={[24, 60, 48]} />
        <meshStandardMaterial color={worldColors.waterDeep} transparent opacity={0.25} roughness={0.4} />
      </mesh>
    </group>
  );
}

import { useMemo } from "react";
import * as THREE from "three";
import { GeneratedRegion } from "../schemas/worldDefinition";
import { worldMaterials } from "../components/materials";

function outlineToShape(outline: Array<[number, number]>, scale: number): THREE.Shape {
  const shape = new THREE.Shape();
  const pts = outline.map(([x, z]) => new THREE.Vector2(x * scale, z * scale));
  shape.moveTo(pts[0].x, pts[0].y);
  // Smooth the wobbled polygon with quadratic joins for soft, rounded coasts.
  for (let i = 1; i <= pts.length; i++) {
    const current = pts[i % pts.length];
    const prev = pts[i - 1];
    const mid = prev.clone().add(current).multiplyScalar(0.5);
    shape.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
  }
  return shape;
}

/**
 * A floating island: soft-beveled grass cap over two stepped cliff tiers.
 * Geometry is derived deterministically from generated outline data and is
 * shaped to read like the layered cliffs in the painted reference.
 */
export function Island({ region }: { region: GeneratedRegion }) {
  const { def } = region;
  const alpine = def.biome === "alpine";

  const { cap, cliffTop, cliffBottom } = useMemo(() => {
    const capGeo = new THREE.ExtrudeGeometry(outlineToShape(region.outline, 1), {
      depth: 1.6,
      bevelEnabled: true,
      bevelThickness: 0.9,
      bevelSize: 1.1,
      bevelSegments: 3,
      curveSegments: 6,
    });
    const cliffTopGeo = new THREE.ExtrudeGeometry(outlineToShape(region.outline, 0.93), {
      depth: def.elevation * 0.62,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 0.5,
      bevelSegments: 2,
      curveSegments: 5,
    });
    const cliffBottomGeo = new THREE.ExtrudeGeometry(outlineToShape(region.outline, 0.78), {
      depth: def.elevation * 0.85,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.7,
      bevelSegments: 2,
      curveSegments: 5,
    });
    for (const g of [capGeo, cliffTopGeo, cliffBottomGeo]) g.rotateX(Math.PI / 2);
    return { cap: capGeo, cliffTop: cliffTopGeo, cliffBottom: cliffBottomGeo };
  }, [region.outline, def.elevation]);

  // The cap's bevel rises ~0.9 above its origin; offset so the walkable
  // surface lands exactly at `elevation`, where nodes and paths are placed.
  const capTopOffset = 0.9;
  return (
    <group position={def.position} rotation={[0, def.rotationY ?? 0, 0]} scale={def.scale ?? 1}>
      <mesh
        geometry={cap}
        material={alpine ? worldMaterials.grassAlpine : worldMaterials.grassTop}
        position={[0, def.elevation - capTopOffset, 0]}
        receiveShadow
      />
      <mesh
        geometry={cliffTop}
        material={alpine ? worldMaterials.cliffCool : worldMaterials.cliffWarm}
        position={[0, def.elevation - capTopOffset - 1.9, 0]}
      />
      <mesh
        geometry={cliffBottom}
        material={worldMaterials.cliffShade}
        position={[0, def.elevation - capTopOffset - 1.9 - def.elevation * 0.62, 0]}
      />
    </group>
  );
}

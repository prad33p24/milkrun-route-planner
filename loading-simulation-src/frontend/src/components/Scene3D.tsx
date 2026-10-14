import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { BinResult, PackResponse } from "../types";
import { colorForName } from "../engine/colors";

interface Props {
  pack: PackResponse;
  bin: BinResult;
}

export default function Scene3D({ pack, bin }: Props) {
  const { length_cm: L, width_cm: W, height_cm: H } = pack.container_dims;
  const allNames = pack.cargo_summary.map((c) => c.name);

  // Axis convention: x = container length -> three.js X, y = vertical height
  // -> three.js Y, z = container width -> three.js Z (see PlacedBox in types.ts).
  return (
    <div className="scene3d-wrapper">
      <Canvas camera={{ position: [L * 1.3, H * 1.6, W * 1.8], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[L, H * 2, W]} intensity={0.8} />
        <OrbitControls target={[0, 0, 0]} />

        {/* container wireframe, centered at origin */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[L, H, W]} />
          <meshBasicMaterial color="#888888" wireframe />
        </mesh>

        {bin.placed_boxes.map((box, i) => {
          const px = box.x + box.length / 2 - L / 2;
          const py = box.y + box.height / 2 - H / 2;
          const pz = box.z + box.width / 2 - W / 2;
          return (
            <mesh key={i} position={[px, py, pz]}>
              <boxGeometry args={[box.length * 0.98, box.height * 0.98, box.width * 0.98]} />
              <meshStandardMaterial color={colorForName(box.cargo_name, allNames)} />
            </mesh>
          );
        })}
      </Canvas>
      <div className="legend">
        {allNames.map((n) => (
          <span key={n} className="legend-item">
            <span className="legend-swatch" style={{ background: colorForName(n, allNames) }} />
            {n || "(unnamed)"}
          </span>
        ))}
      </div>
    </div>
  );
}

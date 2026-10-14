import * as THREE from "three";
import type { PlacedBox } from "../types";
import { colorForName } from "./colors";

// Renders the same scene as the on-screen 3D view (Scene3D.tsx) - same
// camera framing, same axis mapping - to an off-DOM canvas, for embedding in
// the PDF export. Reusing the on-screen view's proven-correct perspective
// camera avoids re-deriving projection math (a hand-rolled isometric
// projection badly distorted elongated containers - far-floor points ended
// up drawn above near-ceiling points - so we render the real thing instead).
export function renderContainerToDataUrl(
  container: { length_cm: number; width_cm: number; height_cm: number },
  boxes: PlacedBox[],
  allNames: string[],
  pixelWidth: number,
  pixelHeight: number
): string {
  const { length_cm: L, width_cm: W, height_cm: H } = container;

  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(pixelWidth, pixelHeight, false);
  renderer.setClearColor(0xffffff, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, pixelWidth / pixelHeight, 0.1, Math.max(L, W, H) * 10);
  camera.position.set(L * 1.3, H * 1.6, W * 1.8);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(L, H * 2, W);
  scene.add(dirLight);

  const containerGeom = new THREE.BoxGeometry(L, H, W);
  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(containerGeom),
    new THREE.LineBasicMaterial({ color: 0x888888 })
  );
  scene.add(wireframe);
  containerGeom.dispose();

  const boxMeshes: THREE.Mesh[] = [];
  for (const box of boxes) {
    const geom = new THREE.BoxGeometry(box.length * 0.98, box.height * 0.98, box.width * 0.98);
    const mat = new THREE.MeshStandardMaterial({ color: colorForName(box.cargo_name, allNames) });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(
      box.x + box.length / 2 - L / 2,
      box.y + box.height / 2 - H / 2,
      box.z + box.width / 2 - W / 2
    );
    scene.add(mesh);
    boxMeshes.push(mesh);
  }

  renderer.render(scene, camera);
  const dataUrl = canvas.toDataURL("image/png");

  for (const mesh of boxMeshes) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  wireframe.geometry.dispose();
  (wireframe.material as THREE.Material).dispose();
  renderer.dispose();

  return dataUrl;
}

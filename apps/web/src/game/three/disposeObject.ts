import type { Material, Object3D, Texture } from "three";

/** Release GPU resources for a scene graph (geometries, materials, textures). */
export function disposeObject3D(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Object3D & {
      geometry?: { dispose: () => void };
      material?: Material | Material[];
    };
    mesh.geometry?.dispose();
    const materials = mesh.material
      ? Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        const maybeTex = value as Texture | undefined;
        if (maybeTex && typeof maybeTex.dispose === "function" && "isTexture" in maybeTex) {
          maybeTex.dispose();
        }
      }
      material.dispose();
    }
  });
}

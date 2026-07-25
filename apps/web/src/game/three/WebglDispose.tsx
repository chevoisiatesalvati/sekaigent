"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { disposeObject3D } from "./disposeObject";

/** Force WebGL renderer + scene GPU cleanup when a Canvas unmounts. */
export function WebglDispose() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    return () => {
      disposeObject3D(scene);
      gl.dispose();
    };
  }, [gl, scene]);

  return null;
}

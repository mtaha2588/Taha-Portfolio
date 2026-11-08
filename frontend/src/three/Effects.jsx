import { useMemo } from "react";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";

/**
 * Post-processing: bloom makes the emissive holographic lines glow,
 * a very slight chromatic aberration adds a lens-like edge, and a
 * vignette focuses the eye. Only used on the "high" quality tier.
 */
export default function Effects() {
  const offset = useMemo(() => new Vector2(0.00045, 0.0003), []);
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.28} luminanceSmoothing={0.3} radius={0.65} />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={offset}
        radialModulation
        modulationOffset={0.35}
      />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}

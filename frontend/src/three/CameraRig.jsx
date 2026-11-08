import { useLayoutEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { motion } from "../store/universe";
import { INTRO_OFFSET as INTRO_ARRAY, STATIONS as STATION_ARRAYS } from "./stations";
import { EXHIBITS, focusPose } from "./exhibits/layout";

const UP = new Vector3(0, 1, 0);
const INTRO_OFFSET = new Vector3(...INTRO_ARRAY);
const toPose = ({ pos, target }) => ({ pos: new Vector3(...pos), target: new Vector3(...target) });
const STATIONS = STATION_ARRAYS.map((s) => ({ desktop: toPose(s.desktop), mobile: toPose(s.mobile) }));

// Holds the camera still for most of a section, then glides to the next.
const hold = (t) => {
  const x = Math.min(1, Math.max(0, (t - 0.15) / 0.7));
  return x * x * (3 - 2 * x);
};

/**
 * Drives the camera every frame from three inputs:
 *  1. motion.station - scroll position between stations (set by GSAP ScrollTrigger)
 *  2. motion.intro   - cinematic opening values (animated by a GSAP timeline)
 *  3. motion.pointer - subtle parallax following the mouse
 * The result is eased with frame-rate-independent damping.
 */
export default function CameraRig() {
  const { camera, size } = useThree();
  const tmp = useMemo(
    () => ({
      pos: new Vector3(),
      target: new Vector3(),
      look: new Vector3(),
      arm: new Vector3(),
      fp: new Vector3(),
      ft: new Vector3(),
    }),
    [],
  );

  const layoutKey = size.width / size.height < 0.85 ? "mobile" : "desktop";

  const pose = (out) => {
    const last = STATIONS.length - 1;
    const f = Math.min(Math.max(motion.station, 0), last);
    const i = Math.min(Math.floor(f), last);
    const j = Math.min(i + 1, last);
    const t = hold(f - i);
    const a = STATIONS[i][layoutKey];
    const b = STATIONS[j][layoutKey];
    out.pos.lerpVectors(a.pos, b.pos, t);
    out.target.lerpVectors(a.target, b.target, t);

    // Intro: pull the camera back along an arm and swing it around the target.
    const { dolly, orbit } = motion.intro;
    out.arm.copy(out.pos).sub(out.target).addScaledVector(INTRO_OFFSET, dolly).applyAxisAngle(UP, orbit);
    out.pos.copy(out.target).add(out.arm);

    // Focus mode: blend toward the close-up pose of the selected exhibit (blend is tweened by GSAP).
    const { blend, zoom } = motion.focus;
    const ex = motion.focusKey && EXHIBITS[motion.focusKey];
    if (ex && blend > 0) {
      const f = focusPose(ex, zoom, layoutKey === "mobile");
      out.pos.lerp(out.fp.set(...f.pos), blend);
      out.target.lerp(out.ft.set(...f.target), blend);
    }

    const settle = (1 - dolly) * (1 - blend * 0.7);
    out.pos.x += motion.pointer.x * 0.55 * settle;
    out.pos.y += motion.pointer.y * 0.3 * settle;
  };

  // Start exactly at the intro pose so the first frame doesn't swoop in from the origin.
  useLayoutEffect(() => {
    pose(tmp);
    camera.position.copy(tmp.pos);
    tmp.look.copy(tmp.target);
    camera.lookAt(tmp.look);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    pose(tmp);
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3.4);
    camera.position.lerp(tmp.pos, k);
    tmp.look.lerp(tmp.target, k);
    camera.lookAt(tmp.look);
  });

  return null;
}

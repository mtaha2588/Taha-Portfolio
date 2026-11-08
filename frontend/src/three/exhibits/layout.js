/**
 * Where each project exhibition floats in the universe, and how the
 * camera frames it. Plain numbers only (no three.js import) because the
 * HUD and the page sections import this file too.
 *
 * The globe sits at the origin; the exhibitions are arranged around it.
 */
export const EXHIBITS = {
  avalanche: {
    key: "avalanche",
    slug: "avalanche-intelligence-platform",
    sectionId: "exhibit-avalanche",
    label: "Avalanche Intelligence",
    position: [-17, -3.1, -6],
    azimuth: 0.62, // direction (radians, around Y) from the exhibit to the camera
    distance: 16.5,
    height: 4.2,
  },
  agent: {
    key: "agent",
    slug: "ai-business-automation-agent",
    sectionId: "exhibit-agent",
    label: "Automation Agent",
    position: [0, -0.6, -21],
    azimuth: 0,
    distance: 13.5,
    height: 2.2,
    // On phones the camera pulls back further; for this exhibit "back" points at the
    // globe, so stay closer and higher to keep the camera outside it.
    mobile: { distance: 18, height: 5, targetY: -0.4 },
  },
  car: {
    key: "car",
    slug: "ai-enabled-car-sales-platform",
    sectionId: "exhibit-car",
    label: "Car Sales Platform",
    position: [17, -3.6, -6],
    azimuth: -0.62,
    distance: 16.5,
    height: 3.2,
  },
};

export const EXHIBIT_LIST = [EXHIBITS.avalanche, EXHIBITS.agent, EXHIBITS.car];

// Height (above the exhibit base) the focus camera looks at.
const FOCUS_LIFT = { avalanche: 1.9, agent: 2.6, car: 1.1 };

/** Close-up camera pose for focus mode: centred on the object, nearer than its scroll station. */
export function focusPose(ex, zoom = 1, mobile = false) {
  const [px, py, pz] = ex.position;
  const d = ex.distance * (mobile ? 1.1 : 0.86) * zoom;
  const h = ex.height * (mobile ? 1.2 : 0.8) * zoom;
  return {
    pos: [px + Math.sin(ex.azimuth) * d, py + h + 0.6, pz + Math.cos(ex.azimuth) * d],
    target: [px, py + FOCUS_LIFT[ex.key], pz],
  };
}

/**
 * Camera poses for one exhibit. On desktop the object is framed to the
 * right of centre (the info panel sits on the left); on phones it sits in
 * the upper part of the screen above the panel.
 */
export function exhibitPose(ex, { desktopShift = 3.8, lift = 0.6 } = {}) {
  const [px, py, pz] = ex.position;
  const sx = Math.sin(ex.azimuth);
  const cz = Math.cos(ex.azimuth);

  const camAt = (dist, h) => [px + sx * dist, py + h, pz + cz * dist];
  // Screen-right vector for a camera looking back at the exhibit.
  const right = [cz, 0, -sx];

  return {
    desktop: {
      pos: camAt(ex.distance, ex.height),
      target: [px - right[0] * desktopShift, py + lift, pz - right[2] * desktopShift],
    },
    mobile: {
      pos: camAt(ex.mobile?.distance ?? ex.distance * 1.55, ex.mobile?.height ?? ex.height * 1.6),
      // Aim below the object so it sits in the upper part of the screen, above the panel.
      target: [px, py + (ex.mobile?.targetY ?? -3.4), pz],
    },
  };
}

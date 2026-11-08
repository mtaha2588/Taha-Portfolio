/**
 * Top-level navigation. `stations` lists which camera stations
 * (see src/three/stations.js) belong to each nav item, so the HUD can
 * highlight "Projects" while the camera visits any exhibition.
 */
export const SECTIONS = [
  { id: "home", label: "Home", stations: [0] },
  { id: "projects", label: "Projects", stations: [1, 2, 3, 4] },
  { id: "lab", label: "AI Lab", stations: [5] },
  { id: "skills", label: "Skills", stations: [6] },
  { id: "about", label: "About", stations: [7] },
  { id: "contact", label: "Contact", stations: [8] },
];

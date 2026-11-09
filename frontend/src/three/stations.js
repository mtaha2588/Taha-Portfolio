import { EXHIBITS, exhibitPose } from "./exhibits/layout";
import { ENVIRONMENTS as ENV } from "./environments/layout";

/**
 * Camera "stations": one per page section, in page order. Scrolling
 * moves the camera smoothly from one station to the next. Each has a
 * desktop and a mobile (portrait) pose: where the camera sits and where
 * it looks.
 *
 * Plain [x, y, z] arrays on purpose: this file is also imported by the
 * HUD, and importing three.js here would pull the whole 3D library
 * into the initial page bundle.
 */
export const STATIONS = [
  {
    id: "home",
    label: "Origin",
    // Globe sits to the right of the hero text on desktop, low on phones like a horizon.
    desktop: { pos: [0, 0.8, 14], target: [-3.6, 0.1, 0] },
    mobile: { pos: [0, -1.5, 23], target: [0, 7.2, 0] },
  },
  {
    id: "projects",
    label: "Exhibitions",
    // High establishing shot: the globe with all three exhibitions around it.
    desktop: { pos: [0, 17, 37], target: [0, -3.5, -8] },
    mobile: { pos: [0, 27, 54], target: [0, -10, -8] },
  },
  { id: "avalanche", label: "Avalanche Intelligence", ...exhibitPose(EXHIBITS.avalanche) },
  { id: "agent", label: "Automation Agent", ...exhibitPose(EXHIBITS.agent, { lift: 1.6, desktopShift: 2.6 }) },
  { id: "car", label: "Car Sales Platform", ...exhibitPose(EXHIBITS.car, { lift: 0.9 }) },
  { id: "lab", label: "AI Workflow Lab", ...exhibitPose(ENV.lab, { desktopShift: 6, lift: 0.5 }) },
  { id: "skills", label: "Skills Constellation", ...exhibitPose(ENV.skills, { desktopShift: 9.5, lift: 0 }) },
  { id: "about", label: "Identity", ...exhibitPose(ENV.about, { desktopShift: 3.8, lift: 2 }) },
  { id: "contact", label: "Transmission", ...exhibitPose(ENV.contact, { desktopShift: 4, lift: 2.5 }) },
];

// Where the intro camera starts, relative to station 0 (far out, high up).
export const INTRO_OFFSET = [0, 7, 34];

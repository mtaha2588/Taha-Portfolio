/**
 * One stable DOM container for every drei <Html> overlay (labels, glass panels).
 *
 * Without it, <Html> attaches to the canvas's events target, which only
 * connects just after start-up. That change made all overlays unmount and
 * recreate their React roots mid-render ("Attempted to synchronously
 * unmount a root while React was already rendering"). UniverseStage sets
 * `.current` to a div layered over the canvas before the scene renders.
 */
export const HTML_LAYER = { current: null };

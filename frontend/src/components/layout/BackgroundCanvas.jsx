/**
 * Fixed, site-wide ambient background: a faint technical grid,
 * slow-drifting colour fields and a vignette. Pure CSS, so it costs
 * almost nothing to render and stops moving under reduced motion.
 */
export default function BackgroundCanvas() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <div className="animate-drift-a absolute -top-[20%] -left-[10%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.16),transparent_65%)] blur-2xl" />
      <div className="animate-drift-b absolute top-[30%] -right-[15%] h-[80vh] w-[80vh] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.12),transparent_65%)] blur-2xl" />
      <div className="animate-drift-a absolute -bottom-[25%] left-[20%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08),transparent_65%)] blur-2xl" />

      {/* Grid lines, faded out towards the edges */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,175,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,175,255,0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 85%)",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(4,6,13,0.85)_100%)]" />
    </div>
  );
}

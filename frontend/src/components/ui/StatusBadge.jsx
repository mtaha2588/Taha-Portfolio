/**
 * Project status label. Set `status` in projects.json to one of the
 * keys below; any other text is shown with the neutral style.
 */
const STYLES = {
  Live: { dot: "bg-signal", text: "text-emerald-300", ring: "border-emerald-400/30 bg-emerald-400/10" },
  "In Development": { dot: "bg-cyan", text: "text-cyan-200", ring: "border-cyan/30 bg-cyan/10" },
  Prototype: { dot: "bg-violet", text: "text-violet-200", ring: "border-violet/35 bg-violet/10" },
  Concept: { dot: "bg-fg-subtle", text: "text-fg-muted", ring: "border-line-strong bg-white/5" },
};

export default function StatusBadge({ status, className = "" }) {
  const style = STYLES[status] ?? STYLES.Concept;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider uppercase ${style.ring} ${style.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span className="sr-only">Status: </span>
      {status}
    </span>
  );
}

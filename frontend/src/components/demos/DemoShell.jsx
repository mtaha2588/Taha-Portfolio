import { useState } from "react";
import { RefreshCw, Radio, WifiOff } from "lucide-react";
import { useExhibits } from "../../store/exhibits";
import { loadExhibitData } from "../../hooks/useExhibitData";

/** Frame around each live demo: endpoint label + live/offline indicator with retry. */
export default function DemoShell({ title, endpoint, children }) {
  const online = useExhibits((s) => s.apiOnline);
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await loadExhibitData();
    setRetrying(false);
  };

  return (
    <div className="mt-6 rounded-xl border border-line-strong bg-ink-950/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] tracking-[0.2em] text-cyan uppercase">{title}</p>
        {online === false ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-amber-300/90 uppercase">
            <WifiOff size={12} aria-hidden="true" /> API offline
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-signal uppercase">
            <Radio size={12} aria-hidden="true" /> {online ? "Live API" : "Connecting…"}
          </span>
        )}
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-fg-subtle">{endpoint}</p>

      {online === false ? (
        <div className="mt-4 text-sm text-fg-muted">
          <p>
            The live demo API isn't reachable right now. If you're running locally, start the backend; hosted free
            servers can take up to a minute to wake up.
          </p>
          <button type="button" onClick={retry} disabled={retrying} className="btn-ghost mt-3 !px-3 !py-2 !text-sm">
            <RefreshCw size={14} className={retrying ? "animate-spin" : ""} aria-hidden="true" />
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : (
        <div className="mt-4">{children}</div>
      )}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-xs font-medium text-fg-muted">
        {label}
        {hint && <span className="font-mono text-[11px] text-fg">{hint}</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
      {error}
    </p>
  );
}

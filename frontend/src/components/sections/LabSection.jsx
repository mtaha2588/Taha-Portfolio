import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { LAB_STAGES } from "../../data/workflowLab";
import { exhibits, useExhibits } from "../../store/exhibits";
import { useProjects } from "../../hooks/useProjects";
import EnvSection from "./EnvSection";

export default function LabSection() {
  const selected = useExhibits((s) => s.labStage);
  const { projects } = useProjects();
  const [running, setRunning] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const stage = LAB_STAGES.find((s) => s.id === selected) ?? LAB_STAGES[0];
  const index = LAB_STAGES.indexOf(stage);

  // Sends a packet through the 3D pipeline and steps the selection along with it (5 s total).
  const run = () => {
    timers.current.forEach(clearTimeout);
    setRunning(true);
    exhibits.set((s) => ({ labRun: s.labRun + 1, labStage: LAB_STAGES[0].id }));
    LAB_STAGES.forEach((st, i) => timers.current.push(setTimeout(() => exhibits.set({ labStage: st.id }), i * 1000)));
    timers.current.push(setTimeout(() => setRunning(false), LAB_STAGES.length * 1000));
  };

  return (
    <EnvSection
      id="lab"
      station={5}
      eyebrow="AI Workflow Laboratory"
      title="From raw data to automated action"
      intro="The pipeline behind every project on this site. Select a stage here or in 3D to inspect how it works, the techniques involved and where it is applied."
    >
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Pipeline stages">
        {LAB_STAGES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => exhibits.set({ labStage: s.id })}
              aria-pressed={s.id === stage.id}
              className={`w-full rounded-lg border px-1.5 py-2 text-center transition-colors ${s.id === stage.id ? "border-cyan/50 bg-cyan/10" : "border-line hover:border-cyan/30"}`}
            >
              <span className="block font-mono text-xs" style={{ color: s.color }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-fg-muted">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-1 h-0.5 overflow-hidden rounded bg-white/5" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-cyan to-violet transition-all duration-700"
          style={{ width: `${((index + 1) / LAB_STAGES.length) * 100}%` }}
        />
      </div>

      <div className="mt-5 rounded-xl border border-line bg-white/[0.02] p-4" aria-live="polite">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: stage.color }}>
          Stage {String(index + 1).padStart(2, "0")} · {stage.short}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold text-fg">{stage.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{stage.description}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-fg">Techniques</p>
            <ul className="mt-1.5 space-y-1 text-xs text-fg-muted">
              {stage.techniques.map((t) => (
                <li key={t}>▸ {t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-fg">Tools</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {stage.tools.map((t) => (
                <li key={t} className="chip">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-fg-subtle">
          Applied in:{" "}
          {stage.projects.map((slug, i) => {
            const p = projects.find((x) => x.slug === slug);
            return p ? (
              <span key={slug}>
                {i > 0 && " · "}
                <Link to={`/projects/${slug}`} className="text-cyan-200 hover:underline">
                  {p.title}
                </Link>
              </span>
            ) : null;
          })}
        </p>
      </div>

      <button type="button" onClick={run} disabled={running} className="btn-primary mt-5 w-full justify-center">
        <Play size={16} /> {running ? "Pipeline running…" : "Run pipeline"}
      </button>
    </EnvSection>
  );
}

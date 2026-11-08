import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { exhibits, useExhibits } from "../../store/exhibits";
import { demoApi } from "../../lib/demoApi";
import DemoShell, { ErrorNote } from "./DemoShell";

const TASKS = [
  { id: "inquiry_triage", label: "Inquiry triage", hint: "Classify, prioritise and route customer messages" },
  { id: "sales_summary", label: "Sales summary", hint: "Aggregate records, detect the trend, write a report" },
];
const STAGE_STYLE = {
  input: "text-cyan-200 border-cyan/30",
  processing: "text-indigo-200 border-indigo-400/30",
  decision: "text-violet-200 border-violet/40",
  output: "text-sky-200 border-sky-400/30",
};
const STEP_MS = 750;

export default function WorkflowRunner() {
  const run = useExhibits((s) => s.agentRun);
  const step = useExhibits((s) => s.agentStep);
  const [task, setTask] = useState(TASKS[0].id);
  const [samples, setSamples] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ensureSamples = async () => {
    if (samples) return samples;
    const data = await demoApi.agentSamples();
    setSamples(data.samples);
    return data.samples;
  };

  const start = async () => {
    setBusy(true);
    setError("");
    timers.current.forEach(clearTimeout);
    try {
      const all = await ensureSamples();
      const result = await demoApi.runAgent(all[task]);
      exhibits.set({ agentRun: result, agentStep: -1 });
      // Replay the real step log one step at a time so the 3D core can follow along.
      result.steps.forEach((_, i) => {
        timers.current.push(setTimeout(() => exhibits.set({ agentStep: i }), 300 + i * STEP_MS));
      });
      timers.current.push(setTimeout(() => setBusy(false), 300 + result.steps.length * STEP_MS));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const shown = run ? run.steps.slice(0, step + 1) : [];
  const finished = run && step >= run.steps.length - 1;

  return (
    <DemoShell title="Live demo · Workflow agent" endpoint="POST /api/demos/automation-agent/run">
      <fieldset>
        <legend className="sr-only">Workflow</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TASKS.map((t) => (
            <label
              key={t.id}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${task === t.id ? "border-violet/50 bg-violet/10" : "border-line-strong hover:border-violet/30"}`}
            >
              <input
                type="radio"
                name="agent-task"
                value={t.id}
                checked={task === t.id}
                onChange={() => setTask(t.id)}
                className="sr-only"
              />
              <span className="block text-sm font-medium text-fg">{t.label}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {samples && (
        <details className="mt-3 text-xs text-fg-muted">
          <summary className="cursor-pointer text-fg-subtle hover:text-fg">
            View the sample input that will be sent
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-ink-950/80 p-3 font-mono text-[11px] whitespace-pre-wrap text-fg-muted">
            {JSON.stringify(samples[task], null, 2)}
          </pre>
        </details>
      )}

      <button type="button" onClick={start} disabled={busy} className="btn-primary mt-4 w-full justify-center">
        {busy ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Play size={16} aria-hidden="true" />
        )}
        {busy ? "Running workflow…" : "Run workflow"}
      </button>
      <ErrorNote error={error} />

      {run && (
        <div className="mt-5" aria-live="polite">
          <p className="font-mono text-[11px] text-fg-subtle">
            Run #{run.run_id} · engine: {run.engine}
          </p>
          <ol className="mt-2 space-y-2">
            {shown.map((s, i) => (
              <li
                key={s.index}
                className={`rounded-lg border bg-ink-950/50 p-2.5 ${i === step && !finished ? "border-violet/50" : "border-line"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${STAGE_STYLE[s.stage]}`}
                  >
                    {s.stage}
                  </span>
                  <span className="font-mono text-[10px] text-fg-subtle">{s.duration_ms.toFixed(3)} ms</span>
                </div>
                <p className="mt-1 font-mono text-xs text-fg">{s.tool}</p>
                <p className="text-xs text-fg-muted">
                  {s.description} → <span className="text-cyan-200">{s.output_summary}</span>
                </p>
              </li>
            ))}
          </ol>
          {finished && (
            <div className="mt-4">
              <p className="text-xs font-medium text-fg-muted">Generated report</p>
              <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg border border-line bg-ink-950/80 p-3 font-mono text-[11px] whitespace-pre-wrap text-fg-muted">
                {run.report_markdown}
              </pre>
              {run.notes?.map((n) => (
                <p key={n} className="mt-2 text-xs text-fg-subtle">
                  {n}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </DemoShell>
  );
}

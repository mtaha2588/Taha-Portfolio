import { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { exhibits, useExhibits } from "../../store/exhibits";
import { demoApi } from "../../lib/demoApi";
import DemoShell, { ErrorNote, Field } from "./DemoShell";

const DIRS = [
  ["N", 0],
  ["NE", 45],
  ["E", 90],
  ["SE", 135],
  ["S", 180],
  ["SW", 225],
  ["W", 270],
  ["NW", 315],
];
const LEVEL_STYLE = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  elevated: "border-cyan/30 bg-cyan/10 text-cyan-100",
  high: "border-violet/40 bg-violet/15 text-violet-100",
};

export default function SlopeAssessor() {
  const terrain = useExhibits((s) => s.terrain);
  const showRisk = useExhibits((s) => s.showRisk);
  const [form, setForm] = useState({ slope: 38, aspect: 45, snow: 35, wind: 30, windFrom: 225, warming: false });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : Number(e.target.value) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await demoApi.assess({
        slope_deg: form.slope,
        aspect_deg: form.aspect,
        new_snow_cm: form.snow,
        wind_speed_kmh: form.wind,
        wind_from_deg: form.windFrom,
        rapid_warming: form.warming,
      });
      setResult(r);
      exhibits.set({ assessment: r });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DemoShell title="Live demo · Terrain analysis" endpoint="POST /api/demos/avalanche/assess · GET /terrain/sample">
      {terrain && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-fg-muted">
              Terrain model: {terrain.size}×{terrain.size} DEM,{" "}
              {terrain.source === "api" ? "computed by the API" : "generated in your browser"}
            </p>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                checked={showRisk}
                onChange={(e) => exhibits.set({ showRisk: e.target.checked })}
                className="h-4 w-4 accent-violet-500"
              />
              Show 30–45° zones
            </label>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/5" aria-label="Slope class distribution">
            {terrain.classes.map((c) => (
              <div
                key={c.id}
                title={`${c.label}: ${c.share_pct}%`}
                style={{ width: `${c.share_pct}%` }}
                className={["bg-sky-700", "bg-cyan-500", "bg-violet-500", "bg-indigo-300"][c.id]}
              />
            ))}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[10px] text-fg-subtle">
            {terrain.classes.map((c) => (
              <span key={c.id}>
                {c.label} {c.share_pct}%
              </span>
            ))}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Slope angle" htmlFor="av-slope" hint={`${form.slope}°`}>
          <input
            id="av-slope"
            type="range"
            min="0"
            max="70"
            value={form.slope}
            onChange={set("slope")}
            className="w-full accent-cyan-400"
          />
        </Field>
        <Field label="New snow (72 h)" htmlFor="av-snow" hint={`${form.snow} cm`}>
          <input
            id="av-snow"
            type="range"
            min="0"
            max="120"
            value={form.snow}
            onChange={set("snow")}
            className="w-full accent-cyan-400"
          />
        </Field>
        <Field label="Wind speed" htmlFor="av-wind" hint={`${form.wind} km/h`}>
          <input
            id="av-wind"
            type="range"
            min="0"
            max="100"
            value={form.wind}
            onChange={set("wind")}
            className="w-full accent-cyan-400"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slope faces" htmlFor="av-aspect">
            <select id="av-aspect" value={form.aspect} onChange={set("aspect")} className="field !py-2">
              {DIRS.map(([n, d]) => (
                <option key={n} value={d}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Wind from" htmlFor="av-windfrom">
            <select id="av-windfrom" value={form.windFrom} onChange={set("windFrom")} className="field !py-2">
              {DIRS.map(([n, d]) => (
                <option key={n} value={d}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-muted sm:col-span-2">
          <input type="checkbox" checked={form.warming} onChange={set("warming")} className="h-4 w-4 accent-cyan-400" />
          Rapid warming / above-freezing temperatures
        </label>
        <button type="submit" disabled={busy} className="btn-primary justify-center sm:col-span-2">
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Assess slope
        </button>
      </form>

      <ErrorNote error={error} />

      {result && (
        <div className="mt-5" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-xs tracking-wider uppercase ${LEVEL_STYLE[result.terrain_susceptibility]}`}
            >
              {result.terrain_susceptibility} susceptibility
            </span>
            <span className="text-sm text-fg-muted">{result.summary}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {result.factors.map((f) => (
              <li key={f.key} className="flex gap-2 text-sm">
                {f.present ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-violet-300" aria-label="Present" />
                ) : (
                  <Circle size={16} className="mt-0.5 shrink-0 text-fg-subtle" aria-label="Not present" />
                )}
                <span>
                  <span className="font-medium text-fg">{f.label}:</span>{" "}
                  <span className="text-fg-muted">{f.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-fg-subtle">{result.disclaimer}</p>
        </div>
      )}
    </DemoShell>
  );
}

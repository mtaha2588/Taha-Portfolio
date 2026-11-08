import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { exhibits, useExhibits } from "../../store/exhibits";
import { demoApi } from "../../lib/demoApi";
import { refreshPipeline } from "../../hooks/useExhibitData";
import { SAMPLE_INVENTORY } from "../../data/sampleInventory";
import DemoShell, { ErrorNote, Field } from "./DemoShell";

const STAGE_STYLE = {
  Hot: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-100",
  Warm: "border-cyan/40 bg-cyan/10 text-cyan-100",
  Nurture: "border-blue-400/40 bg-blue-400/10 text-blue-100",
};
const money = (n) => `$${Number(n).toLocaleString("en-US")}`;

function relative(iso) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 1) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}

export default function LeadSimulator() {
  const inventory = useExhibits((s) => s.inventory) ?? SAMPLE_INVENTORY;
  const selected = useExhibits((s) => s.selectedVehicle);
  const pipeline = useExhibits((s) => s.pipeline);
  const vehicle = inventory.vehicles.find((v) => v.id === selected) ?? inventory.vehicles[0];

  const [budget, setBudget] = useState(vehicle.price);
  const [timeframe, setTimeframe] = useState("1-3 months");
  const [financing, setFinancing] = useState("pre-approved");
  const [testDrive, setTestDrive] = useState(true);
  const [tradeIn, setTradeIn] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chooseVehicle = (id) => {
    exhibits.set({ selectedVehicle: id });
    const v = inventory.vehicles.find((x) => x.id === id);
    if (v) setBudget(v.price);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lead = await demoApi.createLead({
        vehicle_id: vehicle.id,
        budget: Number(budget),
        timeframe,
        financing,
        wants_test_drive: testDrive,
        has_trade_in: tradeIn,
      });
      setResult(lead);
      exhibits.set((s) => ({ lastLead: lead, leadPulse: s.leadPulse + 1 }));
      refreshPipeline();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DemoShell title="Live demo · Lead capture & scoring" endpoint="POST /api/demos/car-sales/leads · GET /pipeline">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle (sample inventory)" htmlFor="cs-vehicle">
          <select
            id="cs-vehicle"
            value={vehicle.id}
            onChange={(e) => chooseVehicle(e.target.value)}
            className="field !py-2"
          >
            {inventory.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {money(v.price)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget (USD)" htmlFor="cs-budget">
          <input
            id="cs-budget"
            type="number"
            min="1000"
            max="1000000"
            step="500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="field !py-2"
            required
          />
        </Field>
        <Field label="Buying timeframe" htmlFor="cs-time">
          <select id="cs-time" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="field !py-2">
            {["now", "1-3 months", "3-6 months", "researching"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Financing" htmlFor="cs-fin">
          <select id="cs-fin" value={financing} onChange={(e) => setFinancing(e.target.value)} className="field !py-2">
            {["cash", "pre-approved", "needs financing", "undecided"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted sm:col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={testDrive}
              onChange={(e) => setTestDrive(e.target.checked)}
              className="h-4 w-4 accent-teal-400"
            />
            Wants a test drive
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tradeIn}
              onChange={(e) => setTradeIn(e.target.checked)}
              className="h-4 w-4 accent-teal-400"
            />
            Has a trade-in
          </label>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center sm:col-span-2">
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Zap size={16} aria-hidden="true" />
          )}
          Create demo lead
        </button>
      </form>
      <p className="mt-2 text-xs text-fg-subtle">
        No personal details are collected. Only the fields above are stored as a demo lead.
      </p>
      <ErrorNote error={error} />

      {result && (
        <div className="mt-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-xs tracking-wider uppercase ${STAGE_STYLE[result.stage]}`}
            >
              {result.stage} lead
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-violet"
                style={{ width: `${result.score}%` }}
              />
            </div>
            <span className="font-mono text-sm text-fg">{result.score}/100</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-fg-muted">Score breakdown</p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {result.score_breakdown.map((s) => (
                  <li key={s.factor} className="flex justify-between gap-2">
                    <span className="text-fg-muted">{s.reason}</span>
                    <span className="font-mono text-fg">+{s.points}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-fg-muted">Automation (simulated)</p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {result.automation.map((a) => (
                  <li key={a.action} className="flex justify-between gap-2">
                    <span className="text-fg-muted">{a.action}</span>
                    <span className="shrink-0 font-mono text-teal-200">{relative(a.when)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {result.alternatives.length > 0 && (
            <p className="mt-3 text-xs text-fg-muted">
              Over budget, so suggested alternatives:{" "}
              {result.alternatives.map((a) => `${a.name} (${money(a.price)})`).join(", ")}
            </p>
          )}
        </div>
      )}

      {pipeline && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-medium text-fg-muted">Live pipeline ({pipeline.total_leads} demo leads)</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {["Hot", "Warm", "Nurture"].map((s) => (
              <div key={s} className={`rounded-lg border py-2 ${STAGE_STYLE[s]}`}>
                <p className="font-display text-xl font-semibold">{pipeline.by_stage[s] ?? 0}</p>
                <p className="font-mono text-[10px] tracking-wider uppercase">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DemoShell>
  );
}

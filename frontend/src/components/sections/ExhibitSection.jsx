import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Box,
  ChevronDown,
  ExternalLink,
  Link2,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { focusExhibit } from "../../lib/focus";
import { useUniverse } from "../../store/universe";
import { useProjects } from "../../hooks/useProjects";
import StatusBadge from "../ui/StatusBadge";
import Reveal from "../ui/Reveal";
import HoloGlassPanel from "../ui/HoloGlassPanel";
import ProjectVisual from "../projects/ProjectVisual";
import { GithubIcon } from "../ui/BrandIcons";

// Icons for capability cards in the holographic variant (matched by feature title).
const FEATURE_ICONS = [
  [/tool/i, Wrench],
  [/api|integration|connect/i, Link2],
  [/report|analytic|dashboard/i, BarChart3],
  [/log|review|audit|security/i, ShieldCheck],
];
const iconFor = (title) => FEATURE_ICONS.find(([re]) => re.test(title))?.[1] ?? Sparkles;

function PlainShell({ children }) {
  return (
    <article className="glass gradient-border rounded-2xl !bg-ink-950/70 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-7">
      {children}
    </article>
  );
}

function HoloShell({ children }) {
  return (
    <HoloGlassPanel>
      <article className="p-5 sm:p-8">{children}</article>
    </HoloGlassPanel>
  );
}

/**
 * One project exhibition. In 3D mode the camera flies to the matching
 * 3D exhibit while this panel scrolls past on the left (or below it on
 * phones). In 2D mode the panel shows the project illustration instead.
 * All project facts come from projects.json / the projects API.
 *
 * variant="holo" renders the panel as a floating holographic glass slab
 * with icon capability cards (used for the AI Business Automation Agent).
 */
export default function ExhibitSection({ ex, station, number, demo, variant = "glass" }) {
  const lite = useUniverse((s) => s.mode === "lite");
  const { projects } = useProjects();
  const project = projects.find((p) => p.slug === ex.slug);
  if (!project) return null;
  const titleId = `${ex.sectionId}-title`;
  const holo = variant === "holo";
  const Shell = holo ? HoloShell : PlainShell;

  const words = project.title.split(" ");
  const lastWord = words.pop();

  return (
    <section
      id={ex.sectionId}
      data-station={station}
      aria-labelledby={titleId}
      className={`pointer-events-none relative overflow-x-clip ${lite ? "py-16 sm:py-20" : "min-h-[180svh] pt-[56svh] pb-28 lg:min-h-[170svh] lg:pt-[16svh]"}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className={`pointer-events-auto w-full ${holo ? "max-w-[38rem] lg:pl-4" : "max-w-[36rem]"}`}>
          <Shell>
            {lite && (
              <div className="-mx-5 -mt-5 mb-6 aspect-[5/3] overflow-hidden rounded-t-2xl border-b border-line sm:-mx-7 sm:-mt-7">
                <ProjectVisual project={project} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[11px] tracking-[0.3em] text-fg-subtle uppercase">
                Exhibit <span className={holo ? "text-holo-cyan" : "text-cyan"}>{number}</span>
              </p>
              <StatusBadge status={project.status} />
            </div>
            <p
              className={`mt-5 font-mono text-[11px] tracking-[0.16em] uppercase ${holo ? "text-holo-cyan" : "text-cyan"}`}
            >
              {project.category}
            </p>
            <h2
              id={titleId}
              className={`mt-2 font-display font-semibold tracking-tight text-fg ${holo ? "text-3xl sm:text-[2.35rem] sm:leading-[1.1]" : "text-3xl sm:text-[2.1rem]"}`}
            >
              {holo ? (
                <>
                  {words.join(" ")} <span className="holo-gradient-text">{lastWord}</span>
                </>
              ) : (
                project.title
              )}
            </h2>
            <p className={`mt-2 ${holo ? "text-[15px] text-fg" : "text-fg-muted"}`}>{project.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">{project.summary}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              {!lite && (
                <button type="button" onClick={() => focusExhibit(ex.key)} className="btn-primary !px-4 !py-2 !text-sm">
                  <Box size={16} /> Inspect in 3D
                </button>
              )}
              <Link to={`/projects/${project.slug}`} className="btn-ghost !px-4 !py-2 !text-sm">
                Full case study <ArrowRight size={16} />
              </Link>
            </div>

            <h3
              className={`mt-7 text-xs font-semibold tracking-wider uppercase ${holo ? "font-mono tracking-[0.22em] text-holo-cyan" : "text-fg"}`}
            >
              Key capabilities
            </h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {project.features.map((f) => {
                if (!holo) {
                  return (
                    <li key={f.title} className="rounded-lg border border-line bg-white/[0.02] p-3">
                      <p className="text-sm font-medium text-fg">{f.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-fg-muted">{f.description}</p>
                    </li>
                  );
                }
                const Icon = iconFor(f.title);
                return (
                  <li key={f.title} className="holo-card">
                    <span className="holo-card-icon" aria-hidden="true">
                      <Icon size={19} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">{f.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{f.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
              {project.technologies.map((t) => (
                <li key={t} className={holo ? "chip !border-holo-blue/35 !bg-holo-blue/10 !text-fg" : "chip"}>
                  {t}
                </li>
              ))}
            </ul>

            <details
              className={`group mt-5 rounded-lg border p-3 ${holo ? "border-holo-cyan/20 bg-holo-blue/[0.06]" : "border-line bg-white/[0.02]"}`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <span
                    className={`text-[10px] transition-transform group-open:rotate-90 ${holo ? "text-holo-cyan" : "text-cyan"}`}
                  >
                    ▶
                  </span>
                  Architecture
                </span>
                <ChevronDown
                  size={16}
                  className="text-fg-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">{project.architecture.overview}</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {project.architecture.layers.map((layer, i) => (
                  <li key={layer.name} className="rounded-md border border-line p-2.5">
                    <p
                      className={`font-mono text-[10px] tracking-wider uppercase ${holo ? "text-holo-cyan" : "text-cyan"}`}
                    >
                      {String(i + 1).padStart(2, "0")} · {layer.name}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-fg-muted">
                      {layer.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </details>

            {demo}

            {(project.links?.demo || project.links?.github) && (
              <div className="mt-5 flex flex-wrap gap-3">
                {project.links.demo && (
                  <a
                    href={project.links.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !px-3 !py-2 !text-sm"
                  >
                    <ExternalLink size={14} /> Live project
                  </a>
                )}
                {project.links.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !px-3 !py-2 !text-sm"
                  >
                    <GithubIcon size={14} /> Source code
                  </a>
                )}
              </div>
            )}
          </Shell>
        </Reveal>
      </div>

      {holo && !lite && (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute top-[calc(100svh-4.5rem)] right-8 hidden font-mono text-[12px] tracking-[0.35em] text-holo-purple uppercase lg:block"
        >
          Build <span className="text-fg-subtle">·</span> <span className="text-holo-cyan">Automate</span>{" "}
          <span className="text-fg-subtle">·</span> <span className="text-signal">Innovate</span>
        </p>
      )}
    </section>
  );
}

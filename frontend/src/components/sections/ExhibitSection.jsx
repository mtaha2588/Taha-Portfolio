import { Link } from "react-router-dom";
import { ArrowRight, Box, ExternalLink } from "lucide-react";
import { focusExhibit } from "../../lib/focus";
import { useUniverse } from "../../store/universe";
import { useProjects } from "../../hooks/useProjects";
import StatusBadge from "../ui/StatusBadge";
import Reveal from "../ui/Reveal";
import ProjectVisual from "../projects/ProjectVisual";
import { GithubIcon } from "../ui/BrandIcons";

/**
 * One project exhibition. In 3D mode the camera flies to the matching
 * 3D exhibit while this panel scrolls past on the left (or below it on
 * phones). In 2D mode the panel shows the project illustration instead.
 * All project facts come from projects.json / the projects API.
 */
export default function ExhibitSection({ ex, station, number, demo }) {
  const lite = useUniverse((s) => s.mode === "lite");
  const { projects } = useProjects();
  const project = projects.find((p) => p.slug === ex.slug);
  if (!project) return null;
  const titleId = `${ex.sectionId}-title`;

  return (
    <section
      id={ex.sectionId}
      data-station={station}
      aria-labelledby={titleId}
      className={`pointer-events-none relative ${lite ? "py-16 sm:py-20" : "min-h-[180svh] pt-[56svh] pb-28 lg:min-h-[170svh] lg:pt-[16svh]"}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="pointer-events-auto w-full max-w-[36rem]">
          <article className="glass gradient-border rounded-2xl !bg-ink-950/70 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-7">
            {lite && (
              <div className="-mx-5 -mt-5 mb-6 aspect-[5/3] overflow-hidden rounded-t-2xl border-b border-line sm:-mx-7 sm:-mt-7">
                <ProjectVisual project={project} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[11px] tracking-[0.3em] text-fg-subtle uppercase">
                Exhibit <span className="text-cyan">{number}</span>
              </p>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-5 font-mono text-[11px] tracking-[0.16em] text-cyan uppercase">{project.category}</p>
            <h2
              id={titleId}
              className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-[2.1rem]"
            >
              {project.title}
            </h2>
            <p className="mt-2 text-fg-muted">{project.tagline}</p>
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

            <h3 className="mt-6 text-xs font-semibold tracking-wider text-fg uppercase">Key capabilities</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {project.features.map((f) => (
                <li key={f.title} className="rounded-lg border border-line bg-white/[0.02] p-3">
                  <p className="text-sm font-medium text-fg">{f.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">{f.description}</p>
                </li>
              ))}
            </ul>

            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
              {project.technologies.map((t) => (
                <li key={t} className="chip">
                  {t}
                </li>
              ))}
            </ul>

            <details className="group mt-5 rounded-lg border border-line bg-white/[0.02] p-3">
              <summary className="cursor-pointer text-sm font-medium text-fg marker:text-cyan">Architecture</summary>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">{project.architecture.overview}</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {project.architecture.layers.map((layer, i) => (
                  <li key={layer.name} className="rounded-md border border-line p-2.5">
                    <p className="font-mono text-[10px] tracking-wider text-cyan uppercase">
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
          </article>
        </Reveal>
      </div>
    </section>
  );
}

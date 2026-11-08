import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Box, ExternalLink, ImageOff } from "lucide-react";
import { useProject } from "../hooks/useProjects";
import { usePageTitle } from "../hooks/usePageTitle";
import { useUniverse } from "../store/universe";
import { EXHIBIT_LIST } from "../three/exhibits/layout";
import BackgroundCanvas from "../components/layout/BackgroundCanvas";
import Footer from "../components/layout/Footer";
import ProjectVisual from "../components/projects/ProjectVisual";
import StatusBadge from "../components/ui/StatusBadge";
import Reveal from "../components/ui/Reveal";
import { GithubIcon } from "../components/ui/BrandIcons";
import NotFoundPage from "./NotFoundPage";

function Block({ eyebrow, title, children }) {
  return (
    <Reveal as="section" className="border-t border-line py-12 sm:py-14">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-fg sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </Reveal>
  );
}

/** Full case study for one project. Every fact comes from projects.json / the projects API. */
export default function ProjectPage() {
  const { slug } = useParams();
  const { project, previous, next } = useProject(slug);
  const webgl = useUniverse((s) => s.webgl);
  usePageTitle(project?.title);
  if (!project) return <NotFoundPage />;
  const exhibit = EXHIBIT_LIST.find((e) => e.slug === project.slug);

  return (
    <>
      <BackgroundCanvas />
      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <Link
          to={{ pathname: "/", hash: "#projects" }}
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft size={16} /> Back to the universe
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            <span className="font-mono text-[11px] tracking-[0.16em] text-cyan uppercase">{project.category}</span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-fg-muted">{project.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {exhibit && webgl && (
              <Link to={`/?focus=${exhibit.key}`} className="btn-primary">
                <Box size={18} /> Explore in 3D
              </Link>
            )}
            {project.links?.demo && (
              <a href={project.links.demo} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <ExternalLink size={18} /> Live project
              </a>
            )}
            {project.links?.github && (
              <a href={project.links.github} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <GithubIcon size={18} /> Source code
              </a>
            )}
          </div>
        </header>

        <div className="glass gradient-border mt-10 aspect-[5/3] overflow-hidden rounded-2xl">
          <ProjectVisual project={project} />
        </div>
        <p className="mt-3 text-xs text-fg-subtle">
          This is an active portfolio project. Descriptions reflect its design and current development scope, not
          production metrics.
        </p>

        <Block eyebrow="01 · Problem" title="The problem">
          <p className="max-w-3xl leading-relaxed text-fg-muted">{project.problem}</p>
        </Block>

        <Block eyebrow="02 · Solution" title="Proposed solution">
          <p className="max-w-3xl leading-relaxed text-fg-muted">{project.solution}</p>
        </Block>

        <Block eyebrow="03 · Architecture" title="How it's built">
          <p className="max-w-3xl leading-relaxed text-fg-muted">{project.architecture.overview}</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {project.architecture.layers.map((layer, i) => (
              <li key={layer.name} className="glass relative rounded-xl p-4">
                <p className="font-mono text-[11px] tracking-wider text-cyan uppercase">
                  {String(i + 1).padStart(2, "0")} · {layer.name}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
                  {layer.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                {i < project.architecture.layers.length - 1 && (
                  <ArrowRight
                    size={16}
                    className="absolute top-1/2 -right-3.5 hidden -translate-y-1/2 text-cyan/60 lg:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
        </Block>

        <Block eyebrow="04 · Technologies" title="Technologies used">
          <ul className="flex flex-wrap gap-2">
            {project.technologies.map((t) => (
              <li key={t} className="chip !px-3 !py-1.5 !text-sm">
                {t}
              </li>
            ))}
          </ul>
        </Block>

        <Block eyebrow="05 · Features" title="Key features">
          <ul className="grid gap-4 sm:grid-cols-2">
            {project.features.map((f) => (
              <li key={f.title} className="glass rounded-xl p-5">
                <p className="font-medium text-fg">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.description}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block eyebrow="06 · Screenshots" title="Screenshots">
          {project.screenshots?.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {project.screenshots.map((s) => (
                <li key={s.src}>
                  <figure className="glass overflow-hidden rounded-xl">
                    <img src={s.src} alt={s.caption || project.title} loading="lazy" className="w-full" />
                    {s.caption && <figcaption className="p-3 text-sm text-fg-muted">{s.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          ) : (
            <div className="glass flex items-center gap-4 rounded-xl p-6 text-fg-muted">
              <ImageOff size={22} className="shrink-0 text-fg-subtle" aria-hidden="true" />
              <p className="text-sm">Screenshots will be published here as development progresses.</p>
            </div>
          )}
        </Block>

        <Block eyebrow="07 · Challenges" title="Challenges & learning">
          <div className="grid gap-4 sm:grid-cols-3">
            {project.challenges.map((c) => (
              <div key={c.title} className="glass rounded-xl p-5">
                <p className="font-medium text-fg">{c.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{c.description}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-8 text-sm font-semibold tracking-wider text-fg uppercase">Focus areas</h3>
          <ul className="mt-3 space-y-2 text-fg-muted">
            {project.learnings.map((l) => (
              <li key={l} className="flex gap-3">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" aria-hidden="true" />
                {l}
              </li>
            ))}
          </ul>
        </Block>

        <nav className="mt-8 grid gap-4 border-t border-line pt-10 sm:grid-cols-2" aria-label="More projects">
          {previous ? (
            <Link to={`/projects/${previous.slug}`} className="glass group rounded-xl p-5">
              <span className="flex items-center gap-2 text-xs text-fg-subtle">
                <ArrowLeft size={14} /> Previous project
              </span>
              <span className="mt-2 block font-display text-lg text-fg">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/projects/${next.slug}`} className="glass group rounded-xl p-5 text-right">
              <span className="flex items-center justify-end gap-2 text-xs text-fg-subtle">
                Next project <ArrowRight size={14} />
              </span>
              <span className="mt-2 block font-display text-lg text-fg">{next.title}</span>
            </Link>
          )}
        </nav>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </>
  );
}

import { useUniverse } from "../../store/universe";
import Reveal from "../ui/Reveal";

/**
 * Layout shared by the Stage 4 environments: a glass panel on the left
 * (below the 3D object on phones) while the camera holds on the
 * environment. In 2D mode it becomes a normal section.
 */
export default function EnvSection({ id, station, eyebrow, title, intro, wide = false, children }) {
  const lite = useUniverse((s) => s.mode === "lite");
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      data-station={station}
      aria-labelledby={titleId}
      className={`pointer-events-none relative ${lite ? "py-16 sm:py-20" : "min-h-[170svh] pt-[54svh] pb-28 lg:min-h-[160svh] lg:pt-[16svh]"}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className={`pointer-events-auto w-full ${wide ? "max-w-[40rem]" : "max-w-[36rem]"}`}>
          <div className="glass gradient-border rounded-2xl !bg-ink-950/70 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-7">
            <p className="eyebrow">{eyebrow}</p>
            <h2
              id={titleId}
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-[2.1rem]"
            >
              {title}
            </h2>
            {intro && <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{intro}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

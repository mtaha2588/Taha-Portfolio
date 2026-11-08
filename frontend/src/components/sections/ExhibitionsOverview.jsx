import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeading from "../ui/SectionHeading";
import StatusBadge from "../ui/StatusBadge";
import { useProjects } from "../../hooks/useProjects";
import { scrollToSection } from "../../hooks/useScrollStations";
import { EXHIBIT_LIST } from "../../three/exhibits/layout";
import { exhibits, useExhibits } from "../../store/exhibits";

/**
 * Station 1: the high establishing shot of all three exhibitions.
 * A compact index lets visitors jump to any of them; hovering an entry
 * lights up the matching pedestal in 3D.
 */
export default function ExhibitionsOverview() {
  const { projects } = useProjects();
  const hovered = useExhibits((s) => s.hovered);

  return (
    <section
      id="projects"
      data-station="1"
      className="pointer-events-none relative flex min-h-[110svh] flex-col justify-end pt-28 pb-24"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto">
          <SectionHeading
            eyebrow="Project Exhibitions"
            title="Three projects. Three live systems."
            description="Each exhibition is a 3D representation of the project, connected to a working demo API. Scroll to visit them in turn, or jump straight to one."
          />
        </div>
        <ol className="pointer-events-auto grid gap-3 md:grid-cols-3">
          {EXHIBIT_LIST.map((ex, i) => {
            const project = projects.find((p) => p.slug === ex.slug);
            const active = hovered === ex.key;
            return (
              <motion.li
                key={ex.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <button
                  type="button"
                  onClick={() => scrollToSection(ex.sectionId)}
                  onPointerEnter={() => exhibits.set({ hovered: ex.key })}
                  onPointerLeave={() => exhibits.set({ hovered: null })}
                  onFocus={() => exhibits.set({ hovered: ex.key })}
                  onBlur={() => exhibits.set({ hovered: null })}
                  className={`glass group flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all ${active ? "border-cyan/50 bg-cyan/[0.06]" : ""}`}
                >
                  <span className="font-mono text-2xl font-medium text-cyan/80">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold text-fg">
                      {project?.title ?? ex.label}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      {project && <StatusBadge status={project.status} />}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-fg-muted transition-transform group-hover:translate-x-1 group-hover:text-fg"
                  />
                </button>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

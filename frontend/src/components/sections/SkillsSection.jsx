import { Link } from "react-router-dom";
import { SKILL_AREAS, projectsUsing } from "../../data/skills";
import { exhibits, useExhibits } from "../../store/exhibits";
import { useProjects } from "../../hooks/useProjects";
import EnvSection from "./EnvSection";

export default function SkillsSection() {
  const selected = useExhibits((s) => s.skillArea);
  const { projects } = useProjects();
  const area = SKILL_AREAS.find((a) => a.id === selected);

  return (
    <EnvSection
      id="skills"
      station={6}
      eyebrow="Technical Skills"
      title="A connected skill constellation"
      intro="Eight areas, linked wherever they share a skill. Select an area to see its skills and the projects that use them. Evidence is shown through projects rather than self-rated levels."
      wide
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SKILL_AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => exhibits.set({ skillArea: a.id === selected ? null : a.id })}
            aria-pressed={a.id === selected}
            className={`rounded-lg border p-2.5 text-left transition-colors ${a.id === selected ? "bg-white/[0.06]" : "border-line hover:bg-white/[0.03]"}`}
            style={a.id === selected ? { borderColor: a.color } : undefined}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: a.color, boxShadow: `0 0 10px ${a.color}` }}
            />
            <span className="mt-2 block text-xs leading-tight font-medium text-fg">{a.title}</span>
            <span className="mt-0.5 block font-mono text-[10px] text-fg-subtle">{a.skills.length} skills</span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-line bg-white/[0.02] p-4" aria-live="polite">
        {area ? (
          <>
            <h3 className="font-display text-lg font-semibold" style={{ color: area.color }}>
              {area.title}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {area.skills.map((skill) => {
                const used = projectsUsing(skill, projects);
                return (
                  <li
                    key={skill}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-fg">{skill}</span>
                    <span className="text-xs text-fg-subtle">
                      {used.length ? (
                        used.map((p, i) => (
                          <span key={p.slug}>
                            {i > 0 && " · "}
                            <Link to={`/projects/${p.slug}`} className="text-cyan-200 hover:underline">
                              {p.title}
                            </Link>
                          </span>
                        ))
                      ) : (
                        <span>Used in this portfolio site</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="All skills">
            {[...new Set(SKILL_AREAS.flatMap((a) => a.skills))].map((s) => (
              <li key={s} className="chip">
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </EnvSection>
  );
}

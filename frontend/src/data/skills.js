/**
 * Technical skills, grouped into the eight areas of the skills
 * constellation. A skill may appear in several areas: shared skills
 * become the lines connecting areas in 3D.
 *
 * Proficiency levels are deliberately NOT shown. If you want to add one,
 * also add evidence (a link to a repo, certificate or project), e.g.
 *   { name: "Python", level: "Advanced", evidence: "https://github.com/you/repo" }
 * "Used in" projects are derived automatically from projects.json.
 */
export const SKILL_AREAS = [
  { id: "ai", title: "Artificial Intelligence", color: "#a78bfa", skills: ["LLMs", "OpenAI API", "Claude API"] },
  { id: "ml", title: "Machine Learning", color: "#818cf8", skills: ["Scikit-learn", "Random Forest", "SVM"] },
  { id: "agents", title: "AI Agents", color: "#c084fc", skills: ["AI agents", "LLMs", "Workflow automation"] },
  { id: "python", title: "Python Development", color: "#22d3ee", skills: ["Python", "FastAPI", "Flask"] },
  {
    id: "fullstack",
    title: "Full-Stack Development",
    color: "#38bdf8",
    skills: ["JavaScript", "React", "Tailwind CSS", "HTML", "CSS", "SQL"],
  },
  { id: "api", title: "API Integrations", color: "#67e8f9", skills: ["REST APIs", "API integration", "FastAPI"] },
  {
    id: "automation",
    title: "Automation Engineering",
    color: "#5eead4",
    skills: ["Workflow automation", "API integration", "Python", "Git", "GitHub"],
  },
  {
    id: "geo",
    title: "Geospatial Intelligence",
    color: "#4f8cff",
    skills: ["Geospatial data processing", "DEM", "Satellite data"],
  },
];

/** Projects whose technology list includes this skill (case-insensitive). */
export function projectsUsing(skill, projects) {
  const s = skill.toLowerCase();
  return projects.filter((p) => p.technologies.some((t) => t.toLowerCase() === s));
}

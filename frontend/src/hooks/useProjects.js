import { useEffect, useState } from "react";
import bundledProjects from "../data/projects.json";
import { apiRequest, isApiConfigured } from "../lib/api";

/**
 * Returns the list of projects.
 *
 * The page renders immediately with the project data bundled into
 * the site, then refreshes it from the backend's /api/projects
 * endpoint. That way the backend can update status labels and links
 * without a frontend redeploy, and the site still works if the
 * backend is asleep or unreachable (common on free hosting tiers).
 */
let cache = null;

export function useProjects() {
  const [projects, setProjects] = useState(cache || bundledProjects);
  const [source, setSource] = useState(cache ? "api" : "bundled");

  useEffect(() => {
    if (cache || !isApiConfigured) return;
    const controller = new AbortController();

    apiRequest("/api/projects", { signal: controller.signal, timeoutMs: 8000 })
      .then((data) => {
        if (Array.isArray(data?.projects) && data.projects.length) {
          cache = data.projects;
          setProjects(data.projects);
          setSource("api");
        }
      })
      .catch(() => {
        // Keep the bundled data; nothing for the visitor to see.
      });

    return () => controller.abort();
  }, []);

  return { projects, source };
}

export function useProject(slug) {
  const { projects, source } = useProjects();
  const index = projects.findIndex((p) => p.slug === slug);
  return {
    project: index >= 0 ? projects[index] : null,
    previous: index > 0 ? projects[index - 1] : null,
    next: index >= 0 && index < projects.length - 1 ? projects[index + 1] : null,
    projects,
    source,
  };
}

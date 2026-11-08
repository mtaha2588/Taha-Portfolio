import { apiRequest } from "./api";

/** Typed helpers for the per-project demo endpoints in the FastAPI backend. */
const AV = "/api/demos/avalanche";
const AG = "/api/demos/automation-agent";
const CS = "/api/demos/car-sales";

export const demoApi = {
  terrain: (size = 64, seed = 7) => apiRequest(`${AV}/terrain/sample?size=${size}&seed=${seed}`, { timeoutMs: 9000 }),
  assess: (body) => apiRequest(`${AV}/assess`, { method: "POST", body }),

  agentSamples: () => apiRequest(`${AG}/samples`),
  runAgent: (body) => apiRequest(`${AG}/run`, { method: "POST", body }),

  inventory: () => apiRequest(`${CS}/inventory`),
  createLead: (body) => apiRequest(`${CS}/leads`, { method: "POST", body }),
  pipeline: () => apiRequest(`${CS}/pipeline`),
};

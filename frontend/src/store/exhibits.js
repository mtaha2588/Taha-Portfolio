import { createStore } from "./createStore";

/**
 * Shared state between the exhibition panels (HTML) and the 3D
 * exhibitions. Example: running a workflow in the agent panel sets
 * `agentStep`, and the neural core lights up the matching stage.
 */
export const [exhibits, useExhibits] = createStore({
  apiOnline: null, // null = unknown yet, true/false after the first request

  // Avalanche
  terrain: null, // { size, elevation_m[], slope_deg[], slope_class[], classes[], source: "api" | "local" }
  showRisk: true, // highlight 30–45° start-zone slopes on the 3D terrain
  assessment: null,

  // Automation agent
  agentRun: null, // last WorkflowRun response
  agentStep: -1, // index of the step currently being "replayed" in 3D (-1 = idle)

  // Car sales
  inventory: null, // { sample_data, vehicles[] }
  selectedVehicle: "v-103",
  pipeline: null,
  lastLead: null,
  leadPulse: 0, // increments on every new lead: triggers the 3D lead animation

  // Which exhibition the pointer is over in 3D
  hovered: null,
  // Exhibition currently in focus (inspect) mode, or null
  focused: null,

  // Stage 4 environments
  labStage: "collect", // selected Workflow Lab stage
  labRun: 0, // increments when "Run pipeline" is pressed: a packet travels through every stage
  skillArea: null, // selected skills-constellation area id
  contactPulse: 0, // increments after a successful contact submission (beacon burst)
});

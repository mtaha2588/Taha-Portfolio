import { useEffect } from "react";
import { exhibits } from "../store/exhibits";
import { demoApi } from "../lib/demoApi";
import { isApiConfigured } from "../lib/api";
import { localTerrain } from "../lib/terrainLocal";
import { SAMPLE_INVENTORY } from "../data/sampleInventory";

/**
 * Loads the live data the exhibitions are built from: terrain
 * (avalanche), sample inventory and lead pipeline (car sales).
 *
 * If the backend is unreachable (not running locally, or a free-tier
 * server still waking up), the terrain is generated in the browser and
 * the bundled sample inventory is used, so every exhibition still
 * renders. Panels state which source is being shown.
 */
export async function loadExhibitData() {
  if (!isApiConfigured) {
    exhibits.set({ apiOnline: false, terrain: { ...localTerrain(), source: "local" }, inventory: SAMPLE_INVENTORY });
    return;
  }
  const [terrain, inventory, pipeline] = await Promise.allSettled([
    demoApi.terrain(64, 7),
    demoApi.inventory(),
    demoApi.pipeline(),
  ]);
  const online = terrain.status === "fulfilled";
  exhibits.set({
    apiOnline: online,
    terrain: online
      ? { ...terrain.value, source: "api" }
      : (exhibits.get().terrain ?? { ...localTerrain(), source: "local" }),
    inventory: inventory.status === "fulfilled" ? inventory.value : SAMPLE_INVENTORY,
    pipeline: pipeline.status === "fulfilled" ? pipeline.value : null,
  });
}

export function useExhibitData() {
  useEffect(() => {
    loadExhibitData();
  }, []);
}

/** Re-fetches the lead pipeline (after a new demo lead is created). */
export function refreshPipeline() {
  return demoApi
    .pipeline()
    .then((pipeline) => exhibits.set({ pipeline }))
    .catch(() => {});
}

import { useEffect, useState } from "react";
import { PLANNING_AREA_GEOJSON } from "../constants";
import type { GeoFeatureCollection } from "../utils/map";

export function usePlanningAreaMap() {
  const [map, setMap] = useState<GeoFeatureCollection | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(PLANNING_AREA_GEOJSON, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: GeoFeatureCollection | null) => {
        if (!controller.signal.aborted && data) {
          setMap(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMap(null);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return map;
}

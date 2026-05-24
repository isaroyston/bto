import { useMemo, useRef, useState } from "react";
import { TOWN_COORDS } from "../data/townCoords";
import type { BtoProject } from "../policies/policyConfig";
import type { HeatmapItem } from "../utils/bto";
import type { AreaPath } from "../utils/map";
import { getBlueRampColor, resolveAreaKey } from "../utils/map";
import { clampNumber, currency } from "../utils/format";

type PriceMapProps = {
  btoProjects: BtoProject[];
  heatmapItems: HeatmapItem[];
  heatmapMin: number;
  heatmapMax: number;
  planningAreaPaths: AreaPath[];
};

type HoveredArea = {
  key: string;
  label: string;
  tooltip: string;
  x: number;
  y: number;
};

export function PriceMap({
  btoProjects,
  heatmapItems,
  heatmapMin,
  heatmapMax,
  planningAreaPaths,
}: PriceMapProps) {
  const [hoveredArea, setHoveredArea] = useState<HoveredArea | null>(null);
  const mapRef = useRef<SVGSVGElement | null>(null);
  const hasPlanningAreas = planningAreaPaths.length > 0;
  const heatmapRange = Math.max(heatmapMax - heatmapMin, 1);

  const areaPriceMap = useMemo(() => {
    const map = new Map<string, HeatmapItem>();

    heatmapItems.forEach((item) => {
      const key = resolveAreaKey(item.area, planningAreaPaths);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, { ...item, area: key });
        return;
      }

      const totalCount = existing.count + item.count;
      const average = totalCount
        ? (existing.average * existing.count + item.average * item.count) /
          totalCount
        : item.average;
      const sources = new Set([...existing.sources, ...item.sources]);

      map.set(key, {
        area: existing.area,
        average,
        count: totalCount,
        sources: Array.from(sources),
      });
    });

    return map;
  }, [heatmapItems, planningAreaPaths]);

  const handleAreaHover = (
    area: AreaPath,
    tooltip: string,
    event: { clientX: number; clientY: number }
  ) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clampNumber(event.clientX - rect.left, 16, rect.width - 16);
    const y = clampNumber(event.clientY - rect.top, 16, rect.height - 16);
    setHoveredArea({ key: area.key, label: area.label, tooltip, x, y });
  };

  const mapEmptyMessage =
    btoProjects.length === 0
      ? "Load BTO data to view pricing intensity."
      : "No pricing data available yet.";

  return (
    <div className="glass-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-heritage-navy">
          Singapore BTO price map
        </h3>
        <span className="text-xs text-warm-stone">
          {hasPlanningAreas
            ? "Historical planning area price ranges"
            : "Historical town price ranges"}
        </span>
      </div>
      {heatmapItems.length === 0 ? (
        <p className="text-sm text-warm-stone">{mapEmptyMessage}</p>
      ) : (
        <div className="space-y-3">
          <div
            className="h-2 rounded-hdb"
            style={{
              background:
                "linear-gradient(90deg, #d6ebff 0%, #6bb4ff 48%, #0b3c8a 100%)",
            }}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-warm-stone">
            <span>{currency(heatmapMin)}</span>
            <span>Average base price intensity</span>
            <span>{currency(heatmapMax)}</span>
          </div>
          <div className="relative overflow-hidden rounded-hdb border border-heritage-navy/10 bg-white">
            <svg
              ref={mapRef}
              viewBox="0 0 100 70"
              className="h-[320px] w-full md:h-[380px]"
              onMouseLeave={() => setHoveredArea(null)}
              role="img"
              aria-label="Singapore BTO price intensity map"
            >
              <defs>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="1.5"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="100" height="70" fill="white" />
              {hasPlanningAreas ? (
                <g fillRule="evenodd">
                  {planningAreaPaths.map((area) => {
                    const entry = areaPriceMap.get(area.key);
                    const ratio = entry
                      ? (entry.average - heatmapMin) / heatmapRange
                      : 0;
                    const fill = entry
                      ? getBlueRampColor(ratio)
                      : "rgb(235, 244, 255)";
                    const stroke = entry
                      ? "rgba(6, 35, 84, 0.65)"
                      : "rgba(6, 35, 84, 0.2)";
                    const tooltip = entry
                      ? `Avg base price ${currency(entry.average)} from ${
                          entry.count
                        } flat types. Sources: ${entry.sources.join(", ")}`
                      : "No price data for this planning area";
                    const isHovered = hoveredArea?.key === area.key;

                    return (
                      <path
                        key={area.key}
                        d={area.path}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="0.35"
                        fillOpacity={entry ? 0.95 : 0.3}
                        className="cursor-pointer"
                        style={{
                          transformBox: "fill-box",
                          transformOrigin: "center",
                          transform: isHovered ? "scale(1.05)" : "scale(1)",
                          transition:
                            "transform 160ms ease, filter 160ms ease",
                          filter: isHovered
                            ? "drop-shadow(0 4px 8px rgba(13, 36, 63, 0.18))"
                            : "none",
                        }}
                        onMouseEnter={(event) =>
                          handleAreaHover(area, tooltip, event)
                        }
                        onMouseMove={(event) =>
                          handleAreaHover(area, tooltip, event)
                        }
                        onMouseLeave={() => setHoveredArea(null)}
                      >
                        <title>{`${area.label}: ${tooltip}`}</title>
                      </path>
                    );
                  })}
                </g>
              ) : (
                <>
                  <path
                    d="M6 22C8 12 20 8 32 10C40 5 52 5 62 10C70 8 82 12 90 20C96 28 96 38 90 46C82 56 68 60 56 58C46 64 30 62 20 56C10 48 6 36 6 22Z"
                    fill="rgba(13, 36, 63, 0.08)"
                    stroke="rgba(13, 36, 63, 0.2)"
                    strokeWidth="0.6"
                  />
                  {heatmapItems.map((item) => {
                    const coords = TOWN_COORDS[item.area];
                    if (!coords) return null;

                    const ratio = (item.average - heatmapMin) / heatmapRange;
                    const radius = 2.8 + ratio * 5.5;
                    const fill = getBlueRampColor(ratio);
                    const tooltip = `Avg base price ${currency(
                      item.average
                    )} from ${item.count} flat types. Sources: ${item.sources.join(
                      ", "
                    )}`;

                    return (
                      <g key={item.area} filter="url(#softGlow)">
                        <circle
                          cx={coords.x}
                          cy={coords.y}
                          r={radius}
                          fill={fill}
                          fillOpacity={0.3 + ratio * 0.6}
                          stroke="rgba(13, 36, 63, 0.25)"
                          strokeWidth="0.4"
                        >
                          <title>{`${item.area}: ${tooltip}`}</title>
                        </circle>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
            {hasPlanningAreas && hoveredArea && (
              <div
                className="pointer-events-none absolute z-10 max-w-64 rounded-hdb border border-heritage-navy/10 bg-white/95 px-3 py-2 shadow-fintech"
                style={{
                  left: `${hoveredArea.x}px`,
                  top: `${hoveredArea.y}px`,
                  transform: "translate(-50%, -120%)",
                }}
              >
                <div className="text-xs uppercase text-warm-stone">
                  Planning area
                </div>
                <div className="text-sm font-semibold text-heritage-navy">
                  {hoveredArea.label}
                </div>
                <div className="mt-1 text-xs text-warm-stone">
                  {hoveredArea.tooltip}
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 rounded-hdb border border-heritage-navy/10 bg-white/85 px-3 py-2 text-xs text-warm-stone backdrop-blur-sm">
              {hasPlanningAreas
                ? "Planning areas shaded by price intensity."
                : "Marker size reflects average price intensity."}
            </div>
          </div>
        </div>
      )}
      <div className="text-xs text-warm-stone">
        Price sources: local CSV first, then fallback sample data if the file is
        unavailable.
      </div>
      {!hasPlanningAreas && (
        <div className="text-xs text-warm-stone">
          Map coordinates are approximate town centroids for visualization.
        </div>
      )}
    </div>
  );
}

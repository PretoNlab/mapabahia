"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface MapFeature {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    ibgeCode: string | null;
    value: number | null;
    eligibleVoters: number | null;
    turnoutPercentage: number | null;
    abstentionPercentage: number | null;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface GeoData {
  type: "FeatureCollection";
  features: MapFeature[];
}

type Indicator =
  | "eligibleVoters"
  | "turnoutPercentage"
  | "abstentionPercentage";

const INDICATOR_LABELS: Record<Indicator, string> = {
  eligibleVoters: "Eleitorado Apto",
  turnoutPercentage: "Comparecimento (%)",
  abstentionPercentage: "Abstencao (%)",
};

function getColor(value: number | null, indicator: Indicator): string {
  if (value === null) return "#e4e4e7";

  if (indicator === "eligibleVoters") {
    if (value > 500000) return "#1e3a5f";
    if (value > 100000) return "#2563eb";
    if (value > 50000) return "#3b82f6";
    if (value > 20000) return "#60a5fa";
    if (value > 10000) return "#93c5fd";
    return "#dbeafe";
  }

  if (indicator === "turnoutPercentage") {
    if (value > 90) return "#065f46";
    if (value > 85) return "#059669";
    if (value > 80) return "#10b981";
    if (value > 75) return "#6ee7b7";
    if (value > 70) return "#a7f3d0";
    return "#d1fae5";
  }

  // abstention - higher is worse (red)
  if (value > 30) return "#991b1b";
  if (value > 25) return "#dc2626";
  if (value > 20) return "#f87171";
  if (value > 15) return "#fca5a5";
  if (value > 10) return "#fecaca";
  return "#fee2e2";
}

export function BahiaMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [indicator, setIndicator] = useState<Indicator>("turnoutPercentage");
  const [hoveredFeature, setHoveredFeature] = useState<MapFeature | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const featuresRef = useRef<
    Array<{ feature: MapFeature; path: Path2D }>
  >([]);

  useEffect(() => {
    fetch(`/api/geo?indicator=${indicator}`)
      .then((r) => r.json())
      .then(setGeoData);
  }, [indicator]);

  const projectPoint = useCallback(
    (
      lng: number,
      lat: number,
      bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number },
      width: number,
      height: number,
      padding: number
    ): [number, number] => {
      const x =
        padding +
        ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) *
          (width - padding * 2);
      const y =
        padding +
        ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) *
          (height - padding * 2);
      return [x, y];
    },
    []
  );

  useEffect(() => {
    if (!geoData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 20;

    // Calculate bounds
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    for (const feature of geoData.features) {
      const coords = feature.geometry.coordinates[0];
      for (const [lng, lat] of coords) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }

    const bounds = { minLng, maxLng, minLat, maxLat };

    ctx.clearRect(0, 0, width, height);
    featuresRef.current = [];

    for (const feature of geoData.features) {
      const coords = feature.geometry.coordinates[0];
      const path = new Path2D();

      const [startX, startY] = projectPoint(
        coords[0][0],
        coords[0][1],
        bounds,
        width,
        height,
        padding
      );
      path.moveTo(startX, startY);

      for (let i = 1; i < coords.length; i++) {
        const [x, y] = projectPoint(
          coords[i][0],
          coords[i][1],
          bounds,
          width,
          height,
          padding
        );
        path.lineTo(x, y);
      }
      path.closePath();

      featuresRef.current.push({ feature, path });

      const value = feature.properties.value as number | null;
      ctx.fillStyle = getColor(value, indicator);
      ctx.fill(path);

      const isHovered = hoveredFeature?.properties.id === feature.properties.id;
      ctx.strokeStyle = isHovered ? "#1d4ed8" : "#ffffff";
      ctx.lineWidth = isHovered ? 2 : 0.5;
      ctx.stroke(path);
    }
  }, [geoData, indicator, hoveredFeature, projectPoint]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setMousePos({ x: e.clientX, y: e.clientY });

    const dpr = window.devicePixelRatio || 1;
    let found: MapFeature | null = null;

    for (const { feature, path } of featuresRef.current) {
      if (ctx.isPointInPath(path, x * dpr, y * dpr)) {
        found = feature;
        break;
      }
    }

    setHoveredFeature(found);
    canvas.style.cursor = found ? "pointer" : "default";
  }

  function handleClick() {
    if (hoveredFeature) {
      router.push(`/municipio/${hoveredFeature.properties.id}`);
    }
  }

  return (
    <div className="relative">
      {/* Indicator Selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(INDICATOR_LABELS) as Indicator[]).map((ind) => (
          <button
            key={ind}
            onClick={() => setIndicator(ind)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              indicator === ind
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {INDICATOR_LABELS[ind]}
          </button>
        ))}
      </div>

      {/* Map Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <canvas
          ref={canvasRef}
          className="h-[600px] w-full"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* Tooltip */}
        {hoveredFeature && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              left: mousePos.x + 15,
              top: mousePos.y - 10,
            }}
          >
            <p className="text-sm font-semibold">
              {hoveredFeature.properties.name}
            </p>
            {hoveredFeature.properties.turnoutPercentage != null && (
              <p className="text-xs text-zinc-500">
                Comparecimento:{" "}
                {hoveredFeature.properties.turnoutPercentage.toFixed(1)}%
              </p>
            )}
            {hoveredFeature.properties.abstentionPercentage != null && (
              <p className="text-xs text-zinc-500">
                Abstencao:{" "}
                {hoveredFeature.properties.abstentionPercentage.toFixed(1)}%
              </p>
            )}
            {hoveredFeature.properties.eligibleVoters != null && (
              <p className="text-xs text-zinc-500">
                Eleitorado:{" "}
                {hoveredFeature.properties.eligibleVoters.toLocaleString(
                  "pt-BR"
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Legenda — {INDICATOR_LABELS[indicator]}
        </p>
        <div className="flex items-center gap-1">
          {getLegendStops(indicator).map((stop, i) => (
            <div key={i} className="flex-1">
              <div
                className="h-3 w-full"
                style={{
                  backgroundColor: stop.color,
                  borderRadius:
                    i === 0
                      ? "6px 0 0 6px"
                      : i === getLegendStops(indicator).length - 1
                        ? "0 6px 6px 0"
                        : "0",
                }}
              />
              <p className="mt-1 text-center text-[10px] text-zinc-500">
                {stop.label}
              </p>
            </div>
          ))}
        </div>
        {geoData && (
          <p className="mt-2 text-xs text-zinc-400">
            {geoData.features.length} municipios no mapa ·{" "}
            {geoData.features.filter((f) => f.properties.value != null).length}{" "}
            com dados
          </p>
        )}
      </div>

      {!geoData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-zinc-400">Carregando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getLegendStops(indicator: Indicator) {
  if (indicator === "eligibleVoters") {
    return [
      { color: "#dbeafe", label: "< 10k" },
      { color: "#93c5fd", label: "10-20k" },
      { color: "#60a5fa", label: "20-50k" },
      { color: "#3b82f6", label: "50-100k" },
      { color: "#2563eb", label: "100-500k" },
      { color: "#1e3a5f", label: "> 500k" },
    ];
  }
  if (indicator === "turnoutPercentage") {
    return [
      { color: "#d1fae5", label: "< 70%" },
      { color: "#a7f3d0", label: "70-75%" },
      { color: "#6ee7b7", label: "75-80%" },
      { color: "#10b981", label: "80-85%" },
      { color: "#059669", label: "85-90%" },
      { color: "#065f46", label: "> 90%" },
    ];
  }
  return [
    { color: "#fee2e2", label: "< 10%" },
    { color: "#fecaca", label: "10-15%" },
    { color: "#fca5a5", label: "15-20%" },
    { color: "#f87171", label: "20-25%" },
    { color: "#dc2626", label: "25-30%" },
    { color: "#991b1b", label: "> 30%" },
  ];
}

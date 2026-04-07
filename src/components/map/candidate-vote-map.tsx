"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface VoteByCity {
  municipalityId: string;
  name: string;
  tseCode: string | null;
  votes: number;
  percentage: number;
}

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

interface CandidateVoteMapProps {
  votesByCity: VoteByCity[];
  candidateName: string;
}

function getVoteColor(votes: number, maxVotes: number): string {
  if (votes === 0) return "#f4f4f5";
  const ratio = votes / maxVotes;
  if (ratio > 0.5) return "#1e3a5f";
  if (ratio > 0.3) return "#1e40af";
  if (ratio > 0.15) return "#2563eb";
  if (ratio > 0.08) return "#3b82f6";
  if (ratio > 0.03) return "#60a5fa";
  if (ratio > 0.01) return "#93c5fd";
  return "#dbeafe";
}

function getGeoBounds(features: MapFeature[]) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    for (const ring of feature.geometry.coordinates) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return { minLon, maxLon, minLat, maxLat };
}

export function CandidateVoteMap({
  votesByCity,
  candidateName,
}: CandidateVoteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    name: string;
    votes: number;
    percentage: number;
    x: number;
    y: number;
  } | null>(null);

  const voteMap = useMemo(
    () => new Map(votesByCity.map((v) => [v.name.toUpperCase(), v])),
    [votesByCity]
  );
  const maxVotes = useMemo(
    () => Math.max(...votesByCity.map((v) => v.votes), 1),
    [votesByCity]
  );
  const bounds = useMemo(
    () => (geoData ? getGeoBounds(geoData.features) : null),
    [geoData]
  );

  // Fetch geo data
  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: GeoData) => setGeoData(data));
  }, []);

  const project = useCallback(
    (
      lon: number,
      lat: number,
      width: number,
      height: number,
      bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number }
    ) => {
      const x =
        ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width * 0.9 +
        width * 0.05;
      const y =
        ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height * 0.9 +
        height * 0.05;
      return { x, y };
    },
    []
  );

  const drawMap = useCallback(() => {
    if (!geoData || !bounds || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const feature of geoData.features) {
      const name = feature.properties.name.toUpperCase();
      const cityVotes = voteMap.get(name);
      const votes = cityVotes?.votes ?? 0;
      const isHovered = hoveredCity === feature.properties.id;

      ctx.beginPath();
      for (const ring of feature.geometry.coordinates) {
        for (let i = 0; i < ring.length; i++) {
          const { x, y } = project(
            ring[i][0],
            ring[i][1],
            rect.width,
            rect.height,
            bounds
          );
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }

      ctx.fillStyle = isHovered
        ? "#fbbf24"
        : getVoteColor(votes, maxVotes);
      ctx.fill();
      ctx.strokeStyle = isHovered ? "#92400e" : "#ffffff";
      ctx.lineWidth = isHovered ? 1.5 : 0.3;
      ctx.stroke();
    }
  }, [bounds, geoData, hoveredCity, maxVotes, project, voteMap]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!geoData || !bounds || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const feature of geoData.features) {
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.beginPath();
        for (const ring of feature.geometry.coordinates) {
          for (let i = 0; i < ring.length; i++) {
            const { x, y } = project(
              ring[i][0],
              ring[i][1],
              rect.width,
              rect.height,
              bounds
            );
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }

        if (ctx.isPointInPath(mx, my)) {
          const name = feature.properties.name.toUpperCase();
          const cityVotes = voteMap.get(name);
          setHoveredCity(feature.properties.id);
          setTooltipData({
            name: feature.properties.name,
            votes: cityVotes?.votes ?? 0,
            percentage: cityVotes?.percentage ?? 0,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          return;
        }
      }

      setHoveredCity(null);
      setTooltipData(null);
    },
    [bounds, geoData, project, voteMap]
  );

  // Legend stops
  const legendStops = [
    { color: "#f4f4f5", label: "0" },
    { color: "#dbeafe", label: "" },
    { color: "#93c5fd", label: "" },
    { color: "#60a5fa", label: "" },
    { color: "#3b82f6", label: "" },
    { color: "#2563eb", label: "" },
    { color: "#1e40af", label: "" },
    { color: "#1e3a5f", label: `${maxVotes.toLocaleString("pt-BR")}` },
  ];

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="h-[500px] w-full cursor-crosshair"
        aria-label={`Mapa de votos por município de ${candidateName}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredCity(null);
          setTooltipData(null);
        }}
      />

      {/* Tooltip */}
      {tooltipData && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            left: tooltipData.x + 12,
            top: tooltipData.y - 40,
          }}
        >
          <p className="font-semibold">{tooltipData.name}</p>
          <p className="text-zinc-500">
            {tooltipData.votes.toLocaleString("pt-BR")} votos
            {tooltipData.percentage > 0 &&
              ` (${tooltipData.percentage.toFixed(1)}%)`}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
        <span>Menos votos</span>
        <div className="flex">
          {legendStops.map((s, i) => (
            <div
              key={i}
              className="h-3 w-6"
              style={{ backgroundColor: s.color }}
            />
          ))}
        </div>
        <span>Mais votos</span>
      </div>
    </div>
  );
}

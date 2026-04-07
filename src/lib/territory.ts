export interface TerritoryInfo {
  slug: string;
  label: string;
}

export const TERRITORY_LABELS: Record<string, string> = {
  "rms-reconcavo": "RMS e Recôncavo",
  "litoral-norte-nordeste": "Litoral Norte e Nordeste",
  "norte-sao-francisco": "Norte e Vale do São Francisco",
  "chapada-centro": "Chapada e Centro",
  oeste: "Oeste",
  sudoeste: "Sudoeste",
  "sul-extremo-sul": "Sul e Extremo Sul",
  indefinido: "Território não classificado",
};

export const TERRITORY_OPTIONS = Object.entries(TERRITORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function classifyBahiaTerritory(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  municipalityName?: string | null
): TerritoryInfo {
  if (latitude == null || longitude == null) {
    return { slug: "indefinido", label: TERRITORY_LABELS.indefinido };
  }

  const normalizedName = municipalityName
    ?.toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizedName === "SALVADOR" || (longitude > -39.2 && latitude > -13.5)) {
    return { slug: "rms-reconcavo", label: TERRITORY_LABELS["rms-reconcavo"] };
  }

  if (longitude < -43.2) {
    return { slug: "oeste", label: TERRITORY_LABELS.oeste };
  }

  if (latitude < -15.4) {
    return { slug: "sul-extremo-sul", label: TERRITORY_LABELS["sul-extremo-sul"] };
  }

  if (latitude < -13.6 && longitude <= -40.8) {
    return { slug: "sudoeste", label: TERRITORY_LABELS.sudoeste };
  }

  if (latitude > -11.4 && longitude <= -40) {
    return {
      slug: "norte-sao-francisco",
      label: TERRITORY_LABELS["norte-sao-francisco"],
    };
  }

  if (latitude > -12.6 && longitude > -40) {
    return {
      slug: "litoral-norte-nordeste",
      label: TERRITORY_LABELS["litoral-norte-nordeste"],
    };
  }

  if (latitude >= -13.8 && longitude > -41.8 && longitude <= -39.2) {
    return { slug: "chapada-centro", label: TERRITORY_LABELS["chapada-centro"] };
  }

  return { slug: "sul-extremo-sul", label: TERRITORY_LABELS["sul-extremo-sul"] };
}

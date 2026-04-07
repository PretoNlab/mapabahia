/**
 * Normalizes municipality names for matching between PDF filenames,
 * PDF content, and GeoJSON features.
 */
export function normalizeMunicipalityName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[-–—]/g, " ")
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract municipality name from PDF filename.
 * Pattern: 619_BA_MUNICIPALITY-NAME_2024_T1.pdf
 */
export function extractMunicipalityFromFilename(filename: string): {
  municipality: string;
  uf: string;
  year: number;
  round: number;
} | null {
  const match = filename.match(
    /^(\d+)_([A-Z]{2})_(.+)_(\d{4})_T(\d+)\.pdf$/i
  );
  if (!match) return null;

  const [, , uf, rawName, yearStr, roundStr] = match;
  const municipality = rawName.replace(/-/g, " ");

  return {
    municipality,
    uf: uf.toUpperCase(),
    year: parseInt(yearStr, 10),
    round: parseInt(roundStr, 10),
  };
}

/**
 * Attempts to match a municipality name from a PDF to a GeoJSON name.
 * Uses normalized comparison.
 */
export function findBestMunicipalityMatch(
  pdfName: string,
  geoNames: string[]
): string | null {
  const normalizedPdf = normalizeMunicipalityName(pdfName);

  // Exact match
  const exact = geoNames.find(
    (g) => normalizeMunicipalityName(g) === normalizedPdf
  );
  if (exact) return exact;

  // Fuzzy: check if one contains the other
  const contained = geoNames.find((g) => {
    const ng = normalizeMunicipalityName(g);
    return ng.includes(normalizedPdf) || normalizedPdf.includes(ng);
  });
  if (contained) return contained;

  return null;
}

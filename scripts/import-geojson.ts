/**
 * Import GeoJSON municipalities into database.
 * Usage: npx tsx scripts/import-geojson.ts [path-to-geojson]
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import fs from "fs";
import path from "path";
import { normalizeMunicipalityName } from "../src/lib/normalizers/municipality";

const adapter = new PrismaLibSql({ url: `file:${path.resolve(__dirname, "../prisma/dev.db")}` });
const prisma = new PrismaClient({ adapter });

interface GeoFeature {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    description: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoFeature[];
}

function getCentroid(coords: number[][][]): [number, number] {
  let totalLat = 0;
  let totalLng = 0;
  let count = 0;

  const ring = coords[0]; // outer ring
  for (const point of ring) {
    totalLng += point[0];
    totalLat += point[1];
    count++;
  }

  return [totalLng / count, totalLat / count];
}

async function main() {
  const geoPath =
    process.argv[2] ||
    path.resolve(__dirname, "../../mapabahia/municipios-bahia.json");

  console.log(`Reading GeoJSON from: ${geoPath}`);
  const raw = fs.readFileSync(geoPath, "utf-8");
  const geojson: GeoJSON = JSON.parse(raw);

  console.log(`Found ${geojson.features.length} features`);

  let created = 0;
  let updated = 0;

  for (const feature of geojson.features) {
    const { id, name } = feature.properties;
    const nameNormalized = normalizeMunicipalityName(name);
    const [lng, lat] = getCentroid(feature.geometry.coordinates);

    const existing = await prisma.municipality.findFirst({
      where: { nameNormalized, uf: "BA" },
    });

    if (existing) {
      await prisma.municipality.update({
        where: { id: existing.id },
        data: {
          ibgeCode: id,
          geoJson: JSON.stringify(feature.geometry),
          latitude: lat,
          longitude: lng,
        },
      });
      updated++;
    } else {
      await prisma.municipality.create({
        data: {
          name,
          nameNormalized,
          ibgeCode: id,
          uf: "BA",
          geoJson: JSON.stringify(feature.geometry),
          latitude: lat,
          longitude: lng,
        },
      });
      created++;
    }
  }

  console.log(`Done. Created: ${created}, Updated: ${updated}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env bun
/**
 * Упрощает и конвертирует муниципалитеты:
 * 1. Simplify (Douglas-Peucker, tolerance 0.005° ≈ 500 м)
 * 2. Разбивает по регионам — каждый регион в свой файл
 * 3. Конвертирует в TopoJSON для сжатия (~30% меньше)
 *
 * Вход:  public/data/russia_municipalities.geojson (39 MB)
 * Выход: public/data/muni/<REGION>.topojson (3-200 KB каждый)
 *        + index.json — список регионов с размерами
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import simplify from "@turf/simplify";
import { featureCollection } from "@turf/helpers";
import * as topojsonServer from "topojson-server";
import * as topojsonClient from "topojson-client";

const SRC = "public/data/russia_municipalities.geojson";
const OUT_DIR = "public/data/muni";
const INDEX_PATH = "public/data/muni-index.json";

const TOLERANCE = 0.005; // ~500 м — достаточно для зума до 12

console.log("📖 Читаю GeoJSON...");
const raw = readFileSync(SRC, "utf-8");
const geojson = JSON.parse(raw) as GeoJSON.FeatureCollection;
console.log(`  ✓ ${geojson.features.length} фич`);

// ─── 1. Группируем по региону (NAME_1) ─────────────────────────────
console.log("\n📁 Группирую по регионам...");
const byRegion = new Map<string, GeoJSON.Feature[]>();
for (const f of geojson.features) {
  const props = f.properties as Record<string, unknown>;
  const region = (props.NAME_1 as string) || "unknown";
  if (!byRegion.has(region)) byRegion.set(region, []);
  byRegion.get(region)!.push(f);
}
console.log(`  ✓ ${byRegion.size} регионов`);

// ─── 2. Создаём директорию ────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

// Чищу старые файлы
for (const old of readdirSync(OUT_DIR)) {
  if (old.endsWith(".topojson") || old.endsWith(".json")) {
    // не удаляем index.json (создадим заново в конце)
  }
}

// ─── 3. Для каждого региона: simplify + TopoJSON ─────────────────
console.log("\n🔧 Упрощаю и конвертирую по регионам...");
const index: Array<{
  region: string;
  file: string;
  size_bytes: number;
  features: number;
  points_before: number;
  points_after: number;
}> = [];

let totalBefore = 0;
let totalAfter = 0;
let totalSize = 0;

for (const [region, features] of byRegion) {
  const fc: GeoJSON.FeatureCollection = featureCollection(features);

  // Считаем точки до
  const pointsBefore = countPoints(fc);

  // Simplify
  const simplified = simplify(fc, {
    tolerance: TOLERANCE,
    highQuality: true,
  });

  // Считаем точки после
  const pointsAfter = countPoints(simplified);

  // Конвертируем в TopoJSON (сжимает через дедупликацию границ)
  const topo = topojsonServer.topology({ muni: simplified } as any, 1e6);

  // Имя файла — slugify
  const slug = region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `${slug}.topojson`;
  const filepath = join(OUT_DIR, filename);

  const content = JSON.stringify(topo);
  writeFileSync(filepath, content);

  const sizeBytes = Buffer.byteLength(content);

  index.push({
    region,
    file: `muni/${filename}`,
    size_bytes: sizeBytes,
    features: features.length,
    points_before: pointsBefore,
    points_after: pointsAfter,
  });

  totalBefore += pointsBefore;
  totalAfter += pointsAfter;
  totalSize += sizeBytes;

  console.log(
    `  ${region}: ${features.length} фич, ${pointsBefore}→${pointsAfter} точек, ${(sizeBytes / 1024).toFixed(1)} KB`
  );
}

// ─── 4. Сохраняем индекс ──────────────────────────────────────────
writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

console.log("\n═══ Итог ═══");
console.log(`Регионов: ${index.length}`);
console.log(`Файлов: ${index.length}`);
console.log(`Точек: ${totalBefore.toLocaleString()} → ${totalAfter.toLocaleString()} (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% сжатия)`);
console.log(`Общий размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB (было 39 MB)`);
console.log(`\nИндекс: ${INDEX_PATH}`);
console.log(`Файлы: ${OUT_DIR}/<region>.topojson`);

// ─── Helpers ──────────────────────────────────────────────────────
function countPoints(fc: GeoJSON.FeatureCollection): number {
  let count = 0;
  for (const f of fc.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      for (const ring of f.geometry.coordinates as number[][][]) {
        count += ring.length;
      }
    } else if (f.geometry.type === "MultiPolygon") {
      for (const poly of f.geometry.coordinates as number[][][]) {
        for (const ring of poly) count += ring.length;
      }
    }
  }
  return count;
}

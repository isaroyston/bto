import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATASET_ID = "d_8d886e3a83934d7447acdf5bc6959999";
const POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/poll-download`;
const OUTPUT_URL = new URL("../data/geospatial/rail-stations.geojson", import.meta.url);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);

async function main() {
  const metadata = await fetchJson(POLL_URL);
  const downloadUrl = metadata.data?.url;

  if (metadata.code !== 0 || !downloadUrl) {
    throw new Error(metadata.errMsg ?? "Rail station dataset download URL was not returned.");
  }

  const response = await fetch(downloadUrl, {
    headers: {
      accept: "application/geo+json,application/json",
      "user-agent": "hdb-planner-rail-station-refresh/1.0 (+local generated dataset)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch rail station GeoJSON: ${response.status} ${response.statusText}`);
  }

  const geojson = await response.json();
  if (!Array.isArray(geojson.features)) {
    throw new Error("Rail station GeoJSON is missing the features array.");
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(geojson, null, 2)}\n`, "utf8");

  console.log(`Wrote ${geojson.features.length} rail station features to ${OUTPUT_PATH}`);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "hdb-planner-rail-station-refresh/1.0 (+local generated dataset)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

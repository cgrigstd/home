import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseModelfitGpu } from '../lib/modelfit.js';
import { parseModelfitDeviceLinks, parseModelfitGpuCatalog } from '../lib/modelfit-catalog.js';
import { parseGpuCatalog } from '../lib/vramdb.js';
import { FALLBACK_GPUS, mergeGpuCatalog } from '../lib/gpus.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://modelfit.io';
const USER_AGENT = 'gpu-fit catalog builder (+https://modelfit.io)';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchText(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return await res.text();
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(400 * attempt);
    return fetchText(url, attempt + 1);
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function appleName(title = '') {
  const match = /Best AI Models for (.+?)(?:\s*\(|\s*\|)/i.exec(title);
  return match ? `Apple ${match[1].trim()}` : '';
}

function appleSlug(path) {
  return `apple-${String(path).replace(/^\/+|\/+$/g, '').replace(/\//g, '-')}`;
}

const [gpuIndexHtml, vramdbHtml, devicesHtml] = await Promise.all([
  fetchText(`${BASE}/gpu/`),
  fetchText('https://vramdb.com/gpus/'),
  fetchText(`${BASE}/devices/`),
]);

const modelfitGpus = parseModelfitGpuCatalog(gpuIndexHtml);
const vramdbGpus = parseGpuCatalog(vramdbHtml).filter(
  (gpu) => gpu.slug !== 'gtx-1650' && !/apple|macbook|mac\s*mini|mac\s*studio|imac/i.test(`${gpu.name} ${gpu.slug}`),
);
const devicePaths = parseModelfitDeviceLinks(devicesHtml);

const paths = [...new Set([...modelfitGpus.map((gpu) => gpu.modelfitPath), ...devicePaths])];
console.log(
  `Fuentes: ${modelfitGpus.length} GPUs modelfit, ${vramdbGpus.length} GPUs vramdb, ` +
    `${devicePaths.length} dispositivos Apple, ${paths.length} páginas a leer.`,
);

const pages = await mapLimit(paths, 4, async (path) => {
  const url = `${BASE}${path}`;
  try {
    const html = await fetchText(url);
    const parsed = parseModelfitGpu(html, url);
    return { path, parsed };
  } catch (error) {
    console.warn(`  aviso: ${path} -> ${error.message}`);
    return { path, parsed: null };
  }
});

const byPath = {};
for (const { path, parsed } of pages) {
  if (parsed) byPath[path] = parsed;
}

// Completa la VRAM que no venga en el índice usando la propia página.
for (const gpu of modelfitGpus) {
  if (!gpu.vramGb) {
    const parsed = byPath[gpu.modelfitPath];
    if (parsed?.vramGb) gpu.vramGb = parsed.vramGb;
  }
}

const appleGpus = [];
for (const path of devicePaths) {
  const parsed = byPath[path];
  if (!parsed) continue;
  const name = appleName(parsed.gpuTitle) || `Apple ${path.replace(/^\/|\/$/g, '').replace(/\//g, ' ')}`;
  appleGpus.push({
    slug: appleSlug(path),
    name,
    vramGb: parsed.vramGb,
    brand: 'Apple',
    modelfitPath: path,
    source: 'modelfit-devices',
    verified: true,
  });
}

const catalogGpus = mergeGpuCatalog(FALLBACK_GPUS, vramdbGpus, modelfitGpus, appleGpus);

// Una GPU no debe apuntar a una página de recomendaciones que no existe.
for (const gpu of catalogGpus) {
  if (gpu.modelfitPath && !byPath[gpu.modelfitPath]) gpu.modelfitPath = null;
}

const byPathJson = {};
for (const [path, rec] of Object.entries(byPath)) {
  const { categories, ...rest } = rec;
  byPathJson[path] = rest;
}

await mkdir(resolve(ROOT, 'data'), { recursive: true });
await mkdir(resolve(ROOT, 'data/cache'), { recursive: true });
await writeFile(
  resolve(ROOT, 'data/catalog.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), gpus: catalogGpus }, null, 2)}\n`,
  'utf8',
);
await writeFile(
  resolve(ROOT, 'data/recommendations.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), byPath: byPathJson }, null, 2)}\n`,
  'utf8',
);
await writeFile(resolve(ROOT, 'data/cache/modelfit-gpus.html'), gpuIndexHtml, 'utf8');
await writeFile(resolve(ROOT, 'data/cache/modelfit-devices.html'), devicesHtml, 'utf8');
await writeFile(resolve(ROOT, 'data/cache/vramdb-gpus.html'), vramdbHtml, 'utf8');

const byBrand = catalogGpus.reduce((acc, gpu) => {
  acc[gpu.brand] = (acc[gpu.brand] || 0) + 1;
  return acc;
}, {});

console.log('Catálogo:', byBrand, 'total', catalogGpus.length);
console.log('Páginas de recomendaciones:', Object.keys(byPath).length);

for (const slug of ['rtx-4090', 'rx-9070-xt', 'apple-macbook-pro-m5', 'apple-macbook-pro-m3']) {
  const gpu = catalogGpus.find((item) => item.slug === slug);
  if (!gpu) continue;
  const rec = byPath[gpu.modelfitPath];
  const llm = rec?.categories?.llm?.length || 0;
  const image = rec?.categories?.image?.length || 0;
  const video = rec?.categories?.video?.length || 0;
  console.log(`${slug}: ${gpu.vramGb}GB -> LLM ${llm}, imagen ${image}, vídeo ${video}`);
}

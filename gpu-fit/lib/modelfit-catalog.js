import { decodeEntities, stripTags } from './text.js';

function brandFromSlug(slug = '') {
  if (/^(rx-|ryzen-)/i.test(slug)) return 'AMD';
  if (/^(rtx-|gtx-|tesla-)/i.test(slug)) return 'NVIDIA';
  return 'Otros';
}

function fullName(label = '', brand = '') {
  const clean = stripTags(label).replace(/\s*\(\s*\d+\s*GB\s*\)\s*$/i, '').trim();
  if (!clean) return '';
  if (brand === 'AMD') {
    if (/^rx\s/i.test(clean)) return `AMD Radeon ${clean}`;
    return `AMD ${clean}`;
  }
  if (brand === 'NVIDIA') {
    if (/^tesla\s/i.test(clean)) return `NVIDIA ${clean}`;
    if (/^rtx\s+pro\s/i.test(clean)) return `NVIDIA ${clean}`;
    return `NVIDIA GeForce ${clean}`;
  }
  return clean;
}

// Junta todos los payloads RSC de Next.js (`self.__next_f.push([1,"..."])`)
// y devuelve el texto des-escapado, que contiene el JSON embebido de la página.
function nextPayload(html) {
  const source = String(html || '');
  const regex = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g;
  let match;
  let joined = '';
  while ((match = regex.exec(source)) !== null) {
    try {
      joined += JSON.parse(match[1]);
    } catch {
      // Ignora payloads mal formados.
    }
  }
  return joined;
}

function parseEmbeddedGpus(html) {
  const payload = nextPayload(html);
  if (!payload) return [];
  const match = /"gpus":(\[\{[\s\S]*?\}\])/.exec(payload);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    if (!Array.isArray(data)) return [];
    return data
      .filter((gpu) => gpu && typeof gpu.slug === 'string')
      .map((gpu) => ({ slug: gpu.slug, label: gpu.label || gpu.slug }));
  } catch {
    return [];
  }
}

function parseOptionGpus(html) {
  const source = String(html || '');
  const regex = /<option value="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/option>/gi;
  const seen = new Set();
  const gpus = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const slug = match[1];
    if (seen.has(slug)) continue;
    const label = stripTags(match[2]).replace(/\s+/g, ' ').trim();
    const vramMatch = /\(\s*(\d+)\s*GB\s*\)/i.exec(label);
    if (!vramMatch) continue;
    seen.add(slug);
    gpus.push({
      slug,
      label: label.replace(/\s*\(\s*\d+\s*GB\s*\)\s*$/i, '').trim(),
      vramGb: Number(vramMatch[1]),
    });
  }
  return gpus;
}

// Catálogo de GPUs NVIDIA + AMD desde modelfit.io/gpu/.
// El listado viene en JSON (payload RSC); la VRAM está en las <option>.
export function parseModelfitGpuCatalog(html) {
  const source = String(html || '');
  if (!source) return [];

  const embedded = parseEmbeddedGpus(source);
  const options = parseOptionGpus(source);
  const vramBySlug = new Map(options.map((gpu) => [gpu.slug, gpu.vramGb]));
  const labelBySlug = new Map(options.map((gpu) => [gpu.slug, gpu.label]));

  const rows = embedded.length > 0 ? embedded : options;
  const seen = new Set();
  const gpus = [];
  for (const row of rows) {
    if (seen.has(row.slug)) continue;
    seen.add(row.slug);
    const brand = brandFromSlug(row.slug);
    const label = row.label || labelBySlug.get(row.slug) || row.slug;
    gpus.push({
      slug: row.slug,
      name: fullName(label, brand),
      label,
      vramGb: row.vramGb || vramBySlug.get(row.slug) || null,
      brand,
      modelfitPath: `/gpu/${row.slug}/`,
      source: 'modelfit',
    });
  }
  return gpus;
}

// Enlaces a las páginas de dispositivos Apple (MacBook Air/Pro, Mac Mini,
// Mac Studio, iMac) que modelfit publica en /devices/.
export function parseModelfitDeviceLinks(html) {
  const source = String(html || '');
  const regex =
    /href="(\/(?:macbook-air|macbook-pro|mac-mini|mac-studio|imac)\/[a-z0-9-]+\/)"/gi;
  const seen = new Set();
  const links = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const path = decodeEntities(match[1]);
    if (seen.has(path)) continue;
    seen.add(path);
    links.push(path);
  }
  return links;
}

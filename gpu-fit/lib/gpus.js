// Catálogo base. Se combina con data/catalog.json y, si está disponible, con
// lo que devuelve vramdb.com/gpus/ en tiempo de ejecución.
// `modelfitSlug`/`modelfitPath` apuntan a la página equivalente en modelfit.io.
export const FALLBACK_GPUS = [
  { slug: 'rtx-5090', name: 'NVIDIA GeForce RTX 5090', vramGb: 32, brand: 'NVIDIA', modelfitSlug: 'rtx-5090' },
  { slug: 'rtx-5080', name: 'NVIDIA GeForce RTX 5080', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-5080' },
  { slug: 'rtx-5070-ti', name: 'NVIDIA GeForce RTX 5070 Ti', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-5070-ti' },
  { slug: 'rtx-5070', name: 'NVIDIA GeForce RTX 5070', vramGb: 12, brand: 'NVIDIA', modelfitSlug: 'rtx-5070' },
  { slug: 'rtx-5060-ti', name: 'NVIDIA GeForce RTX 5060 Ti', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-5060-ti' },
  { slug: 'rtx-5060', name: 'NVIDIA GeForce RTX 5060', vramGb: 8, brand: 'NVIDIA', modelfitSlug: 'rtx-5060' },
  { slug: 'rtx-4090', name: 'NVIDIA GeForce RTX 4090', vramGb: 24, brand: 'NVIDIA', modelfitSlug: 'rtx-4090' },
  { slug: 'rtx-4080-super', name: 'NVIDIA GeForce RTX 4080 Super', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-4080-super' },
  { slug: 'rtx-4080', name: 'NVIDIA GeForce RTX 4080', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-4080' },
  { slug: 'rtx-4070-ti-super', name: 'NVIDIA GeForce RTX 4070 Ti Super', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-4070-ti-super' },
  { slug: 'rtx-4070-ti', name: 'NVIDIA GeForce RTX 4070 Ti', vramGb: 12, brand: 'NVIDIA', modelfitSlug: 'rtx-4070-ti' },
  { slug: 'rtx-4070-super', name: 'NVIDIA GeForce RTX 4070 Super', vramGb: 12, brand: 'NVIDIA', modelfitSlug: 'rtx-4070-super' },
  { slug: 'rtx-4070', name: 'NVIDIA GeForce RTX 4070', vramGb: 12, brand: 'NVIDIA', modelfitSlug: 'rtx-4070' },
  { slug: 'rtx-4060-ti-16gb', name: 'NVIDIA GeForce RTX 4060 Ti (16GB)', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'rtx-4060-ti' },
  { slug: 'rtx-4060-ti', name: 'NVIDIA GeForce RTX 4060 Ti (8GB)', vramGb: 8, brand: 'NVIDIA', modelfitSlug: 'rtx-4060-ti' },
  { slug: 'rtx-4060', name: 'NVIDIA GeForce RTX 4060', vramGb: 8, brand: 'NVIDIA', modelfitSlug: 'rtx-4060' },
  { slug: 'rtx-3090-ti', name: 'NVIDIA GeForce RTX 3090 Ti', vramGb: 24, brand: 'NVIDIA', modelfitSlug: 'rtx-3090-ti' },
  { slug: 'rtx-3090', name: 'NVIDIA GeForce RTX 3090', vramGb: 24, brand: 'NVIDIA', modelfitSlug: 'rtx-3090' },
  { slug: 'rtx-3080', name: 'NVIDIA GeForce RTX 3080 (10GB)', vramGb: 10, brand: 'NVIDIA', modelfitSlug: 'rtx-3080-10gb' },
  { slug: 'rtx-3070', name: 'NVIDIA GeForce RTX 3070', vramGb: 8, brand: 'NVIDIA', modelfitSlug: 'rtx-3070' },
  { slug: 'rtx-3060-ti', name: 'NVIDIA GeForce RTX 3060 Ti', vramGb: 8, brand: 'NVIDIA', modelfitSlug: 'rtx-3060-ti' },
  { slug: 'rtx-3060', name: 'NVIDIA GeForce RTX 3060', vramGb: 12, brand: 'NVIDIA', modelfitSlug: 'rtx-3060' },
  { slug: 'rtx-3050', name: 'NVIDIA GeForce RTX 3050', vramGb: 8, brand: 'NVIDIA', modelfitSlug: null },
  { slug: 'rtx-2070', name: 'NVIDIA GeForce RTX 2070', vramGb: 8, brand: 'NVIDIA', modelfitSlug: 'rtx-2070' },
  { slug: 'rtx-6000-pro', name: 'NVIDIA RTX 6000 Pro', vramGb: 96, brand: 'NVIDIA', modelfitSlug: 'rtx-6000-pro' },
  { slug: 'tesla-p100-pcie-16gb', name: 'NVIDIA Tesla P100 (16GB)', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'tesla-p100-pcie-16gb' },
  { slug: 'tesla-t4', name: 'NVIDIA Tesla T4', vramGb: 16, brand: 'NVIDIA', modelfitSlug: 'tesla-t4' },

  { slug: 'rx-7900-xtx', name: 'AMD Radeon RX 7900 XTX', vramGb: 24, brand: 'AMD', modelfitSlug: 'rx-7900-xtx' },
  { slug: 'rx-7900-xt', name: 'AMD Radeon RX 7900 XT', vramGb: 20, brand: 'AMD', modelfitSlug: 'rx-7900-xt' },
  { slug: 'rx-9070-xt', name: 'AMD Radeon RX 9070 XT', vramGb: 16, brand: 'AMD', modelfitSlug: 'rx-9070-xt' },
  { slug: 'rx-9060-xt', name: 'AMD Radeon RX 9060 XT', vramGb: 16, brand: 'AMD', modelfitSlug: 'rx-9060-xt' },
  { slug: 'ryzen-ai-max-395', name: 'AMD Ryzen AI Max+ 395', vramGb: 128, brand: 'AMD', modelfitSlug: 'ryzen-ai-max-395' },

  { slug: 'apple-macbook-air-m5', name: 'Apple MacBook Air M5', vramGb: 24, brand: 'Apple', modelfitPath: '/macbook-air/m5/' },
  { slug: 'apple-macbook-pro-m3', name: 'Apple MacBook Pro M3', vramGb: 16, brand: 'Apple', modelfitPath: '/macbook-pro/m3/' },
  { slug: 'apple-macbook-pro-m5', name: 'Apple MacBook Pro M5', vramGb: 32, brand: 'Apple', modelfitPath: '/macbook-pro/m5/' },
  { slug: 'apple-mac-mini-m4', name: 'Apple Mac Mini M4', vramGb: 24, brand: 'Apple', modelfitPath: '/mac-mini/m4/' },
  { slug: 'apple-mac-studio-m5', name: 'Apple Mac Studio M5 Ultra', vramGb: 256, brand: 'Apple', modelfitPath: '/mac-studio/m5/' },
  { slug: 'apple-imac-m4', name: 'Apple iMac M4', vramGb: 24, brand: 'Apple', modelfitPath: '/imac/m4/' },
];

export function modelfitPathFor(gpu) {
  if (!gpu) return null;
  if (gpu.modelfitPath) return gpu.modelfitPath;
  if (gpu.modelfitSlug) return `/gpu/${gpu.modelfitSlug}/`;
  return null;
}

export function brandFromName(name = '') {
  if (/apple|macbook|mac\s*mini|mac\s*studio|imac|m\d\s*(max|pro|ultra)\b/i.test(name)) return 'Apple';
  if (/radeon|rx\s|ryzen|amd/i.test(name)) return 'AMD';
  if (/nvidia|rtx|gtx|tesla|geforce/i.test(name)) return 'NVIDIA';
  return 'Otros';
}

function normalizeGpu(gpu) {
  const name = gpu.name || gpu.label || gpu.slug || '';
  return {
    slug: gpu.slug,
    name,
    vramGb: gpu.vramGb || null,
    brand: gpu.brand || brandFromName(name),
    optimal: gpu.optimal || '',
    modelfitPath: modelfitPathFor(gpu),
    verified: Boolean(gpu.verified),
  };
}

// Combina el catálogo base con cualquier número de listas (vramdb, modelfit).
// No descarta ninguna marca: NVIDIA, AMD y Apple conviven en el resultado.
export function mergeGpuCatalog(base, ...lists) {
  const bySlug = new Map();
  for (const gpu of base || []) {
    if (!gpu?.slug) continue;
    bySlug.set(gpu.slug, normalizeGpu(gpu));
  }

  for (const list of lists) {
    for (const gpu of list || []) {
      if (!gpu?.slug) continue;
      const existing = bySlug.get(gpu.slug);
      if (existing) {
        if (gpu.name) existing.name = gpu.name;
        if (gpu.vramGb) existing.vramGb = gpu.vramGb;
        if (gpu.optimal) existing.optimal = gpu.optimal;
        const path = modelfitPathFor(gpu);
        if (path) existing.modelfitPath = path;
        if (gpu.brand) existing.brand = gpu.brand;
        existing.verified = true;
      } else {
        bySlug.set(gpu.slug, normalizeGpu({ ...gpu, verified: gpu.verified !== false }));
      }
    }
  }

  return [...bySlug.values()].sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return (b.vramGb || 0) - (a.vramGb || 0) || a.name.localeCompare(b.name);
  });
}

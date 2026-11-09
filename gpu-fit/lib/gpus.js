// Catálogo base. Se combina con lo que devuelve vramdb.com/gpus/ en tiempo de ejecución.
// `modelfitSlug` apunta a la página equivalente en modelfit.io (para recomendaciones).
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
];

export function mergeGpuCatalog(base, live) {
  const bySlug = new Map(base.map((gpu) => [gpu.slug, { ...gpu }]));
  for (const gpu of live) {
    if (gpu.slug === 'gtx-1650' || gpu.slug === 'macbook-m3-max') continue;
    if (gpu.brand === 'AMD' || /^rx-|^ryzen-/i.test(gpu.slug || '')) continue;
    const existing = bySlug.get(gpu.slug);
    if (existing) {
      existing.name = gpu.name || existing.name;
      existing.vramGb = gpu.vramGb || existing.vramGb;
      existing.optimal = gpu.optimal || existing.optimal;
      existing.verified = true;
    } else {
      bySlug.set(gpu.slug, {
        slug: gpu.slug,
        name: gpu.name,
        vramGb: gpu.vramGb,
        brand: brandFromName(gpu.name),
        modelfitSlug: gpu.slug,
        optimal: gpu.optimal,
        verified: true,
      });
    }
  }
  return [...bySlug.values()].sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return b.vramGb - a.vramGb || a.name.localeCompare(b.name);
  });
}

function brandFromName(name = '') {
  if (/apple|macbook|m\d\s*max/i.test(name)) return 'Apple';
  if (/radeon|rx\s|ryzen|amd/i.test(name)) return 'AMD';
  if (/nvidia|rtx|gtx|tesla|geforce/i.test(name)) return 'NVIDIA';
  return 'Otros';
}

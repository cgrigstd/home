const DEFAULT_CONTEXT = 4096;
const DEFAULT_RESOLUTION = 1024;

export function estimateModelVram(model, quantKey, options = {}) {
  const quant = model?.quants?.[quantKey];
  if (!quant) return null;

  let weightsGb;
  if (Number.isFinite(quant.base_weights_gb)) {
    weightsGb = Number(quant.base_weights_gb);
  } else {
    const bits = Number(quant.bits) || 0;
    weightsGb = (Number(model.parameters_b) || 0) * (bits / 8);
  }

  const overheadGb = Number(quant.vram_overhead_gb) || 0;

  let kvGb = 0;
  if (model.type === 'llm' && model.num_layers && model.num_kv_heads && model.head_dim) {
    const context = Number(options.contextTokens) || DEFAULT_CONTEXT;
    const bits = Number(quant.bits) || 16;
    const bytesPerElement = bits >= 16 ? 2 : 1;
    const kvElements = 2 * model.num_layers * model.num_kv_heads * model.head_dim * context;
    kvGb = (kvElements * bytesPerElement) / 1e9;
  }

  let activationGb = 0;
  let resolution = null;
  if (Array.isArray(model.resolutions) && model.resolutions.length > 0) {
    const target = Number(options.resolution) || DEFAULT_RESOLUTION;
    let closest = model.resolutions[0];
    for (const candidate of model.resolutions) {
      const currentDistance = Math.abs((Number(closest.width) || 0) - target);
      const candidateDistance = Math.abs((Number(candidate.width) || 0) - target);
      if (candidateDistance < currentDistance) closest = candidate;
    }
    activationGb = Number(closest.empirical_activation_gb) || 0;
    resolution = closest.label || `${closest.width}x${closest.height}`;
  }

  const totalGb = weightsGb + overheadGb + kvGb + activationGb;
  return {
    weightsGb,
    overheadGb,
    kvGb,
    activationGb,
    resolution,
    totalGb,
    totalMb: Math.round(totalGb * 1024),
  };
}

export function classifyFit(requiredGb, availableGb) {
  if (!Number.isFinite(requiredGb) || requiredGb <= 0) return 'unknown';
  if (!Number.isFinite(availableGb) || availableGb <= 0) return 'unknown';
  const ratio = requiredGb / availableGb;
  if (ratio <= 0.85) return 'fits';
  if (ratio <= 1) return 'tight';
  if (ratio <= 1.5) return 'offload';
  return 'exceeds';
}

export const FIT_LABELS = {
  fits: 'Cabe holgado',
  tight: 'Cabe justo',
  offload: 'Requiere offload',
  exceeds: 'No cabe',
  unknown: 'Sin datos',
};

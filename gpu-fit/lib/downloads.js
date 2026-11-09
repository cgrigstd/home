// Descargas oficiales (gratuitas) para los modelos que lista vramdb.com.
// Verificadas contra Hugging Face. Los modelos con licencia de pago/API no se incluyen.
const CURATED_VRAMDB = {
  'stable-diffusion-1.5': 'https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5',
  'stable-diffusion-xl': 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0',
  'flux-1-dev': 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
  'hunyuan-video': 'https://huggingface.co/tencent/HunyuanVideo',
  'llama-3.2-1b': 'https://huggingface.co/meta-llama/Llama-3.2-1B',
  'llama-3.2-3b': 'https://huggingface.co/meta-llama/Llama-3.2-3B',
  'llama-3.1-8b': 'https://huggingface.co/meta-llama/Llama-3.1-8B',
  'deepseek-r1-7b': 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
  'deepseek-r1-14b': 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
  'deepseek-r1-32b': 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
  'deepseek-r1-70b': 'https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
  'qwen-2.5-72b': 'https://huggingface.co/Qwen/Qwen2.5-72B',
};

const NON_REPO_OWNERS = new Set(['api', 'blob', 'resolve', 'tree', 'datasets', 'spaces', 'docs', 'blog']);

export function isFreeLicense(license = '') {
  return !/paid|proprietary|api[- ]only|subscription|enterprise[- ]only/i.test(license);
}

export function downloadForVramdbModel(model) {
  const url = CURATED_VRAMDB[model?.id];
  if (!url) return { free: true, url: null, source: null };
  return { free: true, url, source: 'Hugging Face' };
}

export function huggingFaceRepoFromUrl(value) {
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'huggingface.co' && parsed.hostname !== 'www.huggingface.co') return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  if (parts[0] === 'api' && parts[1] === 'models' && parts.length >= 4) {
    return `https://huggingface.co/${parts[2]}/${parts[3]}`;
  }
  if (NON_REPO_OWNERS.has(parts[0])) return null;
  return `https://huggingface.co/${parts[0]}/${parts[1]}`;
}

export function buildRecommendationDownload(model) {
  const free = isFreeLicense(model?.license);
  if (!free) return { free: false, url: null, page: null };

  const direct = huggingFaceRepoFromUrl(model?.url);
  if (direct) return { free: true, url: direct, page: direct, source: 'Hugging Face' };

  if (model?.url && model.url.startsWith('/')) {
    return {
      free: true,
      url: null,
      page: `https://modelfit.io${model.url}`,
      resolvePath: model.url,
      needsResolve: true,
      source: 'modelfit.io',
    };
  }

  if (model?.url && /^https?:\/\//i.test(model.url)) {
    return { free: true, url: model.url, page: model.url, source: 'Enlace externo' };
  }

  return { free: true, url: null, page: null };
}

function citationRepos(html) {
  const found = [];
  const seen = new Set();
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const stack = [data];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }
      if (node.citation) {
        const citations = Array.isArray(node.citation) ? node.citation : [node.citation];
        for (const citation of citations) {
          const repoUrl = huggingFaceRepoFromUrl(citation?.url || citation?.['@id']);
          if (!repoUrl) continue;
          const repo = repoUrl.replace('https://huggingface.co/', '');
          if (seen.has(repo)) continue;
          seen.add(repo);
          found.push({ repo, url: repoUrl, name: citation?.name || '' });
        }
      }
      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') stack.push(value);
      }
    }
  }
  return found;
}

function tokens(value = '') {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

export function resolvePrimaryHfRepo(html, hint = '') {
  const source = String(html || '');
  const counts = new Map();
  const firstSeen = new Map();
  const regex = /huggingface\.co\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g;

  let match;
  let index = 0;
  while ((match = regex.exec(source)) !== null) {
    const owner = match[1];
    const repo = match[2];
    if (NON_REPO_OWNERS.has(owner)) continue;
    const key = `${owner}/${repo}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!firstSeen.has(key)) firstSeen.set(key, index);
    index += 1;
  }

  if (counts.size === 0) return null;

  const cited = citationRepos(source);
  if (cited.length > 0) {
    return { repo: cited[0].repo, url: cited[0].url, count: counts.get(cited[0].repo) || 0 };
  }

  const hintTokens = new Set(tokens(hint));
  let best = null;
  for (const [key, count] of counts) {
    const repoName = key.split('/')[1];
    const overlap = tokens(repoName).filter((token) => hintTokens.has(token)).length;
    const score = count + overlap * 3;
    const candidate = { key, score, count, first: firstSeen.get(key) };
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.first < best.first)
    ) {
      best = candidate;
    }
  }

  return { repo: best.key, url: `https://huggingface.co/${best.key}`, count: best.count };
}

const COMPONENT_LABELS = {
  transformer: 'Transformer (pesos)',
  text_encoder: 'Text encoder (CLIP/T5)',
  text_encoders: 'Text encoders (CLIP/T5)',
  unet: 'UNet (pesos)',
  vae: 'VAE',
  vae_decoder: 'VAE decoder',
  vae_encoder: 'VAE encoder',
  audio_vae: 'Audio VAE',
  video_vae: 'Video VAE',
  ae: 'Autoencoder (ae)',
  connector: 'Connector',
  vocoder: 'Vocoder',
  clip: 'CLIP',
  tokenizer: 'Tokenizer',
  diffusion_models: 'Diffusion models',
};

// Only these "component" keys are real dependencies of the model base.
// Everything else (LICENSE, .gguf quantized variants, shard files at top level, etc.)
// is filtered out to avoid broken/gated links.
const COMPONENT_KEYS = new Set(Object.keys(COMPONENT_LABELS));

export function extractComponentLinks(html) {
  const primary = resolvePrimaryHfRepo(html);
  if (!primary) return [];
  const repo = primary.repo;
  const prefix = `https://huggingface.co/${repo}/blob/main/`;
  const seen = new Set();
  const result = [];
  const regex = /https:\/\/huggingface\.co\/[^"'\s<>]+\/blob\/main\/[^"'\s<>]+/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[0].replace(/[),.;]+$/, '');
    if (!url.startsWith(prefix)) continue;
    const filePath = url.slice(prefix.length);
    const parts = filePath.split('/');
    const key = parts.length > 1 ? parts[0] : parts[0].replace(/\.[^.]+$/, '');
    if (!COMPONENT_KEYS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = COMPONENT_LABELS[key];
    const isDir = parts.length > 1;
    const linkUrl = isDir
      ? `https://huggingface.co/${repo}/tree/main/${key}`
      : `https://huggingface.co/${repo}/blob/main/${filePath}`;
    result.push({ label, url: linkUrl, path: key });
  }
  return result;
}

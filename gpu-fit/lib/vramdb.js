import { decodeEntities, stripTags } from './text.js';

const NODE_LINE = /^- \[(.+?)\]\((https:\/\/vramdb\.com\/nodes\/[^)]+)\):\s*Base VRAM ~([\d.]+)MB\.?/;

export function parseLlmsNodes(text) {
  const nodes = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = NODE_LINE.exec(line.trim());
    if (!match) continue;
    const title = match[1];
    const url = match[2];
    const baseVramMb = Math.round(parseFloat(match[3]));

    let name = title;
    let author = '';
    const byIndex = title.lastIndexOf(' by ');
    if (byIndex > 0) {
      name = title.slice(0, byIndex).trim();
      author = title.slice(byIndex + 4).trim();
    }

    const repoMatch = /\/nodes\/([^/]+)\/([^/]+)/.exec(url);
    nodes.push({
      name,
      author,
      url,
      owner: repoMatch ? repoMatch[1] : '',
      repo: repoMatch ? repoMatch[2] : '',
      baseVramMb,
    });
  }
  return nodes;
}

const GPU_CARD =
  /<h3[^>]*>\s*<a href="\/gpus\/([^"/]+)-price-history\/"[^>]*>([^<]+)<\/a>\s*<\/h3>[\s\S]{0,400}?<span[^>]*>(\d+)GB VRAM<\/span>[\s\S]{0,400}?Optimal for: ([^<]+)<\/p>/g;

export function parseGpuCatalog(html) {
  const gpus = [];
  const seen = new Set();
  let match;
  GPU_CARD.lastIndex = 0;
  while ((match = GPU_CARD.exec(String(html || ''))) !== null) {
    const slug = match[1];
    if (seen.has(slug)) continue;
    if (slug === 'gtx-1650') continue;
    seen.add(slug);
    gpus.push({
      slug,
      name: decodeEntities(match[2]).trim(),
      vramGb: Number(match[3]),
      optimal: decodeEntities(match[4]).trim(),
      source: 'vramdb',
    });
  }
  return gpus;
}

export function parseModelsIsland(html) {
  const source = String(html || '');
  const match = /<script type="application\/json" id="models-data-island">([\s\S]*?)<\/script>/.exec(source);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    return Array.isArray(data.models) ? data.models : [];
  } catch {
    return [];
  }
}

export function parseGpuPageNodes(html) {
  const source = String(html || '');
  const items = [];
  const regex = /"@type":"ListItem","position":\d+,"url":"(https:\/\/vramdb\.com\/nodes\/[^"]+)","name":"([^"]*)"/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    items.push({ url: match[1], name: stripTags(match[2]) });
  }
  return items;
}

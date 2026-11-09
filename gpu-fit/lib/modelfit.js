import { decodeEntities, stripTags } from './text.js';

function normalizeFit(label, detail) {
  const text = `${label} ${detail}`.toLowerCase();
  if (/exceed/.test(text)) return 'exceeds';
  if (/offload/.test(text)) return 'offload';
  if (/^runs|runs\b/.test(text)) return 'runs';
  if (/unknown|sin datos/.test(text)) return 'unknown';
  return 'unknown';
}

function parseLdJson(html) {
  const blocks = [];
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Ignora bloques JSON-LD mal formados.
    }
  }
  return blocks;
}

function collectFaq(blocks) {
  const faq = [];
  for (const block of blocks) {
    const graph = Array.isArray(block?.['@graph']) ? block['@graph'] : [block];
    for (const entry of graph) {
      if (entry?.['@type'] === 'FAQPage' && Array.isArray(entry.mainEntity)) {
        for (const item of entry.mainEntity) {
          if (item?.name && item?.acceptedAnswer?.text) {
            faq.push({
              question: stripTags(item.name),
              answer: stripTags(item.acceptedAnswer.text),
            });
          }
        }
      }
    }
  }
  return faq;
}

function firstCell(html, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = regex.exec(html);
  return match ? match[1] : '';
}

function parseRow(cells) {
  if (cells.length < 4) return null;
  const [modelCell, fitCell, qualityCell, appCell] = cells;

  const linkMatch = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(modelCell);
  const name = stripTags(linkMatch ? linkMatch[2] : modelCell);
  if (!name || /^model$/i.test(name)) return null;

  const license = stripTags(firstCell(modelCell, 'small'));
  const fitLabel = stripTags(
    (/(<span[^>]*class="[^"]*fit[^"]*"[^>]*>)([\s\S]*?)<\/span>/i.exec(fitCell) || [])[2] || firstCell(fitCell, 'span'),
  );
  const fitDetail = stripTags(firstCell(fitCell, 'small'));
  const quality = stripTags(qualityCell);
  const app = stripTags(appCell);

  let fullQuality = quality;
  if (!fullQuality) {
    const download = /Complete:\s*([^<]*?\d+(?:\.\d+)?\s*GB download)/i.exec(stripTags(fitCell));
    if (download) fullQuality = download[1];
  }

  let category = 'other';
  if (/text to video/i.test(quality)) category = 'video';
  else if (/text to image/i.test(quality)) category = 'image';

  const url = linkMatch ? decodeEntities(linkMatch[1]) : '';
  const pageUrl = url
    ? /^https?:\/\//i.test(url)
      ? url
      : `https://modelfit.io${url.startsWith('/') ? '' : '/'}${url}`
    : '';

  return {
    name,
    license,
    fit: normalizeFit(fitLabel, fitDetail),
    fitLabel,
    fitDetail,
    quality,
    app,
    category,
    url,
    pageUrl,
  };
}

export function parseModelfitGpu(html, sourceUrl = '') {
  const source = String(html || '');
  const title = stripTags(firstCell(source, 'title'));
  const summary = decodeEntities(
    (/(?:name="description"|property="og:description")\s+content="([^"]*)"/i.exec(source) || [])[1] || '',
  ).trim();

  const blocks = parseLdJson(source);
  const faq = collectFaq(blocks);

  const tables = [];
  const tableRegex = /<table[\s\S]*?<\/table>/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(source)) !== null) {
    const tableHtml = tableMatch[0];
    if (!/>Model</i.test(tableHtml) || !/>Fits</i.test(tableHtml)) continue;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let rowMatch;
    const models = [];
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) cells.push(cellMatch[1]);
      const parsed = parseRow(cells);
      if (parsed) models.push(parsed);
    }
    if (models.length === 0) continue;

    const videoVotes = models.filter((m) => m.category === 'video').length;
    const imageVotes = models.filter((m) => m.category === 'image').length;
    let tableCategory = 'other';
    if (videoVotes > imageVotes) tableCategory = 'video';
    else if (imageVotes > videoVotes) tableCategory = 'image';

    for (const model of models) {
      if (model.category === 'other') model.category = tableCategory;
    }
    tables.push(models);
  }

  const seen = new Set();
  const models = [];
  for (const table of tables) {
    for (const model of table) {
      const key = `${model.category}:${model.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      models.push(model);
    }
  }

  const vramMatch = /(\d+)\s*GB/i.exec(`${title} ${summary}`);
  const bestMatch = /best local (?:llm|model)[^.]*? is (.+?)\s*\(/i.exec(summary);

  return {
    gpuTitle: title,
    summary,
    bestModel: bestMatch ? bestMatch[1].trim() : '',
    vramGb: vramMatch ? Number(vramMatch[1]) : null,
    models,
    categories: {
      video: models.filter((m) => m.category === 'video'),
      image: models.filter((m) => m.category === 'image'),
      other: models.filter((m) => m.category === 'other'),
    },
    faq,
    sourceUrl,
  };
}

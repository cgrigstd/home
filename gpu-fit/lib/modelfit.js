import { decodeEntities, stripTags } from './text.js';

function normalizeFit(label, detail, className = '') {
  const text = `${label} ${detail} ${className}`.toLowerCase();
  if (/exceed|no cabe|too large|won't fit|does not fit/.test(text)) return 'exceeds';
  if (/offload|partial|slow|system ram|swap|cpu\b/.test(text)) return 'offload';
  if (/\bgood\b|\bwarn\b|\bbad\b/.test(className)) {
    if (/\bwarn\b/.test(className)) return 'offload';
    if (/\bbad\b/.test(className)) return 'exceeds';
  }
  if (/runs|fits|fit\b|good/.test(text)) return 'runs';
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

function tableHeadText(tableHtml) {
  return stripTags(firstCell(tableHtml, 'thead')).replace(/\s+/g, ' ').trim().toLowerCase();
}

function tableKind(tableHtml) {
  const head = tableHeadText(tableHtml);
  if (!head) return '';
  if (/model size/.test(head) && /est\. speed|fit on/.test(head)) return 'llm-size';
  if (/\bmodel\b/.test(head) && /\bparams\b/.test(head) && /\bquant\b/.test(head) && /tok\/s/.test(head)) {
    return 'llm-table';
  }
  if (/\bmodel\b/.test(head) && /\bfits\b/.test(head) && /\bapp\b/.test(head)) return 'media';
  return '';
}

function parseFitCell(cell) {
  const spanMatch = /<span[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/span>/i.exec(cell);
  const className = spanMatch ? spanMatch[1] : '';
  const label = stripTags(spanMatch ? spanMatch[2] : firstCell(cell, 'span') || cell);
  return { label, className };
}

function absoluteUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://modelfit.io${url.startsWith('/') ? '' : '/'}${url}`;
}

function parseMediaRow(cells) {
  if (cells.length < 4) return null;
  const [modelCell, fitCell, qualityCell, appCell] = cells;

  const linkMatch = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(modelCell);
  const name = stripTags(linkMatch ? linkMatch[2] : modelCell);
  if (!name || /^model$/i.test(name)) return null;

  const license = stripTags(firstCell(modelCell, 'small'));
  const { label: fitLabel, className: fitClass } = parseFitCell(fitCell);
  const fitDetail = stripTags(firstCell(fitCell, 'small'));
  const quality = stripTags(qualityCell);
  const app = stripTags(appCell);

  let fullQuality = quality;
  if (!fullQuality) {
    const download = /Complete:\s*([^<]*?\d+(?:\.\d+)?\s*GB download)/i.exec(stripTags(fitCell));
    if (download) fullQuality = download[1];
  }

  const url = linkMatch ? decodeEntities(linkMatch[1]) : '';
  const path = url.toLowerCase();
  let category = 'other';
  if (/\/video\//.test(path) || /text to video/i.test(quality)) category = 'video';
  else if (/\/image\//.test(path) || /text to image/i.test(quality)) category = 'image';

  return {
    name,
    license,
    fit: normalizeFit(fitLabel, fitDetail, fitClass),
    fitLabel,
    fitDetail,
    quality: fullQuality,
    app,
    category,
    url,
    pageUrl: absoluteUrl(url),
    speed: null,
  };
}

function parseLlmSizeRow(cells) {
  if (cells.length < 3) return null;
  const name = stripTags(cells[0]);
  if (!name || /^model size$/i.test(name)) return null;

  const speedText = stripTags(cells[1]);
  const speedMatch = /([\d.]+)\s*tok\/s/i.exec(speedText);
  const errorMatch = /typical error\s*([\d.]+%)/i.exec(speedText);
  const { label: fitLabel, className: fitClass } = parseFitCell(cells[2]);

  return {
    name,
    license: '',
    fit: normalizeFit(fitLabel, speedText, fitClass),
    fitLabel,
    fitDetail: [speedMatch ? `est. ${speedMatch[1]} tok/s` : '', errorMatch ? `typical error ${errorMatch[1]}` : '']
      .filter(Boolean)
      .join(' · '),
    quality: '',
    app: '',
    category: 'llm',
    url: '',
    pageUrl: '',
    speed: speedMatch ? Number(speedMatch[1]) : null,
    params: '',
    quant: '',
    memoryGb: null,
  };
}

function parseLlmTableRow(cells) {
  if (cells.length < 9) return null;
  const [, modelCell, paramsCell, quantCell, memCell, fitCell, qualityCell, speedCell, runCell] = cells;

  const nameMatch =
    /<button[^>]*>([\s\S]*?)<\/button>/i.exec(modelCell) || /<a[^>]*>([\s\S]*?)<\/a>/i.exec(modelCell);
  const name = stripTags(nameMatch ? nameMatch[1] : modelCell.split(/<small/i)[0]);
  if (!name || /^model$/i.test(name)) return null;

  const params = stripTags(paramsCell).replace(/\s+/g, ' ');
  const quant = stripTags(quantCell).replace(/\s+/g, ' ').trim();
  const memText = stripTags(memCell).replace(/\s+/g, ' ').trim();
  const memMatch = /([\d.]+)\s*GB/i.exec(memText);
  const { label: fitLabel, className: fitClass } = parseFitCell(fitCell);
  const quality = stripTags(qualityCell).replace(/\s+/g, ' ').trim();
  const speedText = stripTags(speedCell);
  const speedMatch = /([\d.]+)/.exec(speedText);
  const runMatch = /title="(ollama run [^"]+)"/i.exec(runCell);

  return {
    name,
    license: '',
    fit: normalizeFit(fitLabel, quality, fitClass),
    fitLabel,
    fitDetail: speedMatch ? `est. ${speedMatch[1]} tok/s` : '',
    quality,
    app: runMatch ? 'Ollama' : '',
    category: 'llm',
    url: '',
    pageUrl: '',
    speed: speedMatch ? Number(speedMatch[1]) : null,
    params,
    quant,
    memoryGb: memMatch ? Number(memMatch[1]) : null,
    run: runMatch ? runMatch[1] : '',
  };
}

function parseTableRows(tableHtml, kind) {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const models = [];
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) cells.push(cellMatch[1]);
    if (cells.length === 0) continue;

    let parsed = null;
    if (kind === 'media') parsed = parseMediaRow(cells);
    else if (kind === 'llm-size') parsed = parseLlmSizeRow(cells);
    else if (kind === 'llm-table') parsed = parseLlmTableRow(cells);
    if (parsed) models.push(parsed);
  }
  return models;
}

function tableCategory(models) {
  const videoVotes = models.filter((m) => m.category === 'video').length;
  const imageVotes = models.filter((m) => m.category === 'image').length;
  if (videoVotes > imageVotes) return 'video';
  if (imageVotes > videoVotes) return 'image';
  return 'other';
}

export function parseModelfitGpu(html, sourceUrl = '') {
  const source = String(html || '');
  const title = stripTags(firstCell(source, 'title'));
  const summary = decodeEntities(
    (/(?:name="description"|property="og:description")\s+content="([^"]*)"/i.exec(source) || [])[1] || '',
  ).trim();

  const blocks = parseLdJson(source);
  const faq = collectFaq(blocks);

  const models = [];
  const tableRegex = /<table[\s\S]*?<\/table>/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(source)) !== null) {
    const tableHtml = tableMatch[0];
    const kind = tableKind(tableHtml);
    if (!kind) continue;

    const rows = parseTableRows(tableHtml, kind);
    if (rows.length === 0) continue;

    if (kind === 'media') {
      const category = tableCategory(rows);
      for (const model of rows) {
        if (model.category === 'other') model.category = category;
      }
    }
    models.push(...rows);
  }

  const seen = new Set();
  const unique = [];
  for (const model of models) {
    const key = `${model.category}:${model.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(model);
  }

  const vramMatch = /(\d+)\s*GB/i.exec(`${title} ${summary}`);
  const bestMatch = /best local (?:llm|model)[^.]*? is (.+?)\s*\(/i.exec(summary);

  return {
    gpuTitle: title,
    summary,
    bestModel: bestMatch ? bestMatch[1].trim() : '',
    vramGb: vramMatch ? Number(vramMatch[1]) : null,
    models: unique,
    categories: {
      llm: unique.filter((m) => m.category === 'llm'),
      video: unique.filter((m) => m.category === 'video'),
      image: unique.filter((m) => m.category === 'image'),
      other: unique.filter((m) => m.category === 'other'),
    },
    faq,
    sourceUrl,
  };
}

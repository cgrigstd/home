import { parseLlmsNodes, parseGpuCatalog, parseModelsIsland } from './lib/vramdb.js';
import { parseModelfitGpu } from './lib/modelfit.js';
import { parseModelfitGpuCatalog } from './lib/modelfit-catalog.js';
import { classifyFit, FIT_LABELS, estimateModelVram } from './lib/estimate.js';
import { FALLBACK_GPUS, mergeGpuCatalog, modelfitPathFor } from './lib/gpus.js';
import {
  buildRecommendationDownload,
  downloadForVramdbModel,
  resolvePrimaryHfRepo,
  extractComponentLinks,
} from './lib/downloads.js';

const el = (id) => document.getElementById(id);

const state = {
  gpus: [],
  fitLabels: FIT_LABELS,
  lastSearch: null,
  recommendationsIndex: null,
};

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

const FIT_CLASS = {
  fits: 'badge-fits',
  tight: 'badge-tight',
  offload: 'badge-offload',
  exceeds: 'badge-exceeds',
  unknown: 'badge-unknown',
  runs: 'badge-runs',
};

const REC_LABELS = {
  runs: 'Corre',
  offload: 'Con offload',
  exceeds: 'No cabe',
  unknown: 'Sin confirmar',
};

const DOWNLOAD_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';

function badge(fit, label) {
  const cls = FIT_CLASS[fit] || 'badge-unknown';
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function fmtGb(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(value < 10 ? 2 : 1)} GB`;
}

function breakdown(estimate) {
  if (!estimate) return '';
  const parts = [`pesos ${fmtGb(estimate.weightsGb)}`];
  if (estimate.activationGb) parts.push(`act. ${fmtGb(estimate.activationGb)}`);
  if (estimate.kvGb) parts.push(`KV ${fmtGb(estimate.kvGb)}`);
  if (estimate.overheadGb) parts.push(`overhead ${fmtGb(estimate.overheadGb)}`);
  return parts.join(' + ');
}

function setStatus(message, isError = false) {
  const status = el('status');
  status.textContent = message || '';
  status.classList.toggle('error', isError);
}

function setLoading(loading) {
  const button = el('submit-btn');
  button.disabled = loading;
  button.textContent = loading ? 'Analizando…' : 'Analizar';
}

function renderGpuSelect() {
  const select = el('gpu');
  const brands = [...new Set(state.gpus.map((gpu) => gpu.brand || 'Otros'))];
  const options = ['<option value="">GPU personalizada / solo VRAM</option>'];

  for (const brand of brands) {
    options.push(`<optgroup label="${esc(brand)}">`);
    const gpus = state.gpus
      .filter((gpu) => (gpu.brand || 'Otros') === brand)
      .sort((a, b) => b.vramGb - a.vramGb || a.name.localeCompare(b.name));
    for (const gpu of gpus) {
      options.push(
        `<option value="${esc(gpu.slug)}" data-vram="${gpu.vramGb}">${esc(gpu.name)} · ${gpu.vramGb} GB</option>`,
      );
    }
    options.push('</optgroup>');
  }
  select.innerHTML = options.join('');
}

function renderPresets() {
  const presets = [
    { label: 'RTX 3060 · 12 GB', gpu: 'rtx-3060' },
    { label: 'RTX 4090 · 24 GB', gpu: 'rtx-4090' },
    { label: 'RX 9070 XT · 16 GB', gpu: 'rx-9070-xt' },
    { label: 'MacBook Pro M5 · 32 GB', gpu: 'apple-macbook-pro-m5' },
    { label: '8 GB', vram: 8 },
    { label: '16 GB', vram: 16 },
    { label: '24 GB', vram: 24 },
  ];
  el('presets').innerHTML = presets
    .map(
      (preset, index) =>
        `<button type="button" class="preset" data-index="${index}">${esc(preset.label)}</button>`,
    )
    .join('');
  el('presets').querySelectorAll('.preset').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = presets[Number(button.dataset.index)];
      if (preset.gpu) {
        el('gpu').value = preset.gpu;
        syncVramFromGpu();
      }
      if (preset.vram) {
        el('gpu').value = '';
        el('vram').value = preset.vram;
      }
      el('search-form').requestSubmit();
    });
  });
}

function syncVramFromGpu() {
  const option = el('gpu').selectedOptions[0];
  if (option?.dataset?.vram) el('vram').value = option.dataset.vram;
}

function renderProfile(data) {
  const profile = el('profile');
  const { profile: gpu, stats, query } = data;
  profile.classList.remove('hidden');
  profile.innerHTML = `
    <div class="profile-top">
      <h2>${esc(gpu.name)}</h2>
      <span class="vram-pill">${esc(gpu.vramGb)} GB VRAM</span>
      ${query.q ? `<span class="vram-pill">Filtro: ${esc(query.q)}</span>` : ''}
    </div>
    ${gpu.optimal ? `<p>Usos típicos según vramdb: ${esc(gpu.optimal)}.</p>` : ''}
    <div class="profile-stats">
      <div class="stat"><span class="stat-value">${stats.recommendedTotal}</span><span class="stat-label">modelos recomendados</span></div>
      <div class="stat"><span class="stat-value">${stats.modelsTotal}</span><span class="stat-label">modelos con estimación</span></div>
      <div class="stat"><span class="stat-value">${stats.nodesTotal}</span><span class="stat-label">nodos compatibles</span></div>
      <div class="stat"><span class="stat-value">${esc(query.context || 4096)}</span><span class="stat-label">contexto LLM (tokens)</span></div>
      <div class="stat"><span class="stat-value">${esc(query.resolution || 1024)} px</span><span class="stat-label">resolución difusión</span></div>
    </div>
  `;
}

async function loadJson(path) {
  const res = await fetch(`./data/${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadLocalCache(nombre) {
  try {
    const res = await fetch(`./data/cache/${nombre}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch {
    return '';
  }
}

async function loadCache(nombre, liveUrl = '') {
  const local = await loadLocalCache(nombre);
  if (local) return local;
  try {
    let url = liveUrl;
    if (!url) {
      url = `https://vramdb.com/${nombre}`;
      const modelfitMatch = nombre.match(/^modelfit-(.+)\.html$/);
      if (modelfitMatch) {
        url = `https://modelfit.io/gpu/${modelfitMatch[1].replace(/^gpu-/, '')}/`;
      }
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`red ${r.status}`);
    return await r.text();
  } catch {
    return '';
  }
}

function cacheNameForPath(path) {
  const clean = String(path || '').replace(/^\/+|\/+$/g, '');
  if (clean.startsWith('gpu/')) return `modelfit-${clean.slice(4)}.html`;
  return `modelfit-${clean.replace(/\//g, '-')}.html`;
}

async function loadCatalog() {
  let catalog = null;
  try {
    catalog = await loadJson('catalog.json');
  } catch {
    catalog = null;
  }

  const base = Array.isArray(catalog?.gpus) && catalog.gpus.length > 0 ? catalog.gpus : FALLBACK_GPUS;
  const [gpusHtml, modelfitHtml] = await Promise.all([
    loadLocalCache('vramdb-gpus.html'),
    loadLocalCache('modelfit-gpus.html'),
  ]);

  return mergeGpuCatalog(base, parseGpuCatalog(gpusHtml), parseModelfitGpuCatalog(modelfitHtml));
}

function downloadButton(download) {
  if (!download || download.free === false || (!download.url && !download.page)) return '';
  const source = download.source ? ` title="Descargar desde ${esc(download.source)}"` : '';
  if (download.url) {
    return `<a class="btn-download" href="${esc(download.url)}" target="_blank" rel="noopener"${source}>${DOWNLOAD_ICON}<span>Descargar</span></a>`;
  }
  return `<a class="btn-download resolving" href="${esc(download.page)}" target="_blank" rel="noopener" data-download-page="${esc(download.resolvePath)}"${source}>${DOWNLOAD_ICON}<span>Descargar</span></a>`;
}

function recommendationCard(model) {
  const pageUrl = model.pageUrl || model.url;
  const title = pageUrl
    ? `<a href="${esc(pageUrl)}" target="_blank" rel="noopener">${esc(model.name)}</a>`
    : esc(model.name);
  return `
    <article class="model-card">
      <div class="model-card-top">
        <h3>${title}</h3>
        ${badge(model.fit, REC_LABELS[model.fit] || model.fit)}
      </div>
      ${model.fitDetail ? `<div class="model-detail">${esc(model.fitDetail)}</div>` : ''}
      ${
        model.params || model.quant || model.memoryGb
          ? `<div class="model-license">${[model.params, model.quant, model.memoryGb ? `${model.memoryGb} GB` : '']
              .filter(Boolean)
              .map(esc)
              .join(' · ')}</div>`
          : ''
      }
      ${model.license ? `<div class="model-license">${esc(model.license)}</div>` : ''}
      ${model.quality ? `<div class="model-license">${esc(model.quality)}</div>` : ''}
      ${model.app ? `<div class="model-apps">App: ${esc(model.app)}</div>` : ''}
      <div class="model-card-actions">${downloadButton(model.download)}</div>
    </article>
  `;
}

async function resolveDownloadButtons(root = document) {
  const buttons = [...root.querySelectorAll('[data-download-page]')];
  if (buttons.length === 0) return;
  for (const button of buttons) {
    const page = button.dataset.downloadPage;
    const slug = page.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    try {
      const html = await loadCache(`modelfit-model-${slug}.html`, page);
      const found = resolvePrimaryHfRepo(html, page);
      if (found?.url) {
        button.href = found.url;
        button.title = `Descargar desde Hugging Face (${found.repo})`;
        button.classList.remove('resolving');
        delete button.dataset.downloadPage;
      } else {
        button.classList.remove('resolving');
        button.title = 'Abrir página del modelo en modelfit.io';
      }

      const card = button.closest('.model-card');
      const components = extractComponentLinks(html);
      if (card && components.length > 0) {
        const actions = card.querySelector('.model-card-actions');
        if (actions && !card.querySelector('.model-files')) {
          const files = document.createElement('div');
          files.className = 'model-files';
          files.innerHTML =
            '<span class="model-files-label">Archivos / dependencias:</span> ' +
            components
              .map(
                (c) =>
                  `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="model-file-link">${esc(c.label)}</a>`,
              )
              .join(' · ') +
            ' <span class="model-files-note">(algunos repos requieren aceptar la licencia en Hugging Face)</span>';
          actions.insertAdjacentElement('afterend', files);
        }
      }
    } catch {
      button.classList.remove('resolving');
    }
  }
}

function renderRecommendations(data) {
  const section = el('recommendations');
  const body = el('recommendations-body');
  const rec = data.recommendations;

  if (!rec.available) {
    section.classList.remove('hidden');
    body.innerHTML = `<div class="empty">No hay recomendaciones de modelfit.io para esta GPU. Usa los resultados de vramdb o introduce otra GPU.</div>`;
    return;
  }

  if (rec.error) {
    section.classList.remove('hidden');
    body.innerHTML = `<div class="empty">No se pudieron cargar las recomendaciones: ${esc(rec.error)}</div>`;
    return;
  }

  const models = rec.models || [];
  if (models.length === 0) {
    section.classList.remove('hidden');
    body.innerHTML = `<div class="empty">No hay modelos que coincidan con el filtro en modelfit.io.</div>`;
    return;
  }

  section.classList.remove('hidden');
  const groups = [
    { key: 'llm', title: 'LLM' },
    { key: 'video', title: 'Video' },
    { key: 'image', title: 'Imagen' },
    { key: 'other', title: 'Otros' },
  ];

  const parts = [];
  if (rec.meta?.summary) {
    parts.push(`<div class="summary-note">${esc(rec.meta.summary)}</div>`);
  }
  for (const group of groups) {
    const items = models.filter((model) => model.category === group.key);
    if (items.length === 0) continue;
    parts.push(`<div class="subhead">${group.title} · ${items.length}</div>`);
    parts.push(`<div class="card-grid">${items.map(recommendationCard).join('')}</div>`);
  }
  body.innerHTML = parts.join('');
  resolveDownloadButtons(body);
}

function renderModels(data) {
  const section = el('models');
  const body = el('models-body');
  const models = data.models || [];

  section.classList.remove('hidden');
  if (models.length === 0) {
    body.innerHTML = `<div class="empty">No hay modelos que coincidan con el filtro.</div>`;
    return;
  }

  const rows = models
    .map((model) => {
      const best = model.best;
      const quants = model.quants
        .map(
          (quant) =>
            `<span class="quant ${best && quant.key === best.key ? 'best' : ''}">${esc(quant.key)} · ${fmtGb(quant.totalGb)}</span>`,
        )
        .join('');
       return `
        <tr>
          <td data-label="Modelo">
            <strong>${esc(model.name)}</strong>
            ${model.creator ? `<div class="model-license">${esc(model.creator)}</div>` : ''}
          </td>
          <td data-label="Tipo">${esc(model.type)}</td>
          <td data-label="Parámetros" class="mono">${esc(model.parametersB ?? '—')} B</td>
          <td data-label="Estado">${best ? badge(best.fit, state.fitLabels[best.fit] || best.fit) : badge('unknown', 'Sin datos')}</td>
          <td data-label="VRAM" class="mono">${best ? fmtGb(best.totalGb) : '—'}${best ? `<div class="model-license">${esc(breakdown(best))}</div>` : ''}</td>
          <td data-label="Quants"><div class="quant-row">${quants}</div></td>
          <td data-label="Descarga" class="download-col">${downloadButton(model.download) || '<span class="model-license">—</span>'}</td>
        </tr>
      `;
    })
    .join('');

  body.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Modelo</th>
          <th>Tipo</th>
          <th>Parámetros</th>
          <th>Estado (mejor quant)</th>
          <th>VRAM estimada</th>
          <th>Quants</th>
          <th>Descarga</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderNodes(data) {
  const section = el('nodes');
  const body = el('nodes-body');
  const nodes = data.nodes || [];

  section.classList.remove('hidden');
  if (nodes.length === 0) {
    body.innerHTML = `<div class="empty">No se encontraron nodos que coincidan y quepan en esta VRAM.</div>`;
    return;
  }

  const items = nodes
    .map(
      (node) => `
        <div class="node-item">
          <div class="node-meta">
            <a href="${esc(node.url)}" target="_blank" rel="noopener">${esc(node.name)}</a>
            ${node.author ? `<span class="node-author">${esc(node.author)}</span>` : ''}
          </div>
          <span class="node-vram">${node.baseVramMb} MB</span>
        </div>
      `,
    )
    .join('');

  body.innerHTML = `<div class="node-list">${items}</div>`;
}

function renderEmpty() {
  for (const id of ['profile', 'recommendations', 'models', 'nodes']) {
    el(id).classList.add('hidden');
  }
  el('tabs')?.classList.add('hidden');
}

function activateTab(name) {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== name);
    panel.classList.toggle('active', panel.id === name);
  });
}

function setupTabs() {
  const tabs = el('tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
}

async function runSearch(event) {
  event?.preventDefault();
  const gpuSlug = el('gpu').value;
  const vram = el('vram').value;
  const q = el('q').value.trim();
  const context = el('context').value;
  const resolution = el('resolution').value;

  setLoading(true);
  setStatus('Cargando datos…');

  try {
    const [llmsText, modelsHtml, recommendationsIndex] = await Promise.all([
      loadCache('vramdb-llms.txt'),
      loadCache('vramdb-models.html'),
      state.recommendationsIndex
        ? Promise.resolve(state.recommendationsIndex)
        : loadJson('recommendations.json').catch(() => null),
    ]);
    if (recommendationsIndex) state.recommendationsIndex = recommendationsIndex;

    const nodes = parseLlmsNodes(llmsText);
    const models = parseModelsIsland(modelsHtml);
    const gpus = state.gpus.length > 0 ? state.gpus : await loadCatalog();

    const gpu = gpus.find((item) => item.slug === gpuSlug) || null;

    let vramGb = Number(vram);
    if (!Number.isFinite(vramGb) || vramGb <= 0) vramGb = gpu?.vramGb || 12;

    let needle = q.toLowerCase();
    if (needle && (!gpu || gpu.slug === 'custom')) {
      if (new RegExp(`^\\s*${vramGb}\\s*gb\\s*$`, 'i').test(needle) || needle === `${vramGb}gb`) needle = '';
    }
    if (gpu && needle) {
      const gpuNeedle = `${gpu.name} ${gpu.slug} ${gpu.vramGb}gb ${gpu.vramGb} gb`.toLowerCase();
      if (gpuNeedle.includes(needle) || needle.split(/\s+/).every((token) => gpuNeedle.includes(token))) {
        needle = '';
      }
    }

    const nodeResults = nodes
      .filter((node) => {
        if (!needle) return true;
        return `${node.name} ${node.author} ${node.repo}`.toLowerCase().includes(needle);
      })
      .filter((node) => node.baseVramMb <= vramGb * 1024)
      .sort((a, b) => b.baseVramMb - a.baseVramMb || a.name.localeCompare(b.name))
      .slice(0, 150)
      .map((node) => ({
        ...node,
        requiredGb: Number((node.baseVramMb / 1024).toFixed(2)),
        fit: classifyFit(node.baseVramMb / 1024, vramGb),
      }));

    const modelResults = models
      .filter((model) => {
        if (!needle) return true;
        return `${model.name} ${model.creator || ''}`.toLowerCase().includes(needle);
      })
      .map((model) => {
        const quants = Object.entries(model.quants || {})
          .map(([key, quant]) => {
            const estimate = estimateModelVram(model, key, {
              contextTokens: Number(context) || 4096,
              resolution: Number(resolution) || 1024,
            });
            if (!estimate) return null;
            return {
              key,
              label: quant.label || key,
              bits: quant.bits,
              ...estimate,
              fit: classifyFit(estimate.totalGb, vramGb),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.totalGb - b.totalGb);

        const bestQuant = quants[0] || null;
        return {
          id: model.id,
          name: model.name,
          creator: model.creator || '',
          type: model.type || 'model',
          parametersB: model.parameters_b,
          quants,
          best: bestQuant,
          fit: bestQuant ? bestQuant.fit : 'unknown',
          download: downloadForVramdbModel(model),
        };
      })
      .sort((a, b) => {
        if (!a.best || !b.best) return 0;
        return a.best.totalGb - b.best.totalGb;
      })
      .slice(0, 60);

    let recommendedModels = [];
    let recommendationMeta = null;
    let recommendationError = null;

    const modelfitPath = modelfitPathFor(gpu);
    if (modelfitPath) {
      try {
        const liveUrl = `https://modelfit.io${modelfitPath}`;
        let recommendations = recommendationsIndex?.byPath?.[modelfitPath] || null;
        if (!recommendations) {
          const recHtml = await loadCache(cacheNameForPath(modelfitPath), liveUrl);
          recommendations = parseModelfitGpu(recHtml, liveUrl);
        }
        recommendationMeta = {
          gpuTitle: recommendations.gpuTitle,
          summary: recommendations.summary,
          bestModel: recommendations.bestModel,
          vramGb: recommendations.vramGb,
          faq: (recommendations.faq || []).slice(0, 6),
          sourceUrl: recommendations.sourceUrl || liveUrl,
        };
        recommendedModels = (recommendations.models || [])
          .filter((model) => !needle || model.name.toLowerCase().includes(needle))
          .map((model) => ({ ...model, download: buildRecommendationDownload(model) }));
      } catch (error) {
        recommendationError = String(error?.message || error);
      }
    }

    const data = {
      query: { q, gpuSlug, vramGb, context: Number(context) || 4096, resolution: Number(resolution) || 1024 },
      profile:
        gpu || {
          slug: 'custom',
          name: `GPU personalizada (${vramGb} GB)`,
          vramGb,
          brand: 'Otros',
          modelfitPath: null,
        },
      recommendations: {
        models: recommendedModels,
        meta: recommendationMeta,
        error: recommendationError,
        available: Boolean(modelfitPath),
      },
      models: modelResults,
      nodes: nodeResults,
      stats: {
        nodesTotal: nodes.length,
        modelsTotal: models.length,
        recommendedTotal: recommendedModels.length,
      },
      fitLabels: FIT_LABELS,
      sources: [
        { name: 'vramdb.com', url: 'https://vramdb.com/' },
        { name: 'modelfit.io', url: 'https://modelfit.io/' },
      ],
      generatedAt: new Date().toISOString(),
    };

    state.fitLabels = data.fitLabels;
    state.lastSearch = data;
    state.gpus = gpus;

    renderEmpty();
    renderProfile(data);
    renderRecommendations(data);
    renderModels(data);
    renderNodes(data);
    el('tabs')?.classList.remove('hidden');
    activateTab('recommendations');

    const total = data.recommendations.models.length + data.models.length + data.nodes.length;
    setStatus(
      total > 0
        ? `${total} resultados para ${data.profile.name} (${data.profile.vramGb} GB).`
        : 'Sin resultados para ese filtro.',
    );
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  } finally {
    setLoading(false);
  }
}

async function loadBootstrap(autoSearch = false) {
  try {
    const [gpus, recommendationsIndex] = await Promise.all([
      loadCatalog(),
      loadJson('recommendations.json').catch(() => null),
    ]);
    state.gpus = gpus;
    state.recommendationsIndex = recommendationsIndex;
    state.fitLabels = FIT_LABELS;
    renderGpuSelect();
    renderPresets();
    setupTabs();

    const preferred = state.gpus.find((gpu) => gpu.slug === 'rtx-3060');
    if (preferred) {
      el('gpu').value = preferred.slug;
      el('vram').value = preferred.vramGb;
    }
    setStatus(`${state.gpus.length} GPUs disponibles. Elige una y pulsa Analizar.`);
    if (autoSearch) await runSearch();
  } catch (error) {
    setStatus(`No se pudo iniciar la herramienta: ${error.message}`, true);
  }
}

el('search-form').addEventListener('submit', runSearch);
el('gpu').addEventListener('change', syncVramFromGpu);

el('refresh-btn').addEventListener('click', async () => {
  const button = el('refresh-btn');
  button.disabled = true;
  button.textContent = 'Refrescando…';
  try {
    await loadBootstrap(false);
    if (state.lastSearch) await runSearch();
    setStatus('Datos actualizados.');
  } catch (error) {
    setStatus(`No se pudo refrescar: ${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Refrescar datos';
  }
});

loadBootstrap(true);

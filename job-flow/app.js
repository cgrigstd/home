const JOBS_URL = "https://raw.githubusercontent.com/cgrigstd/job-flow/main/jobs.json";
const ITEMS_PER_PAGE = 20;
const STORAGE_KEY = "jobflow_state";

let allJobs = [];
let specialtiesMeta = [];
const labelMap = {};
let activeSpecialties = new Set();
let activeRegions = new Set();
let currentPage = 1;
let currentSearch = "";

const REGION_CONFIG = {
  latin_america: { label: "Latin America", icon: "🌎" },
  remote: { label: "Remote", icon: "🌐" },
  us_canada_europe: { label: "US / Canada / Europe", icon: "🇺🇸" },
  other: { label: "Other", icon: "📍" },
};

const CATEGORY_MAP = {
  developer: "dev",
  game_dev: "dev",
  cad_designer: "des",
  production: "prod",
  writer: "prod",
  audio_composer: "prod",
  video_production: "prod",
};

function catFor(slug) {
  return CATEGORY_MAP[slug] || "art";
}



function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeSpecialties: Array.from(activeSpecialties),
      activeRegions: Array.from(activeRegions),
      search: currentSearch,
      page: currentPage,
    }));
  } catch (e) {}
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (Array.isArray(state.activeSpecialties)) {
      state.activeSpecialties.forEach(s => activeSpecialties.add(s));
    }
    if (Array.isArray(state.activeRegions)) {
      state.activeRegions.forEach(r => activeRegions.add(r));
    }
    if (state.search) {
      currentSearch = state.search;
      document.getElementById("search-input").value = state.search;
    }
    if (typeof state.page === "number" && state.page > 0) {
      currentPage = state.page;
    }
  } catch (e) {}
}

function applyFilterUI() {
  document.querySelectorAll(".filter-chip").forEach(btn => {
    const spec = btn.dataset.specialty;
    const region = btn.dataset.region;
    if (spec) {
      btn.classList.toggle("active", activeSpecialties.has(spec));
    } else if (region) {
      btn.classList.toggle("active", activeRegions.has(region));
    }
  });
  updateActiveStrip();
  updateFilterGauge();
}

function getFilteredJobs() {
  let filtered = allJobs.filter(job => {
    if (activeSpecialties.size > 0) {
      const jobSpecs = job.specialties || [];
      if (jobSpecs.length === 0) {
        if (!activeSpecialties.has("other")) return false;
      } else {
        if (!jobSpecs.some(s => activeSpecialties.has(s))) return false;
      }
    }
    if (activeRegions.size > 0) {
      const jobRegion = job.region || "";
      if (!activeRegions.has(jobRegion)) return false;
    }
    if (currentSearch) {
      const content = (
        (job.title || "") + " " +
        (job.description || "") + " " +
        (job.country || "") + " " +
        (job.region || "")
      ).toLowerCase();
      if (!content.includes(currentSearch)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
  return filtered;
}

function safeUrl(url) {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "#";
  } catch {
    return "#";
  }
}

function renderPage() {
  const filtered = getFilteredJobs();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageJobs = filtered.slice(start, start + ITEMS_PER_PAGE);

  const container = document.getElementById("jobs");
  container.innerHTML = "";

  if (pageJobs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = '<div class="icon">∅</div><div class="msg">No jobs match your filters</div>';
    container.appendChild(empty);
  }

  pageJobs.forEach((job, i) => {
    const card = document.createElement("a");
    card.className = "job-card";
    card.style.setProperty("--i", i);
    card.href = safeUrl(job.url);
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const jobSpecs = job.specialties || [];
    const primaryCat = jobSpecs.length > 0 ? catFor(jobSpecs[0]) : "other";
    card.dataset.cat = primaryCat;

    const titleRow = document.createElement("div");
    titleRow.className = "job-title-row";

    const dot = document.createElement("span");
    dot.className = "job-dot " + primaryCat;
    titleRow.appendChild(dot);

    const titleDiv = document.createElement("div");
    titleDiv.className = "job-title";
    titleDiv.textContent = job.title || "No title";
    titleRow.appendChild(titleDiv);
    card.appendChild(titleRow);

    if (jobSpecs.length > 0) {
      const tagsDiv = document.createElement("div");
      tagsDiv.className = "job-tags";
      jobSpecs.forEach(slug => {
        const tag = document.createElement("span");
        const tagCat = catFor(slug);
        const catClass = tagCat === "dev" ? "dev-tag" : tagCat === "art" ? "art-tag" : "";
        tag.className = "job-tag" + (catClass ? " " + catClass : "");
        tag.textContent = labelMap[slug] || slug;
        tagsDiv.appendChild(tag);
      });
      card.appendChild(tagsDiv);
    }

    const metaDiv = document.createElement("div");
    metaDiv.className = "job-meta";
    const parts = [];
    if (job.source) {
      const srcSpan = document.createElement("span");
      srcSpan.className = "job-source";
      srcSpan.textContent = job.source;
      metaDiv.appendChild(srcSpan);
    }
    if (job.region) {
      const cfg = REGION_CONFIG[job.region];
      const regionSpan = document.createElement("span");
      regionSpan.className = "job-region";
      regionSpan.textContent = cfg ? `${cfg.icon} ${cfg.label}` : job.region;
      metaDiv.appendChild(regionSpan);
    }
    if (metaDiv.children.length === 0) {
      metaDiv.textContent = [job.source, job.country].filter(Boolean).join(" · ");
    }
    card.appendChild(metaDiv);

    container.appendChild(card);
  });

  document.getElementById("page-info").textContent = `${currentPage} / ${totalPages}`;
  document.getElementById("prev-page").disabled = currentPage <= 1;
  document.getElementById("next-page").disabled = currentPage >= totalPages;
  document.getElementById("pagination-meta").textContent =
    filtered.length > 0
      ? `${start + 1}–${Math.min(start + ITEMS_PER_PAGE, filtered.length)} of ${filtered.length}`
      : "0 jobs";
  saveState();
}

function setupPagination() {
  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderPage(); }
  });
  document.getElementById("next-page").addEventListener("click", () => {
    const total = Math.max(1, Math.ceil(getFilteredJobs().length / ITEMS_PER_PAGE));
    if (currentPage < total) { currentPage++; renderPage(); }
  });
}

function animateValue(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateStyle(el, prop, from, to, duration, unit) {
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    el.style[prop] = (from + (to - from) * eased) + (unit || "");
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateInsights() {
  const total = allJobs.length;

  animateValue(document.getElementById("total-jobs"), 0, total, 1725);
  animateValue(document.getElementById("gauge-total-label"), 0, total, 1725);

  let dev = 0, art = 0, des = 0;
  allJobs.forEach(job => {
    const specs = job.specialties || [];
    if (specs.length === 0) { art++; return; }
    const c = catFor(specs[0]);
    if (c === "dev") dev++;
    else if (c === "des") des++;
    else art++;
  });

  animateValue(document.getElementById("cat-dev-count"), 0, dev, 1725);
  animateValue(document.getElementById("cat-art-count"), 0, art, 1725);
  animateValue(document.getElementById("cat-des-count"), 0, des, 1725);

  let remote = 0, latam = 0, useu = 0;
  allJobs.forEach(job => {
    const r = job.region || "";
    if (r === "remote") remote++;
    else if (r === "latin_america") latam++;
    else if (r === "us_canada_europe") useu++;
  });

  animateValue(document.getElementById("region-remote-count"), 0, remote, 1725);
  animateValue(document.getElementById("region-latam-count"), 0, latam, 1725);
  animateValue(document.getElementById("region-useu-count"), 0, useu, 1725);

  const maxCat = Math.max(dev, art, des, 1);
  const maxReg = Math.max(remote, latam, useu, 1);
  const pct = Math.min(100, (total / 200) * 100);

  window.__insightData = {
    dev, art, des, remote, latam, useu,
    maxCat, maxReg, total, pct
  };
  updateFilterGauge();
}

function animateInsightVisuals() {
  const d = window.__insightData;
  if (!d) return;

  animateStyle(
    document.querySelector("#gauge-total .fg"), "strokeDashoffset",
    157, 157 - (157 * d.pct / 100), 1725
  );

  animateStyle(
    document.querySelector("#bar-group-category .insight-bar-fill.blue"), "width",
    0, d.dev / d.maxCat * 100, 1725, "%"
  );
  animateStyle(
    document.querySelector("#bar-group-category .insight-bar-fill.purple"), "width",
    0, d.art / d.maxCat * 100, 1725, "%"
  );
  animateStyle(
    document.querySelector("#bar-group-category .insight-bar-fill.green"), "width",
    0, d.des / d.maxCat * 100, 1725, "%"
  );

  animateStyle(document.getElementById("bar-remote"), "width", 0, d.remote / d.maxReg * 100, 1725, "%");
  animateStyle(document.getElementById("bar-latam"), "width", 0, d.latam / d.maxReg * 100, 1725, "%");
  animateStyle(document.getElementById("bar-useu"), "width", 0, d.useu / d.maxReg * 100, 1725, "%");
}

function updateFilterGauge() {
  const count = activeRegions.size + activeSpecialties.size;
  document.getElementById("active-filters-count").textContent = count;
  document.getElementById("gauge-filters-label").textContent = count;
  const pct = Math.min(100, (count / 10) * 100);
  document.querySelector("#gauge-filters .fg.blue").style.strokeDashoffset = 157 - (157 * pct / 100);
}

function updateActiveStrip() {
  const strip = document.getElementById("active-strip");
  strip.innerHTML = "";

  const total = activeRegions.size + activeSpecialties.size;
  if (total === 0) return;

  activeRegions.forEach(slug => {
    const cfg = REGION_CONFIG[slug];
    const chip = document.createElement("span");
    chip.className = "active-chip region-chip";
    chip.textContent = cfg ? `${cfg.icon} ${cfg.label}` : slug;
    const rem = document.createElement("span");
    rem.className = "remove";
    rem.textContent = "✕";
    rem.dataset.region = slug;
    chip.appendChild(rem);
    strip.appendChild(chip);
  });

  activeSpecialties.forEach(slug => {
    const chip = document.createElement("span");
    chip.className = "active-chip";
    chip.textContent = labelMap[slug] || slug;
    const rem = document.createElement("span");
    rem.className = "remove";
    rem.textContent = "✕";
    rem.dataset.specialty = slug;
    chip.appendChild(rem);
    strip.appendChild(chip);
  });

  const clearBtn = document.createElement("button");
  clearBtn.className = "clear-all-btn";
  clearBtn.textContent = "Clear filters";
  strip.appendChild(clearBtn);

  strip.addEventListener("click", e => {
    const rem = e.target.closest(".remove");
    if (rem) {
      const spec = rem.dataset.specialty;
      const region = rem.dataset.region;
      if (spec) activeSpecialties.delete(spec);
      if (region) activeRegions.delete(region);
      applyFilterUI();
      currentPage = 1;
      renderPage();
      return;
    }
    const clear = e.target.closest(".clear-all-btn");
    if (clear) {
      activeSpecialties.clear();
      activeRegions.clear();
      applyFilterUI();
      currentPage = 1;
      renderPage();
    }
  });
}

async function loadJobs() {
  try {
    const res = await fetch(JOBS_URL);
    const data = await res.json();

    const updatedStr = data.updated || "";
    document.getElementById("updated-badge").textContent = "● last sync " + updatedStr;
    document.getElementById("footer-updated").textContent = "● " + updatedStr;

    const specialties = data.specialties || [];
    specialtiesMeta = specialties.map(s => ({ slug: s.slug, label: s.label, count: s.job_count }));
    specialties.forEach(s => { labelMap[s.slug] = s.label; });

    const seen = new Set();
    allJobs = [];
    specialties.forEach(spec => {
      (spec.jobs || []).forEach(job => {
        if (!seen.has(job.url)) {
          seen.add(job.url);
          allJobs.push(job);
        }
      });
    });

    updateInsights();

    buildFilterButtons(data.filters);
    restoreState();
    applyFilterUI();
    renderPage();
    document.body.classList.remove("js-loading");
    document.getElementById("loading-screen").classList.add("hidden");
    animateInsightVisuals();

  } catch (err) {
    console.error("Error loading jobs:", err);
    const container = document.getElementById("jobs");
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠</div><div class="msg">Could not load jobs. Check your connection and try again.</div></div>';
    document.getElementById("pagination-meta").textContent = "connection error";
    document.body.classList.remove("js-loading");
    document.getElementById("loading-screen").classList.add("hidden");
  }
}

function buildFilterButtons(filters) {
  const regions = (filters && filters.regions) || [];
  const regionContainer = document.getElementById("filter-region");
  regionContainer.innerHTML = "";

  regions.forEach(slug => {
    const btn = document.createElement("button");
    btn.className = "filter-chip region";
    btn.dataset.region = slug;
    const cfg = REGION_CONFIG[slug];
    btn.textContent = cfg ? cfg.label : slug;
    regionContainer.appendChild(btn);
  });

  const specContainer = document.getElementById("filter-specialty");
  specContainer.innerHTML = "";

  const activeMeta = specialtiesMeta.filter(s => s.count > 0);
  activeMeta.forEach(spec => {
    const btn = document.createElement("button");
    btn.className = "filter-chip specialty";
    btn.dataset.specialty = spec.slug;
    const countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = spec.count;
    btn.textContent = spec.label + " ";
    btn.appendChild(countSpan);
    specContainer.appendChild(btn);
  });
}

function toggleFilterGroup(set) {
  return function (e) {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    const value = btn.dataset.region || btn.dataset.specialty;
    if (!value) return;

    if (set.has(value)) set.delete(value);
    else set.add(value);

    applyFilterUI();
    currentPage = 1;
    renderPage();
  };
}

function setupFilters() {
  document.getElementById("filter-region").addEventListener("click", toggleFilterGroup(activeRegions));
  document.getElementById("filter-specialty").addEventListener("click", toggleFilterGroup(activeSpecialties));
}

function setupSearch() {
  const input = document.getElementById("search-input");
  const button = document.getElementById("search-button");

  function applySearch() {
    currentSearch = input.value.toLowerCase().trim();
    currentPage = 1;
    renderPage();
  }

  button.addEventListener("click", applySearch);
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") applySearch();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupFilters();
  setupPagination();
  loadJobs();
});

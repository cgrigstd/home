const JOBS_URL = "https://raw.githubusercontent.com/cgrigstd/job-flow/main/jobs.json";
const ITEMS_PER_PAGE = 20;
const STORAGE_KEY = "jobflow_state";

let allJobs = [];
let specialtiesMeta = [];
const labelMap = {};
let activeSpecialties = new Set();
let remoteOnly = false;
let currentPage = 1;
let currentSearch = "";

/* PERSISTENCE */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeSpecialties: Array.from(activeSpecialties),
      remoteOnly: remoteOnly,
      search: currentSearch,
      page: currentPage
    }));
  } catch (e) { /* ignore */ }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (Array.isArray(state.activeSpecialties)) {
      state.activeSpecialties.forEach(s => activeSpecialties.add(s));
    }
    if (typeof state.remoteOnly === "boolean") {
      remoteOnly = state.remoteOnly;
    }
    if (state.search) {
      currentSearch = state.search;
      document.getElementById("search-input").value = state.search;
    }
    if (typeof state.page === "number" && state.page > 0) {
      currentPage = state.page;
    }
  } catch (e) { /* ignore */ }
}

function applyFilterUI() {
  document.getElementById("remote-toggle")?.classList.toggle("active", remoteOnly);
  document.querySelectorAll(".filter-btn:not(#remote-toggle)").forEach(btn => {
    btn.classList.toggle("active", activeSpecialties.has(btn.dataset.specialty));
  });
}

/* FILTERING */

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
    if (remoteOnly && job.country !== "Remote") return false;
    if (currentSearch) {
      const content = (
        (job.title || "") + " " +
        (job.description || "") + " " +
        (job.country || "")
      ).toLowerCase();
      if (!content.includes(currentSearch)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
  return filtered;
}

/* SAFE URL */

function safeUrl(url) {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "#";
  } catch {
    return "#";
  }
}

/* PAGINATION */

function renderPage() {
  const filtered = getFilteredJobs();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageJobs = filtered.slice(start, start + ITEMS_PER_PAGE);

  const container = document.getElementById("jobs");
  container.innerHTML = "";

  pageJobs.forEach((job, i) => {
    const card = document.createElement("a");
    card.className = "job-card";
    card.style.animationDelay = `${i * 0.035}s`;
    card.href = safeUrl(job.url);
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const titleDiv = document.createElement("div");
    titleDiv.className = "job-title";
    titleDiv.textContent = job.title || "No title";
    card.appendChild(titleDiv);

    if (job.specialties && job.specialties.length > 0) {
      const tagsDiv = document.createElement("div");
      tagsDiv.className = "job-tags";
      job.specialties.forEach(slug => {
        const tag = document.createElement("span");
        tag.className = "job-tag";
        tag.textContent = labelMap[slug] || slug;
        tagsDiv.appendChild(tag);
      });
      card.appendChild(tagsDiv);
    }

    const metaDiv = document.createElement("div");
    metaDiv.className = "job-meta";
    const parts = [];
    if (job.source) parts.push(job.source);
    if (job.country) parts.push(job.country);
    metaDiv.textContent = parts.join(" · ");
    card.appendChild(metaDiv);

    container.appendChild(card);
  });

  document.getElementById("page-info").textContent = `${currentPage} / ${totalPages}`;
  document.getElementById("prev-page").disabled = currentPage <= 1;
  document.getElementById("next-page").disabled = currentPage >= totalPages;
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

/* LOAD JOBS */

async function loadJobs() {
  try {
    const res = await fetch(JOBS_URL);
    const data = await res.json();

    document.getElementById("updated").textContent = "Updated: " + data.updated;

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

    const hasSaved = !!localStorage.getItem(STORAGE_KEY);
    if (!hasSaved) {
      specialtiesMeta.forEach(s => activeSpecialties.add(s.slug));
    }

    buildFilterButtons();
    restoreState();
    applyFilterUI();
    renderPage();

  } catch (err) {
    console.error("Error loading jobs:", err);
  }
}

function buildFilterButtons() {
  const container = document.getElementById("filter-row");
  container.innerHTML = "";

  const remoteBtn = document.createElement("button");
  remoteBtn.className = "filter-btn";
  remoteBtn.id = "remote-toggle";
  remoteBtn.textContent = "🌐 Remote";
  container.appendChild(remoteBtn);

  specialtiesMeta.forEach(spec => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.specialty = spec.slug;
    btn.textContent = `${spec.label} (${spec.count})`;
    container.appendChild(btn);
  });
}

/* FILTERS */

function setupFilters() {
  document.getElementById("filter-row").addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    if (btn.id === "remote-toggle") {
      remoteOnly = !remoteOnly;
    } else {
      const spec = btn.dataset.specialty;
      if (activeSpecialties.has(spec)) {
        activeSpecialties.delete(spec);
      } else {
        activeSpecialties.add(spec);
      }
    }
    btn.classList.toggle("active");
    currentPage = 1;
    renderPage();
  });
}

/* SEARCH */

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

/* INIT */

document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupFilters();
  setupPagination();
  loadJobs();
});

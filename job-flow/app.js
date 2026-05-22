const JOBS_URL = "https://raw.githubusercontent.com/cgrigstd/job-flow/main/jobs.json";
const ITEMS_PER_PAGE = 20;
const STORAGE_KEY = "jobflow_state";

let allJobs = [];
let activeSites = new Set();
let currentPage = 1;
let currentSearch = "";

/* PERSISTENCE */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeSites: Array.from(activeSites),
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
    if (Array.isArray(state.activeSites)) {
      state.activeSites.forEach(s => activeSites.add(s));
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
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", activeSites.has(btn.dataset.site));
  });
}

/* FILTERING */

function getFilteredJobs() {
  let filtered = [];

  allJobs.forEach(site => {
    if (activeSites.size > 0 && !activeSites.has(site.name)) return;

    site.jobs.forEach(job => {
      const content = (
        (job.title || "") + " " +
        (job.description || "") + " " +
        (job.country || "")
      ).toLowerCase();

      if (currentSearch && !content.includes(currentSearch)) return;

      filtered.push({ ...job, site: site.name });
    });
  });

  filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
  return filtered;
}

/* SAFE URL */

function safeUrl(url){
  if(!url) return "#";
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

  // Render cards
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

    const siteDiv = document.createElement("div");
    siteDiv.className = "job-meta";
    siteDiv.textContent = job.site;
    card.appendChild(siteDiv);

    if (job.country) {
      const countryDiv = document.createElement("div");
      countryDiv.className = "job-meta";
      countryDiv.textContent = job.country;
      card.appendChild(countryDiv);
    }

    container.appendChild(card);
  });

  // Pagination UI
  document.getElementById("page-info").textContent = `${currentPage} / ${totalPages}`;
  document.getElementById("prev-page").disabled = currentPage <= 1;
  document.getElementById("next-page").disabled = currentPage >= totalPages;

  saveState();
}

function setupPagination() {
  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    const total = Math.max(1, Math.ceil(getFilteredJobs().length / ITEMS_PER_PAGE));
    if (currentPage < total) {
      currentPage++;
      renderPage();
    }
  });
}

/* LOAD JOBS */

async function loadJobs() {
  try {
    const res = await fetch(JOBS_URL);
    const data = await res.json();

    document.getElementById("updated").innerText = "Updated: " + data.updated;
    allJobs = data.sites || [];

    // If no saved state, enable all sites
    const hasSaved = !!localStorage.getItem(STORAGE_KEY);
    if (!hasSaved) {
      allJobs.forEach(site => activeSites.add(site.name));
    }

    restoreState();
    applyFilterUI();
    renderPage();

  } catch (err) {
    console.error("Error loading jobs:", err);
  }
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
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") applySearch();
  });
}

/* FILTERS */

function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const site = btn.dataset.site;
      if (activeSites.has(site)) {
        activeSites.delete(site);
      } else {
        activeSites.add(site);
      }
      btn.classList.toggle("active");

      currentPage = 1;
      renderPage();
    });
  });
}

/* INIT */

document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  setupFilters();
  setupPagination();
  loadJobs();
});

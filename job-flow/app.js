
const JOBS_URL = "https://raw.githubusercontent.com/cgrigstd/job-flow/main/jobs.json";

let allJobs = [];
let activeSites = new Set();

async function loadJobs() {
try {
const res = await fetch(JOBS_URL);
const data = await res.json();

    document.getElementById("updated").innerText = "Updated: " + data.updated;

    allJobs = data.sites || [];

    activeSites.clear();
    allJobs.forEach(site => activeSites.add(site.name));

    renderJobs();

} catch (err) {
    console.error("Error loading jobs:", err);
}

}

function renderJobs(search = "") {
const container = document.getElementById("jobs");
container.innerHTML = "";

let filtered = [];

allJobs.forEach(site => {
    if (!activeSites.has(site.name)) return;

    site.jobs.forEach(job => {
        const content = (
            (job.title || "") + " " +
            (job.description || "") + " " +
            (job.country || "")
        ).toLowerCase();

        if (search && !content.includes(search)) return;

        filtered.push({ ...job, site: site.name });
    });
});

filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

filtered.forEach(job => {
    const card = document.createElement("a");
    card.className = "job";
    card.href = job.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    let badge = "";
    if ((job.score || 0) >= 5) badge;
    else if ((job.score || 0) >= 3) badge;

    card.innerHTML = `
        <div class="job-title">${job.title || "No title"}${badge}</div>
        <div class="job-country">${job.site}</div>
        ${job.country ? `<div class="job-country"> ${job.country}</div>` : ""}
    `;

    container.appendChild(card);
});

}

function setupSearch() {
const input = document.getElementById("search-input");
const button = document.getElementById("search-button");

button.addEventListener("click", () => {
    renderJobs(input.value.toLowerCase().trim());
});

input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        renderJobs(input.value.toLowerCase().trim());
    }
});

}

function setupFilters() {
const buttons = document.querySelectorAll(".filter-btn");

buttons.forEach(btn => {
    const site = btn.dataset.site;

    btn.addEventListener("click", () => {
        if (activeSites.has(site)) {
            activeSites.delete(site);
            btn.classList.remove("active");
        } else {
            activeSites.add(site);
            btn.classList.add("active");
        }

        renderJobs();
    });
});

}

document.addEventListener("DOMContentLoaded", () => {
setupSearch();
setupFilters();
loadJobs();
});

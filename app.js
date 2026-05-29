async function loadData(){
  const response = await fetch("./data.json");
  const data = await response.json();
  initSite(data);
}

function safeUrl(url){
  if(!url) return "";
  try {
    const u = new URL(url, window.location.origin);
    return (u.protocol === "http:" || u.protocol === "https:") ? url : "";
  } catch { return ""; }
}

let videoModal, projectVideo;

function initSite(data){

  document.getElementById("heroName").textContent = data.profile.name;
  document.getElementById("heroLastName").textContent = data.profile.lastname;
  document.getElementById("heroDescription").textContent = data.profile.description;
  document.getElementById("heroRole").textContent = data.profile.area;
  document.getElementById("footerLocation").textContent = "Location: " + data.profile.location;
  document.getElementById("navLogo").src = data.profile.logo;

  document.getElementById("profileImage").src = data.profile.profileImage;
  document.getElementById("demoReel").src = safeUrl(data.demoReel);
  document.getElementById("shortRealTime").src = safeUrl(data.shortRealTime);

  document.getElementById("prodCount").textContent = "(" + data.productionrigs.length + ")";
  document.getElementById("realtimeCount").textContent = "(" + data.rigs.length + ")";
  document.getElementById("toolsCount").textContent = "(" + data.tools.length + ")";
  document.getElementById("gamesCount").textContent = "(" + data.games.length + ")";

  initShowcase(data.showcase);
  buildCards(data.productionrigs, "prodGrid");
  buildCards(data.rigs, "realtimeGrid");
  buildCards(data.tools, "toolsGrid");
  buildCards(data.games, "gamesGrid");

  videoModal = document.getElementById("video-modal");
  projectVideo = document.getElementById("project-video");
  projectVideo.onended = () => {
    projectVideo.pause();
    projectVideo.src = "";
    videoModal.classList.remove("active");
  };
  videoModal.onclick = (e) => {
    if(e.target === videoModal){
      projectVideo.pause();
      projectVideo.src = "";
      videoModal.classList.remove("active");
    }
  };

  const skillsPanel = document.getElementById("skillsPanel");
  const skillGroups = [
    { label:"3D Software", items:data.skills["3d_software"] },
    { label:"Game Engines", items:data.skills.game_engine },
    { label:"Human Pipeline", items:data.skills.human_system_pipeline },
    { label:"Programming", items:data.skills.programming_language }
  ];
  skillGroups.forEach(group => {
    const block = document.createElement("div");
    block.className = "skill-block";
    const h4 = document.createElement("h4");
    h4.textContent = group.label;
    block.appendChild(h4);
    const div = document.createElement("div");
    div.className = "items";
    group.items.forEach(item => {
      const span = document.createElement("span");
      span.textContent = item;
      div.appendChild(span);
    });
    block.appendChild(div);
    skillsPanel.appendChild(block);
  });
}

function initShowcase(items){
  const container = document.getElementById("showcaseCarousel");
  let index = 0;
  let elements = [];

  items.forEach(item => {
    let el;
    if(item.type === "image"){
      el = document.createElement("img");
      el.src = item.src;
    } else {
      el = document.createElement("video");
      el.src = item.src;
      el.muted = true;
      el.loop = true;
      el.autoplay = false;
      el.playsInline = true;
      el.preload = "metadata";
    }
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-item";
    wrapper.appendChild(el);
    container.appendChild(wrapper);
    elements.push(wrapper);
  });

  if(elements.length === 0) return;
  elements[0].classList.add("active");
  let firstVideo = elements[0].querySelector("video");
  if(firstVideo) firstVideo.play();

  setInterval(() => {
    let currentVideo = elements[index].querySelector("video");
    if(currentVideo) currentVideo.pause();
    elements[index].classList.remove("active");
    index = (index + 1) % elements.length;
    elements[index].classList.add("active");
    let nextVideo = elements[index].querySelector("video");
    if(nextVideo){ nextVideo.currentTime = 0; nextVideo.play(); }
  }, 9000);
}

function buildCards(items, containerId){
  const grid = document.getElementById(containerId);

  items.forEach(item => {
    const isLocalVideo = item.url && item.url.endsWith(".mp4") &&
      (containerId === "realtimeGrid" || containerId === "prodGrid");
    const hasValidLink = item.url && item.url !== "" && !isLocalVideo;

    const outer = document.createElement("div");
    outer.className = "work-card";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.image;
    img.alt = item.name;
    img.loading = "lazy";
    outer.appendChild(img);

    const h3 = document.createElement("h3");
    h3.textContent = item.name;
    outer.appendChild(h3);

    if(hasValidLink){
      const a = document.createElement("a");
      a.className = "work-card";
      a.href = safeUrl(item.url);
      a.target = "_blank";
      a.rel = "noopener";
      const img2 = img.cloneNode();
      a.appendChild(img2);
      const h32 = document.createElement("h3");
      h32.textContent = item.name;
      a.appendChild(h32);
      grid.appendChild(a);
      return;
    }

    if(isLocalVideo){
      outer.addEventListener("click", () => {
        projectVideo.src = item.url;
        projectVideo.currentTime = 0;
        projectVideo.play();
        videoModal.classList.add("active");
      });
    }

    grid.appendChild(outer);
  });
}

function randomizeWires(){
  const container = document.querySelector(".hero-bg-wires");
  const cw = container.clientWidth || 800;
  const ch = container.clientHeight || 600;
  const placed = [];
  const pad = 14;

  document.querySelectorAll(".hero-bg-wires .wire").forEach(el => {
    const vb = el.getAttribute("viewBox").split(" ").map(Number);
    const ar = vb[3] / vb[2];
    const w = 20 + Math.random() * 36;
    const h = w * ar;
    const deg = -30 + Math.random() * 60;
    const rad = deg * Math.PI / 180;
    const op = 0.06 + Math.random() * 0.06;

    const hw = w / 2, hh = h / 2;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const bw = hw * cos + hh * sin + pad;
    const bh = hw * sin + hh * cos + pad;

    let top, left, attempts = 0, ok = false;
    while (!ok && attempts < 120) {
      top = 2 + Math.random() * 86;
      left = 2 + Math.random() * 88;
      const cx = left / 100 * cw;
      const cy = top / 100 * ch;
      let collision = false;
      for (const p of placed) {
        if (Math.abs(cx - p.cx) < bw + p.bw &&
            Math.abs(cy - p.cy) < bh + p.bh) {
          collision = true;
          break;
        }
      }
      if (!collision) {
        ok = true;
        placed.push({ cx, cy, bw, bh });
      }
      attempts++;
    }

    el.style.top = top + "%";
    el.style.left = left + "%";
    el.style.width = w + "px";
    el.style.transform = "rotate(" + deg + "deg)";
    el.style.opacity = op;
  });
}

function initNav(){
  const links = document.querySelectorAll(".nav-links a");
  const sections = [];
  links.forEach(a => {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if(el) sections.push({ el, a });
  });
  function update(){
    let current = sections[0];
    const scrollY = window.scrollY + 120;
    for(const s of sections){
      if(s.el.offsetTop <= scrollY) current = s;
    }
    sections.forEach(s => s.a.classList.toggle("active", s === current));
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function initSliders(){
  document.querySelectorAll(".slider-wrapper").forEach(wrapper => {
    const grid = wrapper.querySelector(".work-grid");
    const prev = wrapper.querySelector(".slider-arrow.prev");
    const next = wrapper.querySelector(".slider-arrow.next");
    if(!grid || !prev || !next) return;
    const scroll = dir => {
      const card = grid.querySelector(".work-card, a.work-card");
      const amount = card ? card.offsetWidth + 6 : 266;
      grid.scrollBy({ left: dir * amount, behavior: "smooth" });
    };
    prev.addEventListener("click", () => scroll(-1));
    next.addEventListener("click", () => scroll(1));
  });
}

window.addEventListener("load", async () => {
  await loadData();
  randomizeWires();
  initNav();
  initSliders();

  const imgs = document.querySelectorAll("img:not([loading=lazy])");
  await Promise.all(Array.from(imgs, img => {
    if (img.complete) return;
    return new Promise(resolve => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));

  const loader = document.getElementById("loader");
  loader.classList.add("hidden");
  setTimeout(() => {
    loader.style.display = "none";
  }, 2000);
});

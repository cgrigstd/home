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

function initSite(data){

  document.getElementById("heroName").textContent = data.profile.name;
  document.getElementById("heroLastName").textContent = data.profile.lastname;
  document.getElementById("heroDescription").textContent = data.profile.description;
  document.getElementById("heroRole").textContent = data.profile.area;
  document.getElementById("navLogo").src = data.profile.logo;
  document.getElementById("loaderLogo").src = data.profile.logo;
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

  const videoModal = document.getElementById("video-modal");
  const projectVideo = document.getElementById("project-video");
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

    const ind = document.createElement("div");
    ind.className = "indicator";

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
      const ind2 = document.createElement("div");
      ind2.className = "indicator";
      ind2.textContent = "\u2197 view";
      a.appendChild(ind2);
      grid.appendChild(a);
      return;
    }

    if(isLocalVideo){
      ind.textContent = "\u25B6 play";
      outer.addEventListener("click", () => {
        projectVideo.src = item.url;
        projectVideo.currentTime = 0;
        projectVideo.play();
        videoModal.classList.add("active");
      });
    } else {
      ind.textContent = "\u2014";
    }

    outer.appendChild(ind);
    grid.appendChild(outer);
  });
}

window.addEventListener("load", async () => {
  await loadData();
  const loader = document.getElementById("loader");
  loader.classList.add("hidden");
  setTimeout(() => {
    loader.style.display = "none";
  }, 2000);
});

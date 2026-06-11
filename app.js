async function loadData(){
  const response = await fetch("./data.json");
  return await response.json();
}

function safeUrl(url){
  if(!url) return "";
  try { const u = new URL(url, window.location.origin); return (u.protocol==="http:"||u.protocol==="https:")?url:""; } catch{ return ""; }
}

const tabs = [
  { id:"showcase",     label:"Showcase",     dot:"green" },
  { id:"demo",         label:"Demo Reel",    dot:"green" },
  { id:"unreal",       label:"Short Unreal", dot:"indigo" },
  { id:"production",   label:"Production",   dot:"green" },
  { id:"realtime",     label:"Realtime",     dot:"indigo" },
  { id:"tools",        label:"Tools",        dot:"white" },
  { id:"games",        label:"Games",        dot:"indigo" },
  { id:"skills",       label:"Skills",       dot:"green" },
  { id:"contact",      label:"Contact",      dot:"green" },
];

async function init(){
  const data = await loadData();
  const p = data.profile;

  document.getElementById("heroName").textContent = p.name;
  document.getElementById("heroLastName").textContent = p.lastname;
  document.getElementById("heroDescription").textContent = p.description;
  document.getElementById("heroRole").textContent = p.area;
  document.getElementById("footerLocation").textContent = "Location: " + p.location;
  document.getElementById("profileImage").src = p.profileImage;

  const tabBar = document.getElementById("tabBar");
  const tabContents = document.getElementById("tabContents");

  tabs.forEach((t,i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i===0?" active":"");
    btn.textContent = t.label;
    btn.dataset.tab = t.id;
    btn.addEventListener("click", () => switchTab(t.id));
    tabBar.appendChild(btn);

    const content = document.createElement("div");
    content.className = "tab-content" + (i===0?" active":"");
    content.id = "tab-" + t.id;
    tabContents.appendChild(content);
  });

  buildShowcaseTab(data.showcase);
  buildDemoTab(data.demoReel);
  buildUnrealTab(data.shortRealTime);
  buildWorkTab(data.productionrigs, "Production Rigs", "green", "production");
  buildWorkTab(data.rigs, "Realtime Rigs", "indigo", "realtime");
  buildWorkTab(data.tools, "Tools & Assets", "white", "tools");
  buildWorkTab(data.games, "Games", "indigo", "games");
  buildSkillsTab(data.skills);
  buildContactTab();
  randomizeWires();
  const wiresContainer = document.querySelector(".hero-bg-wires");
  if(wiresContainer) wiresContainer.style.opacity = "1";

  const modal = document.getElementById("video-modal");
  const video = document.getElementById("project-video");
  video.onended = ()=>{ video.pause();video.src="";modal.classList.remove("active"); };
  modal.onclick = e => { if(e.target===modal){ video.pause();video.src="";modal.classList.remove("active"); } };
  window.playVideo = src => { video.src=src;video.currentTime=0;video.play();modal.classList.add("active"); };
}

function switchTab(id){
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab===id));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id==="tab-"+id));
}

function buildShowcaseTab(items){
  const container = document.getElementById("tab-showcase");
  container.innerHTML = `
    <div class="section-title"><div class="dot green"></div><h2>Showcase</h2></div>
    <div class="carousel-container" id="scCarousel"></div>`;
  const carousel = document.getElementById("scCarousel");
  let idx = 0, els = [];
  items.forEach(item => {
    const el = item.type==="image" ? (()=>{const e=document.createElement("img");e.src=item.src;return e;})() : (()=>{const e=document.createElement("video");e.src=item.src;e.muted=true;e.loop=true;e.autoplay=false;e.playsInline=true;e.preload="metadata";return e;})();
    const w = document.createElement("div");w.className="carousel-item";w.appendChild(el);carousel.appendChild(w);els.push(w);
  });
  if(!els.length) return;
  els[0].classList.add("active");
  let fv = els[0].querySelector("video"); if(fv) fv.play();
  setInterval(()=>{
    let cv = els[idx].querySelector("video"); if(cv) cv.pause();
    els[idx].classList.remove("active");
    idx = (idx+1)%els.length;
    els[idx].classList.add("active");
    let nv = els[idx].querySelector("video"); if(nv){ nv.currentTime=0;nv.play(); }
  },9000);
}

function buildDemoTab(url){
  const c = document.getElementById("tab-demo");
  c.innerHTML = `
    <div class="section-title"><div class="dot green"></div><h2>Demo Reel</h2></div>
    <div class="video-wrapper"><iframe frameborder="0" allowfullscreen src="${safeUrl(url)}"></iframe></div>`;
}

function buildUnrealTab(url){
  const c = document.getElementById("tab-unreal");
  c.innerHTML = `
    <div class="section-title"><div class="dot indigo"></div><h2>Short Unreal Engine</h2></div>
    <div class="video-wrapper"><iframe frameborder="0" allowfullscreen src="${safeUrl(url)}"></iframe></div>`;
}

function buildWorkTab(items, title, dot, tabId){
  const c = document.getElementById("tab-" + tabId);
  c.innerHTML = `
    <div class="section-title"><div class="dot ${dot}"></div><h2>${title}</h2><span class="count">(${items.length})</span></div>
    <div class="work-grid"></div>`;
  const grid = c.querySelector(".work-grid");
  items.forEach(item => {
    const isLocal = item.url && item.url.endsWith(".mp4");
    const hasLink = item.url && item.url !== "" && !isLocal;
    if(hasLink){
      const a = document.createElement("a");a.className="work-card";a.href=safeUrl(item.url);a.target="_blank";a.rel="noopener";
      const img=document.createElement("img");img.className="thumb";img.src=item.image;img.alt=item.name;img.loading="lazy";a.appendChild(img);
      const h3=document.createElement("h3");h3.textContent=item.name;a.appendChild(h3);grid.appendChild(a);
    } else {
      const div=document.createElement("div");div.className="work-card";
      const img=document.createElement("img");img.className="thumb";img.src=item.image;img.alt=item.name;img.loading="lazy";div.appendChild(img);
      const h3=document.createElement("h3");h3.textContent=item.name;div.appendChild(h3);
      if(isLocal) div.addEventListener("click",()=>window.playVideo(item.url));
      grid.appendChild(div);
    }
  });
}

function buildSkillsTab(skills){
  const c = document.getElementById("tab-skills");
  c.innerHTML = `
    <div class="section-title"><div class="dot green"></div><h2>Skills</h2></div>
    <div class="skills-panel"></div>`;
  const panel = c.querySelector(".skills-panel");
  const groups = [
    {label:"3D Software", items:skills["3d_software"]},
    {label:"Game Engines", items:skills.game_engine},
    {label:"Human Pipeline", items:skills.human_system_pipeline},
    {label:"Programming", items:skills.programming_language}
  ];
  groups.forEach(g => {
    const b=document.createElement("div");b.className="skill-block";
    const h4=document.createElement("h4");h4.textContent=g.label;b.appendChild(h4);
    const d=document.createElement("div");d.className="items";
    g.items.forEach(i=>{const s=document.createElement("span");s.textContent=i;d.appendChild(s);});
    b.appendChild(d);panel.appendChild(b);
  });
}

function buildContactTab(){
  const c = document.getElementById("tab-contact");
  c.innerHTML = `
    <div class="section-title"><div class="dot green"></div><h2>Contact</h2></div>
    <div class="contact-wrap">
      <form class="contact-form" id="contactForm" action="https://formsubmit.co/cgrig.td@gmail.com" method="POST">
        <div class="contact-row">
          <div class="field">
            <label for="cName">Name</label>
            <input type="text" id="cName" name="name" placeholder="Your name" required>
          </div>
          <div class="field">
            <label for="cEmail">Email</label>
            <input type="email" id="cEmail" name="email" placeholder="your@email.com" required>
          </div>
        </div>
        <div class="field">
          <label for="cSubject">Subject</label>
          <input type="text" id="cSubject" name="subject" placeholder="What's this about?">
        </div>
        <div class="field">
          <label for="cMessage">Message</label>
          <textarea id="cMessage" name="message" placeholder="Tell me about your project..." required></textarea>
        </div>
        <button type="submit">Send Message</button>
        <input type="hidden" name="_captcha" value="false">
      </form>
      <div class="contact-alt">
        <span>Or reach out directly:</span>
        <a href="mailto:cgrig.td@gmail.com">cgrig.td@gmail.com</a>
      </div>
    </div>`;
  document.getElementById("contactForm").addEventListener("submit", e => {
    const btn = e.target.querySelector("button");
    btn.textContent = "Sending...";
    btn.style.background = "rgba(16,185,129,0.15)";
  });
}

function randomizeWires(){
  const container = document.querySelector(".hero-bg-wires");
  if(!container) return;
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

window.addEventListener("load", init);

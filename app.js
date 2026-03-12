async function loadData(){

const response = await fetch("./data.json")
const data = await response.json()

initSite(data)

}

function initSite(data){
initShowcase(data.showcase)
const productionrigsContainer = document.getElementById("productionrigsContainer")
const rigsContainer = document.getElementById("rigsContainer")
const toolsContainer = document.getElementById("toolsContainer")
const gamesContainer = document.getElementById("gamesContainer")

document.getElementById("heroName").textContent = data.profile.name
document.getElementById("heroLastName").textContent = data.profile.lastname
document.getElementById("heroDescription").textContent = data.profile.description

document.getElementById("navLogo").src = data.profile.logo

document.getElementById("loaderLogo").src = data.profile.logo

document.getElementById("demoReel").src = data.demoReel

document.getElementById("shortRealTime").src = data.shortRealTime

document.getElementById("profileImage").src = data.profile.profileImage

document.getElementById("skillSoftware").textContent =
data.skills["3d_software"].join(" · ")

document.getElementById("skillEngines").textContent =
data.skills.game_engine.join(" · ")

document.getElementById("skillLanguages").textContent =
data.skills.programming_language.join(" · ")

document.getElementById("humansystempipeline").textContent =
data.skills.human_system_pipeline.join(" · ")

createCards(data.productionrigs, productionrigsContainer)
createCards(data.rigs, rigsContainer)
createCards(data.tools, toolsContainer)
createCards(data.games, gamesContainer)

}

function createCards(items, container) {
  const videoModal = document.getElementById('video-modal');
  const projectVideo = document.getElementById('project-video');

  items.forEach(item => {
    const isLocalVideo = item.url && item.url.endsWith(".mp4") &&
                         (container.id === "rigsContainer" || container.id === "productionrigsContainer");
    const hasValidLink = item.url && item.url !== "" && !isLocalVideo;

    const card = document.createElement("div");
    card.className = "card";

    if (isLocalVideo || hasValidLink) {
      card.classList.add("clickable");
    }

    if (hasValidLink) {
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.innerHTML = `<img loading="lazy" src="${item.image}"><h3>${item.name}</h3>`;
      card.appendChild(link);
    } else {
      card.innerHTML = `<img loading="lazy" src="${item.image}"><h3>${item.name}</h3>`;
    }

    container.appendChild(card);

    if (isLocalVideo) {
      card.addEventListener("click", () => {
        projectVideo.src = item.url;
        projectVideo.currentTime = 0;
        projectVideo.play();
        videoModal.classList.add("active");
      });
    }
  });

  projectVideo.addEventListener("ended", () => {
    projectVideo.pause();
    projectVideo.src = "";
    videoModal.classList.remove("active");
  });

  videoModal.addEventListener("click", (e) => {
    if (e.target === videoModal) {
      projectVideo.pause();
      projectVideo.src = "";
      videoModal.classList.remove("active");
    }
  });
}
function initShowcase(items){

const container = document.getElementById("showcaseCarousel")

let index = 0
let elements = []

items.forEach(item=>{

let element

if(item.type === "image"){

element = document.createElement("img")
element.src = item.src

}else{

element = document.createElement("video")
element.src = item.src
element.muted = true
element.loop = true
element.autoplay = true

}

const wrapper = document.createElement("div")
wrapper.className = "showcase-item"

wrapper.appendChild(element)

container.appendChild(wrapper)

elements.push(wrapper)

})

if(elements.length === 0) return

elements[0].classList.add("active")

setInterval(()=>{

elements[index].classList.remove("active")

index = (index + 1) % elements.length

elements[index].classList.add("active")

},9000)

}

window.addEventListener("load", async () => {
  await loadData()
  const loader = document.getElementById("loader")
  loader.classList.add("hidden")
  setTimeout(() => {
    loader.style.display = "none"
  }, 2000) 
})



const canvas = document.getElementById("bg-canvas");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({canvas, alpha:true});
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

const isMobile = window.innerWidth < 512;
const particlesCount = isMobile ? 100 : 1200;

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particlesCount * 3);

for(let i=0;i<particlesCount*3;i++){
  positions[i] = (Math.random() - 0.5) * 10;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions,3));

const material = new THREE.PointsMaterial({
  size:0.02,
  color:0x00ffff
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

let running = true;

document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
});

function animate(){
  requestAnimationFrame(animate);

  if(!running) return;

  particles.rotation.y += 0.0003;
  particles.rotation.x += 0.0001;

  renderer.render(scene,camera);
}

animate();

window.addEventListener("resize",()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

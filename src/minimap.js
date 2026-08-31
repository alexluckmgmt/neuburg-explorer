import { LOCATIONS } from "./locations.js";
import { LUITPOLD_PATH, BOUNDS } from "./world.js";
import { state } from "./state.js";

const overlay = document.getElementById("mapOverlay");
const canvas = document.getElementById("minimapCanvas");
const ctx = canvas.getContext("2d");
const toggleBtn = document.getElementById("mapToggleBtn");
const closeBtn = document.getElementById("mapCloseBtn");

let isOpen = false;
let latestPlayerPos = { x:0, z:0 };

const PAD = 18;
const spanX = BOUNDS.maxX - BOUNDS.minX;
const spanZ = BOUNDS.maxZ - BOUNDS.minZ;

function toCanvas(x, z, size){
  const usable = size - PAD*2;
  const cx = PAD + ((x - BOUNDS.minX) / spanX) * usable;
  const cz = PAD + ((z - BOUNDS.minZ) / spanZ) * usable;
  return [cx, cz];
}

function resizeCanvas(){
  const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
  if(canvas.width !== size){
    canvas.width = size;
    canvas.height = size;
  }
}

function draw(){
  if(!isOpen) return;
  resizeCanvas();
  const size = canvas.width;
  ctx.clearRect(0,0,size,size);

  ctx.fillStyle = "#cfe8c9";
  ctx.fillRect(0,0,size,size);

  ctx.strokeStyle = "#b9b0c2";
  ctx.lineWidth = Math.max(2, size*0.012);
  ctx.lineCap = "round";
  ctx.beginPath();
  LUITPOLD_PATH.forEach((p,i) => {
    const [px,pz] = toCanvas(p.x, p.z, size);
    if(i===0) ctx.moveTo(px,pz); else ctx.lineTo(px,pz);
  });
  ctx.stroke();

  LOCATIONS.forEach(loc => {
    const [px,pz] = toCanvas(loc.x, loc.z, size);
    const unlocked = !!state.unlocked[loc.id];
    const r = size*0.018;
    ctx.beginPath();
    ctx.arc(px,pz,r,0,Math.PI*2);
    ctx.fillStyle = unlocked ? loc.color : "#9a91ab";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, size*0.005);
    ctx.strokeStyle = "#1a1424";
    ctx.stroke();

    ctx.font = `${Math.round(size*0.028)}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = "#1a1424";
    ctx.textAlign = "center";
    ctx.fillText(loc.name, px, pz - r - size*0.012);
  });

  const [plx,plz] = toCanvas(latestPlayerPos.x, latestPlayerPos.z, size);
  ctx.beginPath();
  ctx.arc(plx,plz,size*0.024,0,Math.PI*2);
  ctx.fillStyle = "#FF3EA5";
  ctx.fill();
  ctx.lineWidth = Math.max(2, size*0.006);
  ctx.strokeStyle = "#16121F";
  ctx.stroke();
}

export function updateMinimapPlayer(pos){
  latestPlayerPos = pos;
  if(isOpen) draw();
}

function openMap(){
  isOpen = true;
  overlay.style.display = "flex";
  draw();
}
function closeMap(){
  isOpen = false;
  overlay.style.display = "none";
}

toggleBtn.addEventListener("click", openMap);
closeBtn.addEventListener("click", closeMap);
overlay.addEventListener("click", (e) => { if(e.target === overlay) closeMap(); });
window.addEventListener("resize", () => { if(isOpen) draw(); });

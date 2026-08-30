import * as THREE from "three";
import { LOCATIONS } from "./locations.js";
import { CONFIG } from "./config.js";
import { state, saveState, totalRate, fmt } from "./state.js";
import { camera } from "./world.js";
import { player } from "./player.js";

/* ============================================================
   LABELS (HTML-Overlay über 3D-Positionen)
   ============================================================ */
const labelLayer = document.getElementById("labelLayer");
const labelEls = {};
LOCATIONS.forEach(loc => {
  const el = document.createElement("div");
  el.className = "loc-label locked";
  el.textContent = loc.name;
  labelLayer.appendChild(el);
  labelEls[loc.id] = el;
});
const projVec = new THREE.Vector3();

export let nearLocation = null;

export function updateLabels(){
  LOCATIONS.forEach(loc => {
    const el = labelEls[loc.id];
    projVec.set(loc.x, 6.5, loc.z);
    projVec.project(camera);
    if(projVec.z > 1){ el.style.display="none"; return; }
    const sx = (projVec.x*0.5+0.5)*window.innerWidth;
    const sy = (-projVec.y*0.5+0.5)*window.innerHeight;
    el.style.display = "block";
    el.style.left = sx+"px";
    el.style.top = sy+"px";
    el.classList.toggle("locked", !state.unlocked[loc.id]);
    el.classList.toggle("near", nearLocation && nearLocation.id===loc.id);
  });
}

/* ============================================================
   INTERAKTION
   ============================================================ */
const interactBtn = document.getElementById("interactBtn");
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalFlavor = document.getElementById("modalFlavor");
const modalReward = document.getElementById("modalReward");
const modalClose = document.getElementById("modalClose");

export function checkProximity(){
  let closest = null, closestDist = Infinity;
  LOCATIONS.forEach(loc => {
    const dx = player.position.x - loc.x;
    const dz = player.position.z - loc.z;
    const d = Math.hypot(dx,dz);
    if(d < loc.radius && d < closestDist){ closest = loc; closestDist = d; }
  });
  if(closest !== nearLocation){
    nearLocation = closest;
    if(nearLocation){
      interactBtn.style.display = "block";
      interactBtn.textContent = (state.unlocked[nearLocation.id] ? "Nochmal ansehen: " : "Betreten: ") + nearLocation.name;
    } else {
      interactBtn.style.display = "none";
    }
  }
}

interactBtn.addEventListener("click", () => {
  if(!nearLocation) return;
  const loc = nearLocation;
  const firstTime = !state.unlocked[loc.id];
  modalTitle.textContent = loc.name;
  modalFlavor.textContent = loc.flavor;
  if(firstTime){
    state.unlocked[loc.id] = true;
    state.amount += loc.reward;
    modalReward.textContent = `+${loc.reward} ${CONFIG.currencyName} · +${loc.rate}/s dauerhaft`;
    updateHUD();
    saveState();
  } else {
    modalReward.textContent = "Bereits erkundet";
  }
  modalOverlay.style.display = "flex";
});
modalClose.addEventListener("click", () => { modalOverlay.style.display = "none"; });

/* ============================================================
   HUD
   ============================================================ */
export function updateHUD(){
  document.getElementById("amountText").textContent = fmt(state.amount)+" "+CONFIG.currencySymbol;
  document.getElementById("rateText").textContent = "+"+fmt(totalRate())+"/s";
  const unlockedCount = LOCATIONS.filter(l=>state.unlocked[l.id]).length;
  document.getElementById("discoverCount").textContent = unlockedCount+"/"+LOCATIONS.length;
}

let toastTimer=null;
export function showToast(msg){
  let t=document.querySelector(".toast");
  if(t) t.remove();
  t=document.createElement("div");
  t.className="toast"; t.textContent=msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.remove(),3400);
}

export function applyOfflineProgress(){
  const now = Date.now();
  const elapsed = Math.max(0,(now-state.lastSave)/1000);
  const capped = Math.min(elapsed, CONFIG.maxOfflineHours*3600);
  if(capped > 30){
    const earned = totalRate()*capped;
    if(earned>0){
      state.amount += earned;
      showToast(`Während du weg warst: +${fmt(earned)} ${CONFIG.currencyName}`);
    }
  }
}

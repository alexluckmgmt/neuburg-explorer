import * as THREE from "three";
import { scene, camera, renderer, canvasWrap, buildWorld, LUITPOLD_PATH, BOUNDS } from "./world.js";

buildWorld();

/* Nebel & Sichtweite sind fürs Handyspiel gedacht (Atmosphäre auf kurze
   Distanz) — für die Übersichts-Freecam stören sie nur, deshalb hier aus. */
scene.fog = null;
camera.far = 1200;
camera.updateProjectionMatrix();

/* ============================================================
   FREECAM — reine Grundriss-Kontrollansicht für den PC. Kein
   Spieler, kein HUD, keine Spiellogik. Nur zum schnellen
   Durchschauen/Abgleichen mit dem Satellitenbild, bevor Häuser
   gebaut werden.
   ============================================================ */
const midX = (BOUNDS.minX + BOUNDS.maxX) / 2;
const midZ = (BOUNDS.minZ + BOUNDS.maxZ) / 2;
const pivot = new THREE.Vector3(midX, 0, midZ);
let yaw = 0.4;
let pitch = 1.15; // ziemlich top-down, aber noch mit erkennbarer Tiefe
let dist = Math.max(BOUNDS.maxX - BOUNDS.minX, BOUNDS.maxZ - BOUNDS.minZ) * 0.62;

const MIN_PITCH = 0.15, MAX_PITCH = 1.5;
const MIN_DIST = 8, MAX_DIST = 700;

function updateCamera(){
  const cy = Math.cos(pitch), sy = Math.sin(pitch);
  const cx = Math.sin(yaw) * cy, cz = Math.cos(yaw) * cy;
  camera.position.set(
    pivot.x + cx * dist,
    sy * dist,
    pivot.z + cz * dist
  );
  camera.lookAt(pivot);
}
updateCamera();

let dragMode = null; // "orbit" | "pan"
let lastX = 0, lastY = 0;

function onPointerDown(e){
  dragMode = (e.button === 2 || e.shiftKey) ? "pan" : "orbit";
  lastX = e.clientX; lastY = e.clientY;
  canvasWrap.setPointerCapture(e.pointerId);
}
function onPointerMove(e){
  if(!dragMode) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  if(dragMode === "orbit"){
    yaw -= dx * 0.006;
    pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch + dy * 0.005));
  } else {
    const panScale = dist * 0.0016;
    const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
    const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    pivot.x += (-dx*rightX + dy*fwdX) * panScale;
    pivot.z += (-dx*rightZ + dy*fwdZ) * panScale;
  }
  updateCamera();
}
function onPointerUp(e){
  dragMode = null;
  try{ canvasWrap.releasePointerCapture(e.pointerId); }catch(err){}
}
function onWheel(e){
  e.preventDefault();
  dist = Math.max(MIN_DIST, Math.min(MAX_DIST, dist * Math.pow(1.0015, e.deltaY)));
  updateCamera();
}
canvasWrap.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
canvasWrap.addEventListener("wheel", onWheel, { passive:false });
canvasWrap.addEventListener("contextmenu", e => e.preventDefault());

const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt = Math.min((now-lastTime)/1000, 0.1);
  lastTime = now;

  const panSpeed = dist * 0.9;
  const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  let mx = 0, mz = 0;
  if(keys["w"] || keys["arrowup"]) { mx += fwdX; mz += fwdZ; }
  if(keys["s"] || keys["arrowdown"]) { mx -= fwdX; mz -= fwdZ; }
  if(keys["a"] || keys["arrowleft"]) { mx -= rightX; mz -= rightZ; }
  if(keys["d"] || keys["arrowright"]) { mx += rightX; mz += rightZ; }
  if(mx || mz){
    const len = Math.hypot(mx,mz) || 1;
    pivot.x += (mx/len) * panSpeed * dt;
    pivot.z += (mz/len) * panSpeed * dt;
    updateCamera();
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

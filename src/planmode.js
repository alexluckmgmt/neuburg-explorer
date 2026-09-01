import * as THREE from "three";
import { scene, camera, renderer, canvasWrap, buildWorld, BOUNDS } from "./world.js";

buildWorld();

/* Nebel & Sichtweite sind fürs Handyspiel gedacht (Atmosphäre auf kurze
   Distanz) — für die Übersichts-Freecam stören sie nur, deshalb hier aus. */
scene.fog = null;
camera.far = 1200;
camera.updateProjectionMatrix();

/* ============================================================
   FREECAM — echtes Herumfliegen (wie in einem 3D-Editor), NICHT
   die Karte verschieben. Ziehen dreht nur die Blickrichtung, WASD
   bewegt die Kamera selbst entlang dieser Blickrichtung.
   ============================================================ */
const midX = (BOUNDS.minX + BOUNDS.maxX) / 2;
const midZ = (BOUNDS.minZ + BOUNDS.maxZ) / 2;
const span = Math.max(BOUNDS.maxX - BOUNDS.minX, BOUNDS.maxZ - BOUNDS.minZ);

camera.rotation.order = "YXZ";
camera.position.set(midX, span*0.55, midZ + span*0.35);
let yaw = 0, pitch = -0.9;

function applyLook(){
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}
applyLook();

let dragging = false, lastX = 0, lastY = 0;
function onPointerDown(e){
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  canvasWrap.setPointerCapture(e.pointerId);
}
function onPointerMove(e){
  if(!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  yaw -= dx * 0.0045;
  pitch = Math.max(-1.55, Math.min(1.55, pitch - dy * 0.0045));
  applyLook();
}
function onPointerUp(e){
  dragging = false;
  try{ canvasWrap.releasePointerCapture(e.pointerId); }catch(err){}
}
canvasWrap.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
canvasWrap.addEventListener("contextmenu", e => e.preventDefault());

let moveSpeed = Math.max(20, span*0.12);
function onWheel(e){
  e.preventDefault();
  moveSpeed = Math.max(2, Math.min(span*1.5, moveSpeed * Math.pow(1.0012, -e.deltaY)));
}
canvasWrap.addEventListener("wheel", onWheel, { passive:false });

const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const worldUp = new THREE.Vector3(0,1,0);

let lastTime = performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt = Math.min((now-lastTime)/1000, 0.1);
  lastTime = now;

  camera.getWorldDirection(forward);
  right.crossVectors(forward, worldUp).normalize();

  const boost = (keys["shift"] ? 3 : 1);
  const speed = moveSpeed * boost * dt;
  if(keys["w"] || keys["arrowup"])    camera.position.addScaledVector(forward, speed);
  if(keys["s"] || keys["arrowdown"])  camera.position.addScaledVector(forward, -speed);
  if(keys["d"] || keys["arrowright"]) camera.position.addScaledVector(right, speed);
  if(keys["a"] || keys["arrowleft"])  camera.position.addScaledVector(right, -speed);
  if(keys[" "] || keys["e"])          camera.position.addScaledVector(worldUp, speed);
  if(keys["q"] || keys["c"])          camera.position.addScaledVector(worldUp, -speed);

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

import * as THREE from "three";
import "./style.css";
import { CONFIG } from "./config.js";
import { state, loadState, saveState, totalRate } from "./state.js";
import { scene, camera, renderer, buildWorld, BOUNDS } from "./world.js";
import { player, playerShadow } from "./player.js";
import { moveDir, keyboardVector } from "./controls.js";
import { checkProximity, updateLabels, updateHUD, applyOfflineProgress } from "./ui.js";

buildWorld();

/* ============================================================
   GAME LOOP
   ============================================================ */
const camOffset = new THREE.Vector3(0, 15, 11);
const camTarget = new THREE.Vector3();
let lastTime = performance.now();

function animate(now){
  requestAnimationFrame(animate);
  const dt = Math.min((now-lastTime)/1000, 0.1);
  lastTime = now;

  const kb = keyboardVector();
  let mx = moveDir.x || kb.x;
  let mz = moveDir.z || kb.z;
  const len = Math.hypot(mx,mz);
  if(len > 0.05){
    mx/=len || 1; mz/=len || 1;
    player.position.x += mx * CONFIG.moveSpeed * dt * Math.min(len,1);
    player.position.z += mz * CONFIG.moveSpeed * dt * Math.min(len,1);
    player.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, player.position.x));
    player.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, player.position.z));
    const targetAngle = Math.atan2(mx, mz);
    player.rotation.y += (targetAngle - player.rotation.y) * Math.min(1, dt*10);
  }
  playerShadow.position.set(player.position.x, 0.015, player.position.z);

  camTarget.set(player.position.x + camOffset.x, camOffset.y, player.position.z + camOffset.z);
  camera.position.lerp(camTarget, Math.min(1, dt*4));
  camera.lookAt(player.position.x, 1, player.position.z);

  checkProximity();
  updateLabels();

  state.amount += totalRate()*dt;
  updateHUD();

  renderer.render(scene, camera);
}

/* ============================================================
   START
   ============================================================ */
loadState();
applyOfflineProgress();
updateHUD();
saveState();
setInterval(saveState, 5000);
window.addEventListener("beforeunload", saveState);
document.addEventListener("visibilitychange", () => { if(document.hidden) saveState(); });

document.getElementById("loadingScreen").style.display = "none";
requestAnimationFrame(animate);

if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{});
  });
}

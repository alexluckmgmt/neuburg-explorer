import * as THREE from "three";
import "./style.css";
import { CONFIG } from "./config.js";
import { state, loadState, saveState, totalRate } from "./state.js";
import { scene, camera, renderer, buildWorld, BOUNDS } from "./world.js";
import { player, playerShadow } from "./player.js";
import { moveDir, keyboardVector, camYaw } from "./controls.js";
import { checkProximity, updateLabels, updateHUD, applyOfflineProgress } from "./ui.js";
import { updateMinimapPlayer } from "./minimap.js";

buildWorld();

/* ============================================================
   GAME LOOP
   ============================================================ */
const CAM_HEIGHT = 9.5, CAM_DIST = 12.5;
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
    /* Eingabe ist Stick-relativ ("hoch" = weg von der Kamera). Um camYaw
       drehen, sonst kehrt sich die Steuerung um, sobald die Kamera gedreht wird. */
    const cosY = Math.cos(camYaw.value), sinY = Math.sin(camYaw.value);
    const rightX = cosY, rightZ = -sinY;
    const fwdX = -sinY, fwdZ = -cosY;
    const wx = mx*rightX - mz*fwdX;
    const wz = mx*rightZ - mz*fwdZ;
    player.position.x += wx * CONFIG.moveSpeed * dt * Math.min(len,1);
    player.position.z += wz * CONFIG.moveSpeed * dt * Math.min(len,1);
    player.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, player.position.x));
    player.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, player.position.z));
    const targetAngle = Math.atan2(wx, wz);
    player.rotation.y += (targetAngle - player.rotation.y) * Math.min(1, dt*10);
  }
  playerShadow.position.set(player.position.x, 0.015, player.position.z);

  const cx = Math.sin(camYaw.value)*CAM_DIST, cz = Math.cos(camYaw.value)*CAM_DIST;
  camTarget.set(player.position.x + cx, CAM_HEIGHT, player.position.z + cz);
  camera.position.lerp(camTarget, Math.min(1, dt*6));
  camera.lookAt(player.position.x, 1, player.position.z);

  checkProximity();
  updateLabels();
  updateMinimapPlayer(player.position);

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

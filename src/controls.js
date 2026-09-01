/* ============================================================
   STEUERUNG — Joystick (Touch) + Tastatur (Desktop-Test)
   ============================================================ */
export const moveDir = {x:0, z:0};
const joyBase = document.getElementById("joyBase");
const joyKnob = document.getElementById("joyKnob");
let joyActive = false, joyId = null, joyCenter = {x:0,y:0};

function joyStart(e){
  joyActive = true;
  joyId = e.pointerId;
  const r = joyBase.getBoundingClientRect();
  joyCenter = {x:r.left+r.width/2, y:r.top+r.height/2};
  joyBase.setPointerCapture(joyId);
}
function joyMove(e){
  if(!joyActive || e.pointerId!==joyId) return;
  let dx = e.clientX - joyCenter.x;
  let dy = e.clientY - joyCenter.y;
  const max = 46;
  const dist = Math.min(Math.hypot(dx,dy), max);
  const ang = Math.atan2(dy,dx);
  dx = Math.cos(ang)*dist; dy = Math.sin(ang)*dist;
  joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
  moveDir.x = dx/max;
  moveDir.z = dy/max;
}
function joyEnd(e){
  if(e.pointerId!==joyId) return;
  joyActive = false;
  joyKnob.style.transform = "translate(0,0)";
  moveDir.x = 0; moveDir.z = 0;
}
joyBase.addEventListener("pointerdown", joyStart);
window.addEventListener("pointermove", joyMove);
window.addEventListener("pointerup", joyEnd);
window.addEventListener("pointercancel", joyEnd);

/* ============================================================
   KAMERA-ORBIT — mit dem Finger/der Maus auf die 3D-Ansicht ziehen,
   um die Kamera um den Spieler zu drehen (behebt "sehe nur die
   Rückseite" — die Kamera hing vorher an einer festen Weltrichtung).
   ============================================================ */
export const camYaw = { value: 0 };
const canvasWrap = document.getElementById("canvasWrap");
let camDragActive = false, camDragId = null, camDragLastX = 0;

function camDragStart(e){
  if(e.target !== canvasWrap && e.target.tagName !== "CANVAS") return;
  camDragActive = true;
  camDragId = e.pointerId;
  camDragLastX = e.clientX;
  canvasWrap.setPointerCapture(camDragId);
}
function camDragMove(e){
  if(!camDragActive || e.pointerId !== camDragId) return;
  const dx = e.clientX - camDragLastX;
  camDragLastX = e.clientX;
  camYaw.value -= dx * 0.008;
}
function camDragEnd(e){
  if(e.pointerId !== camDragId) return;
  camDragActive = false;
}
canvasWrap.addEventListener("pointerdown", camDragStart);
window.addEventListener("pointermove", camDragMove);
window.addEventListener("pointerup", camDragEnd);
window.addEventListener("pointercancel", camDragEnd);

const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()]=true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()]=false);
export function keyboardVector(){
  let x=0,z=0;
  if(keys["a"]||keys["arrowleft"]) x-=1;
  if(keys["d"]||keys["arrowright"]) x+=1;
  if(keys["w"]||keys["arrowup"]) z-=1;
  if(keys["s"]||keys["arrowdown"]) z+=1;
  return {x,z};
}

import * as THREE from "three";

/* ============================================================
   PROZEDURALE TEXTUREN & TOON-HELPER
   Alles wird zur Laufzeit auf <canvas> gezeichnet — keine
   externen Bild-Assets nötig, bleibt 0€/offline-fähig.
   ============================================================ */

function canvas(size = 128){
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

/* Weicher 3-Stufen-Grauverlauf fürs Toon-Shading (Cel-Shading-Look) */
export function createToonGradientMap(){
  const c = canvas(4);
  c.height = 1;
  const ctx = c.getContext("2d");
  const bands = [70, 150, 210, 255];
  bands.forEach((v,i)=>{ ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(i,0,1,1); });
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

/* Weicher Schatten-Blob (statt hartem Kreis) */
export function createShadowTexture(){
  const c = canvas(128);
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(64,64,0,64,64,64);
  grad.addColorStop(0, "rgba(0,0,0,0.42)");
  grad.addColorStop(0.7, "rgba(0,0,0,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

/* Vertikaler Himmel-Verlauf */
export function createSkyTexture(top="#5FB4E8", bottom="#DCF3FF"){
  const c = canvas(256);
  c.width = 8; c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0,0,0,256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,8,256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Gras mit leichten Farbflecken für Bodendetail */
export function createGrassTexture(base="#6bbf59", accent="#5aa84a"){
  const c = canvas(256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0,0,256,256);
  ctx.fillStyle = accent;
  for(let i=0;i<70;i++){
    const x = Math.random()*256, y = Math.random()*256, r = 4+Math.random()*10;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.ellipse(x,y,r,r*0.6,Math.random()*Math.PI,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Kopfsteinpflaster für Altstadt-Zonen und Plätze */
export function createCobbleTexture(base="#dcc9a3", line="#c9b287"){
  const c = canvas(128);
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0,0,128,128);
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  for(let y=0; y<=128; y+=16){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(128,y); ctx.stroke();
  }
  for(let x=0; x<=128; x+=16){
    const offset = (x/16)%2===0 ? 0 : 8;
    ctx.beginPath(); ctx.moveTo(x,offset); ctx.lineTo(x,128); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Straßenbelag — dezenter, gräulicher als der Altstadt-Cobble */
export function createRoadTexture(){
  const c = canvas(64);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#b9b0c2";
  ctx.fillRect(0,0,64,64);
  ctx.strokeStyle = "#a89ebd";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(32,0); ctx.lineTo(32,64); ctx.stroke();
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Echter grauer Asphalt mit feinem Kies-Rauschen — für die Luitpoldstraße */
export function createAsphaltTexture(){
  const c = canvas(128);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#4a4750";
  ctx.fillRect(0,0,128,128);
  for(let i=0;i<600;i++){
    const x = Math.random()*128, y = Math.random()*128;
    const v = 55 + Math.random()*40;
    ctx.fillStyle = `rgba(${v},${v},${v+4},${0.15+Math.random()*0.2})`;
    ctx.fillRect(x,y,1.4,1.4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Gehweg-Pflaster (grauer Fischgrät-Verbund) für Bürgersteige */
export function createSidewalkTexture(){
  const c = canvas(64);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c7c2c9";
  ctx.fillRect(0,0,64,64);
  ctx.strokeStyle = "#a9a3ad";
  ctx.lineWidth = 2;
  const s = 8;
  for(let y=0;y<64;y+=s){
    for(let x=0;x<64;x+=s){
      const off = ((x/s)+(y/s))%2===0;
      ctx.save();
      ctx.translate(x+s/2,y+s/2);
      ctx.rotate(off?Math.PI/4:-Math.PI/4);
      ctx.strokeRect(-s/2,-s/2,s,s);
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Wasser mit leichtem Wellen-Streifenmuster */
export function createWaterTexture(){
  const c = canvas(128);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2f7fb3";
  ctx.fillRect(0,0,128,128);
  ctx.strokeStyle = "#4a9bd1";
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 3;
  for(let y=10; y<128; y+=18){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.bezierCurveTo(32,y-8,96,y+8,128,y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================
   TOON-MATERIAL + OUTLINE — der "clean cartoon" Look
   ============================================================ */
let gradientMap = null;
export function getGradientMap(){
  if(!gradientMap) gradientMap = createToonGradientMap();
  return gradientMap;
}
export function toonMaterial(color, opts = {}){
  return new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap(), map: opts.map || null });
}

const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1424, side: THREE.BackSide });

/* Hängt eine schwarze "Inverted Hull"-Outline an dieselbe Gruppe wie `mesh`. */
export function addOutline(mesh, group, thickness = 0.045){
  const outline = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.copy(mesh.scale).multiplyScalar(1 + thickness);
  group.add(outline);
  return outline;
}

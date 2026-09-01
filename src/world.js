import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  toonMaterial, addOutline, getGradientMap,
  createSkyTexture, createGrassTexture, createShadowTexture,
  createAsphaltTexture, createSidewalkTexture
} from "./textures.js";

export const canvasWrap = document.getElementById("canvasWrap");
export const scene = new THREE.Scene();

const skyTex = createSkyTexture();
scene.background = skyTex;
scene.fog = new THREE.Fog(0xdcf3ff, 60, 220);

export const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 400);
export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
canvasWrap.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb8c9, 1.05));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.0);
sun.position.set(40, 60, 20);
scene.add(sun);

const shadowTex = createShadowTexture();

export function fakeShadow(x,z,r){
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r*2.1, r*2.1),
    new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false})
  );
  m.rotation.x = -Math.PI/2;
  m.position.set(x, 0.02, z);
  scene.add(m);
  return m;
}

function rbox(w,h,d,radius=0.18,seg=2){
  return new RoundedBoxGeometry(w,h,d,seg,radius);
}

function addPart(group, geo, color){
  const mesh = new THREE.Mesh(geo, toonMaterial(color));
  group.add(mesh);
  addOutline(mesh, group);
  return mesh;
}

function tiled(tex, repeatX, repeatY){
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}

/* ============================================================
   LUITPOLDSTRASSE — der komplette echte Straßenverlauf, aus
   den tatsächlichen Adress-Koordinaten (Google Street View)
   von "Modehaus Bullinger" (Süden, Münchener Str.) bis zum
   "Neo Kastro"/Donaukai im Norden, inkl. der Rechtskurve am
   Schloss vorbei zur Donau. Jeder Punkt entspricht einer real
   begangenen Hausnummer. Positionen ~0.6x echte Meter, Ursprung
   bei Karlsplatz (48.73738, 11.17858).
   ============================================================ */
export const LUITPOLD_PATH = [
  { x: 59.0,  z: 211.7, note:"Bullinger/Münchener Str (Start)" },
  { x: 63.0,  z: 192.0, note:"Treppen-Ladenzeile Anfang" },
  { x: 67.4,  z: 173.1, note:"80 — Oracle/Bäckerei" },
  { x: 73.4,  z: 166.3, note:"79" },
  { x: 77.6,  z: 161.9, note:"78" },
  { x: 81.9,  z: 157.4, note:"77 — Mauer/Efeu beginnt" },
  { x: 90.7,  z: 148.5, note:"75 — Optik" },
  { x: 107.7, z: 129.3, note:"74 — Rosenstraße/Betten Uerheimer" },
  { x: 117.1, z: 113.6, note:"73" },
  { x: 125.7, z: 97.2,  note:"70 — VR Bank / Herrnbräu-Café" },
  { x: 131.0, z: 78.9,  note:"66 — Backhaus Hackner" },
  { x: 133.4, z: 73.3,  note:"66 Fortsetzung" },
  { x: 137.9, z: 62.1,  note:"Schloss-Nahblick" },
  { x: 143.9, z: 50.4,  note:"IL Pinguino" },
  { x: 147.4, z: 38.0,  note:"65" },
  { x: 148.9, z: 11.0,  note:"2" },
  { x: 153.7, z: 5.0,   note:"1 — Schloss-Basis" },
  { x: 156.1, z: -0.84, note:"Oskar-Wittmann-Str" },
  { x: 158.9, z: -6.43 },
  { x: 161.6, z: -11.6 },
  { x: 164.8, z: -16.2 },
  { x: 169.4, z: -20.7, note:"Flussuferzone" },
  { x: 176.4, z: -17.4, note:"Neo Kastro / Donaukai (Ziel)" }
];

const ROAD_W = 10.5, WALK_W = 2.6;
const SHOP_SIDE = 1;   // recherchierte Häuserzeile
const WALL_SIDE = -1;  // Mauer / Schloss / Donauseite

/* Segmentlänge + kumulierte Distanz für Platzierung "irgendwo entlang der Strecke" */
const SEG = [];
let cum = 0;
for(let i=0;i<LUITPOLD_PATH.length-1;i++){
  const a = LUITPOLD_PATH[i], b = LUITPOLD_PATH[i+1];
  const dx = b.x-a.x, dz = b.z-a.z, len = Math.hypot(dx,dz);
  SEG.push({ dirx: dx/len, dirz: dz/len, perpx: -dz/len, perpz: dx/len, len, from: cum, to: cum+len, a, b });
  cum += len;
}
const PATH_LEN = cum;

/* Richtung/Perpendikulare an einem Wegpunkt-Index — nimmt bewusst NUR ein
   angrenzendes Segment (nicht den Mittelwert beider), weil das Mitteln an
   scharfen Kurven eine völlig falsche Richtung ergeben kann. */
function pathDir(index){
  const seg = SEG[index] || SEG[index-1];
  return { dirx: seg.dirx, dirz: seg.dirz, perpx: seg.perpx, perpz: seg.perpz };
}

/* Position + Richtung an Distanz `d` entlang der ganzen Strecke (für Laternen/Autos/Bäume) */
function atDist(d, side = 0, sideOffset = 0){
  d = Math.max(0, Math.min(PATH_LEN, d));
  const seg = SEG.find(s => d <= s.to) || SEG[SEG.length-1];
  const local = d - seg.from;
  const x = seg.a.x + seg.dirx*local + seg.perpx*side*sideOffset;
  const z = seg.a.z + seg.dirz*local + seg.perpz*side*sideOffset;
  return { x, z, perpx: seg.perpx, perpz: seg.perpz, dirx: seg.dirx, dirz: seg.dirz };
}

/* Position + Richtung an einem konkreten Wegpunkt-Index (für recherchierte Einzelgebäude) */
function atIndex(index, side = 0, sideOffset = 0){
  const p = LUITPOLD_PATH[index];
  const d = pathDir(index);
  return { x: p.x + d.perpx*side*sideOffset, z: p.z + d.perpz*side*sideOffset, perpx: d.perpx, perpz: d.perpz };
}

/* rotation.y, damit die lokale +Z-Achse (Fassaden-Vorderseite) zur Straßenmitte zeigt */
function facingRoadAngle(perpx, perpz, side){
  return Math.atan2(-side*perpx, -side*perpz);
}
/* rotation.y, damit die lokale +X-Achse (lange Kante, z.B. Mauer/Geländer) parallel zur Straße liegt */
function alongRoadAngle(dirx, dirz){
  return Math.atan2(-dirz, dirx);
}

function flatSegment(ax, az, bx, bz, width, mat, y = 0){
  const dx = bx-ax, dz = bz-az;
  const dist = Math.hypot(dx,dz);
  if(dist < 0.01) return null;
  const geo = new THREE.PlaneGeometry(dist, width);
  geo.rotateX(-Math.PI/2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((ax+bx)/2, y, (az+bz)/2);
  mesh.rotation.y = Math.atan2(-dz, dx);
  scene.add(mesh);
  return mesh;
}

/* Die Straße als EIN durchgehendes, weiches Band entlang einer Kurve durch alle
   Wegpunkte — statt einzelner gerader Segmente mit Flicken an den Knicken.
   Das eliminiert Kurven-Risse strukturell, egal wie scharf ein Knick ist. */
const ROAD_CURVE = new THREE.CatmullRomCurve3(
  LUITPOLD_PATH.map(p => new THREE.Vector3(p.x, 0, p.z)), false, "catmullrom", 0.35
);
const CURVE_SAMPLES = Math.max(80, Math.round(PATH_LEN * 1.2));

function sampleCurve(count){
  const out = [];
  for(let i=0;i<=count;i++){
    const u = i/count;
    const pt = ROAD_CURVE.getPointAt(u);
    const tan = ROAD_CURVE.getTangentAt(u);
    const len = Math.hypot(tan.x, tan.z) || 1;
    out.push({ x: pt.x, z: pt.z, dirx: tan.x/len, dirz: tan.z/len, perpx: -tan.z/len, perpz: tan.x/len, u });
  }
  return out;
}

function buildRibbon(samples, width, material, y){
  const pos = [], uv = [], idx = [];
  samples.forEach((s,i)=>{
    pos.push(s.x + s.perpx*width/2, y, s.z + s.perpz*width/2);
    pos.push(s.x - s.perpx*width/2, y, s.z - s.perpz*width/2);
    const v = (s.u * PATH_LEN) / Math.max(1, width);
    uv.push(v,0, v,1);
  });
  for(let i=0;i<samples.length-1;i++){
    const a=i*2,b=i*2+1,c=i*2+2,d=i*2+3;
    idx.push(a,b,c, b,d,c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  scene.add(mesh);
  return mesh;
}

function buildStreetSurface(){
  const samples = sampleCurve(CURVE_SAMPLES);
  const asphaltTex = createAsphaltTexture();
  const sidewalkTex = createSidewalkTexture();

  const roadMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(asphaltTex, PATH_LEN/4, 1), gradientMap: getGradientMap(), side: THREE.DoubleSide });
  buildRibbon(samples, ROAD_W, roadMat, 0);

  const walkMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(sidewalkTex, PATH_LEN/2.5, WALK_W/2.5), gradientMap: getGradientMap(), side: THREE.DoubleSide });
  const offset = ROAD_W/2 + WALK_W/2;
  [1,-1].forEach(side=>{
    const offsetSamples = samples.map(s => ({ ...s, x: s.x + s.perpx*side*offset, z: s.z + s.perpz*side*offset }));
    buildRibbon(offsetSamples, WALK_W, walkMat, 0.006);
  });

  /* gestrichelte Mittellinie */
  const lineMat = new THREE.MeshBasicMaterial({ color:"#f2ead8" });
  const dash = 1.1, gap = 0.9, step = dash+gap;
  for(let d=0; d<PATH_LEN; d+=step){
    const u0 = d/PATH_LEN, u1 = Math.min(PATH_LEN, d+dash)/PATH_LEN;
    const p0 = ROAD_CURVE.getPointAt(u0), p1 = ROAD_CURVE.getPointAt(u1);
    flatSegment(p0.x,p0.z,p1.x,p1.z, 0.22, lineMat, 0.012);
  }
}

/* Neutraler Untergrund — bewusst KEIN Gras überall (das gibt's in echt so nicht).
   Grasflächen kommen nur gezielt dort hin, wo es die Recherche zeigt (Denkmal-Rasen). */
function buildBaseGround(){
  const xs = LUITPOLD_PATH.map(p=>p.x), zs = LUITPOLD_PATH.map(p=>p.z);
  const midX = (Math.min(...xs)+Math.max(...xs))/2, midZ = (Math.min(...zs)+Math.max(...zs))/2;
  const w = (Math.max(...xs)-Math.min(...xs)) + 90, h = (Math.max(...zs)-Math.min(...zs)) + 60;
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateX(-Math.PI/2);
  const mat = new THREE.MeshToonMaterial({ color:"#b7b0a3", gradientMap: getGradientMap() });
  const ground = new THREE.Mesh(geo, mat);
  ground.position.set(midX, -0.03, midZ);
  scene.add(ground);
}

/* Zebrastreifen: Balken quer über die volle Fahrbahnbreite, mit Lücken in Straßenrichtung, an einem Wegpunkt */
function crosswalk(index){
  const p = LUITPOLD_PATH[index];
  const d = pathDir(index);
  const angle = alongRoadAngle(d.dirx, d.dirz);
  const stripeMat = new THREE.MeshBasicMaterial({ color:"#f2ead8" });
  const stripeThickness = 0.6, gap = 0.55, count = 6;
  const totalSpan = count*stripeThickness + (count-1)*gap;
  for(let i=0;i<count;i++){
    const off = -totalSpan/2 + i*(stripeThickness+gap);
    const geo = new THREE.PlaneGeometry(stripeThickness, ROAD_W*0.86);
    geo.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geo, stripeMat);
    mesh.position.set(p.x + d.dirx*off, 0.014, p.z + d.dirz*off);
    mesh.rotation.y = angle;
    scene.add(mesh);
  }
  /* Verkehrsinsel mit Fußgänger-Schild in der Fahrbahnmitte */
  const island = new THREE.Mesh(rbox(1.8,0.15,ROAD_W*0.5,0.05,1), toonMaterial("#c9c2b6"));
  island.position.set(p.x, 0.075, p.z);
  island.rotation.y = angle;
  scene.add(island); addOutline(island, scene, 0.05);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.6,8), toonMaterial("#2c2a33"));
  pole.position.set(p.x, 0.95, p.z);
  scene.add(pole);
  const sign = new THREE.Mesh(rbox(0.4,0.4,0.04,0.05,1), toonMaterial("#2a5fb8"));
  sign.position.set(p.x, 1.7, p.z);
  scene.add(sign); addOutline(sign, scene, 0.05);
}

function streetLamp(dist, side){
  const p = atDist(dist, side, ROAD_W/2+WALK_W+0.6);
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,4.2,8), toonMaterial("#2c2a33"));
  pole.position.y = 2.1;
  g.add(pole); addOutline(pole, g, 0.06);
  const arm = new THREE.Mesh(rbox(1.1,0.14,0.14,0.05,1), toonMaterial("#2c2a33"));
  arm.position.set(0.5,4.15,0);
  g.add(arm); addOutline(arm, g, 0.06);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8), toonMaterial("#F5E6A8"));
  head.position.set(1.0,3.95,0);
  g.add(head); addOutline(head, g, 0.06);
  g.position.set(p.x,0,p.z);
  g.rotation.y = facingRoadAngle(p.perpx, p.perpz, side);
  scene.add(g);
  fakeShadow(p.x,p.z,0.5);
}

function parkedCar(dist, side, color){
  const p = atDist(dist, side, ROAD_W/2+0.7);
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(1.9,0.75,0.95,0.15,2), toonMaterial(color));
  body.position.y = 0.5;
  g.add(body); addOutline(body, g, 0.05);
  const cabin = new THREE.Mesh(rbox(1.0,0.5,0.85,0.15,2), toonMaterial("#a8d8e8"));
  cabin.position.set(-0.1,1.0,0);
  g.add(cabin); addOutline(cabin, g, 0.05);
  const wheelGeo = new THREE.CylinderGeometry(0.22,0.22,0.18,10);
  [[-0.6,0.5],[-0.6,-0.5],[0.6,0.5],[0.6,-0.5]].forEach(([wx,wz])=>{
    const wheel = new THREE.Mesh(wheelGeo, toonMaterial("#201c26"));
    wheel.rotation.z = Math.PI/2;
    wheel.position.set(wx,0.22,wz);
    g.add(wheel);
  });
  g.position.set(p.x,0,p.z);
  g.rotation.y = alongRoadAngle(p.dirx, p.dirz);
  scene.add(g);
  fakeShadow(p.x,p.z,1.3);
}

function ivyWallSegment(dist){
  const p = atDist(dist, WALL_SIDE, ROAD_W/2+WALK_W+1.2);
  const wall = new THREE.Mesh(rbox(4.6,1.6,0.6,0.08,1), toonMaterial("#8f8474"));
  wall.position.set(p.x, 0.8, p.z);
  wall.rotation.y = alongRoadAngle(p.dirx, p.dirz);
  scene.add(wall); addOutline(wall, scene, 0.05);
  const ivy = new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8), toonMaterial("#4f9a4a"));
  ivy.scale.set(1,0.7,0.6);
  ivy.position.set(p.x, 1.5, p.z);
  scene.add(ivy); addOutline(ivy, scene, 0.06);
}

/* Schlichtes Geländer am Gehwegrand — offene Straßenseite / Donauufer */
function railingSegment(d0, d1){
  const steps = Math.max(2, Math.round((d1-d0)/1.4));
  const railMat = toonMaterial("#2c2a33");
  for(let i=0;i<steps;i++){
    const da = d0 + (d1-d0)*(i/steps), db = d0 + (d1-d0)*((i+1)/steps);
    const pa = atDist(da, WALL_SIDE, ROAD_W/2+WALK_W+0.15);
    const pb = atDist(db, WALL_SIDE, ROAD_W/2+WALK_W+0.15);
    const dist = Math.hypot(pb.x-pa.x, pb.z-pa.z);
    const rail = new THREE.Mesh(rbox(dist,0.08,0.06,0.02,1), railMat);
    rail.position.set((pa.x+pb.x)/2, 0.75, (pa.z+pb.z)/2);
    rail.rotation.y = alongRoadAngle(pa.dirx, pa.dirz);
    scene.add(rail); addOutline(rail, scene, 0.04);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.75,6), railMat);
    post.position.set(pa.x, 0.375, pa.z);
    scene.add(post);
  }
}

/* Krieger-Denkmal-Grünfläche (Obelisk mit Stufen, Fahnen) */
function buildMonumentGreen(index){
  const p = atIndex(index, SHOP_SIDE, ROAD_W/2+WALK_W+7);
  const lawnTex = createGrassTexture("#78c469","#63ab55");
  const lawnMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(lawnTex, 4, 4.4), gradientMap: getGradientMap() });
  const geo = new THREE.PlaneGeometry(18, 20);
  geo.rotateX(-Math.PI/2);
  const lawn = new THREE.Mesh(geo, lawnMat);
  lawn.position.set(p.x, -0.015, p.z);
  scene.add(lawn);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,0.6,8), toonMaterial("#c9c2b6"));
  base.position.set(p.x, 0.3, p.z);
  scene.add(base); addOutline(base, scene, 0.05);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.42,3.2,10), toonMaterial("#d8d2c6"));
  column.position.set(p.x, 2.2, p.z);
  scene.add(column); addOutline(column, scene, 0.05);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5,0.6,10), toonMaterial("#b8ae9e"));
  cap.position.set(p.x, 4.1, p.z);
  scene.add(cap); addOutline(cap, scene, 0.05);
  fakeShadow(p.x,p.z,1.8);

  [[-3.5,2.8],[3.6,-2.4]].forEach(([ox,oz])=>{
    const tx = p.x+ox, tz = p.z+oz;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.26,1.7,7), toonMaterial("#8a5a3a"));
    trunk.position.set(tx,0.85,tz);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8), toonMaterial("#4f9a4a"));
    leaves.position.set(tx,2.3,tz);
    scene.add(leaves); addOutline(leaves, scene, 0.06);
    fakeShadow(tx,tz,1.2);
  });
}

/* Vielseitiger Baustein für die recherchierten Einzelgebäude (Bullinger, Wiedemann&Roßkopf,
   Quartier Luitpold, Betten Uerheimer, VR Bank, IL Pinguino, Oskar's Bar, ...) */
function heroBuilding(index, side, setback, opts){
  const { w=6.5, h=4.6, d=3.8, color, trim="#f2ead8", roof, dormer=true, awning=false,
          balcony=false, shopband=true, windowColor="#bfe3f0" } = opts;
  const p = atIndex(index, side, setback);
  const angle = facingRoadAngle(p.perpx, p.perpz, side);
  const roofColor = roof || shade(color, 0.55);
  const g = new THREE.Group();
  addPart(g, rbox(w,h,d,0.1,2), color).position.y = h/2;
  addPart(g, rbox(w+0.4,0.5,d+0.4,0.1,2), roofColor).position.y = h+0.25;
  if(dormer){
    const n = w > 8 ? 3 : 1;
    const spread = w*0.32;
    for(let i=0;i<n;i++){
      const dx = n===1 ? 0 : (i/(n-1)-0.5)*2*spread;
      addPart(g, rbox(w*0.16,0.85,0.7,0.08,1), roofColor).position.set(dx, h+0.75, d*0.28);
    }
  }
  if(balcony){
    addPart(g, rbox(w*0.32,0.13,0.55,0.04,1), "#a8a196").position.set(0, h*0.62, d/2+0.3);
  }
  if(awning){
    const aw = addPart(g, rbox(w*0.85,0.28,1.3,0.08,1), "#241e2c");
    aw.position.set(0, h*0.55, d/2+0.55); aw.rotation.x = -0.32;
  }
  if(shopband){
    addPart(g, rbox(w*0.86,1.3,0.1,0.05,1), "#241e2c").position.set(0, 1.0, d/2-0.08);
    [-w*0.24, w*0.24].forEach(dx=>{
      addPart(g, rbox(w*0.18,1.1,0.06,0.06,1), windowColor).position.set(dx, 1.05, d/2-0.02);
    });
  }
  g.position.set(p.x,0,p.z);
  g.rotation.y = angle;
  scene.add(g);
  fakeShadow(p.x,p.z, Math.max(w,d)*0.6);
  return { x:p.x, z:p.z, angle };
}

/* "70 Luitpoldstraße": großes cremefarbenes Eckhaus, dunkles Mansarddach, Gauben, Balkon */
function buildGrandBuilding(index, side, setback){
  const p = atIndex(index, side, setback);
  const angle = facingRoadAngle(p.perpx, p.perpz, side);
  const g = new THREE.Group();
  addPart(g, rbox(8.5,5.2,4.6,0.1,2), "#e9e2cf").position.y = 2.6;
  const mansard = addPart(g, rbox(9.0,1.7,5.0,0.12,2), "#5a3a35");
  mansard.position.y = 6.05;
  [-2.6,0,2.6].forEach(dx=>{
    const dm = addPart(g, rbox(1.3,0.9,0.8,0.08,1), "#5a3a35");
    dm.position.set(dx, 6.55, 2.35);
  });
  const balcony = addPart(g, rbox(2.2,0.15,0.6,0.05,1), "#a8a196");
  balcony.position.set(0, 3.3, 2.35);
  const archDoor = addPart(g, rbox(1.3,2.2,0.1,0.3,2), "#2c2430");
  archDoor.position.set(0, 1.1, 2.32);
  g.position.set(p.x,0,p.z);
  g.rotation.y = angle;
  scene.add(g);
  fakeShadow(p.x,p.z,5.2);
}

/* "75 Luitpoldstraße": weißes Haus mit Ladenfront ("Optik"), eine Gaube */
function buildOptikBuilding(index, side, setback){
  const p = atIndex(index, side, setback);
  const angle = facingRoadAngle(p.perpx, p.perpz, side);
  const g = new THREE.Group();
  addPart(g, rbox(6.5,4.6,3.8,0.1,2), "#f2ead8").position.y = 2.3;
  const roof = addPart(g, rbox(6.9,1.1,4.1,0.1,2), "#6b4a3a");
  roof.position.y = 5.15;
  addPart(g, rbox(1.2,0.85,0.75,0.08,1), "#6b4a3a").position.set(0, 5.65, 1.75);
  const shopband = addPart(g, rbox(6.0,1.5,0.1,0.05,1), "#2c2430");
  shopband.position.set(0, 1.1, 1.92);
  [-1.9,1.9].forEach(dx=>{
    addPart(g, rbox(1.4,1.2,0.06,0.05,1), "#bfe3f0").position.set(dx, 1.15, 1.96);
  });
  g.position.set(p.x,0,p.z);
  g.rotation.y = angle;
  scene.add(g);
  fakeShadow(p.x,p.z,4.2);
}

/* Backhaus Hackner: blaues Jugendstil-Eckhaus mit rundem Erker */
function buildBackhausHackner(index, side, setback){
  const p = atIndex(index, side, setback);
  const angle = facingRoadAngle(p.perpx, p.perpz, side);
  const g = new THREE.Group();
  addPart(g, rbox(7,6.2,4.2,0.12,2), "#a8c4dc").position.y = 3.1;
  addPart(g, rbox(7.4,0.5,4.6,0.1,2), "#7a3a30").position.y = 6.5;
  [-2.3,0,2.3].forEach(dx=>{
    addPart(g, rbox(1.3,0.9,0.8,0.08,1), "#7a3a30").position.set(dx, 7.0, 1.9);
  });
  const bay = addPart(g, new THREE.CylinderGeometry(1.2,1.2,3.0,8,1,false,-Math.PI/3,2*Math.PI/3), "#a8c4dc");
  bay.position.set(0, 4.2, 2.1);
  addPart(g, rbox(5.4,1.3,0.1,0.05,1), "#2c2430").position.set(0, 1.0, 2.02);
  g.position.set(p.x,0,p.z);
  g.rotation.y = angle;
  scene.add(g);
  fakeShadow(p.x,p.z,4.6);
}

/* Schloss Neuburg — vereinfachter, aber richtig proportionierter Fernblick-Baukörper:
   langgestreckter weißer Riegel, rotes Ziegeldach, zwei runde Ecktürme mit grünen Kuppeln. */
function buildSchlossBackdrop(index, side, setback){
  const p = atIndex(index, side, setback);
  const angle = facingRoadAngle(p.perpx, p.perpz, side);
  const g = new THREE.Group();
  const W = 46, H = 15, D = 16;
  addPart(g, rbox(W,H,D,0.15,2), "#f2ede0").position.y = H/2;
  addPart(g, rbox(W+0.6,1.6,D+0.6,0.1,2), "#a8402c").position.y = H+0.9;
  [-W*0.5+3.2, W*0.5-3.2].forEach(dx=>{
    const tower = addPart(g, new THREE.CylinderGeometry(3.1,3.4,H+3,16), "#f2ede0");
    tower.position.set(dx, (H+3)/2, D*0.15);
    const dome = addPart(g, new THREE.ConeGeometry(3.4,3.6,16), "#5a8f6a");
    dome.position.set(dx, H+3+1.6, D*0.15);
    const spike = addPart(g, new THREE.CylinderGeometry(0.06,0.06,1.0,6), "#3a3244");
    spike.position.set(dx, H+3+3.6, D*0.15);
  });
  for(let i=-3;i<=3;i++){
    addPart(g, rbox(1.6,2.2,0.1,0.05,1), "#7fb6d9").position.set(i*5.4, H*0.5, D/2+0.02);
  }
  g.position.set(p.x,0,p.z);
  g.rotation.y = angle;
  scene.add(g);
  fakeShadow(p.x,p.z,20);
}

/* "The Oracle": Lachs-Fassade, dunkle Ladenfront, Markise, Bordeaux-Stühle + Holztische */
/* "78 Luitpoldstraße" — lange lachsfarbene Ladenzeile unter einem Dach:
   links "Tabak & Shisha" (3 große Schaufenster), rechts "Oracle" Eiscafé
   mit rotem Rundlogo, roten Stühlen und dunklen Tischen davor. Oben EINE
   Fensterreihe mit weißen Giebel-Bögen (manche mit grauem Rollladen).
   Maße aus Street View mit Türbreite (~0.9 m) als Referenz abgeschätzt:
   Fassade ~17-18 m breit -> 10.5 Welteinheiten. */
function buildOracleBuilding(index, side, setback){
  const p = atIndex(index, side, setback);
  const faceAngle = facingRoadAngle(p.perpx, p.perpz, side);
  const W = 10.6, H = 3.6, D = 4.6;
  const g = new THREE.Group();

  addPart(g, rbox(W,H,D,0.06,2), "#E8896B").position.y = H/2;
  addPart(g, rbox(W+0.3,0.3,D+0.3,0.05,2), "#f2ead8").position.y = H+0.15; // flaches Traufband, kein Spitzdach

  /* Fensterreihe oben: 7 Fenster mit weißem Giebelbogen, manche mit Rollladen */
  const winCount = 7;
  for(let i=0;i<winCount;i++){
    const dx = -W/2 + W/(winCount+1)*(i+1);
    const shuttered = i % 3 === 1;
    addPart(g, rbox(0.72,0.9,0.08,0.03,1), shuttered ? "#8a8478" : "#3a5a72").position.set(dx, H*0.72, D/2-0.02);
    addPart(g, rbox(0.86,0.12,0.1,0.03,1), "#f2ead8").position.set(dx, H*0.72-0.51, D/2-0.02);
    const pediment = addPart(g, new THREE.ConeGeometry(0.5,0.3,3), "#f2ead8");
    pediment.position.set(dx, H*0.72+0.56, D/2-0.02);
    pediment.rotation.z = Math.PI;
    pediment.rotation.y = Math.PI/2;
  }

  /* Ladenzeile unten: links "Tabak & Shisha" (3 breite Fenster), rechts "Oracle" schmaler */
  addPart(g, rbox(W*0.62,1.7,0.12,0.04,1), "#241e2c").position.set(-W*0.16, 1.05, D/2-0.02);
  [-W*0.35,-W*0.16,W*0.03].forEach(dx=>{
    addPart(g, rbox(W*0.16,1.35,0.05,0.03,1), "#2a2a3a").position.set(dx, 1.1, D/2+0.02);
  });
  addPart(g, rbox(W*0.28,1.7,0.12,0.04,1), "#2c2430").position.set(W*0.34, 1.05, D/2-0.02);
  addPart(g, rbox(W*0.22,1.35,0.05,0.03,1), "#2a2a3a").position.set(W*0.34, 1.1, D/2+0.02);
  const logo = addPart(g, new THREE.CylinderGeometry(0.42,0.42,0.08,16), "#8B2E3C");
  logo.rotation.x = Math.PI/2;
  logo.position.set(-W*0.44, 2.0, D/2+0.05);

  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512; signCanvas.height = 96;
  const sctx = signCanvas.getContext("2d");
  sctx.fillStyle = "#8B2E3C"; sctx.fillRect(0,0,512,96);
  sctx.fillStyle = "#f2ead8"; sctx.font = "bold 44px 'Space Grotesk', sans-serif"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.fillText("ORACLE", 256, 50);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(W*0.24,0.55), new THREE.MeshBasicMaterial({ map: signTex, transparent:true }));
  signMesh.position.set(W*0.34, 1.95, D/2+0.06);
  g.add(signMesh);

  g.position.set(p.x,0,p.z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(p.x,p.z,6.2);

  /* rote Stühle + dunkle Tischchen vor dem Oracle-Teil (rechte Fassadenhälfte) */
  const dirx = Math.sin(faceAngle), dirz = Math.cos(faceAngle);
  const sidex = Math.cos(faceAngle), sidez = -Math.sin(faceAngle);
  const tableTop = new THREE.CylinderGeometry(0.35,0.35,0.05,14);
  const tableLeg = new THREE.CylinderGeometry(0.04,0.04,0.68,8);
  const chairSeat = new THREE.BoxGeometry(0.36,0.06,0.36);
  const chairBack = new THREE.BoxGeometry(0.36,0.42,0.05);
  [W*0.20, W*0.40].forEach(lx=>{
    const tx = p.x + dirx*2.6 + sidex*lx, tz = p.z + dirz*2.6 + sidez*lx;
    const table = new THREE.Mesh(tableTop, toonMaterial("#2c2430"));
    table.position.set(tx,0.68,tz);
    scene.add(table); addOutline(table, scene, 0.04);
    const leg = new THREE.Mesh(tableLeg, toonMaterial("#2c2430"));
    leg.position.set(tx,0.34,tz);
    scene.add(leg);
    [[-0.5,-0.15],[0.5,-0.15]].forEach(([cx,cz])=>{
      const seat = new THREE.Mesh(chairSeat, toonMaterial("#B23A3A"));
      seat.position.set(tx+cx,0.4,tz+cz);
      scene.add(seat); addOutline(seat, scene, 0.04);
      const back = new THREE.Mesh(chairBack, toonMaterial("#B23A3A"));
      back.position.set(tx+cx*1.2,0.62,tz+cz*1.2-0.15);
      back.lookAt(tx,0.62,tz);
      scene.add(back); addOutline(back, scene, 0.04);
    });
    fakeShadow(tx,tz,0.9);
  });

  return p;
}

/* Generisches Reihenhaus zum Lückenfüllen — damit die Straße durchgehend bebaut wirkt,
   statt einzelne Häuser auf freiem Feld. Variiert Farbe/Dachform leicht pro Aufruf. */
function fillerRowHouse(dist, side, color, tall){
  const setback = ROAD_W/2 + WALK_W + (tall ? 3.6 : 3.0);
  const p = atDist(dist, side, setback);
  const g = new THREE.Group();
  const h = tall ? 4.6 : 3.6;
  addPart(g, rbox(5.4, h, 3.4, 0.1, 2), color).position.y = h/2;
  const roofColor = shade(color, 0.6);
  addPart(g, rbox(5.7, 0.5, 3.7, 0.08, 2), roofColor).position.y = h+0.25;
  const shopband = addPart(g, rbox(4.8,1.3,0.1,0.05,1), "#241e2c");
  shopband.position.set(0, 1.0, 1.72);
  [-1.6,1.6].forEach(dx=>{
    addPart(g, rbox(1.1,1.1,0.06,0.06,1), "#a8d8e8").position.set(dx, h*0.62, 1.76);
  });
  g.position.set(p.x,0,p.z);
  g.rotation.y = facingRoadAngle(p.perpx, p.perpz, side);
  scene.add(g);
  fakeShadow(p.x,p.z,3.4);
}

function shade(hex, amt){
  const c = new THREE.Color(hex);
  c.multiplyScalar(amt);
  return c;
}

const distAtIndex = (i) => i===0 ? 0 : SEG[i-1].to;

function buildLuitpoldstrasse(){
  buildBaseGround();
  buildStreetSurface();

  const heroDistances = [];
  const markHero = (i) => heroDistances.push(distAtIndex(i));

  /* --- Süden: Bullinger-Kreuzung --- */
  heroBuilding(0, SHOP_SIDE, ROAD_W/2+WALK_W+3.4, { w:7.5, h:5.4, d:4.2, color:"#c9b79a", trim:"#8a7a5c", dormer:false, shopband:true, windowColor:"#dfe4e2" });
  markHero(0);
  heroBuilding(0, WALL_SIDE, ROAD_W/2+WALK_W+3.2, { w:7.8, h:6.0, d:4.4, color:"#e9e5da", trim:"#c9c2b0", dormer:false, shopband:true });
  markHero(0);
  heroBuilding(1, SHOP_SIDE, ROAD_W/2+WALK_W+3.0, { w:5.6, h:4.4, d:3.4, color:"#8fa682", trim:"#f2ead8", shopband:true }); // Wiedemann & Roßkopf
  markHero(1);

  /* --- Aufgang zur Ladenzeile mit Treppe (zwischen 0 und 2) --- */
  const stairsBase = atDist((distAtIndex(1)+distAtIndex(2))/2, SHOP_SIDE, ROAD_W/2+WALK_W+0.2);
  const stairs = new THREE.Mesh(rbox(3.2,1.1,2.6,0.1,2), toonMaterial("#c9c2b6"));
  stairs.position.set(stairsBase.x, 0.55, stairsBase.z);
  scene.add(stairs); addOutline(stairs, scene, 0.05);
  railingSegment(distAtIndex(1)+2, distAtIndex(2)-2);

  /* --- "80" The Oracle / Bäckerei mit roten Bänken --- */
  const oraclePos = buildOracleBuilding(2, SHOP_SIDE, ROAD_W/2+WALK_W+3.8);
  markHero(2);
  /* --- "75" Optik --- */
  buildOptikBuilding(6, SHOP_SIDE, ROAD_W/2+WALK_W+4.2);
  markHero(6);
  /* --- "74" Rosenstraße-Ecke, Betten Uerheimer --- */
  heroBuilding(7, SHOP_SIDE, ROAD_W/2+WALK_W+4.0, { w:8.2, h:5.0, d:4.4, color:"#e0c368", trim:"#8a6a3a", dormer:true, shopband:true });
  markHero(7);
  crosswalk(7);
  /* --- "70" VR Bank + Herrnbräu-Café / großes Eckhaus --- */
  buildGrandBuilding(9, SHOP_SIDE, ROAD_W/2+WALK_W+4.6);
  markHero(9);
  heroBuilding(9, SHOP_SIDE, ROAD_W/2+WALK_W+9.5, { w:5.5, h:4.0, d:3.4, color:"#f2ead8", trim:"#8a2a2a", roof:"#8a2a2a", awning:true, dormer:false });
  markHero(9);
  buildMonumentGreen(9);
  /* --- "66" Backhaus Hackner (blaues Jugendstilhaus) --- */
  buildBackhausHackner(10, SHOP_SIDE, ROAD_W/2+WALK_W+4.2);
  markHero(10);
  /* --- IL Pinguino Eiscafé --- */
  heroBuilding(13, SHOP_SIDE, ROAD_W/2+WALK_W+3.6, { w:5.0, h:5.2, d:3.4, color:"#e9e5da", trim:"#c9c2b0", awning:true, dormer:false });
  markHero(13);
  /* --- Schloss: großer Fernblick-Baukörper auf der gegenüberliegenden Seite,
     deutlich zurückgesetzt (steht in echt auf einem Felsen, nicht am Bordstein) --- */
  buildSchlossBackdrop(11, WALL_SIDE, ROAD_W/2+WALK_W+38);
  /* --- Oskar's Bar, Übergang zur Flusspromenade --- */
  heroBuilding(16, SHOP_SIDE, ROAD_W/2+WALK_W+3.4, { w:6.5, h:6.5, d:4.0, color:"#e9dfc0", trim:"#c9bfa0", dormer:true, shopband:true });
  markHero(16);

  /* --- Lücken auf der Ladenseite mit eng anliegenden Reihenhäusern schließen --- */
  const shopPalette = ["#D9A441","#C9A98B","#E8C77E","#B5562F","#dcd0b8"];
  let colorIdx = 0;
  for(let d = 8; d <= PATH_LEN-8; d += 6.0){
    if(heroDistances.some(hd => Math.abs(hd-d) < 7)) continue;
    fillerRowHouse(d, SHOP_SIDE, shopPalette[colorIdx % shopPalette.length], colorIdx % 2 === 0);
    colorIdx++;
  }

  /* --- Efeu-Mauer entlang der recherchierten Rot-Laub-Strecke (77-75) --- */
  const wallFrom = distAtIndex(4), wallTo = distAtIndex(6);
  for(let d = wallFrom; d <= wallTo; d += 6.5) ivyWallSegment(d);

  /* --- Donauufer-Promenade: Geländer + Bänke am Nordende --- */
  railingSegment(distAtIndex(17), PATH_LEN-2);
  [18,19,20,21].forEach(i=>{
    const p = atIndex(i, WALL_SIDE, ROAD_W/2+WALK_W+1.4);
    const bench = new THREE.Mesh(rbox(1.4,0.5,0.55,0.08,1), toonMaterial("#6b4a3a"));
    bench.position.set(p.x,0.28,p.z);
    bench.rotation.y = facingRoadAngle(p.perpx,p.perpz,WALL_SIDE);
    scene.add(bench); addOutline(bench, scene, 0.05);
    fakeShadow(p.x,p.z,1.0);
  });

  /* --- Laternen entlang der ganzen Strecke (keine Autos — auf Wunsch weggelassen) --- */
  for(let d = 10; d <= PATH_LEN-10; d += 16) streetLamp(d, SHOP_SIDE);

  return oraclePos;
}

export function buildWorld(){
  buildLuitpoldstrasse();
}

export const STREET_SPAWN = atDist(distAtIndex(2)+3, WALL_SIDE, ROAD_W/2 + WALK_W/2);

export const BOUNDS = (() => {
  const xs = LUITPOLD_PATH.map(p=>p.x), zs = LUITPOLD_PATH.map(p=>p.z);
  return {
    minX: Math.min(...xs) - 25,
    maxX: Math.max(...xs) + 25,
    minZ: Math.min(...zs) - 15,
    maxZ: Math.max(...zs) + 15
  };
})();

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  toonMaterial, addOutline, getGradientMap,
  createSkyTexture, createGrassTexture, createShadowTexture,
  createAsphaltTexture, createSidewalkTexture
} from "./textures.js";
import { BUILDING_FOOTPRINTS, SURFACE_FEATURES, CROSS_STREETS } from "./planData.js";

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
   LUITPOLDSTRASSE — echte Straßen-Mittellinie aus OpenStreetMap
   (6 zusammenhängende Way-Segmente, per Way-ID verifiziert),
   nicht mehr aus Street-View-Drehungen geschätzt. Maßstab 1:1 —
   1 Einheit = 1 realer Meter. Ursprung bei Karlsplatz
   (48.73738, 11.17858). x = Meter ostwärts, z = Meter südwärts.
   Süden (Bullinger) zuerst, Norden (Donaukai) zuletzt.
   ============================================================ */
export const LUITPOLD_PATH = [
  { x: 83.58,  z: 325.76, note:"Bullinger/Münchener Str (Start)" },
  { x: 90.83,  z: 313.63 },
  { x: 91.70,  z: 312.23 },
  { x: 98.52,  z: 301.27 },
  { x: 114.24, z: 281.37 },
  { x: 138.65, z: 256.44 },
  { x: 147.49, z: 247.40 },
  { x: 162.31, z: 232.46 },
  { x: 174.89, z: 215.84, note:"~80/79/78 — Oracle-Ladenzeile" },
  { x: 185.79, z: 199.64 },
  { x: 201.83, z: 170.55 },
  { x: 212.06, z: 150.86 },
  { x: 217.91, z: 138.76 },
  { x: 225.98, z: 123.41, note:"Rosenstraße-Kreuzung" },
  { x: 230.15, z: 113.58 },
  { x: 232.58, z: 107.39 },
  { x: 238.30, z: 91.40 },
  { x: 243.57, z: 75.75 },
  { x: 246.25, z: 65.34 },
  { x: 248.83, z: 48.22 },
  { x: 250.81, z: 26.41 },
  { x: 251.30, z: 20.07 },
  { x: 251.46, z: 17.94 },
  { x: 252.37, z: 14.68 },
  { x: 254.18, z: 6.26,  note:"Schloss/Donaukai (Ziel)" }
];

/* Geschätzt aus Satellitenbild (Fahrbahn + Gehweg beidseitig), noch nicht
   pro Abschnitt einzeln vermessen — kommt in der nächsten Recherche-Runde. */
const ROAD_W = 8.5, WALK_W = 2.2;
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

/* "79/78 Luitpoldstraße" — nach dem Referenzfoto (Street View, "79 Luitpoldstraße"):
   lange lachsfarbene zweistöckige Ladenzeile. Unten links 3 dunkel gerahmte
   Schaufenster ("Desserts & Baklava / Kaffee & Tee / Backwaren"), rechts das
   "Oracle Kebap & Pizza" mit goldener Schrift auf dunklem Fries. Davor die
   GANZE Fassade entlang eine durchgehende Reihe heller Holztische mit roten
   Stühlen. Oben 9 Fenster mit weißem Rahmen + flachem weißem Giebelbogen,
   ein Teil mit grauem Rollladen runter. Maße per Türbreite (~0.9m) aus
   Street View abgeschätzt: Fassade ~18m -> 10.8 Welteinheiten. */
function buildOracleBuilding(index, side, setback){
  const p = atIndex(index, side, setback);
  const faceAngle = facingRoadAngle(p.perpx, p.perpz, side);
  const H = 3.6, D = 4.2;

  /* Erdgeschoss exakt nach Foto, links -> rechts:
     Schaufenster(3) | Tür | Schaufenster(3) | Schaufenster(groß, Oracle) |
     Tür (Oracle-Eingang, Schild drüber) | Schaufenster(groß, Oracle) | große Doppeltür */
  const segs = [
    { type:"shop3",  w:2.3 },
    { type:"door",   w:0.85 },
    { type:"shop3",  w:2.3 },
    { type:"shopBig", w:2.5, oracle:true },
    { type:"door",   w:1.0, oracle:true },
    { type:"shopBig", w:2.5, oracle:true },
    { type:"dbldoor", w:2.1 }
  ];
  const gap = 0.12;
  const W = segs.reduce((s,seg)=>s+seg.w,0) + gap*(segs.length-1);

  const g = new THREE.Group();
  addPart(g, rbox(W,H,D,0.06,2), "#E8896B").position.y = H/2;

  /* Satteldach mit rötlichen Ziegeln, First läuft parallel zur Fassade —
     kein flaches Traufband mehr, echtes Schrägdach wie auf dem Foto. */
  const roofRise = 1.35, overhang = 0.4;
  const halfD = D/2 + overhang;
  const slopeLen = Math.hypot(halfD, roofRise);
  const slopeAngle = Math.atan2(roofRise, halfD);
  const roofColor = "#a8402c";
  [1,-1].forEach(dir=>{
    const panel = addPart(g, rbox(W+0.5, 0.14, slopeLen, 0.03, 1), roofColor);
    panel.position.set(0, H+roofRise/2, dir*halfD/2);
    panel.rotation.x = dir*slopeAngle;
  });
  addPart(g, rbox(W+0.3,0.22,0.22,0.04,1), "#8a3323").position.set(0, H+roofRise, 0);
  /* kleiner Dach-/Traufversatz mittig — zwei zusammengebaute Häuser */
  addPart(g, rbox(0.5,0.24,D+0.32,0.04,1), "#e2dbc9").position.set(-W*0.12, H+0.05, 0);

  /* Fensterreihe oben: 9 gleichmäßig verteilte Fenster, schlichter weißer Rahmen,
     Kreuzsprosse, 2 davon mit hellem Rollladen runter */
  const winCount = 9;
  for(let i=0;i<winCount;i++){
    const dx = -W/2 + W/(winCount+1)*(i+1);
    const shuttered = i===1 || i===6;
    addPart(g, rbox(0.66,0.92,0.1,0.04,1), "#f2ead8").position.set(dx, H*0.7, D/2-0.03);
    if(shuttered){
      addPart(g, rbox(0.5,0.76,0.05,0.02,1), "#c9c2b0").position.set(dx, H*0.7, D/2+0.02);
    } else {
      addPart(g, rbox(0.5,0.76,0.03,0.02,1), "#4a6b82").position.set(dx, H*0.7, D/2+0.01);
      addPart(g, rbox(0.5,0.05,0.05,0.01,1), "#f2ead8").position.set(dx, H*0.7, D/2+0.03);
      addPart(g, rbox(0.05,0.76,0.05,0.01,1), "#f2ead8").position.set(dx, H*0.7, D/2+0.03);
    }
  }

  /* Erdgeschoss-Segmente aufbauen */
  let cursor = -W/2;
  const oracleSpan = { min: null, max: null };
  segs.forEach(seg=>{
    const cx = cursor + seg.w/2;
    const frameColor = seg.oracle ? "#1c1720" : "#2c2430";
    if(seg.type==="shop3" || seg.type==="shopBig"){
      addPart(g, rbox(seg.w,1.9,0.14,0.04,1), frameColor).position.set(cx, 0.98, D/2-0.03);
      const glassColor = seg.oracle ? "#8fb8cc" : "#bcd9e6";
      if(seg.type==="shop3"){
        const pw = (seg.w-0.16)/3;
        for(let k=0;k<3;k++){
          const px = cursor + 0.08 + pw*(k+0.5);
          addPart(g, rbox(pw*0.9,1.55,0.05,0.02,1), glassColor).position.set(px, 1.05, D/2+0.03);
        }
      } else {
        addPart(g, rbox(seg.w-0.16,1.55,0.05,0.02,1), glassColor).position.set(cx, 1.05, D/2+0.03);
      }
      if(seg.oracle){ if(oracleSpan.min===null) oracleSpan.min = cursor; oracleSpan.max = cursor+seg.w; }
    } else if(seg.type==="door"){
      addPart(g, rbox(seg.w,1.95,0.1,0.03,1), frameColor).position.set(cx, 0.99, D/2-0.02);
      addPart(g, rbox(seg.w-0.12,1.8,0.04,0.02,1), "#7a97a8").position.set(cx, 0.95, D/2+0.02);
      if(seg.oracle){ if(oracleSpan.min===null) oracleSpan.min = cursor; oracleSpan.max = cursor+seg.w; }
    } else if(seg.type==="dbldoor"){
      addPart(g, rbox(seg.w,2.1,0.12,0.03,1), "#1c1720").position.set(cx, 1.06, D/2-0.02);
      addPart(g, rbox(seg.w*0.42,1.9,0.04,0.02,1), "#3a3038").position.set(cx-seg.w*0.24, 1.02, D/2+0.03);
      addPart(g, rbox(seg.w*0.42,1.9,0.04,0.02,1), "#3a3038").position.set(cx+seg.w*0.24, 1.02, D/2+0.03);
    }
    cursor += seg.w + gap;
  });

  /* durchgehende schwarze Markise/Blende über der GESAMTEN Ladenzeile, unter den
     Oberfenstern — kragt vor die Fassade vor, wie im Foto. Niedriger und weiter
     vorne als vorher, damit das Schild AUF der Blende sitzt statt dahinter versteckt. */
  const canopyY = 1.92, canopyH = 0.42, canopyDepth = 0.42;
  const canopyFrontZ = D/2 + canopyDepth - 0.08;
  addPart(g, rbox(W-0.15, canopyH, canopyDepth, 0.03, 1), "#1c1720").position.set(0, canopyY, D/2+canopyDepth/2-0.08);

  /* goldenes Schild "ORACLE Kebap & Pizza" direkt auf der Blende, über dem Oracle-Abschnitt */
  const oracleMid = (oracleSpan.min+oracleSpan.max)/2, oracleW = oracleSpan.max-oracleSpan.min;
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 1024; signCanvas.height = 160;
  const sctx = signCanvas.getContext("2d");
  sctx.fillStyle = "#1c1720"; sctx.fillRect(0,0,1024,160);
  sctx.fillStyle = "#d8b45a"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.font = "italic bold 62px 'Space Grotesk', sans-serif"; sctx.fillText("ORACLE", 512, 58);
  sctx.font = "34px 'Space Grotesk', sans-serif"; sctx.fillText("Kebap & Pizza", 512, 114);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(oracleW*0.9,canopyH*0.85), new THREE.MeshBasicMaterial({ map: signTex, transparent:true }));
  signMesh.position.set(oracleMid, canopyY, canopyFrontZ+0.01);
  g.add(signMesh);

  g.position.set(p.x,0,p.z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(p.x,p.z, W*0.6);

  /* durchgehende Reihe heller Holztische + roter Stühle vor der GANZEN Fassade,
     deutlich vor der Fassade platziert (nicht im Gebäude) */
  const dirx = Math.sin(faceAngle), dirz = Math.cos(faceAngle);
  const sidex = Math.cos(faceAngle), sidez = -Math.sin(faceAngle);
  const tableDist = D/2 + 1.15;
  const tableTop = new THREE.CylinderGeometry(0.32,0.32,0.05,14);
  const tableLeg = new THREE.CylinderGeometry(0.035,0.035,0.68,8);
  const chairSeat = new THREE.BoxGeometry(0.34,0.05,0.34);
  const chairBack = new THREE.BoxGeometry(0.34,0.4,0.04);
  const woodColor = "#c9a876";
  const tableCount = Math.round(W/2.6);
  for(let i=0;i<tableCount;i++){
    const lx = -W/2 + W/(tableCount+1)*(i+1);
    const tx = p.x + dirx*tableDist + sidex*lx, tz = p.z + dirz*tableDist + sidez*lx;
    const table = new THREE.Mesh(tableTop, toonMaterial(woodColor));
    table.position.set(tx,0.68,tz);
    scene.add(table); addOutline(table, scene, 0.04);
    const leg = new THREE.Mesh(tableLeg, toonMaterial(woodColor));
    leg.position.set(tx,0.34,tz);
    scene.add(leg);
    [[-0.42,-0.18],[0.42,-0.18]].forEach(([cx,cz])=>{
      const seat = new THREE.Mesh(chairSeat, toonMaterial("#B23A3A"));
      seat.position.set(tx+cx,0.4,tz+cz);
      scene.add(seat); addOutline(seat, scene, 0.04);
      const back = new THREE.Mesh(chairBack, toonMaterial("#B23A3A"));
      back.position.set(tx+cx*1.15,0.62,tz+cz*1.15-0.13);
      back.lookAt(tx,0.62,tz);
      scene.add(back); addOutline(back, scene, 0.04);
    });
    fakeShadow(tx,tz,0.85);
  }

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

/* ============================================================
   GRUNDRISS-OVERLAY — projiziert die recherchierten OSM-Daten
   (Gebäude-Umrisse, Beläge, Querstraßen aus planData.js) als
   FLACHE Flächen/Linien auf den Boden. Keine 3D-Häuser — nur zum
   Abgleichen "passt der Grundriss zum Satellitenbild", bevor ein
   einziges Haus tatsächlich gebaut wird.
   ============================================================ */
function buildFlatArea(ptsXZ, color, y, opacity){
  const shape = new THREE.Shape(ptsXZ.map(([x,z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI/2);
  geo.translate(0, y, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity, side: THREE.DoubleSide, depthWrite:false });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

function buildFlatRibbon(ptsXZ, width, color, y, opacity){
  if(ptsXZ.length < 2) return null;
  const half = width/2;
  const pos = [], idx = [];
  ptsXZ.forEach((p,i)=>{
    const prev = ptsXZ[Math.max(0,i-1)], next = ptsXZ[Math.min(ptsXZ.length-1,i+1)];
    const dx = next[0]-prev[0], dz = next[1]-prev[1];
    const len = Math.hypot(dx,dz) || 1;
    const nx = -dz/len, nz = dx/len;
    pos.push(p[0]+nx*half, y, p[1]+nz*half);
    pos.push(p[0]-nx*half, y, p[1]-nz*half);
  });
  for(let i=0;i<ptsXZ.length-1;i++){
    const a=i*2,b=i*2+1,c=i*2+2,d=i*2+3;
    idx.push(a,b,c, b,d,c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos,3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity, side: THREE.DoubleSide, depthWrite:false });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

function groundLabel(text, x, z, size, color){
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color; ctx.font = "bold 64px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size*2, size), new THREE.MeshBasicMaterial({ map: tex, transparent:true, depthWrite:false }));
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x, 0.045, z);
  scene.add(mesh);
}

const SURFACE_COLORS = {
  cobblestone_road: "#8a7458", cobblestone_path: "#8a7458",
  asphalt_path: "#3a4652", concrete_path: "#9aa6ac", pebble_path: "#7d8f7a",
  grass_paver: "#6f8f5e", path_other: "#5a6b78", steps: "#c98a3c",
  wall: "#b3543a", grass: "#3f7a46", parking: "#4a5560", water: "#2c5d82"
};
const SURFACE_WIDTH = {
  cobblestone_road: 6.5, cobblestone_path: 2.4, asphalt_path: 2.2,
  concrete_path: 1.8, pebble_path: 1.8, grass_paver: 2.0,
  path_other: 1.8, steps: 2.0, wall: 0.45
};

function buildPlanOverlay(){
  SURFACE_FEATURES.forEach(f => {
    const color = SURFACE_COLORS[f.cat] || "#5a6b78";
    if(f.area){
      buildFlatArea(f.pts, color, f.cat === "grass" ? 0.0 : -0.005, 0.55);
    } else {
      buildFlatRibbon(f.pts, SURFACE_WIDTH[f.cat] || 1.6, color, 0.008, 0.75);
    }
  });

  CROSS_STREETS.forEach(c => {
    buildFlatRibbon(c.pts, 4.5, "#7ea3c7", 0.004, 0.3);
    if(c.pts.length){
      const mid = c.pts[Math.floor(c.pts.length/2)];
      groundLabel(c.name, mid[0], mid[1], 2.2, "#7ea3c7");
    }
  });

  BUILDING_FOOTPRINTS.forEach(b => {
    const fill = b.confirmed ? "#5fe0d8" : "#eaf3fb";
    buildFlatArea(b.pts, fill, 0.02, b.confirmed ? 0.28 : 0.1);
    if(b.housenumber){
      const cx = b.pts.reduce((s,p)=>s+p[0],0)/b.pts.length;
      const cz = b.pts.reduce((s,p)=>s+p[1],0)/b.pts.length;
      groundLabel(b.housenumber, cx, cz, 1.6, b.confirmed ? "#0b2847" : "#3a4a5c");
    }
  });
}

/* Kleine Distanzmarker alle 50m entlang der Straße — nur zur Kontrolle,
   ob die echte Länge/Kurve stimmt, bevor irgendein Haus gebaut wird. */
function buildDistanceMarkers(){
  const markMat = toonMaterial("#c9432f");
  for(let d=0; d<PATH_LEN; d+=50){
    const p = atDist(d, 0, 0);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.2,8), markMat);
    post.position.set(p.x, 0.6, p.z);
    scene.add(post); addOutline(post, scene, 0.03);
  }
}

function buildLuitpoldstrasse(){
  buildBaseGround();
  buildStreetSurface();
  buildDistanceMarkers();
  buildPlanOverlay();

  /* --- Absichtlich NUR Grundriss/Linien: Straße + Gehwege + Meter-Marker.
     Keine Häuser, keine Mauer, kein Schloss — erst wenn diese Form gegen
     das Satellitenbild bestätigt ist, kommt Haus für Haus dazu. --- */
  return atDist(0,0,0);
}

export function buildWorld(){
  buildLuitpoldstrasse();
}

export const STREET_SPAWN = atDist(5, WALL_SIDE, ROAD_W/2 + WALK_W/2);

export const BOUNDS = (() => {
  const xs = LUITPOLD_PATH.map(p=>p.x), zs = LUITPOLD_PATH.map(p=>p.z);
  /* Rand groß genug, damit man auch zu den Grundriss-Kontroll-Flächen
     (Gebäude bis 45m, Querstraßen-Stubs bis 55m von der Mitte) hinlaufen kann. */
  return {
    minX: Math.min(...xs) - 60,
    maxX: Math.max(...xs) + 60,
    minZ: Math.min(...zs) - 60,
    maxZ: Math.max(...zs) + 60
  };
})();

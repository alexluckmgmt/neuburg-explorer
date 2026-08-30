import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LOCATIONS } from "./locations.js";
import {
  toonMaterial, addOutline, getGradientMap,
  createSkyTexture, createGrassTexture, createCobbleTexture,
  createRoadTexture, createWaterTexture, createShadowTexture,
  createAsphaltTexture, createSidewalkTexture
} from "./textures.js";

export const canvasWrap = document.getElementById("canvasWrap");
export const scene = new THREE.Scene();

const skyTex = createSkyTexture();
scene.background = skyTex;
scene.fog = new THREE.Fog(0xdcf3ff, 90, 320);

export const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 500);
export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
canvasWrap.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* Weiches, klares Mobile-Idle-Licht: viel Ambient, eine sanfte Sonne */
scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb8c9, 1.05));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.0);
sun.position.set(40, 60, 20);
scene.add(sun);

const shadowTex = createShadowTexture();

/* ============================================================
   BODEN — Gras, Altstadt-Hügel, Hofgarten-Grün, Donau
   ============================================================ */
function tiled(tex, repeatX, repeatY){
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}

function groundPlane(w, h, x, z, y, tex, repeatEvery = 6){
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateX(-Math.PI/2);
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: tiled(tex, w/repeatEvery, h/repeatEvery),
    gradientMap: getGradientMap()
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function makeGround(){
  const grassTex = createGrassTexture();
  const cobbleTex = createCobbleTexture();
  const waterTex = createWaterTexture();

  groundPlane(640, 480, -8, 55, -0.03, grassTex, 7);
  groundPlane(300, 70, -10, -10, -0.02, cobbleTex, 5);       // Altstadt-Hügel
  groundPlane(52, 78, 121, 99, -0.02, cobbleTex, 5);         // Luitpoldstraße Ladenzeile
  groundPlane(280, 60, 60, 170, -0.01, waterTex, 10);        // Donau
}
makeGround();

/* ============================================================
   STRASSEN — verbindet die Orte zu einem begehbaren Netz
   ============================================================ */
export const ROAD_PATHS = [
  ["oberes_tor","karlsplatz"],
  ["karlsplatz","bibliothek"],
  ["karlsplatz","rathaus"],
  ["karlsplatz","hofkirche"],
  ["hofkirche","unteres_tor"],
  ["hofkirche","schloss"]
];

const roadTex = createRoadTexture();

function roadSegment(ax, az, bx, bz, width){
  const dx = bx - ax, dz = bz - az;
  const dist = Math.hypot(dx, dz);
  if(dist < 0.01) return;
  const geo = new THREE.PlaneGeometry(dist, width);
  geo.rotateX(-Math.PI/2);
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: tiled(roadTex, dist/4, 1),
    gradientMap: getGradientMap()
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((ax+bx)/2, 0, (az+bz)/2);
  mesh.rotation.y = Math.atan2(-dz, dx);
  scene.add(mesh);
}

function buildRoads(){
  const byId = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));
  ROAD_PATHS.forEach(([fromId, toId]) => {
    const a = byId[fromId], b = byId[toId];
    if(!a || !b) return;
    roadSegment(a.x, a.z, b.x, b.z, 5);
  });
}
buildRoads();

/* ============================================================
   LUITPOLDSTRASSE — nach Street-View-Begehung nachgebaut.
   Echter, gebogener Verlauf (OSM-Wegpunkte, "Unteres Tor" im
   Norden bis runter Richtung Donaukai). Der recherchierte,
   fotografierte Abschnitt (Krieger-Denkmal-Grünfläche -> großes
   Eckhaus mit Mansarde -> "Optik"-Haus -> "The Oracle" mit den
   roten Stühlen) wird als konkrete Einzelgebäude nachgebaut,
   nicht als generische Kopien. "Hofgarten" (Insider-Spitzname
   der Gruppe für die Straße) sitzt exakt auf dem Oracle-Punkt.
   ============================================================ */
export const LUITPOLD_PATH = [
  {x:113, z:-12},                                    // Anschluss ans Unteres Tor
  {x:152.5, z:3.8}, {x:151.4, z:8.8}, {x:150.9, z:10.8}, {x:150.8, z:12.0},
  {x:150.5, z:15.8}, {x:149.3, z:28.9}, {x:147.7, z:39.2},
  {x:146.1, z:45.5}, {x:143.0, z:54.8}, {x:139.5, z:64.4}, {x:138.1, z:68.1},
  {x:135.6, z:74.0},
  {x:130.7, z:83.3}, {x:127.2, z:90.5},
  {x:121.1, z:102.3}, {x:111.5, z:119.8}, {x:104.9, z:129.5},
  {x:97.4, z:139.5}, {x:88.5, z:148.4}, {x:83.2, z:153.9},
  {x:60, z:140}                                       // Anschluss an Donaukai
];

const ROAD_W = 6.4, WALK_W = 2.2;

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

/* Asphalt + beidseitige Gehwege + gestrichelte Mittellinie, entlang einer Wegpunktkette */
function buildStreetWithSidewalks(points, roadW = ROAD_W, walkW = WALK_W){
  const asphaltTex = createAsphaltTexture();
  const sidewalkTex = createSidewalkTexture();
  const lineMat = new THREE.MeshBasicMaterial({ color: "#f2ead8" });

  for(let i=0;i<points.length-1;i++){
    const a = points[i], b = points[i+1];
    const dx = b.x-a.x, dz = b.z-a.z;
    const len = Math.hypot(dx,dz) || 1;
    const perpx = -dz/len, perpz = dx/len;
    const offset = roadW/2 + walkW/2;

    const roadMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(asphaltTex, len/4, 1), gradientMap: getGradientMap() });
    flatSegment(a.x,a.z,b.x,b.z, roadW, roadMat, 0);

    const walkMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(sidewalkTex, len/2.5, walkW/2.5), gradientMap: getGradientMap() });
    flatSegment(a.x+perpx*offset, a.z+perpz*offset, b.x+perpx*offset, b.z+perpz*offset, walkW, walkMat, 0.006);
    flatSegment(a.x-perpx*offset, a.z-perpz*offset, b.x-perpx*offset, b.z-perpz*offset, walkW, walkMat, 0.006);

    const dash = 1.1, gap = 0.9;
    let t = 0;
    while(t < len){
      const t0 = t/len, t1 = Math.min(len, t+dash)/len;
      flatSegment(a.x+dx*t0, a.z+dz*t0, a.x+dx*t1, a.z+dz*t1, 0.22, lineMat, 0.012);
      t += dash+gap;
    }
  }
}

function streetLamp(x, z){
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
  g.position.set(x,0,z);
  scene.add(g);
  fakeShadow(x,z,0.5);
}

function parkedCar(x, z, angle, color){
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
  g.position.set(x,0,z);
  g.rotation.y = angle;
  scene.add(g);
  fakeShadow(x,z,1.3);
}

function crosswalk(x, z, angle){
  const stripeMat = new THREE.MeshBasicMaterial({ color:"#f2ead8" });
  for(let i=-2;i<=2;i++){
    const geo = new THREE.PlaneGeometry(0.6, ROAD_W*0.82);
    geo.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geo, stripeMat);
    const ox = Math.cos(angle)*i*1.0, oz = Math.sin(angle)*i*1.0;
    mesh.position.set(x+ox, 0.014, z+oz);
    mesh.rotation.y = angle + Math.PI/2;
    scene.add(mesh);
  }
}

/* Denkmal-Grünfläche am Nordende (Krieger Denkmal) */
function buildMonumentGreen(x, z){
  const lawnTex = createGrassTexture("#78c469","#63ab55");
  groundPlane(20, 22, x, z, -0.015, lawnTex, 5);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,0.6,8), toonMaterial("#c9c2b6"));
  base.position.set(x, 0.3, z);
  scene.add(base); addOutline(base, scene, 0.05);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.42,3.2,10), toonMaterial("#d8d2c6"));
  column.position.set(x, 2.2, z);
  scene.add(column); addOutline(column, scene, 0.05);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5,0.6,10), toonMaterial("#b8ae9e"));
  cap.position.set(x, 4.1, z);
  scene.add(cap); addOutline(cap, scene, 0.05);
  fakeShadow(x,z,1.8);
  [[-3.2,2.5],[3.4,-2.2]].forEach(([ox,oz])=>{
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.26,1.7,7), toonMaterial("#8a5a3a"));
    trunk.position.set(x+ox,0.85,z+oz);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8), toonMaterial("#4f9a4a"));
    leaves.position.set(x+ox,2.3,z+oz);
    scene.add(leaves); addOutline(leaves, scene, 0.06);
    fakeShadow(x+ox,z+oz,1.2);
  });
}

/* "70 Luitpoldstraße": großes cremefarbenes Eckhaus, dunkles Mansarddach, Gauben, Balkon */
function buildGrandBuilding(x, z, faceAngle){
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
  g.position.set(x,0,z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(x,z,5.2);
}

/* "75 Luitpoldstraße": weißes Haus mit Ladenfront ("Optik"), eine Gaube */
function buildOptikBuilding(x, z, faceAngle){
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
  g.position.set(x,0,z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(x,z,4.2);
}

/* "The Oracle": Lachs-Fassade, dunkle Ladenfront, Markise, Bordeaux-Stühle + Holztische */
function buildOracleBuilding(x, z, faceAngle){
  const g = new THREE.Group();
  addPart(g, rbox(7.4,4.4,4.0,0.12,2), "#E8896B").position.y = 2.2;
  addPart(g, rbox(7.7,0.4,4.3,0.08,2), "#f2ead8").position.y = 4.5;
  const signband = addPart(g, rbox(5.2,0.7,0.15,0.08,1), "#2a2430");
  signband.position.set(0, 3.15, 2.05);
  const awning = addPart(g, rbox(6.6,0.3,1.4,0.08,1), "#241e2c");
  awning.position.set(0, 2.55, 2.6); awning.rotation.x = -0.32;
  [-2.4,0,2.4].forEach(dx=>{
    addPart(g, rbox(1.3,1.6,0.1,0.06,1), "#2c2430").position.set(dx, 1.15, 2.02);
  });
  g.position.set(x,0,z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(x,z,4.6);

  /* lokale +Z-Achse (Schaufenster/Markise) zeigt nach der Rotation in Weltrichtung (sinθ, cosθ) */
  const dirx = Math.sin(faceAngle), dirz = Math.cos(faceAngle);
  const sidex = Math.cos(faceAngle), sidez = -Math.sin(faceAngle);
  const tableTop = new THREE.CylinderGeometry(0.4,0.4,0.07,14);
  const tableLeg = new THREE.CylinderGeometry(0.05,0.05,0.7,8);
  const chairSeat = new THREE.BoxGeometry(0.4,0.08,0.4);
  const chairBack = new THREE.BoxGeometry(0.4,0.5,0.06);
  [[-1.6],[1.6]].forEach(([lx])=>{
    const tx = x + dirx*3.2 + sidex*lx, tz = z + dirz*3.2 + sidez*lx;
    const table = new THREE.Mesh(tableTop, toonMaterial("#8a6a4a"));
    table.position.set(tx,0.72,tz);
    scene.add(table); addOutline(table, scene, 0.05);
    const leg = new THREE.Mesh(tableLeg, toonMaterial("#3a3244"));
    leg.position.set(tx,0.36,tz);
    scene.add(leg);
    [[-0.55,0],[0.55,0],[0,0.55],[0,-0.55]].forEach(([cx,cz])=>{
      const seat = new THREE.Mesh(chairSeat, toonMaterial("#8B2E3C"));
      seat.position.set(tx+cx,0.42,tz+cz);
      scene.add(seat); addOutline(seat, scene, 0.05);
      const back = new THREE.Mesh(chairBack, toonMaterial("#8B2E3C"));
      back.position.set(tx+cx*1.15,0.65,tz+cz*1.15);
      back.lookAt(tx,0.65,tz);
      scene.add(back); addOutline(back, scene, 0.05);
    });
    fakeShadow(tx,tz,1.1);
  });
}

/* Bruchsteinmauer mit Efeu — begleitet die Straße hangseitig */
function ivyWallSegment(x, z, faceAngle){
  const wall = new THREE.Mesh(rbox(5,1.6,0.6,0.08,1), toonMaterial("#8f8474"));
  wall.position.set(x, 0.8, z);
  wall.rotation.y = faceAngle;
  scene.add(wall); addOutline(wall, scene, 0.05);
  const ivy = new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8), toonMaterial("#4f9a4a"));
  ivy.scale.set(1,0.7,0.6);
  ivy.position.set(x, 1.5, z);
  scene.add(ivy); addOutline(ivy, scene, 0.06);
}

function pathDir(points, i){
  const prev = points[Math.max(0,i-1)], next = points[Math.min(points.length-1,i+1)];
  const dx = next.x-prev.x, dz = next.z-prev.z;
  const len = Math.hypot(dx,dz) || 1;
  return { dirx: dx/len, dirz: dz/len, perpx: -dz/len, perpz: dx/len, faceAngle: Math.atan2(-dz/len, dx/len) };
}

/* Rotation.y, damit ein Objekt (lokale +Z-Achse = Vorderseite) zur Straßenmitte
   zeigt, wenn es auf `side` (+1/-1) entlang `perp` von der Mitte weg versetzt ist. */
function facingRoadAngle(perpx, perpz, side){
  return Math.atan2(-side*perpx, -side*perpz);
}

function buildLuitpoldstrasse(){
  buildStreetWithSidewalks(LUITPOLD_PATH, ROAD_W, WALK_W);

  const shopSide = 1;   // Ladenzeile liegt auf der +perp Seite
  const wallSide = -1;  // Bruchsteinmauer auf der gegenüberliegenden, hangseitigen Seite
  const setback = ROAD_W/2 + WALK_W + 2.8;

  buildMonumentGreen(147.0, 33.5);

  const p8 = LUITPOLD_PATH[8], d8 = pathDir(LUITPOLD_PATH,8);
  buildGrandBuilding(p8.x + d8.perpx*shopSide*setback, p8.z + d8.perpz*shopSide*setback, facingRoadAngle(d8.perpx,d8.perpz,shopSide));

  const p9 = LUITPOLD_PATH[9], d9 = pathDir(LUITPOLD_PATH,9);
  buildOptikBuilding(p9.x + d9.perpx*shopSide*setback, p9.z + d9.perpz*shopSide*setback, facingRoadAngle(d9.perpx,d9.perpz,shopSide));

  const hofgarten = LOCATIONS.find(l => l.id === "hofgarten");
  const p11 = hofgarten || LUITPOLD_PATH[10];
  const d11 = pathDir(LUITPOLD_PATH,10);
  const oracleSetback = ROAD_W/2 + WALK_W + 3.4;
  buildOracleBuilding(p11.x + d11.perpx*shopSide*oracleSetback, p11.z + d11.perpz*shopSide*oracleSetback, facingRoadAngle(d11.perpx,d11.perpz,shopSide));

  crosswalk(133.5, 78.6, Math.atan2(74.0-83.3, 135.6-130.7));

  for(let i=1;i<8;i++){
    const p = LUITPOLD_PATH[i];
    const d = pathDir(LUITPOLD_PATH,i);
    if(i % 2 === 0){
      ivyWallSegment(p.x + d.perpx*wallSide*(ROAD_W/2+WALK_W+1.2), p.z + d.perpz*wallSide*(ROAD_W/2+WALK_W+1.2), d.faceAngle);
    } else {
      streetLamp(p.x + d.perpx*shopSide*(ROAD_W/2+WALK_W+0.6), p.z + d.perpz*shopSide*(ROAD_W/2+WALK_W+0.6));
    }
  }

  const carColors = ["#3d4a5c","#8a1f2b","#c7c2c9","#2a2f38"];
  let carIdx = 0;
  for(let i=8;i<=13;i++){
    const p = LUITPOLD_PATH[i];
    const d = pathDir(LUITPOLD_PATH,i);
    const cx = p.x + d.perpx*wallSide*(ROAD_W/2+0.7);
    const cz = p.z + d.perpz*wallSide*(ROAD_W/2+0.7);
    parkedCar(cx, cz, d.faceAngle, carColors[carIdx % carColors.length]);
    carIdx++;
  }

  const palette = ["#D9A441","#C9A98B","#B5562F","#E8C77E"];
  for(let i=13;i<LUITPOLD_PATH.length-1;i++){
    const p = LUITPOLD_PATH[i];
    const d = pathDir(LUITPOLD_PATH,i);
    const side = i % 2 === 0 ? 1 : -1;
    const fx = p.x + d.perpx*side*(ROAD_W/2+WALK_W+3);
    const fz = p.z + d.perpz*side*(ROAD_W/2+WALK_W+3);
    const g = new THREE.Group();
    addPart(g, rbox(5.2,3.6,3.2,0.14,2), palette[i % palette.length]).position.y = 1.8;
    addPart(g, rbox(5.5,0.4,3.5,0.08,2), "#f2ead8").position.y = 3.8;
    g.position.set(fx,0,fz);
    g.rotation.y = facingRoadAngle(d.perpx,d.perpz,side);
    scene.add(g);
    fakeShadow(fx,fz,3);
  }
}

export function buildWorld(){
  LOCATIONS.forEach(buildStructure);
  buildLuitpoldstrasse();
}

export const BOUNDS = { minX:-150, maxX:158, minZ:-45, maxZ:150 };

/* ============================================================
   SCHATTEN & HILFSFUNKTIONEN
   ============================================================ */
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

/* Fügt Hauptkörper + Dach als toon-material + Outline zur Gruppe hinzu */
function addPart(group, geo, color){
  const mesh = new THREE.Mesh(geo, toonMaterial(color));
  group.add(mesh);
  addOutline(mesh, group);
  return mesh;
}

/* ============================================================
   GEBÄUDE BAUEN — je nach shape unterschiedliche Form
   ============================================================ */
function buildStructure(loc){
  const g = new THREE.Group();
  const roofColor = shade(loc.color, 0.62);

  switch(loc.shape){
    case "gate": {
      addPart(g, rbox(1.5,5,1.5,0.25,2), loc.color).position.set(-2.2,2.5,0);
      addPart(g, rbox(1.5,5,1.5,0.25,2), loc.color).position.set(2.2,2.5,0);
      addPart(g, rbox(6.6,1.7,1.9,0.2,2), loc.color).position.set(0,5.3,0);
      const roof = addPart(g, new THREE.ConeGeometry(1.15,1.5,4), roofColor);
      roof.position.set(0,6.8,0); roof.rotation.y = Math.PI/4;
      break;
    }
    case "plaza": {
      addPart(g, new THREE.CylinderGeometry(3.2,3.4,0.3,24), loc.color).position.y = 0.15;
      addPart(g, new THREE.CylinderGeometry(0.35,0.45,2.2,10), roofColor).position.y = 1.25;
      const bowl = addPart(g, new THREE.SphereGeometry(0.9,14,10,0,Math.PI*2,0,Math.PI*0.5), "#a8d8e8");
      bowl.position.y = 1.9; bowl.rotation.x = Math.PI;
      break;
    }
    case "hall": {
      addPart(g, rbox(7,4.4,5,0.22,2), loc.color).position.y = 2.2;
      const roof = addPart(g, new THREE.ConeGeometry(5.1,2.2,4), roofColor);
      roof.position.y = 5.4; roof.rotation.y = Math.PI/4;
      break;
    }
    case "church": {
      addPart(g, rbox(5,4.8,7,0.2,2), loc.color).position.y = 2.4;
      const roof = addPart(g, new THREE.CylinderGeometry(0.01,3.65,2.4,4), roofColor);
      roof.position.y = 6; roof.rotation.y = Math.PI/4;
      addPart(g, new THREE.CylinderGeometry(0.9,1.1,6,8), loc.color).position.set(0,5.4,-4);
      const spire = addPart(g, new THREE.ConeGeometry(1.08,3,8), roofColor);
      spire.position.set(0,9.9,-4);
      break;
    }
    case "library": {
      addPart(g, rbox(6,4,4.6,0.2,2), loc.color).position.y = 2;
      addPart(g, rbox(6.5,0.6,5.1,0.15,2), roofColor).position.y = 4.3;
      break;
    }
    case "castle": {
      addPart(g, rbox(11,7,9,0.2,2), loc.color).position.y = 3.5;
      addPart(g, rbox(11.5,0.7,9.5,0.15,2), roofColor).position.y = 7.35;
      [[-5.6,-4.4],[5.6,-4.4],[-5.6,4.4],[5.6,4.4]].forEach(([tx,tz])=>{
        addPart(g, new THREE.CylinderGeometry(1.3,1.4,9,10), loc.color).position.set(tx,4.5,tz);
        addPart(g, new THREE.ConeGeometry(1.65,2.4,10), roofColor).position.set(tx,10.2,tz);
      });
      break;
    }
    case "cafe": {
      /* Kein eigenes Gebäude: liegt auf der Straßenmitte der Luitpoldstraße.
         Das echte "Oracle"-Gebäude wird seitlich davon in buildLuitpoldstrasse() gebaut. */
      break;
    }
    case "dock": {
      addPart(g, rbox(6,0.4,3.2,0.1,1), loc.color).position.y = 0.5;
      addPart(g, rbox(6,0.9,0.15,0.08,1), roofColor).position.set(0,1.1,-1.5);
      break;
    }
  }
  g.position.set(loc.x, 0, loc.z);
  scene.add(g);
  if(loc.shape !== "cafe") fakeShadow(loc.x, loc.z, loc.radius*0.85);
  return g;
}

function shade(hex, amt){
  const c = new THREE.Color(hex);
  c.multiplyScalar(amt);
  return c;
}


import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LOCATIONS } from "./locations.js";
import {
  toonMaterial, addOutline, getGradientMap,
  createSkyTexture, createGrassTexture, createCobbleTexture,
  createRoadTexture, createWaterTexture, createShadowTexture
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

/* Straße aus einer Kette von Wegpunkten (für gebogene, echte Straßenverläufe) */
function buildPathRoad(points, width = 5){
  for(let i=0;i<points.length-1;i++){
    roadSegment(points[i].x, points[i].z, points[i+1].x, points[i+1].z, width);
  }
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
   LUITPOLDSTRASSE — echter, gebogener Straßenverlauf (aus OSM-
   Wegpunkten, 152.5/3.8 im Norden bei "Unteres Tor" bis runter
   Richtung Rosenstraße/Donaukai), plus Häuserzeile & Efeu-Mauer
   entlang des Schlosshangs — nach den Fotos/Street-View-Recherche.
   "Hofgarten" (Insider-Spitzname der Gruppe) sitzt auf dem echten
   Wegpunkt (135.6, 74.0), am Anfang der belebten Ladenzeile.
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

function makeFacade(x, z, faceAngle, opts){
  const { color, trim = "#f2ead8", roof = "#8a5a4a", w = 5.2, h = 3.6, d = 3.2,
          awning = false, dormer = true } = opts;
  const g = new THREE.Group();
  addPart(g, rbox(w,h,d,0.14,2), color).position.y = h/2;
  addPart(g, rbox(w+0.3,0.4,d+0.3,0.08,2), trim).position.y = h+0.2;
  if(dormer){
    const dm = addPart(g, rbox(w*0.22,0.8,0.8,0.1,1), trim);
    dm.position.set(0, h+0.55, d*0.3);
  }
  if(awning){
    const aw = addPart(g, rbox(w*0.85,0.3,1.3,0.08,1), "#2a2430");
    aw.position.set(0, h*0.62, d/2+0.6);
    aw.rotation.x = -0.3;
  }
  [-w*0.28, w*0.28].forEach(wx=>{
    addPart(g, rbox(0.9,1.1,0.12,0.08,1), "#a8d8e8").position.set(wx, h*0.55, d/2+0.05);
  });
  g.position.set(x,0,z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(x, z, Math.max(w,d)*0.55);
}

function buildLuitpoldstrasse(){
  buildPathRoad(LUITPOLD_PATH, 6);

  const palette = ["#E8896B","#E8C77E","#D9A441","#C9A98B","#B5562F"];
  const hedgeMat = () => toonMaterial("#4f9a4a");
  const trunkMat = toonMaterial("#8a5a3a");

  for(let i=1;i<LUITPOLD_PATH.length-1;i++){
    const p = LUITPOLD_PATH[i];
    const prev = LUITPOLD_PATH[i-1], next = LUITPOLD_PATH[i+1];
    const dx = next.x - prev.x, dz = next.z - prev.z;
    const len = Math.hypot(dx,dz) || 1;
    const dirx = dx/len, dirz = dz/len;
    const perpx = -dirz, perpz = dirx;
    const faceAngle = Math.atan2(-dirz, dirx);

    if(p.z < 68){
      /* Nördlicher, grüner Abschnitt Richtung Schloss: Efeu-Mauer + Bäume statt Läden */
      if(i % 2 === 0){
        const wx = p.x + perpx*4.5, wz = p.z + perpz*4.5;
        const wall = new THREE.Mesh(rbox(5,1.6,0.6,0.1,1), toonMaterial("#8f8474"));
        wall.position.set(wx, 0.8, wz);
        wall.rotation.y = faceAngle;
        scene.add(wall); addOutline(wall, scene, 0.05);
        const ivy = new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8), hedgeMat());
        ivy.scale.set(1,0.7,0.6);
        ivy.position.set(wx, 1.5, wz);
        scene.add(ivy); addOutline(ivy, scene, 0.06);
      } else {
        const tx = p.x - perpx*4.5, tz = p.z - perpz*4.5;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.26,1.7,7), trunkMat);
        trunk.position.set(tx,0.85,tz);
        scene.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2,10,8), hedgeMat());
        leaves.position.set(tx,2.2,tz);
        scene.add(leaves); addOutline(leaves, scene, 0.06);
        fakeShadow(tx,tz,1.1);
      }
      continue;
    }

    /* Belebte Ladenzeile: bunte Fassaden auf beiden Seiten, wie auf den Fotos */
    const side = i % 2 === 0 ? 1 : -1;
    const fx = p.x + perpx*4.2*side, fz = p.z + perpz*4.2*side;
    const color = palette[i % palette.length];
    makeFacade(fx, fz, faceAngle + (side>0?Math.PI:0), {
      color, awning: i % 3 === 0, dormer: i % 2 === 0
    });
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
      /* Café-Fassade an der "Luitpoldstraße" — bunte Front, Markise, Tischchen */
      addPart(g, rbox(7,4.2,4,0.15,2), loc.color).position.y = 2.1;
      addPart(g, rbox(7.3,0.5,4.3,0.1,2), "#f2ead8").position.y = 4.25;
      const awning = addPart(g, rbox(6.6,0.35,1.6,0.1,1), "#2a2430");
      awning.position.set(0, 2.9, 2.4); awning.rotation.x = -0.28;
      [-2.3, 0, 2.3].forEach(wx=>{
        addPart(g, rbox(1.1,1.3,0.15,0.1,1), "#a8d8e8").position.set(wx, 2.2, 2.02);
      });
      const tableTop = new THREE.CylinderGeometry(0.42,0.42,0.08,14);
      const tableLeg = new THREE.CylinderGeometry(0.06,0.06,0.7,8);
      [[-2.4,3.6],[0,4.0],[2.4,3.6]].forEach(([tx,tz])=>{
        addPart(g, tableTop, "#f5f5f0").position.set(tx,0.72,tz);
        addPart(g, tableLeg, "#3a3244").position.set(tx,0.36,tz);
      });
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
  fakeShadow(loc.x, loc.z, loc.radius*0.85);
  return g;
}

function shade(hex, amt){
  const c = new THREE.Color(hex);
  c.multiplyScalar(amt);
  return c;
}


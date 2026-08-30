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
   LUITPOLDSTRASSE — EINE gerade Straße (bewusst vereinfacht,
   damit die Geometrie stimmt), nach Street-View-Begehung:
   Krieger-Denkmal-Grünfläche (Norden) -> großes Eckhaus mit
   Mansarde -> "Optik"-Haus -> "The Oracle" (bordeauxrote
   Stühle, Holztische). Alles andere von der Karte ist bewusst
   entfernt, bis diese eine Straße wirklich stimmt.
   ============================================================ */
const STREET_A = { x:147.7, z:39.2 };  // Norden, bei der Grünfläche
const STREET_B = { x:121.1, z:102.3 }; // Süden, hinter "The Oracle"

const SDX = STREET_B.x - STREET_A.x, SDZ = STREET_B.z - STREET_A.z;
const STREET_LEN = Math.hypot(SDX, SDZ);
const DIRX = SDX/STREET_LEN, DIRZ = SDZ/STREET_LEN;
const PERPX = -DIRZ, PERPZ = DIRX;
const FACE_ANGLE = Math.atan2(-DIRZ, DIRX); // rotation.y, damit lokale +X-Achse in Straßenrichtung zeigt

const ROAD_W = 6.4, WALK_W = 2.3;
const SHOP_SIDE = 1;   // Ladenzeile liegt auf der +PERP Seite
const WALL_SIDE = -1;  // Bruchstein-/Efeu-Mauer auf der gegenüberliegenden Seite

function atT(t, side = 0, sideOffset = 0){
  return {
    x: STREET_A.x + DIRX*t + PERPX*side*sideOffset,
    z: STREET_A.z + DIRZ*t + PERPZ*side*sideOffset
  };
}

/* rotation.y, damit die lokale +Z-Achse (Fassaden-Vorderseite) zur Straßenmitte zeigt */
function facingRoadAngle(side){
  return Math.atan2(-side*PERPX, -side*PERPZ);
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

function buildStreetSurface(){
  const asphaltTex = createAsphaltTexture();
  const sidewalkTex = createSidewalkTexture();
  const lineMat = new THREE.MeshBasicMaterial({ color:"#f2ead8" });

  const a = atT(-6), b = atT(STREET_LEN+6);
  const roadMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(asphaltTex, STREET_LEN/4, 1), gradientMap: getGradientMap() });
  flatSegment(a.x,a.z,b.x,b.z, ROAD_W, roadMat, 0);

  const offset = ROAD_W/2 + WALK_W/2;
  const walkMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(sidewalkTex, STREET_LEN/2.5, WALK_W/2.5), gradientMap: getGradientMap() });
  const wa1 = atT(-6, 1, offset), wb1 = atT(STREET_LEN+6, 1, offset);
  flatSegment(wa1.x,wa1.z,wb1.x,wb1.z, WALK_W, walkMat, 0.006);
  const wa2 = atT(-6, -1, offset), wb2 = atT(STREET_LEN+6, -1, offset);
  flatSegment(wa2.x,wa2.z,wb2.x,wb2.z, WALK_W, walkMat, 0.006);

  const dash = 1.1, gap = 0.9;
  let t = -6;
  while(t < STREET_LEN+6){
    const p0 = atT(t), p1 = atT(Math.min(STREET_LEN+6, t+dash));
    flatSegment(p0.x,p0.z,p1.x,p1.z, 0.22, lineMat, 0.012);
    t += dash+gap;
  }

  /* Gras beidseitig hinter den Gehwegen, damit nichts "in der Luft" endet */
  const grassTex = createGrassTexture();
  const grassMat = new THREE.MeshToonMaterial({ color:0xffffff, map: tiled(grassTex, 30, 30), gradientMap: getGradientMap() });
  const gOff = ROAD_W/2 + WALK_W + 20;
  [1,-1].forEach(side=>{
    const ga = atT(-10, side, gOff), gb = atT(STREET_LEN+10, side, gOff);
    flatSegment(ga.x,ga.z,gb.x,gb.z, 40, grassMat, -0.02);
  });
}

/* Zebrastreifen: Balken quer über die volle Fahrbahnbreite, mit Lücken in Straßenrichtung */
function crosswalk(t){
  const stripeMat = new THREE.MeshBasicMaterial({ color:"#f2ead8" });
  const stripeThickness = 0.6, gap = 0.55;
  const count = 6;
  const totalSpan = count*stripeThickness + (count-1)*gap;
  let start = t - totalSpan/2;
  for(let i=0;i<count;i++){
    const st = start + i*(stripeThickness+gap);
    const geo = new THREE.PlaneGeometry(stripeThickness, ROAD_W*0.86);
    geo.rotateX(-Math.PI/2);
    const mesh = new THREE.Mesh(geo, stripeMat);
    const p = atT(st);
    mesh.position.set(p.x, 0.014, p.z);
    mesh.rotation.y = FACE_ANGLE;
    scene.add(mesh);
  }
}

function streetLamp(t, side){
  const p = atT(t, side, ROAD_W/2+WALK_W+0.6);
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
  g.rotation.y = facingRoadAngle(side);
  scene.add(g);
  fakeShadow(p.x,p.z,0.5);
}

function parkedCar(t, side, color){
  const p = atT(t, side, ROAD_W/2+0.7);
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
  g.rotation.y = FACE_ANGLE; // Auto steht parallel zur Straße
  scene.add(g);
  fakeShadow(p.x,p.z,1.3);
}

function ivyWallSegment(t){
  const p = atT(t, WALL_SIDE, ROAD_W/2+WALK_W+1.2);
  const wall = new THREE.Mesh(rbox(4.6,1.6,0.6,0.08,1), toonMaterial("#8f8474"));
  wall.position.set(p.x, 0.8, p.z);
  wall.rotation.y = FACE_ANGLE;
  scene.add(wall); addOutline(wall, scene, 0.05);
  const ivy = new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8), toonMaterial("#4f9a4a"));
  ivy.scale.set(1,0.7,0.6);
  ivy.position.set(p.x, 1.5, p.z);
  scene.add(ivy); addOutline(ivy, scene, 0.06);
}

/* Krieger-Denkmal-Grünfläche am Nordende */
function buildMonumentGreen(t){
  const p = atT(t, SHOP_SIDE, ROAD_W/2+WALK_W+7);
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

/* "70 Luitpoldstraße": großes cremefarbenes Eckhaus, dunkles Mansarddach, Gauben, Balkon */
function buildGrandBuilding(t){
  const p = atT(t, SHOP_SIDE, ROAD_W/2+WALK_W+4.6);
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
  g.rotation.y = facingRoadAngle(SHOP_SIDE);
  scene.add(g);
  fakeShadow(p.x,p.z,5.2);
}

/* "75 Luitpoldstraße": weißes Haus mit Ladenfront ("Optik"), eine Gaube */
function buildOptikBuilding(t){
  const p = atT(t, SHOP_SIDE, ROAD_W/2+WALK_W+4.2);
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
  g.rotation.y = facingRoadAngle(SHOP_SIDE);
  scene.add(g);
  fakeShadow(p.x,p.z,4.2);
}

/* "The Oracle": Lachs-Fassade, dunkle Ladenfront, Markise, Bordeaux-Stühle + Holztische */
function buildOracleBuilding(t){
  const p = atT(t, SHOP_SIDE, ROAD_W/2+WALK_W+3.8);
  const faceAngle = facingRoadAngle(SHOP_SIDE);
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
  g.position.set(p.x,0,p.z);
  g.rotation.y = faceAngle;
  scene.add(g);
  fakeShadow(p.x,p.z,4.6);

  /* lokale +Z-Achse (Schaufenster) zeigt nach der Rotation in Weltrichtung (sinθ, cosθ) */
  const dirx = Math.sin(faceAngle), dirz = Math.cos(faceAngle);
  const sidex = Math.cos(faceAngle), sidez = -Math.sin(faceAngle);
  const tableTop = new THREE.CylinderGeometry(0.4,0.4,0.07,14);
  const tableLeg = new THREE.CylinderGeometry(0.05,0.05,0.7,8);
  const chairSeat = new THREE.BoxGeometry(0.4,0.08,0.4);
  const chairBack = new THREE.BoxGeometry(0.4,0.5,0.06);
  [-1.6,1.6].forEach(lx=>{
    const tx = p.x + dirx*3.2 + sidex*lx, tz = p.z + dirz*3.2 + sidez*lx;
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

  return p;
}

function buildLuitpoldstrasse(){
  buildStreetSurface();

  buildMonumentGreen(2);
  buildGrandBuilding(12);
  buildOptikBuilding(24);
  const oraclePos = buildOracleBuilding(34);

  crosswalk(40);

  [6, 18, 30, 44].forEach(t => streetLamp(t, SHOP_SIDE));
  [4, 16, 28, 46, 52].forEach(t => ivyWallSegment(t));

  const carColors = ["#3d4a5c","#8a1f2b","#c7c2c9","#2a2f38"];
  [8, 20, 46, 52].forEach((t,i) => parkedCar(t, WALL_SIDE, carColors[i % carColors.length]));

  return oraclePos;
}

export function buildWorld(){
  buildLuitpoldstrasse();
}

export const STREET_SPAWN = atT(29, WALL_SIDE, 1.6);
export { STREET_A, STREET_B };

export const BOUNDS = {
  minX: Math.min(STREET_A.x, STREET_B.x) - 30,
  maxX: Math.max(STREET_A.x, STREET_B.x) + 30,
  minZ: STREET_A.z - 12,
  maxZ: STREET_B.z + 12
};

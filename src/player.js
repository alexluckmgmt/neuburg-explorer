import * as THREE from "three";
import { scene, fakeShadow } from "./world.js";
import { toonMaterial, addOutline } from "./textures.js";

/* Chibi-Figur: großer runder Kopf, weicher Körper, kleine Stummel-Arme —
   bewusst simpel & clean gehalten (Sims/Mobile-Idle-Look), kein Realismus. */
export const player = new THREE.Group();

const body = new THREE.Mesh(new THREE.SphereGeometry(0.62,16,12), toonMaterial(0xFF3EA5));
body.scale.set(1, 1.15, 1);
body.position.y = 0.95;
player.add(body);
addOutline(body, player);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.58,18,14), toonMaterial(0xF5FF3D));
head.position.y = 1.95;
player.add(head);
addOutline(head, player);

const armGeo = new THREE.SphereGeometry(0.22,10,8);
const armMat = toonMaterial(0xFF3EA5);
[-0.72, 0.72].forEach(sx => {
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.set(sx, 0.95, 0.05);
  player.add(arm);
  addOutline(arm, player);
});

const footGeo = new THREE.SphereGeometry(0.26,10,8);
const footMat = toonMaterial(0x3D2A4A);
[-0.28, 0.28].forEach(sx => {
  const foot = new THREE.Mesh(footGeo, footMat);
  foot.scale.set(1, 0.55, 1.3);
  foot.position.set(sx, 0.22, 0.12);
  player.add(foot);
  addOutline(foot, player);
});

const eyeGeo = new THREE.SphereGeometry(0.08,8,8);
const eyeMat = new THREE.MeshBasicMaterial({color:0x16121F});
const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.2,1.98,0.5);
const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.2,1.98,0.5);
player.add(eyeL, eyeR);

player.position.set(-120, 0, 84);
scene.add(player);

export const playerShadow = fakeShadow(0,0,0.8);

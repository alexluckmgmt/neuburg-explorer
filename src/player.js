import * as THREE from "three";
import { scene, fakeShadow } from "./world.js";

export const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55,0.65,1.4,12),
  new THREE.MeshLambertMaterial({color:0xFF3EA5})
);
body.position.y = 0.9;
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.55,14,12),
  new THREE.MeshLambertMaterial({color:0xF5FF3D})
);
head.position.y = 1.9;
const eyeGeo = new THREE.SphereGeometry(0.08,8,8);
const eyeMat = new THREE.MeshBasicMaterial({color:0x16121F});
const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.2,1.95,0.48);
const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.2,1.95,0.48);
player.add(body, head, eyeL, eyeR);
player.position.set(-14, 0, 8);
scene.add(player);

export const playerShadow = fakeShadow(0,0,0.7);

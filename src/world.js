import * as THREE from "three";
import { LOCATIONS } from "./locations.js";

export const canvasWrap = document.getElementById("canvasWrap");
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8e3);
scene.fog = new THREE.Fog(0x7ec8e3, 40, 95);

export const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 300);
export const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
canvasWrap.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* Lighting */
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
const sun = new THREE.DirectionalLight(0xfff2d6, 0.9);
sun.position.set(20, 30, 10);
scene.add(sun);

/* Ground: grass base + beige Altstadt zone + river */
function makeGround(){
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(200,200),
    new THREE.MeshLambertMaterial({color:0x6bbf59})
  );
  grass.rotation.x = -Math.PI/2;
  grass.position.y = -0.02;
  scene.add(grass);

  const altstadt = new THREE.Mesh(
    new THREE.PlaneGeometry(46,34),
    new THREE.MeshLambertMaterial({color:0xdcc9a3})
  );
  altstadt.rotation.x = -Math.PI/2;
  altstadt.position.set(-2, -0.01, -6);
  scene.add(altstadt);

  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(70,14),
    new THREE.MeshLambertMaterial({color:0x2f7fb3})
  );
  river.rotation.x = -Math.PI/2;
  river.position.set(0, 0, -26);
  scene.add(river);
}
makeGround();

function shade(hex, amt){
  const c = new THREE.Color(hex);
  c.multiplyScalar(amt);
  return c;
}

export function fakeShadow(x,z,r){
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r,20),
    new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.22})
  );
  m.rotation.x = -Math.PI/2;
  m.position.set(x, 0.015, z);
  scene.add(m);
  return m;
}

/* ============================================================
   GEBÄUDE BAUEN — je nach shape unterschiedliche Form
   ============================================================ */
function buildStructure(loc){
  const g = new THREE.Group();
  const mainMat = new THREE.MeshLambertMaterial({color:loc.color});
  const roofMat = new THREE.MeshLambertMaterial({color:shade(loc.color,0.65)});

  switch(loc.shape){
    case "gate": {
      const pillarGeo = new THREE.BoxGeometry(1.4,5,1.4);
      const p1 = new THREE.Mesh(pillarGeo, mainMat); p1.position.set(-2.2,2.5,0);
      const p2 = new THREE.Mesh(pillarGeo, mainMat); p2.position.set(2.2,2.5,0);
      const top = new THREE.Mesh(new THREE.BoxGeometry(6.4,1.6,1.8), mainMat);
      top.position.set(0,5.3,0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1,1.4,4), roofMat);
      roof.position.set(0,6.7,0); roof.rotation.y = Math.PI/4;
      g.add(p1,p2,top,roof);
      break;
    }
    case "plaza": {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.4,0.3,24), mainMat);
      base.position.y = 0.15;
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,2.2,10), roofMat);
      spout.position.y = 1.25;
      g.add(base, spout);
      break;
    }
    case "hall": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(7,4.4,5), mainMat);
      body.position.y = 2.2;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5,2.2,4), roofMat);
      roof.position.y = 5.4; roof.rotation.y = Math.PI/4;
      g.add(body, roof);
      break;
    }
    case "church": {
      const nave = new THREE.Mesh(new THREE.BoxGeometry(5,4.8,7), mainMat);
      nave.position.y = 2.4;
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01,3.6,2.4,4), roofMat);
      roof.position.y = 6; roof.rotation.y = Math.PI/4;
      const steeple = new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,6,8), mainMat);
      steeple.position.set(0,5.4,-4);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.05,3,8), roofMat);
      spire.position.set(0,9.9,-4);
      g.add(nave, roof, steeple, spire);
      break;
    }
    case "library": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(6,4,4.6), mainMat);
      body.position.y = 2;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4,0.6,5), roofMat);
      roof.position.y = 4.3;
      g.add(body, roof);
      break;
    }
    case "castle": {
      const keep = new THREE.Mesh(new THREE.BoxGeometry(11,7,9), mainMat);
      keep.position.y = 3.5;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(11.4,0.7,9.4), roofMat);
      roof.position.y = 7.35;
      g.add(keep, roof);
      const towerGeo = new THREE.CylinderGeometry(1.3,1.4,9,10);
      const capGeo = new THREE.ConeGeometry(1.6,2.4,10);
      [[-5.6,-4.4],[5.6,-4.4],[-5.6,4.4],[5.6,4.4]].forEach(([tx,tz])=>{
        const t = new THREE.Mesh(towerGeo, mainMat); t.position.set(tx,4.5,tz);
        const cap = new THREE.Mesh(capGeo, roofMat); cap.position.set(tx,10.2,tz);
        g.add(t,cap);
      });
      break;
    }
    case "dock": {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6,0.4,3.2), mainMat);
      deck.position.y = 0.5;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6,0.9,0.15), roofMat);
      rail.position.set(0,1.1,-1.5);
      g.add(deck, rail);
      break;
    }
  }
  g.position.set(loc.x, 0, loc.z);
  scene.add(g);
  fakeShadow(loc.x, loc.z, loc.radius*0.75);
  return g;
}

export function buildWorld(){
  LOCATIONS.forEach(buildStructure);
}

export const BOUNDS = { minX:-27, maxX:27, minZ:-27, maxZ:15 };

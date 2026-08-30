import { LOCATIONS } from "./locations.js";

const SAVE_KEY = "neuburg_explorer_save_v1";

export let state = {
  amount: 0,
  unlocked: {},
  lastSave: Date.now()
};

export function loadState(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(raw){
    try{ state = Object.assign(state, JSON.parse(raw)); }catch(e){}
  }
}

export function saveState(){
  state.lastSave = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function totalRate(){
  let r = 0;
  LOCATIONS.forEach(l => { if(state.unlocked[l.id]) r += l.rate; });
  return r;
}

export function fmt(n){
  if(n < 1000) return Math.floor(n).toString();
  const units=["K","M","B","T"]; let u=-1; let v=n;
  while(v>=1000 && u<units.length-1){ v/=1000; u++; }
  return v.toFixed(v<10?2:1)+units[u];
}

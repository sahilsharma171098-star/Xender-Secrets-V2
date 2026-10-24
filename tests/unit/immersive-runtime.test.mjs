import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const script = readFileSync(new URL("../../public/immersive-lab.js", import.meta.url), "utf8");
class Element {
  constructor(id="") {
    this.id=id; this.dataset={};this.listeners={};this.attributes={};
    this.style={setProperty(){}};this.value="";this.options=[];
    this.width=1200;this.height=660;this.hidden=false;this.disabled=true;this.textContent="";
  }
  addEventListener(name,cb){this.listeners[name]=cb}
  setAttribute(key,value){this.attributes[key]=value}
  append(){}
  before(){}
  replaceChildren(...options){this.options=options}
  getBoundingClientRect(){return {left:0,top:0,width:1200,height:660}}
  setPointerCapture(){}
}
function setup(webgl=true){
  const elements={},frames=[];
  const el=id=>elements[id]||(elements[id]=new Element(id));
  const tabs=["gym","fashion","cinema","property","bistro"].map(id=>{
    const x=new Element(id);x.dataset.scene=id;return x;
  });
  let drawCount=0;
  const gl=new Proxy({
    VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
    ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,DEPTH_TEST:8,CULL_FACE:9,
    COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,TRIANGLES:34,
    createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
    getShaderParameter:()=>true,getProgramParameter:()=>true,
    getAttribLocation:()=>0,getUniformLocation:()=>({}),
    drawArrays:()=>{drawCount++}
  },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
  el("showroom").getContext=()=>webgl?gl:null;
  const history={replaceState(){}};
  const document={
    getElementById:el,documentElement:{style:{setProperty(){}}},hidden:false,
    querySelectorAll:selector=>selector==="[data-scene]"?tabs:[],
    querySelector:()=>new Element(),
    createElement:tag=>elements[tag]=new Element(tag)
  };
  function Option(label,value){return {label,value}}
  vm.runInNewContext(script,{
    document,window:{history,devicePixelRatio:1,matchMedia:()=>({matches:false})},
    history,location:{href:"https://www.xendersecrets.com/immersive-lab"},
    URL,Option,performance:{now:()=>1000},requestAnimationFrame:cb=>frames.push(cb),
  },{timeout:1500});
  return {el,tabs,frames,getDraws:()=>drawCount};
}

test("scene switching draws five distinct WebGL demos and stays keyboard-selectable",()=>{
  const {el,tabs,frames,getDraws}=setup();
  for(const [i,tab] of tabs.entries()){
    tab.listeners.click();
    const count=getDraws();
    assert.equal(frames.length,1);
    frames.shift()(1000+i*40);
    assert.ok(getDraws()>count,tab.dataset.scene+" should render geometry");
    assert.ok(el("select").options.length>=4,tab.dataset.scene+" should expose objects to keyboard selection");
  }
});

test("cinema seat selection toggles browser-local UI state without network operations",()=>{
  const {el,tabs,frames}=setup();
  tabs[2].listeners.click();
  frames.shift()(1000);
  assert.equal(el("sceneTitle").textContent,"The Screening Room");
  assert.equal(el("select").options.length,29);
  const picker=el("select");
  picker.value="seat-A1";
  picker.listeners.change();
  assert.equal(el("objectTitle").textContent,"Seat A1");
  const action=el("objectAction");
  assert.equal(action.disabled,false);
  action.listeners.click();
  assert.match(el("feedback").textContent,/activated/);
  assert.match(action.textContent,/Deselect/);
  action.listeners.click();
  assert.match(action.textContent,/Select demo seat/);
});

test("WebGL absence displays a deliberate fallback instead of throwing",()=>{
  const {el,frames}=setup(false);
  assert.equal(el("fallback").hidden,false);
  assert.equal(el("renderStatus").textContent,"WebGL unavailable");
  assert.equal(frames.length,0);
});

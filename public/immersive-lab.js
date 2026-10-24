/* XEND-CATALOG-IMMERSIVE-001: dependency-free procedural WebGL prototypes.
 * Concepts only: no purchases, bookings, customer data, external requests or tracking. */
(() => {
  "use strict";
  const canvas = document.getElementById("showroom");
  const status = document.getElementById("renderStatus");
  const fallback = document.getElementById("fallback");
  const title = document.getElementById("sceneTitle");
  const description = document.getElementById("sceneDescription");
  const objectTitle = document.getElementById("objectTitle");
  const objectDescription = document.getElementById("objectDescription");
  const objectScene = document.getElementById("objectScene");
  const objectInteraction = document.getElementById("objectInteraction");
  const action = document.getElementById("objectAction");
  const feedback = document.getElementById("feedback");
  const inspectorTag = document.getElementById("inspectorTag");
  const counter = document.getElementById("inspectorCounter");
  const index = document.getElementById("sceneIndex");
  const SCENES = {
    gym: { title:"Motion Gym", index:"01", description:"Orbit around the machines. Inspect the treadmill, lifting station and heavy bag.", accent:"#ccfd7d" },
    fashion: { title:"Atelier / 03", index:"02", description:"Explore a fashion floor and select pieces for a local demo wish list.", accent:"#c5aaf4" },
    cinema: { title:"The Screening Room", index:"03", description:"Choose a red cinema seat. Selected seats turn green in this browser-only demo.", accent:"#ffad9e" },
    property: { title:"The Residence", index:"04", description:"Walk around an open-plan home and inspect the lounge, kitchen and bedroom.", accent:"#a8dce7" },
    bistro: { title:"Table & Form", index:"05", description:"Inspect the dining floor and choose tables in a simulation with no real reservations.", accent:"#e9c995" }
  };
  const sceneKeys = Object.keys(SCENES);
  const memory = Object.create(null);
  const getSaved = key => memory[key] || (memory[key] = new Set());
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
  const Vec = {
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    norm:a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)}
  };
  const Mat = {
    mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o},
    perspective(fov,ratio,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/ratio,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])},
    view(eye,center){const z=Vec.norm(eye.map((n,i)=>n-center[i])),x=Vec.norm(Vec.cross([0,1,0],z)),y=Vec.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-Vec.dot(x,eye),-Vec.dot(y,eye),-Vec.dot(z,eye),1])},
    model(x,y,z,sx,sy,sz,angle){const c=Math.cos(angle||0),s=Math.sin(angle||0);return new Float32Array([c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1])}
  };
  const C = {
    floor:[.12,.18,.19],wall:[.2,.27,.28],light:[.78,.9,.83],frame:[.1,.13,.15],
    gym:[.60,.90,.37],iron:[.35,.43,.44],wine:[.49,.13,.19],red:[.84,.20,.24],
    cream:[.87,.82,.69],violet:[.64,.47,.79],blue:[.27,.48,.65],wood:[.5,.35,.24],
    tan:[.70,.54,.37],green:[.28,.72,.43],gold:[.83,.62,.29],white:[.89,.92,.90]
  };
  function sceneObjects(key) {
    const o=[];
    function add(id,x,y,z,sx,sy,sz,color,name,details,kind,extra) {
      o.push({id,x,y,z,sx,sy,sz,color:C[color]||color||C.white,name,details,kind,angle:0,...(extra||{})});
    }
    const cube=(x,y,z,sx,sy,sz,color)=>add(null,x,y,z,sx,sy,sz,color);
    const interactive=(id,x,y,z,sx,sy,sz,color,name,details,kind,extra)=>add(id,x,y,z,sx,sy,sz,color,name,details,kind,extra);
    cube(0,-.23,0,13,.45,10,"floor");
    cube(0,2.05,-4.8,13,4.4,.18,"wall");
    cube(-6.4,2.05,0,.18,4.4,10,"frame");
    for(let x=-5;x<=5;x+=2) cube(x,4.2,-1.7,.48,.08,2.8,"light");
    if(key==="gym"){
      for(let x=-5;x<6;x+=2.4)cube(x,.02,3.8,2,.06,1.6,"iron");
      cube(4.3,1.8,-4.55,2.9,2.7,.12,"blue");
      for(let i=0;i<2;i++){
        const x=-3.4+i*3.1;
        cube(x,.42,-2,1.65,.32,2.65,"iron");
        cube(x-.73,1.27,-2,.12,1.9,2.4,"white");
        cube(x+.73,1.27,-2,.12,1.9,2.4,"white");
        interactive("gym-treadmill-"+i,x,.64,-2,1.45,.16,2.3,"gym","Treadmill "+(i+1),"Animated running surface and rotating mechanism. In a production site, equipment can link to classes and membership plans.","equipment",{motion:"run",activeColor:"green"});
      }
      cube(2.5,.5,1.2,2.2,.2,1.25,"iron");
      for(let x of [1.65,3.35])cube(x,1.6,1.2,.14,2.4,.2,"white");
      cube(2.5,2.6,1.2,2.3,.10,.16,"white");
      interactive("gym-rack",2.5,1.33,1.2,2.2,.22,.24,"gold","Free-weight Station","Select this station to preview the lifting session. Weights and equipment are actual manipulable scene objects.","equipment");
      for(let x of [1.35,1.6,3.4,3.65])cube(x,1.33,1.2,.2,.9,.44,"iron");
      cube(-4.6,3.6,1.7,.07,.85,.1,"light");
      interactive("gym-bag",-4.6,2.4,1.7,.88,1.82,.9,"wine","Heavy Bag","Physics-style sway animates this training bag. Tap to toggle the training motion.","equipment",{motion:"sway"});
      cube(4.7,.24,3.05,1.1,.4,1.2,"wood");
      for(let i=0;i<6;i++)cube(4.3+i*.16,.6+i*.08,2.7,.12,.18,.75,"iron");
    }
    if(key==="fashion"){
      cube(0,.05,-3.7,10,.2,.7,"violet");
      for(let x of [-3.7,0,3.7]) {
        cube(x,1.5,-2.7,.11,2.7,.11,"gold");
        cube(x,2.85,-2.7,2.6,.08,.12,"gold");
      }
      for(let i=0;i<4;i++){
        const x=-4.7+i*3.08,color=["violet","cream","blue","tan"][i];
        cube(x,1.7,-2.7,.48,.95,.27,color);
        cube(x-.4,1.86,-2.7,.43,.32,.34,color);
        cube(x+.4,1.86,-2.7,.43,.32,.34,color);
        interactive("fashion-look-"+i,x,1.7,-2.39,.65,.75,.18,color,["Iris Overshirt","Dune Knitwear","Night Denim","Field Jacket"][i],"Spin this item and add or remove it from a local sample wishlist. No checkout, inventory or real pricing is implied.","wishlist",{motion:"float"});
      }
      for(let x of [-2.6,2.7]){
        cube(x,.44,1.2,1.65,.84,1.5,"wood");
        cube(x,1.02,1.2,1.2,.18,1.06,"cream");
      }
      interactive("fashion-accessory",-2.6,1.36,1.2,.62,.46,.38,"gold","Utility Carry","A compact accessory on the central display. Select it to try the sample wishlist interaction.","wishlist",{motion:"spin"});
      interactive("fashion-shoes",2.7,1.33,1.2,.94,.26,.45,"blue","Studio Runner","Procedurally modelled product stand-in. Production items would use measured 3D scans or optimized GLB models.","wishlist");
      for(let x of [-5.1,5.1])cube(x,2.4,-4.5,.9,3,.13,"violet");
    }
    if(key==="cinema"){
      cube(0,2.2,-4.4,7.3,3.25,.16,"white");
      cube(0,2.2,-4.29,6.5,2.6,.02,"blue");
      cube(0,.04,-3.1,9,.16,1.6,"frame");
      for(let r=0;r<4;r++)for(let col=0;col<7;col++){
        const x=(col-3)*1.17,z=-1.8+r*1.43,code=String.fromCharCode(65+r)+(col+1);
        cube(x,.25+r*.09,z,.84,.25,.82,"iron");
        interactive("seat-"+code,x,.95+r*.09,z+.14,.87,1.0,.35,"red","Seat "+code,"Click to select or deselect this seat in the local demo. No ticket is held, reserved or sold.","seat");
        cube(x-.43,.60+r*.09,z,.12,.35,.88,"wine");
        cube(x+.43,.60+r*.09,z,.12,.35,.88,"wine");
      }
      for(let z=-2;z<5;z+=1.6){cube(-5.5,.14,z,.38,.11,.24,"gold");cube(5.5,.14,z,.38,.11,.24,"gold");}
    }
    if(key==="property"){
      cube(0,.02,0,12,.16,9,"cream");
      cube(0,.45,-4.35,11,1,.16,"white");
      cube(-.6,.52,.2,.16,1,7.4,"white");
      cube(3,.50,.2,.16,1,7.4,"white");
      cube(-3.5,.15,.55,4.8,.1,3.6,"tan");
      cube(-4,.53,.1,2.6,.7,.85,"wood");
      interactive("home-lounge",-4,.9,.1,2.65,.36,.9,"blue","Lounge Seating","Explore the lounge arrangement, natural light and circulation. A production tour would include room measurements and materials.","room");
      cube(-4,1.2,.9,2.1,.64,.15,"blue");
      cube(-3.3,.4,2.3,1.4,.25,.95,"wood");
      cube(1.2,.5,-2.4,2.4,.85,.8,"wood");
      interactive("home-kitchen",1.1,1.13,-2.4,2.1,.4,.62,"white","Kitchen Island","Inspect countertop and kitchen zoning. Scene geometry is a functional prototype, not an architectural plan.","room");
      for(let x of [-.5,.4,1.3])cube(x,.4,-4.05,.74,.76,.46,"tan");
      cube(4.8,.30,1.55,2.15,.42,2.8,"wood");
      interactive("home-bedroom",4.8,.72,1.55,2,.44,2.35,"cream","Bedroom Suite","Preview the room layout and furniture. A full client build adds textures, hotspots and specification cards.","room");
      cube(4.8,1.15,2.65,2.15,.75,.25,"tan");
    }
    if(key==="bistro"){
      cube(0,.42,-4,5,.82,.6,"wood");
      for(let x of [-3.8,-1.35,1.35,3.8]){
        cube(x,.56,0,.22,1,.24,"iron");
        interactive("table-"+String(Math.round(x*10)),x,1.1,0,1.6,.18,1.65,"wood",["Window Table","Chef's Table","Courtyard Table","Corner Table"][[-3.8,-1.35,1.35,3.8].indexOf(x)],"Tap to mark this table as selected in a local dining layout simulation. It is not a real-time reservation.","table",{motion:"float"});
        for(let z of [-1.25,1.25]){cube(x,.38,z,.84,.18,.7,"tan");cube(x,.82,z+(z>0?.3:-.3),.75,.76,.16,"cream")}
        cube(x,1.26,0,.38,.12,.38,"white");
        cube(x,1.39,0,.13,.14,.13,"gold");
      }
      for(let x=-3;x<=3;x+=1.5)cube(x,1.65,-4.35,.12,2,.14,"gold");
      for(let x of [-5.2,5.2])cube(x,1.3,2.7,.5,2.4,.55,"green");
    }
    return o;
  }
  let gl;
  try { gl = canvas.getContext("webgl",{antialias:true,alpha:false,powerPreference:"low-power"}); } catch (_) {}
  if(!gl){fallback.hidden=false;status.textContent="WebGL unavailable";return;}
  function compile(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
  let program;
  try{
    program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,"attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMVP;varying float vLight;void main(){gl_Position=uMVP*vec4(aPosition,1.0);vLight=0.52+0.48*max(dot(normalize(aNormal),normalize(vec3(-0.4,0.8,0.5))),0.0);}"));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,"precision mediump float;uniform vec3 uColor;varying float vLight;void main(){gl_FragColor=vec4(uColor*vLight,1.0);}"));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  }catch(e){fallback.hidden=false;status.textContent="Renderer error";return;}
  const vertices=[];
  function quad(corners,normal){for(const i of [0,1,2,0,2,3])vertices.push(...corners[i],...normal)}
  quad([[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[0,0,1]);
  quad([[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],[0,0,-1]);
  quad([[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],[-1,0,0]);
  quad([[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],[1,0,0]);
  quad([[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],[0,1,0]);
  quad([[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],[0,-1,0]);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  gl.useProgram(program);const positionLoc=gl.getAttribLocation(program,"aPosition"),normalLoc=gl.getAttribLocation(program,"aNormal");
  gl.enableVertexAttribArray(positionLoc);gl.enableVertexAttribArray(normalLoc);
  gl.vertexAttribPointer(positionLoc,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normalLoc,3,gl.FLOAT,false,24,12);
  const matrixLoc=gl.getUniformLocation(program,"uMVP"),colorLoc=gl.getUniformLocation(program,"uColor");
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  let current="gym",objects=[],selected=null,yaw=.58,elevation=.52,distance=15,lastVP=null;
  const tabs=[...document.querySelectorAll("[data-scene]")];
  const pickerLabel=document.createElement("label");
  pickerLabel.className="sr-objects";
  pickerLabel.innerHTML='<span style="display:block;font-size:11px;font-weight:700;letter-spacing:.09em;margin:9px 0">KEYBOARD OBJECT SELECTION</span>';
  const picker=document.createElement("select");
  picker.setAttribute("aria-label","Select a scene object");
  picker.style.cssText="width:100%;min-height:40px;background:#fff;color:#121819;border:1px solid #aab7a8;border-radius:4px;padding:8px;font:inherit";
  pickerLabel.append(picker);
  document.querySelector(".inspector-list").before(pickerLabel);
  function currentObjects(){return objects.filter(o=>o.id);}
  function restoreInspector(){
    selected=null;objectTitle.textContent="Choose an object";objectDescription.textContent="Click an object in the scene, or use the accessible item selector below.";objectInteraction.textContent="Select / inspect";inspectorTag.textContent="EXPLORE";action.disabled=true;action.textContent="Choose an object first";counter.textContent="0 SELECTED";feedback.textContent="";picker.value="";
  }
  function select(id){
    selected=currentObjects().find(o=>o.id===id)||null;
    feedback.textContent="";
    if(!selected){restoreInspector();return}
    picker.value=selected.id;
    objectTitle.textContent=selected.name;
    objectDescription.textContent=selected.details;
    objectInteraction.textContent=({equipment:"Equipment motion",wishlist:"Wish list",seat:"Seat selection",room:"Room inspection",table:"Table selection"})[selected.kind]||"Inspect";
    inspectorTag.textContent=selected.kind.toUpperCase();
    counter.textContent="1 SELECTED";
    action.disabled=false;
    refreshAction();
  }
  function refreshAction(){
    if(!selected)return;
    const chosen=getSaved(current).has(selected.id);
    action.textContent=({
      equipment:chosen?"Pause motion":"Activate equipment",
      wishlist:chosen?"Remove from sample list":"Add to sample list",
      seat:chosen?"Deselect demo seat":"Select demo seat",
      room:chosen?"Close room detail":"Show room detail",
      table:chosen?"Clear table selection":"Select demo table"
    })[selected.kind]||"Try interaction";
  }
  function setScene(key){
    if(!SCENES[key])return;
    current=key;objects=sceneObjects(key);yaw=.58;elevation=.52;distance=key==="cinema"?17:15;
    const meta=SCENES[key];title.textContent=meta.title;description.textContent=meta.description;objectScene.textContent=meta.title;index.textContent=meta.index+" / 05";
    document.documentElement.style.setProperty("--aqua",meta.accent);
    tabs.forEach(t=>t.setAttribute("aria-selected",String(t.dataset.scene===key)));
    picker.replaceChildren(new Option("Choose an object…",""),...currentObjects().map(o=>new Option(o.name,o.id)));
    restoreInspector();
    if(window.history&&window.history.replaceState){const url=new URL(location.href);url.searchParams.set("scene",key);history.replaceState(null,"",url);}
  }
  tabs.forEach(t=>t.addEventListener("click",()=>setScene(t.dataset.scene)));
  picker.addEventListener("change",()=>select(picker.value));
  action.addEventListener("click",()=>{
    if(!selected)return;
    const saved=getSaved(current);const was=saved.has(selected.id);
    if(was)saved.delete(selected.id);else saved.add(selected.id);
    feedback.textContent=was?"Demo interaction cleared.":"Demo interaction activated. Nothing was submitted or purchased.";
    refreshAction();
  });
  function orbit(d){yaw+=d}
  document.getElementById("orbitLeft").addEventListener("click",()=>orbit(-.24));
  document.getElementById("orbitRight").addEventListener("click",()=>orbit(.24));
  document.getElementById("resetCamera").addEventListener("click",()=>{yaw=.58;elevation=.52;distance=current==="cinema"?17:15});
  document.getElementById("zoomIn").addEventListener("click",()=>distance=clamp(distance-1.4,8,25));
  document.getElementById("zoomOut").addEventListener("click",()=>distance=clamp(distance+1.4,8,25));
  let pointer=null;
  canvas.addEventListener("pointerdown",e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    if(Math.abs(dx)+Math.abs(dy)>2)pointer.moved=true;
    if(pointer.moved){yaw-=dx*.007;elevation=clamp(elevation+dy*.005,.13,1.22);}
    pointer.x=e.clientX;pointer.y=e.clientY;
  });
  canvas.addEventListener("pointerup",e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    if(!pointer.moved)pick(e.clientX,e.clientY);
    pointer=null;
  });
  canvas.addEventListener("pointercancel",()=>pointer=null);
  canvas.addEventListener("wheel",e=>{e.preventDefault();distance=clamp(distance+Math.sign(e.deltaY)*.85,8,25)},{passive:false});
  canvas.addEventListener("keydown",e=>{
    const keys=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","-"];
    if(!keys.includes(e.key))return;
    e.preventDefault();
    if(e.key==="ArrowLeft")yaw-=.15;
    if(e.key==="ArrowRight")yaw+=.15;
    if(e.key==="ArrowUp")elevation=clamp(elevation+.09,.13,1.22);
    if(e.key==="ArrowDown")elevation=clamp(elevation-.09,.13,1.22);
    if(e.key==="+")distance=clamp(distance-1,8,25);
    if(e.key==="-")distance=clamp(distance+1,8,25);
  });
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(1.8,window.devicePixelRatio||1);
    const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  }
  function objectPosition(o,time){
    const activated=getSaved(current).has(o.id);
    if(o.motion==="sway")return [o.x+Math.sin(time*2.5)*(activated?.36:.06),o.y,o.z];
    if(o.motion==="float")return [o.x,o.y+Math.sin(time*1.7+o.x)*.07,o.z];
    return [o.x,o.y,o.z];
  }
  function projected(o,time){
    if(!lastVP)return null;
    const p=objectPosition(o,time),m=lastVP;
    const x=p[0],y=p[1],z=p[2],cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cw=m[3]*x+m[7]*y+m[11]*z+m[15];
    if(cw<=0)return null;
    const rect=canvas.getBoundingClientRect();
    return [rect.left+(cx/cw*.5+.5)*rect.width,rect.top+(.5-cy/cw*.5)*rect.height];
  }
  function pick(px,py){
    let found=null,score=Infinity;const t=performance.now()/1000;
    for(const o of currentObjects()){
      const pt=projected(o,t);if(!pt)continue;
      const d=Math.hypot(pt[0]-px,pt[1]-py);
      if(d<Math.max(29,Math.min(55,o.sy*30))&&d<score){score=d;found=o;}
    }
    if(found)select(found.id);
  }
  const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastFrame=0;
  function frame(ms){
    requestAnimationFrame(frame);
    if(document.hidden||ms-lastFrame<27)return;
    lastFrame=ms;
    resize();
    const t=reduced?0:ms/1000,aspect=canvas.width/canvas.height;
    const eye=[distance*Math.sin(yaw)*Math.cos(elevation),2+distance*Math.sin(elevation),distance*Math.cos(yaw)*Math.cos(elevation)];
    const proj=Mat.perspective(Math.PI/3.3,aspect,.1,100),view=Mat.view(eye,[0,1,0]);
    lastVP=Mat.mul(proj,view);
    gl.clearColor(.045,.075,.085,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    for(const o of objects){
      const p=objectPosition(o,t);
      let angle=o.angle||0;
      if(o.motion==="spin")angle+=t*.7;
      if(o.motion==="run"&&getSaved(current).has(o.id))angle+=Math.sin(t*9)*.06;
      const highlight=o===selected?1.075:1;
      const model=Mat.model(p[0],p[1],p[2],o.sx*highlight,o.sy*highlight,o.sz*highlight,angle);
      const mvp=Mat.mul(lastVP,model),picked=getSaved(current).has(o.id);
      let color=o.color;
      if(o.kind==="seat"&&picked)color=C.green;
      if(o===selected)color=color.map(c=>Math.min(1,c*1.18));
      gl.uniformMatrix4fv(matrixLoc,false,mvp);
      gl.uniform3fv(colorLoc,color);
      gl.drawArrays(gl.TRIANGLES,0,36);
    }
    status.textContent="WEBGL · "+objects.length+" OBJECTS · LIVE";
  }
  let requested="gym";
  try{requested=new URL(location.href).searchParams.get("scene")||"gym"}catch(_){}
  setScene(SCENES[requested]?requested:"gym");
  requestAnimationFrame(frame);
})();

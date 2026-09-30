/* RainWindow: independently implemented screen-space rain and condensation.
   No third-party code, images, textures or audio are included. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('rain'), touch = $('touch'), glass = $('glass');
const ctx = touch.getContext('2d');
const gl = canvas.getContext('webgl2', { alpha:false, antialias:false, powerPreference:'low-power' });
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { scene:'train', rain:55, fog:62, brush:28, wet:true, fogOn:true, motion:!reduced.matches, volume:.45, outside:1, inside:.55, sound:false, w:1, h:1, dpr:1, drops:[], specks:[], inside:[], pointer:null, time:0, userImage:null, lost:false };
const makeCanvas = (w,h) => { const c=document.createElement('canvas'); c.width=w;c.height=h;return c; };
const mask=makeCanvas(1,1), mc=mask.getContext('2d');
const water=makeCanvas(1,1), wc=water.getContext('2d');
const landscape=makeCanvas(1920,1080), lc=landscape.getContext('2d');
const trainPhoto=new Image();
let trainPhotoReady=false;
const backdrop=makeCanvas(1,1), bc=backdrop.getContext('2d');
const soft=makeCanvas(1,1), sc=soft.getContext('2d');
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let seedValue=3712;
function seeded(){seedValue=(Math.imul(seedValue,1664525)+1013904223)>>>0;return seedValue/4294967296;}
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function drawLandscape(){
 const photo=state.userImage||(state.scene==='train'&&trainPhotoReady?trainPhoto:null);
 landscape.width=photo?photo.naturalWidth:1920;
 landscape.height=photo?photo.naturalHeight:1080;
 const w=landscape.width,h=landscape.height;seedValue=state.scene==='train'?93125:11029;lc.clearRect(0,0,w,h);
 if(photo){lc.drawImage(photo,0,0,w,h);return;}
 const sky=lc.createLinearGradient(0,0,0,h);
 if(state.scene==='train'){
  sky.addColorStop(0,'#728988');sky.addColorStop(.43,'#afbbb0');sky.addColorStop(.7,'#8b9d8d');sky.addColorStop(1,'#243d36');lc.fillStyle=sky;lc.fillRect(0,0,w,h);
  glow(lc,1340,340,710,'#d3d5b050');
  for(let layer=0;layer<6;layer++){
   const base=430+layer*67;lc.beginPath();lc.moveTo(0,h);
   for(let x=0;x<=w+12;x+=12){const y=base+Math.sin(x*.003+layer*1.7)*83+Math.sin(x*.0073+layer*2.8)*25+Math.sin(x*.014+layer)*9;lc.lineTo(x,y);}lc.lineTo(w,h);lc.closePath();lc.fillStyle=['#849c96','#718d83','#607e73','#506f61','#3b594c','#294c3b'][layer];lc.fill();
   if(layer>0){for(let i=0;i<130;i++){const x=seeded()*w,y=base+Math.sin(x*.003+layer*1.7)*83+Math.sin(x*.0073+layer*2.8)*25+Math.sin(x*.014+layer)*9;const size=10+seeded()*(17+layer*8);tree(x,y,size,layer);}}
  }
  const mist=lc.createLinearGradient(0,350,0,900);mist.addColorStop(0,'#bac6b100');mist.addColorStop(.34,'#aabdaf40');mist.addColorStop(.54,'#c1c9b437');mist.addColorStop(1,'#92a78d00');lc.fillStyle=mist;lc.fillRect(0,300,w,600);
  lc.beginPath();lc.moveTo(0,900);lc.bezierCurveTo(450,770,830,980,1280,850);lc.bezierCurveTo(1550,780,1770,810,1920,800);lc.lineTo(1920,1080);lc.lineTo(0,1080);lc.fillStyle='#687f6d';lc.fill();
  for(let i=0;i<650;i++){const x=seeded()*w,y=850+seeded()*230;lc.fillStyle=`rgba(183,193,153,${seeded()*.15})`;lc.fillRect(x,y,seeded()*70+4,.6+seeded());}
  // Warm, distant houses create a focal point behind the cool glass.
  for(let i=0;i<7;i++){const x=1180+i*53,y=759+Math.sin(i)*13;lc.fillStyle='#3a4a3b';lc.fillRect(x,y,36,27);lc.beginPath();lc.moveTo(x-5,y);lc.lineTo(x+18,y-15);lc.lineTo(x+40,y);lc.fillStyle='#243b30';lc.fill();lc.fillStyle='#c3a776';lc.fillRect(x+9,y+9,5,7);glow(lc,x+11,y+12,20,'#ffcf762b');}
  for(let i=0;i<15;i++)tree(seeded()*w,1100,150+seeded()*130,7);
 }else{
  sky.addColorStop(0,'#253645');sky.addColorStop(.42,'#6b8082');sky.addColorStop(.66,'#596c70');sky.addColorStop(1,'#15262c');lc.fillStyle=sky;lc.fillRect(0,0,w,h);
  for(let layer=0;layer<3;layer++){for(let i=0;i<35;i++){const x=seeded()*w,bw=30+seeded()*130,bh=90+seeded()*430,by=740+layer*45;lc.fillStyle=['#3c545e','#2c424c','#203740'][layer];lc.fillRect(x,by-bh,bw,bh);for(let yy=by-bh+13;yy<by-8;yy+=17){for(let xx=x+9;xx<x+bw-5;xx+=15){if(seeded()>.53){lc.fillStyle=seeded()>.7?'#cda47888':'#b4d2cf44';lc.fillRect(xx,yy,4+seeded()*4,6);}}}}}
  const road=lc.createLinearGradient(0,720,0,h);road.addColorStop(0,'#354c52');road.addColorStop(1,'#14222b');lc.fillStyle=road;lc.fillRect(0,795,w,285);
  for(let i=0;i<28;i++){const x=seeded()*w,y=640+seeded()*240,orange=seeded()>.32;glow(lc,x,y,50+seeded()*70,orange?'#ed9f514d':'#a3d8e550');glow(lc,x,y,8+seeded()*6,orange?'#ffe9bb':'#e2ffff');const r=lc.createLinearGradient(0,y,0,h);r.addColorStop(0,orange?'#d9986744':'#b9edf644');r.addColorStop(1,'transparent');lc.fillStyle=r;lc.fillRect(x-8,y+22,16,h-y);}
  for(let i=0;i<9;i++){const x=seeded()*w,y=835+seeded()*80;lc.fillStyle='#0c222a';lc.beginPath();lc.roundRect(x,y,100,35,8);lc.fill();for(const dx of[6,78]){glow(lc,x+dx,y+25,65,'#ff64264b');glow(lc,x+dx,y+25,10,'#ffd6a7');}}
  for(let i=0;i<900;i++){const x=seeded()*w,y=810+seeded()*270;lc.fillStyle=`rgba(161,191,195,${seeded()*.07})`;lc.fillRect(x,y,seeded()*50+2,1);}
  glow(lc,1380,680,490,'#eeaa5133');glow(lc,500,240,620,'#a0d2d727');
 }
 // Fine photographic grain is deterministic and belongs to the scenery.
 const pixels=lc.getImageData(0,0,w,h);for(let i=0;i<pixels.data.length;i+=4){const n=(seeded()-.5)*7;pixels.data[i]+=n;pixels.data[i+1]+=n;pixels.data[i+2]+=n;}lc.putImageData(pixels,0,0);
}
function tree(x,y,size,layer){lc.fillStyle=layer===7?'#19372f':`rgba(29,65,48,${.13+layer*.065})`;lc.fillRect(x-1,y-size,2,size);for(let b=0;b<7;b++){const yy=y-size+size*b*.11,half=size*(.035+b*.023);lc.beginPath();lc.moveTo(x,yy-size*.13);lc.lineTo(x-half,yy+size*.14);lc.lineTo(x+half,yy+size*.14);lc.fill();}}
function fitBackground(){
 const w=backdrop.width,h=backdrop.height,s=Math.max(w/landscape.width,h/landscape.height);
 bc.drawImage(landscape,(w-landscape.width*s)/2,(h-landscape.height*s)/2,landscape.width*s,landscape.height*s);
 sc.filter='blur(9px)';sc.drawImage(backdrop,-14,-14,w+28,h+28);sc.filter='none';
 if(program){upload(0,backdrop);upload(1,soft);}
}
// A procedural spherical cap encodes a lens normal and thickness.
const sprite=makeCanvas(80,112), sp=sprite.getContext('2d'), data=sp.createImageData(80,112);
for(let y=0;y<112;y++)for(let x=0;x<80;x++){const ny=(y-53)/52,nx=(x-40)/(33*(1+.1*ny));const r2=nx*nx+ny*ny,i=(y*80+x)*4;if(r2<1){const z=Math.sqrt(1-r2);data.data[i]=127.5+nx*117;data.data[i+1]=127.5+ny*117;data.data[i+2]=z*255;data.data[i+3]=clamp((1-r2)*17,0,1)*255;}}sp.putImageData(data,0,0);
let program=null, textures=[], uniforms={};
const vertex=`#version 300 es
in vec2 position;out vec2 uv;void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;in vec2 uv;out vec4 outColor;
uniform sampler2D sceneTex,softTex,waterTex,fogTex;uniform vec2 resolution;uniform float time,fogStrength,travel,outsideBrightness;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 glassColor(vec2 p){
 vec4 m=texture(waterTex,p);vec2 normal=m.rg*2.-1.;float a=smoothstep(.1,.85,m.a);
 vec2 world=p*.88+.06+vec2(travel,0.);
 vec3 bg=texture(softTex,world).rgb*outsideBrightness;
 vec2 bent=world-normal*(.011+m.b*.028);
 vec3 lens=texture(sceneTex,clamp(bent,vec2(.002),vec2(.998))).rgb*outsideBrightness;
 float rim=pow(clamp(length(normal),0.,1.),7.);
 float light=pow(max(0.,dot(normalize(vec3(normal,.45)),normalize(vec3(-.55,-.8,.5)))),12.);
 lens*=1.-rim*.36;lens+=vec3(.76,.85,.77)*light*.39;
 lens+=vec3(.19,.22,.21)*pow(max(0.,normal.y),9.)*rim;
 return mix(bg,lens,a);
}
void main(){
 float maskValue=texture(fogTex,uv).r;
 float edgeDistance=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
 float edgeFog=1.-smoothstep(.02,.30,edgeDistance);
 float cloud=.5+.25*sin(uv.x*13.+sin(uv.y*7.))+.25*sin(uv.y*17.-uv.x*5.);
 float mist=maskValue*fogStrength*(.71+.39*edgeFog+.17*cloud);
 vec3 clean=glassColor(uv);vec3 scatter=vec3(0.);
 vec2 px=vec2(4.)/resolution;
 scatter+=glassColor(uv+vec2(px.x,0.));scatter+=glassColor(uv-vec2(px.x,0.));
 scatter+=glassColor(uv+vec2(0.,px.y));scatter+=glassColor(uv-vec2(0.,px.y));
 scatter+=glassColor(uv+px*1.5);scatter+=glassColor(uv-px*1.5);scatter/=6.;
 vec3 frost=mix(scatter,vec3(.66,.74,.70),.29);
 float grain=hash(floor(uv*resolution))-.5;
 frost+=grain*.036;vec3 col=mix(clean,frost,clamp(mist,0.,1.));
 // A subtle wet meniscus follows the boundary of each wiped stroke.
 vec2 stepUv=vec2(2.)/resolution;
 vec2 wetGradient=vec2(texture(fogTex,uv+vec2(stepUv.x,0.)).r-texture(fogTex,uv-vec2(stepUv.x,0.)).r,texture(fogTex,uv+vec2(0.,stepUv.y)).r-texture(fogTex,uv-vec2(0.,stepUv.y)).r);
 float wetEdge=clamp(length(wetGradient)*1.5,0.,1.)*fogStrength;
 col=col*(1.-wetEdge*.09)+vec3(.11,.14,.13)*max(0.,-wetGradient.y)*fogStrength;
 float vignette=1.-.20*pow(length((uv-.5)*1.32),2.);
 outColor=vec4(col*vignette+grain*.008,1.);
}`;
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function initGL(){if(!gl){$('fallback').hidden=false;return false;}try{
 program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
 textures=[0,1,2,3].map(i=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;});
 ['sceneTex','softTex','waterTex','fogTex'].forEach((name,i)=>gl.uniform1i(gl.getUniformLocation(program,name),i));
 ['resolution','time','fogStrength','travel','outsideBrightness'].forEach(name=>uniforms[name]=gl.getUniformLocation(program,name));return true;
 }catch(e){console.error(e);$('fallback').hidden=false;return false;}}
function upload(unit,source){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,textures[unit]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}
function resetFog(){mc.globalCompositeOperation='source-over';mc.globalAlpha=1;mc.fillStyle='#fff';mc.fillRect(0,0,state.w,state.h);state.inside=[];state.pointer=null;ctx.clearRect(0,0,state.w,state.h);}
function resize(){const rect=glass.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.65);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(w===state.w&&h===state.h)return;
 const saved=makeCanvas(mask.width,mask.height);saved.getContext('2d').drawImage(mask,0,0);const oldW=state.w,oldH=state.h;
 state.w=Math.max(1,w);state.h=Math.max(1,h);state.dpr=dpr;for(const c of[canvas,touch,mask,water]){c.width=state.w;c.height=state.h;}
 backdrop.width=soft.width=Math.min(1500,state.w);backdrop.height=soft.height=Math.round(backdrop.width*state.h/state.w);
 if(oldW>1){mc.drawImage(saved,0,0,state.w,state.h);for(const d of[...state.drops,...state.specks,...state.inside]){d.x*=w/oldW;d.y*=h/oldH;}}else{resetFog();seedRain();}
 if(gl&&program){gl.viewport(0,0,state.w,state.h);fitBackground();}
}
function bead(x,y,r,moving=false){return{x,y,r,v:moving?rand(6,22):0,phase:rand(0,6.28),age:0,wait:rand(.7,7),trail:0,pin:rand(3.8,6.2),shape:rand(.89,1.11)};}
function seedRain(){state.drops=[];state.specks=[];const area=state.w*state.h/(state.dpr*state.dpr);for(let i=0;i<Math.min(65,area/6500);i++)state.drops.push(bead(rand(0,state.w),rand(0,state.h),rand(3,10)*state.dpr,Math.random()<.18));for(let i=0;i<Math.min(1300,area/330);i++)state.specks.push(bead(rand(0,state.w),rand(0,state.h),rand(.45,1.9)*state.dpr));}
function drawBead(d){const stretch=1+Math.min(.55,d.v/180),width=d.r*(d.shape||1)*(1-Math.min(.13,d.v/1000));wc.drawImage(sprite,d.x-width,d.y-d.r*1.25,width*2,d.r*2.6*stretch);}
function tickRain(dt){
 wc.clearRect(0,0,state.w,state.h);const density=state.rain/55;
 if(state.specks.length<1300&&Math.random()<dt*density*24)state.specks.push(bead(rand(0,state.w),rand(0,state.h),rand(.45,1.9)*state.dpr));
 if(Math.random()<dt*density*5&&state.drops.length<160)state.drops.push(bead(rand(0,state.w),rand(-25,state.h*.7),rand(2.8,8)*state.dpr,Math.random()<.2));
 for(let i=0;i<Math.min(state.specks.length,Math.round(state.specks.length*Math.min(1.7,density)));i++)drawBead(state.specks[i]);
 for(let i=state.drops.length-1;i>=0;i--){const d=state.drops[i];d.age+=dt;d.wait-=dt;
  if(state.rain>0){
   if(d.wait>0)d.v*=Math.exp(-dt*9);
   else if(d.r>d.pin*state.dpr){d.v=Math.min(130*state.dpr,d.v+dt*(d.r/state.dpr-d.pin+2)*19);if(Math.random()<dt*.38){d.wait=rand(.3,2.6);}}
   else d.v*=Math.exp(-dt*6);
  }
  if(state.rain===0)d.v*=Math.pow(.05,dt);
  if(d.v>1){d.y+=d.v*dt;d.x+=Math.sin(d.age*1.5+d.phase)*dt*3;d.trail+=d.v*dt;
   if(d.trail>d.r*1.7){d.trail=0;if(state.specks.length<1500)state.specks.push(bead(d.x+rand(-d.r*.25,d.r*.25),d.y-d.r,rand(.9,1.7)*state.dpr));d.r*=.991;}
   // Sliding exterior water collects small exterior beads, never the interior fog.
   for(let j=state.specks.length-1;j>=0;j--){const p=state.specks[j];if(Math.abs(p.x-d.x)<d.r*.6&&Math.abs(p.y-d.y)<d.r*1.2)state.specks.splice(j,1);}
   for(let j=0;j<i;j++){const p=state.drops[j];if(p.dead)continue;if(Math.hypot(d.x-p.x,d.y-p.y)<(d.r+p.r)*.68){d.x+=(p.x-d.x)*.18;d.r=Math.min(17*state.dpr,Math.sqrt(d.r*d.r+p.r*p.r*.8));d.v+=18*state.dpr;d.wait=-1;p.dead=true;}}
  }
  if(d.dead||d.y>state.h+40){state.drops.splice(i,1);continue;}drawBead(d);
 }
}
function drawInside(dt){ctx.clearRect(0,0,state.w,state.h);for(let i=state.inside.length-1;i>=0;i--){const d=state.inside[i];d.age+=dt;d.r-=dt*.014*state.dpr;if(d.r>2.6*state.dpr){d.v=Math.min(22*state.dpr,d.v+dt*2);d.y+=d.v*dt;}if(d.age>95||d.r<.5||d.y>state.h+20){state.inside.splice(i,1);continue;}
 ctx.save();ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*1.4,0,0,Math.PI*2);ctx.clip();const sx=clamp(d.x/state.w*backdrop.width-8,0,backdrop.width-18),sy=clamp(d.y/state.h*backdrop.height-12,0,backdrop.height-25);ctx.drawImage(backdrop,sx,sy,18,25,d.x-d.r,d.y-d.r*1.4,d.r*2,d.r*2.8);const g=ctx.createLinearGradient(d.x-d.r,d.y-d.r,d.x+d.r,d.y+d.r);g.addColorStop(0,'#e6f4e67a');g.addColorStop(.25,'#a6c7b72b');g.addColorStop(.68,'#122a2566');g.addColorStop(1,'#e0efc98a');ctx.fillStyle=g;ctx.fillRect(d.x-d.r,d.y-d.r*1.5,d.r*2,d.r*3);ctx.restore();ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*1.4,0,0,Math.PI*2);ctx.strokeStyle='#0d242738';ctx.lineWidth=.7*state.dpr;ctx.stroke();}
}
function wipe(x,y){if(!state.fogOn)return;const r=state.brush*.5*state.dpr;mc.save();mc.globalCompositeOperation='source-over';const g=mc.createRadialGradient(x,y,r*.25,x,y,r);g.addColorStop(0,'rgba(0,0,0,.98)');g.addColorStop(.72,'rgba(0,0,0,.91)');g.addColorStop(1,'rgba(0,0,0,0)');mc.fillStyle=g;mc.beginPath();mc.arc(x,y,r,0,Math.PI*2);mc.fill();mc.restore();}
function point(e){const r=touch.getBoundingClientRect();return{x:(e.clientX-r.left)*state.w/r.width,y:(e.clientY-r.top)*state.h/r.height};}
function fingerBead(p,chance){if(state.wet&&state.fogOn&&Math.random()<chance&&state.inside.length<200)state.inside.push(bead(p.x+rand(-4,4)*state.dpr,p.y+rand(0,6)*state.dpr,rand(1.3,3.8)*state.dpr));}
touch.addEventListener('pointerdown',e=>{if(state.pointer)return;e.preventDefault();touch.setPointerCapture(e.pointerId);state.pointer={id:e.pointerId,...point(e),distance:0};wipe(state.pointer.x,state.pointer.y);$('drawHint').classList.add('drawn');});
touch.addEventListener('pointermove',e=>{const prev=state.pointer;if(!prev||prev.id!==e.pointerId)return;const samples=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const ev of samples.length?samples:[e]){const p=point(ev),dist=Math.hypot(p.x-prev.x,p.y-prev.y),steps=Math.max(1,Math.ceil(dist/(state.brush*state.dpr*.16)));for(let i=1;i<=steps;i++)wipe(prev.x+(p.x-prev.x)*i/steps,prev.y+(p.y-prev.y)*i/steps);prev.distance+=dist;if(prev.distance>25*state.dpr){fingerBead(p,.32);prev.distance=0;}prev.x=p.x;prev.y=p.y;}});
function finish(e){if(state.pointer?.id===e.pointerId){fingerBead(state.pointer,.5);state.pointer=null;}}
touch.addEventListener('pointerup',finish);touch.addEventListener('pointercancel',()=>state.pointer=null);touch.addEventListener('lostpointercapture',()=>state.pointer=null);
touch.addEventListener('keydown',e=>{if(e.key==='Escape')state.pointer=null;});
let last=0,fogTimer=0;
function frame(t){requestAnimationFrame(frame);if(document.hidden||state.lost||!program){last=t;return;}const dt=Math.min(.045,(t-last)/1000||.016);last=t;state.time+=dt;tickRain(dt);drawInside(dt);
 fogTimer+=dt;if(fogTimer>.15&&state.fogOn){
  mc.globalCompositeOperation='source-over';
  const bloom=mc.createRadialGradient(state.w*.48,state.h*.42,0,state.w*.48,state.h*.42,Math.max(state.w,state.h)*.65);
  bloom.addColorStop(0,`rgba(255,255,255,${1-Math.exp(-fogTimer/62)})`);
  bloom.addColorStop(.55,`rgba(255,255,255,${1-Math.exp(-fogTimer/43)})`);
  bloom.addColorStop(1,`rgba(255,255,255,${1-Math.exp(-fogTimer/25)})`);
  mc.fillStyle=bloom;mc.fillRect(0,0,state.w,state.h);fogTimer=0;
 }
 upload(2,water);upload(3,mask);gl.useProgram(program);gl.uniform2f(uniforms.resolution,state.w,state.h);gl.uniform1f(uniforms.time,state.time);gl.uniform1f(uniforms.fogStrength,state.fogOn?state.fog/100:0);const travel=state.scene==='train'&&state.motion?((state.time*.006)%0.09):0;gl.uniform1f(uniforms.travel,travel);gl.uniform1f(uniforms.outsideBrightness,state.outside);gl.drawArrays(gl.TRIANGLES,0,6);
 if(state.scene==='train'&&state.motion){const t=state.time;$('assembly').style.transform=`translate(${Math.sin(t*.9)*.65}px,${Math.sin(t*2.1)*.55}px) rotate(${Math.sin(t*.72)*.065}deg)`;}else $('assembly').style.transform='none';
 if(audio)audio.tick(dt);
}
// Locally synthesized ambience. A slow rain bed + random roof impacts;
// the train adds low rumble and paired, slightly irregular wheel joints.
class Ambience{
 constructor(){this.ac=new(window.AudioContext||window.webkitAudioContext)();const a=this.ac;this.master=a.createGain();this.master.gain.value=0;const limit=a.createDynamicsCompressor();limit.threshold.value=-15;limit.ratio.value=5;this.master.connect(limit);limit.connect(a.destination);this.rainGain=a.createGain();this.trainGain=a.createGain();this.rainGain.connect(this.master);this.trainGain.connect(this.master);this.noise=a.createBuffer(2,a.sampleRate*7,a.sampleRate);for(let ch=0;ch<2;ch++){const data=this.noise.getChannelData(ch);let brown=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;brown=(brown+.018*white)/1.018;data[i]=white*.45+brown*2;}}this.bed(820,.2,this.rainGain,'lowpass');this.bed(3200,.025,this.rainGain,'bandpass');this.bed(145,.55,this.trainGain,'lowpass');this.bed(420,.07,this.trainGain,'bandpass');this.rail=0;this.hit=0;this.fileRain=new Audio('assets/rain-ambience.mp3');this.fileTrain=new Audio('assets/train-ambience.mp3');for(const track of [this.fileRain,this.fileTrain]){track.loop=true;track.preload='auto';track.volume=0;}this.apply();}
 bed(freq,gain,destination,type){const a=this.ac,s=a.createBufferSource(),filter=a.createBiquadFilter(),g=a.createGain();s.buffer=this.noise;s.loop=true;filter.type=type;filter.frequency.value=freq;filter.Q.value=.45;g.gain.value=gain;s.connect(filter);filter.connect(g);g.connect(destination);s.start(0,Math.random()*5);}
 apply(){const t=this.ac.currentTime;this.master.gain.setTargetAtTime(state.sound?state.volume:0,t,.15);this.rainGain.gain.setTargetAtTime(0,t,.4);this.trainGain.gain.setTargetAtTime(0,t,.4);this.fileRain.volume=state.sound?Math.min(.32,state.volume*.38):0;this.fileTrain.volume=state.sound&&state.scene==='train'?Math.min(.24,state.volume*.30):0;const wanted=state.scene==='train'?this.fileTrain:this.fileRain;const other=state.scene==='train'?this.fileRain:this.fileTrain;if(state.sound){wanted.play().catch(()=>{});other.pause();}else{this.fileRain.pause();this.fileTrain.pause();}}
 pulse(train=false,delay=0){const a=this.ac,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),pan=a.createStereoPanner(),t=a.currentTime+delay;s.buffer=this.noise;f.type='bandpass';f.frequency.value=train?rand(90,170):rand(650,2300);f.Q.value=train?.7:1.7;g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(train?.10:rand(.016,.07),t+.006);g.gain.exponentialRampToValueAtTime(.00001,t+(train?.20:.09));pan.pan.value=rand(-.8,.8);s.connect(f);f.connect(g);g.connect(pan);pan.connect(train?this.trainGain:this.rainGain);s.start(t,Math.random()*5);s.stop(t+.24);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();pan.disconnect();};}
 tick(dt){if(!state.sound)return;this.hit-=dt;this.rail-=dt;if(this.hit<0){this.hit=rand(.035,.19);this.pulse();}if(this.rail<0&&state.scene==='train'){this.rail=rand(1.2,1.55);this.pulse(true);this.pulse(true,.17);}}
}
let audio=null;
$('sound').onclick=async()=>{try{if(!audio)audio=new Ambience();await audio.ac.resume();state.sound=!state.sound;$('sound').setAttribute('aria-pressed',state.sound);$('soundLabel').textContent=state.sound?'正在听雨':'开启声音';audio.apply();}catch(e){console.error(e);toast('声音未能开启，请再次点击或更换浏览器');}};
function toggle(id,key){$(id).onclick=()=>{state[key]=!state[key];$(id).setAttribute('aria-pressed',state[key]);};}
toggle('fogToggle','fogOn');toggle('wetToggle','wet');toggle('motion','motion');$('motion').setAttribute('aria-pressed',state.motion);
$('reset').onclick=()=>{state.fogOn=true;$('fogToggle').setAttribute('aria-pressed','true');resetFog();toast('玻璃重新蒙上了雾气');};
$('settings').onclick=()=>{const opened=$('settingsPanel').hidden;$('settingsPanel').hidden=!opened;$('settings').setAttribute('aria-expanded',opened);$('settings').querySelector('span').textContent=opened?'−':'＋';};
for(const [id,key,unit]of[['rainAmount','rain','%'],['fogAmount','fog','%'],['brush','brush',' px'],['volume','volume','%']]){$(id).oninput=e=>{const v=Number(e.target.value);state[key]=key==='volume'?v/100:v;$(id+'Value').textContent=v+unit;if(audio)audio.apply();};}
$('windowSize').oninput=e=>{const value=+e.target.value;document.documentElement.style.setProperty('--width',value+'%');$('windowSizeValue').textContent=value<80?'小窗':value>94?'宽窗':'标准';};
for(const [id,key] of [['outside','outside'],['inside','inside']])$(id).oninput=e=>{const value=+e.target.value;state[key]=value/100;$(id+'Value').textContent=value+'%';document.documentElement.style.setProperty('--cabin-light',state.inside);};
for(const button of document.querySelectorAll('.scene-tabs button')){button.onclick=()=>{if(state.scene===button.dataset.scene)return;state.scene=button.dataset.scene;document.body.dataset.scene=state.scene;document.querySelectorAll('.scene-tabs button').forEach(b=>b.setAttribute('aria-pressed',b===button));$('sceneNumber').textContent=state.scene==='train'?'01 / THE SLOW TRAIN':'02 / AFTER HOURS';$('sceneCaption').textContent=state.scene==='train'?'灯火渐远，雨还在下':'城市睡了，留一盏灯';$('motion').disabled=state.scene==='car';$('motion').style.opacity=state.scene==='car'?'.4':'1';drawLandscape();fitBackground();resetFog();seedRain();if(audio)audio.apply();};}
$('photo').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{state.userImage=im;drawLandscape();fitBackground();URL.revokeObjectURL(url);toast('风景已更换，照片只在本机使用');};im.onerror=()=>{URL.revokeObjectURL(url);toast('无法读取这张图片，请使用 JPG 或 PNG');};im.src=url;e.target.value='';};
$('defaultView').onclick=()=>{state.userImage=null;drawLandscape();fitBackground();toast('已恢复当前场景的风景');};
function immersive(on){document.body.classList.toggle('immersive',on);$('exitImmersive').hidden=!on;$('immersive').setAttribute('aria-label',on?'退出沉浸模式':'进入沉浸模式');}
$('immersive').onclick=()=>immersive(true);$('exitImmersive').onclick=()=>immersive(false);addEventListener('keydown',e=>{if(e.key==='Escape')immersive(false);});
document.addEventListener('visibilitychange',()=>{if(audio){if(document.hidden)audio.ac.suspend();else if(state.sound)audio.ac.resume();}});
reduced.addEventListener('change',e=>{if(e.matches){state.motion=false;$('motion').setAttribute('aria-pressed','false');}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state.lost=true;toast('图形上下文暂时中断，等待恢复');});
canvas.addEventListener('webglcontextrestored',()=>{state.lost=false;if(initGL()){gl.viewport(0,0,state.w,state.h);fitBackground();}});
trainPhoto.onload=()=>{trainPhotoReady=true;if(state.scene==='train'&&!state.userImage){drawLandscape();fitBackground();}};
trainPhoto.onerror=()=>toast('列车背景照片加载失败，暂时显示备用风景');
trainPhoto.src='assets/train-city.jpg';
drawLandscape();if(initGL()){resize();new ResizeObserver(()=>requestAnimationFrame(resize)).observe(glass);requestAnimationFrame(frame);}
})();

/* Dex Rig editor shell. Entirely local: no network requests, external scripts or telemetry. */
(() => {
  'use strict';
  const E=window.DexRigEngine, GIF=window.DexRigGIF;
  if(!E||!GIF)throw new Error('Dex Rig engine failed to load');
  const $=id=>document.getElementById(id);
  const stage=$('stage'),overlay=$('overlay'),ctx=stage.getContext('2d'),guide=overlay.getContext('2d');
  const images=new Map();
  const CACHE_KEY='dexrig.project.v1';
  let project, selectedId=null, time=0, playing=false, frameId=null, originTick=0, imageGeneration=0;
  let tool='move', polygon=[], dragging=null, saveTimer=null, inspectorTab='pose', exportBusy=false;
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(x))?Number(x):a));
  const num=(v,digits=1)=>Number(v).toFixed(digits);
  const id=()=> 'part_'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,14):Math.random().toString(36).slice(2,15));
  const selected=()=>project?.layers.find(l=>l.id===selectedId)||null;
  const stamp=()=>new Date().toISOString().slice(0,10);
  const slug=()=>project.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'dex-rig';
  function announce(message,level='info') { const n=$('notice');n.textContent=message;n.className=level==='error'?'error':level==='warn'?'warn':''; }
  function saveLater() {
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      try {
        const str=JSON.stringify(project);
        if(str.length>2500000){localStorage.removeItem(CACHE_KEY);$('autosave-label').textContent='MANUAL SAVE REQUIRED';announce('Project is too large for browser autosave. Use Save project.','warn');return;}
        localStorage.setItem(CACHE_KEY,str);$('autosave-label').textContent='LOCALLY AUTOSAVED';
      }catch(_){$('autosave-label').textContent='MANUAL SAVE REQUIRED';}
    },650);
  }
  function dirty(message) {saveLater();draw();renderLoopStatus();if(message)announce(message);}
  function makeSprite(w,h,painter){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');painter(g,w,h);return c.toDataURL('image/png');}
  function part(name,src,bounds,z,parentId=null,pivot={x:.5,y:.5},motions=[]){return{id:id(),name,src,originalSrc:null,parentId,visible:true,locked:false,z,bounds,pivot,transform:E.identity(),keyframes:[],motions};}
  function demoProject(){
    const body=part('Body / breath',makeSprite(240,205,(g,w,h)=>{g.fillStyle='#385467';g.beginPath();g.ellipse(w/2,h/2,115,97,0,0,Math.PI*2);g.fill();g.strokeStyle='#162c3b';g.lineWidth=9;g.stroke();g.fillStyle='#d5bda0';g.beginPath();g.ellipse(w/2,116,48,66,0,0,Math.PI*2);g.fill();}),{x:200,y:286,width:240,height:205},3,null,{x:.5,y:.6},[{kind:'breath',enabled:true,amplitude:1,frequency:.5,phase:0}]);
    const tail=part('Tail / sway',makeSprite(130,85,(g)=>{g.fillStyle='#bd7f5a';g.beginPath();g.moveTo(10,43);g.bezierCurveTo(80,30,89,2,125,3);g.bezierCurveTo(118,69,62,81,10,55);g.closePath();g.fill();}),{x:402,y:320,width:130,height:85},1,body.id,{x:.12,y:.5},[{kind:'tailSway',enabled:true,amplitude:.7,frequency:1,phase:0}]);
    const head=part('Head / nod',makeSprite(224,200,(g,w,h)=>{g.fillStyle='#47677b';g.beginPath();g.ellipse(112,105,103,92,0,0,Math.PI*2);g.fill();g.strokeStyle='#1a3443';g.lineWidth=8;g.stroke();g.fillStyle='#d4bd9f';g.beginPath();g.ellipse(112,143,58,42,0,0,Math.PI*2);g.fill();g.fillStyle='#242c31';g.beginPath();g.ellipse(112,128,14,9,0,0,Math.PI*2);g.fill();}),{x:206,y:143,width:224,height:200},5,body.id,{x:.5,y:.88},[{kind:'sway',enabled:true,amplitude:.13,frequency:.5,phase:0}]);
    const earL=part('Ear / left',makeSprite(77,137,(g)=>{g.fillStyle='#35546b';g.beginPath();g.moveTo(15,132);g.lineTo(7,8);g.quadraticCurveTo(37,-7,70,130);g.closePath();g.fill();g.fillStyle='#c58f81';g.beginPath();g.moveTo(28,112);g.lineTo(27,36);g.lineTo(53,112);g.closePath();g.fill();}),{x:230,y:80,width:77,height:137},4,head.id,{x:.6,y:.95},[{kind:'earTwitch',enabled:true,amplitude:.48,frequency:.5,phase:.02}]);
    const earR=part('Ear / right',makeSprite(77,137,(g)=>{g.fillStyle='#35546b';g.beginPath();g.moveTo(12,130);g.quadraticCurveTo(35,-7,69,10);g.lineTo(66,133);g.closePath();g.fill();g.fillStyle='#c58f81';g.beginPath();g.moveTo(25,112);g.lineTo(51,35);g.lineTo(51,112);g.closePath();g.fill();}),{x:347,y:80,width:77,height:137},4,head.id,{x:.4,y:.95},[{kind:'earTwitch',enabled:true,amplitude:.33,frequency:.5,phase:.2}]);
    const eyes=part('Eyes / blink',makeSprite(115,29,(g)=>{g.fillStyle='#f0e5d7';g.beginPath();g.ellipse(23,13,18,13,0,0,Math.PI*2);g.ellipse(92,13,18,13,0,0,Math.PI*2);g.fill();g.fillStyle='#202832';g.beginPath();g.ellipse(25,13,7,9,0,0,Math.PI*2);g.ellipse(90,13,7,9,0,0,Math.PI*2);g.fill();}),{x:264,y:239,width:115,height:29},8,head.id,{x:.5,y:.5},[{kind:'blink',enabled:true,amplitude:1,frequency:.5,phase:.28}]);
    return{schema:'dex-rig/v1',title:'Rig study / geometric demo',width:640,height:640,duration:2,fps:24,layers:[tail,body,earL,earR,head,eyes]};
  }
  const blankProject=()=>({schema:'dex-rig/v1',title:'Untitled rig',width:640,height:640,duration:2,fps:24,layers:[]});
  function syncImageSources(){
    const generation=++imageGeneration;images.clear();
    for(const layer of project.layers){
      const img=new Image();images.set(layer.id,img);
      img.onload=()=>{if(generation===imageGeneration)draw();};
      img.onerror=()=>{if(generation===imageGeneration)announce(`Could not decode image: ${layer.name}`,'error');};
      img.src=layer.src;
    }
  }
  function loadProject(value,fromStorage=false){
    pause();project=E.normalizeProject(value);selectedId=project.layers[0]?.id||null;time=0;tool='move';polygon=[];
    stage.width=overlay.width=project.width;stage.height=overlay.height=project.height;
    $('canvas-wrap').style.aspectRatio=`${project.width} / ${project.height}`;
    $('project-title').value=project.title;
    $('duration-input').value=project.duration;$('fps-input').value=String(project.fps);
    $('scene-dimensions').textContent=`${project.width} × ${project.height} PX`;
    syncImageSources();setTool('move');refresh();
    if(!fromStorage)saveLater();
  }
  function refresh(){renderLayerList();renderInspector();renderTimeline();renderLoopStatus();draw();}
  function renderLayerList(){
    const target=$('layer-list');$('layer-count').textContent=String(project.layers.length).padStart(2,'0');
    const sorted=[...project.layers].sort((a,b)=>b.z-a.z);
    target.innerHTML=sorted.length?sorted.map(l=>`<div class="layer-item ${l.id===selectedId?'active':''}"><button type="button" class="layer-select" data-select="${l.id}" aria-label="Select ${escapeHTML(l.name)}"><span class="layer-color" aria-hidden="true">◈</span><span style="min-width:0"><span class="layer-title">${escapeHTML(l.name)}</span><span class="layer-meta">${l.parentId?'CHILD':'ROOT'} · Z${l.z}</span></span></button><button type="button" class="icon-toggle" data-visible="${l.id}" aria-label="${l.visible?'Hide':'Show'} ${escapeHTML(l.name)}" aria-pressed="${l.visible}">${l.visible?'◉':'⊘'}</button><button type="button" class="icon-toggle" data-lock="${l.id}" aria-label="${l.locked?'Unlock':'Lock'} ${escapeHTML(l.name)}" aria-pressed="${l.locked}">${l.locked?'▣':'▢'}</button></div>`).join(''):'<div class="empty-state">No artwork yet.<br>Import a transparent part or a flattened illustration to begin.</div>';
    for(const bid of ['move-layer-up','move-layer-down','delete-layer','keyframe-add','extract-toggle'])$(bid).disabled=!selected();
  }
  function field(label,key,value,step='1',min=null,max=null){return `<label class="field"><span>${escapeHTML(label)}</span><input type="number" data-field="${key}" step="${step}" ${min===null?'':`min="${min}"`} ${max===null?'':`max="${max}"`} value="${Number.isFinite(+value)?num(value,3):0}"></label>`;}
  function inspectorPose(layer){
    if(!layer)return '<div class="help-card"><strong>No layer selected.</strong><p>Import a transparent PNG part or load the geometric demo. Select a layer to edit position, hierarchy, pivot, and keyframes.</p></div>';
    const parents=['<option value="">No parent (root)</option>',...project.layers.filter(x=>E.isValidParent(project.layers,layer.id,x.id)).map(x=>`<option value="${x.id}" ${x.id===layer.parentId?'selected':''}>${escapeHTML(x.name)}</option>`)].join('');
    return `<div class="editor-section"><h3>Selected layer</h3><div class="field-grid"><label class="field full"><span>Name</span><input type="text" maxlength="80" data-field="name" value="${escapeHTML(layer.name)}"></label><label class="field full"><span>Parent layer</span><select data-field="parentId">${parents}</select></label></div><p class="helper">Parent movement propagates to children. Locked layers cannot be dragged.</p></div>
    <div class="editor-section"><h3>Base pose</h3><div class="field-grid">${field('X offset','x',layer.transform.x)}${field('Y offset','y',layer.transform.y)}${field('Rotation °','rotation',layer.transform.rotation,.5)}${field('Opacity','opacity',layer.transform.opacity,.05,0,1)}${field('Scale X','scaleX',layer.transform.scaleX,.05,-8,8)}${field('Scale Y','scaleY',layer.transform.scaleY,.05,-8,8)}</div><button type="button" data-action="keyframe" class="ui-button property-action">◆ Key this base pose</button></div>
    <div class="editor-section"><h3>Anchor / pivot</h3><div class="field-grid">${field('Pivot X (0–1)','pivotX',layer.pivot.x,.05,-2,3)}${field('Pivot Y (0–1)','pivotY',layer.pivot.y,.05,-2,3)}${field('Art X','boundX',layer.bounds.x)}${field('Art Y','boundY',layer.bounds.y)}${field('Art width','boundW',layer.bounds.width,1,1,4096)}${field('Art height','boundH',layer.bounds.height,1,1,4096)}</div><p class="helper">Pivot markers appear on the stage. Rotation happens around this point.</p></div>
    <div class="editor-section"><h3>Keyframe management</h3><p class="helper">Keyframes contain complete transforms. Click a diamond on the timeline to scrub. Base pose changes do not overwrite a keyed pose.</p><button type="button" data-action="remove-key" class="ui-button property-action subtle">Remove key near playhead</button>${layer.originalSrc?'<button type="button" data-action="restore-source" class="ui-button property-action">Restore original source image</button>':''}</div>`;
  }
  function inspectorMotion(layer){
    const kinds=E.MOTION_TYPES;
    const values=layer?.motions||[];
    const cards=values.map((m,i)=>`<div class="micro-motion-row"><div class="motion-row-top"><label class="field-inline"><input type="checkbox" data-motion-enable="${i}" ${m.enabled?'checked':''}>${escapeHTML(m.kind)}</label><button type="button" class="text-button" data-motion-remove="${i}" aria-label="Remove ${escapeHTML(m.kind)}">Remove</button></div><div class="motion-row-bottom"><label><span>Strength</span><input data-motion-value="${i}:amplitude" type="number" step=".1" min="0" max="30" value="${num(m.amplitude,2)}"></label><label><span>Cycles / sec</span><input data-motion-value="${i}:frequency" type="number" step=".1" min="0" max="15" value="${num(m.frequency,2)}"></label></div></div>`).join('');
    return `<div class="editor-section"><h3>Motion presets</h3><div class="preset-grid"><button type="button" data-preset="idle">Soft idle</button><button type="button" data-preset="curious">Curious</button><button type="button" data-preset="alert">Alert</button><button type="button" data-preset="quiet">Still / reset</button></div><p class="helper">Presets map to semantically named layers. They do not change artwork or identity.</p></div><div class="editor-section"><h3>Micro-motion oscillators</h3>${layer?`<p class="helper">Current layer: <strong>${escapeHTML(layer.name)}</strong></p>${cards||'<p class="helper">No procedural motion on this layer.</p>'}<div class="field-grid"><label class="field full"><span>Add oscillator</span><select id="new-motion-kind">${kinds.map(k=>`<option value="${k}">${k}</option>`).join('')}</select></label></div><button class="ui-button property-action" type="button" data-action="add-motion">+ Add motion</button>`:'<p class="helper">Select a layer to attach an oscillator.</p>'}</div><div class="help-card"><strong>One clock, multiple signals.</strong> Procedural breath, blinks, twitches and sway are composed onto keyframed poses using elapsed time. Exports sample the same engine as the preview.</div>`;
  }
  function inspectorExport(){
    return `<div class="editor-section"><h3>Export animation</h3><p class="helper">Exports have a transparent background. The checkerboard is only an editor guide, never part of your artwork.</p><div class="export-actions"><button type="button" class="ui-button" data-export="png">Current frame <small>PNG · full size</small></button><button type="button" class="ui-button" data-export="sheet">Sprite sheet <small>PNG · all frames</small></button><button type="button" class="ui-button primary" data-export="gif">Animated loop <small>GIF · max 360px, 90 frames</small></button><button type="button" class="ui-button" data-export="json">Rig and source art <small>JSON · editable project</small></button></div></div><div class="editor-section"><h3>Continuity check</h3><p class="helper">A perfect loop requires the start and end transforms, including procedural oscillators, to match. This inspector compares both ends of the full hierarchy.</p><button type="button" class="ui-button property-action" data-action="loop-check">Check loop seam</button></div><div class="help-card"><strong>Local by design.</strong> No account, telemetry, model service, cloud renderer, or network connection. Exported JSON embeds imported raster images; it can get large.</div>`;
  }
  function renderInspector(){
    $('inspector-content').innerHTML=inspectorTab==='pose'?inspectorPose(selected()):inspectorTab==='motion'?inspectorMotion(selected()):inspectorExport();
    document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.tab===inspectorTab)));
  }
  function renderTimeline(){
    $('time-slider').max=String(project.duration*1000);$('time-slider').value=String(Math.round(time*1000));
    $('duration-end').textContent=`${num(project.duration)}s`;
    const mm=seconds=>`${String(Math.floor(seconds)).padStart(2,'0')}:${String(Math.round((seconds%1)*100)).padStart(2,'0')}`;
    $('time-display').textContent=`${mm(time)} / ${mm(project.duration)}`;
    const layer=selected();$('track-name').textContent=layer?`${layer.name.toUpperCase()} · ${layer.keyframes.length} KEYS`:'SELECT A LAYER TO SEE KEYFRAMES';
    $('keyframe-track').innerHTML=layer?layer.keyframes.map((key,i)=>`<button type="button" class="keyframe-marker ${Math.abs(key.timeNormalized*project.duration-time)<.05?'active':''}" style="left:${key.timeNormalized*100}%" data-key="${i}" title="Keyframe at ${num(key.timeNormalized*project.duration,2)} seconds" aria-label="Go to keyframe at ${num(key.timeNormalized*project.duration,2)} seconds"></button>`).join(''):'';
  }
  function renderLoopStatus(){
    if(!project)return;
    try{const result=E.loopAnalysis(project);const offenders=result.rows.filter(r=>!r.seamless);const box=$('loop-readout');box.className='loop-readout '+(result.seamless?'good':'warn');box.textContent=!result.rows.length?'No visible layers to evaluate':result.seamless?'✓ Seam aligned: start and end transforms match.':`△ Visible boundary drift on ${offenders.length} layer(s): ${offenders.slice(0,2).map(r=>r.name).join(', ')}. Adjust end keys or oscillator frequency.`;}
    catch(err){$('loop-readout').className='loop-readout error';$('loop-readout').textContent=err.message;}
  }
  function pointFromEvent(e){const r=overlay.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*project.width,y:(e.clientY-r.top)/r.height*project.height};}
  function invert(m,p){const[a,b,c,d,e,f]=m,det=a*d-b*c;if(Math.abs(det)<1e-8)return null;const x=p.x-e,y=p.y-f;return{x:(d*x-c*y)/det,y:(-b*x+a*y)/det};}
  function hitTest(p){const world=E.collectWorld(project,time);return[...project.layers].filter(l=>world.get(l.id).visible&&!l.locked).sort((a,b)=>b.z-a.z).find(l=>{const q=invert(world.get(l.id).matrix,p),b=l.bounds;return q&&q.x>=b.x&&q.x<=b.x+b.width&&q.y>=b.y&&q.y<=b.y+b.height;})||null;}
  function drawGuides(world){
    guide.clearRect(0,0,overlay.width,overlay.height);
    if(tool==='move'&&selected()&&world.has(selectedId)){
      const l=selected(),m=world.get(l.id).matrix,b=l.bounds;guide.save();guide.transform(...m);
      guide.setLineDash([8,6]);guide.strokeStyle='#e4a16d';guide.lineWidth=1.6;guide.strokeRect(b.x,b.y,b.width,b.height);guide.setLineDash([]);
      const px=b.x+b.width*l.pivot.x,py=b.y+b.height*l.pivot.y;
      guide.fillStyle='#df9e73';guide.beginPath();guide.arc(px,py,6,0,Math.PI*2);guide.fill();guide.strokeStyle='#192329';guide.lineWidth=1.5;guide.beginPath();guide.moveTo(px-11,py);guide.lineTo(px+11,py);guide.moveTo(px,py-11);guide.lineTo(px,py+11);guide.stroke();guide.restore();
    }
    if(tool==='extract'){
      guide.strokeStyle='#edaa74';guide.fillStyle='#edaa74';guide.lineWidth=2;
      if(polygon.length){guide.beginPath();guide.moveTo(polygon[0].x,polygon[0].y);for(const p of polygon.slice(1))guide.lineTo(p.x,p.y);guide.stroke();for(const p of polygon){guide.beginPath();guide.arc(p.x,p.y,4,0,Math.PI*2);guide.fill();}}
    }
  }
  function draw(){
    if(!project)return;
    try{const world=E.render(ctx,project,time,images);drawGuides(world);$('stage-status').textContent=tool==='extract'?`${polygon.length} polygon vertices · click to add`:(selected()?selected().name:'Add an image to begin');}
    catch(err){announce(err.message,'error');}
  }
  function setTime(next){time=clamp(next,0,project.duration);renderTimeline();draw();}
  function stopLoop(){if(frameId!==null)cancelAnimationFrame(frameId);frameId=null;}
  function pause(){playing=false;stopLoop();$('play-toggle').textContent='▶';$('play-toggle').setAttribute('aria-label','Play animation');}
  function tick(now){
    if(!playing)return;
    time=((now-originTick)/1000)%project.duration;
    renderTimeline();draw();frameId=requestAnimationFrame(tick);
  }
  function play(){if(playing)return;if(!project.layers.length){announce('Add artwork before playing.','warn');return;}playing=true;originTick=performance.now()-time*1000;$('play-toggle').textContent='Ⅱ';$('play-toggle').setAttribute('aria-label','Pause animation');frameId=requestAnimationFrame(tick);}
  function setTool(next){tool=next;polygon=[];$('tool-move').classList.toggle('active',next==='move');$('tool-extract').classList.toggle('active',next==='extract');$('tool-move').setAttribute('aria-pressed',String(next==='move'));$('tool-extract').setAttribute('aria-pressed',String(next==='extract'));$('overlay').classList.toggle('extracting',next==='extract');$('extract-help').hidden=next!=='extract';draw();}
  function keyCurrentPose(){const l=selected();if(!l)return;pause();const normalized=time/project.duration;let existing=l.keyframes.find(k=>Math.abs(k.timeNormalized-normalized)<.001);if(existing){existing.transform={...l.transform};}else{l.keyframes.push({id:id(),timeNormalized:normalized,transform:{...l.transform},easing:'easeInOut'});l.keyframes.sort((a,b)=>a.timeNormalized-b.timeNormalized);}refresh();dirty('Pose keyed on timeline.');}
  function applyPreset(name){
    const motions={idle:{body:[['breath',1,.5]],head:[['sway',.15,.5]],ear:[['earTwitch',.3,.5]],tail:[['tailSway',.6,1]],eye:[['blink',.9,.5]]},curious:{body:[['breath',.6,.5]],head:[['sway',.6,.5]],ear:[['earTwitch',.8,1]],tail:[['tailSway',.28,.5]],eye:[['blink',.6,.5]]},alert:{body:[['breath',1.4,1]],head:[['sway',.4,1]],ear:[['earTwitch',1.2,1]],tail:[['tailSway',1.4,2]],eye:[['blink',.2,.5]]},quiet:{}};
    const set=motions[name];if(!set)return;
    for(const l of project.layers){const key=l.name.toLowerCase().includes('ear')?'ear':l.name.toLowerCase().includes('eye')?'eye':l.name.toLowerCase().includes('tail')?'tail':l.name.toLowerCase().includes('head')?'head':'body';l.motions=(set[key]||[]).map(([kind,amplitude,frequency])=>({kind,amplitude,frequency,phase:0,enabled:true}));}
    refresh();dirty(`Preset applied: ${name}. You can refine each layer.`);
  }
  function reindex(){const sorted=[...project.layers].sort((a,b)=>a.z-b.z);sorted.forEach((l,i)=>l.z=i);}
  function changeOrder(dir){const l=selected();if(!l)return;const sorted=[...project.layers].sort((a,b)=>a.z-b.z);const i=sorted.indexOf(l),j=i+dir;if(j<0||j>=sorted.length)return;[sorted[i],sorted[j]]=[sorted[j],sorted[i]];sorted.forEach((x,k)=>x.z=k);refresh();dirty('Layer order changed.');}
  function removeLayer(){const l=selected();if(!l)return;if(!confirm(`Remove “${l.name}”? Child layers will be detached. This cannot be undone.`))return;project.layers=project.layers.filter(x=>x.id!==l.id);for(const child of project.layers)if(child.parentId===l.id)child.parentId=null;selectedId=project.layers[0]?.id||null;syncImageSources();refresh();dirty('Layer removed.');}
  async function fileToUrl(file){if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Please select a PNG, JPEG, or WebP image.');if(file.size>8e6)throw new Error('Image is larger than 8 MB; resize it before importing.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read image'));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});}
  async function addImageFile(file){const src=await fileToUrl(file);const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Image could not be decoded'));img.src=src;});const scale=Math.min(1,(project.width*.86)/img.width,(project.height*.86)/img.height);const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));const layer=part(file.name.replace(/\.[^.]+$/,'').slice(0,80),src,{x:Math.round((project.width-w)/2),y:Math.round((project.height-h)/2),width:w,height:h},project.layers.length+1);project.layers.push(layer);selectedId=layer.id;reindex();syncImageSources();refresh();dirty(`Imported ${layer.name} as an editable layer.`);}
  async function extractPolygon(){
    const source=selected();if(!source||polygon.length<3){announce('Select an image and mark at least three points.','warn');return;}
    if(source.parentId||source.keyframes.length||source.motions.some(m=>m.enabled)||JSON.stringify(source.transform)!==JSON.stringify(E.identity())){announce('Extraction requires a stationary, unparented source layer without animation. Disable its motion or import a fresh image.','warn');return;}
    const image=images.get(source.id);if(!image||!image.complete||!image.naturalWidth){announce('Artwork is not ready yet.','warn');return;}
    const b=source.bounds,minX=Math.max(b.x,Math.floor(Math.min(...polygon.map(p=>p.x)))),minY=Math.max(b.y,Math.floor(Math.min(...polygon.map(p=>p.y))));
    const maxX=Math.min(b.x+b.width,Math.ceil(Math.max(...polygon.map(p=>p.x)))),maxY=Math.min(b.y+b.height,Math.ceil(Math.max(...polygon.map(p=>p.y))));
    const w=Math.ceil(maxX-minX),h=Math.ceil(maxY-minY);
    if(w<2||h<2){announce('Polygon does not overlap the selected image.','warn');return;}
    const cut=document.createElement('canvas');cut.width=w;cut.height=h;const c=cut.getContext('2d');
    c.beginPath();polygon.forEach((p,i)=>i?c.lineTo(p.x-minX,p.y-minY):c.moveTo(p.x-minX,p.y-minY));c.closePath();c.clip();c.drawImage(image,b.x-minX,b.y-minY,b.width,b.height);
    const cutSrc=cut.toDataURL('image/png');
    const backing=document.createElement('canvas');backing.width=Math.round(b.width);backing.height=Math.round(b.height);const g=backing.getContext('2d');g.drawImage(image,0,0,backing.width,backing.height);
    g.globalCompositeOperation='destination-out';g.beginPath();polygon.forEach((p,i)=>i?g.lineTo(p.x-b.x,p.y-b.y):g.moveTo(p.x-b.x,p.y-b.y));g.closePath();g.fill();
    if(!source.originalSrc)source.originalSrc=source.src;
    source.src=backing.toDataURL('image/png');
    const child=part(`${source.name} / cutout`,cutSrc,{x:minX,y:minY,width:w,height:h},source.z+1,source.id);
    project.layers.push(child);reindex();selectedId=child.id;setTool('move');syncImageSources();refresh();dirty('Cutout created; source pixels were masked and the original retained for recovery.');
  }
  function drawImageCanvas(seconds){const c=document.createElement('canvas');c.width=project.width;c.height=project.height;E.render(c.getContext('2d'),project,seconds,images);return c;}
  function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error('Could not encode PNG')),'image/png'));}
  async function doExport(kind){
    if(exportBusy)return;
    exportBusy=true;const actions=document.querySelectorAll('[data-export]');actions.forEach(x=>x.disabled=true);
    try{
      if(kind==='json'){download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${slug()}-${stamp()}.dexrig.json`);announce('Editable project exported, including original image data.');return;}
      if(!project.layers.length)throw new Error('Add artwork before exporting animation.');
      if([...project.layers].some(l=>!images.get(l.id)?.naturalWidth))throw new Error('Wait until all artwork layers are loaded.');
      if(kind==='png'){const blob=await canvasBlob(drawImageCanvas(time));download(blob,`${slug()}-frame.png`);announce('Transparent PNG frame downloaded.');return;}
      if(kind==='sheet'){
        const frames=Math.ceil(project.duration*project.fps),cols=Math.min(6,frames),rows=Math.ceil(frames/cols);
        const width=cols*project.width,height=rows*project.height;
        if(width*height>40e6)throw new Error('Sprite sheet exceeds 40 million pixels; reduce duration, FPS, or source size.');
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const target=canvas.getContext('2d');const frame=drawImageCanvas(0),fg=frame.getContext('2d');
        for(let i=0;i<frames;i++){E.render(fg,project,i/project.fps,images);target.drawImage(frame,(i%cols)*project.width,Math.floor(i/cols)*project.height);}
        download(await canvasBlob(canvas),`${slug()}-${cols}x${rows}-sheet.png`);announce(`${frames} transparent PNG frames exported as a sprite sheet.`);return;
      }
      if(kind==='gif'){
        const fps=Math.min(project.fps,15),frames=Math.min(90,Math.ceil(project.duration*fps));
        const scale=Math.min(1,360/project.width,360/project.height),w=Math.max(1,Math.round(project.width*scale)),h=Math.max(1,Math.round(project.height*scale));
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const g=canvas.getContext('2d',{willReadFrequently:true});const frame=drawImageCanvas(0),fg=frame.getContext('2d'),buffers=[];
        for(let i=0;i<frames;i++){E.render(fg,project,i/fps,images);g.clearRect(0,0,w,h);g.drawImage(frame,0,0,w,h);buffers.push(g.getImageData(0,0,w,h).data);}
        const bytes=GIF.encode(w,h,buffers,fps);download(new Blob([bytes],{type:'image/gif'}),`${slug()}-loop.gif`);announce(`${frames}-frame transparent GIF exported at ${w}×${h}.`);return;
      }
      throw new Error('Unknown export type');
    }catch(err){announce(err.message,'error');}
    finally{exportBusy=false;actions.forEach(x=>x.disabled=false);}
  }
  function updateInspectorField(key,val){
    const l=selected();if(!l)return;const v=Number(val);
    if(key==='name'){l.name=String(val).slice(0,80)||'Untitled layer';}
    else if(key==='parentId'){if(!E.isValidParent(project.layers,l.id,val)){announce('Parent would introduce a hierarchy cycle.','error');return;}l.parentId=val||null;}
    else if(['x','y','rotation','scaleX','scaleY','opacity'].includes(key)){if(!Number.isFinite(v))return;l.transform[key]=key==='opacity'?clamp(v,0,1):clamp(v,-10000,10000);}
    else if(key==='pivotX'||key==='pivotY'){l.pivot[key==='pivotX'?'x':'y']=clamp(v,-2,3);}
    else if(['boundX','boundY','boundW','boundH'].includes(key)){l.bounds[{boundX:'x',boundY:'y',boundW:'width',boundH:'height'}[key]]=clamp(v,key==='boundW'||key==='boundH'?1:-10000,4096);}
    refresh();dirty();
  }
  $('inspector-content').addEventListener('change',e=>{
    const el=e.target;if(el.dataset.field){updateInspectorField(el.dataset.field,el.value);return;}
    if(el.dataset.motionEnable!==undefined){const l=selected();if(!l)return;l.motions[+el.dataset.motionEnable].enabled=el.checked;dirty();return;}
    if(el.dataset.motionValue){const l=selected();if(!l)return;const [index,key]=el.dataset.motionValue.split(':');l.motions[+index][key]=clamp(el.value,0,key==='amplitude'?30:15);dirty();return;}
  });
  $('inspector-content').addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.preset){applyPreset(button.dataset.preset);return;}
    if(button.dataset.export){doExport(button.dataset.export);return;}
    if(button.dataset.motionRemove!==undefined){const l=selected();if(!l)return;l.motions.splice(+button.dataset.motionRemove,1);refresh();dirty('Oscillator removed.');return;}
    switch(button.dataset.action){
      case 'add-motion':{const l=selected();if(!l)return;const kind=$('new-motion-kind').value;l.motions.push({kind,enabled:true,amplitude:1,frequency:.5,phase:0});refresh();dirty('Oscillator attached.');break;}
      case 'keyframe':keyCurrentPose();break;
      case 'remove-key':{const l=selected();if(!l)return;const i=l.keyframes.findIndex(k=>Math.abs(k.timeNormalized*project.duration-time)<.08);if(i<0){announce('No keyframe near the playhead.','warn');return;}l.keyframes.splice(i,1);refresh();dirty('Keyframe removed.');break;}
      case 'restore-source':{const l=selected();if(!l?.originalSrc)return;l.src=l.originalSrc;l.originalSrc=null;syncImageSources();refresh();dirty('Original image restored; hide overlapping cutout layers if needed.');break;}
      case 'loop-check':renderLoopStatus();announce($('loop-readout').textContent);break;
    }
  });
  $('layer-list').addEventListener('click',e=>{
    const el=e.target.closest('button');if(!el)return;
    if(el.dataset.select){selectedId=el.dataset.select;refresh();return;}
    if(el.dataset.visible){const l=project.layers.find(x=>x.id===el.dataset.visible);l.visible=!l.visible;refresh();dirty();return;}
    if(el.dataset.lock){const l=project.layers.find(x=>x.id===el.dataset.lock);l.locked=!l.locked;refresh();dirty();return;}
  });
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{inspectorTab=b.dataset.tab;renderInspector();}));
  $('move-layer-up').addEventListener('click',()=>changeOrder(1));$('move-layer-down').addEventListener('click',()=>changeOrder(-1));$('delete-layer').addEventListener('click',removeLayer);
  $('keyframe-add').addEventListener('click',keyCurrentPose);
  $('keyframe-track').addEventListener('click',e=>{const marker=e.target.closest('[data-key]');if(!marker||!selected())return;pause();setTime(selected().keyframes[+marker.dataset.key].timeNormalized*project.duration);});
  $('time-slider').addEventListener('input',e=>{pause();setTime(+e.target.value/1000);});
  $('play-toggle').addEventListener('click',()=>playing?pause():play());
  $('start-over').addEventListener('click',()=>{pause();setTime(0);});
  $('duration-input').addEventListener('change',e=>{project.duration=clamp(e.target.value,.5,30);e.target.value=project.duration;pause();setTime(Math.min(time,project.duration));renderLoopStatus();dirty('Timeline duration updated.');});
  $('fps-input').addEventListener('change',e=>{project.fps=clamp(e.target.value,4,60);saveLater();announce('Export FPS changed.');});
  $('project-title').addEventListener('change',e=>{project.title=e.target.value.trim().slice(0,100)||'Untitled rig';saveLater();});
  $('layer-input').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{await addImageFile(f);}catch(err){announce(err.message,'error');}});
  $('new-project').addEventListener('click',()=>{if(!confirm('Create a new blank project? Export the current project first if you want a permanent copy.'))return;loadProject(blankProject());announce('Blank project created. Add your artwork.');});
  $('open-project').addEventListener('click',()=>$('project-file').click());
  $('project-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>30e6)throw new Error('Project file is over 30 MB.');const parsed=JSON.parse(await file.text());loadProject(parsed);announce(`Opened ${project.title}.`);}catch(err){announce(`Project import failed: ${err.message}`,'error');}});
  $('save-project').addEventListener('click',()=>doExport('json'));
  $('tool-move').addEventListener('click',()=>setTool('move'));$('tool-extract').addEventListener('click',()=>{if(!selected()){announce('Select a source layer to cut.','warn');return;}pause();setTime(0);setTool('extract');});
  $('extract-toggle').addEventListener('click',()=>{if(!selected())return;pause();setTime(0);setTool('extract');});
  $('cancel-extract').addEventListener('click',()=>{setTool('move');announce('Region cut canceled; artwork unchanged.');});
  $('finish-extract').addEventListener('click',extractPolygon);
  $('add-vertex').addEventListener('click',()=>{if(tool!=='extract')return;polygon.push({x:clamp($('vertex-x').value,0,project.width),y:clamp($('vertex-y').value,0,project.height)});draw();announce(`Polygon point ${polygon.length} added.`);});
  overlay.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;const p=pointFromEvent(e);
    if(tool==='extract'){
      if(polygon.length>=3&&Math.hypot(p.x-polygon[0].x,p.y-polygon[0].y)<14){extractPolygon();return;}
      polygon.push(p);draw();return;
    }
    const l=hitTest(p);
    if(l){selectedId=l.id;const parent=l.parentId?E.collectWorld(project,time).get(l.parentId)?.matrix:null;dragging={start:p,startX:l.transform.x,startY:l.transform.y,parent};overlay.setPointerCapture(e.pointerId);overlay.classList.add('dragging');refresh();}
    else if(selectedId){selectedId=null;refresh();}
  });
  overlay.addEventListener('pointermove',e=>{
    if(!dragging)return;const p=pointFromEvent(e),l=selected();if(!l)return;
    let dx=p.x-dragging.start.x,dy=p.y-dragging.start.y;
    if(dragging.parent){const [a,b,c,d]=dragging.parent,det=a*d-b*c;if(Math.abs(det)>1e-6){[dx,dy]=[(d*dx-c*dy)/det,(-b*dx+a*dy)/det];}}
    l.transform.x=dragging.startX+dx;l.transform.y=dragging.startY+dy;draw();
  });
  const endDrag=()=>{if(!dragging)return;dragging=null;overlay.classList.remove('dragging');refresh();dirty('Layer moved.');};
  overlay.addEventListener('pointerup',endDrag);overlay.addEventListener('pointercancel',endDrag);
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'&&tool==='extract'){e.preventDefault();setTool('move');}else if(e.key==='Enter'&&tool==='extract'){e.preventDefault();extractPolygon();}});
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select,button')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();playing?pause():play();}else if(e.key==='Escape'&&tool==='extract'){setTool('move');}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){pause();announce('Playback paused while tab is hidden.');}});
  window.addEventListener('pagehide',()=>{pause();clearTimeout(saveTimer);});
  function init(){
    try{const cached=localStorage.getItem(CACHE_KEY);if(cached){loadProject(JSON.parse(cached),true);announce('Restored locally saved project. Save JSON to keep a durable backup.');return;}}
    catch(_){try{localStorage.removeItem(CACHE_KEY);}catch(__){}}
    loadProject(demoProject());announce('Geometric demo loaded. Import artwork or create a blank project.');
  }
  init();
})();

const test=require('node:test'), assert=require('node:assert/strict');
const E=require('../engine.js'), GIF=require('../gif.js');
const transform=(x=0)=>({x,y:0,rotation:0,scaleX:1,scaleY:1,opacity:1});
const img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBAqEzNRkAAAAASUVORK5CYII=';
function layer(id,parentId=null){return{id,name:id,src:img,parentId,visible:true,locked:false,z:0,bounds:{x:0,y:0,width:40,height:40},pivot:{x:0,y:0},transform:transform(),keyframes:[],motions:[]};}
const project=(layers=[layer('a')])=>({schema:'dex-rig/v1',title:'test',duration:2,fps:24,width:640,height:640,layers});
test('keyframes are interpolated with easing and endpoints',()=>{
 const l=layer('a');l.keyframes=[{timeNormalized:0,transform:transform(0)},{timeNormalized:1,transform:transform(100),easing:'linear'}];
 assert.equal(E.evaluateLayer(l,1,2).x,50);assert.equal(E.evaluateLayer(l,0,2).x,0);assert.equal(E.evaluateLayer(l,2,2).x,100);
});
test('procedural micro-motion is deterministic and periodic',()=>{
 const l=layer('a');l.motions=[{kind:'tailSway',amplitude:1,frequency:1,phase:0,enabled:true}];
 assert(Math.abs(E.evaluateLayer(l,.25,2).rotation-19)<1e-9);
 assert(Math.abs(E.evaluateLayer(l,0,2).rotation-E.evaluateLayer(l,2,2).rotation)<1e-9);
});
test('parented transforms inherit parent translation and order',()=>{
 const a=layer('a'),b=layer('b','a');a.transform.x=20;b.bounds.x=40;
 const world=E.collectWorld(project([a,b]),0);assert.equal(world.get('b').matrix[4],20);
});
test('parent validation rejects cycles, missing parent, and self-parent',()=>{
 const a=layer('a'),b=layer('b','a');assert.equal(E.isValidParent([a,b],'a','b'),false);
 assert.equal(E.isValidParent([a,b],'a','a'),false);assert.equal(E.isValidParent([a,b],'b','missing'),false);
 assert.throws(()=>E.collectWorld(project([{...a,parentId:'b'},b]),0),/Cyclic/);
});
test('loop continuity detects procedural drift and reconciles whole transforms',()=>{
 const p=project(),l=p.layers[0];l.motions=[{kind:'breath',amplitude:1,frequency:.5,phase:0,enabled:true}];
 assert.equal(E.loopAnalysis(p).seamless,true);l.motions[0].frequency=.33;
 assert.equal(E.loopAnalysis(p).seamless,false);
});
test('invalid imported sources and cyclic parent projects are rejected',()=>{
 const p=project();p.layers[0].src='https://evil.example/pixel';assert.throws(()=>E.normalizeProject(p),/local raster/);
 const p2=project([layer('a','b'),layer('b','a')]);assert.throws(()=>E.normalizeProject(p2),/cyclic/);
});
test('GIF binary begins with GIF89a and has nonempty frames',()=>{
 const rgba=new Uint8Array(16*16*4);rgba.fill(255);const bytes=GIF.encode(16,16,[rgba,rgba],12);
 assert.equal(Buffer.from(bytes.subarray(0,6)).toString(),'GIF89a');assert(bytes.length>800);
});

test('hidden parent hides its descendants without changing their independent visible flags',()=>{
 const a=layer('a'),b=layer('b','a');a.visible=false;const p=project([a,b]);
 const world=E.collectWorld(p,0);assert.equal(world.get('b').visible,false);
 assert.equal(E.loopAnalysis(p).rows.length,0);
});

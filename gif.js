/* Local GIF encoder with bounded raster dimensions and frame count. */
(function(root, factory) {
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  root.DexRigGIF=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function write16(a,n){a.push(n&255,(n>>>8)&255);}
  function palette(){
    const p=new Uint8Array(256*3);
    for(let r=0;r<7;r++)for(let g=0;g<8;g++)for(let b=0;b<4;b++){
      const i=1+(r*8+g)*4+b;
      p[i*3]=Math.round(r*255/6);p[i*3+1]=Math.round(g*255/7);p[i*3+2]=Math.round(b*255/3);
    }
    return p;
  }
  function quantize(rgba,width,height){
    if(rgba.length!==width*height*4)throw new Error('Invalid RGBA buffer size');
    const out=new Uint8Array(width*height);
    for(let j=0,i=0;j<rgba.length;j+=4,i++){
      if(rgba[j+3]<128){out[i]=0;continue;}
      const r=Math.min(6,Math.floor(rgba[j]*7/256));
      const g=Math.min(7,Math.floor(rgba[j+1]*8/256));
      const b=Math.min(3,Math.floor(rgba[j+2]*4/256));
      out[i]=1+(r*8+g)*4+b;
    }
    return out;
  }
  function lzw(indices){
    const clear=256,end=257;
    let dict=new Map(), nextCode=258, size=9, bits=0, bitCount=0;
    const bytes=[];
    const emit=(code)=>{
      bits|=code<<bitCount;bitCount+=size;
      while(bitCount>=8){bytes.push(bits&255);bits>>>=8;bitCount-=8;}
    };
    const reset=()=>{dict=new Map();nextCode=258;size=9;};
    emit(clear);
    let current=String.fromCharCode(indices[0]??0);
    for(let i=1;i<indices.length;i++){
      const ch=String.fromCharCode(indices[i]), combo=current+ch;
      if(dict.has(combo)){current=combo;continue;}
      const code=current.length===1?current.charCodeAt(0):dict.get(current);
      emit(code);
      if(nextCode<4096){
        dict.set(combo,nextCode++);
        if(nextCode>(1<<size) && size<12)size++;
      }else{emit(clear);reset();}
      current=ch;
    }
    emit(current.length===1?current.charCodeAt(0):dict.get(current));emit(end);
    if(bitCount>0)bytes.push(bits&255);
    const chunks=[];
    for(let i=0;i<bytes.length;i+=255){const part=bytes.slice(i,i+255);chunks.push(part.length,...part);}
    chunks.push(0);
    return chunks;
  }
  function encode(width,height,rgbaFrames,fps=12){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>600||height>600) throw new Error('GIF dimensions must be 1–600 pixels');
    if(!Array.isArray(rgbaFrames)||rgbaFrames.length===0||rgbaFrames.length>90)throw new Error('GIF requires 1–90 frames');
    const a=[];
    for(const c of 'GIF89a')a.push(c.charCodeAt(0));
    write16(a,width);write16(a,height);a.push(0xf7,0,0,...palette());
    a.push(0x21,0xff,11,...Array.from('NETSCAPE2.0',c=>c.charCodeAt(0)),3,1,0,0,0);
    const delay=Math.max(2,Math.round(100/Math.max(1,fps)));
    for(const rgba of rgbaFrames){
      a.push(0x21,0xf9,4,0x09);write16(a,delay);a.push(0,0);
      a.push(0x2c);write16(a,0);write16(a,0);write16(a,width);write16(a,height);a.push(0);
      a.push(8,...lzw(quantize(rgba,width,height)));
    }
    a.push(0x3b);return new Uint8Array(a);
  }
  return {encode,quantize};
});

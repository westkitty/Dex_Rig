/* Dex Rig - deterministic 2D animation engine. No external dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DexRigEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEYS = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'];
  const DEFAULT_TRANSFORM = Object.freeze({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 });
  const MOTION_TYPES = Object.freeze(['breath', 'bob', 'sway', 'blink', 'earTwitch', 'tailSway', 'float']);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : lo));
  const mix = (a, b, t) => a + (b - a) * t;
  const identity = () => ({ ...DEFAULT_TRANSFORM });
  const ease = (p, type) => {
    const t = clamp(p, 0, 1);
    if (type === 'easeIn') return t * t;
    if (type === 'easeOut') return 1 - (1 - t) * (1 - t);
    if (type === 'easeInOut') return t * t * (3 - 2 * t);
    return t;
  };
  const completeTransform = (obj = {}) => {
    const t = identity();
    for (const key of KEYS) if (Number.isFinite(+obj[key])) t[key] = +obj[key];
    t.opacity = clamp(t.opacity, 0, 1);
    t.scaleX = clamp(t.scaleX, -8, 8);
    t.scaleY = clamp(t.scaleY, -8, 8);
    return t;
  };
  function interpolate(keyframes, seconds, duration, base) {
    const frames = (Array.isArray(keyframes) ? keyframes : []).filter(k => Number.isFinite(+k.timeNormalized))
      .map(k => ({ ...k, timeNormalized: clamp(k.timeNormalized, 0, 1) }))
      .sort((a, b) => a.timeNormalized - b.timeNormalized);
    if (!frames.length) return completeTransform(base);
    const normalized = clamp(seconds / Math.max(0.001, duration), 0, 1);
    if (normalized <= frames[0].timeNormalized) return completeTransform(frames[0].transform);
    if (normalized >= frames[frames.length - 1].timeNormalized) return completeTransform(frames[frames.length - 1].transform);
    for (let i = 1; i < frames.length; i++) {
      const next = frames[i], prev = frames[i - 1];
      if (normalized <= next.timeNormalized) {
        const fraction = (normalized - prev.timeNormalized) / Math.max(1e-9, next.timeNormalized - prev.timeNormalized);
        const t = ease(fraction, next.easing || 'easeInOut');
        const a = completeTransform(prev.transform), b = completeTransform(next.transform), out = {};
        for (const key of KEYS) out[key] = mix(a[key], b[key], t);
        return out;
      }
    }
    return completeTransform(base);
  }
  function motionOffset(motion, seconds) {
    if (!motion || motion.enabled === false) return identityOffset();
    const amplitude = clamp(motion.amplitude ?? 1, 0, 30);
    const freq = clamp(motion.frequency ?? 1, 0, 15);
    const phase = clamp(motion.phase ?? 0, -100, 100);
    const cycle = seconds * freq + phase;
    const wave = Math.sin(Math.PI * 2 * cycle);
    const result = identityOffset();
    switch (motion.kind) {
      case 'breath': result.y -= wave * amplitude * 2.2; result.scaleY += wave * amplitude * 0.018; result.scaleX += wave * amplitude * 0.006; break;
      case 'bob': result.y += wave * amplitude * 5; break;
      case 'sway': result.rotation += wave * amplitude * 7; break;
      case 'earTwitch': result.rotation += Math.pow(Math.max(0, wave), 8) * amplitude * 15; break;
      case 'tailSway': result.rotation += wave * amplitude * 19; break;
      case 'float': result.y -= wave * amplitude * 7; result.rotation += wave * amplitude * 2; break;
      case 'blink': {
        const distance = Math.abs(((cycle % 1) + 1) % 1 - 0.5);
        const close = clamp((0.12 - distance) / 0.12, 0, 1);
        result.scaleY -= close * clamp(amplitude, 0, 1) * 0.94;
        break;
      }
      default: break;
    }
    return result;
  }
  function identityOffset() { return { x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0, opacity: 0 }; }
  function evaluateLayer(layer, seconds, duration) {
    const t = interpolate(layer.keyframes, seconds, duration, layer.transform);
    for (const m of layer.motions || []) {
      const offset = motionOffset(m, seconds);
      for (const key of KEYS) t[key] += offset[key];
    }
    t.opacity = clamp(t.opacity, 0, 1);
    t.scaleX = clamp(t.scaleX, -8, 8); t.scaleY = clamp(t.scaleY, -8, 8);
    return t;
  }
  const matIdentity = () => [1, 0, 0, 1, 0, 0];
  function matMultiply(a, b) {
    return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  }
  const translate = (x,y) => [1,0,0,1,x,y];
  function layerMatrix(layer, evaluated) {
    const b = layer.bounds, pivot = layer.pivot || { x: 0.5, y: 0.5 };
    const px = b.x + b.width * clamp(pivot.x, -2, 3);
    const py = b.y + b.height * clamp(pivot.y, -2, 3);
    const r = evaluated.rotation * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const transform = [c*evaluated.scaleX, s*evaluated.scaleX, -s*evaluated.scaleY, c*evaluated.scaleY, 0, 0];
    return matMultiply(matMultiply(translate(px + evaluated.x, py + evaluated.y), transform), translate(-px, -py));
  }
  function collectWorld(project, seconds) {
    const layers = Array.isArray(project.layers) ? project.layers : [];
    const byId = new Map(layers.map(l => [l.id, l]));
    const world = new Map(), visiting = new Set();
    function visit(layer) {
      if (world.has(layer.id)) return world.get(layer.id);
      if (visiting.has(layer.id)) throw new Error('Cyclic layer parenting is not allowed');
      visiting.add(layer.id);
      const t = evaluateLayer(layer, seconds, project.duration);
      let matrix = layerMatrix(layer, t), opacity = t.opacity, visible = layer.visible !== false;
      if (layer.parentId && byId.has(layer.parentId)) {
        const p = visit(byId.get(layer.parentId));
        matrix = matMultiply(p.matrix, matrix); opacity *= p.opacity; visible = visible && p.visible;
      }
      const result = { matrix, opacity, visible, evaluated: t };
      world.set(layer.id, result); visiting.delete(layer.id);
      return result;
    }
    for (const layer of layers) visit(layer);
    return world;
  }
  function render(ctx, project, seconds, images, opts = {}) {
    const canvas = ctx.canvas;
    if (canvas.width !== project.width) canvas.width = project.width;
    if (canvas.height !== project.height) canvas.height = project.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (opts.background) { ctx.fillStyle = opts.background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const world = collectWorld(project, seconds);
    const sorted = [...project.layers].sort((a,b) => (a.z ?? 0) - (b.z ?? 0));
    for (const layer of sorted) {
      if (!world.get(layer.id).visible) continue;
      const image = images.get(layer.id);
      if (!image || !image.complete || !image.naturalWidth) continue;
      const { matrix, opacity } = world.get(layer.id);
      ctx.save(); ctx.globalAlpha = opacity;
      ctx.transform(...matrix);
      ctx.drawImage(image, layer.bounds.x, layer.bounds.y, layer.bounds.width, layer.bounds.height);
      ctx.restore();
    }
    return world;
  }
  function loopAnalysis(project) {
    const start = collectWorld(project, 0), end = collectWorld(project, project.duration);
    const rows = [];
    for (const layer of project.layers) {
      if (!start.get(layer.id).visible) continue;
      const a = start.get(layer.id), b = end.get(layer.id);
      const delta = Math.max(...a.matrix.map((n, i) => Math.abs(n - b.matrix[i])), Math.abs(a.opacity - b.opacity) * 100);
      rows.push({ id: layer.id, name: layer.name, delta, seamless: delta < 0.35 });
    }
    return { seamless: rows.every(x => x.seamless), rows };
  }
  function isValidParent(layers, id, potentialParentId) {
    if (!potentialParentId) return true;
    if (potentialParentId === id) return false;
    const byId = new Map(layers.map(l => [l.id,l]));
    const seen = new Set([id]); let current = potentialParentId;
    while (current) {
      if (seen.has(current)) return false;
      seen.add(current); current = byId.get(current)?.parentId || null;
    }
    return byId.has(potentialParentId);
  }
  function normalizeProject(input) {
    if (!input || typeof input !== 'object' || input.schema !== 'dex-rig/v1') throw new Error('Not a Dex Rig v1 project');
    const width = clamp(input.width, 64, 2048), height = clamp(input.height, 64, 2048);
    const duration = clamp(input.duration, 0.5, 30), fps = Math.round(clamp(input.fps, 4, 60));
    if (!Array.isArray(input.layers) || input.layers.length > 100) throw new Error('Invalid layer count (maximum 100)');
    const ids = new Set();
    const layers = input.layers.map((l, i) => {
      if (!l || typeof l !== 'object' || typeof l.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(l.id) || ids.has(l.id)) throw new Error('Invalid or duplicate layer id');
      ids.add(l.id);
      if (typeof l.src !== 'string' || !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(l.src) || l.src.length > 16e6) throw new Error('Imported layers must contain local raster image data');
      const b = l.bounds || {};
      return { id:l.id, name:String(l.name || `Layer ${i+1}`).slice(0,80), src:l.src, originalSrc: typeof l.originalSrc === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(l.originalSrc) ? l.originalSrc : null,
        parentId: typeof l.parentId === 'string' ? l.parentId : null,
        visible:l.visible !== false, locked:l.locked === true, z:clamp(l.z ?? i, -10000, 10000),
        bounds: { x:clamp(b.x, -10000,10000), y:clamp(b.y,-10000,10000), width:clamp(b.width, 1,4096), height:clamp(b.height,1,4096) },
        pivot:{ x:clamp(l.pivot?.x ?? .5, -2,3), y:clamp(l.pivot?.y ?? .5, -2,3) }, transform:completeTransform(l.transform),
        keyframes:(Array.isArray(l.keyframes) ? l.keyframes : []).slice(0,200).map(k => ({ id:String(k.id||'k').slice(0,80), timeNormalized:clamp(k.timeNormalized,0,1), easing:['linear','easeIn','easeOut','easeInOut'].includes(k.easing) ? k.easing : 'easeInOut', transform:completeTransform(k.transform) })),
        motions:(Array.isArray(l.motions) ? l.motions : []).slice(0,24).filter(m => MOTION_TYPES.includes(m.kind)).map(m => ({kind:m.kind, enabled:m.enabled!==false, amplitude:clamp(m.amplitude ?? 1,0,30), frequency:clamp(m.frequency ?? 1,0,15), phase:clamp(m.phase ?? 0,-100,100)})) };
    });
    for (const layer of layers) if (!isValidParent(layers, layer.id, layer.parentId)) throw new Error('Invalid or cyclic parent hierarchy');
    return { schema:'dex-rig/v1', title:String(input.title || 'Untitled Rig').slice(0,100), width, height, duration, fps, layers };
  }
  return { DEFAULT_TRANSFORM, MOTION_TYPES, identity, ease, interpolate, motionOffset, evaluateLayer, layerMatrix, matMultiply, collectWorld, render, loopAnalysis, isValidParent, normalizeProject };
});

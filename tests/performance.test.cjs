const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', 'themes/wyh_card_style/assets', name), 'utf8');
const site = read('js/site.js');
function events(target = {}) {
  const handlers = new Map();
  target.addEventListener = (name, fn) => {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  };
  target.emit = (name, event = {}) => (handlers.get(name) || []).forEach(fn => fn(event));
  return target;
}
function classes() {
  const set = new Set();
  return {add: (...names) => names.forEach(n => set.add(n)), remove: (...names) => names.forEach(n => set.delete(n)), contains: n => set.has(n), toggle(n, on) {if (on) set.add(n); else set.delete(n);}};
}
function runtime() {
  let id = 0;
  const frames = new Map(), timers = new Map();
  const reduced = events({matches: false}), fine = events({matches: true});
  const window = events({innerWidth: 1920, innerHeight: 1080, scrollY: 0,
    matchMedia: q => q.includes('reduced-motion') ? reduced : fine,
    requestAnimationFrame: fn => {frames.set(++id, fn); return id;},
    cancelAnimationFrame: key => frames.delete(key),
    setTimeout: fn => {timers.set(++id, fn); return id;},
    clearTimeout: key => timers.delete(key)});
  const document = events({querySelectorAll: () => [], hidden: false, documentElement: {classList: classes()}, body: {classList: classes()}});
  const flushFrames = () => {const list = [...frames.values()]; frames.clear(); list.forEach(fn => fn(16));};
  const nextTimer = () => {const [key, fn] = timers.entries().next().value; timers.delete(key); fn();};
  const context = {window, document, performance: {now: () => 0}, requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout};
  return {window, document, frames, timers, reduced, context, flushFrames, nextTimer};
}
function meteors() {
  const r = runtime(), nodes = new Set(), animations = [];
  const layer = {animate() {}, appendChild: el => nodes.add(el)};
  r.document.querySelector = () => layer;
  r.document.createElement = () => {
    const el = {style: {setProperty() {}}, remove: () => nodes.delete(el), animate(keyframes) {
      assert.equal(keyframes.length, 25);
      assert.equal(keyframes.at(-1).opacity, 0);
      const animation = {cancelled: false, cancel() {this.cancelled = true; this.oncancel?.();}};
      animations.push(animation); return animation;
    }};
    return el;
  };
  r.start = () => vm.runInNewContext(site.slice(site.indexOf('(function initNaturalMeteorAmbience()')), r.context);
  return Object.assign(r, {nodes, animations});
}
test('meteors use no JS frame loop and release animations/nodes when hidden or finished', () => {
  const r = meteors(); r.start();
  assert.equal(r.timers.size, 1); r.nextTimer();
  assert.equal(r.nodes.size, 1); assert.equal(r.frames.size, 0);
  r.animations[0].onfinish();
  assert.equal(r.nodes.size, 0); assert.equal(r.animations[0].cancelled, true);
  r.nextTimer(); r.document.hidden = true; r.document.emit('visibilitychange');
  assert.equal(r.nodes.size, 0); assert.equal(r.timers.size, 0);
  assert.equal(r.animations[1].cancelled, true);
  r.document.hidden = false; r.document.emit('visibilitychange'); r.window.emit('pageshow');
  assert.equal(r.timers.size, 1, 'resume must not create duplicate schedulers');
  r.window.emit('pagehide'); assert.equal(r.timers.size, 0);
});
test('reduced-motion changes can enable and stop meteors, including from initial reduced mode', () => {
  const r = meteors(); r.reduced.matches = true; r.start();
  assert.equal(r.timers.size, 0);
  r.reduced.matches = false; r.reduced.emit('change', {matches: false}); r.nextTimer();
  assert.equal(r.nodes.size, 1);
  r.reduced.matches = true; r.reduced.emit('change', {matches: true});
  assert.equal(r.nodes.size, 0); assert.equal(r.timers.size, 0);
});
test('spotlight is idle in light mode and coalesces dark-mode movement without root style writes', () => {
  const r = runtime(), spotlight = {style: {}};
  r.document.querySelector = () => spotlight;
  const start = site.indexOf('      function initDarkModeCursorSpotlight()');
  const end = site.indexOf('      initDarkModeCursorSpotlight();', start);
  vm.runInNewContext(site.slice(start, end) + 'initDarkModeCursorSpotlight();', r.context);
  r.document.emit('pointermove', {clientX: 20, clientY: 30}); assert.equal(r.frames.size, 0);
  r.document.documentElement.classList.add('dark-mode');
  for (let i = 0; i < 100; i++) r.document.emit('pointermove', {clientX: i, clientY: i});
  assert.equal(r.frames.size, 1); r.flushFrames();
  assert.match(spotlight.style.transform, /99px,99px/);
  r.document.emit('pointermove', {clientX: 100, clientY: 100});
  r.document.hidden = true; r.document.emit('visibilitychange');
  assert.equal(r.frames.size, 0);
  assert.equal(r.document.body.classList.contains('cursor-spotlight-active'), false);
});
test('glass movement shares one frame, uses latest coordinates, and cleans up press timers on pagehide', () => {
  const r = runtime(); let reads = 0, writes = 0;
  class Element {
    constructor() {this.classList = classes(); this.style = {setProperty(k,v) {this[k] = v; writes++;}}; this.isConnected = true;}
    closest(selector) {return selector.includes('.clickable-card') ? this : null;}
    matches(selector) {return selector === '.clickable-card';}
    querySelector(selector) {return selector.includes('liquid-glass-skin') ? this.skin || null : null;}
    appendChild(el) {this.skin = el;}
    setAttribute() {}
    getBoundingClientRect() {return {left: 0, top: 0, width: 100, height: 100};}
  }
  const surface = new Element();
  r.document.documentElement.classList = classes(); r.document.createElement = () => new Element();
  Object.assign(r.context, {Element, getComputedStyle: () => {reads++; return {position: 'relative', borderTopLeftRadius: '12px'};}});
  vm.runInNewContext(read('js/glass.js'), r.context); r.document.emit('DOMContentLoaded');
  const move = i => ({target: surface, pointerType: 'mouse', buttons: 0, clientX: i, clientY: i});
  for (let i = 0; i < 100; i++) r.document.emit('pointermove', move(i));
  assert.equal(r.frames.size, 1); assert.equal(reads, 1); assert.equal(writes, 0);
  r.flushFrames(); assert.equal(writes, 9); assert.equal(surface.style['--liquid-x'], '99.00%');
  r.document.emit('pointerdown', {...move(50), button: 0, pointerId: 1});
  r.document.emit('pointerup', {pointerId: 1}); assert.equal(r.timers.size, 1);
  r.window.emit('pagehide');
  assert.equal(r.timers.size, 0); assert.equal(r.frames.size, 0);
  assert.equal(surface.classList.contains('liquid-pressed'), false);
});
test('rapid theme toggles apply immediately, allocate no fade overlays, and restore feedback', () => {
  const r = runtime();
  r.document.documentElement.dataset = {};
  r.document.createElement = () => {throw new Error('Theme changes must not allocate an overlay');};
  const desktopToggle = {}, mobileToggle = {}, photos = [];
  Object.assign(r.context, {desktopToggle, mobileToggle, localStorage: {setItem() {}},
    setProfilePhotoForMode: dark => photos.push(dark)});
  const start = site.indexOf('      var themeFrame');
  const end = site.indexOf("      if (desktopToggle) {\n        desktopToggle.addEventListener", start);
  vm.runInNewContext(site.slice(start, end), r.context);
  for (let i = 0; i < 10; i++) r.context.toggleDarkMode({target: {checked: i % 2 === 0}});
  assert.equal(r.document.documentElement.dataset.theme, 'light');
  assert.equal(desktopToggle.checked, false); assert.equal(mobileToggle.checked, false);
  assert.equal(photos.at(-1), false); assert.equal(r.timers.size, 0);
  assert.equal(r.frames.size, 1); r.flushFrames();
  assert.equal(r.document.documentElement.classList.contains('theme-instant'), true);
  r.flushFrames();
  assert.equal(r.document.documentElement.classList.contains('theme-instant'), false);
  assert.equal(r.frames.size, 0);
});
test('unrelated root class mutations do not rewrite theme labels or reload the photo', () => {
  const r = runtime(); let writes = 0;
  const label = {set textContent(value) {writes++;}};
  const button = {querySelector: () => label, setAttribute() {writes++;}};
  const photo = {set src(value) {writes++;}};
  r.document.querySelectorAll = () => [button]; r.document.querySelector = () => photo;
  const layout = read('js/layout.js');
  const start = layout.indexOf('  const themeButtons');
  const end = layout.indexOf("  themeButtons.forEach(button => {\n    button.addEventListener", start);
  vm.runInNewContext('const root = document.documentElement;\n' + layout.slice(start, end), r.context);
  for (let i = 0; i < 100; i++) r.context.syncTheme();
  assert.equal(writes, 3);
  r.document.documentElement.classList.add('dark-mode'); r.context.syncTheme();
  assert.equal(writes, 6);
});
test('text links inside cards use text-only feedback and never allocate glass or animation frames', () => {
  const r = runtime(); let allocations = 0, reads = 0, writes = 0;
  class Element {
    constructor(kind, parent) {
      this.kind = kind; this.parent = parent; this.classList = classes(); this.isConnected = true;
      this.style = {setProperty() {writes++;}};
    }
    closest(selector) {
      if (selector === '[inert]') return null;
      if (selector === 'a[href]') return this.kind === 'child' ? this.parent : this.kind === 'card' ? null : this;
      if (selector === 'a,button,input,label,select,textarea,[role="button"]') return this.closest('a[href]');
      if (this.kind === 'child') return this.parent.closest(selector);
      if (selector.includes('.clickable-card')) return this.kind === 'pdf' ? this : card;
      return null;
    }
    matches(selector) {
      if (selector === '.clickable-card') return this.kind === 'card';
      if (selector.startsWith('[disabled]')) return false;
      if (selector === 'a[href]:not([role="button"])') return this.kind !== 'card' && this.kind !== 'child';
      if (selector.includes('a.pub-tag.link')) return this.kind === 'pdf';
      if (selector.startsWith('a[href],button')) return this.kind !== 'card' && this.kind !== 'child';
      return false;
    }
    querySelector() {return this.skin || null;}
    appendChild(node) {this.skin = node;}
    setAttribute() {}
    contains(target) {return target === this || target.parent === this;}
    getBoundingClientRect() {reads++; return {left: 0, top: 0, width: 100, height: 30};}
  }
  const card = new Element('card'), link = new Element('source', card), child = new Element('child', link), pdf = new Element('pdf', card);
  r.document.querySelectorAll = () => [link, pdf];
  r.document.createElement = () => {allocations++; return new Element('skin');};
  Object.assign(r.context, {Element, getComputedStyle() {reads++; return {position: 'relative', borderTopLeftRadius: '10px'};}});
  vm.runInNewContext(read('js/glass.js'), r.context); r.document.emit('DOMContentLoaded');
  assert.equal(link.classList.contains('text-link'), true);
  assert.equal(pdf.classList.contains('text-link'), false);
  assert.equal(r.window.WYH_GLASS_SURFACE_FOR(child), null);
  for (let i = 0; i < 50; i++) r.document.emit('pointermove', {target: child, pointerType: 'mouse', buttons: 0, clientX: i, clientY: 10});
  r.document.emit('pointerdown', {target: child, button: 0, pointerId: 1, pointerType: 'mouse', clientX: 10, clientY: 10});
  assert.equal(link.classList.contains('text-pressed'), true);
  assert.equal(card.classList.contains('glass-pressed'), false);
  assert.equal(link.classList.contains('liquid-ready'), false);
  r.document.emit('pointermove', {target: child, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: 20, clientY: 10});
  assert.deepEqual([allocations, reads, writes, r.frames.size], [0, 0, 0, 0]);
  r.document.emit('pointerup', {pointerId: 1}); r.nextTimer();
  assert.equal(link.classList.contains('text-pressed'), false);
  r.document.emit('keydown', {target: link, key: ' '});
  assert.equal(link.classList.contains('text-pressed'), false, 'Space must keep its normal page-scroll behavior');
  r.document.emit('keydown', {target: link, key: 'Enter'});
  assert.equal(link.classList.contains('text-pressed'), true);
  r.document.emit('keyup', {key: 'Enter'}); r.window.emit('pagehide');
  assert.equal(link.classList.contains('text-pressed'), false); assert.equal(r.timers.size, 0);
  r.document.emit('pointerdown', {target: link, button: 0, pointerId: 2, pointerType: 'touch', clientX: 10, clientY: 10});
  r.document.emit('scroll'); assert.equal(link.classList.contains('text-pressed'), false);
  r.document.emit('pointerdown', {target: pdf, button: 0, pointerId: 3, pointerType: 'mouse', clientX: 10, clientY: 10});
  assert.equal(pdf.classList.contains('liquid-pressed'), true, 'PDF buttons retain their glass feedback');
  assert.equal(allocations, 1);
  r.window.emit('pagehide'); assert.equal(r.frames.size, 0); assert.equal(r.timers.size, 0);
});

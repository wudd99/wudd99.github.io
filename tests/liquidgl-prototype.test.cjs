const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const vendorUrl = '/vendor/liquidgl/liquidGL.v3.test.js';
const vendorIntegrity = 'sha256-test';
const source = fs.readFileSync(path.join(root, 'themes/wyh_card_style/assets/js/liquidgl-prototype.js'), 'utf8')
  .replace('{{ .RelPermalink }}', vendorUrl)
  .replace('{{ .Data.Integrity }}', vendorIntegrity);
function runtime({search = '', reduce = false, missingLibrary = false, withDisclosures = false} = {}) {
  const frames = new Map(), timers = new Map(), observations = [], calls = [], pending = [], lenses = [];
  let id = 0, destroyed = 0, now = 0;
  function events(target = {}) {
    const listeners = new Map();
    target.addEventListener = (name, fn) => {if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn);};
    target.emit = (name, event = {}) => (listeners.get(name) || []).forEach(fn => fn(event));
    return target;
  }
  function classes() {
    const set = new Set();
    return {add: (...values) => values.forEach(value => set.add(value)), remove: (...values) => values.forEach(value => set.delete(value)), contains: value => set.has(value)};
  }
  class Element {
    constructor() {events(this); this.classList = classes(); this.style = {}; Object.defineProperty(this.style, 'setProperty', {configurable: true, writable: true, value(key, value) {this[key] = value;}}); this.attrs = {}; this.children = []; this.dataset = {};}
    appendChild(child) {this.children.push(child); child.parent = this; return child;}
    remove() {if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);}
    setAttribute(name, value) {this.attrs[name] = value;}
    toggleAttribute(name, enabled) {if (enabled) this.setAttribute(name, ''); else this.removeAttribute(name);}
    closest(selector) {
      if (selector === '[data-liquidgl-material="control"]' && this.dataset.liquidglMaterial === 'control') return this;
      if (selector.split(',').includes(this.selector)) return this;
      if (this.parent?.dataset?.liquidglMaterial) return this.parent.closest(selector);
      return null;
    }
    matches(selector) {return selector.split(',').some(part => this.selector?.split(',').includes(part));}
    contains(node) {return this === node || this.children.some(child => child.contains(node));}
    removeAttribute(name) {delete this.attrs[name];}
    getBoundingClientRect() {return this.rect;}
    get offsetWidth() {return this.rect.width;}
    get offsetHeight() {return this.rect.height;}
    get offsetLeft() {return this.rect.left;}
    get offsetTop() {return this.rect.top;}
  }
  const html = new Element(), body = new Element(), head = new Element();
  html.clientWidth = 1440; body.dataset = {page: 'home'};
  const nav = new Element(), card = new Element();
  nav.selector = '.nav a'; card.selector = '.publication-card';
  nav.rect = {left: 32, top: 330, width: 200, height: 46, right: 232, bottom: 376};
  card.rect = {left: 260, top: 450, width: 852, height: 220, right: 1112, bottom: 670};
  const menu = new Element(), menuButton = new Element(), toc = new Element(), summary = new Element();
  menu.selector = '.mobile-menu'; menuButton.selector = '.mobile-menu a';
  toc.selector = '.inline-toc'; summary.selector = '.inline-toc summary';
  menu.classList.add('open'); menu.appendChild(menuButton); toc.appendChild(summary);
  menu.rect = {left: 16, top: 80, width: 360, height: 300, right: 376, bottom: 380};
  menuButton.rect = {left: 32, top: 140, width: 328, height: 46, right: 360, bottom: 186};
  toc.rect = {left: 250, top: 180, width: 720, height: 48, right: 970, bottom: 228};
  summary.rect = {left: 266, top: 180, width: 688, height: 48, right: 954, bottom: 228};
  const candidates = withDisclosures ? [nav, card, menu, menuButton, toc, summary] : [nav, card];
  const document = events({documentElement: html, body, head, hidden: false,
    createElement: () => new Element(), querySelectorAll: selector => candidates.filter(node => node.matches(selector)), getElementById: id => withDisclosures && id === 'mobileMenu' ? menu : null});
  const reduced = events({matches: reduce});
  const compactCards = events({matches: false});
  const window = events({matchMedia: query => query.includes('max-width') ? compactCards : reduced, requestIdleCallback: fn => fn(), ResizeObserver: class {observe() {}}});
  class Observer {
    constructor(fn) {this.fn = fn;}
    observe(element) {observations.push([element, this.fn]);}
  }
  const library = options => {
    calls.push(options);
    const host = body.children.find(node => node.id === 'liquidgl-host');
    return host.children.map(el => {
      const lens = {el, options, renderer: {backend: {constructor: {name: 'WebGLBackend'}}},
        setTint() {}, destroy() {if (!this.closed) destroyed++; this.closed = true;}};
      lenses.push(lens);
      pending.push(() => options.on.init(lens));
      return lens;
    });
  };
  if (!missingLibrary) window.liquidGL = library;
  const context = {window, document, performance: {now: () => now}, location: {search}, URLSearchParams, innerWidth: 1440, innerHeight: 900,
    requestAnimationFrame: fn => {frames.set(++id, fn); return id;}, cancelAnimationFrame: key => frames.delete(key),
    setTimeout: fn => {timers.set(++id, fn); return id;}, clearTimeout: key => timers.delete(key),
    MutationObserver: Observer, ResizeObserver: window.ResizeObserver,
    getComputedStyle: (element, pseudo) => pseudo ? {backgroundImage: 'url(/images/soft-tile.svg)', opacity: '.62'} : {
      backgroundColor: html.classList.contains('dark-mode') ? '#262a29' : '#f8faf7', borderRadius: '18px',
      getPropertyValue: name => name === '--bg-main' ? (html.classList.contains('dark-mode') ? '#262a29' : '#f8faf7') : name.includes('mint') ? '#DDEFE5' : '#F8EFCF'
    }};
  vm.runInNewContext(source, context); document.emit('DOMContentLoaded');
  return {window, document, html, nav, card, menu, menuButton, toc, summary, frames, timers, calls, pending, reduced, compactCards, lenses,
    get destroyed() {return destroyed;},
    flush() {now += 16; const list = [...frames.values()]; frames.clear(); list.forEach(fn => fn());},
    ready() {pending.splice(0).forEach(fn => fn());},
    mutate(element) {observations.filter(([target]) => target === element).forEach(([,fn]) => fn([{type: 'attributes', target: element, attributeName: 'class'}]));},
    advance(ms) {now += ms;},
    status: () => window.WYH_LIQUIDGL_PROTOTYPE.status};
}
test('a shared lens pool leaves original layout, text and hit targets intact', () => {
  const r = runtime(); const before = JSON.stringify([r.nav.rect, r.card.rect]);
  r.flush(); assert.equal(r.calls.length, 1);
  for (const options of r.calls) {
    assert.equal(options.snapshot, '#liquidgl-snapshot'); assert.equal(options.content, false);
    assert.equal(options.resolution, 0.75); assert.equal(options.specular, false);
  }
  r.ready(); r.flush();
  assert.equal(r.status().active, 2); assert.equal(r.status().backend, 'webgl');
  assert.equal(r.nav.dataset.liquidglMaterial, 'control');
  assert.equal(r.card.dataset.liquidglMaterial, 'panel');
  assert.ok('data-liquidgl-active' in r.card.attrs);
  assert.equal(JSON.stringify([r.nav.rect, r.card.rect]), before);
  assert.deepEqual(r.nav.style, {}); assert.deepEqual(r.card.style, {});
  for (let i = 0; i < 100; i++) r.document.emit('scroll');
  assert.equal(r.frames.size, 1); r.flush(); assert.equal(r.calls.length, 1);
  const rect = r.card.rect;
  r.card.rect = {...rect, top: 1000, bottom: 1220};
  r.document.emit('scroll'); r.flush();
  assert.equal(r.status().active, 1);
  assert.equal('data-liquidgl-active' in r.card.attrs, false);
  assert.ok('data-liquidgl-active' in r.nav.attrs, 'a retained target must keep its GPU state when the pool is reassigned');
  r.card.rect = rect; r.document.emit('scroll'); r.flush();
  assert.equal(r.status().active, 2);
  assert.equal(r.calls.length, 1, 'scrolling should reuse the existing GPU panes');
  r.document.hidden = true; r.document.emit('visibilitychange');
  assert.equal(r.destroyed, 24); assert.equal(r.timers.size, 0); assert.equal(r.frames.size, 0);
  assert.equal(r.status().active, 0); assert.equal('data-liquidgl-active' in r.card.attrs, false);
});
test('baseline/reduced-motion modes avoid loading or allocating GPU effects', () => {
  for (const settings of [{search: '?glass=off'}, {reduce: true}]) {
    const r = runtime(settings); r.flush();
    assert.equal(r.calls.length, 0); assert.equal(r.document.body.children.length, 0);
    assert.equal(r.document.head.children.length, 0);
  }
});
test('theme changes and bfcache navigation tear down old resources and reject stale GPU callbacks', () => {
  const r = runtime(); r.flush();
  r.html.classList.add('dark-mode'); r.mutate(r.html);
  r.flush(); assert.equal(r.destroyed, 24);
  r.ready(); r.flush(); assert.equal(r.status().active, 2);
  assert.equal(r.calls.length, 2); assert.equal(r.status().backend, 'webgl');
  r.window.emit('pagehide'); assert.equal(r.status().active, 0); assert.equal(r.destroyed, 48);
  r.window.emit('pageshow'); r.flush(); r.ready(); r.flush(); assert.equal(r.status().active, 2);
});
test('a script load error keeps the existing site usable without hiding its backgrounds', async () => {
  const r = runtime({missingLibrary: true}); r.flush();
  const script = r.document.head.children[0]; assert.equal(script.src, vendorUrl); assert.equal(script.integrity, vendorIntegrity);
  script.onerror(); await Promise.resolve(); await Promise.resolve();
  assert.equal(r.status().status, 'css-fallback'); assert.equal(r.document.body.children.length, 0);
  assert.equal('data-liquidgl-active' in r.nav.attrs, false);
  assert.equal(r.html.classList.contains('liquidgl-prototype'), false);
});

test('a press sharpens the GPU bevel and release resets the reused lens', () => {
  const r = runtime();
  r.flush(); r.ready(); r.flush();
  const buttonLens = r.lenses[1];
  const rest = buttonLens.options.bevelDepth;
  const restWidth = buttonLens.options.bevelWidth;
  r.document.emit('pointerdown', {target: r.nav, button: 0, pointerId: 1, clientX: 33, clientY: 353});
  r.flush();
  assert.ok('data-liquidgl-pressed' in r.nav.attrs);
  assert.ok(buttonLens.options.bevelDepth > rest);
  assert.ok(buttonLens.options.bevelWidth < restWidth);
  assert.equal(r.nav.style['--lg-rim-x'], '0%');
  assert.equal(r.nav.style['--lg-rim-y'], '50%');
  assert.ok(buttonLens.options.frost > 1.1);
  assert.equal(r.lenses[0].options.bevelDepth, rest, "the neighboring card must retain its own optics");
  r.document.emit('pointercancel', {pointerId: 1});
  r.flush();
  assert.equal('data-liquidgl-pressed' in r.nav.attrs, false);
  assert.equal(buttonLens.options.bevelDepth, rest);
  assert.equal(r.calls.length, 1);
});

test('one moving glint per frame follows the pointer and clears on exit', () => {
  const r = runtime();
  r.flush(); r.ready(); r.flush();
  r.nav.style.setProperty = function(key, value) {this[key] = value;};
  const rest = r.lenses[1].options.frost;
  const move = x => r.document.emit('pointermove', {target: r.nav, pointerType: 'mouse', clientX: x, clientY: 353});
  for (let i = 0; i < 80; i++) move(53 + i);
  assert.equal(r.frames.size, 2, 'one pointer paint and one update when the hovered target changes');
  r.flush();
  assert.equal(r.nav.style['--lg-hot-x'], '50%');
  assert.equal(r.nav.style['--lg-hot-y'], '50%');
  assert.ok(r.lenses[1].options.frost > rest);
  for (let i = 0; i < 80; i++) move(157);
  assert.equal(r.frames.size, 1, 'movement within one control only paints the glint');
  r.flush();
  r.document.emit('pointerout', {relatedTarget: null});
  r.flush();
  assert.equal('data-liquidgl-hover' in r.nav.attrs, false);
  assert.equal(r.lenses[1].options.frost, rest);
});

test('card press follows the spring temporarily and a nested text link does not press the card', () => {
  const r = runtime();
  r.flush(); r.ready(); r.flush();
  const textLink = {closest(selector) {
    if (selector.split(',').includes('a')) return this;
    return r.card.closest(selector);
  }};
  r.document.emit('pointerdown', {target: textLink, button: 0, pointerId: 2});
  assert.equal('data-liquidgl-pressed' in r.card.attrs, false);
  r.document.emit('pointerdown', {target: r.card, button: 0, pointerId: 3});
  r.flush();
  assert.ok('data-liquidgl-pressed' in r.card.attrs);
  assert.ok(r.lenses[0].options.frost > r.lenses[1].options.frost);
  r.document.emit('pointerup', {pointerId: 3});
  assert.equal(r.timers.size, 0, 'card release starts immediately');
  assert.equal('data-liquidgl-pressed' in r.card.attrs, false);
  r.flush();
  assert.ok(r.lenses[0].options.frost > r.lenses[1].options.frost, 'optics relax while the panel returns');
  assert.equal(r.frames.size, 1, 'the pane follows the returning card');
  r.advance(400); r.flush();
  assert.equal(r.lenses[0].options.frost, r.lenses[1].options.frost);
  assert.equal(r.frames.size, 0, 'card motion must not leave an extra render loop running');
});

test('quick clicks release the button immediately and only hold a directional rim for one paint', () => {
  const r = runtime();
  r.flush(); r.ready(); r.flush();
  const down = x => r.document.emit('pointerdown', {target: r.nav, button: 0, pointerId: 1, clientX: x, clientY: 353});
  down(132);
  assert.equal(r.nav.style['--lg-rim-x'], '50%');
  assert.equal(r.nav.style['--lg-rim-y'], '0%');
  r.document.emit('pointerup', {pointerId: 1});
  assert.equal('data-liquidgl-pressed' in r.nav.attrs, false);
  assert.ok('data-liquidgl-rim' in r.nav.attrs);
  const [key, dismiss] = [...r.timers.entries()][0];
  r.timers.delete(key); dismiss();
  assert.equal('data-liquidgl-rim' in r.nav.attrs, false);
  down(230);
  assert.equal(r.nav.style['--lg-rim-x'], '100%');
  r.window.emit('pagehide');
  assert.equal('data-liquidgl-rim' in r.nav.attrs, false);
});

test('inline contents use one surface and the opened mobile menu stays on the live CSS backdrop', () => {
  const r = runtime({withDisclosures: true});
  r.flush(); r.ready(); r.flush();
  assert.equal(r.toc.dataset.liquidglMaterial, 'field');
  assert.ok('data-liquidgl-active' in r.toc.attrs);
  assert.equal(r.summary.dataset.liquidglMaterial, undefined, 'summary must not draw a second glass surface');
  assert.equal(r.menu.dataset.liquidglMaterial, undefined, 'the open panel keeps the original CSS material');
  assert.equal(r.menuButton.dataset.liquidglMaterial, 'control', 'menu buttons keep their local feedback');
  assert.equal('data-liquidgl-active' in r.menuButton.attrs, false, 'the menu subtree stays out of the wallpaper canvas');
  const host = r.document.body.children.find(node => node.id === 'liquidgl-host');
  assert.equal('data-menu-open' in host.attrs, false);
  assert.equal(r.status().active, 3, 'page cards and controls still use their usual lenses');
});

test('resizing to compact mode removes panel lenses while preserving presses and button refraction', () => {
  const r = runtime();
  r.flush(); r.ready(); r.flush();
  assert.ok('data-liquidgl-active' in r.card.attrs);
  r.compactCards.matches = true;
  r.compactCards.emit('change');
  r.flush();
  assert.equal('data-liquidgl-active' in r.card.attrs, false, 'no GPU perimeter remains on the compact card');
  assert.equal(r.card.dataset.liquidglMaterial, 'panel');
  assert.ok('data-liquidgl-active' in r.nav.attrs);
  r.document.emit('pointerdown', {target: r.card, button: 0, pointerId: 1});
  r.flush();
  assert.ok('data-liquidgl-pressed' in r.card.attrs, 'the native surface still moves on press');
  assert.equal('data-liquidgl-active' in r.card.attrs, false);
  r.document.emit('pointercancel', {pointerId: 1});
  r.compactCards.matches = false;
  r.compactCards.emit('change');
  r.flush();
  assert.ok('data-liquidgl-active' in r.card.attrs);
  assert.equal(r.calls.length, 1, 'switching material reuses the existing canvas');
});

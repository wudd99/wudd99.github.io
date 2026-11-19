/* Site-wide material adapter for upstream liquidGL v3. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const state = {status: 'css', backend: null, active: 0};
  window.WYH_LIQUIDGL_PROTOTYPE = Object.freeze({
    version: '3.0.0', get status() {return {...state};}
  });
  if (new URLSearchParams(location.search).get('glass') === 'off') {
    state.status = 'disabled';
    return;
  }

  const panels = '.publication-card,.poster-card,.blog-card,.blog-post,.research-timeline,.timeline-card,#service li,.publication-empty,.blog-empty';
  const overlays = '.ref-topbar';
  const fields = '.search-field,.inline-toc';
  const controls = '.tag-filter summary,.nav a,.mobile-menu a,.appearance-button,.hamburger,.close-menu,.social-links a,.pub-tag.link,.poster-tag.link,.pub-filter-chip,.tag-option,.text-button,.search-submit,.post-tags a,.timeline-marker-label';
  const bareControls = '.right-rail .tag-filter > summary,.timeline-marker-label';
  const cards = '.publication-card,.poster-card,.blog-card,.timeline-card';
  const tactileCards = cards + ',#service li';
  const media = '.blog-cover-link,.profile-home,.ref-brand';
  const selector = [panels, overlays, fields, controls, media].join(',');
  const toneRules = [
    ['.nav a,.mobile-menu a,.hamburger,.close-menu,.ref-topbar,.appearance-button', 'navigation'],
    ['.publication-card[data-pub-type="journal"],.publication-card[data-pub-type="journal"] .pub-tag.link,.pub-filter-chip[data-filter-value="journal"],.pub-filter-chip[data-filter-type="topic"],.research-timeline,.timeline-card,.timeline-marker-label', 'cream'],
    ['.publication-card[data-pub-type="conference"],.publication-card[data-pub-type="conference"] .pub-tag.link,.pub-filter-chip[data-filter-value="conference"]', 'lavender'],
    ['.poster-card,.poster-tag.link,.poster-card .pub-tag.link,.blog-card,.blog-post,.post-tags a,.tag-option', 'apricot']
  ];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactCards = window.matchMedia('(max-width: 1439px)');
  const menu = document.getElementById('mobileMenu');
  const observed = new Set();
  const records = new Map();
  const panes = [];
  const maxPanes = 24;
  const restingOptics = {refraction: .014, bevelDepth: .085, bevelWidth: .19, frost: 1.55};
  const hoverOptics = {refraction: .018, bevelDepth: .101, bevelWidth: .16, frost: 2.05};
  const pressedOptics = {refraction: .021, bevelDepth: .125, bevelWidth: .105, frost: 2.55};
  const releaseDuration = 185;
  let press, recovery, rimTarget, rimTimer, hover, glintFrame = 0, settlingUntil = 0;
  let host, snapshot, libraryPromise, frame, timeout, generation = 0;
  let dirty = true, failed = false, pageHidden = false, contextLost = false;
  let captureStyle = '', contextDevice;
  const resizeObserver = window.ResizeObserver ? new ResizeObserver(schedule) : null;

  function scan() {
    const current = new Set(document.querySelectorAll(selector));
    for (const element of observed) {
      if (current.has(element)) continue;
      resizeObserver?.unobserve(element);
      observed.delete(element);
      records.delete(element);
      element.removeAttribute('data-liquidgl-material');
      element.removeAttribute('data-liquidgl-tone');
      element.removeAttribute('data-liquidgl-rim-anchor');
      element.removeAttribute('data-liquidgl-card-rim');
    }
    for (const element of current) {
      if (observed.has(element)) continue;
      const kind = element.matches(overlays) ? 'overlay' :
        element.matches(panels) ? 'panel' : element.matches(fields) ? 'field' :
        element.matches(media) ? 'media' : 'control';
      const tone = toneRules.find(([rule]) => element.matches(rule))?.[1] ||
        (kind === 'control' ? 'interface' : 'neutral');
      element.dataset.liquidglMaterial = kind;
      element.dataset.liquidglTone = tone;
      const isCard = element.matches(cards);
      if (isCard) element.setAttribute('data-liquidgl-card-rim', '');
      records.set(element, {element, kind, tone});
      observed.add(element);
      if ((kind === 'control' || isCard) && getComputedStyle(element).position === 'static') {
        element.setAttribute('data-liquidgl-rim-anchor', '');
      }
      if (kind !== 'media') resizeObserver?.observe(element);
    }
    dirty = false;
  }

  function releasePane(pane) {
    pane.record?.element.removeAttribute('data-liquidgl-active');
    pane.record = null;
    pane.node.hidden = true;
  }

  function suspend() {
    generation++;
    clearPress();
    clearRim();
    recovery = null;
    clearHover();
    settlingUntil = 0;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(timeout);
    timeout = 0;
    for (const pane of panes.splice(0)) {
      releasePane(pane);
      pane.lens?.destroy();
    }
    host?.remove();
    snapshot?.remove();
    host = snapshot = null;
    captureStyle = '';
    contextDevice = null;
    root.classList.remove('liquidgl-prototype');
    state.status = failed ? 'css-fallback' : 'css';
    state.active = 0;
    state.backend = null;
  }

  function fail() {
    failed = true;
    suspend();
  }

  function loadLibrary() {
    if (window.liquidGL) return Promise.resolve();
    if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '{{ .RelPermalink }}';
      script.integrity = '{{ .Data.Integrity }}';
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => typeof window.liquidGL === 'function' ? resolve() : reject();
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return libraryPromise;
  }

  function mount(baseColor, artwork) {
    snapshot = document.createElement('div');
    snapshot.id = 'liquidgl-snapshot';
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.style.backgroundColor = baseColor;
    const pattern = document.createElement('div');
    pattern.className = 'liquidgl-snapshot-pattern';
    Object.assign(pattern.style, artwork);
    snapshot.appendChild(pattern);
    body.appendChild(snapshot);
    host = document.createElement('div');
    host.id = 'liquidgl-host';
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('data-liquid-ignore', '');
    host.addEventListener('webglcontextlost', () => {
      contextLost = true;
      schedule();
    }, true);
    body.appendChild(host);
    for (let index = 0; index < maxPanes; index++) {
      const node = document.createElement('div');
      node.className = 'liquidgl-pane';
      node.hidden = true;
      host.appendChild(node);
      panes.push({node, record: null, ready: false});
    }
    root.classList.add('liquidgl-prototype');
  }

  function baseArtwork() {
    // Read the original fixed wallpaper, even while its rasterisable copy is visible.
    const styles = getComputedStyle(body, '::before');
    const properties = ['backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat',
      'backgroundOrigin','backgroundClip','backgroundAttachment','opacity','filter','mixBlendMode'];
    return Object.fromEntries(properties.map(name => [name, styles[name]]));
  }

  function tintFor(record, bodyStyle) {
    const value = bodyStyle.getPropertyValue('--' + record.tone + '-surface').trim();
    const rgb = /^#[a-f0-9]{6}$/i.test(value) ?
      [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16)) :
      (root.classList.contains('dark-mode') ? [183, 185, 194] : [255, 253, 252]);
    return 'rgba(' + rgb.join(',') + ',' + (record.kind === 'panel' ? '.14' : '.21') + ')';
  }

  function startRenderer() {
    const token = generation;
    const paneByElement = new Map(panes.map(pane => [pane.node, pane]));
    const result = window.liquidGL({
      snapshot: '#liquidgl-snapshot',
      target: '#liquidgl-host > .liquidgl-pane',
      engine: 'auto',
      resolution: .75,
      zIndex: 0,
      content: false,
      ...restingOptics,
      specular: false,
      shadow: false,
      tilt: false,
      reveal: 'none',
      on: {init(lens) {
        if (token !== generation) return;
        const pane = paneByElement.get(lens.el);
        if (!pane) return;
        pane.ready = true;
        clearTimeout(timeout);
        timeout = 0;
        const backend = lens.renderer?.backend;
        state.backend = backend?.device ? 'webgpu' : 'webgl';
        const device = backend?.device;
        if (device?.lost && !contextDevice) {
          contextDevice = device;
          device.lost.then(() => {if (generation === token) fail();});
        }
        schedule();
      }}
    });
    const lenses = Array.isArray(result) ? result : result ? [result] : [];
    for (const lens of lenses) {
      const pane = paneByElement.get(lens.el);
      if (!pane) continue;
      // The batch initializer shares one options object across every lens.
      // Give each pane its own tint and press settings before updating it.
      lens.options = {...lens.options};
      pane.lens = lens;
    }
    if (lenses.length !== panes.length || !lenses[0]?.renderer) {
      fail();
      return;
    }
    if (!state.backend) timeout = setTimeout(fail, 8000);
  }

  function opticsFor(element) {
    if (element === press?.element) return pressedOptics;
    const rest = element === hover?.element ? hoverOptics : restingOptics;
    if (element !== recovery?.element) return rest;
    const progress = Math.min(1, (performance.now() - recovery.started) / releaseDuration);
    if (progress >= 1) return rest;
    const remainder = (1 - progress) ** 2;
    return {
      refraction: rest.refraction + (pressedOptics.refraction - rest.refraction) * remainder,
      bevelDepth: rest.bevelDepth + (pressedOptics.bevelDepth - rest.bevelDepth) * remainder,
      bevelWidth: rest.bevelWidth + (pressedOptics.bevelWidth - rest.bevelWidth) * remainder,
      frost: rest.frost + (pressedOptics.frost - rest.frost) * remainder
    };
  }

  function usePane(pane, measurement) {
    const {record, rect, radius, tint} = measurement;
    if (pane.record !== record) {
      releasePane(pane);
      pane.record = record;
    }
    const style = pane.node.style;
    style.left = rect.left + 'px';
    style.top = rect.top + 'px';
    style.width = rect.width + 'px';
    style.height = rect.height + 'px';
    style.borderRadius = radius;
    pane.node.hidden = false;
    if (pane.lens && pane.tint !== tint) {
      pane.lens.setTint(tint);
      pane.tint = tint;
    }
    const optics = opticsFor(record.element);
    if (pane.lens && pane.optics !== optics) {
      // The renderer reads these settings against the pane's current, animated bounds.
      Object.assign(pane.lens.options, optics);
      pane.optics = optics;
    }
    if (pane.ready && pane.record === record) record.element.setAttribute('data-liquidgl-active', '');
  }

  function measurements() {
    const width = root.clientWidth;
    const height = innerHeight;
    const clipByAncestor = new Map();
    const bodyStyle = getComputedStyle(body);
    const visible = [];
    for (const record of records.values()) {
      const {element, kind} = record;
      // The fixed bar and open menu blur the live page as it scrolls underneath.
      if (kind === 'media' || kind === 'overlay' ||
          menu?.contains(element) || element.matches(bareControls)) continue;
      // A wide card's shader bevel can show a second edge inside the CSS border
      // as its proportions change. Compact cards use one native rounded surface.
      if (kind === 'panel' && compactCards.matches) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10 || rect.bottom <= 0 || rect.top >= height ||
          rect.right <= 0 || rect.left >= width || rect.height > height * 1.3) continue;
      const ancestor = element.parentElement?.closest('.sidebar,.right-rail,.blog-post,.blog-card');
      if (ancestor) {
        if (!clipByAncestor.has(ancestor)) clipByAncestor.set(ancestor, ancestor.getBoundingClientRect());
        const clip = clipByAncestor.get(ancestor);
        if (rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1 ||
            rect.left < clip.left - 1 || rect.right > clip.right + 1) continue;
      }
      visible.push({record, rect, radius: getComputedStyle(element).borderTopLeftRadius, tint: tintFor(record, bodyStyle)});
    }
    // Reserve coverage for cards and search before smaller controls.
    const priority = {panel: 0, field: 1, control: 2};
    visible.sort((first, second) => priority[first.record.kind] - priority[second.record.kind]);
    const chosen = visible.slice(0, maxPanes);
    const interactionTarget = press?.element || recovery?.element || hover?.element;
    const interactionIndex = visible.findIndex(item => item.record.element === interactionTarget);
    if (interactionIndex >= maxPanes) chosen[maxPanes - 1] = visible[interactionIndex];
    return {visible: chosen, baseColor: bodyStyle.getPropertyValue('--bg-main').trim()};
  }

  function update() {
    frame = 0;
    if (dirty) scan();
    if (recovery && performance.now() - recovery.started >= releaseDuration) recovery = null;
    if (contextLost) {fail(); return;}
    if (pageHidden || document.hidden || reduced.matches || failed) return;
    const {visible, baseColor} = measurements();
    if (!visible.length) {if (host) suspend(); return;}
    if (!window.liquidGL) {
      if (state.status !== 'loading') {
        state.status = 'loading';
        loadLibrary().then(schedule).catch(fail);
      }
      return;
    }
    const artwork = baseArtwork();
    const nextCaptureStyle = JSON.stringify([baseColor, artwork]);
    if (host && captureStyle !== nextCaptureStyle) suspend();
    if (!host) mount(baseColor, artwork);
    captureStyle = nextCaptureStyle;
    try {
      for (let i = 0; i < panes.length; i++) {
        if (panes[i].record !== visible[i]?.record) releasePane(panes[i]);
      }
      // Slots are reused as different cards enter view. This avoids recapturing the
      // backdrop or creating a second GPU context on every scroll or search update.
      visible.forEach((measurement, index) => usePane(panes[index], measurement));
      if (!panes[0].lens) startRenderer();
      state.active = panes.filter(pane => pane.ready && pane.record).length;
      if (state.active) state.status = 'active';
      if (settlingUntil > performance.now()) schedule();
    } catch (_) {fail();}
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function relevantChanges(changes) {
    for (const change of changes) {
      if (change.type === 'attributes') {
        if (change.target === root || change.attributeName === 'hidden' &&
            !change.target.closest('#liquidgl-host')) schedule();
        continue;
      }
      if (change.target.closest?.('#liquidgl-host,#liquidgl-snapshot,.meteor-layer')) continue;
      for (const node of [...change.addedNodes, ...change.removedNodes]) {
        if (node.matches?.(selector) || node.querySelector?.(selector)) {
          dirty = true;
          schedule();
          return;
        }
      }
    }
  }

  function tactileSurface(target) {
    const marker = target.closest?.('.timeline-marker');
    const control = marker?.querySelector('.timeline-marker-label') ||
      target.closest?.('[data-liquidgl-material="control"]');
    if (control) return control.closest('[inert],[disabled],[aria-disabled="true"]') ? null : control;
    // A text link, PDF button or other nested action only owns its own feedback.
    if (target.closest?.('a,button,input,select,textarea,summary,label,[role="button"]')) return null;
    return target.closest?.(tactileCards);
  }

  function clearHover() {
    hover?.element.removeAttribute('data-liquidgl-hover');
    hover = null;
    if (glintFrame) cancelAnimationFrame(glintFrame);
    glintFrame = 0;
  }

  function paintGlint() {
    glintFrame = 0;
    if (!hover) return;
    const {element, x, y} = hover;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const percent = (offset, size) => Math.max(0, Math.min(100, offset * 100 / size)) + '%';
    element.style.setProperty('--lg-hot-x', percent(x - rect.left, rect.width));
    element.style.setProperty('--lg-hot-y', percent(y - rect.top, rect.height));
  }

  function moveGlint(event) {
    if (event.pointerType === 'touch' || reduced.matches) return;
    const element = tactileSurface(event.target) || null;
    if ((hover?.element || null) !== element) {
      clearHover();
      if (element) element.setAttribute('data-liquidgl-hover', '');
      schedule();
    }
    if (!element) return;
    hover = {element, x: event.clientX, y: event.clientY};
    if (!glintFrame) glintFrame = requestAnimationFrame(paintGlint);
  }

  function followMotion() {
    // The decoration is viewport-positioned. Track the CSS spring only while it runs.
    if (!reduced.matches) settlingUntil = performance.now() + 380;
    schedule();
  }

  function clearPress() {
    press?.element.removeAttribute('data-liquidgl-pressed');
    press = null;
  }

  function clearRim() {
    clearTimeout(rimTimer);
    rimTimer = 0;
    rimTarget?.removeAttribute('data-liquidgl-rim');
    rimTarget = null;
  }

  function locatePress(element, event, key, isCard) {
    const {left, top, width, height} = element.getBoundingClientRect();
    if (!width || !height) return;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const x = key || !Number.isFinite(event.clientX) ? width / 2 : clamp(event.clientX - left, 0, width);
    const y = key || !Number.isFinite(event.clientY) ? height / 2 : clamp(event.clientY - top, 0, height);

    if (isCard) {
      // A card is a rounded rectangle, so project to the closest of its four edges.
      const horizontal = Math.min(x, width - x);
      const vertical = Math.min(y, height - y);
      const edgeX = horizontal < vertical ? (x < width / 2 ? 0 : width) : x;
      const edgeY = horizontal < vertical ? y : (y < height / 2 ? 0 : height);
      element.style.setProperty('--lg-rim-x', edgeX / width * 100 + '%');
      element.style.setProperty('--lg-rim-y', edgeY / height * 100 + '%');
      return;
    }

    // Project onto the nearest edge of the pill. Keep the glow off its flat face.
    const radius = Math.min(width, height) / 2;
    const centerX = clamp(x, radius, width - radius);
    const centerY = clamp(y, radius, height - radius);
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.hypot(dx, dy);
    const edgeX = distance ? centerX + dx * radius / distance : centerX;
    const edgeY = distance ? centerY + dy * radius / distance : 0;
    element.style.setProperty('--lg-rim-x', edgeX / width * 100 + '%');
    element.style.setProperty('--lg-rim-y', edgeY / height * 100 + '%');
    element.style.setProperty('--lg-pivot-x', (65 - x / width * 30) + '%');
    element.style.setProperty('--lg-pivot-y', (65 - y / height * 30) + '%');
  }

  function beginPress(event, key) {
    const element = tactileSurface(event.target);
    if (!element) return;
    clearPress();
    clearRim();
    recovery = null;
    const isCard = element.matches(cards);
    if (isCard || (element.dataset.liquidglMaterial === 'control' && !element.matches(bareControls))) {
      locatePress(element, event, key, isCard);
      rimTarget = element;
      element.setAttribute('data-liquidgl-rim', '');
    }
    press = {element, key, pointerId: event.pointerId, started: performance.now(), isCard};
    element.setAttribute('data-liquidgl-pressed', '');
    followMotion();
  }

  function finishPress(cancelled = false) {
    const {element, isCard, started} = press;
    clearPress();
    if (cancelled || reduced.matches) {
      clearRim();
      recovery = null;
    } else {
      recovery = {element, started: performance.now()};
      if (rimTarget) {
        // The card rim stays visible after release while the card shape springs back.
        const remaining = isCard ? 190 : Math.max(0, 34 - (performance.now() - started));
        if (remaining) rimTimer = setTimeout(clearRim, remaining);
        else clearRim();
      }
    }
    followMotion();
  }

  document.addEventListener('pointermove', moveGlint, {passive: true});
  document.addEventListener('pointerover', moveGlint, {passive: true});
  document.addEventListener('pointerout', event => {
    if (hover && (!event.relatedTarget || tactileSurface(event.relatedTarget) !== hover.element)) {
      clearHover();
      schedule();
    }
  }, {passive: true});
  document.addEventListener('pointerdown', event => {
    if (event.button === 0 && event.isPrimary !== false) beginPress(event);
  }, {passive: true});
  document.addEventListener('pointerup', event => {
    if (press && press.pointerId === event.pointerId) finishPress();
  }, {passive: true});
  document.addEventListener('pointercancel', event => {
    if (press && press.pointerId === event.pointerId) finishPress(true);
    if (hover) {clearHover(); schedule();}
  }, {passive: true});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && press) finishPress(true);
    if (!event.repeat && (event.key === 'Enter' ||
        event.key === ' ' && event.target.matches?.('button,summary,[role="button"],[role="link"]'))) {
      beginPress(event, event.key);
    }
  });
  document.addEventListener('keyup', event => {
    if (press && press.key === event.key) finishPress();
  });
  window.addEventListener('blur', () => {
    if (press) finishPress(true);
    if (hover) {clearHover(); schedule();}
  });

  const observer = new MutationObserver(relevantChanges);
  observer.observe(root, {attributes: true, attributeFilter: ['class','data-background','data-wallpaper-ready']});
  observer.observe(body, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
  resizeObserver?.observe(body);
  document.addEventListener('scroll', schedule, {capture: true, passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  compactCards.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : schedule());
  reduced.addEventListener('change', () => {suspend(); schedule();});
  window.addEventListener('pagehide', () => {pageHidden = true; suspend();});
  window.addEventListener('pageshow', () => {pageHidden = false; schedule();});
  scan();
  if (!reduced.matches) {
    if (window.requestIdleCallback) window.requestIdleCallback(schedule, {timeout: 750});
    else setTimeout(schedule, 0);
  }
});

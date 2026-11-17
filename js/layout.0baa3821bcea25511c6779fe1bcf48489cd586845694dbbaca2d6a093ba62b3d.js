/* Shared navigation, page directories and blog discovery. No external services. */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  const root = document.documentElement;
  const mobile = window.matchMedia('(max-width: 767px)');
  const wide = window.matchMedia('(min-width: 1200px)');
  const menu = document.getElementById('mobileMenu');
  const trigger = document.getElementById('retainedMenu');
  const legacyTrigger = document.getElementById('hamburger');
  const desktopToggle = document.getElementById('mode-toggle');
  const mobileToggle = document.getElementById('mobile-mode-toggle-checkbox');

  const themeButtons = Array.from(document.querySelectorAll('[data-theme-toggle]'));
  const topbarPhoto = document.querySelector('.ref-brand img');
  let previousDark;
  function syncTheme() {
    const dark = root.classList.contains('dark-mode');
    if (dark === previousDark) return;
    previousDark = dark;
    themeButtons.forEach(button => {
      const label = dark ? 'Light mode' : 'Dark mode';
      button.querySelector('[data-theme-label]').textContent = label;
      button.setAttribute('aria-label', 'Switch to ' + label.toLowerCase());
    });
    if (topbarPhoto) topbarPhoto.src = dark ? '/images/profile-dark.webp' : '/images/profile-light.webp';
  }
  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const control = button.closest('.mobile-menu') ? mobileToggle : desktopToggle;
      if (control) control.click();
    });
  });
  syncTheme();
  new MutationObserver(syncTheme).observe(root, {attributes: true, attributeFilter: ['class']});
  window.addEventListener('storage', event => {
    if (event.key !== 'dark-mode' || !desktopToggle) return;
    const dark = event.newValue === 'true';
    if (desktopToggle.checked !== dark) desktopToggle.click();
  });

  if (menu && trigger && legacyTrigger) {
    let wasOpen = false;
    function syncMenu() {
      const open = menu.classList.contains('open') && mobile.matches;
      menu.inert = !open;
      menu.setAttribute('aria-hidden', String(!open));
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (open && !wasOpen) menu.querySelector('a').focus();
      if (!open && wasOpen && mobile.matches) trigger.focus();
      wasOpen = open;
    }
    trigger.addEventListener('click', () => legacyTrigger.click());
    new MutationObserver(syncMenu).observe(menu, {attributes: true, attributeFilter: ['class']});
    mobile.addEventListener('change', () => {
      if (!mobile.matches && menu.classList.contains('open')) legacyTrigger.click();
      syncMenu();
    });
    document.addEventListener('keydown', event => {
      if (!wasOpen || event.key !== 'Tab') return;
      const controls = Array.from(menu.querySelectorAll('a[href],button:not([disabled])')).filter(el => !el.hidden);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
    syncMenu();
  }

  function initDirectory() {
    let targets = [];
    if (document.body.dataset.page === 'home') {
      targets = ['about', 'publications', 'poster', 'service', 'contact'].map(id => document.getElementById(id)).filter(Boolean);
    } else if (document.body.dataset.page === 'blog-post') {
      targets = Array.from(document.querySelectorAll('.post-content h2,.post-content h3'));
    } else return;
    const navs = document.querySelectorAll('.sidebar-directory nav,.inline-toc nav');
    if (!targets.length) {
      document.querySelectorAll('.inline-toc,.sidebar-directory').forEach(el => el.hidden = true);
      return;
    }
    const names = {about: 'About', publications: 'Publications', poster: 'Posters', service: 'Academic Service', contact: 'Contact'};
    targets.forEach((target, index) => {
      if (!target.id) {
        const stem = target.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
        let id = stem, count = 2;
        while (document.getElementById(id)) id = stem + '-' + count++;
        target.id = id;
      }
    });
    navs.forEach(nav => {
      const list = document.createElement('ol');
      list.className = 'page-toc';
      targets.forEach(target => {
        const item = document.createElement('li');
        if (target.tagName === 'H3') item.className = 'toc-subheading';
        const link = document.createElement('a');
        link.href = '#' + encodeURIComponent(target.id);
        link.textContent = names[target.id] || target.textContent.trim();
        item.append(link); list.append(item);
      });
      nav.replaceChildren(list);
    });
    const sectionLinks = Array.from(document.querySelectorAll('.page-toc a,.mobile-home-sections a')).filter(link => {
      const url = new URL(link.href);
      return url.origin === location.origin && url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && targets.some(target => '#' + encodeURIComponent(target.id) === url.hash);
    });
    let frame = 0, anchorTarget = null, anchorScroll = null, settleTimer = 0;
    function scrollPosition() {
      return window.scrollY || (document.scrollingElement || document.documentElement).scrollTop || 0;
    }
    let paintedCurrent = null;
    function paintCurrent(current) {
      if (current === paintedCurrent) return;
      paintedCurrent = current;
      sectionLinks.forEach(link => {
        const selected = decodeURIComponent(link.hash.slice(1)) === current.id;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    function selectAnchor(target) {
      clearTimeout(settleTimer);
      anchorTarget = target;
      anchorScroll = null;
      paintCurrent(target);
      requestHighlight();
    }
    function releaseAnchor() {
      clearTimeout(settleTimer);
      anchorTarget = null;
      anchorScroll = null;
      requestHighlight();
    }
    function highlight() {
      frame = 0;
      const scrollY = scrollPosition();
      // Keep the clicked section selected during native smooth scrolling and at
      // a clamped bottom-of-page destination. Manual scrolling resumes scrollspy.
      if (anchorTarget && anchorScroll !== null && Math.abs(scrollY - anchorScroll) > 2) {
        anchorTarget = null;
        anchorScroll = null;
      }
      if (anchorTarget) {
        paintCurrent(anchorTarget);
        if (anchorScroll === null) {
          clearTimeout(settleTimer);
          settleTimer = setTimeout(() => { anchorScroll = scrollPosition(); }, 160);
        }
        return;
      }
      const offset = mobile.matches ? 104 : 44;
      let current = targets[0];
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= offset) current = target;
      }
      const scrollRoot = document.scrollingElement || document.documentElement;
      if (scrollY > 0 && scrollY + window.innerHeight >= scrollRoot.scrollHeight - 3) current = targets[targets.length - 1];
      paintCurrent(current);
    }
    function requestHighlight() { if (!frame) frame = requestAnimationFrame(highlight); }
    document.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;
      const target = url.hash
        ? targets.find(target => '#' + encodeURIComponent(target.id) === url.hash)
        : document.body.dataset.page === 'home' ? targets[0] : null;
      if (target) selectAnchor(target);
    });
    function selectHash() {
      const target = targets.find(target => '#' + encodeURIComponent(target.id) === location.hash);
      if (target) selectAnchor(target);
      else releaseAnchor();
    }
    window.addEventListener('scroll', requestHighlight, {passive: true});
    window.addEventListener('resize', releaseAnchor, {passive: true});
    window.addEventListener('hashchange', selectHash);
    window.addEventListener('pageshow', selectHash);
    function manualScroll(event) {
      if (event.target instanceof Element && event.target.closest('.right-rail,.sidebar,.mobile-menu,.ref-topbar')) return;
      releaseAnchor();
    }
    window.addEventListener('wheel', manualScroll, {passive: true});
    window.addEventListener('touchstart', manualScroll, {passive: true});
    document.addEventListener('keydown', event => {
      if (event.target instanceof Element && event.target.closest('input,textarea,select,button,[contenteditable="true"],.right-rail,.sidebar,.mobile-menu')) return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseAnchor();
    });
    document.querySelectorAll('.inline-toc').forEach(el => el.addEventListener('toggle', requestHighlight));
    if (window.ResizeObserver) new ResizeObserver(requestHighlight).observe(document.querySelector('.main-content'));
    selectHash();
  }
  initDirectory();

  if (document.body.dataset.page === 'home') {
    const publicationTools = document.getElementById('publication-tools');
    const desktopSlot = document.querySelector('.home-tools-rail-slot');
    const inlineSlot = document.querySelector('.home-tools-slot');
    if (publicationTools && desktopSlot && inlineSlot) {
      function placePublicationTools() {
        const focused = document.activeElement;
        const restoreFocus = publicationTools.contains(focused);
        const parent = wide.matches ? desktopSlot : inlineSlot;
        if (publicationTools.parentElement !== parent) {
          parent.append(publicationTools);
          if (restoreFocus) focused.focus({preventScroll: true});
        }
      }
      placePublicationTools();
      wide.addEventListener('change', placePublicationTools);
    }
  }

  if (document.body.dataset.page !== 'blog-list') return;
  const tools = document.getElementById('blog-tools');
  const rail = document.querySelector('.right-rail');
  const slot = document.querySelector('.blog-tools-slot');
  const input = document.getElementById('post-search');
  const form = tools.querySelector('form');
  const tagDetails = tools.querySelector('.tag-filter');
  const tagOptions = tools.querySelector('.tag-options');
  const selected = tools.querySelector('.selected-tag');
  const error = tools.querySelector('.search-error');
  const status = document.querySelector('.blog-results-status');
  const empty = document.querySelector('.blog-empty');
  const cards = Array.from(document.querySelectorAll('.blog-card'));
  const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase();
  // The fallback preserves title/summary search if the full-text index cannot load.
  let posts = cards.map(card => ({
    url: new URL(card.querySelector('h3 a').href).pathname,
    title: card.querySelector('h3').textContent,
    summary: card.querySelector('.summary')?.textContent || '',
    content: '',
    tags: (card.dataset.tags || '').split(',').map(tag => tag.trim()).filter(Boolean)
  }));
  let fullTextReady = false;
  let query = '', tag = '', historyTimer;
  function placeTools() {
    const focused = document.activeElement;
    const parent = wide.matches ? rail : slot;
    if (tools.parentElement !== parent) {
      const restore = tools.contains(focused);
      parent.append(tools);
      if (restore) focused.focus({preventScroll: true});
    }
    tagDetails.open = wide.matches;
  }
  placeTools();
  wide.addEventListener('change', placeTools);
  tools.querySelector('.search-submit').hidden = true;
  tagDetails.querySelector('summary').addEventListener('click', event => {
    if (wide.matches) event.preventDefault();
  });

  function writeURL() {
    clearTimeout(historyTimer);
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim()); else url.searchParams.delete('q');
    if (tag) url.searchParams.set('tag', tag); else url.searchParams.delete('tag');
    url.searchParams.delete('search');
    if (url.href !== location.href) history.pushState(null, '', url);
  }
  function readURL() {
    clearTimeout(historyTimer);
    const params = new URLSearchParams(location.search);
    query = params.get('q') || '';
    tag = params.get('tag') || '';
    input.value = query;
    render();
  }
  function tagCounts() {
    const counts = new Map();
    posts.forEach(post => (post.tags || []).forEach(value => counts.set(value, (counts.get(value) || 0) + 1)));
    return counts;
  }
  function tagButton(value, count, label) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tag-option';
    button.dataset.tag = value; button.setAttribute('aria-controls', 'blog-results');
    button.append(document.createTextNode(label));
    const number = document.createElement('small'); number.textContent = count; button.append(number);
    button.setAttribute('aria-label', label + ', ' + count + (count === 1 ? ' post' : ' posts'));
    button.addEventListener('click', () => { tag = value; writeURL(); render(); });
    return button;
  }
  function buildTags() {
    tagOptions.replaceChildren(tagButton('', posts.length, 'All posts'));
    Array.from(tagCounts()).sort((a,b) => a[0].localeCompare(b[0])).forEach(([value,count]) => tagOptions.append(tagButton(value,count,value)));
  }
  function render() {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    const matched = posts.filter(post => (!tag || (post.tags || []).some(value => normalize(value) === normalize(tag))) && words.every(word => normalize([post.title, post.summary, post.content].join(' ')).includes(word)));
    const urls = new Set(matched.map(post => post.url));
    cards.forEach(card => { card.hidden = !urls.has(new URL(card.querySelector('h3 a').href).pathname); });
    empty.hidden = matched.length !== 0;
    status.hidden = false;
    status.textContent = matched.length + (matched.length === 1 ? ' post' : ' posts') + (query.trim() ? ' matching “' + query.trim() + '”' : '') + (tag ? ' tagged ' + tag : '') + (query.trim() && !fullTextReady ? ' · titles and summaries' : '');
    tagOptions.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(normalize(button.dataset.tag) === normalize(tag))));
    selected.replaceChildren(); selected.hidden = !tag;
    if (tag) {
      const remove = document.createElement('button'); remove.type = 'button';
      remove.textContent = tag + ' ×'; remove.setAttribute('aria-label', 'Remove tag filter: ' + tag);
      remove.addEventListener('click', () => { tag = ''; writeURL(); render(); tagDetails.querySelector('summary').focus(); });
      selected.append(remove);
    }
    if (!wide.matches && tag) tagDetails.querySelector('summary').textContent = 'Tags (1)';
    else tagDetails.querySelector('summary').textContent = 'Tags';
  }
  input.addEventListener('input', () => {
    query = input.value; render(); clearTimeout(historyTimer); historyTimer = setTimeout(writeURL, 300);
  });
  form.addEventListener('submit', event => { event.preventDefault(); query = input.value; writeURL(); render(); });
  document.querySelector('[data-clear-filters]').addEventListener('click', () => {
    query = ''; tag = ''; input.value = ''; writeURL(); render(); input.focus();
  });
  window.addEventListener('popstate', readURL);
  window.addEventListener('pagehide', writeURL);
  buildTags(); readURL();
  if (new URLSearchParams(location.search).get('search') === '1') input.focus();
  fetch('/blog/search-index.json').then(response => {
    if (!response.ok) throw new Error('Search index unavailable');
    return response.json();
  }).then(data => {
    if (!Array.isArray(data) || data.length !== cards.length || data.some(post => typeof post.content !== 'string' || !Array.isArray(post.tags))) throw new Error('Invalid search index');
    posts = data; fullTextReady = true; buildTags(); render();
  }).catch(() => {
    error.hidden = false;
    error.textContent = 'Full-text search is unavailable. You can still search titles and summaries.';
    render();
  });
});

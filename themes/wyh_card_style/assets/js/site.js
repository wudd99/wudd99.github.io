document.addEventListener('DOMContentLoaded', function() {
      var hamburger = document.getElementById('retainedMenu') || document.getElementById('hamburger');
      var mobileMenu = document.getElementById('mobileMenu');
      var closeMenu = document.getElementById('closeMenu');
      var desktopToggle = document.getElementById('mode-toggle');
      var mobileToggle = document.getElementById('mobile-mode-toggle-checkbox');

      function applyRemarkTagColors() {
        document.querySelectorAll('[data-remark-color]').forEach(function(tag) {
          var color = (tag.getAttribute('data-remark-color') || '').trim();
          if (!color || !/^[#a-zA-Z0-9(),.%\s-]+$/.test(color)) return;
          tag.style.setProperty('--tag-custom-bg', color);
        });
      }

      applyRemarkTagColors();


      function initSidebarScrolling() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar || !window.matchMedia) return;

        var desktop = window.matchMedia('(min-width: 768px)');
        var hideTimer = null;
        var resizeFrame = null;
        var draggingScrollbar = false;

        function hideScrollbar() {
          window.clearTimeout(hideTimer);
          sidebar.classList.remove('is-scrolling');
        }

        function scheduleHide() {
          window.clearTimeout(hideTimer);
          if (!draggingScrollbar) {
            hideTimer = window.setTimeout(hideScrollbar, 800);
          }
        }

        function updateOverflow() {
          resizeFrame = null;
          var scrollbarWidth = desktop.matches ? sidebar.offsetWidth - sidebar.clientWidth : 0;
          sidebar.style.setProperty('--sidebar-scrollbar-width', scrollbarWidth + 'px');
          var overflowing = desktop.matches && sidebar.scrollHeight > sidebar.clientHeight + 1;
          sidebar.classList.toggle('has-overflow', overflowing);
          if (overflowing) {
            sidebar.setAttribute('tabindex', '0');
          } else {
            sidebar.removeAttribute('tabindex');
            draggingScrollbar = false;
            hideScrollbar();
          }
        }

        function requestOverflowUpdate() {
          if (resizeFrame === null) {
            resizeFrame = window.requestAnimationFrame(updateOverflow);
          }
        }

        sidebar.addEventListener('scroll', function() {
          if (!desktop.matches || !sidebar.classList.contains('has-overflow')) return;
          sidebar.classList.add('is-scrolling');
          scheduleHide();
        }, { passive: true });

        sidebar.addEventListener('pointerdown', function(event) {
          if (!sidebar.classList.contains('has-overflow')) return;
          var rect = sidebar.getBoundingClientRect();
          if (event.clientX >= rect.left + sidebar.clientLeft + sidebar.clientWidth) {
            draggingScrollbar = true;
            window.clearTimeout(hideTimer);
          }
        }, { passive: true });

        function finishDrag() {
          if (!draggingScrollbar) return;
          draggingScrollbar = false;
          scheduleHide();
        }

        document.addEventListener('pointerup', finishDrag, { passive: true });
        document.addEventListener('pointercancel', finishDrag, { passive: true });
        window.addEventListener('blur', finishDrag);
        window.addEventListener('resize', requestOverflowUpdate, { passive: true });
        sidebar.addEventListener('load', requestOverflowUpdate, true);
        if (desktop.addEventListener) {
          desktop.addEventListener('change', requestOverflowUpdate);
        } else {
          desktop.addListener(requestOverflowUpdate);
        }
        if (window.ResizeObserver) {
          var observer = new ResizeObserver(requestOverflowUpdate);
          observer.observe(sidebar);
          Array.prototype.forEach.call(sidebar.children, function(child) {
            observer.observe(child);
          });
        }
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(requestOverflowUpdate);
        }
        updateOverflow();
      }

      initSidebarScrolling();

      function getProfilePhoto() {
        return document.getElementById('profilePhoto');
      }

      function setProfilePhotoForMode(isDarkMode) {
        var profilePhoto = getProfilePhoto();
        if (!profilePhoto) return;
        var nextSrc = isDarkMode ? profilePhoto.dataset.darkSrc : profilePhoto.dataset.lightSrc;
        if (nextSrc && profilePhoto.getAttribute('src') !== nextSrc) {
          profilePhoto.setAttribute('src', nextSrc);
        }
      }

      var darkModeEnabled = document.documentElement.classList.contains('dark-mode');
      document.documentElement.classList.toggle('dark-mode', darkModeEnabled);
      document.documentElement.dataset.theme = darkModeEnabled ? 'dark' : 'light';
      document.body.classList.toggle('dark-mode', darkModeEnabled);
      if (desktopToggle) desktopToggle.checked = darkModeEnabled;
      if (mobileToggle) mobileToggle.checked = darkModeEnabled;
      setProfilePhotoForMode(darkModeEnabled);

      if (hamburger && mobileMenu) {
        var menuOpen = false;
        var menuBackdrop = document.getElementById('mobileMenuBackdrop');

        function setMobileMenu(open) {
          menuOpen = open;
          mobileMenu.classList.toggle('open', open);
          document.body.classList.toggle('mobile-menu-open', open);
          hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
          hamburger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        }

        hamburger.setAttribute('aria-controls', 'mobileMenu');
        hamburger.setAttribute('aria-expanded', 'false');

        hamburger.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          setMobileMenu(!menuOpen);
        }, false);

        if (closeMenu) {
          closeMenu.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            setMobileMenu(false);
          }, false);

          closeMenu.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMobileMenu(false);
            }
          }, false);
        }

        if (menuBackdrop) {
          menuBackdrop.addEventListener('click', function() {
            setMobileMenu(false);
          }, false);
        }

        mobileMenu.addEventListener('click', function(event) {
          if (event.target.closest('a[href]')) setMobileMenu(false);
        });

        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && menuOpen) setMobileMenu(false);
        }, false);
      }



      function initDarkModeCursorSpotlight() {
        var spotlight = document.querySelector('.cursor-spotlight');
        if (!spotlight || !window.matchMedia || !window.requestAnimationFrame) return;

        var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        var raf = null;
        var x = window.innerWidth / 2;
        var y = window.innerHeight / 2;

        function canShowSpotlight() {
          return !document.hidden && document.documentElement.classList.contains('dark-mode') && finePointer.matches && !reduceMotion.matches;
        }

        function paintSpotlight() {
          raf = null;
          spotlight.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
        }

        function hideSpotlight() {
          if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; }
          document.body.classList.remove('cursor-spotlight-active');
        }

        document.addEventListener('pointermove', function(e) {
          if (!canShowSpotlight()) return;
          x = e.clientX;
          y = e.clientY;
          document.body.classList.add('cursor-spotlight-active');
          if (!raf) raf = window.requestAnimationFrame(paintSpotlight);
        }, { passive: true });

        document.addEventListener('visibilitychange', hideSpotlight);
        document.addEventListener('mouseleave', hideSpotlight, false);
        window.addEventListener('blur', hideSpotlight, false);
        window.addEventListener('scroll', hideSpotlight, { passive: true });

        [finePointer, reduceMotion].forEach(function(query) {
          var onChange = function() {
            if (!canShowSpotlight()) hideSpotlight();
          };
          if (query.addEventListener) {
            query.addEventListener('change', onChange);
          } else if (query.addListener) {
            query.addListener(onChange);
          }
        });
      }

      initDarkModeCursorSpotlight();

      var themeFrame = 0;
      function toggleDarkMode(e) {
        var nextDarkMode = e.target.checked;
        if (themeFrame) window.cancelAnimationFrame(themeFrame);
        // Suppress transitions through the first rendered frame of the new theme,
        // then restore ordinary hover/press feedback. Rapid toggles share this frame.
        document.documentElement.classList.add('theme-instant');
        document.documentElement.classList.toggle('dark-mode', nextDarkMode);
        document.documentElement.dataset.theme = nextDarkMode ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode', nextDarkMode);
        try { localStorage.setItem('dark-mode', nextDarkMode ? 'true' : 'false'); } catch (e) {}
        if (desktopToggle) desktopToggle.checked = nextDarkMode;
        if (mobileToggle) mobileToggle.checked = nextDarkMode;
        setProfilePhotoForMode(nextDarkMode);
        themeFrame = window.requestAnimationFrame(function() {
          themeFrame = window.requestAnimationFrame(function() {
            document.documentElement.classList.remove('theme-instant');
            themeFrame = 0;
          });
        });
      }

      if (desktopToggle) {
        desktopToggle.addEventListener('change', toggleDarkMode, false);
      }
      if (mobileToggle) {
        mobileToggle.addEventListener('change', toggleDarkMode, false);
      }


      function bindTactilePressFeedback() {
        // Liquid glass owns its complete gesture lifecycle; do not add a second press state.
        if (typeof window.WYH_GLASS_SURFACE_FOR === 'function') return;
        var pressed = new Map();
        var releases = new Map();

        function targetsFor(eventTarget) {
          if (typeof window.WYH_GLASS_SURFACE_FOR === 'function') {
            var surface = window.WYH_GLASS_SURFACE_FOR(eventTarget);
            return surface ? [surface] : [];
          }
          if (!(eventTarget instanceof Element)) return [];
          var target = eventTarget.closest('a[href],button,input,label.switch,[role="button"],.clickable-card[tabindex]');
          return target && !target.matches('[disabled],[aria-disabled="true"]') ? [target] : [];
        }

        function begin(target) {
          window.clearTimeout(releases.get(target));
          releases.delete(target);
          if (!pressed.has(target)) pressed.set(target, performance.now());
          target.classList.add('press-active');
        }

        function clearOne(target, immediate) {
          if (!pressed.has(target) && !releases.has(target)) return;
          var started = pressed.get(target);
          pressed.delete(target);
          window.clearTimeout(releases.get(target));
          // Give even a quick click enough time to show the inset surface.
          var delay = immediate ? 0 : Math.max(70, 160 - (performance.now() - (started || 0)));
          if (!delay) {
            target.classList.remove('press-active');
            releases.delete(target);
            return;
          }
          var timer = window.setTimeout(function() {
            if (releases.get(target) !== timer) return;
            target.classList.remove('press-active');
            releases.delete(target);
          }, delay);
          releases.set(target, timer);
        }

        function clearAll(immediate) {
          var targets = Array.from(pressed.keys());
          if (immediate) targets = targets.concat(Array.from(releases.keys()));
          targets.forEach(function(target) { clearOne(target, immediate); });
        }

        document.addEventListener('pointerdown', function(e) {
          if ((e.button !== undefined && e.button !== 0) || e.isPrimary === false) return;
          targetsFor(e.target).forEach(begin);
        }, { passive: true });

        document.addEventListener('pointermove', function(e) {
          if (!pressed.size) return;
          var hit = document.elementFromPoint(e.clientX, e.clientY);
          Array.from(pressed.keys()).forEach(function(target) {
            if (!hit || !target.contains(hit)) clearOne(target, true);
          });
        }, { passive: true });

        document.addEventListener('pointerup', function() { clearAll(false); }, { passive: true });
        ['pointercancel', 'dragstart'].forEach(function(type) {
          document.addEventListener(type, function() { clearAll(true); }, { passive: true });
        });
        window.addEventListener('blur', function() { clearAll(false); }, { passive: true });
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) clearAll(false);
        });
        document.addEventListener('scroll', function() { clearAll(true); }, true);
        document.addEventListener('keydown', function(e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          // Apply keyboard feedback only to genuine, focused interactive elements.
          var target = e.target;
          if (!(target instanceof Element) || !target.matches('a[href], button, .clickable-card[tabindex]')) return;
          targetsFor(target).forEach(begin);
        }, true);
        document.addEventListener('keyup', function(e) {
          if (e.key === 'Enter' || e.key === ' ') clearAll(false);
        }, true);
      }

      bindTactilePressFeedback();


      function uniqueNonEmpty(values) {
        return Array.from(new Set(values.filter(Boolean)));
      }

      function pickYearFromText(text) {
        var matches = text && text.match(/20\d{2}/g);
        return matches ? matches[0] : '';
      }

      function sanitizeLabel(value) {
        return (value || '').replace(/\s+/g, ' ').trim();
      }

      function splitTopicList(value) {
        return sanitizeLabel(value)
          .split(/[|,;，、/]+/)
          .map(function(item) { return sanitizeLabel(item); })
          .filter(Boolean);
      }

      function normalizePubType(value) {
        var type = sanitizeLabel(value).toLowerCase();

        if (['journal', 'journals', 'j'].indexOf(type) >= 0) {
          return 'journal';
        }

        if (['conference', 'conferences', 'conf', 'symposium', 'workshop'].indexOf(type) >= 0) {
          return 'conference';
        }

        return 'other';
      }

      function labelForPubType(type) {
        if (type === 'journal') return 'Journal';
        if (type === 'conference') return 'Conference';
        return 'Other';
      }

      function iconForPubType(type) {
        if (type === 'journal' || type === 'conference') {
          return '<span class="publication-type-icon" aria-hidden="true"></span>';
        }
        return '<svg class="ui-icon tabler-icon" data-icon="tabler-layers-intersect" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M8 4m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /> <path d="M4 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /></svg>';
      }

      function escapeHTML(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function collectPublicationMeta(card) {
        var title = sanitizeLabel((card.querySelector('h3') || {}).textContent || '');
        var source = sanitizeLabel(card.dataset.pubSource || (card.querySelector('.pub-tag.source') || {}).textContent || '');
        var type = normalizePubType(card.dataset.pubType || '');
        var typeLabel = labelForPubType(type);
        var topics = uniqueNonEmpty(splitTopicList(card.dataset.pubTopics || card.dataset.pubTopic || 'Research'));

        if (!topics.length) {
          topics = ['Research'];
        }

        return {
          title: title,
          source: source,
          type: type,
          typeLabel: typeLabel,
          topics: topics
        };
      }

      function ensurePublicationTypePill(card, meta) {
        if (!card || !meta) return;

        var holder = card.querySelector('.pub-card-meta');
        if (!holder) {
          holder = document.createElement('div');
          holder.className = 'pub-card-meta';

          var titleNode = card.querySelector('h3');
          if (titleNode) {
            card.insertBefore(holder, titleNode);
          } else {
            card.insertBefore(holder, card.firstChild);
          }
        }

        var pill = holder.querySelector('.publication-type-pill');
        if (!pill) {
          pill = document.createElement('span');
          holder.insertBefore(pill, holder.firstChild);
        }
        pill.className = 'meta-pill publication-type-pill type-' + meta.type;
        pill.innerHTML =
          '<span>' + escapeHTML(meta.typeLabel) + '</span>' +
          iconForPubType(meta.type);
      }

      function resolveSectionAndGrid(id, gridClass) {
        var anchor = document.getElementById(id);
        if (!anchor) return { anchor: null, root: null, grid: null };

        var grid = null;
        if (anchor.classList && anchor.classList.contains(gridClass)) {
          grid = anchor;
        } else {
          grid = anchor.querySelector('.' + gridClass) ||
                 document.querySelector('#' + id + ' .' + gridClass) ||
                 document.querySelector('.' + gridClass);
        }

        var root = null;
        if (grid) {
          root = grid.closest('.publications-section, .poster-section, section') || anchor.closest('section') || anchor.parentElement || anchor;
        } else {
          root = anchor.closest('section') || anchor.parentElement || anchor;
        }

        return { anchor: anchor, root: root, grid: grid };
      }

      function buildPublicationFilters() {
        var publicationRefs = resolveSectionAndGrid('publications', 'publication-grid');
        var publicationsAnchor = publicationRefs.anchor;
        var publicationsRoot = publicationRefs.root;
        var grid = publicationRefs.grid;

        if (!publicationsAnchor || !grid || !grid.parentNode) return [];
        if (
          (publicationsRoot && publicationsRoot.querySelector('.pub-filter-shell')) ||
          (publicationsAnchor && publicationsAnchor.querySelector && publicationsAnchor.querySelector('.pub-filter-shell'))
        ) {
          return [];
        }

        var cards = Array.prototype.slice.call(grid.querySelectorAll('.publication-card'));
        if (!cards.length) return [];

        var metas = cards.map(function(card) {
          var meta = collectPublicationMeta(card);

          ensurePublicationTypePill(card, meta);

          card.dataset.pubType = meta.type;
          card.dataset.pubTypeLabel = meta.typeLabel;
          card.dataset.pubTopics = meta.topics.join('|');
          card.dataset.pubSource = meta.source || '';

          return meta;
        });

        var typeOrder = ['journal', 'conference', 'other'];
        var presentTypes = typeOrder.filter(function(type) {
          return metas.some(function(meta) {
            return meta.type === type;
          });
        }).map(function(type) {
          return {
            value: type,
            label: labelForPubType(type)
          };
        });

        var topics = uniqueNonEmpty(
          metas.reduce(function(list, meta) {
            return list.concat(meta.topics);
          }, [])
        ).map(function(topic) {
          return {
            value: topic,
            label: topic
          };
        });

        var shell = document.createElement('div');
        shell.className = 'pub-filter-shell home-publication-tools';
        shell.id = 'publication-tools';
        shell.setAttribute('aria-label', 'Search and filter publications');
        shell.innerHTML = '<form class="post-search publication-search" role="search">' +
          '<label class="visually-hidden" for="publication-query">Search publications</label>' +
          '<div class="search-field"><svg class="ui-icon tabler-icon" data-icon="tabler-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /> <path d="M21 21l-6 -6" /></svg>' +
          '<input id="publication-query" type="search" placeholder="Search papers…" aria-controls="publication-results" aria-describedby="publication-search-help"></div>' +
          '<p class="search-help visually-hidden" id="publication-search-help">Titles, authors &amp; venues</p></form>';
        grid.id = 'publication-results';

        var state = {
          type: '',
          topic: '',
          query: ''
        };

        function makeGroup(name, options, allLabel) {
          if (!options.length) return null;

          var group = document.createElement('div');
          group.className = 'pub-filter-group';
          group.setAttribute('role', 'group');
          group.setAttribute('aria-label', name === 'type' ? 'Publication type' : 'Research topic');
          var groupLabel = document.createElement('h3');
          groupLabel.className = 'pub-filter-group-label rail-block-heading';
          groupLabel.innerHTML = name === 'type' ? '<svg class="ui-icon tabler-icon rail-heading-icon" data-icon="tabler-category-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M14 4h6v6h-6z" /> <path d="M4 14h6v6h-6z" /> <path d="M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /> <path d="M7 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg><span class="rail-heading-title">Publication type</span>' : '<svg class="ui-icon tabler-icon rail-heading-icon" data-icon="tabler-atom-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /> <path d="M12 21l0 .01" /> <path d="M3 9l0 .01" /> <path d="M21 9l0 .01" /> <path d="M8 20.1a9 9 0 0 1 -5 -7.1" /> <path d="M16 20.1a9 9 0 0 0 5 -7.1" /> <path d="M6.2 5a9 9 0 0 1 11.4 0" /></svg><span class="rail-heading-title">Research topic</span>';
          group.appendChild(groupLabel);

          var allChip = document.createElement('button');
          allChip.type = 'button';
          allChip.className = 'pub-filter-chip active';
          allChip.textContent = allLabel;
          allChip.dataset.filterType = name;
          allChip.dataset.filterValue = '';
          allChip.setAttribute('aria-controls', 'publication-results');
          group.appendChild(allChip);

          options.forEach(function(option) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'pub-filter-chip';
            chip.textContent = option.label;
            chip.dataset.filterType = name;
            chip.dataset.filterValue = option.value;
            chip.setAttribute('aria-controls', 'publication-results');
            group.appendChild(chip);
          });

          return group;
        }

        [
          makeGroup('type', presentTypes, 'All types'),
          makeGroup('topic', topics, 'All topics')
        ].filter(Boolean).forEach(function(group) {
          shell.appendChild(group);
        });

        var resultStatus = document.createElement('p');
        resultStatus.className = 'publication-filter-status';
        resultStatus.setAttribute('role', 'status');
        resultStatus.setAttribute('aria-live', 'polite');
        var summary = document.createElement('section');
        summary.className = 'publication-summary';
        summary.setAttribute('aria-label', 'Filter results');
        summary.innerHTML = '<h3 class="rail-block-heading rail-summary-heading"><svg class="ui-icon tabler-icon rail-heading-icon" data-icon="tabler-list-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/> <path d="M3.5 5.5l1.5 1.5l2.5 -2.5" /> <path d="M3.5 11.5l1.5 1.5l2.5 -2.5" /> <path d="M3.5 17.5l1.5 1.5l2.5 -2.5" /> <path d="M11 6l9 0" /> <path d="M11 12l9 0" /> <path d="M11 18l9 0" /></svg><span class="rail-heading-title">Results</span></h3>';
        summary.appendChild(resultStatus);
        shell.appendChild(summary);
        var actions = document.createElement('div');
        actions.className = 'publication-tool-actions';
        actions.innerHTML = '<a href="#publications">View results ↓</a><button type="button" class="text-button" data-publication-clear>Clear filters</button>';
        summary.appendChild(actions);
        var empty = document.createElement('div');
        empty.className = 'publication-empty utility-panel';
        empty.hidden = true;
        empty.innerHTML = '<h3>No publications found</h3><p>Try another title, author or venue, or clear your filters.</p><button type="button" class="text-button" data-publication-clear>Clear filters</button>';
        grid.parentNode.insertBefore(empty, grid);

        function refreshFilterUI() {
          shell.querySelectorAll('.pub-filter-chip').forEach(function(chip) {
            var type = chip.dataset.filterType;
            var value = chip.dataset.filterValue;
            chip.classList.toggle('active', state[type] === value);
            chip.setAttribute('aria-pressed', String(state[type] === value));
          });
        }

        function normalizeSearch(value) {
          return String(value || '').normalize('NFKC').toLocaleLowerCase();
        }
        var searchTexts = cards.map(function(card, index) {
          return normalizeSearch(card.textContent + ' ' + metas[index].source + ' ' + metas[index].topics.join(' '));
        });
        function applyFilters() {
          var words = normalizeSearch(state.query).trim().split(/\s+/).filter(Boolean);
          var visible = 0;
          cards.forEach(function(card, index) {
            var cardTopics = (card.dataset.pubTopics || '').split('|').filter(Boolean);

            var matchType = !state.type || card.dataset.pubType === state.type;
            var matchTopic = !state.topic || cardTopics.indexOf(state.topic) >= 0;
            var matchQuery = words.every(function(word) { return searchTexts[index].indexOf(word) >= 0; });
            var matches = matchType && matchTopic && matchQuery;
            card.classList.toggle('is-filtered-out', !matches);
            card.hidden = !matches;
            if (matches) visible += 1;
          });
          resultStatus.textContent = visible + ' of ' + cards.length + ' publications';
          empty.hidden = visible !== 0;
        }

        var searchInput = shell.querySelector('#publication-query');
        searchInput.addEventListener('input', function() {
          state.query = searchInput.value;
          applyFilters();
        });
        shell.querySelector('form').addEventListener('submit', function(e) {
          e.preventDefault();
          state.query = searchInput.value;
          applyFilters();
          document.getElementById('publications').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
        [shell, empty].forEach(function(container) {
          container.querySelector('[data-publication-clear]').addEventListener('click', function() {
            state.type = ''; state.topic = ''; state.query = '';
            searchInput.value = '';
            refreshFilterUI(); applyFilters(); searchInput.focus({ preventScroll: true });
          });
        });

        shell.addEventListener('click', function(e) {
          var chip = e.target.closest('.pub-filter-chip');
          if (!chip) return;

          var type = chip.dataset.filterType;
          var value = chip.dataset.filterValue;

          state[type] = value;

          refreshFilterUI();
          applyFilters();
        });

        grid.parentNode.insertBefore(shell, grid);
        refreshFilterUI();
        applyFilters();

        return metas;
      }

      var configuredTimelineItems = (window.WYH_SITE_DATA && Array.isArray(window.WYH_SITE_DATA.timelineItems)) ? window.WYH_SITE_DATA.timelineItems : [];

      function buildResearchTimeline(pubMetas) {
        var publicationRefs = resolveSectionAndGrid('publications', 'publication-grid');
        var publicationsRoot = publicationRefs.root;
        if (!publicationsRoot || !publicationsRoot.parentNode) return;
        if (document.getElementById('research-timeline')) return;

        var fallbackItems = [
          {
            year: '2023',
            title: 'Foundation',
            description: 'Built core experience in IC design, chip testing, and hardware prototyping.',
            tags: ['IC Design', 'Testing']
          },
          {
            year: '2024',
            title: 'Computational Hardware',
            description: 'Moved toward hardware for optimization, inference, and non-von-Neumann computing.',
            tags: ['Computing', 'Hardware']
          },
          {
            year: '2025',
            title: 'Dense Connectivity',
            description: 'Developed more connected Ising hardware systems for practical problem mapping.',
            tags: ['m-Zephyr', 'VLSI']
          },
          {
            year: 'Current',
            title: 'Beyond Ising',
            description: 'Exploring beyond-Ising computing fabrics, including Potts systems and sensor-compute integration.',
            tags: ['Potts', 'Sensing'],
            current: true
          }
        ];

        function escapeHTML(value) {
          return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function normalizeTags(tags) {
          if (!tags) return [];
          if (Array.isArray(tags)) return tags.map(function(tag) { return String(tag || '').trim(); }).filter(Boolean);
          return String(tags).split(',').map(function(tag) { return tag.trim(); }).filter(Boolean);
        }

        var sourceItems = Array.isArray(configuredTimelineItems) && configuredTimelineItems.length
          ? configuredTimelineItems
          : fallbackItems;

        var items = sourceItems.map(function(item, index) {
          return {
            year: item.year || item.phase || item.date || ('Step ' + (index + 1)),
            title: item.title || item.name || 'Research milestone',
            description: item.description || item.summary || item.content || '',
            tags: normalizeTags(item.tags || item.tag),
            current: item.current === true || item.current === 'true'
          };
        }).filter(function(item) {
          return item.year || item.title || item.description;
        });

        if (!items.length) return;

        var activeIndex = items.findIndex(function(item) { return item.current; });
        if (activeIndex < 0) activeIndex = items.length - 1;

        var section = document.createElement('section');
        section.id = 'research-timeline';
        section.className = 'research-timeline markers-only timeline-md-driven';

        var markerHTML = items.map(function(item, index) {
          var markerStart = 8;
          var markerEnd = 80;
          var left = items.length === 1 ? markerEnd : markerStart + (index * ((markerEnd - markerStart) / (items.length - 1)));
          var isActive = index === activeIndex;
          var isCurrent = item.current;
          return '<button type="button" class="timeline-marker' + (isCurrent ? ' current' : '') + (isActive ? ' active' : '') + '" style="left:' + left + '%;" data-timeline-index="' + index + '" aria-label="Show ' + escapeHTML(item.year) + ' timeline details" aria-pressed="' + (isActive ? 'true' : 'false') + '">' +
                   '<span class="timeline-marker-label">' + escapeHTML(item.year) + '</span>' +
                   '<span class="timeline-marker-dot" aria-hidden="true"></span>' +
                 '</button>';
        }).join('');

        var detailHTML = items.map(function(item, index) {
          var chips = item.tags.map(function(tag) {
            return '<span class="timeline-chip">' + escapeHTML(tag) + '</span>';
          }).join('');
          return '<div class="timeline-item' + (index === activeIndex ? ' active' : '') + '" data-timeline-detail="' + index + '">' +
                   '<div class="timeline-year">' + escapeHTML(item.year) + '</div>' +
                   '<div class="timeline-card">' +
                     '<strong>' + escapeHTML(item.title) + '</strong>' +
                     (item.description ? '<p>' + escapeHTML(item.description) + '</p>' : '') +
                     (chips ? '<div class="timeline-meta">' + chips + '</div>' : '') +
                   '</div>' +
                 '</div>';
        }).join('');

        section.innerHTML =
          '<div class="research-timeline-header">' +
            '<div><h3>Research timeline</h3></div>' +
          '</div>' +
          '<div class="timeline-track"><div class="timeline-marker-bar" aria-label="Research timeline milestones">' + markerHTML + '</div>' + detailHTML + '</div>';

        publicationsRoot.parentNode.insertBefore(section, publicationsRoot);

        var markers = Array.prototype.slice.call(section.querySelectorAll('.timeline-marker'));
        var details = Array.prototype.slice.call(section.querySelectorAll('.timeline-item'));

        function setActiveTimeline(index) {
          markers.forEach(function(marker, markerIndex) {
            var active = markerIndex === index;
            marker.classList.toggle('active', active);
            marker.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          details.forEach(function(detail, detailIndex) {
            detail.classList.toggle('active', detailIndex === index);
          });
        }

        markers.forEach(function(marker) {
          var index = parseInt(marker.dataset.timelineIndex, 10);
          marker.addEventListener('mouseenter', function() { setActiveTimeline(index); });
          marker.addEventListener('focus', function() { setActiveTimeline(index); });
          marker.addEventListener('click', function() { setActiveTimeline(index); });
          marker.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTimeline(index);
            }
          });
        });
      }

      var publicationMetas = buildPublicationFilters();
      buildResearchTimeline(publicationMetas);

      // Page navigation and in-page section navigation have independent current states.
      var allNavLinks = Array.prototype.slice.call(document.querySelectorAll('.sidebar > .nav a, .mobile-menu > ul a'));

      function normalizePath(path) {
        if (!path) return '/';
        var cleaned = path.replace(/\/+$/, '');
        return cleaned === '' ? '/' : cleaned;
      }

      function setActiveLinks(targetHref) {
        allNavLinks.forEach(function(link) {
          var href = link.getAttribute('href');
          var isActive = href === targetHref;
          link.classList.toggle('active', isActive);
          if (isActive) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }

      allNavLinks.forEach(function(link) {
        if (link.getAttribute('href') !== '/') return;
        link.addEventListener('click', function(e) {
          if (normalizePath(window.location.pathname) !== '/') return;
          e.preventDefault();
          if (mobileMenu) mobileMenu.classList.remove('open');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveLinks('/');
        }, false);
      });

      setActiveLinks(normalizePath(window.location.pathname).indexOf('/blog') === 0 ? '/blog/' : '/');

    });

    (function initNaturalMeteorAmbience() {
      var layer = document.querySelector('.meteor-layer');
      if (!layer || typeof layer.animate !== 'function') return;

      var reduceMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

      var scheduleTimer = null;
      var activeMeteors = new Set();
      var stopped = false;

      function random(min, max) {
        return min + Math.random() * (max - min);
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function viewport() {
        var doc = document.documentElement;
        return {
          width: window.innerWidth || doc.clientWidth || 1280,
          height: window.innerHeight || doc.clientHeight || 720
        };
      }

      function nextDelay() {
        var vp = viewport();
        var pairedMeteor = Math.random() < 0.16;
        if (pairedMeteor) return random(650, 1600);
        return vp.width < 768 ? random(5600, 11200) : random(3000, 8200);
      }

      function scheduleNext(delay) {
        if (stopped || document.hidden) return;
        window.clearTimeout(scheduleTimer);
        scheduleTimer = window.setTimeout(function() {
          scheduleTimer = null;
          spawnMeteor();
          scheduleNext(nextDelay());
        }, delay);
      }

      function spawnMeteor() {
        if (stopped || document.hidden) return;

        var vp = viewport();
        var maxActive = vp.width < 768 ? 1 : 3;
        if (activeMeteors.size >= maxActive) return;

        var meteor = document.createElement('span');
        meteor.className = 'meteor';

        var fromTopEdge = Math.random() < 0.58;
        var startX = fromTopEdge ? random(vp.width * 0.38, vp.width * 1.08) : random(vp.width * 0.78, vp.width * 1.12);
        var startY = fromTopEdge ? random(-vp.height * 0.08, vp.height * 0.20) : random(vp.height * 0.04, vp.height * 0.52);

        var angle = random(-40, -30);
        var radians = angle * Math.PI / 180;
        var distance = Math.hypot(vp.width, vp.height) * random(0.16, 0.28);
        var moveX = -Math.cos(radians) * distance;
        var moveY = -Math.sin(radians) * distance;

        var driftAmount = random(-9, 9);
        var perpX = -moveY / distance;
        var perpY = moveX / distance;

        var duration = random(1450, 2450);
        var length = random(vp.width < 768 ? 58 : 74, vp.width < 768 ? 104 : 136);
        var thickness = random(1.05, 1.65);
        var headSize = random(2.8, 4.2);
        var darkMode = document.body.classList.contains('dark-mode');
        var maxOpacity = darkMode ? random(0.36, 0.62) : random(0.18, 0.36);
        var blur = Math.random() < 0.48 ? random(0.18, 0.58) : 0;

        meteor.style.setProperty('--meteor-start-x', startX.toFixed(1) + 'px');
        meteor.style.setProperty('--meteor-start-y', startY.toFixed(1) + 'px');
        meteor.style.setProperty('--meteor-length', length.toFixed(1) + 'px');
        meteor.style.setProperty('--meteor-thickness', thickness.toFixed(2) + 'px');
        meteor.style.setProperty('--meteor-head-size', headSize.toFixed(1) + 'px');
        meteor.style.setProperty('--meteor-angle', angle.toFixed(1) + 'deg');
        meteor.style.setProperty('--meteor-blur', blur.toFixed(2) + 'px');

        layer.appendChild(meteor);

        // Sample the existing curved trajectory once; animate only compositor
        // properties instead of changing four inherited CSS variables per frame.
        var keyframes = [];
        for (var step = 0; step <= 24; step++) {
          var t = step / 24 * 0.82;
          var progress = 0.60 * t - 0.7317073171 * t * t + 1.1461629982 * t * t * t;
          var drift = Math.sin(t * Math.PI) * driftAmount;
          var x = moveX * progress + perpX * drift;
          var y = moveY * progress + perpY * drift;
          var fadeIn = clamp(t / 0.12, 0, 1);
          var fadeOut = clamp((0.74 - t) / 0.34, 0, 1);
          var opacity = maxOpacity * Math.min(fadeIn, fadeOut) * (0.985 + 0.015 * Math.sin(t * Math.PI * 1.6));
          var scale = 0.28 + 0.58 * clamp(t / 0.30, 0, 1) - 0.14 * clamp((t - 0.56) / 0.28, 0, 1);
          keyframes.push({
            transform: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + angle.toFixed(1) + 'deg) scaleX(' + scale.toFixed(3) + ')',
            opacity: opacity,
            offset: step / 24
          });
        }
        var animation = meteor.animate(keyframes, {duration: duration * 0.82, easing: 'linear'});
        activeMeteors.add(animation);
        function cleanup() {
          animation.onfinish = animation.oncancel = null;
          activeMeteors.delete(animation);
          meteor.remove();
          animation.cancel();
        }
        animation.onfinish = animation.oncancel = cleanup;
      }

      function startMeteors() {
        if (document.hidden || scheduleTimer || (reduceMotionQuery && reduceMotionQuery.matches)) return;
        stopped = false;
        scheduleNext(random(700, 2200));
      }

      function stopMeteors() {
        stopped = true;
        window.clearTimeout(scheduleTimer);
        scheduleTimer = null;
        // Cancel synchronously, including detached nodes and retained keyframes.
        activeMeteors.forEach(function(animation) {
          var cleanup = animation.oncancel;
          if (cleanup) cleanup();
        });
        activeMeteors.clear();
      }

      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          stopMeteors();
        } else {
          startMeteors();
        }
      });

      if (reduceMotionQuery) {
        var handleMotionPreferenceChange = function(e) {
          if (e.matches) {
            stopMeteors();
          } else {
            stopped = false;
            startMeteors();
          }
        };

        if (reduceMotionQuery.addEventListener) {
          reduceMotionQuery.addEventListener('change', handleMotionPreferenceChange);
        } else if (reduceMotionQuery.addListener) {
          reduceMotionQuery.addListener(handleMotionPreferenceChange);
        }
      }

      window.addEventListener('pagehide', stopMeteors);
      window.addEventListener('pageshow', startMeteors);
      startMeteors();
    })();

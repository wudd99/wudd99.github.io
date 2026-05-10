document.addEventListener('DOMContentLoaded', function() {
      var hamburger = document.getElementById('hamburger');
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


      function placeDesktopToggleInTitleRow() {
        var toggleShell = desktopToggle ? desktopToggle.closest('.mode-toggle') : null;
        if (!toggleShell) return;

        function markToggleReady() {
          toggleShell.classList.add('mode-toggle-ready');
        }

        var blogPostTopRow = document.querySelector('.content-area .blog-post-top-row');
        if (blogPostTopRow) {
          blogPostTopRow.appendChild(toggleShell);
          markToggleReady();
          return;
        }

        var existingTitleRow = document.querySelector('.content-area .content-title-row');
        if (existingTitleRow) {
          if (!existingTitleRow.contains(toggleShell)) {
            existingTitleRow.appendChild(toggleShell);
          }
          markToggleReady();
          return;
        }

        var targetTitle = null;
        var titleParent = null;
        var ariaLabel = 'Page title and display mode';

        var aboutSection = document.getElementById('about');
        if (aboutSection) {
          targetTitle = aboutSection.querySelector('h2');
          titleParent = aboutSection;
          ariaLabel = 'Welcome and display mode';
        }

        if (!targetTitle) {
          targetTitle = document.querySelector('.content-area .blog-list > h2');
          titleParent = targetTitle ? targetTitle.parentElement : null;
          ariaLabel = 'Blog title and display mode';
        }

        if (!targetTitle) {
          targetTitle = document.querySelector('.content-area .post-header > h1');
          titleParent = targetTitle ? targetTitle.parentElement : null;
          ariaLabel = 'Post title and display mode';
        }

        if (!targetTitle) {
          targetTitle = document.querySelector('.content-area section > h2, .content-area article h1, .content-area h2, .content-area h1');
          titleParent = targetTitle ? targetTitle.parentElement : null;
        }

        if (!targetTitle || !titleParent) {
          toggleShell.classList.add('mode-toggle-ready', 'mode-toggle-fallback');
          return;
        }

        var titleRow = document.createElement('div');
        titleRow.className = 'content-title-row';
        titleRow.setAttribute('aria-label', ariaLabel);

        titleParent.insertBefore(titleRow, targetTitle);
        titleRow.appendChild(targetTitle);
        titleRow.appendChild(toggleShell);
        markToggleReady();
      }

      placeDesktopToggleInTitleRow();

      function getProfilePhoto() {
        return document.getElementById('profilePhoto');
      }

      function preloadProfilePhotos() {
        var profilePhoto = getProfilePhoto();
        if (!profilePhoto) return;
        [profilePhoto.dataset.lightSrc, profilePhoto.dataset.darkSrc].forEach(function(src) {
          if (!src) return;
          var img = new Image();
          img.src = src;
        });
      }

      function setProfilePhotoForMode(isDarkMode, animate) {
        var profilePhoto = getProfilePhoto();
        if (!profilePhoto) return;

        var nextSrc = isDarkMode ? profilePhoto.dataset.darkSrc : profilePhoto.dataset.lightSrc;
        if (!nextSrc || profilePhoto.getAttribute('src') === nextSrc) return;

        if (!animate) {
          profilePhoto.setAttribute('src', nextSrc);
          return;
        }

        profilePhoto.classList.add('profile-photo-switching');
        window.setTimeout(function() {
          profilePhoto.setAttribute('src', nextSrc);
          window.setTimeout(function() {
            profilePhoto.classList.remove('profile-photo-switching');
          }, 130);
        }, 100);
      }

      preloadProfilePhotos();

      var darkModeEnabled = localStorage.getItem('dark-mode') === 'true';
      document.documentElement.classList.toggle('dark-mode', darkModeEnabled);
      document.documentElement.dataset.theme = darkModeEnabled ? 'dark' : 'light';
      document.body.classList.toggle('dark-mode', darkModeEnabled);
      if (desktopToggle) desktopToggle.checked = darkModeEnabled;
      if (mobileToggle) mobileToggle.checked = darkModeEnabled;
      setProfilePhotoForMode(darkModeEnabled, false);

      if (hamburger && mobileMenu) {
        var menuOpen = false;
        var menuBackdrop = document.getElementById('mobileMenuBackdrop');

        function setMobileMenu(open) {
          menuOpen = open;
          mobileMenu.classList.toggle('open', open);
          document.body.classList.toggle('mobile-menu-open', open);
          hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
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

        mobileMenu.querySelectorAll('a').forEach(function(link) {
          link.addEventListener('click', function() {
            setMobileMenu(false);
          });
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
          return finePointer.matches && !reduceMotion.matches;
        }

        function paintSpotlight() {
          raf = null;
          var xValue = x + 'px';
          var yValue = y + 'px';
          spotlight.style.setProperty('--spotlight-x', xValue);
          spotlight.style.setProperty('--spotlight-y', yValue);
          document.documentElement.style.setProperty('--spotlight-x', xValue);
          document.documentElement.style.setProperty('--spotlight-y', yValue);
        }

        function hideSpotlight() {
          document.body.classList.remove('cursor-spotlight-active');
        }

        document.addEventListener('pointermove', function(e) {
          if (!canShowSpotlight()) return;
          x = e.clientX;
          y = e.clientY;
          document.body.classList.add('cursor-spotlight-active');
          if (!raf) raf = window.requestAnimationFrame(paintSpotlight);
        }, { passive: true });

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

      function createThemeTransitionOverlay(wasDarkMode) {
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        var oldOverlay = document.querySelector('.theme-transition-overlay');
        if (oldOverlay) oldOverlay.remove();

        var overlay = document.createElement('div');
        overlay.className = 'theme-transition-overlay ' + (wasDarkMode ? 'theme-dark' : 'theme-light');
        overlay.setAttribute('aria-hidden', 'true');

        var meteorLayer = document.querySelector('.meteor-layer');
        if (meteorLayer && meteorLayer.parentNode) {
          meteorLayer.parentNode.insertBefore(overlay, meteorLayer.nextSibling);
        } else {
          document.body.insertBefore(overlay, document.body.firstChild);
        }

        overlay.offsetHeight;
        window.requestAnimationFrame(function() {
          overlay.classList.add('is-fading');
        });

        window.setTimeout(function() {
          if (overlay && overlay.parentNode) overlay.remove();
        }, 720);
      }


      function getThemeSurfaceSelector() {
        return [
          '.profile-card',
          '.publication-card',
          '.poster-card',
          '.blog-card',
          '.blog-post',
          '.post-header',
          '.post-content',
          '.research-timeline',
          '.pub-filter-shell',
          '.timeline-card',
          '.mode-toggle',
          '.mobile-mode-toggle',
          '.mobile-menu'
        ].join(', ');
      }

      function getThemeBorderSelector() {
        return [
          getThemeSurfaceSelector(),
          '.pub-tag',
          '.poster-tag',
          '.blog-meta-pill',
          '.post-meta-chip',
          '.timeline-chip',
          '.timeline-stat',
          '.pub-filter-chip',
          '.pub-card-meta .meta-pill',
          '.profile-card .social-links a',
          '.nav ul li a',
          '.mobile-menu ul li a',
          'section h2',
          '.publications-section h2',
          '.poster-section h2',
          'footer'
        ].join(', ');
      }

      function createSurfaceThemeFades(wasDarkMode) {
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        var surfaces = Array.prototype.slice.call(document.querySelectorAll(getThemeSurfaceSelector()));
        surfaces.forEach(function(surface) {
          surface.querySelectorAll(':scope > .theme-card-fade, :scope > .theme-border-fade').forEach(function(oldFade) {
            oldFade.remove();
          });

          var fade = document.createElement('span');
          fade.className = 'theme-card-fade ' + (wasDarkMode ? 'theme-dark' : 'theme-light');
          fade.setAttribute('aria-hidden', 'true');
          surface.insertBefore(fade, surface.firstChild);

          fade.offsetHeight;
          window.requestAnimationFrame(function() {
            fade.classList.add('is-fading');
          });

          window.setTimeout(function() {
            if (fade && fade.parentNode) fade.remove();
          }, 820);
        });
      }

      function captureThemeBorderStates() {
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return [];

        return Array.prototype.slice.call(document.querySelectorAll(getThemeBorderSelector())).map(function(el) {
          var computed = window.getComputedStyle(el);
          return {
            el: el,
            oldTransition: el.style.transition,
            oldInlineTop: el.style.borderTopColor,
            oldInlineRight: el.style.borderRightColor,
            oldInlineBottom: el.style.borderBottomColor,
            oldInlineLeft: el.style.borderLeftColor,
            oldTop: computed.borderTopColor,
            oldRight: computed.borderRightColor,
            oldBottom: computed.borderBottomColor,
            oldLeft: computed.borderLeftColor
          };
        });
      }

      function animateThemeBorders(borderStates) {
        if (!borderStates || !borderStates.length) return;

        var timing = '720ms cubic-bezier(0.22, 1, 0.36, 1)';
        var transitionValue = [
          'border-top-color ' + timing,
          'border-right-color ' + timing,
          'border-bottom-color ' + timing,
          'border-left-color ' + timing
        ].join(', ');

        var activeStates = [];

        borderStates.forEach(function(state) {
          var el = state.el;
          if (!el || !document.documentElement.contains(el)) return;

          var next = window.getComputedStyle(el);
          var nextTop = next.borderTopColor;
          var nextRight = next.borderRightColor;
          var nextBottom = next.borderBottomColor;
          var nextLeft = next.borderLeftColor;

          var changed = state.oldTop !== nextTop || state.oldRight !== nextRight || state.oldBottom !== nextBottom || state.oldLeft !== nextLeft;
          if (!changed) return;

          state.nextTop = nextTop;
          state.nextRight = nextRight;
          state.nextBottom = nextBottom;
          state.nextLeft = nextLeft;
          activeStates.push(state);

          el.style.transition = 'none';
          el.style.borderTopColor = state.oldTop;
          el.style.borderRightColor = state.oldRight;
          el.style.borderBottomColor = state.oldBottom;
          el.style.borderLeftColor = state.oldLeft;
        });

        if (!activeStates.length) return;

        document.body.offsetHeight;

        window.requestAnimationFrame(function() {
          activeStates.forEach(function(state) {
            var el = state.el;
            if (!el || !document.documentElement.contains(el)) return;
            el.style.transition = transitionValue;
            el.style.borderTopColor = state.nextTop;
            el.style.borderRightColor = state.nextRight;
            el.style.borderBottomColor = state.nextBottom;
            el.style.borderLeftColor = state.nextLeft;
          });
        });

        window.setTimeout(function() {
          activeStates.forEach(function(state) {
            var el = state.el;
            if (!el || !document.documentElement.contains(el)) return;
            el.style.transition = state.oldTransition;
            el.style.borderTopColor = state.oldInlineTop;
            el.style.borderRightColor = state.oldInlineRight;
            el.style.borderBottomColor = state.oldInlineBottom;
            el.style.borderLeftColor = state.oldInlineLeft;
          });
        }, 820);
      }

      function toggleDarkMode(e) {
        var nextDarkMode = e.target.checked;
        var wasDarkMode = document.body.classList.contains('dark-mode');
        var borderStates = captureThemeBorderStates();

        document.body.classList.add('transition-enabled', 'theme-switching');
        createThemeTransitionOverlay(wasDarkMode);
        createSurfaceThemeFades(wasDarkMode);

        document.documentElement.classList.toggle('dark-mode', nextDarkMode);
        document.documentElement.dataset.theme = nextDarkMode ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode', nextDarkMode);
        localStorage.setItem('dark-mode', nextDarkMode ? 'true' : 'false');
        animateThemeBorders(borderStates);
        if (desktopToggle) desktopToggle.checked = nextDarkMode;
        if (mobileToggle) mobileToggle.checked = nextDarkMode;
        setProfilePhotoForMode(nextDarkMode, true);
        setTimeout(function() {
          document.body.classList.remove('transition-enabled', 'theme-switching');
        }, 820);
      }

      if (desktopToggle) {
        desktopToggle.addEventListener('change', toggleDarkMode, false);
      }
      if (mobileToggle) {
        mobileToggle.addEventListener('change', toggleDarkMode, false);
      }


      function bindTactilePressFeedback() {
        var selectors = [
          '.pub-tag', '.poster-tag', '.pub-filter-chip', '.timeline-marker',
          '.timeline-chip', '.timeline-stat', '.pub-card-meta .meta-pill',
          '.blog-meta-pill', '.post-meta-chip', '.profile-card .social-links a',
          '.nav ul li a', '.mobile-menu ul li a', '.blog-back-link',
          '.blog-card .read-more', '.clickable-card'
        ].join(', ');
        var pressed = new Set();

        function skipPress(target, eventTarget) {
          if (!target.classList.contains('clickable-card')) return false;
          if (eventTarget.closest('a, button, input, label, select, textarea')) return true;
          return !!eventTarget.closest('.pub-card-meta') && !eventTarget.closest('.publication-type-pill');
        }

        function clearOne(target, delay) {
          if (!target) return;
          pressed.delete(target);
          window.setTimeout(function() { target.classList.remove('press-active'); }, delay == null ? 70 : delay);
        }

        function clearAll(delay) {
          Array.from(pressed).forEach(function(target) { clearOne(target, delay); });
        }

        function isPointerInside(target, e) {
          var el = document.elementFromPoint(e.clientX, e.clientY);
          return !!(el && target.contains(el));
        }

        document.addEventListener('pointerdown', function(e) {
          if (e.button !== undefined && e.button !== 0) return;
          var target = e.target.closest(selectors);
          if (!target || skipPress(target, e.target)) return;
          target.classList.add('press-active');
          pressed.add(target);
        }, { passive: true });

        document.addEventListener('pointermove', function(e) {
          if (!pressed.size) return;
          Array.from(pressed).forEach(function(target) {
            if (!isPointerInside(target, e)) clearOne(target, 0);
          });
        }, { passive: true });

        ['pointerup', 'pointercancel', 'dragstart'].forEach(function(type) {
          document.addEventListener(type, function() { clearAll(); }, { passive: true });
        });
        ['blur', 'mouseup', 'touchend', 'touchcancel'].forEach(function(type) {
          window.addEventListener(type, function() { clearAll(0); }, { passive: true });
        });
        document.addEventListener('visibilitychange', function() { if (document.hidden) clearAll(0); });
        document.addEventListener('scroll', function() { clearAll(0); }, true);
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
        if (type === 'journal') return 'fa-solid fa-book-open';
        if (type === 'conference') return 'fa-solid fa-users';
        return 'fa-solid fa-layer-group';
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

        holder.innerHTML =
          '<span class="meta-pill publication-type-pill type-' + escapeHTML(meta.type) + '">' +
            '<i class="' + escapeHTML(iconForPubType(meta.type)) + '"></i>' +
            '<span>' + escapeHTML(meta.typeLabel) + '</span>' +
          '</span>';
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
          root = grid.closest('section') || anchor.closest('section') || anchor.parentElement || anchor;
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
        shell.className = 'pub-filter-shell';
        shell.innerHTML = '<span class="pub-filter-heading">Filter publications</span>';

        var state = {
          type: '',
          topic: ''
        };

        function makeGroup(name, options, allLabel) {
          if (!options.length) return null;

          var group = document.createElement('div');
          group.className = 'pub-filter-group';

          var allChip = document.createElement('button');
          allChip.type = 'button';
          allChip.className = 'pub-filter-chip active';
          allChip.textContent = allLabel;
          allChip.dataset.filterType = name;
          allChip.dataset.filterValue = '';
          group.appendChild(allChip);

          options.forEach(function(option) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'pub-filter-chip';
            chip.textContent = option.label;
            chip.dataset.filterType = name;
            chip.dataset.filterValue = option.value;
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

        function refreshFilterUI() {
          shell.querySelectorAll('.pub-filter-chip').forEach(function(chip) {
            var type = chip.dataset.filterType;
            var value = chip.dataset.filterValue;
            chip.classList.toggle('active', state[type] === value);
          });
        }

        function applyFilters() {
          cards.forEach(function(card) {
            var cardTopics = (card.dataset.pubTopics || '').split('|').filter(Boolean);

            var matchType = !state.type || card.dataset.pubType === state.type;
            var matchTopic = !state.topic || cardTopics.indexOf(state.topic) >= 0;

            card.classList.toggle('is-filtered-out', !(matchType && matchTopic));
          });
        }

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

      var allNavLinks = Array.prototype.slice.call(document.querySelectorAll('.nav ul li a, .mobile-menu ul li a'));

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

      var sections = ['about', 'publications', 'poster', 'contact']
        .map(function(id) { return document.getElementById(id); })
        .filter(Boolean);

      var currentPath = normalizePath(window.location.pathname);

      if (currentPath.indexOf('/blog') === 0) {
        setActiveLinks('/blog/');
      } else if (sections.length > 0 && currentPath === '/') {
        setActiveLinks('/');
        var observer = new IntersectionObserver(function(entries) {
          var visibleEntries = entries
            .filter(function(entry) { return entry.isIntersecting; })
            .sort(function(a, b) { return b.intersectionRatio - a.intersectionRatio; });

          if (window.scrollY < 80) {
            setActiveLinks('/');
            return;
          }

          if (visibleEntries.length > 0) {
            setActiveLinks('/#' + visibleEntries[0].target.id);
          }
        }, {
          rootMargin: '-20% 0px -55% 0px',
          threshold: [0.2, 0.35, 0.5, 0.7]
        });

        sections.forEach(function(section) {
          observer.observe(section);
        });

        window.addEventListener('scroll', function() {
          if (window.scrollY < 80) {
            setActiveLinks('/');
          }
        }, { passive: true });
      } else {
        setActiveLinks('/');
      }
    });

    (function initNaturalMeteorAmbience() {
      var layer = document.querySelector('.meteor-layer');
      if (!layer || !window.requestAnimationFrame) return;

      var reduceMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reduceMotionQuery && reduceMotionQuery.matches) return;

      var scheduleTimer = null;
      var activeMeteors = 0;
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
        if (stopped) return;
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
        if (activeMeteors >= maxActive) return;

        activeMeteors += 1;

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

        var startTime = performance.now();

        function frame(now) {
          var t = clamp((now - startTime) / duration, 0, 1);

          var progress = 0.60 * t - 0.7317073171 * t * t + 1.1461629982 * t * t * t;
          var drift = Math.sin(t * Math.PI) * driftAmount;

          var x = moveX * progress + perpX * drift;
          var y = moveY * progress + perpY * drift;

          var fadeIn = clamp(t / 0.12, 0, 1);
          var fadeOut = clamp((0.74 - t) / 0.34, 0, 1);
          var shimmer = 0.985 + 0.015 * Math.sin(t * Math.PI * 1.6);
          var opacity = maxOpacity * Math.min(fadeIn, fadeOut) * shimmer;

          var scale = 0.28 + 0.58 * clamp(t / 0.30, 0, 1) - 0.14 * clamp((t - 0.56) / 0.28, 0, 1);

          meteor.style.setProperty('--meteor-x', x.toFixed(1) + 'px');
          meteor.style.setProperty('--meteor-y', y.toFixed(1) + 'px');
          meteor.style.setProperty('--meteor-opacity', opacity.toFixed(3));
          meteor.style.setProperty('--meteor-scale', scale.toFixed(3));

          if (t < 0.82) {
            window.requestAnimationFrame(frame);
          } else {
            meteor.remove();
            activeMeteors = Math.max(0, activeMeteors - 1);
          }
        }

        window.requestAnimationFrame(frame);
      }

      function startMeteors() {
        if (stopped) stopped = false;
        if (scheduleTimer || (reduceMotionQuery && reduceMotionQuery.matches)) return;
        scheduleNext(random(700, 2200));
      }

      function stopMeteors() {
        stopped = true;
        window.clearTimeout(scheduleTimer);
        scheduleTimer = null;
        activeMeteors = 0;
        layer.innerHTML = '';
      }

      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          window.clearTimeout(scheduleTimer);
          scheduleTimer = null;
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

      startMeteors();
    })();

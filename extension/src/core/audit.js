/*
 * Xender SiteCheck — audit engine.
 *
 * Runs entirely inside the inspected page (injected on demand via the
 * scripting API after the user clicks the toolbar button). It only reads the
 * DOM structure and computed styles. It never reads form field values,
 * cookies, storage or credentials, and it never sends anything anywhere.
 *
 * The same file is loaded by the unit tests, so it must not depend on any
 * extension API.
 */
(function (root) {
  'use strict';

  var VERSION = '1.0.0';

  // ---------------------------------------------------------------------------
  // Scoring model (documented in extension/docs/SCORING.md — keep in sync).
  // ---------------------------------------------------------------------------
  var CATEGORIES = ['seo', 'accessibility', 'usability', 'conversion', 'technical'];
  var CATEGORY_LABELS = {
    seo: 'SEO',
    accessibility: 'Accessibility',
    usability: 'Usability',
    conversion: 'Conversion',
    technical: 'Technical'
  };
  var CATEGORY_WEIGHTS = { seo: 25, accessibility: 25, usability: 15, conversion: 15, technical: 20 };
  var SEVERITY_POINTS = { critical: 20, warning: 8, notice: 3 };
  var MANY_THRESHOLD = 10; // affected elements at which a check costs 1.5x

  function scoreIssues(issues) {
    var categories = {};
    CATEGORIES.forEach(function (c) {
      categories[c] = { label: CATEGORY_LABELS[c], score: 100, deductions: 0, issues: 0 };
    });
    issues.forEach(function (issue) {
      var cat = categories[issue.category];
      var points = SEVERITY_POINTS[issue.severity] || 0;
      if (issue.count >= MANY_THRESHOLD) points = points * 1.5;
      cat.deductions += points;
      cat.issues += 1;
    });
    var weighted = 0;
    var totalWeight = 0;
    CATEGORIES.forEach(function (c) {
      var cat = categories[c];
      cat.score = Math.max(0, Math.round(100 - cat.deductions));
      weighted += cat.score * CATEGORY_WEIGHTS[c];
      totalWeight += CATEGORY_WEIGHTS[c];
    });
    var overall = Math.round(weighted / totalWeight);
    return { overall: overall, grade: gradeFor(overall), categories: categories };
  }

  function gradeFor(score) {
    if (score >= 90) return 'Good';
    if (score >= 70) return 'Needs work';
    if (score >= 50) return 'Poor';
    return 'Critical';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function text(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  // Short, privacy-safe description of an element: tag, id, first classes and
  // (for links/buttons/headings only) a snippet of visible text. Never values.
  function describe(el) {
    var tag = el.tagName.toLowerCase();
    var d = tag;
    if (el.id) d += '#' + truncate(el.id, 30);
    else if (typeof el.className === 'string' && el.className.trim()) {
      d += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    }
    if (/^(a|button|h[1-6]|label)$/.test(tag)) {
      var t = text(el);
      if (t) d += ' “' + truncate(t, 40) + '”';
    }
    if (tag === 'img') {
      var src = el.getAttribute('src') || '';
      if (src && src.indexOf('data:') !== 0) d += ' ' + truncate(src.split('?')[0].split('/').pop(), 40);
      if (el.getBoundingClientRect) {
        var r = el.getBoundingClientRect();
        if (r.width && r.height) d += ' (' + Math.round(r.width) + '×' + Math.round(r.height) + ')';
      }
    }
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      var name = el.getAttribute('name') || el.getAttribute('type') || '';
      if (name) d += '[' + truncate(name, 30) + ']';
    }
    return d;
  }

  function examples(list, max) {
    return list.slice(0, max || 5).map(function (x) {
      return typeof x === 'string' ? x : describe(x);
    });
  }

  function isHidden(el, win) {
    if (el.closest && el.closest('[hidden],[aria-hidden="true"],template,noscript')) return true;
    if (!win.getComputedStyle) return false;
    var cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    // Elements in a display:none subtree have no client rects.
    if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) {
      // Layout may be unavailable in some test environments; only trust it when
      // the document itself has layout.
      var body = el.ownerDocument.body;
      if (body && body.getClientRects().length > 0) return true;
    }
    return false;
  }

  function byIdRefs(doc, attr) {
    var ids = (attr || '').trim().split(/\s+/).filter(Boolean);
    return ids.map(function (id) { return doc.getElementById(id); });
  }

  // Approximate accessible name (subset of accname spec, good enough for
  // "is there any name at all" checks).
  function accessibleName(el, doc) {
    var labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      var n = byIdRefs(doc, labelledby).filter(Boolean).map(text).join(' ').trim();
      if (n) return n;
    }
    var aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) return aria;
    var tag = el.tagName.toLowerCase();
    if (tag === 'input') {
      var type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') {
        var v = (el.getAttribute('value') || '').trim();
        if (v) return v;
        if (type === 'submit') return 'Submit';
        if (type === 'reset') return 'Reset';
      }
      if (type === 'image') return (el.getAttribute('alt') || '').trim();
    }
    var t = textWithAlt(el);
    if (t) return t;
    return (el.getAttribute('title') || '').trim();
  }

  // Text content including img alt / svg title, skipping aria-hidden parts.
  function textWithAlt(el) {
    var out = '';
    (function walk(node) {
      for (var c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.nodeType === 1) {
          if (c.getAttribute('aria-hidden') === 'true') continue;
          var tag = c.tagName.toLowerCase();
          if (tag === 'img' || (tag === 'input' && c.type === 'image')) out += ' ' + (c.getAttribute('alt') || '') + ' ';
          else if (tag === 'svg') {
            var title = c.querySelector('title');
            out += ' ' + (c.getAttribute('aria-label') || (title ? title.textContent : '')) + ' ';
          } else if (tag !== 'script' && tag !== 'style') {
            if (c.getAttribute('aria-label')) out += ' ' + c.getAttribute('aria-label') + ' ';
            else walk(c);
          }
        }
      }
    })(el);
    return out.replace(/\s+/g, ' ').trim();
  }

  function hasFieldLabel(el, doc) {
    if ((el.getAttribute('aria-label') || '').trim()) return true;
    var lb = el.getAttribute('aria-labelledby');
    if (lb && byIdRefs(doc, lb).some(function (x) { return x && text(x); })) return true;
    if (el.id) {
      var labels = doc.querySelectorAll('label[for]');
      for (var i = 0; i < labels.length; i++) {
        if (labels[i].getAttribute('for') === el.id && text(labels[i])) return true;
      }
    }
    var wrap = el.closest('label');
    if (wrap && text(wrap)) return true;
    if ((el.getAttribute('title') || '').trim()) return true;
    return false;
  }

  function parseColor(str) {
    var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(str || '');
    if (!m) return null;
    var a = m[4] === undefined ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a: a };
  }

  function luminance(c) {
    function ch(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }

  function contrastRatio(a, b) {
    var l1 = luminance(a);
    var l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // Walk up to the first opaque background. Returns null whenever the result
  // would be a guess (background images, gradients, partial transparency,
  // opacity, filters, positioned overlap is not detected — so we also skip
  // positioned elements).
  function reliableBackground(el, win) {
    var node = el;
    while (node && node.nodeType === 1) {
      var cs = win.getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      if (parseFloat(cs.opacity) < 1) return null;
      if (cs.filter && cs.filter !== 'none') return null;
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') return null;
      if (node !== el.ownerDocument.documentElement && node !== el.ownerDocument.body &&
          (cs.position === 'absolute' || cs.position === 'fixed')) return null;
      var bg = parseColor(cs.backgroundColor);
      if (bg && bg.a >= 1) return bg;
      if (bg && bg.a > 0) return null;
      node = node.parentElement;
    }
    // Reached the root with no background: browsers paint white by default,
    // unless the user agent is in a forced/dark mode we cannot see.
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  var VALID_ROLES = ('alert alertdialog application article banner blockquote button caption cell checkbox code ' +
    'columnheader combobox comment complementary contentinfo definition deletion dialog directory document ' +
    'emphasis feed figure form generic grid gridcell group heading img image insertion link list listbox listitem ' +
    'log main mark marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note ' +
    'option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search ' +
    'searchbox separator slider spinbutton status strong subscript suggestion superscript switch tab table ' +
    'tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem ' +
    'doc-abstract doc-acknowledgments doc-afterword doc-appendix doc-backlink doc-biblioentry doc-bibliography ' +
    'doc-biblioref doc-chapter doc-colophon doc-conclusion doc-cover doc-credit doc-credits doc-dedication ' +
    'doc-endnote doc-endnotes doc-epigraph doc-epilogue doc-errata doc-example doc-footnote doc-foreword ' +
    'doc-glossary doc-glossref doc-index doc-introduction doc-noteref doc-notice doc-pagebreak doc-pagelist ' +
    'doc-part doc-preface doc-prologue doc-pullquote doc-qna doc-subtitle doc-tip doc-toc ' +
    'graphics-document graphics-object graphics-symbol').split(' ');

  var CTA_WORDS = /\b(contact|call|book|buy|get|start|quote|sign ?up|subscribe|order|enquire|inquire|enquiry|demo|try|register|download|join|apply|schedule|shop|add to (cart|bag|basket)|checkout|whatsapp|request|hire|talk|chat|reserve|donate|claim|free trial|pricing)\b/i;
  var VAGUE_CTA = /^(submit|click here|click|go|ok|okay|send|here|more|read more|learn more|continue|next|button|link|details)$/i;
  var VAGUE_LINK = /^(click here|here|this|link|more|read more|this link|click)$/i;

  // ---------------------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------------------
  function run(doc, win) {
    doc = doc || root.document;
    win = win || root;
    var started = Date.now();
    var loc = win.location || { href: '', protocol: '', hostname: '' };
    var isHttps = loc.protocol === 'https:';
    var issues = [];
    var passed = [];

    function check(def, failing, opts) {
      opts = opts || {};
      var count = typeof opts.count === 'number' ? opts.count : (Array.isArray(failing) ? failing.length : (failing ? 1 : 0));
      if (count > 0) {
        issues.push({
          id: def.id,
          category: def.category,
          severity: def.severity,
          heuristic: !!def.heuristic,
          title: opts.title || def.title,
          why: def.why,
          fix: def.fix,
          count: count,
          examples: opts.examples || (Array.isArray(failing) ? examples(failing) : [])
        });
      } else if (!opts.skipPass) {
        passed.push({ id: def.id, category: def.category, title: def.passTitle || def.title });
      }
    }

    var head = doc.head || doc.documentElement;
    function meta(sel) {
      var el = head.querySelector(sel) || doc.querySelector(sel);
      return el ? (el.getAttribute('content') || '').trim() : null;
    }

    // ---------------- SEO ----------------
    var title = (doc.title || '').replace(/\s+/g, ' ').trim();
    check({ id: 'seo-title-missing', category: 'seo', severity: 'critical',
      title: 'Page title is missing',
      passTitle: 'Page has a title',
      why: 'The title is the main headline in search results and browser tabs. Without one, search engines invent a title.',
      fix: 'Add a unique, descriptive <title> that says what the page offers (roughly 30–60 characters).'
    }, !title);
    if (title) {
      check({ id: 'seo-title-short', category: 'seo', severity: 'warning',
        title: 'Page title is very short',
        passTitle: 'Title length is reasonable',
        why: 'A very short title rarely tells searchers what the page is about or who it is for.',
        fix: 'Expand the title to describe the page and brand, e.g. “Service in City | Brand”.'
      }, title.length < 15, { examples: ['“' + truncate(title, 70) + '” (' + title.length + ' chars)'] });
      check({ id: 'seo-title-long', category: 'seo', severity: 'notice',
        title: 'Page title is long and may be cut off',
        passTitle: 'Title is not excessively long',
        why: 'Search engines typically truncate titles beyond roughly 60 characters, hiding the end of your message.',
        fix: 'Put the most important words first and keep the title near 60 characters.'
      }, title.length > 65, { examples: [title.length + ' characters'] });
    }

    var desc = meta('meta[name="description" i]');
    check({ id: 'seo-meta-description-missing', category: 'seo', severity: 'warning',
      title: 'Meta description is missing',
      passTitle: 'Meta description present',
      why: 'Search engines may generate an unpredictable search snippet from random page text.',
      fix: 'Add a concise, page-specific <meta name="description"> (about 70–160 characters) that invites the click.'
    }, !desc);
    if (desc) {
      check({ id: 'seo-meta-description-length', category: 'seo', severity: 'notice',
        title: desc.length < 50 ? 'Meta description is very short' : 'Meta description is long',
        passTitle: 'Meta description length is reasonable',
        why: 'Very short descriptions under-sell the page; very long ones are usually truncated in results.',
        fix: 'Aim for roughly 70–160 characters that summarise the page and its benefit.'
      }, desc.length < 50 || desc.length > 170, { examples: [desc.length + ' characters'] });
    }

    var robots = (meta('meta[name="robots" i]') || '').toLowerCase();
    check({ id: 'seo-noindex', category: 'seo', severity: 'warning',
      title: 'Page asks search engines not to index it',
      passTitle: 'Page is not set to noindex',
      why: 'A “noindex” robots tag keeps this page out of search results. That is correct for private pages but a costly mistake on public ones.',
      fix: 'If this page should appear in search, remove “noindex” from the robots meta tag.'
    }, /noindex/.test(robots), { examples: ['robots: ' + robots] });

    var canonical = head.querySelector('link[rel~="canonical" i]') || doc.querySelector('link[rel~="canonical" i]');
    check({ id: 'seo-canonical-missing', category: 'seo', severity: 'notice',
      title: 'Canonical URL is not declared',
      passTitle: 'Canonical URL declared',
      why: 'Without a canonical link, URL variants (tracking parameters, www/non-www) can split ranking signals.',
      fix: 'Add <link rel="canonical" href="…"> pointing to the preferred URL of this page.'
    }, !canonical || !(canonical.getAttribute('href') || '').trim());

    var og = [
      ['og:title', 'Open Graph title'],
      ['og:description', 'Open Graph description'],
      ['og:image', 'Open Graph image']
    ];
    var ogMissing = og.filter(function (p) { return !meta('meta[property="' + p[0] + '"]'); });
    check({ id: 'seo-open-graph-missing', category: 'seo', severity: ogMissing.length === 3 ? 'warning' : 'notice',
      title: ogMissing.length === 3 ? 'Open Graph tags are missing' : 'Some Open Graph tags are missing',
      passTitle: 'Open Graph title, description and image present',
      why: 'When the page is shared on WhatsApp, LinkedIn, Facebook and similar apps, these tags control the preview. Without them, previews look bare or random.',
      fix: 'Add og:title, og:description and og:image (at least 1200×630 px) meta tags.'
    }, ogMissing.length > 0, { count: ogMissing.length, examples: ogMissing.map(function (p) { return p[0]; }) });

    // ---------------- Structure ----------------
    var headings = Array.prototype.slice.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"][aria-level]'))
      .filter(function (h) { return !isHidden(h, win); });
    var h1s = headings.filter(function (h) { return h.tagName === 'H1' || h.getAttribute('aria-level') === '1'; });
    check({ id: 'struct-h1-missing', category: 'seo', severity: 'warning',
      title: 'No visible H1 heading',
      passTitle: 'Page has an H1 heading',
      why: 'The H1 tells visitors, screen readers and search engines what the page is about at a glance.',
      fix: 'Add one clear H1 near the top that states the page’s main topic or offer.'
    }, h1s.length === 0);
    check({ id: 'struct-h1-multiple', category: 'seo', severity: 'notice',
      title: 'More than one H1 heading',
      passTitle: 'Only one H1 heading',
      why: 'Several H1s blur the page’s main topic. It is allowed in HTML, but a single H1 is clearer for people and search engines.',
      fix: 'Keep one H1 for the main topic and turn the others into H2s.'
    }, h1s.length > 1 ? h1s : []);

    var skips = [];
    var prev = 0;
    headings.forEach(function (h) {
      var level = h.getAttribute('aria-level') ? parseInt(h.getAttribute('aria-level'), 10) : parseInt(h.tagName.slice(1), 10);
      if (prev && level > prev + 1) skips.push(describe(h) + ' (H' + prev + ' → H' + level + ')');
      prev = level;
    });
    check({ id: 'struct-heading-skip', category: 'accessibility', severity: 'notice',
      title: 'Heading levels skip',
      passTitle: 'Heading levels are in order',
      why: 'Screen reader users navigate by headings. Jumping from H2 to H4 suggests missing structure and makes the outline confusing.',
      fix: 'Use heading levels in order (H1 → H2 → H3). Style headings with CSS rather than picking levels for size.'
    }, skips, { examples: skips.slice(0, 5) });

    var emptyHeadings = headings.filter(function (h) { return !textWithAlt(h); });
    check({ id: 'struct-heading-empty', category: 'accessibility', severity: 'warning',
      title: 'Empty headings',
      passTitle: 'No empty headings',
      why: 'Empty headings are announced by screen readers as “heading” with nothing after it.',
      fix: 'Remove empty heading tags or put meaningful text in them.'
    }, emptyHeadings);

    var nodeCount = doc.getElementsByTagName('*').length;
    check({ id: 'tech-dom-size', category: 'technical', severity: nodeCount > 3000 ? 'warning' : 'notice',
      title: 'Very large page structure (' + nodeCount + ' elements)',
      passTitle: 'Page structure size is reasonable (' + nodeCount + ' elements)',
      why: 'Very large DOMs use more memory and make styling and interaction slower, especially on low-end phones.',
      fix: 'Remove hidden or duplicated markup, paginate long lists and avoid deeply nested wrappers.'
    }, nodeCount > 1500, { examples: [nodeCount + ' elements (heuristic threshold: 1,500)'] });

    // ---------------- Technical / basics ----------------
    var viewport = meta('meta[name="viewport" i]');
    check({ id: 'tech-viewport-missing', category: 'technical', severity: 'critical',
      title: 'Mobile viewport tag is missing',
      passTitle: 'Mobile viewport tag present',
      why: 'Without a viewport tag, phones render the page as a zoomed-out desktop layout, which hurts usability and mobile search.',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.'
    }, viewport === null);

    check({ id: 'tech-doctype-missing', category: 'technical', severity: 'warning',
      title: 'HTML doctype is missing',
      passTitle: 'HTML doctype declared',
      why: 'Without <!doctype html> browsers use “quirks mode”, which can break layout in inconsistent ways.',
      fix: 'Add <!doctype html> as the very first line of the HTML.'
    }, !doc.doctype);

    var lang = (doc.documentElement.getAttribute('lang') || '').trim();
    check({ id: 'a11y-lang-missing', category: 'accessibility', severity: 'warning',
      title: 'Page language is not declared',
      passTitle: 'Page language declared',
      why: 'Screen readers use the lang attribute to choose pronunciation; translation tools use it too.',
      fix: 'Add a lang attribute to the <html> element, e.g. <html lang="en">.'
    }, !lang);

    var ids = {};
    var dupIds = [];
    Array.prototype.forEach.call(doc.querySelectorAll('[id]'), function (el) {
      var id = el.id;
      if (!id) return;
      if (ids[id] === 1) dupIds.push('#' + truncate(id, 40));
      ids[id] = (ids[id] || 0) + 1;
    });
    check({ id: 'tech-duplicate-ids', category: 'technical', severity: 'notice',
      title: 'Duplicate element IDs',
      passTitle: 'Element IDs are unique',
      why: 'Duplicate IDs can break labels, in-page links and scripts that expect one element per ID.',
      fix: 'Make every id attribute unique on the page.'
    }, dupIds, { examples: dupIds.slice(0, 5) });

    // ---------------- Security basics ----------------
    check({ id: 'sec-not-https', category: 'technical', severity: 'critical',
      title: 'Page is not served over HTTPS',
      passTitle: 'Page is served over HTTPS',
      why: 'Browsers mark HTTP pages as “Not secure”, which damages trust, and data sent from the page can be intercepted.',
      fix: 'Serve the site over HTTPS and redirect all HTTP requests to HTTPS.'
    }, loc.protocol === 'http:', { skipPass: loc.protocol !== 'https:' && loc.protocol !== 'http:' });

    var passwordFields = Array.prototype.slice.call(doc.querySelectorAll('input[type="password" i]'));
    if (loc.protocol === 'http:') {
      check({ id: 'sec-password-on-http', category: 'technical', severity: 'critical',
        title: 'Password field on an insecure (HTTP) page',
        why: 'Passwords typed on an HTTP page can be read by anyone on the network. Browsers show a strong warning.',
        fix: 'Serve this page (and the form’s action URL) over HTTPS only.'
      }, passwordFields, { skipPass: true });
    }

    if (isHttps) {
      var activeMixed = [];
      var passiveMixed = [];
      Array.prototype.forEach.call(doc.querySelectorAll('script[src],iframe[src],link[rel~="stylesheet" i][href],object[data],embed[src]'), function (el) {
        var u = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data') || '';
        if (/^http:\/\//i.test(u.trim())) activeMixed.push(el.tagName.toLowerCase() + ' ' + truncate(u, 60));
      });
      Array.prototype.forEach.call(doc.querySelectorAll('img[src],video[src],audio[src],source[src]'), function (el) {
        var u = el.getAttribute('src') || '';
        if (/^http:\/\//i.test(u.trim())) passiveMixed.push(el.tagName.toLowerCase() + ' ' + truncate(u, 60));
      });
      check({ id: 'sec-mixed-active', category: 'technical', severity: 'critical',
        title: 'Scripts, styles or frames loaded over HTTP',
        passTitle: 'No scripts, styles or frames loaded over HTTP',
        why: 'Browsers block insecure scripts, stylesheets and frames on HTTPS pages, so these parts of the page are probably broken.',
        fix: 'Change these URLs to https:// (or host the files on your own HTTPS domain).'
      }, activeMixed, { examples: activeMixed.slice(0, 5) });
      check({ id: 'sec-mixed-passive', category: 'technical', severity: 'warning',
        title: 'Images or media loaded over HTTP',
        passTitle: 'No images or media loaded over HTTP',
        why: 'Insecure media on an HTTPS page triggers “not fully secure” warnings and may be upgraded or blocked.',
        fix: 'Serve all images and media from https:// URLs.'
      }, passiveMixed, { examples: passiveMixed.slice(0, 5) });

      var httpForms = Array.prototype.slice.call(doc.querySelectorAll('form[action]')).filter(function (f) {
        return /^http:\/\//i.test((f.getAttribute('action') || '').trim());
      });
      check({ id: 'sec-form-action-http', category: 'technical', severity: 'critical',
        title: 'Form submits to an insecure HTTP address',
        passTitle: 'Forms submit over HTTPS',
        why: 'Data entered in this form is sent unencrypted, and browsers warn users before submitting.',
        fix: 'Change the form action to an https:// URL.'
      }, httpForms, { skipPass: doc.forms.length === 0 });
    }

    // ---------------- Images ----------------
    var imgs = Array.prototype.slice.call(doc.querySelectorAll('img')).filter(function (i) { return !isHidden(i, win); });
    var noAlt = imgs.filter(function (i) {
      return !i.hasAttribute('alt') && !(i.getAttribute('role') === 'presentation' || i.getAttribute('role') === 'none') &&
        !(i.getAttribute('aria-label') || i.getAttribute('aria-labelledby'));
    });
    check({ id: 'img-alt-missing', category: 'accessibility', severity: 'warning',
      title: 'Images without alt text',
      passTitle: imgs.length ? 'All images have an alt attribute' : 'No images to check for alt text',
      why: 'Screen readers cannot describe these images, and search engines lose context about them. Some screen readers read the file name instead.',
      fix: 'Add alt text that describes the image’s purpose. Use alt="" only for purely decorative images.'
    }, noAlt);

    // Empty alt is correct for decorative images; flag only large, non-decorative-looking
    // images that are the sole content of a link/button (those leave it unnamed — handled
    // by link/button name checks) or large standalone content images.
    var suspiciousEmptyAlt = imgs.filter(function (i) {
      if (i.getAttribute('alt') !== '') return false;
      var w = i.getBoundingClientRect ? i.getBoundingClientRect().width : 0;
      var h = i.getBoundingClientRect ? i.getBoundingClientRect().height : 0;
      return w >= 300 && h >= 200 && !i.closest('a,button,figure[role="presentation"]');
    });
    check({ id: 'img-alt-empty-large', category: 'accessibility', severity: 'notice',
      heuristic: true,
      title: 'Large images marked as decorative (empty alt)',
      passTitle: 'No large images with empty alt text',
      why: 'alt="" tells screen readers to skip the image. That is right for decoration, but large images are often meaningful content (products, people, diagrams).',
      fix: 'If the image carries information, describe it in the alt text. If it is purely decorative, keep alt="".'
    }, suspiciousEmptyAlt, { skipPass: imgs.length === 0 });

    var dpr = win.devicePixelRatio || 1;
    var oversized = imgs.filter(function (i) {
      if (!i.complete || !i.naturalWidth) return false;
      var rendered = i.getBoundingClientRect().width;
      if (rendered < 32) return false;
      return i.naturalWidth > 1000 && i.naturalWidth > rendered * Math.max(dpr, 1) * 2.5;
    });
    check({ id: 'img-oversized', category: 'technical', severity: 'warning',
      title: 'Images much larger than their displayed size',
      passTitle: 'Loaded images are not drastically oversized',
      why: 'Downloading a 3000px image to show it at 400px wastes data and slows the page, especially on mobile.',
      fix: 'Resize images close to their display size (×2 for high-density screens) or use srcset/sizes.'
    }, oversized, {
      skipPass: imgs.length === 0,
      examples: oversized.slice(0, 5).map(function (i) {
        return describe(i) + ' — ' + i.naturalWidth + 'px file shown at ' + Math.round(i.getBoundingClientRect().width) + 'px';
      })
    });

    // ---------------- Links ----------------
    var links = Array.prototype.slice.call(doc.querySelectorAll('a')).filter(function (a) { return !isHidden(a, win); });
    var hrefLinks = links.filter(function (a) { return a.hasAttribute('href'); });

    var deadEnd = hrefLinks.filter(function (a) {
      var h = (a.getAttribute('href') || '').trim();
      return h === '' || h === '#';
    });
    check({ id: 'link-empty-href', category: 'usability', severity: 'warning',
      title: 'Links that go nowhere (href="#" or empty)',
      passTitle: 'No links with empty or “#” destinations',
      why: 'These links jump to the top of the page or do nothing without JavaScript, which confuses visitors and crawlers.',
      fix: 'Point links to a real URL. If it triggers an action, use a <button> instead.'
    }, deadEnd);

    var jsLinks = hrefLinks.filter(function (a) { return /^\s*javascript:/i.test(a.getAttribute('href') || ''); });
    check({ id: 'link-javascript', category: 'usability', severity: 'warning',
      title: 'Links using javascript: URLs',
      passTitle: 'No javascript: links',
      why: 'javascript: links cannot be opened in a new tab, are invisible to search engines and fail if scripts are blocked.',
      fix: 'Use a real URL for navigation, or a <button> for in-page actions.'
    }, jsLinks);

    var malformed = [];
    hrefLinks.forEach(function (a) {
      var raw = (a.getAttribute('href') || '').trim();
      if (!raw || raw === '#' || /^javascript:/i.test(raw)) return;
      var reason = null;
      if (/^www\./i.test(raw)) reason = 'missing https:// (treated as a relative path)';
      else if (/^https?:\/[^/]/i.test(raw) || /^https?\/\//i.test(raw) || /^htt?p?s?:\/\/$/i.test(raw) || /^(htp|htps|hhtp|htttp)s?:/i.test(raw)) reason = 'mistyped scheme';
      else if (/^mailto:/i.test(raw) && raw.indexOf('@') === -1) reason = 'mailto without an email address';
      else if (/^tel:/i.test(raw) && !/\d{3,}/.test(raw.replace(/[^\d]/g, ''))) reason = 'tel: without a phone number';
      else if (/\s/.test(raw.replace(/%20/g, '')) && /^https?:/i.test(raw)) reason = 'contains spaces';
      else {
        try { new URL(raw, loc.href || 'https://example.invalid/'); } catch (e) { reason = 'not a valid URL'; }
      }
      if (reason) malformed.push(describe(a) + ' → ' + truncate(raw, 60) + ' (' + reason + ')');
    });
    check({ id: 'link-malformed', category: 'usability', severity: 'warning',
      title: 'Malformed link URLs',
      passTitle: 'No obviously malformed link URLs',
      why: 'These links are written incorrectly, so they will lead to an error page or nowhere at all.',
      fix: 'Correct the URL (include https:// for external sites, valid emails for mailto:, digits for tel:).'
    }, malformed, { examples: malformed.slice(0, 5) });

    var unnamedLinks = hrefLinks.filter(function (a) { return !accessibleName(a, doc); });
    check({ id: 'link-no-name', category: 'accessibility', severity: 'warning',
      title: 'Links without an accessible name',
      passTitle: 'All links have a readable name',
      why: 'Icon-only or empty links are announced as just “link”, so screen reader users cannot tell where they go.',
      fix: 'Add visible text, an aria-label, or alt text on the image inside the link.'
    }, unnamedLinks);

    var vagueLinks = hrefLinks.filter(function (a) { return VAGUE_LINK.test(accessibleName(a, doc)); });
    check({ id: 'link-vague-text', category: 'accessibility', severity: 'notice',
      heuristic: true,
      title: 'Vague link text (“click here”, “read more”)',
      passTitle: 'No vague “click here” link text',
      why: 'Out of context (e.g. a screen reader’s link list or a skim-reader) these links say nothing about their destination.',
      fix: 'Describe the destination: “Read the pricing guide” instead of “Read more”.'
    }, vagueLinks);

    if (isHttps) {
      var httpLinks = hrefLinks.filter(function (a) { return /^http:\/\//i.test((a.getAttribute('href') || '').trim()); });
      check({ id: 'link-insecure-http', category: 'technical', severity: 'notice',
        title: 'Links to insecure HTTP pages',
        passTitle: 'No links to insecure HTTP URLs',
        why: 'Sending visitors from a secure page to an HTTP page can trigger “Not secure” warnings and expose them to interception.',
        fix: 'Change these links to https:// if the destination supports it.'
      }, httpLinks, { examples: httpLinks.slice(0, 5).map(function (a) { return truncate(a.getAttribute('href'), 70); }) });
    }

    var blankUnsafe = hrefLinks.filter(function (a) {
      if ((a.getAttribute('target') || '').toLowerCase() !== '_blank') return false;
      var rel = (a.getAttribute('rel') || '').toLowerCase();
      if (/\bnoopener\b|\bnoreferrer\b/.test(rel)) return false;
      try { return new URL(a.href, loc.href).origin !== (loc.origin || new URL(loc.href).origin); } catch (e) { return false; }
    });
    check({ id: 'sec-target-blank', category: 'technical', severity: 'notice',
      title: 'External links open in a new tab without rel="noopener"',
      passTitle: 'New-tab external links use rel="noopener"',
      why: 'Current browsers apply noopener by default, but older browsers let the opened site control your tab (“tabnabbing”).',
      fix: 'Add rel="noopener" (or rel="noopener noreferrer") to links with target="_blank".'
    }, blankUnsafe);

    // ---------------- Buttons & ARIA ----------------
    var buttons = Array.prototype.slice.call(doc.querySelectorAll('button,[role="button"],input[type="button" i],input[type="submit" i],input[type="reset" i],input[type="image" i]'))
      .filter(function (b) { return !isHidden(b, win); });
    var unnamedButtons = buttons.filter(function (b) { return !accessibleName(b, doc); });
    check({ id: 'a11y-button-no-name', category: 'accessibility', severity: 'warning',
      title: 'Buttons without an accessible name',
      passTitle: buttons.length ? 'All buttons have a readable name' : 'No buttons to check',
      why: 'Icon-only buttons are announced as just “button”, so users of assistive technology cannot tell what they do.',
      fix: 'Add visible text or an aria-label describing the action (e.g. aria-label="Open menu").'
    }, unnamedButtons);

    var badRoles = [];
    Array.prototype.forEach.call(doc.querySelectorAll('[role]'), function (el) {
      var roles = (el.getAttribute('role') || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!roles.length) return;
      // A role list is valid if the first recognised token is valid (fallback roles).
      if (!roles.some(function (r) { return VALID_ROLES.indexOf(r) !== -1; })) {
        badRoles.push(describe(el) + ' role="' + truncate(el.getAttribute('role'), 30) + '"');
      }
    });
    check({ id: 'a11y-aria-invalid-role', category: 'accessibility', severity: 'warning',
      title: 'Invalid ARIA role values',
      passTitle: 'ARIA roles are valid',
      why: 'Unknown roles are ignored by assistive technology, so the element is announced incorrectly.',
      fix: 'Use a valid WAI-ARIA role, or remove the role attribute and use the correct HTML element.'
    }, badRoles, { examples: badRoles.slice(0, 5) });

    var brokenRefs = [];
    Array.prototype.forEach.call(doc.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]'), function (el) {
      ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        v.trim().split(/\s+/).forEach(function (id) {
          if (id && !doc.getElementById(id)) brokenRefs.push(describe(el) + ' ' + attr + '="' + truncate(id, 30) + '"');
        });
      });
    });
    check({ id: 'a11y-aria-broken-reference', category: 'accessibility', severity: 'warning',
      title: 'ARIA attributes point to missing IDs',
      passTitle: 'ARIA ID references resolve',
      why: 'aria-labelledby / aria-describedby / aria-controls reference an element that does not exist, so the label or relationship is lost.',
      fix: 'Point the attribute at an existing element ID, or remove it.'
    }, brokenRefs, { examples: brokenRefs.slice(0, 5) });

    var hiddenFocusable = Array.prototype.slice.call(doc.querySelectorAll('[aria-hidden="true"]')).filter(function (el) {
      var focusables = el.matches('a[href],button,input,select,textarea,[tabindex]') ? [el] : [];
      focusables = focusables.concat(Array.prototype.slice.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select,textarea,[tabindex]')));
      return focusables.some(function (f) { return f.getAttribute('tabindex') !== '-1' && !isHiddenByCss(f, win); });
    });
    check({ id: 'a11y-aria-hidden-focusable', category: 'accessibility', severity: 'warning',
      title: 'Focusable elements inside aria-hidden content',
      passTitle: 'No focusable elements hidden from assistive technology',
      why: 'Keyboard users can tab to these controls, but screen readers announce nothing — a confusing “silent” focus stop.',
      fix: 'Remove aria-hidden, or make the inner controls unfocusable (tabindex="-1" / inert) while hidden.'
    }, hiddenFocusable);

    // ---------------- Contrast (measured, conservative) ----------------
    var lowContrast = [];
    if (win.getComputedStyle) {
      var candidates = Array.prototype.slice.call(doc.body ? doc.body.querySelectorAll('p,span,a,li,td,th,label,button,h1,h2,h3,h4,h5,h6,small,strong,em,div') : []);
      var checked = 0;
      for (var ci = 0; ci < candidates.length && checked < 600; ci++) {
        var el = candidates[ci];
        var ownText = '';
        for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) ownText += n.nodeValue;
        ownText = ownText.trim();
        if (ownText.length < 2) continue;
        if (isHidden(el, win)) continue;
        if (el.closest('[disabled],[aria-disabled="true"]')) continue;
        checked++;
        var cs = win.getComputedStyle(el);
        var fg = parseColor(cs.color);
        if (!fg || fg.a < 1) continue;
        if (cs.textShadow && cs.textShadow !== 'none') continue;
        var bg = reliableBackground(el, win);
        if (!bg) continue;
        var ratio = contrastRatio(fg, bg);
        var size = parseFloat(cs.fontSize) || 16;
        var bold = parseInt(cs.fontWeight, 10) >= 700;
        var large = size >= 24 || (bold && size >= 18.66);
        var min = large ? 3 : 4.5;
        if (ratio < min) {
          lowContrast.push(describe(el) + ' “' + truncate(ownText, 30) + '” — ' + ratio.toFixed(2) + ':1 (needs ' + min + ':1)');
        }
      }
    }
    check({ id: 'a11y-low-contrast', category: 'accessibility', severity: 'warning',
      title: 'Low-contrast text (measured)',
      passTitle: 'No low-contrast text found on solid backgrounds',
      why: 'Text with too little contrast is hard to read for many people, especially on phones outdoors.',
      fix: 'Darken the text or lighten the background to reach at least 4.5:1 (3:1 for large text).'
    }, lowContrast, { examples: lowContrast.slice(0, 5) });

    // ---------------- Forms ----------------
    var fields = Array.prototype.slice.call(doc.querySelectorAll('input,select,textarea')).filter(function (f) {
      var type = (f.getAttribute('type') || 'text').toLowerCase();
      return ['hidden', 'submit', 'button', 'reset', 'image'].indexOf(type) === -1 && !isHidden(f, win);
    });
    var unlabeled = fields.filter(function (f) { return !hasFieldLabel(f, doc); });
    var placeholderOnly = unlabeled.filter(function (f) { return (f.getAttribute('placeholder') || '').trim(); });
    check({ id: 'form-missing-label', category: 'accessibility', severity: 'warning',
      title: 'Form fields without a label',
      passTitle: fields.length ? 'All form fields have labels' : 'No form fields to check',
      why: 'Screen readers cannot say what to type, and tapping a label to focus the field stops working.' +
        (placeholderOnly.length ? ' Placeholder text is not a label — it disappears as soon as someone types.' : ''),
      fix: 'Connect a visible <label for="field-id"> to each field (or use aria-label when a visible label is impossible).'
    }, unlabeled, { skipPass: fields.length === 0 });

    var autocompleteHints = /(^|[_\-\s])(e-?mail|phone|mobile|tel|name|fname|lname|first.?name|last.?name|full.?name|address|city|zip|postal|pincode|country)([_\-\s]|$)/i;
    var noAutocomplete = fields.filter(function (f) {
      if (f.hasAttribute('autocomplete')) return false;
      var form = f.form;
      if (form && form.hasAttribute('autocomplete')) return false;
      var type = (f.getAttribute('type') || 'text').toLowerCase();
      if (type === 'email' || type === 'tel') return true;
      if (type !== 'text' && f.tagName !== 'TEXTAREA') return false;
      var key = (f.getAttribute('name') || '') + ' ' + (f.id || '');
      return autocompleteHints.test(key);
    });
    check({ id: 'form-autocomplete-missing', category: 'usability', severity: 'notice',
      title: 'Contact fields without autocomplete hints',
      passTitle: 'Contact fields support autofill',
      why: 'autocomplete attributes let browsers fill name, email and phone in one tap — a measurable reduction in form effort on mobile.',
      fix: 'Add autocomplete="name", "email", "tel", "street-address" etc. to matching fields.'
    }, noAutocomplete, { skipPass: fields.length === 0 });

    var forms = Array.prototype.slice.call(doc.querySelectorAll('form')).filter(function (f) { return !isHidden(f, win); });
    var noSubmit = forms.filter(function (f) {
      var fieldCount = f.querySelectorAll('input:not([type="hidden"]),select,textarea').length;
      if (!fieldCount) return false;
      return !f.querySelector('button:not([type]),button[type="submit" i],input[type="submit" i],input[type="image" i]') &&
        !(f.id && doc.querySelector('button[form="' + f.id + '"],input[type="submit"][form="' + f.id + '"]'));
    });
    check({ id: 'form-no-submit', category: 'usability', severity: 'warning',
      title: 'Forms without a submit button',
      passTitle: forms.length ? 'Forms have a submit button' : 'No forms on this page',
      why: 'Without a real submit button, keyboard and screen reader users may have no reliable way to send the form, and pressing Enter may not work.',
      fix: 'Add a <button type="submit"> with a clear label such as “Send enquiry”.'
    }, noSubmit, { skipPass: forms.length === 0 });

    var longForms = forms.filter(function (f) {
      // Sign-up / checkout forms with passwords legitimately need more fields.
      if (f.querySelector('input[type="password" i]')) return false;
      var visible = Array.prototype.filter.call(f.querySelectorAll('input,select,textarea'), function (x) {
        var t = (x.getAttribute('type') || 'text').toLowerCase();
        return ['hidden', 'submit', 'button', 'reset', 'image'].indexOf(t) === -1 && !isHidden(x, win);
      });
      return visible.length > 7;
    });
    check({ id: 'cro-long-form', category: 'conversion', severity: 'notice', heuristic: true,
      title: 'Long form (more than 7 fields)',
      passTitle: forms.length ? 'Forms are short' : 'No forms on this page',
      why: 'Every extra field adds effort. Lead and enquiry forms with many fields typically get fewer completions.',
      fix: 'Ask only what you need for the first contact (often name, phone/email and one question). Collect the rest later.'
    }, longForms, { skipPass: forms.length === 0 });

    // ---------------- Conversion heuristics ----------------
    var actionEls = Array.prototype.slice.call(doc.querySelectorAll('a[href],button,input[type="submit" i],input[type="button" i],[role="button"]'))
      .filter(function (el) { return !isHidden(el, win); });
    var ctas = actionEls.filter(function (el) {
      var name = accessibleName(el, doc);
      if (!name || name.length > 60) return false;
      return CTA_WORDS.test(name) || /^(tel|mailto):/i.test(el.getAttribute('href') || '') || /wa\.me|api\.whatsapp\.com/i.test(el.getAttribute('href') || '');
    });
    check({ id: 'cro-no-cta', category: 'conversion', severity: 'warning', heuristic: true,
      title: 'No clear call to action found',
      passTitle: 'Clear calls to action found',
      why: 'Visitors who are ready to act need an obvious next step (“Get a quote”, “Book a call”, “Buy now”).',
      fix: 'Add a prominent button with a specific action near the top of the page and repeat it after key sections.'
    }, ctas.length === 0);

    var vagueCtas = actionEls.filter(function (el) {
      if (el.tagName === 'A' && !el.closest('form')) return false; // vague links handled separately
      return VAGUE_CTA.test(accessibleName(el, doc));
    });
    check({ id: 'cro-vague-cta', category: 'conversion', severity: 'notice', heuristic: true,
      title: 'Generic button labels (“Submit”, “Go”, “Send”)',
      passTitle: 'Button labels are specific',
      why: 'Specific labels set expectations and tend to convert better than generic ones.',
      fix: 'Describe the outcome: “Get my free quote”, “Send enquiry”, “Book a call”.'
    }, vagueCtas);

    var viewportH = win.innerHeight || 800;
    var aboveFold = {};
    ctas.forEach(function (el) {
      if (!el.getBoundingClientRect) return;
      var r = el.getBoundingClientRect();
      var top = r.top + (win.scrollY || 0);
      if (r.width > 0 && top < viewportH && !el.closest('nav,header nav,[role="navigation"],footer')) {
        aboveFold[accessibleName(el, doc).toLowerCase()] = true;
      }
    });
    var foldCtas = Object.keys(aboveFold);
    check({ id: 'cro-competing-ctas', category: 'conversion', severity: 'notice', heuristic: true,
      title: 'Many competing calls to action in the first screen (' + foldCtas.length + ')',
      passTitle: 'First screen has a focused set of calls to action',
      why: 'When the first screen offers many different actions, visitors hesitate. One primary and one secondary action is usually clearer.',
      fix: 'Pick the single most valuable action for this page, make it the primary button and demote the rest.'
    }, foldCtas.length > 4, { count: foldCtas.length > 4 ? 1 : 0, examples: foldCtas.slice(0, 6) });

    var contactLinks = Array.prototype.slice.call(doc.querySelectorAll('a[href]')).filter(function (a) {
      var h = a.getAttribute('href') || '';
      return /^(tel|mailto|sms):/i.test(h) || /wa\.me|api\.whatsapp\.com|m\.me\/|t\.me\//i.test(h) || /contact|enquir|inquir|get-in-touch/i.test(h) || /\b(contact|get in touch)\b/i.test(text(a));
    });
    check({ id: 'cro-no-contact', category: 'conversion', severity: 'warning', heuristic: true,
      title: 'No visible contact method',
      passTitle: 'Contact method available (phone, email, WhatsApp or contact page)',
      why: 'Many visitors want to ask a question before buying. If they cannot find a way to reach you, they leave.',
      fix: 'Add a click-to-call, email, WhatsApp or “Contact” link in the header or footer.'
    }, contactLinks.length === 0);

    var trustLinks = Array.prototype.slice.call(doc.querySelectorAll('a[href]')).filter(function (a) {
      var h = (a.getAttribute('href') || '') + ' ' + text(a);
      return /privacy|terms|refund|return|about|testimonial|review|shipping|warranty|guarantee/i.test(h);
    });
    check({ id: 'cro-trust-cues', category: 'conversion', severity: 'notice', heuristic: true,
      title: 'Few trust cues (no About, Privacy, Terms or Reviews links)',
      passTitle: 'Trust pages linked (About, Privacy, Terms or similar)',
      why: 'Visitors look for signs a business is real and accountable before sharing details or paying.',
      fix: 'Link to About, Privacy Policy, Terms/Refund policy and testimonials or reviews — usually in the footer.'
    }, trustLinks.length === 0);

    var nav = doc.querySelector('nav,[role="navigation"]');
    var navLinks = nav ? Array.prototype.filter.call(nav.querySelectorAll('a[href]'), function (a) { return !isHidden(a, win); }) : [];
    check({ id: 'cro-nav-overload', category: 'usability', severity: 'notice', heuristic: true,
      title: 'Main navigation has many visible links (' + navLinks.length + ')',
      passTitle: 'Main navigation is a manageable size',
      why: 'Long menus make it harder to find the important pages and dilute attention from the main action.',
      fix: 'Keep the top-level menu to about 5–8 items and group the rest under clear sections or in the footer.'
    }, navLinks.length > 12, { count: navLinks.length > 12 ? 1 : 0, skipPass: !nav });

    var score = scoreIssues(issues);
    var severityOrder = { critical: 0, warning: 1, notice: 2 };
    issues.sort(function (a, b) {
      return severityOrder[a.severity] - severityOrder[b.severity] ||
        CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
    });

    return {
      tool: 'Xender SiteCheck',
      version: VERSION,
      url: loc.href ? String(loc.href).split('#')[0] : '',
      host: loc.hostname || '',
      title: truncate(title, 120),
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      score: score,
      summary: {
        critical: issues.filter(function (i) { return i.severity === 'critical'; }).length,
        warning: issues.filter(function (i) { return i.severity === 'warning'; }).length,
        notice: issues.filter(function (i) { return i.severity === 'notice'; }).length,
        passed: passed.length
      },
      stats: {
        elements: nodeCount,
        images: imgs.length,
        links: hrefLinks.length,
        forms: forms.length,
        headings: headings.length
      },
      issues: issues,
      passed: passed,
      // Same-origin links the user may choose to verify (popup “Check links”).
      linkCandidates: collectLinkCandidates(hrefLinks, loc)
    };
  }

  function isHiddenByCss(el, win) {
    if (!win.getComputedStyle) return false;
    var cs = win.getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  }

  function collectLinkCandidates(links, loc) {
    var seen = {};
    var out = [];
    var origin;
    try { origin = loc.origin || new URL(loc.href).origin; } catch (e) { return out; }
    if (!/^https?:/.test(origin)) return out;
    links.forEach(function (a) {
      var raw = (a.getAttribute('href') || '').trim();
      if (!raw || raw.charAt(0) === '#' || /^(javascript|mailto|tel|sms|data|blob):/i.test(raw)) return;
      if (a.hasAttribute('download')) return;
      var u;
      try { u = new URL(raw, loc.href); } catch (e) { return; }
      if (u.origin !== origin) return;
      u.hash = '';
      var key = u.href;
      if (seen[key]) return;
      if (/\/(logout|log-out|signout|sign-out|delete|unsubscribe|remove)\b/i.test(u.pathname)) return; // never touch state-changing URLs
      if (/[?&](action|delete|logout)=/i.test(u.search)) return;
      seen[key] = true;
      out.push(key);
    });
    return out.slice(0, 40);
  }

  // Verifies same-origin links with HEAD (falling back to GET). Only called
  // after an explicit user click in the popup. Requests go only to the site
  // being audited, from that site's own page context.
  function checkLinks(urls, opts) {
    opts = opts || {};
    var limit = Math.min(urls.length, opts.max || 40);
    var queue = urls.slice(0, limit);
    var results = [];
    var concurrency = 4;
    var timeoutMs = opts.timeoutMs || 8000;

    function one(url) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs);
      var init = { method: 'HEAD', redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined };
      return fetch(url, init).then(function (res) {
        if (res.status === 405 || res.status === 501) {
          init.method = 'GET';
          return fetch(url, init);
        }
        return res;
      }).then(function (res) {
        clearTimeout(timer);
        results.push({ url: url, status: res.status, ok: res.ok, verified: true });
      }).catch(function (err) {
        clearTimeout(timer);
        results.push({ url: url, status: 0, ok: false, verified: false, error: err && err.name === 'AbortError' ? 'timeout' : 'network error' });
      });
    }

    function worker() {
      var next = queue.shift();
      if (!next) return Promise.resolve();
      return one(next).then(worker);
    }

    var workers = [];
    for (var i = 0; i < concurrency; i++) workers.push(worker());
    return Promise.all(workers).then(function () {
      var broken = results.filter(function (r) { return r.verified && (r.status === 404 || r.status === 410 || r.status >= 500); });
      var unverified = results.filter(function (r) { return !r.verified; });
      return { checked: results.length, broken: broken, unverified: unverified, total: urls.length };
    });
  }

  var api = {
    VERSION: VERSION,
    CATEGORIES: CATEGORIES,
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_WEIGHTS: CATEGORY_WEIGHTS,
    SEVERITY_POINTS: SEVERITY_POINTS,
    MANY_THRESHOLD: MANY_THRESHOLD,
    run: run,
    scoreIssues: scoreIssues,
    checkLinks: checkLinks,
    contrastRatio: contrastRatio
  };
  root.XenderSiteCheck = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

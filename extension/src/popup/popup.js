import { classifyUrl, RESTRICTED_MESSAGES } from '../core/restricted.js';
import { formatReport } from '../core/report.js';

// Firefox exposes promise-based `browser`; Chromium's `chrome` is promise-based in MV3.
const ext = globalThis.browser ?? globalThis.chrome;

const SEVERITIES = [
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warnings' },
  { key: 'notice', label: 'Recommendations' }
];
const CIRCUMFERENCE = 2 * Math.PI * 34;

const $ = (id) => document.getElementById(id);
const state = { tabId: null, result: null, links: null, category: null };

function show(which) {
  $('state-loading').hidden = which !== 'loading';
  $('state-message').hidden = which !== 'message';
  $('results').hidden = which !== 'results';
  $('rescan').hidden = which === 'loading';
}

function showMessage(text) {
  $('message-text').textContent = text;
  show('message');
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function scoreColor(score) {
  if (score >= 90) return 'var(--good)';
  if (score >= 70) return 'var(--warning)';
  return 'var(--critical)';
}

async function getTargetTab() {
  // Tests open the popup as a normal page and pass the tab to inspect.
  const param = new URLSearchParams(location.search).get('tabId');
  if (param) return ext.tabs.get(Number(param));
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function inject(tabId) {
  await ext.scripting.executeScript({ target: { tabId }, files: ['core/audit.js'] });
}

async function scan() {
  show('loading');
  state.links = null;
  $('links-result').hidden = true;
  let tab;
  try {
    tab = await getTargetTab();
  } catch {
    showMessage(RESTRICTED_MESSAGES.unknown);
    return;
  }
  if (!tab) {
    showMessage(RESTRICTED_MESSAGES.unknown);
    return;
  }
  state.tabId = tab.id;
  if (tab.url) {
    try {
      $('host').textContent = new URL(tab.url).hostname || tab.url;
    } catch {
      /* keep subtitle */
    }
  }
  const verdict = classifyUrl(tab.url);
  if (!verdict.ok) {
    showMessage(RESTRICTED_MESSAGES[verdict.reason]);
    return;
  }
  try {
    await inject(tab.id);
    const [injection] = await ext.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.XenderSiteCheck.run(document, window)
    });
    if (!injection || !injection.result) throw new Error('No result');
    state.result = injection.result;
    render();
  } catch {
    // Most often a page the browser protects but that we could not predict
    // from its URL (e.g. a built-in PDF viewer or an error page).
    showMessage(RESTRICTED_MESSAGES.protected);
  }
}

function render() {
  const r = state.result;
  $('host').textContent = r.host || r.url;
  const score = r.score.overall;
  $('score').textContent = String(score);
  $('score').parentElement.classList.toggle('full', score === 100);
  $('grade').textContent = r.score.grade;
  $('grade').style.color = scoreColor(score);
  const fg = $('ring-fg');
  fg.style.stroke = scoreColor(score);
  fg.style.strokeDasharray = String(CIRCUMFERENCE);
  requestAnimationFrame(() => {
    fg.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - score / 100));
  });
  $('ring').setAttribute('role', 'img');
  $('ring').setAttribute('aria-label', `Website Health Score ${score} out of 100`);

  const counts = $('counts');
  counts.replaceChildren(
    el('span', { class: 'pill critical', text: `${r.summary.critical} critical` }),
    el('span', { class: 'pill warning', text: `${r.summary.warning} warnings` }),
    el('span', { class: 'pill notice', text: `${r.summary.notice} tips` }),
    el('span', { class: 'pill good', text: `${r.summary.passed} passed` })
  );

  const cats = $('cats');
  cats.replaceChildren(
    ...Object.entries(r.score.categories).map(([key, cat]) => {
      const bar = el('div', { class: 'bar' }, el('i'));
      bar.firstChild.style.width = `${cat.score}%`;
      bar.firstChild.style.background = scoreColor(cat.score);
      const button = el('button', {
        class: 'cat',
        type: 'button',
        'aria-pressed': String(state.category === key),
        title: `${cat.label}: ${cat.score}/100 — click to filter`
      }, [el('b', { text: String(cat.score) }), el('span', { text: cat.label }), bar]);
      button.addEventListener('click', () => {
        state.category = state.category === key ? null : key;
        render();
      });
      return button;
    })
  );

  renderIssues();
  renderPassed();
  show('results');
}

function filtered(list) {
  return state.category ? list.filter((i) => i.category === state.category) : list;
}

function renderIssues() {
  const r = state.result;
  const panel = $('panel-issues');
  const issues = filtered(r.issues);
  $('issue-count').textContent = `(${issues.length})`;
  const nodes = [];
  for (const sev of SEVERITIES) {
    const group = issues.filter((i) => i.severity === sev.key);
    if (!group.length) continue;
    nodes.push(el('div', { class: `group-title ${sev.key}`, text: `${sev.label} · ${group.length}` }));
    for (const issue of group) nodes.push(issueNode(issue));
  }
  if (!nodes.length) {
    nodes.push(el('p', { class: 'empty', text: state.category ? 'No issues in this category.' : 'No issues found by these checks. Nice work.' }));
  }
  panel.replaceChildren(...nodes);
}

function issueNode(issue) {
  const label = state.result.score.categories[issue.category].label;
  const summary = el('summary', {}, [
    el('div', {}, [
      el('span', { class: 'issue-title', text: issue.title }),
      el('span', { class: 'issue-meta' }, [label, issue.heuristic ? el('span', { class: 'tag', text: 'Heuristic' }) : null])
    ]),
    issue.count > 1 ? el('span', { class: 'count', text: String(issue.count) }) : null
  ]);
  const body = el('div', { class: 'issue-body' }, [
    el('h4', { text: 'Why it matters' }),
    el('p', { text: issue.why }),
    el('h4', { text: 'Recommended fix' }),
    el('p', { text: issue.fix })
  ]);
  if (issue.examples && issue.examples.length) {
    body.append(el('h4', { text: issue.count > issue.examples.length ? `Examples (${issue.examples.length} of ${issue.count})` : 'Found on' }));
    body.append(el('ul', {}, issue.examples.map((x) => el('li', { text: x }))));
  }
  return el('details', { class: 'issue' }, [summary, body]);
}

function renderPassed() {
  const r = state.result;
  const items = filtered(r.passed);
  $('passed-count').textContent = `(${items.length})`;
  $('panel-passed').replaceChildren(
    ...(items.length
      ? items.map((p) => el('div', { class: 'passed-item' }, [el('span', { text: p.title }), el('small', { text: r.score.categories[p.category].label })]))
      : [el('p', { class: 'empty', text: 'No passed checks in this category.' })])
  );
}

function selectTab(which) {
  const issues = which === 'issues';
  $('tab-issues').setAttribute('aria-selected', String(issues));
  $('tab-passed').setAttribute('aria-selected', String(!issues));
  $('panel-issues').hidden = !issues;
  $('panel-passed').hidden = issues;
}

async function checkLinks() {
  const r = state.result;
  const box = $('links-result');
  const button = $('check-links');
  if (!r || !r.linkCandidates.length) {
    box.hidden = false;
    box.replaceChildren(el('p', { text: 'No same-site links to check on this page.' }));
    return;
  }
  button.disabled = true;
  button.textContent = 'Checking…';
  try {
    await inject(state.tabId);
    const [injection] = await ext.scripting.executeScript({
      target: { tabId: state.tabId },
      func: (urls) => globalThis.XenderSiteCheck.checkLinks(urls),
      args: [r.linkCandidates]
    });
    const res = injection.result;
    state.links = res;
    const parts = [
      el('p', {}, [
        el('strong', { text: res.broken.length ? `${res.broken.length} broken` : 'No broken links found' }),
        ` · ${res.checked} checked`,
        res.unverified.length ? ` · ${res.unverified.length} could not be verified` : ''
      ])
    ];
    if (res.broken.length) {
      parts.push(el('ul', {}, res.broken.map((b) => el('li', { text: `${b.status} — ${b.url}` }))));
    }
    if (res.unverified.length) {
      parts.push(el('p', { class: 'issue-meta', text: 'Unverified links timed out or were blocked by the server; they are not reported as broken.' }));
    }
    box.replaceChildren(...parts);
  } catch {
    box.replaceChildren(el('p', { text: 'Link check could not run on this page (the page may have navigated). Scan again and retry.' }));
  }
  box.hidden = false;
  button.disabled = false;
  button.textContent = 'Check again';
}

async function copyReport() {
  const textReport = formatReport(state.result, state.links);
  const button = $('copy');
  try {
    await navigator.clipboard.writeText(textReport);
  } catch {
    const area = el('textarea');
    area.value = textReport;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  button.textContent = 'Copied ✓';
  setTimeout(() => {
    button.textContent = 'Copy report';
  }, 1600);
}

$('rescan').addEventListener('click', scan);
$('tab-issues').addEventListener('click', () => selectTab('issues'));
$('tab-passed').addEventListener('click', () => selectTab('passed'));
$('check-links').addEventListener('click', checkLinks);
$('copy').addEventListener('click', copyReport);

scan();

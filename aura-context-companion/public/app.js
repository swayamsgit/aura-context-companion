import {seed, LIMITS, isMedical, contextPrompt, draftSummary, greeting, todayKey, routineView, shareLinks, sanitizeState, newId} from './core.js';
const $ = id => document.getElementById(id);
const PAGES = ['moment', 'people', 'routine', 'journal', 'caregiver', 'settings', 'about'];
let state = seed(), personId = 'p1', api = {enabled: false, remaining: 0}, memoryOnly = false, editing = '';
try {
  const raw = localStorage.getItem('aura.v2') || localStorage.getItem('aura.v1');
  if (raw) {
    const parsed = JSON.parse(raw);
    const s = sanitizeState(parsed);
    if (!('demo' in parsed)) { s.demo = true; s.routines = seed().routines; }
    state = s;
  }
} catch { memoryOnly = !!localStorage && false; }
if (!state.people.find(p => p.id === personId)) personId = state.people[0]?.id || '';

function node(tag, cls, s) { const e = document.createElement(tag); if (cls) e.className = cls; if (s !== undefined) e.textContent = s; return e; }
function status(id, message, error = false) { $(id).textContent = message; $(id).classList.toggle('error', error); }
function toast(m) { $('toast').textContent = m; $('toast').hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => $('toast').hidden = true, 3500); }
function save() {
  try { localStorage.setItem('aura.v2', JSON.stringify(state)); memoryOnly = false; }
  catch { memoryOnly = true; toast('Storage is unavailable. Changes last for this visit only.'); }
  invalidateDraft(); render();
}
function avatar(p) {
  const a = node('span', 'avatar');
  if (p.photo) { const i = node('img'); i.src = p.photo; i.alt = ''; a.append(i); } else a.textContent = p.name.charAt(0).toUpperCase();
  return a;
}
function go(page) {
  if (!PAGES.includes(page)) page = 'moment';
  document.querySelectorAll('.page').forEach(e => e.hidden = e.id !== page);
  document.querySelectorAll('.nav').forEach(e => { const on = e.dataset.page === page; e.classList.toggle('active', on); if (on) e.setAttribute('aria-current', 'page'); else e.removeAttribute('aria-current'); });
  if (location.hash.slice(1) !== page) history.replaceState(null, '', '#' + page);
  $('sidebar').classList.remove('open'); $('menu').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
}
function invalidateDraft() {
  if ($('draft-text').value) { $('draft-text').value = ''; $('draft-method').textContent = 'Notes changed'; }
  $('review-confirm').checked = false; syncShare();
}
function syncShare() {
  const ok = $('review-confirm').checked && $('draft-text').value.trim().length > 0;
  $('copy-draft').disabled = !ok; $('print-draft').disabled = !ok;
  const l = shareLinks($('draft-text').value);
  for (const [id, href] of [['share-wa', l.whatsapp], ['share-mail', l.email]]) {
    const a = $(id); a.setAttribute('aria-disabled', String(!ok)); a.style.opacity = ok ? 1 : .5; a.style.pointerEvents = ok ? 'auto' : 'none'; a.href = ok ? href : '#';
  }
}
function itemRow(cls) { return node('div', 'item-row' + (cls ? ' ' + cls : '')); }

function render() {
  document.documentElement.dataset.text = state.settings.text;
  document.documentElement.dataset.contrast = state.settings.contrast ? 'high' : '';
  const now = new Date(), hhmm = now.toTimeString().slice(0, 5), today = todayKey(now);
  $('greet').textContent = greeting(now.getHours()) + '.';
  $('today-date').textContent = now.toLocaleDateString(undefined, {weekday: 'long', day: 'numeric', month: 'long'}).toUpperCase();
  $('demo-notice').hidden = !state.demo;
  $('local').lastChild.textContent = memoryOnly ? ' Storage unavailable: this visit only' : ' Your notes stay on this device';

  const person = state.people.find(p => p.id === personId);
  const prompt = contextPrompt(person);
  const choices = $('person-choices'); choices.replaceChildren();
  for (const p of state.people) {
    const b = node('button', 'choice' + (p.id === personId ? ' active' : '')); b.type = 'button'; b.setAttribute('aria-pressed', String(p.id === personId));
    b.append(avatar(p), node('span', '', p.name)); b.onclick = () => { personId = p.id; render(); }; choices.append(b);
  }
  const unsure = node('button', 'choice' + (!person ? ' active' : ''), 'Not sure'); unsure.type = 'button'; unsure.style.paddingLeft = '14px'; unsure.onclick = () => { personId = ''; render(); }; choices.append(unsure);
  $('nudge').replaceChildren(node('span', '', prompt.text), node('span', 'source', prompt.source ? `SOURCE / ${person?.source || 'Entered on this device'} · ${prompt.source}` : 'No confirmed source. No identity guessed.'));
  $('log-moment').disabled = !person || !!prompt.blocked;

  const events = [...state.events].sort((a, b) => a.time.localeCompare(b.time));
  const tl = $('moment-timeline'); tl.replaceChildren();
  if (!events.length) tl.append(node('p', 'empty', 'No notes yet. Add a moment in Daily notes.'));
  for (const e of events.slice(-3)) { const d = node('div', 'tl'); d.append(node('span', 'time', e.time), node('p', '', e.text), node('small', '', `Source ${e.id} · ${e.source}`)); tl.append(d); }

  const rv = routineView(state.routines, hhmm, today);
  const fill = (target, editable) => {
    target.replaceChildren();
    if (!rv.length) target.append(node('p', 'empty', 'No routine yet. Add something you like to do.'));
    for (const r of rv) {
      const row = itemRow(r.status), lab = node('label'), c = node('input'), body = node('span');
      c.type = 'checkbox'; c.checked = r.status === 'done'; c.setAttribute('aria-label', `${r.text} at ${r.time}: mark done`);
      c.onchange = () => { const x = state.routines.find(q => q.id === r.id); x.doneOn = c.checked ? today : ''; save(); };
      const t = node('span', 't', r.text); body.append(node('time', '', r.time + (r.status === 'due' ? ' · not done yet' : '')), t);
      lab.append(c, body); row.append(lab);
      if (editable) { const d = node('button', 'text-btn', 'Remove'); d.onclick = () => { state.routines = state.routines.filter(q => q.id !== r.id); save(); }; row.append(d); }
      target.append(row);
    }
  };
  fill($('today-routine'), false); fill($('routine-list'), true);

  const list = $('people-list'); list.replaceChildren();
  if (!state.people.length) list.append(node('p', 'empty', 'Your circle is empty. Add someone using the form below.'));
  for (const p of state.people) {
    const d = node('article', 'panel person-card'), head = node('div', 'title'), info = node('div');
    info.append(node('h2', '', p.name), node('span', 'relation', p.relationship)); head.append(avatar(p), info);
    const edit = node('button', 'text-btn', 'Edit'), del = node('button', 'text-btn', 'Remove');
    edit.onclick = () => startEdit(p); del.onclick = () => { if (!confirm(`Remove ${p.name}?`)) return; state.people = state.people.filter(x => x.id !== p.id); if (personId === p.id) personId = state.people[0]?.id || ''; save(); };
    const act = node('div', 'card-actions'); act.append(edit, del);
    d.append(head, node('p', '', p.note), node('span', 'source', `Source: ${p.source}`), act); list.append(d);
  }

  $('nav-count').textContent = String(state.events.length); $('event-count').textContent = `${state.events.length} notes`;
  const q = $('note-search').value.trim().toLowerCase();
  const el = $('event-list'); el.replaceChildren();
  const shown = events.filter(e => !q || e.text.toLowerCase().includes(q));
  if (!shown.length) el.append(node('p', 'empty', events.length ? 'No notes match your search.' : 'No notes yet. Add a moment to start a check-in.'));
  for (const e of shown) {
    const row = itemRow(), lab = node('label'), c = node('input'), body = node('span');
    c.type = 'checkbox'; c.checked = e.selected; c.setAttribute('aria-label', `Include note ${e.id} in check-in`); c.onchange = () => { e.selected = c.checked; save(); };
    body.append(node('time', '', e.time), node('span', '', e.text), node('small', '', `${e.source} · ${e.id}`)); lab.append(c, body);
    const d = node('button', 'text-btn', 'Remove'); d.onclick = () => { state.events = state.events.filter(x => x.id !== e.id); save(); };
    row.append(lab, d); el.append(row);
  }

  const sel = $('selected-events'); sel.replaceChildren();
  const chosen = events.filter(e => e.selected && !isMedical(e.text));
  if (!chosen.length) sel.append(node('p', 'empty', 'No notes selected. Tick notes in Daily notes first.'));
  chosen.forEach(e => { const d = node('div', 'selected-note'); d.append(node('span', '', `${e.time} / ${e.id}`), node('div', '', e.text)); sel.append(d); });
  $('local-draft').disabled = !chosen.length;
  $('cloud-card').hidden = !api.enabled;
  $('meta-draft').disabled = !api.enabled || !$('cloud-consent').checked || !chosen.length || api.remaining <= 0;
  $('api-status').textContent = `${api.remaining} calls left`;

  document.querySelectorAll('#text-size button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.settings.text)));
  $('contrast').checked = state.settings.contrast;
}

function startEdit(p) {
  editing = p.id; $('person-id').value = p.id; $('person-name').value = p.name; $('person-relation').value = p.relationship; $('person-note').value = p.note;
  $('person-form-title').textContent = `Edit ${p.name}`; $('person-submit').textContent = 'Save changes'; $('person-cancel').hidden = false; $('person-name').focus();
  $('person-form').scrollIntoView({behavior: 'smooth', block: 'center'});
}
function endEdit() { editing = ''; $('person-form').reset(); $('person-form-title').textContent = 'Add someone you know'; $('person-submit').textContent = 'Save person'; $('person-cancel').hidden = true; }
function readPhoto(file) {
  return new Promise(resolve => {
    if (!file) return resolve(null);
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = 240, c = document.createElement('canvas'); c.width = c.height = s;
      const m = Math.min(img.width, img.height), ctx = c.getContext('2d');
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/jpeg', .8); if (out.length >= 70000) out = c.toDataURL('image/jpeg', .5);
      resolve(out.length < 70000 ? out : '');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

document.querySelectorAll('[data-page]').forEach(e => e.onclick = () => go(e.dataset.page));
document.querySelectorAll('[data-goto]').forEach(e => e.onclick = () => go(e.dataset.goto));
window.addEventListener('hashchange', () => go(location.hash.slice(1)));
$('menu').onclick = () => { const o = $('sidebar').classList.toggle('open'); $('menu').setAttribute('aria-expanded', String(o)); };
$('note-search').oninput = render;

$('speak').onclick = () => {
  if (!('speechSynthesis' in window)) return status('moment-status', 'Read-aloud is not supported by this browser.', true);
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(contextPrompt(state.people.find(p => p.id === personId)).text); u.rate = .85;
  u.onerror = () => status('moment-status', 'Read-aloud is unavailable. The card stays readable.', true); speechSynthesis.speak(u);
};
$('log-moment').onclick = () => {
  if (state.events.length >= LIMITS.events) return status('moment-status', `Maximum ${LIMITS.events} notes. Remove one first.`, true);
  const p = state.people.find(x => x.id === personId); if (!p) return;
  state.events.push({id: newId('e'), time: new Date().toTimeString().slice(0, 5), text: `Spent time with ${p.name}.`, source: 'Manually selected and saved', selected: true});
  save(); status('moment-status', 'Moment saved to Daily notes.');
};
$('start-fresh').onclick = () => { if (!confirm('Remove the example people, notes and routine and start with an empty Aura?')) return; state.people = []; state.events = []; state.routines = []; state.demo = false; personId = ''; save(); go('people'); };

$('person-form').onsubmit = async e => {
  e.preventDefault();
  const name = $('person-name').value.trim(), relationship = $('person-relation').value.trim(), note = $('person-note').value.trim();
  if (!name || !relationship || !note) return status('people-status', 'Complete name, relationship and detail.', true);
  if (isMedical(note) || isMedical(name + ' ' + relationship)) return status('people-status', 'Aura does not store health or medication notes. Keep to everyday details.', true);
  const photo = await readPhoto($('person-photo').files[0]);
  if (editing) {
    const p = state.people.find(x => x.id === editing); Object.assign(p, {name, relationship, note, source: 'Edited on this device'}); if (photo) p.photo = photo;
    endEdit(); save(); return status('people-status', 'Changes saved.');
  }
  if (state.people.length >= LIMITS.people) return status('people-status', `Maximum ${LIMITS.people} people. Remove one first.`, true);
  const p = {id: newId('p'), name, relationship, note, source: 'Entered on this device', photo: photo || ''};
  state.people.push(p); if (!personId) personId = p.id; endEdit(); save(); status('people-status', `${name} saved.`);
};
$('person-cancel').onclick = endEdit;

$('routine-form').onsubmit = e => {
  e.preventDefault(); const time = $('routine-time').value, text = $('routine-text').value.trim();
  if (!time || !text) return status('routine-status', 'Enter a time and an activity.', true);
  if (isMedical(text)) return status('routine-status', 'Aura does not handle medication or health items. Use a caregiver or clinician.', true);
  if (state.routines.length >= LIMITS.routines) return status('routine-status', `Maximum ${LIMITS.routines} items.`, true);
  state.routines.push({id: newId('r'), time, text, doneOn: ''}); $('routine-text').value = ''; save(); status('routine-status', 'Added.');
};

$('event-time').value = new Date().toTimeString().slice(0, 5);
$('event-form').onsubmit = e => {
  e.preventDefault(); const time = $('event-time').value, text = $('event-text').value.trim();
  if (!text || !time) return status('event-status', 'Enter a time and what happened.', true);
  if (isMedical(text)) return status('event-status', 'Aura does not record medication decisions. Use a caregiver or clinician.', true);
  if (state.events.length >= LIMITS.events) return status('event-status', `Maximum ${LIMITS.events} notes. Remove one first.`, true);
  state.events.push({id: newId('e'), time, text, source: 'Manually entered', selected: true}); $('event-text').value = ''; save(); status('event-status', 'Note added.');
};
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
$('dictate').onclick = () => {
  if (!SR) return status('event-status', 'Dictation is not supported in this browser. Type the note instead.', true);
  const r = new SR(); r.lang = navigator.language || 'en-US'; r.interimResults = false;
  r.onresult = ev => { $('event-text').value = (($('event-text').value + ' ' + ev.results[0][0].transcript).trim()).slice(0, 500); status('event-status', 'Heard you. Check the text, then add it.'); };
  r.onerror = () => status('event-status', 'Dictation did not work. Type the note instead.', true);
  r.onstart = () => status('event-status', 'Listening…'); r.start();
};

function setDraft(v, method) { $('draft-text').value = v; $('draft-method').textContent = method; $('review-confirm').checked = false; syncShare(); status('copy-status', 'Read this against your notes. Nothing has been sent.'); }
$('local-draft').onclick = () => setDraft(draftSummary(state.events), 'Local evidence draft');
$('cloud-consent').onchange = render;
$('meta-draft').onclick = async () => {
  if (!$('cloud-consent').checked) return;
  const events = state.events.filter(e => e.selected && !isMedical(e.text)).map(({id, time, text}) => ({id, time, text}));
  $('meta-draft').disabled = true; status('cloud-status', 'Sending only the selected notes to Meta.');
  try {
    const r = await fetch('/api/summary', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({consent: true, events})});
    const d = await r.json(); if (!r.ok) throw Error(d.error || 'Request failed.');
    api.remaining = d.remaining; setDraft(d.text, 'Organised by Meta'); status('cloud-status', 'Done. Review before sharing.');
  } catch (e) { status('cloud-status', e.message, true); }
  render();
};
$('review-confirm').onchange = syncShare;
$('draft-text').oninput = () => { $('review-confirm').checked = false; syncShare(); };
$('copy-draft').onclick = async () => {
  try { await navigator.clipboard.writeText($('draft-text').value); status('copy-status', 'Copied. You choose where to paste it.'); }
  catch { $('draft-text').focus(); $('draft-text').select(); status('copy-status', 'Clipboard unavailable. Select and copy the text manually.', true); }
};
$('print-draft').onclick = () => { const w = window.open('', '_blank'); if (!w) return status('copy-status', 'Pop-up blocked. Allow pop-ups to print.', true); w.document.write('<pre style="font:16px/1.6 Georgia,serif;white-space:pre-wrap;padding:24px"></pre>'); w.document.querySelector('pre').textContent = $('draft-text').value; w.document.close(); w.print(); };

document.querySelectorAll('#text-size button').forEach(b => b.onclick = () => { state.settings.text = b.dataset.v; save(); });
$('contrast').onchange = () => { state.settings.contrast = $('contrast').checked; save(); };
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'}), a = node('a'); a.href = URL.createObjectURL(blob); a.download = `aura-backup-${todayKey()}.json`; a.click(); URL.revokeObjectURL(a.href);
  status('backup-status', 'Backup downloaded. It is not encrypted, so store it somewhere private.');
};
$('import').onchange = async () => {
  const f = $('import').files[0]; if (!f) return;
  try {
    if (f.size > 1500000) throw Error('That file is too large to be an Aura backup.');
    const s = sanitizeState(JSON.parse(await f.text()));
    if (!confirm(`Replace what is on this device with ${s.people.length} people, ${s.events.length} notes and ${s.routines.length} routine items from this file?`)) return;
    state = s; personId = state.people[0]?.id || ''; save(); status('backup-status', 'Backup restored.');
  } catch (e) { status('backup-status', e.message || 'Could not read that file.', true); }
  $('import').value = '';
};
$('clear-all').onclick = () => { if (!confirm('Delete all people, notes and routine on this device? This cannot be undone.')) return; state = {demo: false, settings: state.settings, people: [], events: [], routines: []}; personId = ''; save(); status('clear-status', 'Everything on this device was deleted.'); };

fetch('/api/status').then(r => r.ok ? r.json() : null).then(d => { if (d && typeof d.enabled === 'boolean') { api = d; render(); } }).catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
setInterval(() => { if (!document.hidden) render(); }, 60000);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
render(); go(location.hash.slice(1) || 'moment');
addEventListener('load', () => setTimeout(() => window.scrollTo(0, 0), 50));

'use strict';

/* ---------- Data ---------- */
const DEFAULT_TASKS = [
  { id: 'trash',   n: 'Take out the trash',  e: '🗑️', p: 3 },
  { id: 'recycle', n: 'Recycling & glass',   e: '♻️', p: 3 },
  { id: 'bio',     n: 'Food waste bag',      e: '🍌', p: 2 },
  { id: 'dish',    n: 'Dishes & counters',   e: '🧽', p: 2 },
  { id: 'floor',   n: 'Sweep & mop floor',   e: '🧹', p: 3 },
  { id: 'fridge',  n: 'Fridge check',        e: '🧊', p: 2 },
  { id: 'stove',   n: 'Clean stove & oven',  e: '🔥', p: 3 }
];
const COLORS = ['#ffb3c7', '#ffd36e', '#9fe3b4', '#a8d0ff', '#d6b8ff', '#ffb98a', '#8fe3e0', '#f3a6f0'];
const WORDS = [
  'You’re a kitchen superstar! ⭐', 'Small tasks, big vibes. ✨', 'A clean kitchen is a happy kitchen. 💛',
  'Teamwork makes the dishwasher work! 🤝', 'Every bag counts. You’ve got this! 💪',
  'Future you says thank you. 🙌', 'Legends keep the fridge fresh. 🧊'
];
const DONE_WORDS = ['Yay, nicely done, {n}! 🎉', '{n} saves the day! 🦸', 'Sparkling work, {n}! ✨', 'High five, {n}! 🙏'];
const KEY = 'kitchen-crew-v1';
const MAX_TASKS = 14;
const MAX_MEMBERS = 8;

let S;

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mem = id => S.members.find(m => m.id === id);

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- State ---------- */
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.members) {
    S = {
      members: ['Alex', 'Sam', 'Robin', 'Kim'].map((n, i) => ({ id: 'm' + i, name: n, c: i })),
      tasks: DEFAULT_TASKS.map(t => ({ ...t })),
      week: 1, assign: {}, done: {}, scores: {}, next: 4, msg: ''
    };
    roll(true);
  }
  if (!S.tasks) S.tasks = DEFAULT_TASKS.map(t => ({ ...t })); // older saved data
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
}

// Deal duties round-robin; prefer a layout where nobody keeps last week's duty.
function roll(first) {
  const prev = S.assign || {};
  let best = null, bestScore = -1;
  for (let t = 0; t < 60; t++) {
    const order = shuffle(S.members.map(m => m.id));
    const a = {};
    shuffle(S.tasks).forEach((k, i) => { a[k.id] = order[i % order.length]; });
    const score = S.tasks.filter(k => a[k.id] !== prev[k.id]).length;
    if (score > bestScore) { bestScore = score; best = a; }
    if (score === S.tasks.length) break;
  }
  S.assign = best;
  S.done = {};
  if (!first) S.week++;
}

/* ---------- Animal figures ---------- */
function face(m, happy) {
  const f = COLORS[m.c % COLORS.length], t = m.c % 6, d = '#1b1b2f';
  const k = " stroke='#1b1b2f' stroke-width='4' stroke-linejoin='round'";
  const ears = [
    `<path d='M14 40L18 8L44 24zM86 40L82 8L56 24z' fill='${f}'${k}/><path d='M22 30L23 17L34 25zM78 30L77 17L66 25z' fill='#ff9db5'/>`,
    `<circle cx='20' cy='26' r='13' fill='${f}'${k}/><circle cx='80' cy='26' r='13' fill='${f}'${k}/><circle cx='20' cy='26' r='5' fill='#fff' opacity='.6'/><circle cx='80' cy='26' r='5' fill='#fff' opacity='.6'/>`,
    `<ellipse cx='32' cy='18' rx='10' ry='22' fill='${f}'${k}/><ellipse cx='68' cy='18' rx='10' ry='22' fill='${f}'${k}/><ellipse cx='32' cy='20' rx='4' ry='13' fill='#ff9db5'/><ellipse cx='68' cy='20' rx='4' ry='13' fill='#ff9db5'/>`,
    `<circle cx='28' cy='26' r='15' fill='${f}'${k}/><circle cx='72' cy='26' r='15' fill='${f}'${k}/>`,
    `<path d='M12 46L16 4L48 26zM88 46L84 4L52 26z' fill='${f}'${k}/><path d='M20 34L20 16L34 26zM80 34L80 16L66 26z' fill='${d}'/>`,
    `<path d='M16 34L8 8L38 20zM84 34L92 8L62 20z' fill='${f}'${k}/>`
  ][t];
  const eyes = t === 3
    ? `<circle cx='28' cy='26' r='9' fill='#fff'/><circle cx='72' cy='26' r='9' fill='#fff'/><circle cx='28' cy='26' r='4.5' fill='${d}'/><circle cx='72' cy='26' r='4.5' fill='${d}'/>`
    : `<circle cx='36' cy='46' r='6' fill='${d}'/><circle cx='64' cy='46' r='6' fill='${d}'/><circle cx='38' cy='44' r='2' fill='#fff'/><circle cx='66' cy='44' r='2' fill='#fff'/>`;
  const whiskers = `<path d='M6 54h20M8 64h18M94 54h-20M92 64h-18' stroke='${d}' stroke-width='2.5' stroke-linecap='round'/>`;
  const nose = `<path d='M45 55h10l-5 6z' fill='#ff7a9c'/>`;
  const extras = [
    nose + whiskers,
    `<ellipse cx='50' cy='64' rx='17' ry='13' fill='#fff' opacity='.65'/><ellipse cx='50' cy='58' rx='6' ry='4.5' fill='${d}'/>`,
    nose + `<path d='M12 58h14M88 58h-14' stroke='${d}' stroke-width='2.5' stroke-linecap='round'/>`,
    `<circle cx='46' cy='56' r='2' fill='${d}'/><circle cx='54' cy='56' r='2' fill='${d}'/>`,
    `<path d='M50 54L24 68Q50 92 76 68z' fill='#fff' opacity='.85'/><circle cx='50' cy='58' r='5' fill='${d}'/>`,
    `<ellipse cx='50' cy='62' rx='15' ry='10' fill='#ff9db5' stroke='${d}' stroke-width='3'/><ellipse cx='45' cy='62' rx='2.5' ry='4' fill='${d}'/><ellipse cx='55' cy='62' rx='2.5' ry='4' fill='${d}'/>`
  ][t];
  const mouth = happy
    ? `<path d='M38 74q12 14 24 0z' fill='${d}'/><circle cx='22' cy='62' r='5' fill='#ff7a9c' opacity='.7'/><circle cx='78' cy='62' r='5' fill='#ff7a9c' opacity='.7'/>`
    : `<path d='M42 80h16' stroke='${d}' stroke-width='4' stroke-linecap='round'/>`;
  return `<svg viewBox='0 0 100 100' aria-hidden='true' focusable='false'>${ears}<ellipse cx='50' cy='58' rx='40' ry='34' fill='${f}'${k}/>${eyes}${extras}${mouth}</svg>`;
}

/* ---------- Rendering ---------- */
function render() {
  const doneCount = S.tasks.filter(t => S.done[t.id]).length;
  $('week').textContent = `Week ${S.week} · ${doneCount} of ${S.tasks.length} duties done`;
  $('quote').textContent = S.msg || WORDS[(S.week + Object.keys(S.done).length) % WORDS.length];

  $('tasks').innerHTML = S.tasks.map(t => {
    const m = mem(S.assign[t.id]);
    if (!m) return '';
    const d = !!S.done[t.id];
    return `<div class="card ${d ? 'done' : ''}">${face(m, d)}<div>
      <div class="t"><span aria-hidden="true">${esc(t.e)}</span> ${esc(t.n)}</div>
      <div class="who">${esc(m.name)} · ${t.p} pts ${d ? '<span class="badge">✓ Done</span>' : ''}</div>
      <div class="actions">
        <button data-t="${t.id}" aria-pressed="${d}">${d ? 'Undo' : 'Mark as done'}<span class="sr"> ${esc(t.n)}</span></button>
        <button class="small" data-x="${t.id}" aria-label="Remove duty ${esc(t.n)}">Remove</button>
      </div></div></div>`;
  }).join('');

  const sorted = [...S.members].sort((a, b) => (S.scores[b.id] || 0) - (S.scores[a.id] || 0));
  const medals = ['🥇', '🥈', '🥉'];
  $('board').innerHTML = sorted.map((m, i) =>
    `<li>${face(m, true)}<span aria-hidden="true">${medals[i] || ''}</span><span class="sp">${i + 1}. ${esc(m.name)}</span><span class="pts">${S.scores[m.id] || 0} pts</span></li>`
  ).join('');

  $('crew').innerHTML = S.members.map(m =>
    `<span class="chip">${esc(m.name)}<button data-r="${m.id}" aria-label="Remove ${esc(m.name)}">✕</button></span>`
  ).join('');
}

/* ---------- Inline confirmation (window.confirm is blocked in some embeds) ---------- */
let pending = null;
function ask(text, fn) {
  pending = fn;
  $('asktxt').textContent = text;
  $('ask').hidden = false;
  $('askyes').focus();
}
function closeAsk() { pending = null; $('ask').hidden = true; }
$('askyes').onclick = () => { const f = pending; closeAsk(); if (f) f(); };
$('askno').onclick = closeAsk;

/* ---------- Actions ---------- */
$('tasks').onclick = e => {
  const tog = e.target.closest('button[data-t]');
  const del = e.target.closest('button[data-x]');

  if (tog) {
    const t = S.tasks.find(x => x.id === tog.dataset.t);
    const m = mem(S.assign[t.id]);
    if (S.done[t.id]) {
      delete S.done[t.id];
      S.scores[m.id] = Math.max(0, (S.scores[m.id] || 0) - t.p);
      S.msg = '';
    } else {
      S.done[t.id] = 1;
      S.scores[m.id] = (S.scores[m.id] || 0) + t.p;
      S.msg = S.tasks.every(x => S.done[x.id])
        ? '🎊 Spotless! The whole kitchen is done this week! 🎊'
        : DONE_WORDS[Math.floor(Math.random() * DONE_WORDS.length)].replace('{n}', m.name);
    }
    save(); render();
    const again = $('tasks').querySelector(`[data-t="${t.id}"]`);
    if (again) again.focus();
  }

  if (del) {
    const t = S.tasks.find(x => x.id === del.dataset.x);
    if (S.tasks.length <= 1) { S.msg = 'Keep at least one duty on the list. 🧽'; render(); return; }
    ask(`Remove the duty “${t.n}”?`, () => {
      S.tasks = S.tasks.filter(x => x.id !== t.id);
      delete S.assign[t.id];
      delete S.done[t.id];
      S.msg = 'Duty removed. 🧹';
      save(); render();
    });
  }
};

$('taskf').onsubmit = e => {
  e.preventDefault();
  const name = $('tn').value.trim();
  if (!name) return;
  if (S.tasks.length >= MAX_TASKS) { S.msg = `That’s plenty of duties (max ${MAX_TASKS})! 😅`; render(); return; }
  const t = { id: 't' + Date.now(), n: name, e: $('te').value.trim() || '✨', p: Number($('tp').value) || 2 };
  // give the new duty to whoever has the fewest right now
  const load = {};
  S.members.forEach(m => { load[m.id] = 0; });
  S.tasks.forEach(x => { if (load[S.assign[x.id]] !== undefined) load[S.assign[x.id]]++; });
  const who = S.members.slice().sort((a, b) => load[a.id] - load[b.id])[0];
  S.tasks.push(t);
  S.assign[t.id] = who.id;
  S.msg = `New duty “${t.n}” goes to ${who.name}! 🎯`;
  $('tn').value = ''; $('te').selectedIndex = 0;
  save(); render();
};

function doReroll() {
  roll();
  S.msg = '🎲 New week, new duties! Check your name below. Good luck!';
  save(); render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('reroll').onclick = () => {
  const left = S.tasks.filter(t => !S.done[t.id]).length;
  if (left) ask(`${left} duties are not done yet. Reroll anyway?`, doReroll);
  else doReroll();
};

$('addf').onsubmit = e => {
  e.preventDefault();
  const n = $('nm').value.trim();
  if (!n || S.members.length >= MAX_MEMBERS) return;
  S.members.push({ id: 'm' + (S.next++), name: n, c: S.next });
  $('nm').value = '';
  roll(true);
  S.msg = `Welcome to the crew, ${n}! 🎈`;
  save(); render();
};

$('crew').onclick = e => {
  const b = e.target.closest('button[data-r]');
  if (!b) return;
  if (S.members.length <= 2) { S.msg = 'You need at least 2 housemates in the crew. 🏠'; render(); return; }
  const m = mem(b.dataset.r);
  ask(`Remove ${m.name} from the crew?`, () => {
    S.members = S.members.filter(x => x.id !== m.id);
    delete S.scores[m.id];
    roll(true);
    S.msg = `Bye ${m.name}, thanks for the help! 👋`;
    save(); render();
  });
};

$('reset').onclick = () => ask('Erase all scores and start over?', () => {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  S = null; load(); render();
});

/* ---------- Dark / light mode ---------- */
const THEME_KEY = 'kitchen-crew-theme';
const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  return root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
}
function updateThemeButton() {
  const dark = currentTheme() === 'dark';
  $('theme').textContent = dark ? '☀️ Light mode' : '🌙 Dark mode';
  $('theme').setAttribute('aria-pressed', String(dark));
  $('theme').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
$('theme').onclick = () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  updateThemeButton();
};
systemDark.addEventListener('change', updateThemeButton);

/* ---------- Start ---------- */
updateThemeButton();
load();
render();

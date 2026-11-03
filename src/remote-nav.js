// LG webOS Magic Remote / standard remote keyboard support.
const KEY = { BACK: 461, ESC: 27, ENTER: 13, PLAY: 415, PAUSE: 19, STOP: 413, REWIND: 412, FORWARD: 417 };
function visible(el) {
  return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}
function focusables() {
  return [...document.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), video[controls]')]
    .filter(el => visible(el) && el.tabIndex >= 0);
}
function moveFocus(dx, dy) {
  const all = focusables();
  const current = document.activeElement;
  if (!all.length) return;
  if (!all.includes(current)) { all[0].focus(); return; }
  const a = current.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of all) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const vx = bx - ax, vy = by - ay;
    const primary = dx ? vx * dx : vy * dy;
    if (primary <= 2) continue;
    const cross = dx ? Math.abs(vy) : Math.abs(vx);
    const score = primary + cross * 2.4;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) best.focus();
}
document.addEventListener('keydown', event => {
  const code = event.keyCode || event.which;
  if ([37,38,39,40].includes(code)) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    event.preventDefault();
    moveFocus(code === 37 ? -1 : code === 39 ? 1 : 0, code === 38 ? -1 : code === 40 ? 1 : 0);
  } else if (code === KEY.BACK || code === KEY.ESC) {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('iptv-back'));
  } else if (code === KEY.PLAY) {
    const video = document.querySelector('video');
    if (video) { event.preventDefault(); video.play().catch(()=>{}); }
  } else if (code === KEY.PAUSE) {
    const video = document.querySelector('video');
    if (video) { event.preventDefault(); video.pause(); }
  } else if (code === KEY.STOP) {
    const video = document.querySelector('video');
    if (video) { event.preventDefault(); video.pause(); video.currentTime = 0; }
  }
});
window.addEventListener('load', () => {
  setTimeout(() => {
    const first = focusables()[0];
    if (first) first.focus();
  }, 350);
});

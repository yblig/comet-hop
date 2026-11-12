// Kuis Kilat — trivia with colour buttons on each controller. 10 questions, speed bonus.
import { h, avatar, SHAPES, btn, confirmBox, svgEl } from '../ui/dom.js';
import { audio } from '../lib/audio.js';
import { QUESTIONS } from './questions.js';

const COUNT = 10, TIME = 15;

export function createQuiz(session, root, humans) {
  audio.playMusic('music_quiz');
  const players = humans.map(p => ({ p, name: p.name, color: p.color, score: 0, ans: -1, at: 0 }));
  const pool = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, COUNT).map(([q, opts, cat]) => {
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    return { q, cat, opts: order.map(i => opts[i]), correct: order.indexOf(0) };
  });

  root.append(h('div', { class: 'party-bg' }, h('div', { class: 'confetti-dots' })));
  const qnum = h('div', { class: 'qnum' });
  const cat = h('div', { class: 'mini' });
  const timerBar = h('i');
  const timer = h('div', { class: 'timer' }, timerBar);
  const secs = h('div', { class: 'title-m', style: { minWidth: '44px', textAlign: 'right' } });
  const qtext = h('div', { class: 'qtext' });
  const answers = h('div', { class: 'answers' });
  const answered = h('div', { class: 'answered' });
  const board = h('div', { class: 'row', style: { justifyContent: 'center', gap: '18px', flexWrap: 'wrap' } });
  const pb = btn(null, 'dark round small', () => confirmBox('Keluar kuis?', 'Kembali ke lobby.', 'Keluar', quit), { icon: 'pause' });
  const wrap = h('div', { class: 'quiz' },
    h('div', { class: 'qtop' }, qnum, h('div', { class: 'col', style: { gap: '4px', flex: 1 } }, timer, cat), secs, pb),
    qtext, answers, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, answered, board));
  root.append(wrap);

  let qi = -1, phase = 'idle', tLeft = 0, raf = 0, tickAt = 0, timeout = null, qStart = 0, iv = 0;

  function drawBoard() {
    board.innerHTML = '';
    [...players].sort((a, b) => b.score - a.score).forEach(pl => {
      const av = avatar(pl.color); av.style.width = '34px'; av.style.animation = 'none';
      board.append(h('div', { class: 'row', style: { gap: '6px', fontSize: '16px' } }, av, h('span', {}, `${pl.name} `, h('b', { style: { color: 'var(--yellow)' } }, pl.score))));
    });
  }

  function next() {
    qi++;
    if (qi >= pool.length) return end();
    const q = pool[qi];
    phase = 'q'; tLeft = TIME; qStart = performance.now();
    players.forEach(pl => { pl.ans = -1; pl.at = 0; });
    qnum.textContent = `Soal ${qi + 1}/${pool.length}`;
    cat.textContent = q.cat;
    qtext.textContent = q.q;
    qtext.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
    answers.innerHTML = '';
    q.opts.forEach((o, i) => {
      const el = h('div', { class: 'ans c' + i }, svgEl(SHAPES[i]), h('span', {}, o), h('div', { class: 'who' }));
      el.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: 120 + i * 70, fill: 'backwards', easing: 'ease-out' });
      answers.append(el);
    });
    drawAnswered();
    audio.play('question');
    players.forEach(pl => session.send(pl.p, { t: 'quiz', phase: 'q', n: qi + 1 }));
  }

  function drawAnswered() {
    answered.innerHTML = '';
    players.forEach(pl => { const a = avatar(pl.color); if (pl.ans >= 0) a.classList.add('on'); answered.append(a); });
  }

  function reveal() {
    if (phase !== 'q') return;
    phase = 'reveal';
    const q = pool[qi];
    [...answers.children].forEach((el, i) => el.classList.add(i === q.correct ? 'right' : 'wrong'));
    let anyRight = false;
    players.forEach(pl => {
      const right = pl.ans === q.correct;
      const pts = right ? 500 + Math.round(500 * Math.max(0, pl.at) / TIME) : 0;
      pl.score += pts;
      if (right) anyRight = true;
      if (pl.ans >= 0) { const a = avatar(pl.color); answers.children[pl.ans].querySelector('.who').append(a); }
      session.send(pl.p, { t: 'quiz', phase: 'reveal', right, pts, correct: q.correct });
    });
    audio.play(anyRight ? 'correct' : 'wrong');
    drawBoard();
    timeout = setTimeout(next, 3200);
  }

  function frame() {
    tick();
    raf = requestAnimationFrame(frame);
  }
  function tick() {
    const now = performance.now();
    if (phase === 'q') {
      tLeft = TIME - (now - qStart) / 1000;
      const f = Math.max(0, tLeft / TIME);
      timerBar.style.width = (f * 100) + '%';
      timer.classList.toggle('low', tLeft < 5);
      secs.textContent = Math.max(0, Math.ceil(tLeft));
      if (tLeft < 5 && now - tickAt > 1000) { tickAt = now; audio.play('tick'); }
      if (tLeft <= 0 || players.every(pl => pl.ans >= 0 || !pl.p.connected)) reveal();
    }
  }

  function end() {
    phase = 'done';
    const order = [...players].sort((a, b) => b.score - a.score);
    session.finish(order.map(pl => ({ p: pl.p, name: pl.name, color: pl.color, label: `${pl.score} poin` })), 'Kuis Kilat · ' + pool.length + ' soal');
  }
  function quit() { import('../app.js').then(a => import('../host/host.js').then(hh => a.go(hh.hostScreen))); }

  drawBoard();
  qtext.textContent = 'Siap-siap…';
  timeout = setTimeout(next, 1600);
  raf = requestAnimationFrame(frame);
  iv = setInterval(tick, 250);
  window.__quiz = { players, reveal, next, end };

  return {
    onMsg(p, m) {
      if (m.t !== 'ans' || phase !== 'q') return;
      const pl = players.find(x => x.p === p);
      if (!pl || pl.ans >= 0) return;
      pl.ans = Math.max(0, Math.min(3, m.i | 0)); pl.at = tLeft;
      audio.play('lock');
      drawAnswered();
      tick();
    },
    onJoin(p) {
      if (!players.find(x => x.p === p)) return;
      if (phase === 'q') setTimeout(() => session.send(p, { t: 'quiz', phase: 'q', n: qi + 1 }), 100);
    },
    layoutFor(p) { return players.find(x => x.p === p) ? { l: 'quiz' } : { l: 'wait', data: { title: 'Kuis sedang berjalan', sub: 'Kamu ikut di ronde berikutnya!' } }; },
    destroy() { cancelAnimationFrame(raf); clearInterval(iv); clearTimeout(timeout); delete window.__quiz; }
  };
}
